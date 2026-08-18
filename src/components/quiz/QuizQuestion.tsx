import type { Pilar } from "@/lib/bussola";
import type { PerguntaQuiz } from "@/content/bussola";

interface QuizQuestionProps {
  pergunta: PerguntaQuiz;
  onResponder: (opcaoId: string, pilar: Pilar) => void;
}

export function QuizQuestion({ pergunta, onResponder }: QuizQuestionProps) {
  return (
    <div style={{ display: "grid", gap: "var(--space-6)" }}>
      <h2
        className="font-display"
        style={{ fontSize: "var(--fs-xl)", fontWeight: 300, color: "var(--text-primary)", textAlign: "center" }}
      >
        {pergunta.texto}
      </h2>
      <div style={{ display: "grid", gap: "var(--space-3)" }}>
        {pergunta.opcoes.map((opcao) => (
          <button
            key={opcao.id}
            type="button"
            className="card-dark interactive"
            onClick={() => onResponder(opcao.id, opcao.pilar)}
            style={{
              textAlign: "left", padding: "var(--space-4) var(--space-5)",
              borderRadius: "var(--r-md)", minHeight: 52, cursor: "pointer",
              color: "var(--text-secondary)", fontSize: "var(--fs-base)",
              border: "1px solid var(--border-subtle)", background: "var(--card-bg)",
            }}
          >
            {opcao.texto}
          </button>
        ))}
      </div>
    </div>
  );
}
