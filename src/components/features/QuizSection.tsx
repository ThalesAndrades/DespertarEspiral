/**
 * QuizSection — Diagnóstico Espiral (4 perguntas)
 * Wizard animado inserido na LandingPage entre Depoimentos e Comunidade.
 * Q4 = qualificação de investimento (segmenta intenção de compra).
 * Dispara lead.diagnostic_completed + lead.optin.pain_* via Sequenzy.
 * Redireciona para /checkout/mulher-espiral?pain=X após coleta de e-mail.
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { fireEventAsync } from "@/lib/sequenzy";
import sunyanPortrait from "@/assets/sunyan-portrait.jpg";

/* ── Quiz questions ─────────────────────────────────────── */
const QUIZ_QUESTIONS = [
  {
    id: "pain",
    question: "Qual é o seu maior desafio agora?",
    sub: "Escolha o que mais ressoa com você neste momento.",
    options: [
      { label: "Sinto que perdi o sentido de propósito",        value: "proposito",       icon: "✦", color: "#c6a870" },
      { label: "Me sinto presa em questões de abundância",       value: "dinheiro",        icon: "◈", color: "#8caa96" },
      { label: "Meus relacionamentos me drenam ou confundem",    value: "relacionamentos", icon: "◇", color: "#c99aaa" },
      { label: "A ansiedade e o medo me paralisam",              value: "ansiedade",       icon: "○", color: "rgba(164,158,208,0.90)" },
    ],
  },
  {
    id: "moment",
    question: "Em que momento você está agora?",
    sub: "Honre onde você está hoje.",
    options: [
      { label: "Estou bem, mas sinto que posso ir mais fundo",  value: "aprofundar", icon: "↓", color: "#c6a870" },
      { label: "Estou em um ponto de virada importante",         value: "virada",     icon: "⟳", color: "#8caa96" },
      { label: "Estou recomeçando do zero",                      value: "recomeco",   icon: "⊹", color: "#c99aaa" },
      { label: "Estou em crise e preciso de suporte",           value: "crise",      icon: "◎", color: "rgba(164,158,208,0.90)" },
    ],
  },
  {
    id: "desire",
    question: "O que você busca nessa jornada?",
    sub: "Deixe seu desejo mais profundo falar.",
    options: [
      { label: "Reencontrar minha essência verdadeira",          value: "essencia",    icon: "✦", color: "#c6a870" },
      { label: "Libertar padrões que me limitam",                value: "liberdade",   icon: "⬡", color: "#8caa96" },
      { label: "Criar uma vida mais alinhada e significativa",   value: "alinhamento", icon: "◈", color: "#c99aaa" },
      { label: "Reconectar corpo, mente e espírito",            value: "reconexao",   icon: "○", color: "rgba(164,158,208,0.90)" },
    ],
  },
  {
    id: "investment",
    question: "Quanto você costuma investir em si mesma por mês?",
    sub: "Sem julgamentos — isso nos ajuda a entender em que etapa você está.",
    options: [
      { label: "Ainda não invisto regularmente",     value: "zero",   icon: "◌", color: "rgba(164,158,208,0.80)" },
      { label: "Até R$ 200 por mês",                 value: "low",    icon: "◇", color: "#8caa96" },
      { label: "Entre R$ 200 e R$ 800 por mês",      value: "mid",    icon: "◈", color: "#c6a870" },
      { label: "Mais de R$ 800 por mês",             value: "high",   icon: "✦", color: "#c99aaa" },
    ],
  },
] as const;

