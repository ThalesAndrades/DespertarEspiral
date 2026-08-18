// Edge Function: sequenzy-webhook
// Handles transactional confirmations for Despertar Espiral
// Actions: confirm_payment | add_subscriber | trigger_event | revoke_access
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
  try {
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
      console.warn(`Sequenzy [${method}] ${endpoint} → ${res.status}: ${text.slice(0, 200)}`);
    }
    return { ok: res.ok, status: res.status, data: json };
  } catch (err) {
    console.error(`Sequenzy [${method}] ${endpoint} error:`, err);
    return { ok: false, status: 0, data: null };
  }
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (!isAllowedOrigin(req)) return jsonResponse(req, 403, { error: "Origem não permitida" });
  if (req.method !== "POST")  return jsonResponse(req, 405, { error: "Método não permitido" });

  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return jsonResponse(req, 415, { error: "Content-Type deve ser application/json" });
    }

    const body = await req.json();
    const { action, orderId, paymentMethod } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // ── Admin guard: validate caller via JWT ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse(req, 401, { error: "Autenticação necessária" });
    }
    const callerToken = authHeader.replace("Bearer ", "").trim();

    const { data: { user: callerUser }, error: authErr } = await supabaseAdmin.auth.getUser(callerToken);
    if (authErr || !callerUser) {
      return jsonResponse(req, 401, { error: "Token inválido ou expirado" });
    }

    const { data: callerProfile } = await supabaseAdmin
      .from("user_profiles")
      .select("role")
      .eq("id", callerUser.id)
      .single();

    if (callerProfile?.role !== "admin") {
      return jsonResponse(req, 403, { error: "Acesso negado. Requer papel de administrador." });
    }

    // ─────────────────────────────────────────────────
    // ACTION: confirm_payment
    // ─────────────────────────────────────────────────
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
        return jsonResponse(req, 409, { error: "Pedido já confirmado" });
      }

      // Transactional update — only moves pending → paid
      const { data: updated, error: updateError } = await supabaseAdmin
        .from("orders")
        .update({
          status: "paid",
          payment_method: paymentMethod || "manual",
          paid_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .eq("status", "pending")   // guard: prevent double-confirm
        .select("id")
        .maybeSingle();

      if (updateError) {
        console.error("Order update failed:", updateError);
        return jsonResponse(req, 500, { error: "Falha ao confirmar pagamento" });
      }
      if (!updated) {
        return jsonResponse(req, 409, { error: "Pedido já confirmado (ou não está pendente)" });
      }

      // Grant product access (idempotent upsert)
      if (order.user_id) {
        const { error: accessError } = await supabaseAdmin
          .from("user_products")
          .upsert(
            { user_id: order.user_id, product_id: order.product_id },
            { onConflict: "user_id,product_id" }
          );
        if (accessError) {
          console.error("Failed to grant access:", accessError);
        } else {
          console.log(`Access granted: user ${order.user_id} → product ${order.product_id}`);
        }
      } else {
        console.warn(`Order ${orderId}: no user_id — guest purchase, access not auto-granted`);
      }

      // Sequenzy automations (non-blocking — all fire in parallel)
      const sequenzyApiKey = Deno.env.get("SEQUENZY_API_KEY");
      if (sequenzyApiKey && order.email) {
        const product = order.products as { title?: string; subtitle?: string; slug?: string } | null;
        const firstName = order.name?.split(" ")[0]?.trim() || order.email.split("@")[0];
        const amountFormatted = `R$ ${parseFloat(order.amount).toFixed(2).replace(".", ",")}`;

        await Promise.allSettled([
          // 1. Update subscriber custom attributes via POST (upsert)
          // Note: PATCH /subscribers/:email requires the subscriber to exist;
          // using POST /subscribers as upsert is more resilient.
          sequenzyRequest(sequenzyApiKey, "POST", "/subscribers", {
            email: order.email,
            customAttributes: {
              purchase_confirmed_at: new Date().toISOString(),
              payment_method: paymentMethod || "manual",
              product_slug: product?.slug,
              status: "cliente_ativo",
            },
          }),

          // 2. Add customer tags (Sequenzy uses bulk endpoint)
          sequenzyRequest(sequenzyApiKey, "POST", "/subscribers/tags/bulk", {
            email: order.email,
            tags: [
              "cliente",
              `cliente-${product?.slug ?? "produto"}`,
              "acesso-ativo",
              "plataforma-despertar",
            ],
          }),

          // 3. Trigger compra_confirmada event (automation flows)
          sequenzyRequest(sequenzyApiKey, "POST", "/subscribers/events", {
            email: order.email,
            event: "compra_confirmada",
            properties: {
              product_title:  product?.title,
              product_slug:   product?.slug,
              amount:         order.amount,
              order_id:       orderId,
              payment_method: paymentMethod || "manual",
              confirmed_at:   new Date().toISOString(),
            },
          }),

          // 4. Transactional welcome/access email via Sequenzy template "acesso-liberado"
          sequenzyRequest(sequenzyApiKey, "POST", "/transactional/send", {
            to: order.email,
            slug: "acesso-liberado",
            variables: {
              firstName,
              productTitle:    product?.title || "Despertar Espiral",
              productSubtitle: product?.subtitle || "Método de Reconexão e Cura",
              orderId:         orderId.slice(0, 8).toUpperCase(),
              amount:          amountFormatted,
              loginUrl:        `${SITE_URL}/login`,
              supportEmail:    "contato@despertarespiral.com",
            },
          }),
        ]);
      } else if (!sequenzyApiKey) {
        console.warn("SEQUENZY_API_KEY not set — email automation skipped");
      }

      console.log(`Payment confirmed: order ${orderId} by admin ${callerUser.id}`);
      return jsonResponse(req, 200, {
        success: true,
        message: "Pagamento confirmado e acesso liberado.",
      });
    }

    // ─────────────────────────────────────────────────
    // ACTION: revoke_access
    // ─────────────────────────────────────────────────
    if (action === "revoke_access" && body.userId && body.productId) {
      const { error } = await supabaseAdmin
        .from("user_products")
        .delete()
        .eq("user_id", body.userId)
        .eq("product_id", body.productId);

      if (error) {
        console.error("Revoke access failed:", error);
        return jsonResponse(req, 500, { error: "Falha ao revogar acesso" });
      }

      // Mark associated paid orders as refunded
      await supabaseAdmin
        .from("orders")
        .update({ status: "refunded" })
        .eq("user_id", body.userId)
        .eq("product_id", body.productId)
        .eq("status", "paid");

      const sequenzyApiKey = Deno.env.get("SEQUENZY_API_KEY");
      if (sequenzyApiKey && body.email) {
        await Promise.allSettled([
          sequenzyRequest(sequenzyApiKey, "POST", "/subscribers/events", {
            email: body.email,
            event: "acesso_revogado",
            properties: { product_id: body.productId, revoked_at: new Date().toISOString() },
          }),
        ]);
      }

      console.log(`Access revoked: user ${body.userId} product ${body.productId} by admin ${callerUser.id}`);
      return jsonResponse(req, 200, { success: true, message: "Acesso revogado." });
    }

    // ─────────────────────────────────────────────────
    // ACTION: add_subscriber
    // ─────────────────────────────────────────────────
    if (action === "add_subscriber" && body.email) {
      const sequenzyApiKey = Deno.env.get("SEQUENZY_API_KEY");
      if (!sequenzyApiKey) return jsonResponse(req, 500, { error: "SEQUENZY_API_KEY não configurada" });

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

      return jsonResponse(req, result.ok ? 200 : 400, { success: result.ok, data: result.data });
    }

    // ─────────────────────────────────────────────────
    // ACTION: trigger_event
    // ─────────────────────────────────────────────────
    if (action === "trigger_event" && body.email && body.event) {
      const sequenzyApiKey = Deno.env.get("SEQUENZY_API_KEY");
      if (!sequenzyApiKey) return jsonResponse(req, 500, { error: "SEQUENZY_API_KEY não configurada" });

      const result = await sequenzyRequest(sequenzyApiKey, "POST", "/subscribers/events", {
        email: body.email,
        event: body.event,
        properties: body.properties || {},
      });

      return jsonResponse(req, result.ok ? 200 : 400, { success: result.ok, data: result.data });
    }

    return jsonResponse(req, 400, {
      error: "Ação não reconhecida. Use: confirm_payment | revoke_access | add_subscriber | trigger_event",
    });

  } catch (err) {
    console.error("sequenzy-webhook unexpected error:", err);
    return jsonResponse(req, 500, { error: "Erro interno do servidor" });
  }
});
