/**
 * Edge Function: order-recovery
 * Detects pending orders older than 2h with a real Asaas payment ID,
 * fires `order.overdue` via Sequenzy to trigger the "Recuperação de Checkout" sequence,
 * and marks `recovery_sent_at` for idempotency.
 *
 * Invocation modes:
 *  - Fire-and-forget from checkout-session (piggyback on new checkout traffic)
 *  - Manual POST from Admin panel (with admin JWT)
 *
 * POST body (optional): { dryRun?: boolean, overrideHours?: number }
 * Returns: { processed: number, skipped: number, orders: string[] }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeadersFor, handleCors } from "../_shared/cors.ts";
import {
  sequenzyUpsertSubscriber,
  sequenzyEvent,
  sequenzyTags,
  sequenzyBatch,
} from "../_shared/sequenzy.ts";

const SITE_URL     = (Deno.env.get("PUBLIC_SITE_URL") ?? "https://despertarespiral.com").replace(/\/+$/, "");
const DEFAULT_HOURS = 2; // hours after which a pending order is considered overdue
const MAX_BATCH     = 50; // max orders to process per invocation

function json(status: number, body: unknown, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

Deno.serve(async (req: Request) => {
  const cors = corsHeadersFor(req);
  const preflight = handleCors(req);
  if (preflight) return preflight;

  if (req.method !== "POST") return json(405, { error: "Method not allowed" }, cors);

  /* ── Optional body params ── */
  let dryRun = false;
  let overrideHours = DEFAULT_HOURS;
  try {
    const body = await req.json().catch(() => ({}));
    dryRun        = Boolean(body.dryRun);
    overrideHours = typeof body.overrideHours === "number" && body.overrideHours > 0
      ? body.overrideHours
      : DEFAULT_HOURS;
  } catch { /* use defaults */ }

  /* ── Verify SEQUENZY_API_KEY ── */
  const sequenzyApiKey = Deno.env.get("SEQUENZY_API_KEY");
  if (!sequenzyApiKey) {
    console.warn("[order-recovery] SEQUENZY_API_KEY not configured — skipping");
    return json(200, { ok: true, processed: 0, skipped: 0, reason: "sequenzy_not_configured" }, cors);
  }

  /* ── Admin client ── */
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")              ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  /* ── Find overdue pending orders ── */
  const cutoff = new Date(Date.now() - overrideHours * 60 * 60 * 1000).toISOString();

  const { data: overdueOrders, error: queryErr } = await supabase
    .from("orders")
    .select(`
      id,
      email,
      name,
      amount,
      payment_method,
      created_at,
      recovery_sent_at,
      products ( title, slug )
    `)
    .eq("status", "pending")
    .not("asaas_payment_id", "is", null)   // only real Asaas-initiated orders
    .is("recovery_sent_at", null)           // not already recovered
    .lt("created_at", cutoff)              // older than threshold
    .limit(MAX_BATCH)
    .order("created_at", { ascending: true });

  if (queryErr) {
    console.error("[order-recovery] Query failed:", queryErr.message);
    return json(500, { error: "Query failed", details: queryErr.message }, cors);
  }

  if (!overdueOrders || overdueOrders.length === 0) {
    console.log("[order-recovery] No overdue orders found");
    return json(200, { ok: true, processed: 0, skipped: 0, orders: [] }, cors);
  }

  console.log(`[order-recovery] Found ${overdueOrders.length} overdue orders (dryRun=${dryRun})`);

  const processedIds: string[] = [];
  const skippedIds: string[]   = [];

  for (const order of overdueOrders) {
    const product = (order.products as { title: string; slug: string } | null);
    const productTitle = product?.title ?? "Despertar Espiral";
    const productSlug  = product?.slug  ?? "";
    const firstName    = (order.name?.split(" ")[0] || order.email.split("@")[0]).trim();
    const amountFmt    = `R$ ${(order.amount as number).toFixed(2).replace(".", ",")}`;
    const checkoutUrl  = `${SITE_URL}/checkout/${productSlug}`;
    const createdAt    = new Date(order.created_at as string);
    const hoursAgo     = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60));

    if (dryRun) {
      console.log(`[order-recovery][DRY RUN] Would process: order=${order.id} email=${order.email} product=${productSlug} hours_ago=${hoursAgo}`);
      processedIds.push(order.id as string);
      continue;
    }

    try {
      /* Mark recovery_sent_at first (optimistic lock) */
      const { error: updateErr } = await supabase
        .from("orders")
        .update({ recovery_sent_at: new Date().toISOString() })
        .eq("id", order.id)
        .is("recovery_sent_at", null); // double-check idempotency at DB level

      if (updateErr) {
        console.warn(`[order-recovery] Could not lock order ${order.id}:`, updateErr.message);
        skippedIds.push(order.id as string);
        continue;
      }

      /* Fire Sequenzy events (non-blocking) */
      sequenzyBatch([
        /* Upsert subscriber */
        sequenzyUpsertSubscriber(sequenzyApiKey, {
          email: order.email as string,
          firstName,
          customAttributes: {
            status:               "checkout-pendente",
            product_slug:         productSlug,
            product_title:        productTitle,
            last_order_id:        order.id,
            checkout_url:         checkoutUrl,
            hours_since_checkout: hoursAgo,
          },
        }),

        /* order.overdue — triggers "Recuperação de Checkout" sequence */
        sequenzyEvent(sequenzyApiKey, order.email as string, "order.overdue", {
          product_title:        productTitle,
          product_slug:         productSlug,
          amount:               order.amount as number,
          amount_fmt:           amountFmt,
          order_id:             order.id as string,
          payment_method:       (order.payment_method as string | null) ?? "pix",
          checkout_url:         checkoutUrl,
          hours_since_checkout: hoursAgo,
          created_at:           order.created_at as string,
        }),

        /* Tags */
        sequenzyTags(
          sequenzyApiKey,
          order.email as string,
          ["checkout-abandonado", "recuperacao-ativa", `produto-${productSlug}`],
          ["checkout-iniciado"]
        ),
      ]);

      processedIds.push(order.id as string);
      console.log(`[order-recovery] Processed: order=${order.id} email=${order.email} product=${productSlug} hours_ago=${hoursAgo}`);

    } catch (err) {
      console.error(`[order-recovery] Failed for order ${order.id}:`, err);
      skippedIds.push(order.id as string);

      /* Rollback the lock if Sequenzy dispatch itself errored */
      await supabase
        .from("orders")
        .update({ recovery_sent_at: null })
        .eq("id", order.id)
        .catch(() => {});
    }
  }

  console.log(`[order-recovery] Done: processed=${processedIds.length} skipped=${skippedIds.length}`);

  return json(200, {
    ok:        true,
    dryRun,
    processed: processedIds.length,
    skipped:   skippedIds.length,
    orders:    processedIds,
  }, cors);
});
