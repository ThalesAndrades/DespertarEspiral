import { Link } from "react-router-dom";
import type { Arquetipo } from "@/content/bussola";

interface ResultadoCardProps {
  arquetipo: Arquetipo;
}

export function ResultadoCard({ arquetipo }: ResultadoCardProps) {
  return (
    <article className="card-dark" style={{ padding: "var(--space-10) var(--space-6)", borderRadius: "var(--r-xl)", border: "1px solid var(--gold-dim, var(--gold))", display: "grid", gap: "var(--space-5)", maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
      <span className="overline" style={{ color: "var(--gold)" }}>{arquetipo.titulo}</span>
      <h2 className="font-display" style={{ fontSize: "var(--fs-2xl)", fontWeight: 300, color: "var(--gold)" }}>
        {arquetipo.nome}
      </h2>
      <p className="font-body" style={{ fontSize: "var(--fs-base)", color: "var(--text-secondary)", lineHeight: 1.8, textAlign: "left" }}>
        {arquetipo.leitura}
      </p>
      <p className="font-body" style={{ fontSize: "var(--fs-sm)", color: "var(--text-muted)", textAlign: "left" }}>
        {arquetipo.convite}
      </p>
      <Link to="/checkout/sete-manhas" className="btn-gold">
        Começar o Sete Manhãs
      </Link>
      <Link to="/" className="font-body interactive" style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>
        Voltar ao início
      </Link>
    </article>
  );
}
