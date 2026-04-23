/**
 * QuizPlayer — Student-facing quiz component
 *
 * Features:
 *  - Renders quiz questions + answer options
 *  - Tracks selected answers
 *  - Submits attempt to Supabase (quiz_attempts)
 *  - Shows score + pass/fail result with retry option
 *  - Remembers best attempt to avoid re-taking passed quizzes
 */
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { ModuleQuiz, QuizAttempt } from "@/types";
import { CheckCircle, XCircle, Award, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { sendEmailAsync } from "@/lib/email";

interface Props {
  moduleId: string;
  moduleTitle: string;
  onClose?: () => void;
  onPassed?: () => void;
}

type Phase = "loading" | "no-quiz" | "intro" | "playing" | "submitting" | "result";

export default function QuizPlayer({ moduleId, moduleTitle, onClose, onPassed }: Props) {
  const { user } = useAuth();

  const [quiz,       setQuiz]       = useState<ModuleQuiz | null>(null);
  const [phase,      setPhase]      = useState<Phase>("loading");
  const [answers,    setAnswers]    = useState<Record<string, string>>({});  // { question_id: option_id }
  const [result,     setResult]     = useState<QuizAttempt | null>(null);
  const [bestAttempt, setBest]      = useState<QuizAttempt | null>(null);
  const [current,    setCurrent]    = useState(0);   // current question index

  /* ── Load quiz + best attempt ── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 1. Load quiz
      const { data: quizRow } = await supabase
        .from("module_quizzes")
        .select("id, module_id, title, description, passing_score, is_active")
        .eq("module_id", moduleId)
        .eq("is_active", true)
        .maybeSingle();

      if (cancelled) return;
      if (!quizRow) { setPhase("no-quiz"); return; }

      // 2. Load questions + options
      const { data: questions } = await supabase
        .from("quiz_questions")
        .select("id, quiz_id, question, type, sort_order")
        .eq("quiz_id", (quizRow as { id: string }).id)
        .order("sort_order");

      const qIds = (questions ?? []).map((q: { id: string }) => q.id);
      let optsByQ: Record<string, import("@/types").QuizOption[]> = {};

      if (qIds.length > 0) {
        const { data: opts } = await supabase
          .from("quiz_options")
          .select("id, question_id, text, is_correct, sort_order")
          .in("question_id", qIds)
          .order("sort_order");

        for (const o of (opts ?? []) as import("@/types").QuizOption[]) {
          if (!optsByQ[o.question_id]) optsByQ[o.question_id] = [];
          optsByQ[o.question_id].push(o);
        }
      }

      const fullQuiz: ModuleQuiz = {
        ...(quizRow as Omit<ModuleQuiz, "questions">),
        questions: (questions ?? []).map((q: import("@/types").QuizQuestion) => ({
          ...q,
          options: optsByQ[q.id] ?? [],
        })),
      };

      if (cancelled) return;
      setQuiz(fullQuiz);

      // 3. Load best attempt
      if (user?.id) {
        const { data: attempts } = await supabase
          .from("quiz_attempts")
          .select("id, quiz_id, user_id, score, passed, answers, completed_at")
          .eq("quiz_id", fullQuiz.id)
          .eq("user_id", user.id)
          .order("score", { ascending: false })
          .limit(1);

        if (!cancelled && attempts && attempts.length > 0) {
          setBest(attempts[0] as QuizAttempt);
        }
      }

      if (!cancelled) setPhase("intro");
    })();
    return () => { cancelled = true; };
  }, [moduleId, user?.id]);

  /* ── Select answer ── */
  const selectAnswer = (qId: string, optId: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: optId }));
  };

  /* ── Submit ── */
  const submit = async () => {
    if (!quiz || !user?.id) return;

    const unanswered = quiz.questions.filter((q) => !answers[q.id]);
    if (unanswered.length > 0) {
      toast.error(`Responda todas as perguntas (${unanswered.length} pendente${unanswered.length > 1 ? "s" : ""}).`);
      return;
    }

    setPhase("submitting");

    // Calculate score
    let correct = 0;
    for (const q of quiz.questions) {
      const selectedOptId = answers[q.id];
      const selectedOpt   = q.options.find((o) => o.id === selectedOptId);
      if (selectedOpt?.is_correct) correct++;
    }

    const score  = quiz.questions.length > 0 ? Math.round((correct / quiz.questions.length) * 100) : 0;
    const passed = score >= quiz.passing_score;

    const { data, error } = await supabase
      .from("quiz_attempts")
      .insert({ quiz_id: quiz.id, user_id: user.id, score, passed, answers })
      .select("id, quiz_id, user_id, score, passed, answers, completed_at")
      .single();

    if (error) {
      toast.error("Erro ao registrar resultado.");
      setPhase("playing");
      return;
    }

    const attempt = data as QuizAttempt;
    setResult(attempt);
    if (!bestAttempt || attempt.score > bestAttempt.score) setBest(attempt);
    setPhase("result");

    if (passed) {
      toast.success("Parabéns! Quiz concluído com sucesso. ✦");
      onPassed?.();

      // Transactional: quiz passed email
      if (user?.email) {
        sendEmailAsync({
          to: user.email,
          template: {
            slug: "quiz-aprovado",
            variables: {
              firstName: user.name?.split(" ")[0] ?? "",
              moduleTitle,
              score,
              passingScore: quiz.passing_score,
              productTitle: moduleTitle,
            },
          },
          metadata: { quiz_id: quiz.id, module_id: moduleId, score },
        });
      }
    }
  };

  /* ── Reset for retry ── */
  const retry = () => {
    setAnswers({});
    setCurrent(0);
    setResult(null);
    setPhase("playing");
  };

  /* ─────────────── RENDER PHASES ─────────────── */

  const containerStyle: React.CSSProperties = {
    maxWidth: "640px",
    width: "100%",
    margin: "0 auto",
    padding: "0 0 16px",
  };

  if (phase === "loading") return (
    <div style={{ ...containerStyle, display: "flex", justifyContent: "center", padding: "48px 24px" }} data-testid="quiz-player-loading">
      <Loader2 size={20} style={{ color: "var(--gold)", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (phase === "no-quiz") return (
    <div style={{ ...containerStyle, padding: "32px 24px", textAlign: "center" }} data-testid="quiz-player-no-quiz">
      <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>Nenhum quiz disponível para este módulo.</p>
    </div>
  );

  if (!quiz) return null;

  /* ── Intro ── */
  if (phase === "intro") return (
    <div style={containerStyle} data-testid="quiz-player-intro">
      <div className="card-dark" style={{ padding: "clamp(20px,4vw,32px)", textAlign: "center" }}>
        <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "rgba(198,168,112,0.10)", border: "1px solid rgba(198,168,112,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <Award size={22} style={{ color: "var(--gold)" }} strokeWidth={1.3} />
        </div>
        <p className="overline" style={{ color: "var(--gold)", marginBottom: "6px", fontSize: "8px" }}>Avaliação do módulo</p>
        <h2 className="font-display" style={{ fontSize: "clamp(20px,3vw,28px)", fontWeight: 300, color: "var(--text-primary)", marginBottom: "8px" }}>
          {quiz.title}
        </h2>
        {quiz.description && (
          <p style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.7, marginBottom: "14px", maxWidth: "440px", margin: "0 auto 14px" }}>
            {quiz.description}
          </p>
        )}
        <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap", marginBottom: "22px" }}>
          <span style={{ fontSize: "12px", color: "var(--text-faint)", fontFamily: "Montserrat", letterSpacing: "0.08em" }}>
            {quiz.questions.length} pergunta{quiz.questions.length !== 1 ? "s" : ""}
          </span>
          <span style={{ fontSize: "12px", color: "var(--text-faint)", fontFamily: "Montserrat", letterSpacing: "0.08em" }}>
            Mínimo: {quiz.passing_score}%
          </span>
          {bestAttempt && (
            <span style={{ fontSize: "12px", fontFamily: "Montserrat", letterSpacing: "0.08em", color: bestAttempt.passed ? "var(--sage)" : "var(--rose)" }}>
              Melhor nota: {bestAttempt.score}%
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
          {bestAttempt?.passed && (
            <button
              onClick={onClose}
              className="btn-ghost"
              style={{ padding: "12px 22px", fontSize: "9px", borderRadius: "12px" }}
              data-testid="skip-quiz-btn"
            >
              Já aprovada — pular
            </button>
          )}
          <button
            onClick={() => { setCurrent(0); setPhase("playing"); }}
            className="btn-gold"
            style={{ padding: "12px 28px", fontSize: "9px", borderRadius: "12px" }}
            data-testid="start-quiz-btn"
          >
            {bestAttempt ? "Refazer quiz" : "Começar quiz"}
          </button>
        </div>
      </div>
    </div>
  );

  /* ── Playing ── */
  if (phase === "playing") {
    const q = quiz.questions[current];
    const totalQ = quiz.questions.length;
    const progressPct = Math.round(((current + 1) / totalQ) * 100);
    const isLast = current === totalQ - 1;

    return (
      <div style={containerStyle} data-testid="quiz-player-playing">
        {/* Header */}
        <div style={{ padding: "16px 0 12px", display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
          <span style={{ fontSize: "9px", fontFamily: "Montserrat", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--gold)" }}>
            {current + 1} / {totalQ}
          </span>
          <div className="progress-bar" style={{ flex: 1, height: "3px" }}>
            <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <span style={{ fontSize: "9px", fontFamily: "Montserrat", letterSpacing: "0.08em", color: "var(--text-faint)" }}>
            {Object.keys(answers).length}/{totalQ}
          </span>
        </div>

        {/* Question card */}
        <div className="card-dark" style={{ padding: "clamp(18px,3vw,28px)", marginBottom: "12px" }}>
          <div style={{ display: "flex", gap: "10px", marginBottom: "18px" }}>
            <span style={{ padding: "2px 10px", borderRadius: "100px", background: "rgba(164,158,208,0.10)", border: "1px solid rgba(164,158,208,0.2)", fontSize: "8px", fontFamily: "Montserrat", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--lavender)", flexShrink: 0 }}>
              {q.type === "multiple_choice" ? "Múltipla escolha" : "Verdadeiro / Falso"}
            </span>
          </div>

          <p style={{ fontSize: "clamp(15px,2vw,18px)", color: "var(--text-primary)", lineHeight: 1.55, marginBottom: "20px", fontWeight: 500 }}>
            {q.question}
          </p>

          {/* Options */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {q.options.map((opt) => {
              const selected = answers[q.id] === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => selectAnswer(q.id, opt.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    padding: "12px 14px", borderRadius: "12px",
                    background: selected ? "rgba(198,168,112,0.10)" : "rgba(255,255,255,0.025)",
                    border: `1.5px solid ${selected ? "rgba(198,168,112,0.45)" : "var(--border-subtle)"}`,
                    cursor: "pointer", textAlign: "left", transition: "all 0.18s",
                    minHeight: "52px",
                  }}
                  data-testid={`option-btn-${opt.id}`}
                >
                  <span style={{
                    width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0,
                    background: selected ? "rgba(198,168,112,0.20)" : "rgba(255,255,255,0.04)",
                    border: `1.5px solid ${selected ? "rgba(198,168,112,0.7)" : "var(--border-mid)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.18s",
                  }}>
                    {selected && <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--gold)" }} />}
                  </span>
                  <span style={{ fontSize: "14px", color: selected ? "var(--text-primary)" : "var(--text-muted)", lineHeight: 1.4 }}>
                    {opt.text}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation */}
        <div style={{ display: "flex", gap: "10px", justifyContent: "space-between" }}>
          {current > 0 ? (
            <button
              onClick={() => setCurrent((c) => c - 1)}
              className="btn-ghost"
              style={{ padding: "11px 20px", fontSize: "9px", borderRadius: "12px" }}
              data-testid="prev-question-btn"
            >
              ← Anterior
            </button>
          ) : <div />}

          {isLast ? (
            <button
              onClick={submit}
              className="btn-gold"
              style={{ padding: "11px 28px", fontSize: "9px", borderRadius: "12px" }}
              data-testid="submit-quiz-btn"
            >
              Enviar respostas ✦
            </button>
          ) : (
            <button
              onClick={() => setCurrent((c) => c + 1)}
              className="btn-gold"
              style={{ padding: "11px 24px", fontSize: "9px", borderRadius: "12px" }}
              data-testid="next-question-btn"
            >
              Próxima →
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ── Submitting ── */
  if (phase === "submitting") return (
    <div style={{ ...containerStyle, display: "flex", justifyContent: "center", padding: "48px 24px" }} data-testid="quiz-player-submitting">
      <Loader2 size={20} style={{ color: "var(--gold)", animation: "spin 0.8s linear infinite" }} />
    </div>
  );

  /* ── Result ── */
  if (phase === "result" && result) {
    const passed = result.passed;
    return (
      <div style={containerStyle} data-testid="quiz-player-result">
        <div className="card-dark" style={{ padding: "clamp(20px,4vw,36px)", textAlign: "center" }}>
          <div style={{
            width: "60px", height: "60px", borderRadius: "50%",
            background: passed ? "rgba(140,170,150,0.12)" : "rgba(172,128,142,0.10)",
            border: `1.5px solid ${passed ? "rgba(140,170,150,0.35)" : "rgba(172,128,142,0.30)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
          }}>
            {passed
              ? <CheckCircle size={26} style={{ color: "var(--sage)" }} strokeWidth={1.5} />
              : <XCircle    size={26} style={{ color: "var(--rose)" }} strokeWidth={1.5} />
            }
          </div>

          <p className="overline" style={{ color: passed ? "var(--sage)" : "var(--rose)", marginBottom: "6px", fontSize: "8px" }}>
            {passed ? "Aprovada!" : "Tente novamente"}
          </p>
          <h2 className="font-display" style={{ fontSize: "clamp(26px,4vw,40px)", fontWeight: 300, color: "var(--text-primary)", marginBottom: "6px" }}>
            {result.score}%
          </h2>
          <p style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.7, marginBottom: "20px" }}>
            {passed
              ? `Parabéns! Você atingiu ${result.score}% e passou no quiz de "${quiz.title}".`
              : `Você precisa de pelo menos ${quiz.passing_score}% para ser aprovada. Continue estudando e tente novamente!`
            }
          </p>

          {/* Per-question review */}
          <div style={{ textAlign: "left", marginBottom: "22px", display: "flex", flexDirection: "column", gap: "8px" }}>
            {quiz.questions.map((q, idx) => {
              const selectedId  = result.answers[q.id];
              const selectedOpt = q.options.find((o) => o.id === selectedId);
              const correct     = selectedOpt?.is_correct ?? false;
              return (
                <div
                  key={q.id}
                  style={{
                    padding: "10px 12px", borderRadius: "10px",
                    background: correct ? "rgba(140,170,150,0.06)" : "rgba(172,128,142,0.06)",
                    border: `1px solid ${correct ? "rgba(140,170,150,0.20)" : "rgba(172,128,142,0.18)"}`,
                  }}
                  data-testid={`result-question-${q.id}`}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    {correct
                      ? <CheckCircle size={12} style={{ color: "var(--sage)" }} strokeWidth={2} />
                      : <XCircle    size={12} style={{ color: "var(--rose)" }} strokeWidth={2} />
                    }
                    <span style={{ fontSize: "9px", fontFamily: "Montserrat", letterSpacing: "0.08em", textTransform: "uppercase", color: correct ? "var(--sage)" : "var(--rose)" }}>
                      {idx + 1}. {correct ? "Correta" : "Incorreta"}
                    </span>
                  </div>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.5, marginLeft: "20px" }}>
                    {q.question}
                  </p>
                  {!correct && selectedOpt && (
                    <p style={{ fontSize: "11px", color: "var(--rose)", marginTop: "2px", marginLeft: "20px" }}>
                      Sua resposta: {selectedOpt.text}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={retry}
              className="btn-ghost"
              style={{ padding: "12px 22px", fontSize: "9px", borderRadius: "12px", display: "flex", alignItems: "center", gap: "6px" }}
              data-testid="retry-quiz-btn"
            >
              <RefreshCw size={12} /> Refazer quiz
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="btn-gold"
                style={{ padding: "12px 28px", fontSize: "9px", borderRadius: "12px" }}
                data-testid="close-result-btn"
              >
                {passed ? "Continuar →" : "Fechar"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
