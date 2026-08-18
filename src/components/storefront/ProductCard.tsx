import { Link } from "react-router-dom";
import type { StorefrontProduct } from "@/types";
import { formatBRL } from "@/lib/dateUtils";

// Produtos gratuitos tem destino proprio (nao ha checkout de R$ 0).
// Um segundo gratuito SEM entrada aqui cai no "em breve"/avise-me — nunca
// num checkout quebrado.
const FREE_ROUTES: Record<string, { href: string; label: string }> = {
  "bussola-da-espiral": { href: "/bussola", label: "Fazer o diagnóstico" },
};

interface ProductCardProps {
  product: StorefrontProduct;
  onNotify: (product: StorefrontProduct) => void;
  /** Produto core da esteira: ganha um degrau de destaque (borda dourada), nao um card gigante. */
  featured?: boolean;
}

/**
 * Card da vitrine. Densidade comercial dentro do DNA premium-calm:
 * preco sempre visivel, promessa em uma linha, tres destaques, um CTA.
 * Sem contador, sem tarja de desconto, sem escassez inventada.
 */
export function ProductCard({ product, onNotify, featured = false }: ProductCardProps) {
  const isGratuito = product.price === 0;
  const rotaGratuita = FREE_ROUTES[product.slug];
  // Gratuito sem rota mapeada nunca e "disponivel" na vitrine, mesmo que o
  // status do banco diga o contrario — cai no "avise-me" ate ganhar destino.
  const isAvailable = product.status === "disponivel" && (!isGratuito || !!rotaGratuita);
  const showInstallments = isAvailable && product.price >= 100 && !isGratuito;
  const ctaHref = rotaGratuita ? rotaGratuita.href : `/checkout/${product.slug}`;
  const ctaLabel = rotaGratuita ? rotaGratuita.label : "Quero começar";

  return (
    <article
      className="card-dark card-lift storefront-card"
      style={{
        display: "flex", flexDirection: "column", height: "100%",
        borderRadius: "var(--r-lg)", overflow: "hidden",
        opacity: isAvailable ? 1 : 0.86,
        border: featured ? "1px solid var(--gold-dim)" : undefined,
      }}
    >
      {product.thumbnail ? (
        <img
          src={product.thumbnail} alt="" aria-hidden="true"
          style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover" }}
          loading="lazy"
        />
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", padding: "var(--space-5)", flex: 1 }}>
        {!isAvailable && (
          <span className="overline" style={{ color: "var(--text-muted)" }}>Em breve</span>
        )}

        <h3 className="font-display" style={{ fontSize: "clamp(22px,2.4vw,30px)", fontWeight: 300, fontStyle: "italic", lineHeight: 1.12, color: "var(--text-primary)" }}>
          {product.title}
        </h3>

        {product.promise && (
          <p className="font-body" style={{ fontSize: "var(--fs-sm)", color: "var(--text-secondary)" }}>
            {product.promise}
          </p>
        )}

        {product.highlights.length > 0 && (
          <ul style={{ display: "grid", gap: "var(--space-1)", listStyle: "none", padding: 0, margin: 0 }}>
            {product.highlights.slice(0, 3).map((item) => (
              <li key={item} className="font-body" style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>
                {item}
              </li>
            ))}
          </ul>
        )}

        <div style={{ marginTop: "auto", display: "grid", gap: "var(--space-3)" }}>
          {isAvailable ? (
            <>
              <p className="font-display" style={{ fontSize: "var(--fs-xl)", color: "var(--gold)", fontWeight: 300 }}>
                {isGratuito ? "Gratuito" : formatBRL(product.price)}
              </p>
              {showInstallments && (
                <p className="font-body" style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginTop: "calc(var(--space-1) * -1)" }}>
                  ou 12× de {formatBRL(product.price / 12)}
                </p>
              )}
              <Link to={ctaHref} className="btn-gold" style={{ textAlign: "center" }}>
                {ctaLabel}
              </Link>
              {!isGratuito && (
                <p className="font-body" style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)", textAlign: "center" }}>
                  Garantia de 7 dias
                </p>
              )}
            </>
          ) : (
            <button type="button" className="btn-outline-gold interactive" onClick={() => onNotify(product)}>
              Avise-me quando abrir
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
