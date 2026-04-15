/**
 * Edge Function: asaas-webhook
 * Called by Asaas when a PIX or boleto payment is confirmed/received.
 *
 * Security: header `asaas-access-token` is compared via timing-safe equality.
 * On success: marks order as paid + grants user_products access immediately.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ── Timing-safe string comparison (prevents timing attacks) ── */
function safeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) {
    diff |= aBytes[i] ^ bBytes[i];
  }
  return diff === 0;
}

/* ── Events we act on ── */
const CONFIRMED_EVENTS = new Set([
  "PAYMENT_CONFIRMED",   // PIX confirmed in real-time
  "PAYMENT_RECEIVED",    // Boleto cleared (D+1)
  "PAYMENT_APPROVED_BY_RISK_ANALYSIS", // Credit card cleared risk analysis
]);

/* ── CORS headers (Asaas calls from their servers, no browser needed) ── */
const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, asaas-access-token",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

/* ── Sequenzy helper (fire-and-forget) ── */
async function sequenzyEvent(
  apiKey: string,
  email: string,
  event: string,
  properties: Record<string, unknown>
) {
  try {
    await fetch("https://api.sequenzy.com/api/v1/subscribers/events", {
      method:  "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ email, event, properties }),
    });
  } catch (e) {
    console.warn("Sequenzy event failed (non-blocking):", e);
  }
}

async function sequenzyTags(apiKey: string, email: string, tags: string[]) {
  try {
    await fetch("https://api.sequenzy.com/api/v1/subscribers/tags/bulk", {
      method:  "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ email, tags }),
    });
  } catch (e) {
    console.warn("Sequenzy tags failed (non-blocking):", e);
  }
}

/* ════════════════════════════════════════════════════════════
   MAIN HANDLER
   ════════════════════════════════════════════════════════════ */
