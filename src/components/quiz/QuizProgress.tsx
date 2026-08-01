interface QuizProgressProps {
  atual: number;
  total: number;
}

/** A espiral que se desenha: o progresso E a estetica (spec §3.1 / esteira). */
export function QuizProgress({ atual, total }: QuizProgressProps) {
  const pct = total > 0 ? Math.round((atual / total) * 100) : 0;
  return (
    <div style={{ display: "grid", gap: "var(--space-2)" }}>
      <div
        role="progressbar"
        aria-valuenow={atual}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`Pergunta ${atual} de ${total}`}
        style={{
          height: 4, borderRadius: 100, background: "var(--bg-surface-3)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`, height: "100%", background: "var(--gold)",
            borderRadius: 100, transition: "width var(--dur-slow) var(--ease-out)",
          }}
        />
      </div>
      <span className="overline" style={{ color: "var(--text-muted)", textAlign: "center" }}>
        {atual} de {total}
      </span>
    </div>
  );
}
