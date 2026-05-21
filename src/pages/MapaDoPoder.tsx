/**
 * MapaDoPoder — QR-gated event experience
 * Access: only via QR code (?src=evento or ?r=*)
 * Direct URL access → redirect to /
 *
 * 4 Phases: Intro → 8 Steps → Lead Capture → Complete
 * Premium UI/UX: immersive, scroll-snap, cinematic transitions
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles, Star, Heart, Volume2, Send, CheckCircle2, Loader2 } from "lucide-react";
import heroImg from "@/assets/mapa-poder-hero.jpg";

/* ════════════════════════════════════════════════════════
   STEP DEFINITIONS
════════════════════════════════════════════════════════ */
interface StepDef {
  id: number;
  symbol: string;
  label: string;
  question: string;
  subtext: string;
  type: "textarea" | "multi-textarea" | "affirmation" | "meditation";
  placeholder?: string;
  placeholders?: string[];
  inputs?: number;
}

const STEPS: StepDef[] = [
  {
    id: 1, symbol: "✦", label: "A Trava",
    question: "Escreva sua trava principal em uma frase.",
    subtext: "Qual o bloqueio que mais pesa hoje?",
    type: "textarea",
    placeholder: "Minha maior trava hoje é...",
  },
  {
    id: 2, symbol: "◎", label: "A Origem",
    question: "Quando você sentiu isso pela primeira vez?",
    subtext: "Procure lembrar qual foi a primeira vez que sentiu essa trava e reconheça qual pessoa estava ou está perto de você quando você sente isso.",
    type: "textarea",
    placeholder: "A primeira vez que senti isso foi...",
  },
  {
    id: 3, symbol: "∞", label: "O Vínculo",
    question: "Que tipo de relação você tem com essa pessoa?",
    subtext: "Quem protege quem nessa relação?",
    type: "textarea",
    placeholder: "Nessa relação, eu costumo...",
  },
  {
    id: 4, symbol: "△", label: "A Força",
    question: "3 momentos em que você avançou mesmo com a trava.",
    subtext: "Liste 3 momentos em que você avançou sem que essa trava se manifestasse — ou que seguiu mesmo com ela. Em seguida, nomeie 3 sentimentos que você sentiu.",
    type: "multi-textarea",
    placeholders: [
      "Momento 1: uma vez em que avancei mesmo com medo...",
      "Momento 2: outra vez que fui além do que acreditava...",
      "Momento 3: e também quando eu...",
      "Sentimento 1 (ex: alívio, orgulho, liberdade)...",
      "Sentimento 2...",
      "Sentimento 3...",
    ],
    inputs: 6,
  },
  {
    id: 5, symbol: "❋", label: "O Desejo",
    question: "O que você mais deseja e essa trava está impedindo?",
    subtext: "Qual a coisa que você mais deseja hoje e que essa trava está te impedindo de alcançar?",
    type: "textarea",
    placeholder: "O que eu mais desejo e ainda não alcancei é...",
  },
  {
    id: 6, symbol: "⊕", label: "O Corpo",
    question: "Qual parte do seu corpo se tensiona?",
    subtext: "Quando você identifica essa trava, observe: onde no seu corpo aparece a tensão? Respire fundo e sinta antes de responder.",
    type: "textarea",
    placeholder: "Quando sinto essa trava, meu corpo tenciona em...",
  },
  {
    id: 7, symbol: "♥", label: "O Vínculo Sagrado",
    question: "Leia este compromisso em voz alta.",
    subtext: "Este é o momento de ressignificar. Leia com presença, em voz alta, como se fosse a primeira vez. Substitua os exemplos entre parênteses pela sua trava específica.",
    type: "affirmation",
  },
  {
    id: 8, symbol: "✶", label: "A Ativação",
    question: "Visualização: a estrela que se torna flecha.",
    subtext: "Feche seus olhos. Você está prestes a ativar sua potência.",
    type: "meditation",
  },
];

const AFFIRMATION_TEXT = `"Trava querida — hoje eu te aceito e te incluo no meu processo de evolução. Você me protegeu até aqui, mas hoje eu sou livre e escolho seguir como seu amigo. Os tempos de guerra já passaram e nós podemos ser mais fortes juntos.

Eu reconheço a Potência que deixei de ver em você e todas as vezes que senti raiva por você existir. Você faz parte de mim, de minha herança genética e eu te aceito — mas te faço um convite: Seja minha potência a partir de hoje.

Eu decido avançar junto com você, em paz, porque meus sonhos são muito maiores e podemos construí-los juntos."`;

/* ════════════════════════════════════════════════════════
   ACCESS CONTROL
════════════════════════════════════════════════════════ */
function checkQRAccess(params: URLSearchParams): boolean {
  const src = params.get("src");
  const r   = params.get("r");
  const ref = params.get("ref");
  // Any of these params = QR access
  if (src || r || ref) {
    sessionStorage.setItem("mapa_poder_access", "1");
    return true;
  }
  return sessionStorage.getItem("mapa_poder_access") === "1";
}