Deno.serve(async (req: Request) => {
  /* Preflight */
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Método não permitido" });
  }

  /* ── 1. Authenticate webhook ── */
  const webhookToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
  if (!webhookToken) {
    console.error("ASAAS_WEBHOOK_TOKEN not configured");
    return json(500, { error: "Webhook token não configurado" });
  }

  const receivedToken = req.headers.get("asaas-access-token") ?? "";
  if (!safeEquals(receivedToken, webhookToken)) {
    console.warn("Asaas webhook: token inválido recebido");
    return json(401, { error: "Token inválido" });
  }

  /* ── 2. Parse payload ── */
  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "Payload inválido" });
  }

  const event   = (payload.event as string | undefined) ?? "";
  const payment = (payload.payment as Record<string, unknown> | undefined) ?? {};

  console.log(`Asaas webhook received: event=${event} | payment.id=${payment.id}`);

  /* ── 3. Filter to confirmation events only ── */
  if (!CONFIRMED_EVENTS.has(event)) {
    console.log(`Event "${event}" ignored — no action required`);
    return json(200, { received: true, action: "ignored" });
  }

  const asaasPaymentId   = (payment.id               as string | undefined) ?? "";
  const externalRef      = (payment.externalReference as string | undefined) ?? ""; // = order.id
  const billingType      = (payment.billingType       as string | undefined) ?? "";
  const confirmedValue   = (payment.value             as number | undefined) ?? 0;
  const confirmedAt      = (payment.confirmedDate     as string | undefined) ?? new Date().toISOString().slice(0, 10);

  if (!asaasPaymentId) {
    console.warn("No payment.id in payload");
    return json(400, { error: "payment.id ausente" });
  }

  /* ── 4. Init Supabase admin client ── */
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")               ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")  ?? ""
  );

  /* ── 5. Find order (by asaas_payment_id OR externalReference) ── */
  let orderQuery = supabase
    .from("orders")
    .select("id, user_id, product_id, email, name, status, amount")
    .eq("asaas_payment_id", asaasPaymentId)
    .single();

  let { data: order, error: orderErr } = await orderQuery;

  // Fallback: look up by externalReference (order UUID stored when creating payment)
  if ((orderErr || !order) && externalRef.length > 8) {
    const fallback = await supabase
      .from("orders")
      .select("id, user_id, product_id, email, name, status, amount")
      .eq("id", externalRef)
      .single();
    order    = fallback.data;
    orderErr = fallback.error;
  }

  if (orderErr || !order) {
    console.error("Order not found for payment:", asaasPaymentId, "/ ref:", externalRef);
    // Return 200 so Asaas doesn't retry indefinitely for a mismatched event
    return json(200, { received: true, action: "order_not_found" });
  }

  /* ── 6. Idempotency: skip if already paid ── */
  if (order.status === "paid") {
    console.log(`Order ${order.id} already paid — idempotent skip`);
    return json(200, { received: true, action: "already_paid" });
  }

  /* ── 7. Mark order as paid (atomic) ── */
  const { error: updateErr } = await supabase
    .from("orders")
    .update({
      status:           "paid",
      paid_at:          new Date().toISOString(),
      asaas_payment_id: asaasPaymentId,
      payment_method:   billingType.toLowerCase(),
    })
    .eq("id", order.id)
    .eq("status", "pending"); // guard: only update if still pending

  if (updateErr) {
    console.error("Failed to mark order as paid:", updateErr.message);
    return json(500, { error: "Falha ao atualizar pedido" });
  }

  console.log(`Order ${order.id} marked as paid | method=${billingType} | value=${confirmedValue}`);

  /* ── 8. Grant product access ── */
  let accessGranted = false;

  if (order.user_id) {
    // Known user → insert directly
    const { error: accessErr } = await supabase
      .from("user_products")
      .upsert(
        { user_id: order.user_id, product_id: order.product_id },
        { onConflict: "user_id,product_id" }
      );

    if (accessErr) {
      console.error("Failed to grant user_products access:", accessErr.message);
      // Don't return 500 — order is paid, access can be granted manually
    } else {
      accessGranted = true;
      console.log(`Access granted: user=${order.user_id} → product=${order.product_id}`);
    }
  } else {
    // Anonymous purchase: find user by email in user_profiles
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("email", order.email.toLowerCase())
      .maybeSingle();

    if (profile?.id) {
      const { error: accessErr } = await supabase
        .from("user_products")
        .upsert(
          { user_id: profile.id, product_id: order.product_id },
          { onConflict: "user_id,product_id" }
        );

      if (!accessErr) {
        // Also update order.user_id for future reference
        await supabase
          .from("orders")
          .update({ user_id: profile.id })
          .eq("id", order.id);

        accessGranted = true;
        console.log(`Access granted (by email lookup): user=${profile.id} → product=${order.product_id}`);
      } else {
        console.error("Failed to grant access (email lookup):", accessErr.message);
      }
    } else {
      console.warn(`No user_profile found for email ${order.email} — access pending account creation`);
    }
  }

  /* ── 9. Sequenzy: fire-and-forget (non-blocking) ── */
  const sequenzyApiKey = Deno.env.get("SEQUENZY_API_KEY");
  if (sequenzyApiKey && order.email) {
    const firstName  = (order.name?.split(" ")[0] || order.email.split("@")[0]).trim();
    const amountFmt  = `R$ ${confirmedValue.toFixed(2).replace(".", ",")}`;

    // Fetch product title for the email
    const { data: product } = await supabase
      .from("products")
      .select("title, slug")
      .eq("id", order.product_id)
      .single();

    const productTitle = product?.title ?? "Despertar Espiral";
    const productSlug  = product?.slug  ?? "";

    await Promise.allSettled([
      // 1. Update subscriber status
      fetch("https://api.sequenzy.com/api/v1/subscribers", {
        method:  "POST",
        headers: { Authorization: `Bearer ${sequenzyApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          email: order.email,
          firstName,
          customAttributes: {
            status:         "compra_confirmada",
            product_slug:   productSlug,
            product_title:  productTitle,
            order_id:       order.id,
            amount:         confirmedValue,
            payment_method: billingType.toLowerCase(),
            paid_at:        confirmedAt,
          },
        }),
      }).catch((e) => console.warn("Sequenzy subscriber update failed:", e)),

      // 2. Add buyer tags
      sequenzyTags(sequenzyApiKey, order.email, [
        "compra-confirmada",
        `produto-${productSlug}`,
        `metodo-${billingType.toLowerCase()}`,
        "cliente-ativo",
        "plataforma-despertar",
      ]),

      // 3. Fire "compra_confirmada" event
      sequenzyEvent(sequenzyApiKey, order.email, "compra_confirmada", {
        product_title:  productTitle,
        product_slug:   productSlug,
        amount:         confirmedValue,
        amount_fmt:     amountFmt,
        order_id:       order.id,
        payment_method: billingType.toLowerCase(),
        paid_at:        confirmedAt,
        access_granted: accessGranted,
      }),

      // 4. Send access confirmation transactional email
      fetch("https://api.sequenzy.com/api/v1/transactional/send", {
        method:  "POST",
        headers: { Authorization: `Bearer ${sequenzyApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          to:   order.email,
          slug: "acesso-liberado",
          variables: {
            firstName,
            productTitle,
            loginUrl:     "https://despertarespiral.com/login",
            supportEmail: "contato@despertarespiral.com",
            orderId:      order.id.slice(0, 8).toUpperCase(),
            amount:       amountFmt,
          },
        }),
      }).catch((e) => console.warn("Sequenzy transactional email failed:", e)),
    ]);
  }

  console.log(`Webhook processed: order=${order.id} | paid | access=${accessGranted}`);

  return json(200, {
    received:      true,
    action:        "payment_confirmed",
    orderId:       order.id,
    accessGranted,
  });
});
