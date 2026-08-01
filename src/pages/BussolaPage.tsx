/**
 * Bussola da Espiral — diagnostico gratuito de 12 perguntas.
 * Fluxo: intro -> perguntas -> email (ANTES do resultado) -> resultado.
 *
 * Persistencia: progresso parcial em sessionStorage (spec §6 — nada no banco
 * antes do email). A gravacao acontece UMA vez, no confirm do email; falha de
 * banco nao bloqueia o resultado.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fireEventAsync } from "@/lib/sequenzy";
import { calcularResultado, type Pilar, type RespostaQuiz } from "@/lib/bussola";
import { PERGUNTAS, ARQUETIPOS, CONTENT_VERSION } from "@/content/bussola";
import { QuizProgress } from "@/components/quiz/QuizProgress";
import { QuizQuestion } from "@/components/quiz/QuizQuestion";
import { EmailGate } from "@/components/quiz/EmailGate";
import { ResultadoCard } from "@/components/quiz/ResultadoCard";

type Fase = "intro" | "perguntas" | "email" | "resultado";

const STORAGE_KEY = "bussola:v1";

interface EstadoSalvo {
  respostas: RespostaQuiz[];
}

function carregarEstado(): EstadoSalvo | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EstadoSalvo;
    if (!Array.isArray(parsed.respostas)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export default function BussolaPage() {
  const salvo = carregarEstado();
  const [respostas, setRespostas] = useState<RespostaQuiz[]>(salvo?.respostas ?? []);
  const [fase, setFase] = useState<Fase>(() => {
    if (!salvo || salvo.respostas.length === 0) return "intro";
    return salvo.respostas.length >= PERGUNTAS.length ? "email" : "perguntas";
  });
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ respostas }));
    } catch {
      /* sessionStorage cheio/indisponivel nao pode quebrar o quiz */
    }
  }, [respostas]);

  const indiceAtual = respostas.length;
  const resultado = calcularResultado(respostas);
  const arquetipo = ARQUETIPOS[resultado.pilar];

  function handleResposta(opcaoId: string, pilar: Pilar) {
    const nova: RespostaQuiz = { questionId: PERGUNTAS[indiceAtual].id, pilar };
    const todas = [...respostas, nova];
    setRespostas(todas);
    if (todas.length >= PERGUNTAS.length) {
      setFase("email");
    }
    void opcaoId; // registrado nas respostas cruas via questionId+pilar
  }

  async function handleEmail(email: string) {
    setEnviando(true);

    const { error } = await supabase.from("quiz_responses").insert({
      email,
      answers: respostas,
      pain_primary: resultado.pilar,
      social_archetype: arquetipo.nome,
      content_version: CONTENT_VERSION,
    });

    if (error) {
      // Spec §6: a visitante VE o resultado mesmo assim; a falha fica no log.
      console.error("[bussola] falha ao gravar resposta:", error.message);
    }

    fireEventAsync("bussola.completed", {
      email,
      properties: {
        pain_primary: resultado.pilar,
        social_archetype: arquetipo.nome,
        content_version: CONTENT_VERSION,
        saved: !error,
      },
    });

    sessionStorage.removeItem(STORAGE_KEY);
    setEnviando(false);
    setFase("resultado");
  }

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-base)", padding: "var(--space-16) var(--space-5)" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", display: "grid", gap: "var(--space-8)" }}>
        {fase === "intro" && (
          <section style={{ textAlign: "center", display: "grid", gap: "var(--space-5)" }}>
            <span className="overline" style={{ color: "var(--gold)" }}>Bússola da Espiral</span>
            <h1 className="font-display" style={{ fontSize: "var(--fs-display)", fontWeight: 300, color: "var(--text-primary)" }}>
              Em que volta da espiral você está presa?
            </h1>
            <p className="font-body" style={{ fontSize: "var(--fs-base)", color: "var(--text-secondary)" }}>
              12 perguntas, 3 minutos. No fim, você descobre qual dos 4 pilares está
              travando a sua vida hoje — e a primeira chave para subir de nível.
            </p>
            <button type="button" className="btn-gold" onClick={() => setFase("perguntas")} style={{ justifySelf: "center" }}>
              Começar
            </button>
          </section>
        )}

        {fase === "perguntas" && indiceAtual < PERGUNTAS.length && (
          <section style={{ display: "grid", gap: "var(--space-8)" }}>
            <QuizProgress atual={indiceAtual + 1} total={PERGUNTAS.length} />
            <QuizQuestion pergunta={PERGUNTAS[indiceAtual]} onResponder={handleResposta} />
          </section>
        )}

        {fase === "email" && <EmailGate onConfirmar={handleEmail} enviando={enviando} />}

        {fase === "resultado" && <ResultadoCard arquetipo={arquetipo} />}
      </div>
    </main>
  );
}
