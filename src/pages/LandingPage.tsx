/**
 * LandingPage — Reformulação completa
 * Dark / Light totalmente cobertos, mobile-first em todas as seções
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import LandingNav from "@/components/layout/LandingNav";
import {
  LazyBackgroundSpiral3D as BackgroundSpiral3D,
  LazySectionSpiral3D as SectionSpiral3D,
  LazyMacbookMockup as MacbookMockup,
} from "@/components/layout/LazyDecorative";
import mulherEspiralHero from "@/assets/mulher-espiral-hero.png";
import sunyanPortrait from "@/assets/sunyan-portrait.jpg";
import { useTheme } from "@/hooks/useTheme";
import { ArrowRight, ArrowUpRight, Shield, Clock, Infinity, Star, ChevronDown } from "lucide-react";

/* ── Scroll progress ──────────────────────────────────────── */
function useScrollProgress(ref: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      el.style.width = max > 0 ? `${Math.min((window.scrollY / max) * 100, 100).toFixed(1)}%` : "0%";
    };
    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => window.removeEventListener("scroll", update);
  }, [ref]);
}

/* ── Section reveal ───────────────────────────────────────── */
function useReveal() {
  useEffect(() => {
    const targets = document.querySelectorAll<HTMLElement>(".reveal, .reveal-left, .reveal-right");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { (e.target as HTMLElement).classList.add("visible"); io.unobserve(e.target); }
      }),
      { threshold: 0.07, rootMargin: "0px 0px -24px 0px" }
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);
}

/* ── Active section dots ──────────────────────────────────── */
const SECTION_COUNT = 9;
function useActiveSection(dotsRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const els = Array.from({ length: SECTION_COUNT }, (_, i) => document.getElementById(`section-${i}`));
    const dots = dotsRef.current?.querySelectorAll<HTMLButtonElement>("button");
    const activate = (idx: number) => {
      dots?.forEach((d, i) => {
        d.style.width = i === idx ? "20px" : "6px";
        d.style.background = i === idx ? "var(--gold)" : "var(--border-soft)";
      });
    };
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { const idx = els.findIndex((el) => el === e.target); if (idx !== -1) activate(idx); }
      }),
      { threshold: 0.25 }
    );
    els.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [dotsRef]);
}

/* ── Stat card ───────────────────────────────────────────── */
function Stat({ value, label, delay = "" }: { value: string; label: string; delay?: string }) {
  return (
    <div className={`reveal ${delay}`} style={{ textAlign: "center", padding: "clamp(12px,2vw,20px) 8px" }}>
      <p className="font-display" style={{ fontSize: "clamp(38px,6vw,60px)", color: "var(--gold)", fontStyle: "italic", fontWeight: 300, lineHeight: 1 }}>
        {value}
      </p>
      <p className="overline" style={{ color: "var(--text-muted)", fontSize: "8px", letterSpacing: "0.28em", marginTop: "10px" }}>{label}</p>
    </div>
  );
}

/* ── Data ─────────────────────────────────────────────────── */
const testimonials = [
  { name: "Lua Crescente",     text: "Pela primeira vez em anos me senti em casa na minha própria pele. O método da Sunyan toca onde nenhum outro chegou.", detail: "Módulo 3 — O Corpo como Sabedoria" },
  { name: "Violeta Silvestre", text: "Esse curso não te ensina sobre autoconhecimento. Ele te faz vivê-lo. É completamente diferente de qualquer coisa que já experimentei.", detail: "Concluiu Mulher Espiral" },
  { name: "Rosa do Deserto",   text: "Cheguei cética. Fui transformada. A profundidade do conteúdo e o cuidado de cada aula são incomparáveis.", detail: "Módulo 5 — O Feminino Sagrado" },
];

const steps = [
  { num: "01", title: "Reconhecer", body: "Você enxerga os padrões que te aprisionam, com olhos de compaixão — não de julgamento." },
  { num: "02", title: "Sentir",     body: "O corpo fala. Aprendemos a ouvir o que ele carrega há anos em silêncio." },
  { num: "03", title: "Integrar",   body: "Cada aspecto de si mesma é acolhido. A espiral avança quando você para de fugir." },
  { num: "04", title: "Despertar",  body: "Não é um destino. É uma orientação. Uma forma de viver mais leve e alinhada." },
];

const guarantees = [
  { icon: Shield,   label: "7 dias de garantia", desc: "Devolução integral sem perguntas" },
  { icon: Infinity, label: "Acesso vitalício",   desc: "Conteúdo sempre disponível" },
  { icon: Clock,    label: "Suporte humanizado", desc: "Time dedicado à sua jornada" },
];