/* ── Per-pain personalization ──────────────────────────── */
const PAIN_RESULTS: Record<string, {
  headline: string;
  body: string;
  quote: string;
  quoteContext: string;
  accentColor: string;
  symbolColor: string;
  symbol: string;
  sequenzyEvent: string;
}> = {
  proposito: {
    headline: "Seu chamado é o reencontro com o propósito.",
    body: "Quando o propósito some, a vida perde sabor. Esse vazio não é fraqueza — é o seu ser pedindo para ser escutado de verdade. O Método Espiral foi criado exatamente para esse reencontro.",
    quote: "Propósito não se encontra — ele se revela quando você para de fugir de si mesma.",
    quoteContext: "Sobre o módulo 'O Chamado Interior'",
    accentColor: "#c6a870",
    symbolColor: "rgba(198,168,112,0.15)",
    symbol: "✦",
    sequenzyEvent: "lead.optin.pain_proposito",
  },
  dinheiro: {
    headline: "Sua relação com a abundância está pedindo atenção.",
    body: "Dinheiro e autoestima estão mais conectados do que parecem. Quando desbloqueamos os padrões emocionais, a relação com abundância se transforma. Esse é um dos pilares do Método Espiral.",
    quote: "Abundância começa onde a culpa termina. O trabalho real é dentro.",
    quoteContext: "Sobre o módulo 'Valor e Merecimento'",
    accentColor: "#8caa96",
    symbolColor: "rgba(140,170,150,0.15)",
    symbol: "◈",
    sequenzyEvent: "lead.optin.pain_dinheiro",
  },
  relacionamentos: {
    headline: "Seus vínculos espelham o que precisa ser visto.",
    body: "Relacionamentos que drenam revelam padrões antigos que ainda vivem em nós. No Método Espiral aprendemos a identificar esses padrões com compaixão — e a escolher diferente.",
    quote: "Nenhuma relação nos fere sem antes nos mostrar onde ainda precisamos nos curar.",
    quoteContext: "Sobre o módulo 'Vínculos e Feridas'",
    accentColor: "#c99aaa",
    symbolColor: "rgba(201,154,170,0.15)",
    symbol: "◇",
    sequenzyEvent: "lead.optin.pain_relacionamentos",
  },
  ansiedade: {
    headline: "Seu sistema nervoso está pedindo ancoragem e presença.",
    body: "Ansiedade é o corpo falando o que a mente ainda não consegue nomear. O Método Espiral trabalha com o corpo como aliado — não como inimigo — para criar presença real e duradoura.",
    quote: "Quando aprendemos a escutar o corpo, o medo deixa de ser inimigo e passa a ser guia.",
    quoteContext: "Sobre o módulo 'O Corpo como Sabedoria'",
    accentColor: "rgba(164,158,208,0.90)",
    symbolColor: "rgba(164,158,208,0.12)",
    symbol: "○",
    sequenzyEvent: "lead.optin.pain_ansiedade",
  },
};

/* ── Urgency countdown hook ──────────────────────────────── */
function useUrgencyTimer(active: boolean) {
  const [seconds, setSeconds] = useState(10 * 60); // 10 min
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active) return;
    interval.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(interval.current!);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (interval.current) clearInterval(interval.current); };
  }, [active]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return { display: `${mm}:${ss}`, urgent: seconds <= 120, expired: seconds === 0 };
}

