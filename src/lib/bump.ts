/**
 * Bump de R$ 27 — regra pura, sem React e sem Supabase.
 *
 * Espelha a validacao que a edge function `checkout-session` faz do lado do
 * servidor. Aqui e APRESENTACAO (decide se a caixa aparece); la e a TRAVA
 * (decide se cobra). As duas precisam concordar, mas a do servidor e a que
 * vale — mesmo padrao ja usado para `status = disponivel` no catalogo.
 */

export const BUMP_SLUG = "mapa-dos-sentimentos";

export interface ProdutoBump {
  id: string;
  slug: string;
  title: string;
  price: number;
  is_active?: boolean;
  status?: string;
}

/**
 * O bump so pode ser oferecido quando existe, esta ativo, esta `disponivel`,
 * tem preco positivo e NAO e o proprio produto que ja esta sendo comprado
 * (senao a aluna pagaria duas vezes pela mesma coisa).
 */
export function bumpOferecivel(
  bump: ProdutoBump | null | undefined,
  slugDoCheckout: string | undefined
): boolean {
  if (!bump) return false;
  if (bump.slug === slugDoCheckout) return false;
  if (bump.is_active === false) return false;
  if (bump.status !== "disponivel") return false;
  return Number.isFinite(bump.price) && bump.price > 0;
}

/** Soma em centavos e volta para reais: evita 47.9 + 27.5 = 75.39999999999999. */
export function calcularTotal(
  precoProduto: number,
  precoBump: number | null | undefined,
  marcado: boolean
): number {
  if (!Number.isFinite(precoProduto)) return 0;
  const base = precoProduto;
  const extra = marcado && Number.isFinite(precoBump as number) ? (precoBump as number) : 0;
  return Math.round((base + extra) * 100) / 100;
}
