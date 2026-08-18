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
  const ctaLabel = rotaGratuita ? rotaGratuita.label : "Começar agora";

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
        <div style={{ position: "relative", overflow: "hidden" }}>
          <img
            src={product.thumbnail} alt="" aria-hidden="true"
            style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }}
            loading="lazy"
          />
          <span style={{
            position: "absolute", top: "12px", left: "12px",
            fontSize: "9px", letterSpacing: "0.16em", textTransform: "uppercase",
            fontFamily: "Montserrat,sans-serif", fontWeight: 600,
            color: isAvailable ? "var(--gold)" : "var(--text-muted)",
            background: "color-mix(in srgb, var(--bg-surface) 82%, transparent)",
            backdropFilter: "blur(8px)",
            border: `1px solid ${isAvailable ? "var(--gold-dim)" : "var(--border-soft)"}`,
            borderRadius: "100px", padding: "5px 12px",
          }}>
            {isAvailable ? "Disponível" : "Em breve"}
          </span>
          {featured && (
            <span style={{
              position: "absolute", top: "12px", right: "12px",
              fontSize: "9px", letterSpacing: "0.16em", textTransform: "uppercase",
              fontFamily: "Montserrat,sans-serif", fontWeight: 600,
              color: "var(--bg-surface)", background: "var(--gold)",
              borderRadius: "100px", padding: "5px 12px",
            }}>
              Jornada principal
            </span>
          )}
        </div>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", padding: "var(--space-5)", flex: 1 }}>
        {!isAvailable && !product.thumbnail && (
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
          <ul style={{ display: "grid", gap: "var(--space-2)", listStyle: "none", padding: 0, margin: 0 }}>
            {product.highlights.slice(0, 3).map((item) => (
              <li key={item} className="font-body" style={{ fontSize: "var(--fs-xs)", color: "var(--text-secondary)", display: "flex", alignItems: "flex-start", gap: "8px" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0, marginTop: "2px" }}>
                  <path d="M20 6L9 17l-5-5" stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}

        <div style={{ marginTop: "auto", display: "grid", gap: "var(--space-3)" }}>
          {isAvailable ? (
            <>
              {/* Parcela em destaque (padrao BR de conversao); a vista abaixo */}
              {showInstallments ? (
                <div>
                  <p className="font-body" style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginBottom: "2px" }}>12× de</p>
                  <p className="font-display" style={{ fontSize: "clamp(26px,3vw,34px)", color: "var(--gold)", fontWeight: 300, fontStyle: "italic", lineHeight: 1 }}>
                    {formatBRL(product.price / 12)}
                  </p>
                  <p className="font-body" style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginTop: "4px" }}>
                    ou {formatBRL(product.price)} à vista
                  </p>
                </div>
              ) : (
                <p className="font-display" style={{ fontSize: "var(--fs-xl)", color: "var(--gold)", fontWeight: 300 }}>
                  {isGratuito ? "Gratuito" : formatBRL(product.price)}
                </p>
              )}
              <Link to={ctaHref} className="btn-gold" style={{ textAlign: "center", justifyContent: "center", minHeight: "50px" }}>
                {ctaLabel}
              </Link>
              {!isGratuito && (
                <p className="font-body" style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)", textAlign: "center" }}>
                  Garantia incondicional de 7 dias · Pagamento seguro
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