/* ── Component ───────────────────────────────────────────── */
export default function QuizSection() {
  const navigate = useNavigate();

  // step: 0–3 = questions, 4 = result
  const [step,       setStep]       = useState<0 | 1 | 2 | 3 | 4>(0);
  const [answers,    setAnswers]    = useState<string[]>([]);
  const [email,      setEmail]      = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [animating,  setAnimating]  = useState(false);

  const timer = useUrgencyTimer(step === 4);

  const painKey = (answers[0] ?? "proposito") as keyof typeof PAIN_RESULTS;
  const result  = PAIN_RESULTS[painKey] ?? PAIN_RESULTS.proposito;

  const totalQuestions = QUIZ_QUESTIONS.length; // 4

  function choose(value: string) {
    if (animating) return;
    setAnimating(true);
    const next = [...answers.slice(0, step), value];
    setAnswers(next);
    setTimeout(() => {
      const nextStep = step + 1;
      setStep(nextStep as 0 | 1 | 2 | 3 | 4);
      setAnimating(false);
    }, 320);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    setSubmitting(true);

    fireEventAsync("lead.diagnostic_completed", {
      email,
      properties: {
        pain:           painKey,
        moment:         answers[1] ?? "",
        desire:         answers[2] ?? "",
        investment:     answers[3] ?? "",
        product_slug:   "mulher-espiral",
        completed_at:   new Date().toISOString(),
      },
    });
    fireEventAsync(result.sequenzyEvent, {
      email,
      properties: {
        pain_type:   painKey,
        investment:  answers[3] ?? "",
        source:      "quiz-landing",
        triggered_at: new Date().toISOString(),
      },
    });

    sessionStorage.setItem("checkout_email", email);
    setSubmitting(false);
    setSubmitted(true);

    await new Promise((r) => setTimeout(r, 900));
    navigate(`/checkout/mulher-espiral?pain=${painKey}`);
  }

  function restart() {
    setStep(0);
    setAnswers([]);
    setEmail("");
    setSubmitted(false);
    setSubmitting(false);
  }

  const currentQ = step < totalQuestions ? QUIZ_QUESTIONS[step as 0 | 1 | 2 | 3] : null;

  return (
    <section
      style={{
        position: "relative", zIndex: 1, overflow: "hidden",
        padding: "clamp(80px,12vw,140px) clamp(16px,5vw,24px)",
        background: "#06050f",
      }}
    >
      {/* Atmospheric glows — color shifts with detected pain */}
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(198,168,112,0.10) 0%, transparent 60%)", pointerEvents: "none" }} />
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 50% 55% at 15% 70%, rgba(201,154,170,0.07) 0%, transparent 55%)", pointerEvents: "none" }} />
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 50% 45% at 85% 30%, rgba(81,72,152,0.08) 0%, transparent 55%)", pointerEvents: "none" }} />
      <div aria-hidden="true" style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg, transparent, rgba(198,168,112,0.35), transparent)" }} />
      <div aria-hidden="true" style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg, transparent, rgba(198,168,112,0.20), transparent)" }} />

      <div style={{ position: "relative", maxWidth: "840px", margin: "0 auto" }}>

        {/* ── Section header ── */}
        <div className="reveal" style={{ textAlign: "center", marginBottom: "clamp(36px,5vw,60px)" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "10px", marginBottom: "20px",
            background: "rgba(198,168,112,0.10)", border: "1px solid rgba(198,168,112,0.25)",
            borderRadius: "100px", padding: "7px 18px",
          }}>
            <span style={{ fontSize: "9px", letterSpacing: "0.24em", textTransform: "uppercase", color: "var(--gold)", fontFamily: "Montserrat,sans-serif", fontWeight: 500 }}>
              Diagnóstico Espiral
            </span>
          </div>
          <h2 className="font-display text-balance" style={{ fontSize: "clamp(32px,6vw,72px)", fontWeight: 300, fontStyle: "italic", lineHeight: 1.04, color: "#f5f0e8", marginBottom: "14px" }}>
            Descubra por onde<br />começar sua jornada.
          </h2>
          <p style={{ fontSize: "clamp(14px,1.7vw,16px)", color: "rgba(245,240,232,0.50)", lineHeight: 1.85, maxWidth: "480px", margin: "0 auto", fontFamily: "Montserrat,sans-serif" }}>
            4 perguntas. Sem julgamento. Só para você entender o que o seu ser está pedindo agora.
          </p>
        </div>

        {/* ── Step progress ── */}
        {step < totalQuestions && (
          <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginBottom: "clamp(28px,4vw,44px)" }}>
            {Array.from({ length: totalQuestions }, (_, i) => (
              <div key={i} style={{
                height: "3px", borderRadius: "100px",
                width: i === step ? "32px" : i < step ? "16px" : "10px",
                background: i <= step ? "var(--gold)" : "rgba(198,168,112,0.18)",
                transition: "all 0.4s cubic-bezier(.16,1,.3,1)",
              }} />
            ))}
          </div>
        )}

        {/* ── Animated content wrapper ── */}
        <div style={{
          opacity: animating ? 0 : 1,
          transform: animating ? "translateY(8px)" : "translateY(0)",
          transition: "opacity 0.28s ease, transform 0.28s ease",
        }}>

          {/* ── Questions (0–3) ── */}
          {currentQ && (
            <div>
              <div style={{ textAlign: "center", marginBottom: "clamp(20px,3.5vw,36px)" }}>
                <p style={{ fontSize: "9px", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(198,168,112,0.45)", fontFamily: "Montserrat,sans-serif", marginBottom: "12px" }}>
                  Pergunta {step + 1} de {totalQuestions}
                </p>
                <h3 className="font-display" style={{ fontSize: "clamp(22px,4vw,42px)", fontWeight: 300, color: "#f5f0e8", lineHeight: 1.12, marginBottom: "8px" }}>
                  {currentQ.question}
                </h3>
                <p style={{ fontSize: "14px", color: "rgba(245,240,232,0.38)", fontFamily: "Montserrat,sans-serif" }}>
                  {currentQ.sub}
                </p>
              </div>

              <div style={{ display: "grid", gap: "10px" }} className="grid sm:grid-cols-2">
                {currentQ.options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => choose(opt.value)}
                    style={{
                      display: "flex", alignItems: "center", gap: "16px",
                      padding: "clamp(16px,2.5vw,22px) clamp(18px,3vw,26px)",
                      borderRadius: "clamp(14px,2vw,18px)",
                      border: "1.5px solid rgba(198,168,112,0.16)",
                      background: "rgba(255,255,255,0.026)",
                      cursor: "pointer", textAlign: "left",
                      transition: "all 0.22s cubic-bezier(.16,1,.3,1)",
                      minHeight: "76px",
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.background = "rgba(198,168,112,0.09)";
                      el.style.borderColor = "rgba(198,168,112,0.50)";
                      el.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.background = "rgba(255,255,255,0.026)";
                      el.style.borderColor = "rgba(198,168,112,0.16)";
                      el.style.transform = "translateY(0)";
                    }}
                  >
                    <span style={{
                      width: "38px", height: "38px", borderRadius: "50%", flexShrink: 0,
                      background: `${opt.color}14`,
                      border: `1px solid ${opt.color}40`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "15px", color: opt.color,
                      fontFamily: "Cormorant Garamond,serif",
                    }}>
                      {opt.icon}
                    </span>
                    <span style={{
                      fontSize: "clamp(14px,1.7vw,16px)", color: "rgba(245,240,232,0.78)",
                      lineHeight: 1.4, fontFamily: "Montserrat,sans-serif", fontWeight: 400,
                    }}>
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Result (step === 4) ── */}
          {step === totalQuestions && (
            <div>

              {/* Urgency banner */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
                marginBottom: "clamp(20px,3vw,30px)",
                padding: "10px 20px", borderRadius: "100px",
                background: timer.urgent ? "rgba(201,80,80,0.12)" : "rgba(198,168,112,0.09)",
                border: `1px solid ${timer.urgent ? "rgba(201,80,80,0.35)" : "rgba(198,168,112,0.28)"}`,
                width: "fit-content", margin: "0 auto clamp(20px,3vw,30px)",
                transition: "background 0.6s, border-color 0.6s",
              }}>
                <span style={{
                  display: "inline-flex", width: "7px", height: "7px", borderRadius: "50%",
                  background: timer.urgent ? "#e07070" : "#c6a870",
                  flexShrink: 0,
                  animation: "quizPulse 1.8s ease-out infinite",
                }} />
                <span style={{
                  fontFamily: "Montserrat,sans-serif", fontSize: "9px",
                  letterSpacing: "0.18em", textTransform: "uppercase",
                  color: timer.urgent ? "#e07070" : "var(--gold)",
                }}>
                  {timer.expired
                    ? "Oferta encerrada"
                    : `Oferta reservada por ${timer.display}`}
                </span>
              </div>

              <div style={{ display: "grid", gap: "clamp(20px,4vw,36px)", alignItems: "start" }} className="grid md:grid-cols-[1fr_260px]">

                {/* ── Left ── */}
                <div>

                  {/* Result card */}
                  <div style={{
                    padding: "clamp(20px,4vw,36px)",
                    borderRadius: "clamp(16px,2vw,22px)",
                    border: `1px solid ${result.accentColor}38`,
                    background: result.symbolColor,
                    marginBottom: "20px",
                    position: "relative", overflow: "hidden",
                  }}>
                    {/* decorative symbol */}
                    <span aria-hidden="true" style={{
                      position: "absolute", top: "-12px", right: "20px",
                      fontSize: "80px", color: result.accentColor, opacity: 0.06,
                      fontFamily: "Cormorant Garamond,serif", lineHeight: 1,
                      userSelect: "none",
                    }}>
                      {result.symbol}
                    </span>
                    <p style={{
                      fontSize: "9px", letterSpacing: "0.22em", textTransform: "uppercase",
                      color: result.accentColor, fontFamily: "Montserrat,sans-serif",
                      marginBottom: "14px", position: "relative",
                    }}>
                      {result.symbol} Seu diagnóstico
                    </p>
                    <h3 className="font-display" style={{
                      fontSize: "clamp(20px,3.5vw,34px)", fontWeight: 300, fontStyle: "italic",
                      color: "#f5f0e8", lineHeight: 1.2, marginBottom: "14px", position: "relative",
                    }}>
                      {result.headline}
                    </h3>
                    <p style={{
                      fontSize: "clamp(13px,1.5vw,15px)", color: "rgba(245,240,232,0.58)",
                      lineHeight: 1.88, fontFamily: "Montserrat,sans-serif", position: "relative",
                    }}>
                      {result.body}
                    </p>
                  </div>

                  {/* Sunyan quote — mobile only */}
                  <div className="md:hidden" style={{
                    padding: "16px 18px",
                    borderRadius: "16px",
                    border: `1px solid ${result.accentColor}30`,
                    background: "rgba(255,255,255,0.02)",
                    marginBottom: "16px",
                    display: "flex", gap: "12px", alignItems: "flex-start",
                  }}>
                    <div style={{
                      width: "34px", height: "34px", borderRadius: "50%", flexShrink: 0,
                      overflow: "hidden", border: `1px solid ${result.accentColor}40`,
                    }}>
                      <img src={sunyanPortrait} alt="Sunyan" loading="lazy" decoding="async"
                        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 12%" }} />
                    </div>
                    <div>
                      <p style={{
                        fontSize: "12px", color: "rgba(245,240,232,0.55)",
                        lineHeight: 1.75, fontFamily: "Cormorant Garamond,serif",
                        fontStyle: "italic", fontWeight: 300, marginBottom: "6px",
                      }}>
                        "{result.quote}"
                      </p>
                      <p style={{ fontSize: "9px", color: result.accentColor, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "Montserrat,sans-serif" }}>
                        Sunyan Nunes · {result.quoteContext}
                      </p>
                    </div>
                  </div>

                  {/* Email form */}
                  {!submitted ? (
                    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <p style={{
                        fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase",
                        color: "rgba(198,168,112,0.55)", fontFamily: "Montserrat,sans-serif", marginBottom: "4px",
                      }}>
                        Receba seu caminho personalizado
                      </p>
                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="seu@email.com"
                          required
                          style={{
                            flex: "1 1 200px",
                            padding: "14px 18px",
                            borderRadius: "14px",
                            border: "1.5px solid rgba(198,168,112,0.22)",
                            background: "rgba(255,255,255,0.04)",
                            color: "#f5f0e8",
                            fontSize: "15px",
                            fontFamily: "Montserrat,sans-serif",
                            outline: "none",
                            minHeight: "52px",
                          }}
                          onFocus={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "rgba(198,168,112,0.55)")}
                          onBlur={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "rgba(198,168,112,0.22)")}
                        />
                        <button
                          type="submit"
                          disabled={submitting || timer.expired}
                          className="btn-gold"
                          style={{ flexShrink: 0, minHeight: "52px", borderRadius: "14px", padding: "0 24px", fontSize: "9px" }}
                        >
                          {submitting ? "…" : timer.expired ? "Oferta encerrada" : "Ver meu caminho →"}
                        </button>
                      </div>

                      {/* Timer strip below form */}
                      {!timer.expired && (
                        <div style={{
                          display: "flex", alignItems: "center", gap: "8px",
                          padding: "8px 12px", borderRadius: "10px",
                          background: timer.urgent ? "rgba(201,80,80,0.08)" : "rgba(198,168,112,0.06)",
                          border: `1px solid ${timer.urgent ? "rgba(201,80,80,0.22)" : "rgba(198,168,112,0.16)"}`,
                        }}>
                          <span style={{ fontSize: "10px" }}>⏱</span>
                          <span style={{
                            fontSize: "11px", fontFamily: "Montserrat,sans-serif",
                            color: timer.urgent ? "#e07070" : "rgba(198,168,112,0.70)",
                          }}>
                            {timer.urgent
                              ? `Apenas ${timer.display} restantes para garantir esta oferta`
                              : `Acesso reservado por mais ${timer.display}`}
                          </span>
                        </div>
                      )}

                      <p style={{ fontSize: "11px", color: "rgba(245,240,232,0.22)", fontFamily: "Montserrat,sans-serif" }}>
                        Sem spam. Só conteúdo que transforma.
                      </p>
                    </form>
                  ) : (
                    <div style={{
                      padding: "16px 18px", borderRadius: "14px",
                      background: "rgba(140,170,150,0.10)", border: "1px solid rgba(140,170,150,0.28)",
                      display: "flex", alignItems: "center", gap: "12px",
                    }}>
                      <span style={{ color: "var(--sage)", fontSize: "20px" }}>✦</span>
                      <p style={{ fontSize: "14px", color: "var(--sage)", fontFamily: "Montserrat,sans-serif" }}>
                        Redirecionando para sua jornada…
                      </p>
                    </div>
                  )}

                  <button
                    onClick={restart}
                    style={{
                      marginTop: "18px", background: "transparent", border: "none", cursor: "pointer",
                      fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase",
                      color: "rgba(245,240,232,0.25)", fontFamily: "Montserrat,sans-serif",
                      minHeight: "36px", padding: 0, transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(245,240,232,0.55)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(245,240,232,0.25)")}
                  >
                    ← Refazer diagnóstico
                  </button>
                </div>

                {/* ── Right — Sunyan photo + quote ── */}
                <div className="hidden md:flex" style={{ flexDirection: "column", gap: "12px" }}>
                  <div style={{
                    borderRadius: "clamp(16px,2vw,20px)", overflow: "hidden",
                    border: `1px solid ${result.accentColor}30`,
                    background: "#0e0b18", position: "relative", aspectRatio: "3/4",
                  }}>
                    <img
                      src={sunyanPortrait}
                      alt="Sunyan Nunes — guia da jornada"
                      loading="lazy" decoding="async"
                      style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 12%", display: "block" }}
                    />
                    <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 40%, rgba(6,5,15,0.94) 100%)" }} />
                    <div aria-hidden="true" style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: `linear-gradient(90deg, transparent, ${result.accentColor}60, transparent)` }} />
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "18px 16px" }}>
                      <p className="font-display" style={{ fontSize: "18px", color: result.accentColor, fontStyle: "italic", fontWeight: 300, textAlign: "center", lineHeight: 1.2 }}>
                        Sunyan Nunes
                      </p>
                      <p style={{ fontSize: "8px", letterSpacing: "0.18em", textTransform: "uppercase", color: `${result.accentColor}70`, textAlign: "center", marginTop: "4px", fontFamily: "Montserrat,sans-serif" }}>
                        Criadora do Método Espiral
                      </p>
                    </div>
                  </div>

                  {/* Sunyan quote — desktop */}
                  <div style={{
                    padding: "18px 16px",
                    borderRadius: "16px",
                    border: `1px solid ${result.accentColor}28`,
                    background: result.symbolColor,
                  }}>
                    <span style={{
                      display: "block", fontSize: "28px",
                      color: result.accentColor, lineHeight: 1,
                      fontFamily: "Cormorant Garamond,serif",
                      marginBottom: "8px", opacity: 0.55,
                    }}>
                      "
                    </span>
                    <p style={{
                      fontSize: "13px", color: "rgba(245,240,232,0.62)",
                      lineHeight: 1.78, fontFamily: "Cormorant Garamond,serif",
                      fontStyle: "italic", fontWeight: 300, marginBottom: "10px",
                    }}>
                      {result.quote}
                    </p>
                    <p style={{
                      fontSize: "8px", color: result.accentColor,
                      letterSpacing: "0.14em", textTransform: "uppercase",
                      fontFamily: "Montserrat,sans-serif", lineHeight: 1.5,
                    }}>
                      {result.quoteContext}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes quizPulse {
          0%   { transform: scale(1);   opacity: 0.8; }
          70%  { transform: scale(2.2); opacity: 0; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
    </section>
  );
}