/* ════════════════════════════════════════════════════════
   DECORATIVE SPIRAL SVG
════════════════════════════════════════════════════════ */
function SpiralDecor({ opacity = 0.12, size = 400, rotate = 0 }: { opacity?: number; size?: number; rotate?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size} height={size} viewBox="0 0 600 600" fill="none"
      style={{ opacity, transform: `rotate(${rotate}deg)`, flexShrink: 0 }}
    >
      <path d="M300 550C120 550 50 420 50 300C50 165 155 65 285 65C395 65 480 152 480 262C480 355 410 420 320 420C245 420 185 360 185 286C185 220 237 170 303 170C362 170 408 216 408 275C408 327 370 362 320 362C277 362 245 330 245 288C245 252 273 226 308 226C340 226 365 251 365 283C365 312 343 333 315 333"
        stroke="#c6a870" strokeWidth="10" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/* ════════════════════════════════════════════════════════
   PROGRESS BAR
════════════════════════════════════════════════════════ */
function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 500, height: "2px", background: "rgba(198,168,112,0.12)" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #b8903c, #c6a870, #dac394)", transition: "width 0.6s cubic-bezier(.16,1,.3,1)", willChange: "width" }} />
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   PARTICLES
════════════════════════════════════════════════════════ */
function GoldParticles() {
  const PARTICLES = [
    { size: 2, x: 15, y: 20, delay: 0,    dur: 6 },
    { size: 1, x: 80, y: 15, delay: 1.2,  dur: 8 },
    { size: 3, x: 45, y: 80, delay: 0.5,  dur: 7 },
    { size: 2, x: 70, y: 60, delay: 2.1,  dur: 5 },
    { size: 1, x: 25, y: 70, delay: 0.8,  dur: 9 },
    { size: 2, x: 90, y: 40, delay: 1.6,  dur: 6 },
    { size: 1, x: 55, y: 30, delay: 3.0,  dur: 7 },
    { size: 2, x: 10, y: 50, delay: 2.4,  dur: 8 },
    { size: 1, x: 65, y: 85, delay: 0.3,  dur: 6 },
    { size: 3, x: 35, y: 10, delay: 1.9,  dur: 5 },
  ];
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }} aria-hidden="true">
      {PARTICLES.map((p, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${p.x}%`, top: `${p.y}%`,
          width: `${p.size}px`, height: `${p.size}px`,
          borderRadius: "50%",
          background: "rgba(198,168,112,0.6)",
          animation: `particleFloat ${p.dur}s ease-in-out ${p.delay}s infinite`,
          boxShadow: `0 0 ${p.size * 3}px rgba(198,168,112,0.4)`,
        }} />
      ))}
      <style>{`
        @keyframes particleFloat {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.4; }
          50% { transform: translateY(-18px) scale(1.3); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
════════════════════════════════════════════════════════ */
type Phase = "intro" | "steps" | "capture" | "complete";

export default function MapaDoPoder() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  // State
  const [phase,      setPhase]      = useState<Phase>("intro");
  const [step,       setStep]       = useState(0);          // 0-based index
  const [answers,    setAnswers]    = useState<string[][]>( STEPS.map((s) => s.type === "multi-textarea" ? Array(s.inputs ?? 1).fill("") : [""]) );
  const [email,      setEmail]      = useState("");
  const [phone,      setPhone]      = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [affirmRead, setAffirmRead] = useState(false);
  const [medDone,    setMedDone]    = useState(false);
  const [animIn,     setAnimIn]     = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  /* ── Access check on mount ── */
  useEffect(() => {
    const access = checkQRAccess(params);
    setHasAccess(access);
    if (!access) {
      setTimeout(() => navigate("/", { replace: true }), 100);
    }
  }, [params, navigate]);

  /* ── Scroll to top on step change ── */
  useEffect(() => {
    containerRef.current?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  }, [step, phase]);

  /* ── Step transition helper ── */
  const goNext = useCallback(() => {
    setAnimIn(false);
    setTimeout(() => {
      if (step < STEPS.length - 1) { setStep((s) => s + 1); }
      else { setPhase("capture"); }
      setAnimIn(true);
    }, 220);
  }, [step]);

  const goPrev = useCallback(() => {
    setAnimIn(false);
    setTimeout(() => {
      if (step > 0) { setStep((s) => s - 1); }
      else { setPhase("intro"); }
      setAnimIn(true);
    }, 220);
  }, [step]);

  /* ── Update answer ── */
  const setAnswer = (stepIdx: number, inputIdx: number, value: string) => {
    setAnswers((prev) => {
      const next = prev.map((row) => [...row]);
      next[stepIdx][inputIdx] = value;
      return next;
    });
  };

  /* ── Lead capture submit ── */
  const handleCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email && !phone) { setPhase("complete"); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("E-mail inválido. Verifique e tente novamente.");
      return;
    }
    setSubmitting(true);
    await supabase.from("launch_waitlist").insert({
      name: "Mapa do Poder",
      email: email.trim() || `evento_${Date.now()}@despertarespiral.com`,
      phone: phone.trim() || null,
      source: "mapa_do_poder",
    });
    setSubmitting(false);
    setPhase("complete");
  };

  /* ── Can advance current step? ── */
  const canAdvance = (): boolean => {
    const s = STEPS[step];
    if (s.type === "affirmation") return affirmRead;
    if (s.type === "meditation")  return medDone;
    const stepAnswers = answers[step];
    const requiredCount = s.type === "multi-textarea" ? 3 : 1; // only first 3 required for multi
    return stepAnswers.slice(0, requiredCount).some((a) => a.trim().length > 2);
  };

  /* ── Awaiting access check ── */
  if (hasAccess === null) return null;
  if (!hasAccess) return null;

  /* ════════════════════════════
     INTRO PHASE
  ════════════════════════════ */
  if (phase === "intro") {
    return (
      <div style={{ minHeight: "100dvh", background: "#04060f", overflowX: "hidden", fontFamily: "DM Sans, sans-serif" }}>
        {/* Full-bleed hero image */}
        <div style={{ position: "relative", height: "100dvh", overflow: "hidden" }}>
          {/* Hero image with overlay */}
          <img
            src={heroImg}
            alt="Mapa da Ativação do Poder"
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%",
              objectFit: "cover", objectPosition: "center 30%",
              filter: "brightness(0.55) saturate(1.1)",
            }}
            fetchPriority="high"
            decoding="async"
          />

          {/* Multi-layer gradient overlay for text legibility */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(4,6,15,0.15) 0%, rgba(4,6,15,0.20) 40%, rgba(4,6,15,0.85) 75%, #04060f 100%)" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% 30%, rgba(198,168,112,0.06) 0%, transparent 70%)" }} />

          {/* Animated spiral overlay */}
          <div style={{ position: "absolute", right: "-60px", top: "10%", pointerEvents: "none", animation: "spiralCW 80s linear infinite" }}>
            <SpiralDecor opacity={0.08} size={320} />
          </div>
          <div style={{ position: "absolute", left: "-80px", bottom: "15%", pointerEvents: "none", animation: "spiralCCW 60s linear infinite" }}>
            <SpiralDecor opacity={0.06} size={260} />
          </div>

          <GoldParticles />

          {/* Content overlay */}
          <div style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            justifyContent: "flex-end", padding: "clamp(32px,6vw,64px)",
            paddingBottom: "clamp(48px,8vw,80px)",
          }}>
            {/* Eyebrow */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <div style={{ height: "1px", width: "40px", background: "var(--gold)" }} />
              <span style={{ fontFamily: "Montserrat, sans-serif", fontSize: "9px", letterSpacing: "0.26em", textTransform: "uppercase", color: "var(--gold)" }}>
                Despertar Espiral
              </span>
            </div>

            {/* Title */}
            <h1 style={{
              fontFamily: "Cormorant Garamond, serif",
              fontSize: "clamp(44px, 8vw, 88px)",
              fontWeight: 300, lineHeight: 0.95,
              color: "#f5f0e8",
              letterSpacing: "-0.02em",
              marginBottom: "clamp(16px,3vw,28px)",
              textShadow: "0 4px 40px rgba(0,0,0,0.6)",
            }}>
              Mapa da<br />
              <em style={{ fontStyle: "italic", color: "var(--gold)" }}>Ativação</em><br />
              do Poder
            </h1>

            {/* Subtitle */}
            <p style={{
              fontSize: "clamp(15px,2.2vw,19px)", color: "rgba(245,240,232,0.80)",
              lineHeight: 1.68, maxWidth: "480px",
              marginBottom: "clamp(28px,5vw,44px)",
              textShadow: "0 2px 20px rgba(0,0,0,0.5)",
            }}>
              Uma ferramenta para usar cada vez que você se sentir paralisada — ou toda vez que desejar algo e sentir que falta algo.
            </p>

            {/* Stats pills */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "clamp(28px,5vw,40px)" }}>
              {[
                { icon: Star,   text: "8 etapas de ativação" },
                { icon: Heart,  text: "Ferramenta exclusiva" },
                { icon: Sparkles, text: "~15 minutos" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} style={{
                  display: "flex", alignItems: "center", gap: "7px",
                  padding: "7px 14px", borderRadius: "100px",
                  background: "rgba(198,168,112,0.10)",
                  border: "1px solid rgba(198,168,112,0.25)",
                  backdropFilter: "blur(12px)",
                }}>
                  <Icon size={11} style={{ color: "var(--gold)" }} strokeWidth={1.5} />
                  <span style={{ fontFamily: "Montserrat, sans-serif", fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(245,240,232,0.80)" }}>
                    {text}
                  </span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={() => { setPhase("steps"); setStep(0); }}
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "12px",
                padding: "18px clamp(32px,6vw,56px)",
                background: "var(--gold)",
                color: "#04060f",
                border: "none", borderRadius: "100px",
                fontFamily: "Montserrat, sans-serif",
                fontSize: "11px", fontWeight: 700,
                letterSpacing: "0.22em", textTransform: "uppercase",
                cursor: "pointer", alignSelf: "flex-start",
                boxShadow: "0 8px 40px rgba(198,168,112,0.40), 0 2px 12px rgba(0,0,0,0.4)",
                transition: "transform 0.22s cubic-bezier(.34,1.56,.64,1), box-shadow 0.22s",
                minHeight: "60px",
              }}
              onMouseEnter={(e) => { const el = e.currentTarget; el.style.transform = "translateY(-3px) scale(1.02)"; el.style.boxShadow = "0 16px 60px rgba(198,168,112,0.55), 0 4px 20px rgba(0,0,0,0.5)"; }}
              onMouseLeave={(e) => { const el = e.currentTarget; el.style.transform = ""; el.style.boxShadow = "0 8px 40px rgba(198,168,112,0.40), 0 2px 12px rgba(0,0,0,0.4)"; }}
            >
              Iniciar agora
              <ArrowRight size={18} strokeWidth={2.5} />
            </button>

            {/* Scroll hint */}
            <p style={{ marginTop: "20px", fontSize: "11px", color: "rgba(245,240,232,0.32)", fontFamily: "Montserrat, sans-serif", letterSpacing: "0.12em" }}>
              Exclusive — acesso via QR code
            </p>
          </div>
        </div>

        {/* Teaser section below fold */}
        <div style={{ background: "#04060f", padding: "clamp(48px,8vw,96px) clamp(24px,5vw,64px)", textAlign: "center" }}>
          <p className="overline" style={{ color: "var(--gold)", fontSize: "9px", letterSpacing: "0.24em", marginBottom: "16px" }}>A única coisa que te separa</p>
          <blockquote style={{
            fontFamily: "Cormorant Garamond, serif",
            fontSize: "clamp(22px,3.5vw,38px)",
            fontWeight: 300, lineHeight: 1.35,
            color: "#f5f0e8", fontStyle: "italic",
            maxWidth: "680px", margin: "0 auto 16px",
          }}>
            "das pessoas que avançaram é que elas escolheram a coragem de olhar, reconhecer e se curar."
          </blockquote>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px" }}>
            <div style={{ height: "1px", width: "32px", background: "rgba(198,168,112,0.35)" }} />
            <span style={{ fontFamily: "Montserrat, sans-serif", fontSize: "9px", letterSpacing: "0.18em", color: "rgba(198,168,112,0.55)" }}>SUNYAN · DESPERTAR ESPIRAL</span>
            <div style={{ height: "1px", width: "32px", background: "rgba(198,168,112,0.35)" }} />
          </div>
        </div>
      </div>
    );
  }

  /* ════════════════════════════
     STEPS PHASE
  ════════════════════════════ */
  if (phase === "steps") {
    const currentStep = STEPS[step];
    const isMulti     = currentStep.type === "multi-textarea";
    const isAffirm    = currentStep.type === "affirmation";
    const isMed       = currentStep.type === "meditation";

    return (
      <div ref={containerRef} style={{ minHeight: "100dvh", background: "#04060f", overflowX: "hidden", fontFamily: "DM Sans, sans-serif" }}>
        <ProgressBar current={step + 1} total={STEPS.length} />

        {/* Step header sticky */}
        <header style={{
          position: "sticky", top: 0, zIndex: 100,
          background: "rgba(4,6,15,0.94)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(198,168,112,0.08)",
          padding: "14px clamp(16px,4vw,32px)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <button
            onClick={goPrev}
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", color: "rgba(245,240,232,0.45)", fontSize: "13px", fontFamily: "DM Sans, sans-serif", padding: "8px", borderRadius: "8px", minHeight: "44px", transition: "color 0.2s" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--gold)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(245,240,232,0.45)")}
          >
            <ChevronLeft size={16} /> {step === 0 ? "Início" : "Anterior"}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{
                width: i === step ? "20px" : "5px",
                height: "5px", borderRadius: "100px",
                background: i <= step ? "var(--gold)" : "rgba(198,168,112,0.18)",
                transition: "all 0.4s cubic-bezier(.16,1,.3,1)",
              }} />
            ))}
          </div>

          <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: "9px", letterSpacing: "0.16em", color: "rgba(198,168,112,0.55)" }}>
            {step + 1}/{STEPS.length}
          </div>
        </header>

        {/* Step card */}
        <div style={{
          opacity: animIn ? 1 : 0,
          transform: animIn ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.28s ease, transform 0.28s cubic-bezier(.16,1,.3,1)",
        }}>
          {/* Step identity row */}
          <div style={{
            padding: "clamp(32px,6vw,64px) clamp(20px,5vw,48px) 0",
            display: "flex", alignItems: "flex-start", gap: "20px",
          }}>
            {/* Symbol / step number */}
            <div style={{
              width: "clamp(52px,8vw,68px)", height: "clamp(52px,8vw,68px)",
              borderRadius: "50%", flexShrink: 0,
              background: "rgba(198,168,112,0.08)",
              border: "1px solid rgba(198,168,112,0.28)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: "2px",
            }}>
              <span style={{ fontSize: "18px", color: "var(--gold)", lineHeight: 1 }}>{currentStep.symbol}</span>
              <span style={{ fontFamily: "Montserrat, sans-serif", fontSize: "8px", letterSpacing: "0.14em", color: "rgba(198,168,112,0.55)" }}>0{currentStep.id}</span>
            </div>

            <div>
              <p style={{ fontFamily: "Montserrat, sans-serif", fontSize: "9px", letterSpacing: "0.20em", textTransform: "uppercase", color: "var(--gold)", marginBottom: "6px" }}>
                {currentStep.label}
              </p>
              <h2 style={{
                fontFamily: "Cormorant Garamond, serif",
                fontSize: "clamp(26px,4vw,40px)", fontWeight: 300,
                color: "#f5f0e8", lineHeight: 1.12,
                letterSpacing: "-0.01em",
              }}>
                {currentStep.question}
              </h2>
            </div>
          </div>

          {/* Step subtext */}
          <div style={{ padding: "clamp(16px,3vw,24px) clamp(20px,5vw,48px)" }}>
            <p style={{ fontSize: "clamp(15px,2vw,17px)", color: "rgba(245,240,232,0.62)", lineHeight: 1.78 }}>
              {currentStep.subtext}
            </p>
          </div>

          {/* Hero image fragment — contextual per step */}
          {!isAffirm && !isMed && (
            <div style={{ padding: "0 clamp(20px,5vw,48px) clamp(24px,4vw,36px)", position: "relative" }}>
              <div style={{
                borderRadius: "clamp(14px,2vw,20px)",
                overflow: "hidden",
                height: "clamp(120px,22vw,180px)",
                position: "relative",
              }}>
                <img
                  src={heroImg}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  style={{
                    width: "100%", height: "100%", objectFit: "cover",
                    objectPosition: `center ${30 + step * 8}%`,
                    filter: "brightness(0.45) saturate(0.9)",
                    transform: "scale(1.04)",
                  }}
                />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(4,6,15,0.75) 0%, transparent 50%, rgba(4,6,15,0.75) 100%)" }} />
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "clamp(48px,8vw,80px)", fontStyle: "italic", color: "rgba(198,168,112,0.18)", fontWeight: 300, letterSpacing: "0.05em", userSelect: "none" }}>
                    {currentStep.symbol}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── INPUT AREA ── */}
          <div style={{ padding: "0 clamp(20px,5vw,48px) clamp(40px,8vw,72px)" }}>

            {/* Standard textarea */}
            {currentStep.type === "textarea" && (
              <textarea
                value={answers[step][0]}
                onChange={(e) => setAnswer(step, 0, e.target.value)}
                placeholder={currentStep.placeholder}
                rows={4}
                style={{
                  width: "100%", padding: "18px 20px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1.5px solid rgba(198,168,112,0.18)",
                  borderRadius: "16px", color: "#f5f0e8",
                  fontFamily: "DM Sans, sans-serif", fontSize: "16px",
                  lineHeight: 1.7, resize: "none", outline: "none",
                  transition: "border-color 0.22s, background 0.22s, box-shadow 0.22s",
                  caretColor: "var(--gold)",
                }}
                onFocus={(e) => { e.target.style.borderColor = "var(--gold)"; e.target.style.background = "rgba(255,255,255,0.06)"; e.target.style.boxShadow = "0 0 0 3px rgba(198,168,112,0.10)"; }}
                onBlur={(e)  => { e.target.style.borderColor = "rgba(198,168,112,0.18)"; e.target.style.background = "rgba(255,255,255,0.04)"; e.target.style.boxShadow = "none"; }}
              />
            )}

            {/* Multi-textarea for step 4 */}
            {isMulti && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {/* Section dividers */}
                {[0, 3].map((startIdx) => (
                  <div key={startIdx}>
                    {startIdx === 3 && (
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "8px 0 12px" }}>
                        <div style={{ flex: 1, height: "1px", background: "rgba(198,168,112,0.12)" }} />
                        <span style={{ fontFamily: "Montserrat, sans-serif", fontSize: "8.5px", letterSpacing: "0.18em", color: "rgba(198,168,112,0.55)", textTransform: "uppercase" }}>
                          Sentimentos
                        </span>
                        <div style={{ flex: 1, height: "1px", background: "rgba(198,168,112,0.12)" }} />
                      </div>
                    )}
                    {[0, 1, 2].map((i) => {
                      const idx = startIdx + i;
                      return (
                        <textarea
                          key={idx}
                          value={answers[step][idx] ?? ""}
                          onChange={(e) => setAnswer(step, idx, e.target.value)}
                          placeholder={currentStep.placeholders?.[idx] ?? ""}
                          rows={2}
                          style={{
                            width: "100%", padding: "14px 18px",
                            background: "rgba(255,255,255,0.04)",
                            border: "1.5px solid rgba(198,168,112,0.14)",
                            borderRadius: "14px", color: "#f5f0e8",
                            fontFamily: "DM Sans, sans-serif", fontSize: "15px",
                            lineHeight: 1.65, resize: "none", outline: "none",
                            transition: "border-color 0.22s, box-shadow 0.22s",
                            caretColor: "var(--gold)",
                          }}
                          onFocus={(e) => { e.target.style.borderColor = "var(--gold)"; e.target.style.boxShadow = "0 0 0 3px rgba(198,168,112,0.10)"; }}
                          onBlur={(e)  => { e.target.style.borderColor = "rgba(198,168,112,0.14)"; e.target.style.boxShadow = "none"; }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            )}

            {/* Affirmation — step 7 */}
            {isAffirm && (
              <div>
                {/* Affirmation card with decorative frame */}
                <div style={{
                  position: "relative",
                  borderRadius: "20px",
                  padding: "32px 28px",
                  background: "linear-gradient(135deg, rgba(198,168,112,0.09) 0%, rgba(198,168,112,0.04) 100%)",
                  border: "1px solid rgba(198,168,112,0.30)",
                  marginBottom: "28px",
                  overflow: "hidden",
                }}>
                  {/* Corner decorations */}
                  <div style={{ position: "absolute", top: "12px", left: "14px", fontSize: "10px", color: "rgba(198,168,112,0.30)" }}>✦</div>
                  <div style={{ position: "absolute", top: "12px", right: "14px", fontSize: "10px", color: "rgba(198,168,112,0.30)" }}>✦</div>
                  <div style={{ position: "absolute", bottom: "12px", left: "14px", fontSize: "10px", color: "rgba(198,168,112,0.30)" }}>✦</div>
                  <div style={{ position: "absolute", bottom: "12px", right: "14px", fontSize: "10px", color: "rgba(198,168,112,0.30)" }}>✦</div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                    <Volume2 size={14} style={{ color: "var(--gold)" }} strokeWidth={1.5} />
                    <span style={{ fontFamily: "Montserrat, sans-serif", fontSize: "9px", letterSpacing: "0.20em", textTransform: "uppercase", color: "var(--gold)" }}>
                      Leia em voz alta
                    </span>
                  </div>

                  <blockquote style={{
                    fontFamily: "Cormorant Garamond, serif",
                    fontSize: "clamp(17px,2.5vw,22px)",
                    fontWeight: 300, lineHeight: 1.75,
                    color: "rgba(245,240,232,0.88)",
                    fontStyle: "italic", margin: 0,
                    whiteSpace: "pre-line",
                  }}>
                    {AFFIRMATION_TEXT}
                  </blockquote>
                </div>

                {/* Background image decorative */}
                <div style={{ borderRadius: "16px", overflow: "hidden", height: "clamp(100px,18vw,150px)", position: "relative", marginBottom: "24px" }}>
                  <img src={heroImg} alt="" aria-hidden loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 60%", filter: "brightness(0.35) saturate(0.8)" }} />
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "clamp(13px,2vw,16px)", letterSpacing: "0.18em", color: "rgba(198,168,112,0.55)", textTransform: "uppercase", textAlign: "center", padding: "0 20px" }}>
                      As palavras criam realidades
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setAffirmRead(true)}
                  style={{
                    width: "100%", padding: "17px", borderRadius: "16px",
                    background: affirmRead ? "rgba(140,170,150,0.15)" : "rgba(198,168,112,0.10)",
                    border: `1.5px solid ${affirmRead ? "rgba(140,170,150,0.35)" : "rgba(198,168,112,0.28)"}`,
                    color: affirmRead ? "var(--sage)" : "var(--gold)",
                    fontFamily: "Montserrat, sans-serif", fontSize: "10px",
                    letterSpacing: "0.18em", textTransform: "uppercase",
                    cursor: "pointer", fontWeight: 600,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                    transition: "all 0.25s", minHeight: "56px",
                  }}
                >
                  {affirmRead ? <><CheckCircle2 size={16} /> Li o compromisso em voz alta</> : "✓  Eu li em voz alta"}
                </button>
              </div>
            )}

            {/* Meditation — step 8 */}
            {isMed && (
              <div>
                {/* Atmospheric image — full width, immersive */}
                <div style={{
                  borderRadius: "20px", overflow: "hidden",
                  height: "clamp(180px,35vw,280px)",
                  position: "relative", marginBottom: "28px",
                }}>
                  <img
                    src={heroImg} alt="" aria-hidden loading="lazy"
                    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 20%", filter: "brightness(0.5) saturate(1.1)" }}
                  />
                  <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(198,168,112,0.12) 0%, rgba(4,6,15,0.6) 80%)" }} />
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "24px" }}>
                    <span style={{ fontSize: "48px", color: "rgba(198,168,112,0.7)", animation: "glowPulse 3s ease-in-out infinite", display: "block", marginBottom: "12px" }}>✶</span>
                    <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "clamp(18px,3vw,26px)", fontStyle: "italic", color: "rgba(245,240,232,0.85)", lineHeight: 1.4 }}>
                      Feche os olhos.<br />Respire fundo.
                    </p>
                  </div>
                </div>

                <div style={{
                  borderRadius: "18px",
                  padding: "24px 24px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(198,168,112,0.14)",
                  marginBottom: "24px",
                }}>
                  <p style={{ fontSize: "clamp(15px,2vw,17px)", color: "rgba(245,240,232,0.75)", lineHeight: 1.85, margin: 0 }}>
                    Imagine essa trava como uma <strong style={{ color: "rgba(198,168,112,0.90)", fontWeight: 500 }}>estrela brilhante</strong>. Vá dando cada vez mais brilho para essa estrela.
                    <br /><br />
                    Quando ela brilhar tanto que ofuscar seus olhos, imagine-a se transformando numa <strong style={{ color: "rgba(198,168,112,0.90)", fontWeight: 500 }}>flecha certeira, afiada e perfeita</strong>.
                    <br /><br />
                    Coloque essa flecha mentalmente embaixo do seu travesseiro — todas as noites, direcione-a imaginando-a atingindo o seu objetivo.
                  </p>
                </div>

                <button
                  onClick={() => setMedDone(true)}
                  style={{
                    width: "100%", padding: "17px", borderRadius: "16px",
                    background: medDone ? "rgba(140,170,150,0.15)" : "rgba(198,168,112,0.10)",
                    border: `1.5px solid ${medDone ? "rgba(140,170,150,0.35)" : "rgba(198,168,112,0.28)"}`,
                    color: medDone ? "var(--sage)" : "var(--gold)",
                    fontFamily: "Montserrat, sans-serif", fontSize: "10px",
                    letterSpacing: "0.18em", textTransform: "uppercase",
                    cursor: "pointer", fontWeight: 600,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                    transition: "all 0.25s", minHeight: "56px",
                  }}
                >
                  {medDone ? <><CheckCircle2 size={16} /> Ativação concluída</> : "✶  Fiz a visualização"}
                </button>
              </div>
            )}

            {/* Next button */}
            <div style={{ marginTop: "clamp(24px,4vw,40px)" }}>
              <button
                onClick={goNext}
                disabled={!canAdvance()}
                style={{
                  width: "100%", padding: "18px 24px",
                  background: canAdvance() ? "var(--gold)" : "rgba(198,168,112,0.14)",
                  color: canAdvance() ? "#04060f" : "rgba(198,168,112,0.35)",
                  border: "none", borderRadius: "16px",
                  fontFamily: "Montserrat, sans-serif", fontSize: "11px",
                  fontWeight: 700, letterSpacing: "0.20em", textTransform: "uppercase",
                  cursor: canAdvance() ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                  transition: "all 0.25s cubic-bezier(.34,1.56,.64,1)",
                  minHeight: "58px",
                  transform: canAdvance() ? "none" : "none",
                }}
                onMouseEnter={(e) => { if (canAdvance()) (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "none"; }}
              >
                {step < STEPS.length - 1 ? (
                  <><ChevronRight size={16} /> Próxima etapa</>
                ) : (
                  <><Sparkles size={16} /> Finalizar jornada</>
                )}
              </button>

              {!canAdvance() && currentStep.type === "textarea" && (
                <p style={{ textAlign: "center", marginTop: "12px", fontSize: "12px", color: "rgba(245,240,232,0.28)", fontFamily: "Montserrat, sans-serif" }}>
                  Escreva sua resposta para continuar
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ════════════════════════════
     LEAD CAPTURE PHASE
  ════════════════════════════ */
  if (phase === "capture") {
    return (
      <div style={{ minHeight: "100dvh", background: "#04060f", fontFamily: "DM Sans, sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>

        {/* Background image */}
        <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
          <img src={heroImg} alt="" aria-hidden loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 25%", filter: "brightness(0.18) saturate(0.8)" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 70% at 50% 60%, rgba(4,6,15,0.4) 0%, rgba(4,6,15,0.96) 70%)" }} />
        </div>

        <GoldParticles />

        {/* Card */}
        <div style={{
          position: "relative", zIndex: 10,
          width: "100%", maxWidth: "520px",
          margin: "0 auto", padding: "clamp(24px,5vw,48px) clamp(20px,4vw,40px)",
          animation: "fadeUp 0.7s cubic-bezier(.16,1,.3,1) both",
        }}>
          {/* Completion icon */}
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div style={{
              width: "80px", height: "80px", borderRadius: "50%",
              background: "rgba(198,168,112,0.10)",
              border: "2px solid rgba(198,168,112,0.35)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px",
              animation: "bounceScale 0.6s cubic-bezier(.34,1.56,.64,1) both",
            }}>
              <span style={{ fontSize: "32px" }}>✶</span>
            </div>
            <p style={{ fontFamily: "Montserrat, sans-serif", fontSize: "9px", letterSpacing: "0.24em", textTransform: "uppercase", color: "var(--gold)", marginBottom: "12px" }}>
              Jornada Completa
            </p>
            <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "clamp(32px,5vw,48px)", fontWeight: 300, color: "#f5f0e8", lineHeight: 1.1, marginBottom: "14px" }}>
              Você ativou<br /><em style={{ fontStyle: "italic", color: "var(--gold)" }}>seu poder.</em>
            </h2>
            <p style={{ fontSize: "clamp(14px,2vw,16px)", color: "rgba(245,240,232,0.62)", lineHeight: 1.75, maxWidth: "380px", margin: "0 auto" }}>
              Queremos continuar essa jornada com você. Deixe seu contato para receber ferramentas exclusivas do Despertar Espiral.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleCapture} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={{ display: "block", fontFamily: "Montserrat, sans-serif", fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(245,240,232,0.45)", marginBottom: "8px" }}>
                E-mail (opcional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                style={{
                  width: "100%", padding: "16px 18px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1.5px solid rgba(198,168,112,0.18)",
                  borderRadius: "14px", color: "#f5f0e8",
                  fontFamily: "DM Sans, sans-serif", fontSize: "16px",
                  outline: "none", transition: "border-color 0.22s, box-shadow 0.22s",
                  caretColor: "var(--gold)",
                }}
                onFocus={(e) => { e.target.style.borderColor = "var(--gold)"; e.target.style.boxShadow = "0 0 0 3px rgba(198,168,112,0.10)"; }}
                onBlur={(e)  => { e.target.style.borderColor = "rgba(198,168,112,0.18)"; e.target.style.boxShadow = "none"; }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontFamily: "Montserrat, sans-serif", fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(245,240,232,0.45)", marginBottom: "8px" }}>
                Telefone / WhatsApp (opcional)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                style={{
                  width: "100%", padding: "16px 18px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1.5px solid rgba(198,168,112,0.18)",
                  borderRadius: "14px", color: "#f5f0e8",
                  fontFamily: "DM Sans, sans-serif", fontSize: "16px",
                  outline: "none", transition: "border-color 0.22s, box-shadow 0.22s",
                  caretColor: "var(--gold)",
                }}
                onFocus={(e) => { e.target.style.borderColor = "var(--gold)"; e.target.style.boxShadow = "0 0 0 3px rgba(198,168,112,0.10)"; }}
                onBlur={(e)  => { e.target.style.borderColor = "rgba(198,168,112,0.18)"; e.target.style.boxShadow = "none"; }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: "100%", padding: "18px",
                background: "var(--gold)", color: "#04060f",
                border: "none", borderRadius: "14px",
                fontFamily: "Montserrat, sans-serif", fontSize: "11px",
                fontWeight: 700, letterSpacing: "0.20em", textTransform: "uppercase",
                cursor: submitting ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                transition: "transform 0.22s cubic-bezier(.34,1.56,.64,1), box-shadow 0.22s",
                minHeight: "58px", marginTop: "6px",
                opacity: submitting ? 0.7 : 1,
                boxShadow: "0 8px 32px rgba(198,168,112,0.30)",
              }}
            >
              {submitting ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Enviando…</> : <><Send size={15} /> Quero receber ferramentas</>}
            </button>

            <button
              type="button"
              onClick={() => setPhase("complete")}
              style={{
                background: "none", border: "none", color: "rgba(245,240,232,0.32)",
                fontFamily: "Montserrat, sans-serif", fontSize: "9px",
                letterSpacing: "0.16em", textTransform: "uppercase",
                cursor: "pointer", padding: "10px", minHeight: "44px",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(245,240,232,0.55)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(245,240,232,0.32)")}
            >
              Continuar sem cadastro →
            </button>
          </form>

          <p style={{ textAlign: "center", marginTop: "20px", fontSize: "11px", color: "rgba(245,240,232,0.22)", fontFamily: "Montserrat, sans-serif", lineHeight: 1.6 }}>
            Seus dados são protegidos e nunca compartilhados.<br />
            Você pode cancelar a qualquer momento.
          </p>
        </div>
      </div>
    );
  }

  /* ════════════════════════════
     COMPLETE PHASE
  ════════════════════════════ */
  return (
    <div style={{ minHeight: "100dvh", background: "#04060f", fontFamily: "DM Sans, sans-serif", overflowX: "hidden" }}>

      {/* Hero image — full backdrop */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
        <img src={heroImg} alt="" aria-hidden style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.15) saturate(0.7)" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 80% at 50% 40%, rgba(198,168,112,0.06) 0%, rgba(4,6,15,0.97) 65%)" }} />
      </div>

      <GoldParticles />

      {/* Decorative spirals */}
      <div style={{ position: "fixed", right: "-100px", top: "10%", pointerEvents: "none", animation: "spiralCW 100s linear infinite", opacity: 0.07 }}>
        <SpiralDecor opacity={1} size={400} />
      </div>
      <div style={{ position: "fixed", left: "-100px", bottom: "10%", pointerEvents: "none", animation: "spiralCCW 80s linear infinite", opacity: 0.05 }}>
        <SpiralDecor opacity={1} size={320} />
      </div>

      {/* Content */}
      <div style={{
        position: "relative", zIndex: 10,
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", minHeight: "100dvh",
        padding: "clamp(40px,8vw,80px) clamp(20px,5vw,48px)",
        textAlign: "center",
      }}>
        {/* Big gold star */}
        <div style={{
          fontSize: "72px", lineHeight: 1, marginBottom: "28px",
          animation: "bounceScale 0.8s cubic-bezier(.34,1.56,.64,1) 0.2s both",
          filter: "drop-shadow(0 0 30px rgba(198,168,112,0.50))",
        }}>
          ✶
        </div>

        <p style={{ fontFamily: "Montserrat, sans-serif", fontSize: "9px", letterSpacing: "0.28em", textTransform: "uppercase", color: "var(--gold)", marginBottom: "16px", animation: "fadeUp 0.6s ease 0.4s both" }}>
          Ativação Completa
        </p>

        <h1 style={{
          fontFamily: "Cormorant Garamond, serif",
          fontSize: "clamp(38px,7vw,76px)", fontWeight: 300,
          color: "#f5f0e8", lineHeight: 1.02,
          letterSpacing: "-0.02em", marginBottom: "20px",
          animation: "fadeUp 0.7s ease 0.5s both",
        }}>
          Você é o mapa.<br />
          <em style={{ fontStyle: "italic", color: "var(--gold)" }}>Você é o poder.</em>
        </h1>

        <p style={{
          fontSize: "clamp(15px,2vw,18px)", color: "rgba(245,240,232,0.65)",
          lineHeight: 1.78, maxWidth: "520px", marginBottom: "clamp(32px,6vw,56px)",
          animation: "fadeUp 0.7s ease 0.6s both",
        }}>
          Use esta ferramenta sempre que se sentir paralisada. Repita o processo — cada vez que a trava aparecer, ela traz consigo uma nova oportunidade de ativação.
        </p>

        {/* QR Code section */}
        <div style={{
          background: "rgba(255,255,255,0.97)",
          borderRadius: "24px",
          padding: "clamp(24px,4vw,36px)",
          marginBottom: "clamp(20px,4vw,32px)",
          boxShadow: "0 20px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(198,168,112,0.20)",
          animation: "popIn 0.7s cubic-bezier(.34,1.56,.64,1) 0.8s both",
          display: "flex", flexDirection: "column", alignItems: "center", gap: "16px",
          maxWidth: "280px",
        }}>
          {/* QR code via API */}
          <img
            src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://despertarespiral.com/mapa&color=04060f&bgcolor=ffffff&margin=2"
            alt="QR Code — despertarespiral.com/mapa"
            width="200" height="200"
            loading="lazy"
            style={{ display: "block", borderRadius: "8px" }}
          />
          <div>
            <p style={{ fontFamily: "Montserrat, sans-serif", fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(4,6,15,0.45)", marginBottom: "4px" }}>
              Acesse sempre
            </p>
            <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "18px", color: "#04060f", fontWeight: 500, letterSpacing: "0.03em" }}>
              despertarespiral.com/mapa
            </p>
          </div>
        </div>

        <p style={{ fontSize: "13px", color: "rgba(245,240,232,0.38)", marginBottom: "clamp(24px,4vw,40px)", animation: "fadeIn 0.5s ease 1.2s both" }}>
          Escaneie o QR code para acessar esta ferramenta novamente a qualquer momento
        </p>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "clamp(24px,4vw,36px)", width: "100%", maxWidth: "420px", animation: "fadeIn 0.5s ease 1.1s both" }}>
          <div style={{ flex: 1, height: "1px", background: "rgba(198,168,112,0.18)" }} />
          <span style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "18px", color: "rgba(198,168,112,0.45)" }}>✦</span>
          <div style={{ flex: 1, height: "1px", background: "rgba(198,168,112,0.18)" }} />
        </div>

        {/* Final CTA */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", maxWidth: "400px", animation: "fadeUp 0.6s ease 1.0s both" }}>
          <a
            href="https://despertarespiral.com"
            target="_blank" rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
              padding: "17px 32px",
              background: "var(--gold)", color: "#04060f",
              borderRadius: "14px", textDecoration: "none",
              fontFamily: "Montserrat, sans-serif", fontSize: "10.5px",
              fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase",
              boxShadow: "0 8px 32px rgba(198,168,112,0.30)",
              transition: "transform 0.22s cubic-bezier(.34,1.56,.64,1), box-shadow 0.22s",
              minHeight: "56px",
            }}
            onMouseEnter={(e) => { const el = e.currentTarget; el.style.transform = "translateY(-2px)"; el.style.boxShadow = "0 16px 50px rgba(198,168,112,0.40)"; }}
            onMouseLeave={(e) => { const el = e.currentTarget; el.style.transform = ""; el.style.boxShadow = "0 8px 32px rgba(198,168,112,0.30)"; }}
          >
            <Sparkles size={15} /> Conhecer o Despertar Espiral
          </a>

          <button
            onClick={() => { setPhase("intro"); setStep(0); setAnswers(STEPS.map((s) => s.type === "multi-textarea" ? Array(s.inputs ?? 1).fill("") : [""])); setAffirmRead(false); setMedDone(false); }}
            style={{
              padding: "14px 24px", background: "transparent",
              border: "1px solid rgba(198,168,112,0.20)",
              borderRadius: "14px", color: "rgba(245,240,232,0.45)",
              fontFamily: "Montserrat, sans-serif", fontSize: "9px",
              letterSpacing: "0.16em", textTransform: "uppercase",
              cursor: "pointer", transition: "all 0.2s", minHeight: "50px",
            }}
            onMouseEnter={(e) => { const el = e.currentTarget; el.style.borderColor = "rgba(198,168,112,0.40)"; el.style.color = "rgba(245,240,232,0.65)"; }}
            onMouseLeave={(e) => { const el = e.currentTarget; el.style.borderColor = "rgba(198,168,112,0.20)"; el.style.color = "rgba(245,240,232,0.45)"; }}
          >
            ↺ Refazer a jornada
          </button>
        </div>

        {/* Brand signature */}
        <div style={{ marginTop: "clamp(40px,8vw,80px)", animation: "fadeIn 0.5s ease 1.4s both" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "center" }}>
            <div style={{ height: "1px", width: "24px", background: "rgba(198,168,112,0.25)" }} />
            <span style={{ fontFamily: "Montserrat, sans-serif", fontSize: "8px", letterSpacing: "0.24em", textTransform: "uppercase", color: "rgba(198,168,112,0.35)" }}>
              Despertar Espiral · Sunyan
            </span>
            <div style={{ height: "1px", width: "24px", background: "rgba(198,168,112,0.25)" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
