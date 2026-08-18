/**
 * Produtos de um pedido, com fallback.
 *
 * Pedido novo tem linhas em `order_items` (principal + bump). Pedido antigo
 * nao tem nenhuma — e para esse caso existe o fallback em `orders.product_id`,
 * que mantem TODO pedido anterior ao bump funcionando exatamente como antes.
 *
 * `ok` distingue "pedido antigo, sem itens de verdade" (ok=true, fallback no
 * principal) de "a leitura falhou" (ok=false). As duas coisas NAO podem virar
 * o mesmo caminho: um pedido com bump cuja leitura falhou, se caisse no
 * fallback do principal, perderia o item do bump em silencio — a aluna paga
 * por dois produtos e o codigo achataria para um sem nenhum log distinguivel.
 * Cada chamador decide o que fazer com `ok=false`; o helper so avisa.
 */
// deno-lint-ignore no-explicit-any
export async function produtosDoPedido(
  supabase: any,
  order: { id: string; product_id?: string | null }
): Promise<{ ok: boolean; ids: string[] }> {
  const { data: itens, error } = await supabase
    .from("order_items")
    .select("product_id")
    .eq("order_id", order.id);

  if (error) {
    console.error(`[order_items] leitura falhou | order=${order.id}:`, error.message);
    return { ok: false, ids: [] };
  }

  const ids = ((itens ?? []) as { product_id: string }[])
    .map((i) => i.product_id)
    .filter(Boolean);

  if (ids.length > 0) return { ok: true, ids: Array.from(new Set(ids)) };
  return { ok: true, ids: order.product_id ? [order.product_id] : [] };
}
