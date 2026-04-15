// Edge Function: sequenzy-webhook
// Handles email automation triggers for Despertar Espiral
// Use this endpoint from admin panel to mark orders as paid and trigger Sequenzy events
// Also accepts POST from admin to manually confirm payments
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeadersFor, handleCors, isAllowedOrigin } from "../_shared/cors.ts";

const SEQUENZY_BASE = "https://api.sequenzy.com/api/v1";
const SITE_URL = (Deno.env.get("PUBLIC_SITE_URL") ?? "https://despertarespiral.com").replace(/\/+$/, "");

function jsonResponse(req: Request, status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeadersFor(req),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}

async function sequenzyRequest(
  apiKey: string,
  method: string,
  endpoint: string,
  body?: Record<string, unknown>
) {
  const res = await fetch(`${SEQUENZY_BASE}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: unknown;
  try { json = JSON.parse(text); } catch { json = null; }
  if (!res.ok) {
    console.warn(`Sequenzy [${method}] ${endpoint} → ${res.status}`);
  }
  return { ok: res.ok, data: json };
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (!isAllowedOrigin(req)) return jsonResponse(req, 403, { error: "Origem não permitida" });
  if (req.method !== "POST") return jsonResponse(req, 405, { error: "Método não permitido" });

  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return jsonResponse(req, 415, { error: "Content-Type deve ser application/json" });
    }

    const body = await req.json();
    const { action, orderId, paymentMethod } = body;

    const supabaseUrl  = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // ── Admin guard: validate caller is an authenticated admin ──
    // The Supabase JS client sends the user's JWT in the Authorization header.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse(req, 401, { error: "Autenticação necessária" });
    }
    const callerToken = authHeader.replace("Bearer ", "").trim();

    // Verify the token and fetch the caller's profile to check admin role
    const supabaseCaller = createClient(supabaseUrl, serviceKey, {
      global: { headers: { Authorization: `Bearer ${callerToken}` } },
    });
    const { data: { user: callerUser } } = await supabaseCaller.auth.getUser(callerToken);

    if (!callerUser) {
      return jsonResponse(req, 401, { error: "Token inválido ou expirado" });
    }

    // Fetch admin role from user_profiles
    const { data: callerProfile } = await supabaseAdmin
      .from("user_profiles")
      .select("role")
      .eq("id", callerUser.id)
      .single();

    if (callerProfile?.role !== "admin") {
      return jsonResponse(req, 403, { error: "Acesso negado. Requer papel de administrador." });
    }

    // ── Action: confirm_payment ──
    // Called by admin to mark an order as paid and grant product access
    if (action === "confirm_payment" && orderId) {
      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .select("*, products(title, subtitle, slug)")
        .eq("id", orderId)
        .single();

      if (orderError || !order) {
        return jsonResponse(req, 404, { error: "Pedido não encontrado" });
      }

      if (order.status === "paid") {
        return jsonResponse(req, 409, { error: "Pedido já foi confirmado" });
      }

      // 1. Update order to paid
      const { data: updated, error: updateError } = await supabaseAdmin
        .from("orders")
        .update({
          status: "paid",
          payment_method: paymentMethod || "manual",
          paid_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      if (updateError) {
        console.error("Order update failed:", updateError);
        return jsonResponse(req, 500, { error: "Falha ao confirmar pagamento" });
      }
      if (!updated) {
        return jsonResponse(req, 409, { error: "Pedido já foi confirmado (ou não está pendente)" });
      }

      // 2. Grant product access if user_id exists
      if (order.user_id) {
        const { error: accessError } = await supabaseAdmin
          .from("user_products")
          .upsert(
            { user_id: order.user_id, product_id: order.product_id },
            { onConflict: "user_id,product_id" }
          );
        if (accessError) console.error("Failed to grant access:", accessError);
        else console.log("Access granted");
      }

      // 3. Sequenzy automation on payment confirmation
      const sequenzyApiKey = Deno.env.get("SEQUENZY_API_KEY");
      if (sequenzyApiKey && order.email) {
        const product = order.products as { title?: string; subtitle?: string; slug?: string } | null;
        const firstName = order.name?.split(" ")[0] || order.email.split("@")[0];

        // Update subscriber attributes
        await sequenzyRequest(sequenzyApiKey, "PATCH", `/subscribers/${encodeURIComponent(order.email)}`, {
          customAttributes: {
            purchase_confirmed_at: new Date().toISOString(),
            payment_method: paymentMethod || "manual",
            product_slug: product?.slug,
          },
        });

        // Replace checkout tag with customer tag
        await sequenzyRequest(sequenzyApiKey, "POST", "/subscribers/tags/bulk", {
          email: order.email,
          tags: [
            "cliente",
            `cliente-${product?.slug ?? "produto"}`,
          ],
        });

        // Trigger purchase_completed event (used for automation flows)
        await sequenzyRequest(sequenzyApiKey, "POST", "/subscribers/events", {
          email: order.email,
          event: "compra_confirmada",
          properties: {
            product_title: product?.title,
            product_slug: product?.slug,
            amount: order.amount,
            order_id: orderId,
            payment_method: paymentMethod || "manual",
          },
        });

        // Send welcome/access transactional email
        await sequenzyRequest(sequenzyApiKey, "POST", "/transactional/send", {
          to: order.email,
          slug: "acesso-liberado",
          variables: {
            firstName,
            productTitle: product?.title || "Despertar Espiral",
            productSubtitle: product?.subtitle || "",
            loginUrl: `${SITE_URL}/login`,
          },
        });

      }

      return new Response(
        JSON.stringify({ success: true, message: "Pagamento confirmado e acesso liberado." }),
        { status: 200, headers: { ...corsHeadersFor(req), "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" } }
      );
    }

    // ── Action: add_subscriber ──
    // Add/update a subscriber in Sequenzy manually
    if (action === "add_subscriber" && body.email) {
      const sequenzyApiKey = Deno.env.get("SEQUENZY_API_KEY");
      if (!sequenzyApiKey) {
        return jsonResponse(req, 500, { error: "SEQUENZY_API_KEY não configurada" });
      }

      const result = await sequenzyRequest(sequenzyApiKey, "POST", "/subscribers", {
        email: body.email,
        firstName: body.firstName || body.email.split("@")[0],
        lastName: body.lastName || "",
        customAttributes: body.attributes || {},
      });

      if (body.tags?.length) {
        await sequenzyRequest(sequenzyApiKey, "POST", "/subscribers/tags/bulk", {
          email: body.email,
          tags: body.tags,
        });
      }

      return new Response(
        JSON.stringify({ success: result.ok, data: result.data }),
        { status: result.ok ? 200 : 400, headers: { ...corsHeadersFor(req), "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" } }
      );
    }

    // ── Action: trigger_event ──
    if (action === "trigger_event" && body.email && body.event) {
      const sequenzyApiKey = Deno.env.get("SEQUENZY_API_KEY");
      if (!sequenzyApiKey) {
        return jsonResponse(req, 500, { error: "SEQUENZY_API_KEY não configurada" });
      }

      const result = await sequenzyRequest(sequenzyApiKey, "POST", "/subscribers/events", {
        email: body.email,
        event: body.event,
        properties: body.properties || {},
      });

      return new Response(
        JSON.stringify({ success: result.ok, data: result.data }),
        { status: result.ok ? 200 : 400, headers: { ...corsHeadersFor(req), "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" } }
      );
    }

    return jsonResponse(req, 400, { error: "Ação não reconhecida. Use: confirm_payment | add_subscriber | trigger_event" });
  } catch (err) {
    console.error("sequenzy-webhook unexpected error:", err);
    return jsonResponse(req, 500, { error: "Erro interno do servidor" });
  }
});
