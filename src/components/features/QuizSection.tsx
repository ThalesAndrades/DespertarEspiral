/**
 * QuizSection — Diagnóstico Espiral (3 perguntas)
 * Wizard animado inserido na LandingPage entre Depoimentos e Comunidade.
 * Dispara lead.diagnostic_completed + lead.optin.pain_* via Sequenzy.
 * Redireciona para /checkout/mulher-espiral?pain=X após coleta de e-mail.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { fireEventAsync } from "@/lib/sequenzy";
import sunyanPortrait from "@/assets/sunyan-portrait.jpg";

/* ── Data ─────────────────────────────────────────────────── */
const QUIZ_QUESTIONS = [
  {
    id: "pain",
    question: "Qual é o seu maior desafio agora?",
    sub: "Escolha o que mais ressoa com você neste momento.",
    options: [
      { label: "Sinto que perdi o sentido de propósito",        value: "proposito",      icon: "✦", color: "#c6a870" },
      { label: "Me sinto presa em questões de abundância",       value: "dinheiro",       icon: "◈", color: "#8caa96" },
      { label: "Meus relacionamentos me drenam ou confundem",    value: "relacionamentos", icon: "◇", color: "#c99aaa" },
      { label: "A ansiedade e o medo me paralisam",              value: "ansiedade",      icon: "○", color: "rgba(164,158,208,0.90)" },
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
] as const;

const PAIN_RESULTS: Record<string, { headline: string; body: string; sequenzyEvent: string }> = {
  proposito: {
    headline: "Seu chamado é o reencontro com o propósito.",
    body: "Quando o propósito some, a vida perde sabor. Esse vazio não é fraqueza — é o seu ser pedindo para ser escutado de verdade. O Método Espiral foi criado exatamente para esse reencontro.",
    sequenzyEvent: "lead.optin.pain_proposito",
  },
  dinheiro: {
    headline: "Sua relação com a abundância está pedindo atenção.",
    body: "Dinheiro e autoestima estão mais conectados do que parecem. Quando desbloqueamos os padrões emocionais, a relação com abundância se transforma. Esse é um dos pilares do Método Espiral.",
    sequenzyEvent: "lead.optin.pain_dinheiro",
  },
  relacionamentos: {
    headline: "Seus vínculos espelham o que precisa ser visto.",
    body: "Relacionamentos que drenam revelam padrões antigos que ainda vivem em nós. No Método Espiral aprendemos a identificar esses padrões com compaixão — e a escolher diferente.",
    sequenzyEvent: "lead.optin.pain_relacionamentos",
  },
  ansiedade: {
    headline: "Seu sistema nervoso está pedindo ancoragem e presença.",
    body: "Ansiedade é o corpo falando o que a mente ainda não consegue nomear. O Método Espiral trabalha com o corpo como aliado — não como inimigo — para criar presença real e duradoura.",
    sequenzyEvent: "lead.optin.pain_ansiedade",
  },
};

/* ── Component ───────────────────────────────────────────── */
export default function QuizSection() {
  const navigate = useNavigate();
  const [step,       setStep]       = useState<0 | 1 | 2 | 3>(0);
  const [answers,    setAnswers]    = useState<string[]>([]);
  const [email,      setEmail]      = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [animating,  setAnimating]  = useState(false);

  const painKey = (answers[0] ?? "proposito") as keyof typeof PAIN_RESULTS;
  const result  = PAIN_RESULTS[painKey] ?? PAIN_RESULTS.proposito;
  const q       = step < 3 ? QUIZ_QUESTIONS[step as 0 | 1 | 2] : null;

  function choose(value: string) {
    if (animating) return;
    setAnimating(true);
    const next = [...answers.slice(0, step), value];
    setAnswers(next);
    setTimeout(() => {
      setStep((s) => (s < 2 ? ((s + 1) as 0 | 1 | 2 | 3) : 3));
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
        pain:         painKey,
        moment:       answers[1] ?? "",
        desire:       answers[2] ?? "",
        product_slug: "mulher-espiral",
        completed_at: new Date().toISOString(),
      },
    });
    fireEventAsync(result.sequenzyEvent, {
      email,
      properties: { pain_type: painKey, source: "quiz-landing", triggered_at: new Date().toISOString() },
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

  return (
    <section
      style={{
        position: "relative", zIndex: 1, overflow: "hidden",
        padding: "clamp(80px,12vw,140px) clamp(16px,5vw,24px)",
        background: "#06050f",
      }}
    >
      {/* Atmospheric glows */}
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(198,168,112,0.10) 0%, transparent 60%)", pointerEvents: "none" }} />
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 50% 55% at 15% 70%, rgba(201,154,170,0.07) 0%, transparent 55%)", pointerEvents: "none" }} />
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 50% 45% at 85% 30%, rgba(81,72,152,0.08) 0%, transparent 55%)", pointerEvents: "none" }} />
      <div aria-hidden="true" style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg, transparent, rgba(198,168,112,0.35), transparent)" }} />
      <div aria-hidden="true" style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg, transparent, rgba(198,168,112,0.20), transparent)" }} />

      <div style={{ position: "relative", maxWidth: "800px", margin: "0 auto" }}>

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
            3 perguntas. Sem julgamento. Só para você entender o que o seu ser está pedindo agora.
          </p>
        </div>

        {/* ── Step progress ── */}
        {step < 3 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginBottom: "clamp(28px,4vw,44px)" }}>
            {[0, 1, 2].map((i) => (
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
        <div style={{ opacity: animating ? 0 : 1, transform: animating ? "translateY(8px)" : "translateY(0)", transition: "opacity 0.28s ease, transform 0.28s ease" }}>

          {/* Questions */}
          {q && (
            <div>
              <div style={{ textAlign: "center", marginBottom: "clamp(20px,3.5vw,36px)" }}>
                <p style={{ fontSize: "9px", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(198,168,112,0.45)", fontFamily: "Montserrat,sans-serif", marginBottom: "12px" }}>
                  Pergunta {step + 1} de 3
                </p>
                <h3 className="font-display" style={{ fontSize: "clamp(22px,4vw,42px)", fontWeight: 300, color: "#f5f0e8", lineHeight: 1.12, marginBottom: "8px" }}>
                  {q.question}
                </h3>
                <p style={{ fontSize: "14px", color: "rgba(245,240,232,0.38)", fontFamily: "Montserrat,sans-serif" }}>
                  {q.sub}
                </p>
              </div>

              <div style={{ display: "grid", gap: "10px" }} className="grid sm:grid-cols-2">
                {q.options.map((opt) => (
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

          {/* Result */}
          {step === 3 && (
            <div>
              <div style={{ display: "grid", gap: "clamp(20px,4vw,36px)", alignItems: "start" }} className="grid md:grid-cols-[1fr_240px]">

                {/* Left — result card + email form */}
                <div>
                  {/* Result card */}
                  <div style={{
                    padding: "clamp(20px,4vw,36px)",
                    borderRadius: "clamp(16px,2vw,22px)",
                    border: "1px solid rgba(198,168,112,0.22)",
                    background: "rgba(198,168,112,0.05)",
                    marginBottom: "20px",
                  }}>
                    <p style={{
                      fontSize: "9px", letterSpacing: "0.22em", textTransform: "uppercase",
                      color: "var(--gold)", fontFamily: "Montserrat,sans-serif", marginBottom: "14px",
                    }}>
                      ✦ Seu diagnóstico
                    </p>
                    <h3 className="font-display" style={{
                      fontSize: "clamp(20px,3.5vw,34px)", fontWeight: 300, fontStyle: "italic",
                      color: "#f5f0e8", lineHeight: 1.2, marginBottom: "14px",
                    }}>
                      {result.headline}
                    </h3>
                    <p style={{
                      fontSize: "clamp(13px,1.5vw,15px)", color: "rgba(245,240,232,0.58)",
                      lineHeight: 1.88, fontFamily: "Montserrat,sans-serif",
                    }}>
                      {result.body}
                    </p>
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
                          disabled={submitting}
                          className="btn-gold"
                          style={{ flexShrink: 0, minHeight: "52px", borderRadius: "14px", padding: "0 24px", fontSize: "9px" }}
                        >
                          {submitting ? "…" : "Ver meu caminho →"}
                        </button>
                      </div>
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

                {/* Right — Sunyan photo */}
                <div className="hidden md:block">
                  <div style={{
                    borderRadius: "clamp(16px,2vw,20px)", overflow: "hidden",
                    border: "1px solid rgba(198,168,112,0.18)",
                    background: "#0e0b18", position: "relative", aspectRatio: "3/4",
                  }}>
                    <img
                      src={sunyanPortrait}
                      alt="Sunyan Nunes — guia da jornada"
                      loading="lazy" decoding="async"
                      style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 12%", display: "block" }}
                    />
                    <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 45%, rgba(6,5,15,0.90) 100%)" }} />
                    <div aria-hidden="true" style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg, transparent, rgba(198,168,112,0.45), transparent)" }} />
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "18px 16px" }}>
                      <p className="font-display" style={{ fontSize: "18px", color: "#c6a870", fontStyle: "italic", fontWeight: 300, textAlign: "center", lineHeight: 1.2 }}>
                        Sunyan Nunes
                      </p>
                      <p style={{ fontSize: "8px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(198,168,112,0.48)", textAlign: "center", marginTop: "4px", fontFamily: "Montserrat,sans-serif" }}>
                        Guia da jornada
                      </p>
                    </div>
                  </div>
                  <div style={{
                    padding: "14px", borderRadius: "14px",
                    border: "1px solid rgba(198,168,112,0.12)",
                    background: "rgba(198,168,112,0.04)",
                    marginTop: "10px", textAlign: "center",
                  }}>
                    <p style={{ fontSize: "12px", color: "rgba(245,240,232,0.40)", lineHeight: 1.7, fontFamily: "Montserrat,sans-serif", fontStyle: "italic" }}>
                      "Cada pergunta que você faz a si mesma é um ato de coragem."
                    </p>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
