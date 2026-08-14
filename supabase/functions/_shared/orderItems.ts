/**
 * Produtos de um pedido, com fallback.
 *
 * Pedido novo tem linhas em `order_items` (principal + bump). Pedido antigo
 * nao tem nenhuma — e para esse caso existe o fallback em `orders.product_id`,
 * que mantem TODO pedido anterior ao bump funcionando exatamente como antes.
 */
// deno-lint-ignore no-explicit-any
export async function produtosDoPedido(supabase: any, order: { id: string; product_id?: string | null }): Promise<string[]> {
  const { data: itens, error } = await supabase
    .from("order_items")
    .select("product_id")
    .eq("order_id", order.id);

  if (error) {
    console.error("[order_items] leitura falhou, usando fallback:", error.message);
  }

  const ids = ((itens ?? []) as { product_id: string }[])
    .map((i) => i.product_id)
    .filter(Boolean);

  if (ids.length > 0) return Array.from(new Set(ids));
  return order.product_id ? [order.product_id] : [];
}
