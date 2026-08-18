import type { ManhaInfo } from "@/lib/seteManhas";

interface AnelSeteManhasProps {
  trilha: ManhaInfo[];
  streak: number;
}

const ROTULO: Record<ManhaInfo["estado"], (i: number) => string> = {
  concluida: (i) => `Manhã ${i}: concluída`,
  disponivel: (i) => `Manhã ${i}: disponível hoje`,
  amanha: (i) => `Manhã ${i}: abre amanhã`,
  bloqueada: (i) => `Manhã ${i}: ainda bloqueada`,
};

/**
 * O anel de 7 pontos da jornada. Dia pulado fica "fosco" — opacidade menor,
 * nunca vermelho, nunca aviso: o tom é acolhedor por regra (spec §3.2).
 */
export function AnelSeteManhas({ trilha, streak }: AnelSeteManhasProps) {
  return (
    <section className="card-dark" style={{ padding: "var(--space-6)", borderRadius: "var(--r-lg)", display: "grid", gap: "var(--space-4)" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "var(--space-4)" }}>
        <span className="overline" style={{ color: "var(--gold)" }}>Sua jornada</span>
        {streak > 0 && (
          <span className="font-body" style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>
            {streak === 1 ? "1 dia seguido" : `${streak} dias seguidos`}
          </span>
        )}
      </div>

      <ol style={{ display: "flex", gap: "var(--space-3)", listStyle: "none", padding: 0, margin: 0, flexWrap: "wrap" }}>
        {trilha.map((manha) => {
          const concluida = manha.estado === "concluida";
          const disponivel = manha.estado === "disponivel";
          return (
            <li key={manha.indice} aria-label={ROTULO[manha.estado](manha.indice)} style={{ display: "grid", placeItems: "center", gap: "var(--space-1)" }}>
              <span
                aria-hidden="true"
                style={{
                  width: 34, height: 34, borderRadius: "50%",
                  display: "grid", placeItems: "center",
                  fontSize: "var(--fs-xs)",
                  background: concluida ? "var(--gold)" : "var(--bg-surface-3)",
                  color: concluida ? "var(--bg-base)" : disponivel ? "var(--gold)" : "var(--text-faint)",
                  border: disponivel ? "1px solid var(--gold)" : "1px solid var(--border-subtle)",
                  opacity: manha.fosca ? 0.45 : 1,
                  transition: "opacity var(--dur-base) var(--ease-out)",
                }}
              >
                {manha.indice}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
