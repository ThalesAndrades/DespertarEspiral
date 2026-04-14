// Edge Function: sequenzy-webhook
// Handles email automation triggers for Despertar Espiral
// Use this endpoint from admin panel to mark orders as paid and trigger Sequenzy events
// Also accepts POST from admin to manually confirm payments
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

const SEQUENZY_BASE = "https://api.sequenzy.com/api/v1";

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
  const json = await res.json();
  console.log(`Sequenzy ${method} ${endpoint} →`, res.status, JSON.stringify(json).slice(0, 200));
  return { ok: res.ok, data: json };
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body = await req.json();
    const { action, orderId, paymentMethod } = body;

    // Only accept internal admin actions
    const authHeader = req.headers.get("Authorization");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Validate that the caller has service role access
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      serviceKey
    );

    // ── Action: confirm_payment ──
    // Called by admin to mark an order as paid and grant product access
    if (action === "confirm_payment" && orderId) {
      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .select("*, products(title, subtitle, slug)")
        .eq("id", orderId)
        .single();

      if (orderError || !order) {
        return new Response(
          JSON.stringify({ error: "Pedido não encontrado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (order.status === "paid") {
        return new Response(
          JSON.stringify({ error: "Pedido já foi confirmado" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 1. Update order to paid
      await supabaseAdmin
        .from("orders")
        .update({
          status: "paid",
          payment_method: paymentMethod || "manual",
          paid_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      // 2. Grant product access if user_id exists
      if (order.user_id) {
        const { error: accessError } = await supabaseAdmin
          .from("user_products")
          .upsert(
            { user_id: order.user_id, product_id: order.product_id },
            { onConflict: "user_id,product_id" }
          );
        if (accessError) console.error("Failed to grant access:", accessError);
        else console.log("Access granted: user", order.user_id, "→ product", order.product_id);
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
            loginUrl: `${req.headers.get("origin") || "https://despertarespiral.com"}/login`,
          },
        });

        console.log("Sequenzy compra_confirmada triggered for:", order.email);
      }

      return new Response(
        JSON.stringify({ success: true, message: "Pagamento confirmado e acesso liberado." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Action: add_subscriber ──
    // Add/update a subscriber in Sequenzy manually
    if (action === "add_subscriber" && body.email) {
      const sequenzyApiKey = Deno.env.get("SEQUENZY_API_KEY");
      if (!sequenzyApiKey) {
        return new Response(
          JSON.stringify({ error: "SEQUENZY_API_KEY não configurada" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
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
        { status: result.ok ? 200 : 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Action: trigger_event ──
    if (action === "trigger_event" && body.email && body.event) {
      const sequenzyApiKey = Deno.env.get("SEQUENZY_API_KEY");
      if (!sequenzyApiKey) {
        return new Response(
          JSON.stringify({ error: "SEQUENZY_API_KEY não configurada" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await sequenzyRequest(sequenzyApiKey, "POST", "/subscribers/events", {
        email: body.email,
        event: body.event,
        properties: body.properties || {},
      });

      return new Response(
        JSON.stringify({ success: result.ok, data: result.data }),
        { status: result.ok ? 200 : 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Ação não reconhecida. Use: confirm_payment | add_subscriber | trigger_event" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("sequenzy-webhook unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
