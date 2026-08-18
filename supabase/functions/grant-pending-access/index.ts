/**
 * Edge Function: grant-pending-access
 * Called right after account creation to retroactively grant product access
 * to users who purchased before creating an account (guest checkout).
 *
 * Flow:
 *  1. Verify JWT — caller must be the newly-registered user
 *  2. Find paid orders for that email with no user_products entry for this user
 *  3. Insert user_products for each found product (upsert — idempotent)
 *  4. Link order.user_id to the new account (if previously null)
 *  5. Fire Sequenzy product.access_granted for each product
 *
 * Returns: { granted: number, products: string[] }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeadersFor, handleCors } from "../_shared/cors.ts";
import {
  sequenzyUpsertSubscriber,
  sequenzyEvent,
  sequenzyTags,
  sequenzyBatch,
} from "../_shared/sequenzy.ts";

function json(status: number, body: unknown, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

Deno.serve(async (req: Request) => {
  const cors = corsHeadersFor(req);
  const preflight = handleCors(req);
  if (preflight) return preflight;

  if (req.method !== "POST") return json(405, { error: "Method not allowed" }, cors);

  /* ── 1. Authenticate — extract user from JWT ── */
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json(401, { error: "Authorization required" }, cors);
  }
  const token = authHeader.replace("Bearer ", "").trim();

  // Use anon client just to verify the JWT and extract user id/email
  const supabaseAnon = createClient(
    Deno.env.get("SUPABASE_URL")       ?? "",
    Deno.env.get("SUPABASE_ANON_KEY")  ?? ""
  );
  const { data: { user }, error: authErr } = await supabaseAnon.auth.getUser(token);
  if (authErr || !user) {
    console.warn("[grant-pending-access] Invalid JWT:", authErr?.message);
    return json(401, { error: "Invalid or expired session" }, cors);
  }

  const userId = user.id;
  const email  = (user.email ?? "").toLowerCase().trim();

  if (!email) {
    return json(400, { error: "User has no email address" }, cors);
  }

  console.log(`[grant-pending-access] Checking pending access for user=${userId} email=${email}`);

  /* ── 2. Admin client for RLS-bypass queries ── */
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")              ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  /* ── 3. Find paid orders for this email ── */
  const { data: paidOrders, error: ordersErr } = await supabase
    .from("orders")
    .select("id, product_id, user_id, name, amount, payment_method, paid_at, products(title, slug)")
    .eq("email", email)
    .eq("status", "paid");

  if (ordersErr) {
    console.error("[grant-pending-access] Orders query failed:", ordersErr.message);
    return json(500, { error: "Failed to query orders" }, cors);
  }

  if (!paidOrders || paidOrders.length === 0) {
    console.log("[grant-pending-access] No paid orders found for this email — nothing to grant");
    return json(200, { granted: 0, products: [] }, cors);
  }

  /* ── 3b. Buscar os itens desses pedidos, em consulta SEPARADA ──
     Deliberadamente nao embutida na query acima: se um embed `order_items(...)`
     nao resolver (nome de FK, RLS etc.), o erro do PostgREST derrubaria a
     query INTEIRA de pedidos. A migracao (gate 1) e o deploy das functions
     (gate 2) sao aprovacoes separadas neste plano — um deploy fora de ordem
     faria esta function parar de conceder acesso para TODO MUNDO, inclusive
     quem compra sem bump hoje. Isso violaria "comportamento sem bump e
     intocavel". Consulta separada = um erro aqui fica local a esta function,
     nunca derruba a busca de pedidos.

     ASSIMETRIA vs. asaas-webhook — de proposito, NAO "harmonizar":
     no webhook, uma falha de leitura aborta ANTES de marcar o pedido como
     pago, pra preservar o retry do gateway (marcar pago e falhar depois seria
     permanente). Aqui nao ha status de pedido em jogo: esta function e
     re-executada a cada login/criacao de conta e recalcula tudo do zero
     (`alreadyGranted`, abaixo). Por isso, se a leitura de order_items falhar,
     a escolha e degradar para o produto principal em vez de abortar —
     "conceder so o principal agora" nunca e pior que "nao conceder nada", e
     se a leitura voltar a funcionar na proxima chamada o bump e concedido
     normalmente. */
  const orderIds = paidOrders.map((o) => o.id as string);
  const { data: allItems, error: itemsErr } = await supabase
    .from("order_items")
    .select("order_id, product_id, products(title, slug)")
    .in("order_id", orderIds);

  if (itemsErr) {
    console.error(
      `[grant-pending-access] order_items ilegivel, degradando para o produto principal em todos os pedidos [${orderIds.join(",")}]:`,
      itemsErr.message
    );
  }

  const itensPorPedido = new Map<string, { product_id: string; products?: { title?: string; slug?: string } | null }[]>();
  for (const it of (allItems ?? []) as { order_id: string; product_id: string; products?: { title?: string; slug?: string } | null }[]) {
    const lista = itensPorPedido.get(it.order_id) ?? [];
    lista.push(it);
    itensPorPedido.set(it.order_id, lista);
  }

  /* ── 4. Find which products this user already has access to ── */
  const { data: existingAccess } = await supabase
    .from("user_products")
    .select("product_id")
    .eq("user_id", userId);

  const alreadyGranted = new Set((existingAccess ?? []).map((up: { product_id: string }) => up.product_id));

  /* ── 5. Achatar pedidos em produtos (bump: um pedido pode ter dois) ── */
  interface ItemLiberavel { productId: string; title: string; slug: string; order: Record<string, unknown> }

  const seen = new Set<string>();
  const toGrant: ItemLiberavel[] = [];

  for (const order of paidOrders) {
    const itens = itensPorPedido.get(order.id as string) ?? [];

    // Pedido antigo (sem itens) OU leitura de order_items degradada (ver 3b) cai no produto principal.
    const candidatos: ItemLiberavel[] = itens.length > 0
      ? itens.filter((i) => i.product_id).map((i) => ({
          productId: i.product_id,
          title: i.products?.title ?? "Produto",
          slug:  i.products?.slug  ?? "",
          order: order as Record<string, unknown>,
        }))
      : (order.product_id
          ? [{
              productId: order.product_id as string,
              title: (order.products as { title?: string } | null)?.title ?? "Produto",
              slug:  (order.products as { slug?: string  } | null)?.slug  ?? "",
              order: order as Record<string, unknown>,
            }]
          : []);

    for (const c of candidatos) {
      if (alreadyGranted.has(c.productId) || seen.has(c.productId)) continue;
      seen.add(c.productId);
      toGrant.push(c);
    }
  }

  if (toGrant.length === 0) {
    console.log(`[grant-pending-access] All ${paidOrders.length} paid order(s) already have access granted`);
    return json(200, { granted: 0, products: [] }, cors);
  }

  console.log(`[grant-pending-access] Granting access to ${toGrant.length} product(s)`);

  const grantedProducts: string[] = [];

  for (const item of toGrant) {
    const productId    = item.productId;
    const productTitle = item.title;
    const productSlug  = item.slug;

    /* Insert user_products */
    const { error: grantErr } = await supabase
      .from("user_products")
      .upsert(
        { user_id: userId, product_id: productId },
        { onConflict: "user_id,product_id" }
      );

    if (grantErr) {
      console.error(`[grant-pending-access] Failed to grant product=${productId}:`, grantErr.message);
      continue; // don't abort — try remaining products
    }

    /* Link order.user_id if it was null (guest checkout) */
    if (!item.order.user_id) {
      const { error: linkErr } = await supabase
        .from("orders")
        .update({ user_id: userId })
        .eq("id", item.order.id)
        .is("user_id", null);
      if (linkErr) console.warn("[grant-pending-access] Could not link order.user_id:", linkErr.message);
    }

    grantedProducts.push(productSlug || productId);
    console.log(`[grant-pending-access] Granted: product=${productSlug} user=${userId}`);

    /* ── Sequenzy: fire access_granted for each product (non-blocking) ── */
    const sequenzyApiKey = Deno.env.get("SEQUENZY_API_KEY");
    if (sequenzyApiKey && email) {
      const firstName = (
        (item.order.name as string | null)?.split(" ")[0] ||
        email.split("@")[0]
      ).trim();

      sequenzyBatch([
        sequenzyUpsertSubscriber(sequenzyApiKey, {
          email,
          firstName,
          customAttributes: {
            status:               "cliente",
            product_slug:         productSlug,
            product_title:        productTitle,
            last_order_id:        item.order.id as string,
            last_payment_method:  (item.order.payment_method as string | null) ?? "pix",
            account_linked_at:    new Date().toISOString(),
          },
        }),

        /* product.access_granted — triggers "Acesso Liberado" sequence */
        sequenzyEvent(sequenzyApiKey, email, "product.access_granted", {
          product_title:   productTitle,
          product_slug:    productSlug,
          order_id:        item.order.id as string,
          login_url:       "https://despertarespiral.com/login",
          triggered_by:    "account_creation",
        }),

        /* Tags */
        sequenzyTags(
          sequenzyApiKey,
          email,
          ["acesso-liberado", "cliente-ativo", `produto-${productSlug}`, "plataforma-despertar"],
          ["visitante", "lead-morno"]
        ),
      ]);
    }
  }

  console.log(`[grant-pending-access] Done: granted=${grantedProducts.length} skipped=${toGrant.length - grantedProducts.length}`);

  return json(200, {
    granted:  grantedProducts.length,
    products: grantedProducts,
  }, cors);
});
