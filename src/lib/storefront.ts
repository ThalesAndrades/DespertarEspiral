import { supabase } from "@/lib/supabase";
import type { StorefrontProduct } from "@/types";

const STATUS_RANK: Record<string, number> = { disponivel: 0, em_breve: 1 };

/**
 * Ordena a vitrine: sort_order manda; no empate, o que da pra comprar vem antes.
 * Retorna um array novo — o de entrada nao e mutado.
 */
export function sortStorefront(products: StorefrontProduct[]): StorefrontProduct[] {
  return [...products].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9);
  });
}

export async function fetchStorefront(): Promise<StorefrontProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id, slug, title, subtitle, promise, price, thumbnail, status, highlights, sort_order")
    .eq("is_active", true);

  if (error) {
    console.error("[storefront] falha ao carregar produtos", error.message);
    return [];
  }

  const rows = (data ?? []).map((r) => ({
    ...r,
    promise: r.promise ?? "",
    subtitle: r.subtitle ?? "",
    highlights: Array.isArray(r.highlights) ? (r.highlights as string[]) : [],
  })) as StorefrontProduct[];

  return sortStorefront(rows);
}