const faqs = [
  {
    q: "Para quem é o Mulher Espiral?",
    a: "Para mulheres que sentem que algo está faltando — mesmo quando tudo 'parece' bem por fora. Para quem carrega histórias difíceis no corpo, mas ainda acredita em transformação. Não é necessária nenhuma experiência prévia com autoconhecimento.",
  },
  {
    q: "Como funciona o acesso ao curso?",
    a: "Após a confirmação do pagamento, você recebe acesso vitalício à plataforma. Os módulos são liberados progressivamente para que você possa integrar cada etapa. Você aprende no seu ritmo, sem pressão.",
  },
  {
    q: "E se eu não me identificar com o conteúdo?",
    a: "Você tem 7 dias de garantia incondicional. Se por qualquer motivo sentir que não é o momento certo, devolvemos 100% do investimento sem burocracia e sem perguntas. Simples assim.",
  },
  {
    q: "Preciso de muito tempo disponível?",
    a: "As aulas foram criadas para a realidade da mulher moderna. Você pode progredir com 20 a 40 minutos por dia. O que importa é constância, não velocidade — a espiral avança no seu tempo.",
  },
  {
    q: "Existe suporte durante a jornada?",
    a: "Sim. Você tem acesso à comunidade exclusiva de alunas e ao suporte humanizado da nossa equipe. Ninguém percorre esse caminho sozinha.",
  },
  {
    q: "Como é feito o pagamento?",
    a: "Aceitamos PIX (aprovação instantânea), cartão de crédito em até 12× e boleto bancário. Após o pedido, você recebe as instruções detalhadas por e-mail.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      borderBottom: "1px solid var(--border-subtle)",
      overflow: "hidden",
    }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: "16px", padding: "clamp(16px,2.5vw,22px) 0",
          background: "transparent", border: "none", cursor: "pointer",
          textAlign: "left",
        }}
        aria-expanded={open}
      >
        <span style={{ fontSize: "clamp(14px,1.6vw,16px)", color: "var(--text-primary)", fontWeight: 400, lineHeight: 1.5, flex: 1 }}>
          {q}
        </span>
        <div style={{
          width: "28px", height: "28px", borderRadius: "50%",
          border: "1px solid var(--border-soft)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          background: open ? "rgba(198,168,112,0.12)" : "transparent",
          borderColor: open ? "var(--border-mid)" : "var(--border-soft)",
          transition: "all 0.25s ease",
        }}>
          <ChevronDown
            size={13}
            style={{
              color: open ? "var(--gold)" : "var(--text-faint)",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.3s cubic-bezier(.16,1,.3,1)",
            }}
          />
        </div>
      </button>
      <div style={{
        maxHeight: open ? "300px" : "0px",
        overflow: "hidden",
        transition: "max-height 0.4s cubic-bezier(.16,1,.3,1)",
      }}>
        <p style={{
          fontSize: "clamp(13px,1.5vw,15px)", color: "var(--text-secondary)",
          lineHeight: 1.85, paddingBottom: "clamp(16px,2.5vw,22px)",
        }}>
          {a}
        </p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const progressRef = useRef<HTMLDivElement>(null);
  const dotsRef     = useRef<HTMLDivElement>(null);
  const { theme }   = useTheme();
  const isLight     = theme === "light";

  useScrollProgress(progressRef);
  useReveal();
  useActiveSection(dotsRef);

  /* ── Hero colors — fully theme-aware ── */
  const heroBg   = isLight ? "var(--bg-surface)"   : "#060810";
  const heroText  = isLight ? "var(--text-primary)"   : "#f5f0e8";
  const heroMuted = isLight ? "var(--text-secondary)" : "rgba(245,240,232,0.60)";
  /* Gold always uses the CSS variable so it auto-adapts per theme */


  return (
    <div style={{ background: "var(--bg-surface)", color: "var(--text-primary)", minHeight: "100dvh", overflowX: "hidden", position: "relative" }}>

      {/* Scroll progress */}
      <div ref={progressRef} className="scroll-progress-line" aria-hidden="true" style={{ width: "0%" }} />

      {/* Background crystal */}
      <BackgroundSpiral3D />

      {/* Section dots */}
      <div className="spiral-tracker" ref={dotsRef} aria-hidden="true">
        {Array.from({ length: SECTION_COUNT }, (_, i) => (
          <button key={i}
            onClick={() => document.getElementById(`section-${i}`)?.scrollIntoView({ behavior: "smooth" })}
            style={{ width: i === 0 ? "20px" : "6px", height: "6px", borderRadius: "100px", background: i === 0 ? "var(--gold)" : "var(--border-soft)", border: "none", padding: 0, cursor: "pointer", transition: "all 0.35s cubic-bezier(.16,1,.3,1)", flexShrink: 0, display: "block" }}
            aria-label={`Ir para seção ${i + 1}`}
          />
        ))}
      </div>

      <LandingNav />

      {/* ══════════════════════════════════════════════
          0 — HERO
      ══════════════════════════════════════════════ */}
      <section id="section-0" style={{
        position: "relative", minHeight: "100svh",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden", background: heroBg,
      }}>
        {/* Gold radial glow — adapts per theme */}
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 80% 65% at 55% 42%, ${isLight ? "rgba(122,94,30,0.07)" : "rgba(198,168,112,0.12)"} 0%, transparent 65%)`, pointerEvents: "none", zIndex: 0 }} />
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 45% 50% at 22% 75%, ${isLight ? "rgba(100,70,80,0.05)" : "rgba(172,128,142,0.07)"} 0%, transparent 60%)`, pointerEvents: "none", zIndex: 0 }} />

        {/* Hero bottom fade — transitions to next section */}
        <div aria-hidden="true" style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "200px", background: `linear-gradient(to bottom, transparent, ${heroBg})`, pointerEvents: "none", zIndex: 3 }} />

        {/* Hero content */}
        <div style={{ position: "relative", zIndex: 4, width: "100%", maxWidth: "1160px", margin: "0 auto", padding: "0 clamp(16px,5vw,40px)", paddingTop: "clamp(72px,12vh,100px)" }}>
          <div style={{ width: "100%", display: "grid", gap: "clamp(32px,6vw,72px)", alignItems: "center" }} className="grid lg:grid-cols-[1.05fr_0.95fr]">
            <div style={{ width: "100%", maxWidth: "100%", display: "flex", flexDirection: "column", alignItems: "flex-start" }} className="lg:items-start items-center">

            {/* Social proof pill */}
            <div className="animate-fade-up delay-100" style={{ display: "inline-flex", alignItems: "center", gap: "10px", marginBottom: "clamp(16px,3vw,28px)", background: "var(--gold-glow)", border: "1px solid var(--border-mid)", borderRadius: "100px", padding: "7px 16px 7px 10px", alignSelf: "center", justifySelf: "center" }}>
              <div style={{ display: "flex", gap: "2px" }}>
                {[...Array(5)].map((_, i) => <Star key={i} size={9} fill="var(--gold)" style={{ color: "var(--gold)" }} />)}
              </div>
              <span className="font-label" style={{ fontSize: "9px", letterSpacing: "0.20em", textTransform: "uppercase", color: "var(--gold)" }}>
                +1.200 mulheres transformadas
              </span>
            </div>

            <h1 className="animate-fade-up delay-200 text-balance" style={{ fontSize: "clamp(38px,5.8vw,84px)", lineHeight: 1.02, fontStyle: "italic", fontWeight: 300, marginBottom: "clamp(16px,3vw,28px)", color: heroText, textAlign: "center" }}>
              Reconectar-se<br />
              não é voltar.<br />
              <span style={{ color: "var(--gold)" }}>É encontrar-se<br />pela primeira vez.</span>
            </h1>

            <div className="lg:hidden animate-fade-in delay-300" style={{ display: "flex", justifyContent: "center", marginBottom: "clamp(12px,3vw,22px)", width: "100%" }}>
              <MacbookMockup />
            </div>

            <p className="animate-fade-up delay-300" style={{ fontSize: "clamp(15px,1.8vw,17px)", color: heroMuted, maxWidth: "440px", lineHeight: 1.88, marginBottom: "clamp(24px,4vw,40px)", fontWeight: 300, textAlign: "center", margin: "0 auto clamp(24px,4vw,40px)" }}>
              Uma jornada de autoconhecimento profunda, estruturada e amorosa — para mulheres que sentem que existe mais.
            </p>

            {/* Desktop CTAs */}
            <div className="hidden lg:flex animate-fade-up delay-400" style={{ gap: "12px", alignItems: "center", flexWrap: "wrap", marginBottom: "28px", justifyContent: "center" }}>
              <Link to="/checkout/mulher-espiral" className="btn-gold">
                Quero começar minha jornada <ArrowRight size={14} />
              </Link>
              <Link to="/login" className="btn-outline-gold" style={{ color: "rgba(245,240,232,0.85)", borderColor: "rgba(245,240,232,0.24)" }}>
                Já sou aluna
              </Link>
            </div>

            {/* Desktop guarantee strip */}
            <div className="hidden lg:flex animate-fade-in delay-600" style={{ gap: "20px", flexWrap: "wrap", justifyContent: "center" }}>
              {guarantees.map(({ icon: Icon, label }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                  <Icon size={12} style={{ color: "var(--gold-dim)" }} strokeWidth={1.5} />
                  <span className="font-label" style={{ fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-muted)" }}>{label}</span>
                </div>
              ))}
            </div>

            {/* Mobile CTAs — full-width */}
            <div className="lg:hidden animate-fade-in delay-500" style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "8px", alignItems: "center" }}>
              <Link to="/checkout/mulher-espiral" className="btn-gold"
                style={{ width: "100%", justifyContent: "center", minHeight: "56px", borderRadius: "18px" }}>
                Quero começar minha jornada <ArrowRight size={15} />
              </Link>
              <Link to="/login" className="btn-outline-gold"
                style={{ width: "100%", justifyContent: "center", minHeight: "52px", borderRadius: "18px" }}>
                Já sou aluna
              </Link>
              {/* Guarantee pills */}
              <div style={{ display: "flex", justifyContent: "center", gap: "16px", flexWrap: "wrap", marginTop: "12px" }}>
                {guarantees.map(({ icon: Icon, label }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <Icon size={10} style={{ color: "var(--gold-dim)" }} strokeWidth={1.5} />
                    <span className="font-label" style={{ fontSize: "8px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)" }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
            </div>

            <div className="hidden lg:flex" style={{ justifyContent: "flex-end", alignItems: "center", marginTop: "12px" }}>
              <MacbookMockup />
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="animate-fade-in delay-800" style={{ position: "absolute", bottom: "clamp(20px,4vh,36px)", left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", zIndex: 4 }} aria-hidden="true">
          <div className="animate-float" style={{ width: "1px", height: "52px", background: "linear-gradient(to bottom, transparent, rgba(198,168,112,0.40), transparent)" }} />
          <span className="overline" style={{ fontSize: "7px", color: "rgba(198,168,112,0.30)", letterSpacing: "0.38em" }}>DESCER</span>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          1 — SOCIAL PROOF
      ══════════════════════════════════════════════ */}
      <section id="section-1" style={{
        position: "relative", zIndex: 1,
        marginTop: "-2px", overflow: "hidden",
        padding: "clamp(56px,8vw,100px) clamp(16px,5vw,24px)",
        borderBottom: "1px solid var(--border-subtle)",
        background: "var(--bg-surface-2)",
      }}>
        <div style={{ maxWidth: "940px", margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div className="reveal" style={{ textAlign: "center", marginBottom: "clamp(32px,5vw,56px)" }}>
            <div style={{ display: "flex", justifyContent: "center", gap: "4px", marginBottom: "12px" }}>
              {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="var(--gold)" style={{ color: "var(--gold)" }} />)}
            </div>
            <p className="font-display" style={{ fontSize: "clamp(16px,2.4vw,22px)", fontStyle: "italic", color: "var(--text-secondary)", fontWeight: 300, maxWidth: "560px", margin: "0 auto", lineHeight: 1.5 }}>
              "A experiência mais transformadora que já vivi."
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "clamp(4px,2vw,16px)" }} className="sm:grid-cols-4">
            <Stat value="1.200+"  label="Mulheres na jornada"     delay="reveal-delay-1" />
            <Stat value="97%"     label="Recomendam o método"     delay="reveal-delay-2" />
            <Stat value="8"       label="Módulos transformadores" delay="reveal-delay-3" />
            <Stat value="4.9 ★"   label="Avaliação média"         delay="reveal-delay-4" />
          </div>
        </div>
        {/* Bottom diamond */}
        <div style={{ position: "absolute", bottom: "-9px", left: "50%", transform: "translateX(-50%)", width: "16px", height: "16px", background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", rotate: "45deg", zIndex: 2 }} aria-hidden="true" />
      </section>

      {/* ══════════════════════════════════════════════
          2 — MÉTODO
      ══════════════════════════════════════════════ */}
      <section id="section-2" className="cv-auto" style={{
        position: "relative", zIndex: 1, overflow: "hidden",
        padding: "clamp(72px,10vw,128px) clamp(16px,5vw,24px)",
        background: "var(--bg-surface)",
      }}>
        <div className="glow-gold" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} aria-hidden="true" />
        <div style={{ position: "absolute", left: "-24px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} aria-hidden="true">
          <SectionSpiral3D size={100} height={280} opacity={isLight ? 0.22 : 0.26} color={isLight ? "#8f6e28" : "#a07c34"} emissive="#5a3a0a" speed={0.00035} lightBg={isLight} />
        </div>
        <div style={{ position: "relative", maxWidth: "1100px", margin: "0 auto", display: "grid", gap: "clamp(32px,5vw,72px)", alignItems: "center" }} className="grid lg:grid-cols-2">
          <div className="reveal-left">
            <p className="overline" style={{ color: "var(--gold)", marginBottom: "18px" }}>O Método Espiral</p>
            <h2 className="text-balance" style={{ fontSize: "clamp(28px,5vw,58px)", lineHeight: 1.06, fontWeight: 300, marginBottom: "20px", color: "var(--text-primary)" }}>
              A espiral como metáfora do seu caminho interior
            </h2>
            <p style={{ fontSize: "clamp(14px,1.6vw,16px)", color: "var(--text-secondary)", lineHeight: 1.92, marginBottom: "32px" }}>
              Cada volta representa um nível mais profundo de consciência. Não é linearidade — é aprofundamento. Você volta ao mesmo ponto, mas sempre mais inteira.
            </p>
            <Link to="/checkout/mulher-espiral" className="btn-outline-gold">
              Conhecer o método <ArrowUpRight size={13} />
            </Link>
          </div>
          <div className="reveal-right">
            {steps.map((step, i) => (
              <div key={step.num} style={{ display: "flex", gap: "clamp(14px,3vw,22px)", padding: "clamp(16px,2.5vw,24px) 0", borderBottom: i < steps.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                <span className="font-display" style={{ fontSize: "clamp(28px,3.5vw,38px)", color: "var(--border-mid)", lineHeight: 1, fontWeight: 300, width: "clamp(36px,4vw,44px)", flexShrink: 0 }}>{step.num}</span>
                <div>
                  <h3 className="font-label" style={{ fontSize: "9px", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--gold)", marginBottom: "7px" }}>{step.title}</h3>
                  <p style={{ fontSize: "clamp(13px,1.5vw,15px)", color: "var(--text-secondary)", lineHeight: 1.85 }}>{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          3 — PRODUTO
      ══════════════════════════════════════════════ */}
      <section id="section-3" className="cv-auto" style={{
        position: "relative", zIndex: 1, overflow: "hidden",
        padding: "clamp(72px,10vw,128px) clamp(16px,5vw,24px)",
        background: "#060810",
      }}>
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 60% at 35% 50%, rgba(172,128,142,0.07) 0%, transparent 65%)", pointerEvents: "none" }} />
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 55% 50% at 70% 40%, rgba(198,168,112,0.07) 0%, transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", right: "-16px", bottom: "-36px", pointerEvents: "none" }} aria-hidden="true">
          <SectionSpiral3D size={100} height={280} opacity={0.11} color="#c6a870" emissive="#3a1c08" speed={0.00026} />
        </div>
        <div style={{ position: "relative", maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "clamp(36px,6vw,72px)" }}>
            <p className="overline reveal" style={{ color: "#c99aaa", marginBottom: "16px" }}>Jornadas</p>
            <h2 className="font-display text-balance reveal reveal-delay-1" style={{ fontSize: "clamp(30px,5.5vw,68px)", fontWeight: 300, fontStyle: "italic", color: "#f5f0e8" }}>
              Escolha o caminho que ressoa com você
            </h2>
          </div>

          <div className="reveal reveal-delay-1" style={{ overflow: "hidden", borderRadius: "clamp(16px,2vw,22px)", border: "1px solid rgba(198,168,112,0.15)", marginBottom: "24px", background: "#0e1023" }}>
            <div className="grid lg:grid-cols-2" style={{ minHeight: "clamp(300px,50vw,420px)" }}>
              {/* Image */}
              <div style={{ position: "relative", overflow: "hidden", background: "linear-gradient(135deg, #0b0d1c 0%, #180d18 100%)", minHeight: "clamp(200px,32vw,280px)" }}>
                <img src={mulherEspiralHero} alt="Mulher Espiral" loading="lazy" decoding="async"
                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: "block", position: "absolute", inset: 0, mixBlendMode: "luminosity", opacity: 0.88 }} />
                <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 90% 90% at 50% 100%, rgba(198,168,112,0.18) 0%, transparent 60%)", zIndex: 1 }} />
                <div aria-hidden="true" className="hidden lg:block" style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, transparent 50%, #0e1023 100%)", zIndex: 2 }} />
                <div aria-hidden="true" className="lg:hidden" style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #0e1023 0%, transparent 50%)", zIndex: 2 }} />
              </div>

              {/* Info */}
              <div style={{ padding: "clamp(24px,4vw,48px) clamp(20px,4vw,40px)", display: "flex", flexDirection: "column", justifyContent: "center", position: "relative", zIndex: 3 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "18px", flexWrap: "wrap" }}>
                  <span className="badge-rose">Programa Principal</span>
                  <span className="badge-gold">8 módulos</span>
                </div>
                <h3 className="font-display" style={{ fontSize: "clamp(28px,4.5vw,58px)", fontWeight: 300, lineHeight: 1.06, color: "#f5f0e8", marginBottom: "8px" }}>Mulher Espiral</h3>
                <p className="font-label" style={{ fontSize: "9px", color: "#c99aaa", letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: "18px" }}>Método de Reconexão e Cura</p>
                <p style={{ fontSize: "clamp(13px,1.5vw,15px)", color: "rgba(245,240,232,0.60)", lineHeight: 1.88, marginBottom: "clamp(16px,2.5vw,24px)" }}>
                  Uma jornada profunda de autoconhecimento feminino, estruturada em 8 módulos que conduzem do reconhecimento dos padrões à integração plena do seu ser.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "clamp(20px,3vw,28px)" }}>
                  {["Acesso vitalício ao conteúdo", "Comunidade exclusiva de alunas", "Certificado de conclusão", "Suporte humanizado"].map((f) => (
                    <div key={f} style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                      <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: "rgba(140,170,150,0.15)", border: "1px solid rgba(140,170,150,0.30)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ color: "#8caa96", fontSize: "9px" }}>✓</span>
                      </div>
                      <span style={{ fontSize: "clamp(12px,1.4vw,14px)", color: "rgba(245,240,232,0.70)" }}>{f}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: "16px", justifyContent: "space-between", flexWrap: "wrap", rowGap: "12px" }}>
                  <div>
                    <p className="overline" style={{ color: "rgba(245,240,232,0.32)", marginBottom: "4px", fontSize: "8px" }}>Investimento</p>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                      <p className="font-display" style={{ fontSize: "clamp(32px,4vw,44px)", color: "#c6a870", fontWeight: 300, lineHeight: 1 }}>R$ 997</p>
                      <p style={{ fontSize: "13px", color: "rgba(245,240,232,0.28)", textDecoration: "line-through" }}>R$ 1.997</p>
                    </div>
                    <p className="font-label" style={{ fontSize: "9px", color: "rgba(140,170,150,0.78)", letterSpacing: "0.12em", marginTop: "4px" }}>ou 12× de R$ 97,00</p>
                  </div>
                  <Link to="/checkout/mulher-espiral" className="btn-gold">
                    Quero começar <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Guarantees bar */}
          <div className="reveal reveal-delay-2" style={{ display: "flex", justifyContent: "center", gap: "clamp(14px,3vw,36px)", padding: "clamp(16px,3vw,24px)", borderRadius: "clamp(14px,2vw,18px)", background: "rgba(198,168,112,0.04)", border: "1px solid rgba(198,168,112,0.10)", flexWrap: "wrap" }}>
            {guarantees.map(({ icon: Icon, label, desc }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "rgba(198,168,112,0.10)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={13} style={{ color: "#c6a870" }} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-label" style={{ fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#c6a870" }}>{label}</p>
                  <p style={{ fontSize: "11px", color: "rgba(245,240,232,0.42)", marginTop: "1px" }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          4 — DEPOIMENTOS
      ══════════════════════════════════════════════ */}
      <section id="section-4" className="cv-auto" style={{
        position: "relative", zIndex: 1, overflow: "hidden",
        padding: "clamp(72px,10vw,128px) clamp(16px,5vw,24px)",
        background: "var(--bg-surface)",
      }}>
        <div style={{ position: "absolute", left: "-16px", bottom: "-24px", pointerEvents: "none" }} aria-hidden="true">
          <SectionSpiral3D size={90} height={250} opacity={isLight ? 0.18 : 0.22} color={isLight ? "#7a3248" : "#8c4a5e"} emissive="#4a1828" speed={0.0003} lightBg={isLight} />
        </div>
        <div style={{ position: "relative", maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "clamp(36px,6vw,64px)" }}>
            <p className="overline reveal" style={{ color: "var(--gold)", marginBottom: "16px" }}>Transformações reais</p>
            <h2 className="font-display text-balance reveal reveal-delay-1" style={{ fontSize: "clamp(26px,5vw,56px)", fontWeight: 300, color: "var(--text-primary)" }}>
              Mulheres que percorreram a espiral
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "16px", justifyContent: "center", marginTop: "20px" }}>
              <div style={{ height: "1px", width: "40px", background: "var(--border-subtle)" }} />
              <span style={{ color: "var(--gold)", fontSize: "10px" }}>◆</span>
              <div style={{ height: "1px", width: "40px", background: "var(--border-subtle)" }} />
            </div>
          </div>
          <div className="grid md:grid-cols-3" style={{ gap: "clamp(12px,2vw,18px)" }}>
            {testimonials.map((t, i) => (
              <div key={i} className={`card-dark reveal reveal-delay-${i + 1}`} style={{ padding: "clamp(18px,3vw,32px)", marginTop: i === 1 ? "clamp(0px,2vw,28px)" : "0", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", gap: "3px", marginBottom: "18px" }}>
                  {[...Array(5)].map((_, s) => <Star key={s} size={11} fill="var(--gold)" style={{ color: "var(--gold)" }} />)}
                </div>
                <p className="font-display" style={{ fontSize: "clamp(15px,1.8vw,17px)", color: "var(--text-secondary)", lineHeight: 1.68, fontStyle: "italic", fontWeight: 300, flex: 1, marginBottom: "20px" }}>"{t.text}"</p>
                <hr className="divider-gold" style={{ marginBottom: "18px" }} />
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: "rgba(172,128,142,0.15)", color: "var(--rose)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontFamily: "Montserrat,sans-serif", fontWeight: 500, flexShrink: 0 }}>{t.name.charAt(0)}</div>
                  <div>
                    <p style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>{t.name}</p>
                    <p className="font-label" style={{ fontSize: "9px", color: "var(--text-faint)", letterSpacing: "0.12em", textTransform: "uppercase" }}>{t.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          5 — COMUNIDADE
      ══════════════════════════════════════════════ */}
      <section id="section-5" className="cv-auto" style={{
        position: "relative", zIndex: 1, overflow: "hidden",
        padding: "clamp(72px,10vw,128px) clamp(16px,5vw,24px)",
        background: "var(--bg-surface-2)",
      }}>
        <div className="glow-lavender" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} aria-hidden="true" />
        <div style={{ position: "absolute", right: "-16px", top: "12%", pointerEvents: "none" }} aria-hidden="true">
          <SectionSpiral3D size={90} height={250} opacity={isLight ? 0.18 : 0.22} color={isLight ? "#3d3890" : "#514898"} emissive="#201860" speed={0.00032} lightBg={isLight} />
        </div>
        <div style={{ position: "relative", maxWidth: "960px", margin: "0 auto", textAlign: "center" }}>
          <span className="badge-lavender reveal" style={{ marginBottom: "24px", display: "inline-flex" }}>Espaço exclusivo para alunas</span>
          <h2 className="font-display text-balance reveal reveal-delay-1" style={{ fontSize: "clamp(30px,5.5vw,70px)", fontWeight: 300, fontStyle: "italic", marginBottom: "18px", color: "var(--text-primary)" }}>
            Ninguém desperta sozinha.
          </h2>
          <p className="reveal reveal-delay-2" style={{ fontSize: "clamp(14px,1.6vw,16px)", color: "var(--text-secondary)", maxWidth: "500px", margin: "0 auto clamp(36px,5vw,52px)", lineHeight: 1.88 }}>
            Um fórum anônimo e seguro para mulheres em jornada. Aqui você pode ser quem realmente é.
          </p>
          <div className="grid md:grid-cols-3" style={{ gap: "clamp(10px,2vw,16px)", marginBottom: "clamp(32px,5vw,48px)", textAlign: "left" }}>
            {[
              { cat: "conquistas", msg: "Terminei o módulo 3 e me senti diferente", by: "Lua Crescente",     likes: 47 },
              { cat: "desabafo",   msg: "Hoje foi difícil, mas estou aqui",          by: "Violeta Silvestre", likes: 89 },
              { cat: "dicas",      msg: "Minha rotina de prática que faz diferença", by: "Cedro Dourado",     likes: 55 },
            ].map((post, i) => (
              <div key={i} className={`card-dark reveal reveal-delay-${i + 1}`} style={{ padding: "clamp(14px,2.5vw,20px)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                  <span className="badge-lavender" style={{ fontSize: "8px" }}>{post.cat}</span>
                  <span style={{ fontSize: "12px", color: "var(--text-faint)" }}>♡ {post.likes}</span>
                </div>
                <p style={{ fontSize: "clamp(13px,1.5vw,15px)", color: "var(--text-primary)", lineHeight: 1.65, marginBottom: "10px" }}>{post.msg}</p>
                <p className="font-label" style={{ fontSize: "9px", color: "var(--lavender)", letterSpacing: "0.12em", textTransform: "uppercase" }}>{post.by}</p>
              </div>
            ))}
          </div>
          <Link to="/checkout/mulher-espiral" className="btn-gold reveal reveal-delay-4">
            Fazer parte da comunidade <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          6 — SUNYAN
      ══════════════════════════════════════════════ */}
      <section id="section-6" className="cv-auto" style={{
        position: "relative", zIndex: 1, overflow: "hidden",
        padding: "clamp(72px,10vw,128px) clamp(16px,5vw,24px)",
        background: "var(--bg-surface)",
      }}>
        <div className="glow-gold" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} aria-hidden="true" />
        <div style={{ position: "relative", maxWidth: "1060px", margin: "0 auto", display: "grid", gap: "clamp(32px,5vw,72px)", alignItems: "center" }} className="grid md:grid-cols-2">
          <div className="reveal-left" style={{ position: "relative", display: "flex", justifyContent: "center" }}>
            <div style={{ position: "relative", width: "clamp(200px,30vw,360px)", aspectRatio: "3/4", borderRadius: "clamp(18px,2.5vw,26px)", overflow: "hidden", border: "1px solid var(--border-soft)", boxShadow: "var(--shadow-lg)", flexShrink: 0 }}>
              <img src={sunyanPortrait} alt="Sunyan Nunes — Criadora do Método Espiral" loading="lazy" decoding="async"
                width="360" height="480"
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 12%", display: "block" }} />
              <div aria-hidden="true" style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "44px 20px 20px", background: "linear-gradient(to top, rgba(6,8,15,0.90) 0%, rgba(6,8,15,0.30) 55%, transparent 100%)" }}>
                <p style={{ fontFamily: "Cormorant Garamond,serif", fontSize: "20px", color: "#c6a870", fontStyle: "italic", fontWeight: 300, textAlign: "center", lineHeight: 1.2 }}>Sunyan Nunes</p>
                <p style={{ fontFamily: "Montserrat,sans-serif", fontSize: "8px", letterSpacing: "0.20em", textTransform: "uppercase", color: "rgba(198,168,112,0.58)", textAlign: "center", marginTop: "4px" }}>Criadora do Método Espiral</p>
              </div>
              <div aria-hidden="true" style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(90deg, transparent, rgba(198,168,112,0.55), transparent)" }} />
            </div>
            <div className="card-glass" style={{ position: "absolute", bottom: "-16px", right: "clamp(-8px,1vw,0px)", padding: "clamp(12px,2vw,16px) clamp(14px,2vw,20px)", minWidth: "140px" }}>
              <p className="font-display" style={{ fontSize: "clamp(22px,2.5vw,28px)", color: "var(--gold)", fontStyle: "italic", fontWeight: 300, lineHeight: 1 }}>8+ anos</p>
              <p className="font-label" style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: "0.15em", textTransform: "uppercase", marginTop: "5px" }}>conduzindo jornadas</p>
            </div>
          </div>
          <div className="reveal-right">
            <p className="overline" style={{ color: "var(--gold)", marginBottom: "18px" }}>A guia da jornada</p>
            <h2 style={{ fontSize: "clamp(26px,4.5vw,52px)", fontWeight: 300, lineHeight: 1.1, marginBottom: "18px", color: "var(--text-primary)" }}>Sunyan Nunes</h2>
            <p style={{ fontSize: "clamp(14px,1.6vw,16px)", color: "var(--text-secondary)", lineHeight: 1.90, marginBottom: "16px" }}>
              Terapeuta, facilitadora e criadora do Método Espiral. Por mais de 8 anos acompanha mulheres no processo de reencontro com sua essência — uma abordagem que une profundidade emocional, sabedoria do corpo e espiritualidade prática.
            </p>
            <p style={{ fontSize: "clamp(13px,1.5vw,15px)", color: "var(--text-muted)", lineHeight: 1.90, fontStyle: "italic", marginBottom: "clamp(20px,3vw,32px)" }}>
              "Não sou guru. Sou uma companheira de jornada que já percorreu o caminho e voltou para te mostrar que é possível."
            </p>
            <div style={{ display: "flex", gap: "clamp(8px,1.5vw,12px)", flexWrap: "wrap", marginBottom: "clamp(20px,3vw,32px)" }}>
              {[["1.2k", "alunas"], ["4.9", "avaliação"], ["97%", "recomendam"]].map(([val, lbl]) => (
                <div key={lbl} className="card-dark" style={{ padding: "clamp(12px,2vw,16px) clamp(14px,2vw,18px)", textAlign: "center", flex: "1 1 80px" }}>
                  <p className="font-display" style={{ fontSize: "clamp(20px,2.5vw,26px)", color: "var(--gold)", fontWeight: 300, lineHeight: 1 }}>{val}</p>
                  <p className="font-label" style={{ fontSize: "8px", color: "var(--text-muted)", letterSpacing: "0.15em", textTransform: "uppercase", marginTop: "5px" }}>{lbl}</p>
                </div>
              ))}
            </div>
            <Link to="/checkout/mulher-espiral" className="btn-gold">
              Quero aprender com Sunyan <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          7 — FAQ
      ══════════════════════════════════════════════ */}
      <section id="section-7" className="cv-auto" style={{
        position: "relative", zIndex: 1, overflow: "hidden",
        padding: "clamp(72px,10vw,128px) clamp(16px,5vw,24px)",
        background: "var(--bg-surface-2)",
      }}>
        <div style={{ position: "relative", maxWidth: "720px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "clamp(36px,6vw,56px)" }}>
            <p className="overline reveal" style={{ color: "var(--gold)", marginBottom: "16px" }}>Dúvidas frequentes</p>
            <h2 className="font-display text-balance reveal reveal-delay-1" style={{ fontSize: "clamp(28px,5vw,58px)", fontWeight: 300, color: "var(--text-primary)" }}>
              O que você precisa saber
            </h2>
          </div>
          <div className="reveal reveal-delay-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
            {faqs.map((faq, i) => (
              <FaqItem key={i} q={faq.q} a={faq.a} />
            ))}
          </div>
          <div className="reveal reveal-delay-3" style={{ textAlign: "center", marginTop: "clamp(28px,4vw,44px)" }}>
            <p style={{ fontSize: "clamp(13px,1.5vw,15px)", color: "var(--text-muted)", marginBottom: "20px" }}>
              Ainda tem dúvidas? Fale com a gente.
            </p>
            <a href="mailto:contato@despertarespiral.com" className="btn-outline-gold" style={{ display: "inline-flex" }}>
              contato@despertarespiral.com
            </a>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          8 — CTA FINAL
      ══════════════════════════════════════════════ */}
      <section id="section-8" className="cv-auto" style={{
        position: "relative", zIndex: 1, overflow: "hidden",
        padding: "clamp(100px,14vw,180px) clamp(16px,5vw,24px)",
        textAlign: "center",
        background: isLight ? "var(--bg-surface-3)" : "#060810",
      }}>
        <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none" }} aria-hidden="true">
          <SectionSpiral3D size={160} height={430} opacity={isLight ? 0.10 : 0.13} color={isLight ? "#8f6e28" : "#c6a870"} emissive="#3a1c08" speed={0.00024} withRings lightBg={isLight} />
        </div>
        <div className="animate-glow" style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 65% 55% at 50% 50%, var(--gold-glow) 0%, transparent 68%)", pointerEvents: "none" }} aria-hidden="true" />
        <div style={{ position: "relative", maxWidth: "680px", margin: "0 auto" }}>
          <div className="reveal" style={{ display: "flex", justifyContent: "center", gap: "4px", marginBottom: "24px" }}>
            {[...Array(5)].map((_, i) => <Star key={i} size={13} fill="var(--gold)" style={{ color: "var(--gold)" }} />)}
          </div>
          <p className="overline reveal reveal-delay-1" style={{ color: "var(--gold)", marginBottom: "20px", letterSpacing: "0.32em" }}>
            Você chegou até aqui por um motivo
          </p>
          <h2 className="font-display text-balance reveal reveal-delay-2" style={{ fontSize: "clamp(34px,6.5vw,82px)", fontWeight: 300, fontStyle: "italic", lineHeight: 1.04, marginBottom: "22px", color: "var(--text-primary)" }}>
            Algo dentro de você reconhece esse chamado.
          </h2>
          <p className="reveal reveal-delay-3" style={{ fontSize: "clamp(14px,1.8vw,17px)", color: "var(--text-secondary)", lineHeight: 1.85, marginBottom: "clamp(32px,5vw,52px)" }}>
            Não é coincidência. É reconhecimento.
          </p>
          <div className="reveal reveal-delay-4" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
            <Link to="/checkout/mulher-espiral" className="btn-gold"
              style={{ padding: "17px clamp(32px,5vw,60px)", fontSize: "10px", width: "100%", maxWidth: "440px", justifyContent: "center" }}>
              Quero começar minha jornada <ArrowRight size={15} />
            </Link>
          </div>
          <div className="reveal reveal-delay-5" style={{ display: "flex", justifyContent: "center", gap: "clamp(12px,3vw,24px)", marginTop: "clamp(24px,3vw,36px)", flexWrap: "wrap" }}>
            {guarantees.map(({ label }) => (
              <span key={label} className="font-label" style={{ fontSize: "8px", color: "var(--text-muted)", letterSpacing: "0.22em", textTransform: "uppercase" }}>✓ {label}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════ */}
      <footer style={{ position: "relative", zIndex: 1, padding: "clamp(36px,6vw,60px) clamp(16px,5vw,24px)", background: isLight ? "var(--bg-surface-3)" : "#060810", borderTop: "1px solid var(--border-subtle)" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "clamp(16px,3vw,28px)" }}>
            <div>
              <p className="font-label" style={{ fontSize: "11px", letterSpacing: "0.32em", textTransform: "uppercase", color: "var(--gold)", fontWeight: 500, marginBottom: "5px" }}>DESPERTAR ESPIRAL</p>
              <p className="font-label" style={{ fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-faint)" }}>por Sunyan Nunes</p>
            </div>
            <nav style={{ display: "flex", gap: "clamp(14px,2.5vw,24px)", flexWrap: "wrap" }}>
              {[["Método","#section-2"],["Jornadas","#section-3"],["Comunidade","#section-5"],["Entrar","/login"]].map(([label,href]) => (
                <a key={label} href={href} className="font-label"
                  style={{ fontSize: "9px", letterSpacing: "0.20em", textTransform: "uppercase", color: "var(--text-muted)", textDecoration: "none", transition: "color 0.2s" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--gold)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-muted)")}
                >{label}</a>
              ))}
            </nav>
            <p className="font-label" style={{ fontSize: "9px", color: "var(--text-faint)", letterSpacing: "0.12em" }}>contato@despertarespiral.com</p>
          </div>
          <hr className="divider-gold" style={{ margin: "clamp(24px,4vw,40px) 0 clamp(20px,3vw,28px)" }} />
          <p className="font-label" style={{ textAlign: "center", fontSize: "8px", color: "var(--text-faint)", letterSpacing: "0.18em", textTransform: "uppercase" }}>
            © {new Date().getFullYear()} Despertar Espiral — Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
