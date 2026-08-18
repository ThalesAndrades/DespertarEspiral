/**
 * Edge Function: asaas-webhook
 * Called by Asaas when a PIX or boleto payment is confirmed/received.
 *
 * Security: header `asaas-access-token` is compared via timing-safe equality.
 * On success: marks order as paid + grants user_products access immediately.
 * Sequenzy: fires order.paid, product.access_granted, saas.purchase events.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  sequenzyUpsertSubscriber,
  sequenzyEvent,
  sequenzyTags,
  sequenzyBatch,
} from "../_shared/sequenzy.ts";

/* ── Timing-safe string comparison (prevents timing attacks) ── */
function safeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i];
  return diff === 0;
}

/* ── Events we act on ── */
const CONFIRMED_EVENTS = new Set([
  "PAYMENT_CONFIRMED",
  "PAYMENT_RECEIVED",
  "PAYMENT_APPROVED_BY_RISK_ANALYSIS",
]);

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

/* ════════════════════════════════════════════════════════════
   MAIN HANDLER
   ════════════════════════════════════════════════════════════ */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json(405, { error: "Método não permitido" });

  /* ── 1. Authenticate webhook ── */
  const webhookToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
  if (!webhookToken) { console.error("ASAAS_WEBHOOK_TOKEN not configured"); return json(500, { error: "Webhook token não configurado" }); }

  const receivedToken = req.headers.get("asaas-access-token") ?? "";
  if (!safeEquals(receivedToken, webhookToken)) { console.warn("Asaas webhook: token inválido"); return json(401, { error: "Token inválido" }); }

  /* ── 2. Parse payload ── */
  let payload: Record<string, unknown>;
  try { payload = await req.json(); }
  catch { return json(400, { error: "Payload inválido" }); }

  const event   = (payload.event as string | undefined) ?? "";
  const payment = (payload.payment as Record<string, unknown> | undefined) ?? {};

  console.log(`Asaas webhook: event=${event} | payment.id=${payment.id}`);

  if (!CONFIRMED_EVENTS.has(event)) {
    console.log(`Event "${event}" ignored`);
    return json(200, { received: true, action: "ignored" });
  }

  const asaasPaymentId = (payment.id               as string | undefined) ?? "";
  const externalRef    = (payment.externalReference as string | undefined) ?? "";
  const billingTypeRaw = (payment.billingType       as string | undefined) ?? "";
  const confirmedValue = (payment.value             as number | undefined) ?? 0;
  // Use confirmedDate from Asaas (YYYY-MM-DD in BRT); fallback to current date in BRT
  const confirmedAt    = (payment.confirmedDate as string | undefined)
    ?? new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10); // UTC-3

  // Normalize billingType to match our schema's payment_method values
  const billingType = billingTypeRaw === "CREDIT_CARD" ? "credit"
    : billingTypeRaw === "BOLETO" ? "boleto"
    : billingTypeRaw === "PIX"    ? "pix"
    : billingTypeRaw.toLowerCase();

  if (!asaasPaymentId) return json(400, { error: "payment.id ausente" });

  /* ── 3. Init Supabase admin client ── */
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")              ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  /* ── 4. Find order ── */
  let { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("id, user_id, product_id, email, name, status, amount")
    .eq("asaas_payment_id", asaasPaymentId)
    .single();

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
    return json(200, { received: true, action: "order_not_found" });
  }

  /* ── 5. Idempotency ── */
  if (order.status === "paid") {
    console.log(`Order ${order.id} already paid — idempotent skip`);
    return json(200, { received: true, action: "already_paid" });
  }

  /* ── 6. Mark order as paid (atomic) ── */
  const { error: updateErr } = await supabase
    .from("orders")
    .update({
      status:           "paid",
      paid_at:          new Date().toISOString(),
      asaas_payment_id: asaasPaymentId,
      payment_method:   billingType.toLowerCase(),
    })
    .eq("id", order.id)
    .eq("status", "pending");

  if (updateErr) {
    console.error("Failed to mark order as paid:", updateErr.message);
    return json(500, { error: "Falha ao atualizar pedido" });
  }

  console.log(`Order ${order.id} marked as paid | method=${billingType} | value=${confirmedValue}`);

  /* ── 7. Grant product access ── */
  let accessGranted = false;
  let grantedUserId: string | null = order.user_id ?? null;

  if (order.user_id) {
    const { error: accessErr } = await supabase
      .from("user_products")
      .upsert(
        { user_id: order.user_id, product_id: order.product_id },
        { onConflict: "user_id,product_id" }
      );
    if (!accessErr) { accessGranted = true; console.log(`Access granted: user=${order.user_id}`); }
    else console.error("Failed to grant access:", accessErr.message);
  } else {
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
        await supabase.from("orders").update({ user_id: profile.id }).eq("id", order.id);
        accessGranted = true;
        grantedUserId = profile.id;
        console.log(`Access granted (email lookup): user=${profile.id}`);
      } else {
        console.error("Failed to grant access (email lookup):", accessErr.message);
      }
    } else {
      console.warn(`No profile found for ${order.email} — access pending account creation`);
    }
  }

  /* ── 8. Sequenzy events (fire-and-forget) ── */
  const sequenzyApiKey = Deno.env.get("SEQUENZY_API_KEY");
  if (sequenzyApiKey && order.email) {
    const firstName    = (order.name?.split(" ")[0] || order.email.split("@")[0]).trim();
    const amountFmt    = `R$ ${confirmedValue.toFixed(2).replace(".", ",")}`;

    const { data: product } = await supabase
      .from("products")
      .select("title, slug")
      .eq("id", order.product_id)
      .single();

    const productTitle = product?.title ?? "Despertar Espiral";
    const productSlug  = product?.slug  ?? "";

    sequenzyBatch([
      /* Upsert subscriber with purchase attributes */
      sequenzyUpsertSubscriber(sequenzyApiKey, {
        email: order.email,
        firstName,
        customAttributes: {
          status:         "cliente",
          product_slug:   productSlug,
          product_title:  productTitle,
          last_order_id:  order.id,
          last_purchase_amount: confirmedValue,
          last_payment_method: billingType.toLowerCase(),
          last_paid_at:   confirmedAt,
        },
      }),

      /* order.paid — triggers "Pós-compra (Ativação e Sucesso)" sequence */
      sequenzyEvent(sequenzyApiKey, order.email, "order.paid", {
        product_title:  productTitle,
        product_slug:   productSlug,
        amount:         confirmedValue,
        amount_fmt:     amountFmt,
        order_id:       order.id,
        payment_method: billingType.toLowerCase(),
        paid_at:        confirmedAt,
        access_granted: accessGranted,
      }),

      /* saas.purchase — built-in SaaS event for dashboard metrics */
      sequenzyEvent(sequenzyApiKey, order.email, "saas.purchase", {
        amount:         confirmedValue,
        product_slug:   productSlug,
        payment_method: billingType.toLowerCase(),
      }),

      /* product.access_granted — triggers "Acesso Liberado" sequence */
      ...(accessGranted ? [
        sequenzyEvent(sequenzyApiKey, order.email, "product.access_granted", {
          product_title:  productTitle,
          product_slug:   productSlug,
          order_id:       order.id,
          login_url:      "https://despertarespiral.com/login",
        }),
      ] : []),

      /* compra_confirmada — custom event (fires "checkout-recovery" stop trigger too) */
      sequenzyEvent(sequenzyApiKey, order.email, "compra_confirmada", {
        product_title:  productTitle,
        product_slug:   productSlug,
        amount:         confirmedValue,
        amount_fmt:     amountFmt,
        order_id:       order.id,
        payment_method: billingType.toLowerCase(),
        paid_at:        confirmedAt,
      }),

      /* Tags */
      sequenzyTags(
        sequenzyApiKey,
        order.email,
        ["compra-confirmada", `produto-${productSlug}`, `metodo-${billingType}`, "cliente-ativo", "plataforma-despertar"],
        ["checkout-iniciado", "lead-morno", "visitante", "pedido-registrado"]
      ),
    ]);
  }

  console.log(`Webhook processed: order=${order.id} | paid | access=${accessGranted}`);
  return json(200, { received: true, action: "payment_confirmed", orderId: order.id, accessGranted });
});
