/**
 * Edge Function: woovi-webhook
 * Chamada pela Woovi quando uma cobranca PIX e paga (OPENPIX:CHARGE_COMPLETED).
 *
 * Seguranca: NAO confia no payload. Reconsulta a cobranca na API da Woovi
 * (Authorization: AppID nosso) e so marca o pedido como pago se o status LA
 * for COMPLETED — payload forjado vira no-op. Defesa equivalente a validar a
 * assinatura RSA do header, sem depender de chave publica configurada.
 *
 * Cadastro: a Woovi valida o endpoint no registro e exige 200 — sondagem
 * (GET, corpo vazio, evento de teste) SEMPRE volta 200 aqui.
 *
 * Codigos de resposta seguem a semantica de retry da Woovi:
 *   200 = processado OU ignorado de vez (nao re-tentar)
 *   500 = falha transitoria (re-tentar): config ausente, rede, banco
 *
 * On success: marca pedido pago + libera user_products (espelha asaas-webhook).
 * E-mail pos-compra: pendente da migracao Sequenzy -> Resend (decisao 14/08);
 * este webhook nao dispara automacao de e-mail.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getWooviCharge } from "../_shared/woovi.ts";
import { produtosDoPedido } from "../_shared/orderItems.ts";

const CONFIRMED_EVENT = "OPENPIX:CHARGE_COMPLETED";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-webhook-signature",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  // GET 200 = sondagem/health (a validacao de cadastro da Woovi exige 200).
  if (req.method !== "POST") return json(200, { ok: true, fn: "woovi-webhook" });

  /* ── 1. Parse tolerante: sondagem sem corpo/teste tambem precisa de 200 ── */
  let payload: Record<string, unknown> = {};
  try { payload = await req.json(); } catch { /* corpo vazio ou nao-JSON: sondagem */ }

  const evento = (payload.evento as string | undefined) ?? "";
  const event  = (payload.event  as string | undefined) ?? "";
  const charge = (payload.charge as Record<string, unknown> | undefined) ?? {};

  if (evento === "teste_webhook") return json(200, { received: true, action: "test_ok" });
  if (event !== CONFIRMED_EVENT) {
    console.log(`Woovi webhook: evento "${event || evento || "(vazio)"}" ignorado`);
    return json(200, { received: true, action: "ignored" });
  }

  const correlationID = (charge.correlationID as string | undefined) ?? "";
  const identifier    = (charge.identifier    as string | undefined) ?? "";
  const lookupId      = identifier || correlationID;

  console.log(`Woovi webhook: ${CONFIRMED_EVENT} | correlationID=${correlationID} | identifier=${identifier}`);

  if (!lookupId) return json(200, { received: true, action: "ignored_no_charge_id" });

  /* ── 2. Fonte da verdade: a cobranca esta COMPLETED na API da Woovi? ── */
  const appId = Deno.env.get("WOOVI_APP_ID");
  if (!appId) { console.error("WOOVI_APP_ID nao configurado"); return json(500, { error: "Gateway nao configurado" }); }

  const lookup = await getWooviCharge(appId, lookupId);
  if (!lookup.ok) {
    if (lookup.notFound) {
      console.warn(`Cobranca ${lookupId} nao existe na Woovi — payload forjado ou lixo, descartado`);
      return json(200, { received: true, action: "charge_not_found" });
    }
    // Rede/5xx: 500 preserva o retry da Woovi.
    return json(500, { error: "Falha consultando a Woovi" });
  }
  if (lookup.status !== "COMPLETED") {
    console.log(`Cobranca ${lookupId} com status ${lookup.status} — nada a fazer`);
    return json(200, { received: true, action: "not_completed" });
  }

  /* ── 3. Supabase admin ── */
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")              ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  /* ── 4. Achar o pedido: correlationID e o NOSSO order.id (contrato do
     checkout-session); fallback pelo identifier gravado na criacao ── */
  const wooviIdentifier = lookup.identifier ?? identifier;
  const ourCorrelation  = lookup.correlationID ?? correlationID;

  let { data: order, error: orderErr } = ourCorrelation.length > 8
    ? await supabase
        .from("orders")
        .select("id, user_id, product_id, email, name, status, amount")
        .eq("id", ourCorrelation)
        .single()
    : { data: null, error: { message: "sem correlationID" } as { message: string } };

  if ((orderErr || !order) && wooviIdentifier) {
    const fallback = await supabase
      .from("orders")
      .select("id, user_id, product_id, email, name, status, amount")
      .eq("provider_charge_id", wooviIdentifier)
      .single();
    order    = fallback.data;
    orderErr = fallback.error;
  }

  if (orderErr || !order) {
    console.error("Pedido nao encontrado | correlationID:", ourCorrelation, "| identifier:", wooviIdentifier);
    return json(200, { received: true, action: "order_not_found" });
  }

  /* ── 5. Idempotencia ── */
  if (order.status === "paid") {
    console.log(`Pedido ${order.id} ja pago — skip idempotente`);
    return json(200, { received: true, action: "already_paid" });
  }

  /* ── 6. Itens ANTES de marcar pago (mesma razao do asaas-webhook: se a
     leitura falhar depois de pago, a idempotencia trancaria o retry e a
     perda de acesso ao segundo produto viraria permanente) ── */
  const itensResult = await produtosDoPedido(supabase, order);
  if (!itensResult.ok) {
    console.error(`order_items ilegivel — pedido NAO marcado como pago, retry preservado | order=${order.id}`);
    return json(500, { error: "Falha ao ler itens do pedido" });
  }
  const idsParaLiberar = itensResult.ids;

  /* ── 7. Marcar pago (atomico: so sai de pending) ── */
  const { error: updateErr } = await supabase
    .from("orders")
    .update({
      status:             "paid",
      paid_at:            new Date().toISOString(),
      payment_method:     "pix",
      provider:           "woovi",
      provider_charge_id: wooviIdentifier || ourCorrelation,
    })
    .eq("id", order.id)
    .eq("status", "pending");

  if (updateErr) {
    console.error("Falha marcando pedido como pago:", updateErr.message);
    return json(500, { error: "Falha ao atualizar pedido" });
  }

  console.log(`Pedido ${order.id} pago via Woovi/PIX`);

  /* ── 8. Liberar acesso (espelha asaas-webhook) ── */
  let accessGranted = false;

  async function liberarPara(userId: string): Promise<number> {
    let grantedCount = 0;
    for (const productId of idsParaLiberar) {
      const { error: accessErr } = await supabase
        .from("user_products")
        .upsert({ user_id: userId, product_id: productId }, { onConflict: "user_id,product_id" });
      if (accessErr) console.error(`Falha liberando acesso | order=${order.id} user=${userId} product=${productId}:`, accessErr.message);
      else grantedCount++;
    }
    return grantedCount;
  }

  if (order.user_id) {
    accessGranted = (await liberarPara(order.user_id)) > 0;
  } else {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("email", order.email.toLowerCase())
      .maybeSingle();

    if (profile?.id) {
      accessGranted = (await liberarPara(profile.id)) > 0;
      if (accessGranted) await supabase.from("orders").update({ user_id: profile.id }).eq("id", order.id);
    } else {
      console.warn(`Sem perfil para ${order.email} — acesso pendente de criacao de conta`);
    }
  }

  console.log(`Webhook processado: order=${order.id} | paid | access=${accessGranted}`);
  return json(200, { received: true, action: "payment_confirmed", orderId: order.id, accessGranted });
});
