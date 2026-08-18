/**
 * LandingPage — Imersive Scroll Edition
 * Parallax multicamada, reveal cinético, transições premium entre seções
 */
import { useEffect, useRef, useState, useCallback, useId } from "react";
import { Helmet } from "@/lib/helmet";
import { Link } from "react-router-dom";
import LandingNav from "@/components/layout/LandingNav";
import {
  LazyBackgroundSpiral3D as BackgroundSpiral3D,
  LazySectionSpiral3D   as SectionSpiral3D,
} from "@/components/layout/LazyDecorative";
import mulherEspiralHero from "@/assets/mulher-espiral-hero-new.jpg";
import sunyanPortrait     from "@/assets/sunyan-portrait.jpg";
import { useTheme } from "@/hooks/useTheme";
import { ArrowRight, ArrowUpRight, ChevronDown } from "lucide-react";
import { steps, guarantees, faqs } from "@/constants/landingContent";
import QuizSection from "@/components/features/QuizSection";
import { StorefrontGrid } from "@/components/storefront/StorefrontGrid";
import { fetchStorefront } from "@/lib/storefront";
import type { StorefrontProduct } from "@/types";

/* ─────────────────────────────────────────────────────────────────
   Prefetch helpers — fire-and-forget dynamic imports on hover/focus
   so the JS chunk is already in the browser cache when the user
   clicks. Vite deduplicates repeated import() calls by URL.
───────────────────────────────────────────────────────────────── */
const prefetchLogin    = () => import("@/pages/LoginPage").catch(() => {});
const prefetchCheckout = () => import("@/pages/CheckoutPage").catch(() => {});

/* ─────────────────────────────────────────────────────────────────
   Scroll progress bar
───────────────────────────────────────────────────────────────── */
function useScrollProgress(ref: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      const max = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      el.style.transform = `scaleX(${max > 0 ? Math.min(window.scrollY / max, 1) : 0})`;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; update(); }); };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => { window.removeEventListener("scroll", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [ref]);
}

/* ─────────────────────────────────────────────────────────────────
   Parallax engine — reads once per RAF, applies via transform
───────────────────────────────────────────────────────────────── */
function useParallax() {
  useEffect(() => {
    const layers = Array.from(
      document.querySelectorAll<HTMLElement>("[data-parallax]")
    );
    if (!layers.length) return;

    let raf = 0;
    const update = () => {
      const sy = window.scrollY;
      for (const el of layers) {
        const speed  = parseFloat(el.dataset.parallax ?? "0");
        const origin = parseFloat(el.dataset.parallaxOrigin ?? "0");
        const delta  = (sy - origin) * speed;
        el.style.transform = `translateY(${delta.toFixed(2)}px)`;
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; update(); }); };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);
}

/* ─────────────────────────────────────────────────────────────────
   Section reveal on scroll
───────────────────────────────────────────────────────────────── */
function useReveal() {
  useEffect(() => {
    const targets = document.querySelectorAll<HTMLElement>(".reveal,.reveal-left,.reveal-right,.reveal-scale");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { (e.target as HTMLElement).classList.add("visible"); io.unobserve(e.target); }
      }),
      { threshold: 0.06, rootMargin: "0px 0px -16px 0px" }
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);
}

/* ─────────────────────────────────────────────────────────────────
   Section dots nav
───────────────────────────────────────────────────────────────── */
const SECTION_COUNT = 8;
function useActiveSection(dotsRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const els = Array.from({ length: SECTION_COUNT }, (_, i) => document.getElementById(`section-${i}`));
    const dots = dotsRef.current?.querySelectorAll<HTMLButtonElement>("button");
    const activate = (idx: number) => {
      dots?.forEach((d, i) => {
        d.style.width      = i === idx ? "20px" : "6px";
        d.style.background = i === idx ? "var(--gold)" : "var(--border-soft)";
        d.style.opacity    = i === idx ? "1" : "0.5";
      });
    };
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { const idx = els.findIndex((el) => el === e.target); if (idx !== -1) activate(idx); }
      }),
      { threshold: 0.3 }
    );
    els.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [dotsRef]);
}

/* ─────────────────────────────────────────────────────────────────
   Stat counter with animated reveal
───────────────────────────────────────────────────────────────── */
/* ─────────────────────────────────────────────────────────────────
   FAQ accordion
───────────────────────────────────────────────────────────────── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <div style={{ borderBottom: "1px solid var(--border-subtle)", overflow: "hidden" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: "16px", padding: "clamp(18px,2.6vw,24px) 0",
          background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
        }}
      >
        <span style={{ fontSize: "clamp(14px,1.6vw,16px)", color: "var(--text-primary)", fontWeight: 400, lineHeight: 1.5, flex: 1 }}>
          {q}
        </span>
        <div style={{
          width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
          border: `1px solid ${open ? "var(--border-mid)" : "var(--border-soft)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: open ? "rgba(198,168,112,0.12)" : "transparent",
          transition: "all 0.25s ease",
        }}>
          <ChevronDown size={13} style={{
            color: open ? "var(--gold)" : "var(--text-faint)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.32s cubic-bezier(.16,1,.3,1)",
          }} />
        </div>
      </button>
      <div
        id={panelId}
        role="region"
        aria-hidden={!open}
        style={{
        maxHeight: open ? "320px" : "0",
        overflow: "hidden",
        transition: "max-height 0.42s cubic-bezier(.16,1,.3,1)",
      }}>
        <p style={{
          fontSize: "clamp(13px,1.5vw,15px)", color: "var(--text-secondary)",
          lineHeight: 1.88, paddingBottom: "clamp(18px,2.8vw,24px)",
        }}>{a}</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Floating orb — ambient light accent
───────────────────────────────────────────────────────────────── */
function Orb({ color, x, y, size, blur, opacity }: {
  color: string; x: string; y: string; size: string; blur: string; opacity: number;
}) {
  return (
    <div aria-hidden="true" style={{
      position: "absolute", left: x, top: y, width: size, height: size,
      borderRadius: "50%", background: color, filter: `blur(${blur})`,
      opacity, pointerEvents: "none", transform: "translate(-50%,-50%)",
    }} />
  );
}

/* ─────────────────────────────────────────────────────────────────
   Horizontal ticker (continuous scroll text)
───────────────────────────────────────────────────────────────── */
const TICKER_ITEMS = [
  "Autoconhecimento", "◆", "Reconexão", "◆", "Cura Feminina", "◆",
  "Presença", "◆", "Propósito", "◆", "Comunidade", "◆",
  "Transformação", "◆", "Autenticidade", "◆", "Método Espiral", "◆",
];
function Ticker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div style={{ overflow: "hidden", background: "rgba(198,168,112,0.06)", borderTop: "1px solid var(--border-subtle)", borderBottom: "1px solid var(--border-subtle)", padding: "14px 0" }}>
      <div style={{ display: "flex", gap: "32px", animation: "tickerScroll 38s linear infinite", width: "max-content" }}>
        {items.map((item, i) => (
          <span key={i} className="font-label" style={{
            fontSize: "9px", letterSpacing: "0.28em", textTransform: "uppercase",
            color: item === "◆" ? "var(--gold)" : "var(--text-faint)",
            whiteSpace: "nowrap",
          }}>{item}</span>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const progressRef = useRef<HTMLDivElement>(null);
  const dotsRef     = useRef<HTMLDivElement>(null);
  const heroRef     = useRef<HTMLElement>(null);
  const { theme }   = useTheme();
  const isLight     = theme === "light";

  const [produtos, setProdutos]     = useState<StorefrontProduct[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let vivo = true;
    fetchStorefront()
      .then((p) => { if (vivo) setProdutos(p); })
      .finally(() => { if (vivo) setCarregando(false); });
    return () => { vivo = false; };
  }, []);

  useScrollProgress(progressRef);
  useParallax();
  useReveal();
  useActiveSection(dotsRef);

  /* Set parallax origin after mount */
  useEffect(() => {
    const layers = document.querySelectorAll<HTMLElement>("[data-parallax]");
    layers.forEach((el) => {
      const rect = el.getBoundingClientRect();
      el.dataset.parallaxOrigin = String(rect.top + window.scrollY - window.innerHeight / 2);
    });
  }, []);

  /* Hero computed colors */
  const heroBg   = isLight ? "var(--bg-surface)" : "#060810";
  const heroText = isLight ? "var(--text-primary)" : "#f5f0e8";
  const heroMuted= isLight ? "var(--text-secondary)" : "rgba(245,240,232,0.58)";

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <>
      <Helmet>
        <title>Despertar Espiral — Método de Reconexão e Cura Feminina</title>
        <meta name="description" content="Uma jornada de autoconhecimento feminino com aulas práticas, comunidade ativa e certificado de conclusão. Inicie sua espiral de transformação." />
        <meta property="og:title" content="Despertar Espiral — Método de Reconexão e Cura Feminina" />
        <meta property="og:description" content="Uma jornada de autoconhecimento feminino com aulas práticas, comunidade ativa e certificado de conclusão." />
      </Helmet>

      <div style={{
        background: "var(--surface-glass)", color: "var(--text-primary)",
        minHeight: "100dvh", overflowX: "hidden", position: "relative",
      }}>

        {/* ── Global styles & keyframes ── */}
        <style>{`
          /* Scroll snap — mobile only */
          @media (max-width: 639px) {
            html { scroll-snap-type: y proximity; }
            #section-0,#section-1,#section-2,#section-3,#section-4,
            #section-5,#section-6,#section-7,#section-8,#section-9 {
              scroll-snap-align: start;
              scroll-snap-stop: normal;
            }
            #section-0 { min-height: 100svh; }
          }

          /* Ticker */
          @keyframes tickerScroll {
            0%   { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }

          /* Community pulse */
          @keyframes communityPulse {
            0%  { transform: scale(1);   opacity: 0.6; }
            70% { transform: scale(2.6); opacity: 0; }
            100%{ transform: scale(2.6); opacity: 0; }
          }

          /* Floating hero accent */
          @keyframes heroFloat {
            0%, 100% { transform: translateY(0px) rotate(-1deg); }
            50%       { transform: translateY(-12px) rotate(1deg); }
          }
          @keyframes heroFloatB {
            0%, 100% { transform: translateY(0px) rotate(1deg); }
            50%       { transform: translateY(10px) rotate(-1deg); }
          }

          /* Scroll indicator bounce */
          @keyframes scrollBounce {
            0%, 100% { transform: translateX(-50%) translateY(0); opacity: 0.5; }
            50%       { transform: translateX(-50%) translateY(8px); opacity: 1; }
          }

          /* Section entrance */
          .reveal-scale {
            opacity: 0;
            transform: scale(0.96) translateY(16px);
            transition: opacity 0.9s cubic-bezier(.16,1,.3,1), transform 0.9s cubic-bezier(.16,1,.3,1);
          }
          .reveal-scale.visible { opacity: 1; transform: scale(1) translateY(0); }

          /* Number counter shimmer */
          @keyframes numShimmer {
            0%   { background-position: -200% center; }
            100% { background-position:  200% center; }
          }
          .stat-shimmer {
            background: linear-gradient(105deg, var(--gold) 30%, #fff5 50%, var(--gold) 70%);
            background-size: 200% auto;
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: numShimmer 3s linear infinite;
          }

          /* Hover glow ring on product card */
          .product-card-glow:hover {
            box-shadow: 0 0 0 1px rgba(198,168,112,0.20),
                        0 24px 80px rgba(0,0,0,0.55),
                        0 0 60px rgba(198,168,112,0.07);
          }

          /* Perspective section overlap — desktop */
          @media (min-width: 1024px) {
            .section-overlap {
              position: relative;
              z-index: 2;
            }
            .section-overlap + .section-overlap {
              margin-top: -2px;
            }
          }

          /* Sticky hero text — parallax within hero */
          .hero-sticky-text {
            will-change: transform;
          }

          /* Scroll cue */
          .scroll-cue {
            position: absolute;
            bottom: clamp(24px,4vh,40px);
            left: 50%;
            animation: scrollBounce 2.4s ease-in-out infinite;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 6px;
            z-index: 4;
          }

          /* Clip transition between dark sections */
          .clip-top {
            clip-path: polygon(0 0, 100% 4vw, 100% 100%, 0 100%);
            margin-top: -4vw;
            padding-top: calc(clamp(72px,10vw,128px) + 4vw);
          }
          .clip-bottom {
            clip-path: polygon(0 0, 100% 0, 100% calc(100% - 4vw), 0 100%);
            padding-bottom: calc(clamp(72px,10vw,128px) + 4vw);
          }

          /* Reduced motion overrides */
          @media (prefers-reduced-motion: reduce) {
            @keyframes tickerScroll { 0%,100%{ transform:translateX(0); } }
            @keyframes heroFloat    { 0%,100%{ transform:none; } }
            @keyframes heroFloatB   { 0%,100%{ transform:none; } }
            @keyframes scrollBounce { 0%,100%{ transform:translateX(-50%) translateY(0); } }
            [data-parallax]         { transform: none !important; }
          }
        `}</style>

        {/* ── Scroll progress ── */}
        <div
          ref={progressRef}
          aria-hidden="true"
          style={{
            position: "fixed", top: 0, left: 0, right: 0, height: "2px",
            background: "linear-gradient(90deg, var(--gold), var(--gold-soft))",
            transform: "scaleX(0)", transformOrigin: "left",
            zIndex: 500, pointerEvents: "none", willChange: "transform",
          }}
        />

        {/* ── Background crystal ── */}
        <BackgroundSpiral3D />

        {/* ── Section dots ── */}
        <div className="spiral-tracker" ref={dotsRef} aria-hidden="true">
          {Array.from({ length: SECTION_COUNT }, (_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(`section-${i}`)}
              aria-label={`Ir para seção ${i + 1}`}
              style={{
                width: i === 0 ? "20px" : "6px", height: "6px",
                borderRadius: "100px",
                background: i === 0 ? "var(--gold)" : "var(--border-soft)",
                border: "none", padding: 0, cursor: "pointer",
                transition: "all 0.35s cubic-bezier(.16,1,.3,1)",
                flexShrink: 0, display: "block", opacity: i === 0 ? 1 : 0.5,
              }}
            />
          ))}
        </div>

        <LandingNav />

        {/* ══════════════════════════════════════
               0 — HERO (Parallax Imersivo)
            ══════════════════════════════════════ */}
        <section
          id="section-0"
          ref={heroRef}
          style={{
            position: "relative", minHeight: "100svh",
            display: "flex", alignItems: "center", justifyContent: "center",
            /* Transparente de proposito: o hero e a vitrine do video de fundo
               (BackgroundVideo) — orbs e star-field sairam junto do fundo
               solido para nao sujar a imagem. */
            overflow: "hidden", background: "transparent",
          }}
        >
          {/* Hero bottom fade */}
          <div aria-hidden="true" style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: "220px",
            background: `linear-gradient(to bottom, transparent, ${heroBg})`,
            pointerEvents: "none", zIndex: 3,
          }} />

          {/* ── Hero content ── */}
          <div style={{
            position: "relative", zIndex: 4, width: "100%",
            maxWidth: "1440px", margin: "0 auto",
            padding: "0 clamp(16px,5vw,40px)",
            paddingTop: "clamp(76px,12vh,108px)",
          }}>
            <div
              style={{ width: "100%", maxWidth: "880px", margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: "clamp(20px,3.5vw,36px)" }}
            >

              {/* ── Headline group (parallax: moves up slowly) ── */}
              <div
                className="hero-sticky-text"
                data-parallax="-0.18"
                style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}
              >
                <h1
                  className="animate-fade-up delay-200 text-balance"
                  style={{
                    fontSize: "clamp(42px,6.5vw,102px)",
                    lineHeight: 0.98, fontStyle: "italic", fontWeight: 300,
                    marginBottom: 0, color: heroText, textAlign: "center", width: "100%",
                    textShadow: "0 2px 32px rgba(0,0,0,0.45)",
                  }}
                >
                  Reconectar-se<br />não é voltar.<br />
                  <span style={{
                    background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-soft) 60%, var(--gold) 100%)",
                    backgroundSize: "200% auto",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    display: "inline",
                  }}>
                    É encontrar-se<br />pela primeira vez.
                  </span>
                </h1>
              </div>

              {/* ── Body group (parallax: standard) ── */}
              <div
                data-parallax="-0.14"
                style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}
              >
                <p
                  className="animate-fade-up delay-300"
                  style={{
                    fontSize: "clamp(15px,1.8vw,17px)", color: heroMuted,
                    maxWidth: "440px", lineHeight: 1.92, fontWeight: 300,
                    textAlign: "center", marginBottom: "clamp(24px,3.5vw,38px)",
                  }}
                >
                  Uma jornada de autoconhecimento feminina, clara e acolhedora, para quem quer voltar a sentir presença, direção e verdade.
                </p>

                <div className="animate-fade-up delay-400" style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%", maxWidth: "360px", marginBottom: "clamp(18px,2.5vw,26px)" }}>
                  {/* CTA único do hero — leva à Bússola */}
                  <Link
                    to="/bussola"
                    className="btn-gold"
                    data-testid="cta-primario"
                    style={{ justifyContent: "center", minHeight: "58px", borderRadius: "18px" }}
                  >
                    Descobrir minha volta da espiral <ArrowRight size={15} />
                  </Link>
                </div>

                <div className="animate-fade-in delay-600" style={{ display: "flex", justifyContent: "center", gap: "clamp(10px,2vw,20px)", flexWrap: "wrap" }}>
                  {guarantees.map(({ icon: Icon, label }) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Icon size={11} style={{ color: "var(--gold-dim)" }} strokeWidth={1.5} />
                      <span className="font-label" style={{ fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)" }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Scroll cue */}
          <button
            onClick={() => scrollTo("section-1")}
            className="scroll-cue"
            aria-label="Rolar para próxima seção"
            style={{ background: "transparent", border: "none", cursor: "pointer", padding: "8px" }}
          >
            <div className="animate-float" style={{ width: "1px", height: "48px", background: "linear-gradient(to bottom, transparent, rgba(198,168,112,0.40), transparent)" }} />
            <span className="overline" style={{ fontSize: "7px", color: "rgba(198,168,112,0.35)", letterSpacing: "0.38em" }}>DESCER</span>
          </button>
        </section>

        {/* ══════════════════════════════════════
               VITRINE — jornadas disponíveis
            ══════════════════════════════════════ */}
        <section
          id="vitrine"
          style={{
            position: "relative",
            padding: "clamp(72px,10vw,128px) clamp(16px,5vw,24px)",
            background: "var(--surface-glass)",
            backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
            borderTop: "1px solid var(--border-subtle)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ maxWidth: 1180, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "clamp(40px,6vw,72px)" }}>
              <p className="overline reveal" style={{ color: "var(--gold)", marginBottom: "16px" }}>As jornadas</p>
              <h2 className="font-display text-balance reveal reveal-delay-1" style={{ fontSize: "clamp(30px,5.5vw,64px)", fontWeight: 300, fontStyle: "italic", lineHeight: 1.05, color: "var(--text-primary)" }}>
                Escolha por onde começar
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: "16px", justifyContent: "center", marginTop: "22px" }} aria-hidden="true">
                <div style={{ height: "1px", width: "44px", background: "var(--border-subtle)" }} />
                <span style={{ color: "var(--gold)", fontSize: "10px" }}>◆</span>
                <div style={{ height: "1px", width: "44px", background: "var(--border-subtle)" }} />
              </div>
            </div>
            <StorefrontGrid products={produtos} loading={carregando} />
          </div>
        </section>

        {/* ══════════════════════════════════════
               Ticker — transição entre hero e social proof
            ══════════════════════════════════════ */}
        <Ticker />

        {/* Secao "social proof" removida (18/08, pedido do dono): citacao
            anonima + numeros (280+/92%/4.8) eram prova social sem lastro. */}

        {/* ══════════════════════════════════════
               2 — MÉTODO (parallax spiral)
            ══════════════════════════════════════ */}
        <section id="section-1" className="cv-auto" style={{
          position: "relative", zIndex: 1, overflow: "hidden",
          padding: "clamp(72px,10vw,128px) clamp(16px,5vw,24px)",
          background: "var(--surface-glass)",
        }}>
          <div className="glow-gold" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} aria-hidden="true" />
          <div
            data-parallax="0.06"
            style={{ position: "absolute", left: "-24px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
            aria-hidden="true"
          >
            <SectionSpiral3D size={100} height={280} opacity={isLight ? 0.22 : 0.26} color={isLight ? "#8f6e28" : "#a07c34"} emissive="#5a3a0a" speed={0.00035} lightBg={isLight} />
          </div>
          <div style={{
            position: "relative", maxWidth: "1100px", margin: "0 auto",
            display: "grid", gap: "clamp(32px,5vw,72px)", alignItems: "start",
          }} className="grid lg:grid-cols-2">
            <div className="reveal-left">
              <p className="overline" style={{ color: "var(--gold)", marginBottom: "18px" }}>O Método Espiral</p>
              <h2 className="text-balance" style={{
                fontSize: "clamp(28px,5vw,60px)", lineHeight: 1.05,
                fontWeight: 300, marginBottom: "20px", color: "var(--text-primary)",
              }}>
                A espiral como metáfora do seu caminho interior
              </h2>
              <p style={{ fontSize: "clamp(14px,1.6vw,16px)", color: "var(--text-secondary)", lineHeight: 1.92, marginBottom: "32px" }}>
                Cada volta representa um nível mais profundo de consciência. Não é linearidade — é aprofundamento. Você volta ao mesmo ponto, mas sempre mais inteira.
              </p>
              <Link
                to="/checkout/mulher-espiral"
                className="btn-outline-gold"
                onMouseEnter={prefetchCheckout}
                onFocus={prefetchCheckout}
              >
                Conhecer o método <ArrowUpRight size={13} />
              </Link>
            </div>
            <div className="reveal-right">
              {steps.map((step, i) => (
                <div key={step.num} style={{
                  display: "flex", gap: "clamp(14px,3vw,22px)",
                  padding: "clamp(16px,2.5vw,24px) 0",
                  borderBottom: i < steps.length - 1 ? "1px solid var(--border-subtle)" : "none",
                }}>
                  <span className="font-display" style={{ fontSize: "clamp(28px,3.5vw,40px)", color: "var(--border-mid)", lineHeight: 1, fontWeight: 300, width: "clamp(36px,4vw,48px)", flexShrink: 0 }}>{step.num}</span>
                  <div>
                    <h3 className="font-label" style={{ fontSize: "9px", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--gold)", marginBottom: "7px" }}>{step.title}</h3>
                    <p style={{ fontSize: "clamp(13px,1.5vw,15px)", color: "var(--text-secondary)", lineHeight: 1.88 }}>{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
               3 — PRODUTO (clip diagonal top)
            ══════════════════════════════════════ */}
        <section id="section-2" className="cv-auto" style={{
          position: "relative", zIndex: 1, overflow: "hidden",
          padding: "clamp(72px,10vw,128px) clamp(16px,5vw,24px)",
          background: "#060810",
        }}>
          <Orb color="rgba(172,128,142,0.10)" x="30%" y="50%" size="600px" blur="120px" opacity={0.8} />
          <Orb color="rgba(198,168,112,0.08)" x="75%" y="35%" size="500px" blur="100px" opacity={0.7} />

          <div data-parallax="0.05" style={{ position: "absolute", right: "-16px", bottom: "-36px", pointerEvents: "none" }} aria-hidden="true">
            <SectionSpiral3D size={100} height={280} opacity={0.10} color="#c6a870" emissive="#3a1c08" speed={0.00026} />
          </div>

          <div style={{ position: "relative", maxWidth: "1100px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "clamp(36px,6vw,72px)" }}>
              <p className="overline reveal" style={{ color: "#c99aaa", marginBottom: "16px" }}>Jornadas</p>
              <h2 className="font-display text-balance reveal reveal-delay-1" style={{
                fontSize: "clamp(30px,5.5vw,72px)", fontWeight: 300, fontStyle: "italic", color: "#f5f0e8",
              }}>
                Escolha o caminho que ressoa com você
              </h2>
            </div>

            {/* Product card */}
            <div className="reveal reveal-delay-1 product-card-glow" style={{
              overflow: "hidden", borderRadius: "clamp(16px,2vw,24px)",
              border: "1px solid rgba(198,168,112,0.15)", marginBottom: "24px",
              background: "#0e1023",
              transition: "box-shadow 0.35s ease",
            }}>
              <div className="grid lg:grid-cols-2" style={{ minHeight: "clamp(300px,50vw,440px)" }}>
                {/* Image */}
                <div style={{ position: "relative", overflow: "hidden", background: "linear-gradient(135deg, #0b0d1c 0%, #180d18 100%)", minHeight: "clamp(260px,40vw,440px)" }}>
                  <img src={mulherEspiralHero} alt="Mulher Espiral" loading="lazy" decoding="async" width={1376} height={768}
                    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 22%", display: "block", position: "absolute", inset: 0, opacity: 0.95 }} />
                  <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 90% 90% at 50% 100%, rgba(198,168,112,0.18) 0%, transparent 60%)", zIndex: 1 }} />
                  <div aria-hidden="true" className="hidden lg:block" style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, transparent 50%, #0e1023 100%)", zIndex: 2 }} />
                  <div aria-hidden="true" className="lg:hidden" style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #0e1023 0%, transparent 50%)", zIndex: 2 }} />
                </div>

                {/* Info */}
                <div style={{ padding: "clamp(24px,4vw,52px) clamp(20px,4vw,44px)", display: "flex", flexDirection: "column", justifyContent: "center", position: "relative", zIndex: 3 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "18px", flexWrap: "wrap" }}>
                    <span className="badge-rose">Programa Principal</span>
                    <span className="badge-gold">8 módulos</span>
                  </div>
                  <h3 className="font-display" style={{ fontSize: "clamp(28px,4.5vw,62px)", fontWeight: 300, lineHeight: 1.05, color: "#f5f0e8", marginBottom: "8px" }}>Mulher Espiral</h3>
                  <p className="font-label" style={{ fontSize: "9px", color: "#c99aaa", letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: "18px" }}>Método de Reconexão e Cura</p>
                  <p style={{ fontSize: "clamp(13px,1.5vw,15px)", color: "rgba(245,240,232,0.60)", lineHeight: 1.90, marginBottom: "clamp(16px,2.5vw,24px)" }}>
                    Uma jornada guiada em 8 módulos com aulas, práticas e integrações para aprofundar autoconhecimento com ritmo sustentável.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "clamp(20px,3vw,28px)" }}>
                    {["Acesso vitalício ao conteúdo","Comunidade exclusiva de alunas","Certificado de conclusão","Suporte humanizado"].map((f) => (
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
                        <p className="font-display" style={{ fontSize: "clamp(32px,4vw,46px)", color: "#c6a870", fontWeight: 300, lineHeight: 1 }}>R$ 997</p>
                        <p style={{ fontSize: "13px", color: "rgba(245,240,232,0.28)", textDecoration: "line-through" }}>R$ 1.997</p>
                      </div>
                      <p className="font-label" style={{ fontSize: "9px", color: "rgba(140,170,150,0.78)", letterSpacing: "0.12em", marginTop: "4px" }}>ou 12× de R$ 97,10</p>
                    </div>
                    <Link
                      to="/checkout/mulher-espiral"
                      className="btn-gold"
                      onMouseEnter={prefetchCheckout}
                      onFocus={prefetchCheckout}
                    >
                      Quero começar <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Guarantees bar */}
            <div className="reveal reveal-delay-2" style={{
              display: "flex", justifyContent: "center",
              gap: "clamp(14px,3vw,36px)", padding: "clamp(16px,3vw,24px)",
              borderRadius: "clamp(14px,2vw,18px)",
              background: "rgba(198,168,112,0.04)", border: "1px solid rgba(198,168,112,0.10)",
              flexWrap: "wrap",
            }}>
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

        {/* ══════════════════════════════════════
               4 — DEPOIMENTOS
            ══════════════════════════════════════ */}
        {/* Secao de depoimentos removida (18/08, pedido do dono): as citacoes
            eram personagens ficticias ("Lua Crescente" etc.), nao clientes. */}

        {/* ══════════════════════════════════════
               QUIZ DIAGNÓSTICO
            ══════════════════════════════════════ */}
        <div id="section-3"><QuizSection /></div>

        {/* ══════════════════════════════════════
               6 — COMUNIDADE
            ══════════════════════════════════════ */}
        <section id="section-4" className="cv-auto" style={{
          position: "relative", zIndex: 1, overflow: "hidden",
          padding: "clamp(80px,12vw,140px) clamp(16px,5vw,24px)",
          background: "rgba(6,5,15,0.90)",
        }}>
          {/* Atmospheric layers */}
          <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 90% 70% at 50% 0%, rgba(81,72,152,0.22) 0%, transparent 60%)", pointerEvents: "none" }} />
          <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 55% at 10% 60%, rgba(172,128,142,0.12) 0%, transparent 55%)", pointerEvents: "none" }} />
          <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 50% 45% at 90% 40%, rgba(81,72,152,0.14) 0%, transparent 55%)", pointerEvents: "none" }} />
          <div aria-hidden="true" style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg, transparent, rgba(81,72,152,0.40) 30%, rgba(198,168,112,0.20) 50%, rgba(81,72,152,0.40) 70%, transparent)" }} />
          <div aria-hidden="true" style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg, transparent, rgba(81,72,152,0.30) 50%, transparent)" }} />

          <div data-parallax="0.05" style={{ position: "absolute", right: "-20px", top: "8%", pointerEvents: "none" }} aria-hidden="true">
            <SectionSpiral3D size={110} height={300} opacity={0.18} color="#514898" emissive="#201860" speed={0.00028} />
          </div>

          <div style={{ position: "relative", maxWidth: "1160px", margin: "0 auto" }}>
            {/* Header */}
            <div className="reveal" style={{ textAlign: "center", marginBottom: "clamp(48px,7vw,80px)" }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: "10px", marginBottom: "24px",
                background: "rgba(81,72,152,0.18)", border: "1px solid rgba(81,72,152,0.40)",
                borderRadius: "100px", padding: "8px 20px 8px 12px",
              }}>
                <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: "8px", height: "8px" }}>
                  <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#8caa96", animation: "communityPulse 2s ease-out infinite", opacity: 0.6 }} />
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#8caa96", display: "block" }} />
                </span>
                <span style={{ fontSize: "9px", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(164,158,208,0.90)", fontFamily: "Montserrat,sans-serif", fontWeight: 500 }}>
                  Comunidade exclusiva de alunas
                </span>
              </div>
              <h2 className="font-display text-balance reveal-delay-1" style={{ fontSize: "clamp(36px,6.5vw,92px)", fontWeight: 300, fontStyle: "italic", lineHeight: 1.01, color: "#f5f0e8", marginBottom: "clamp(14px,2vw,20px)" }}>
                Ninguém desperta<br /><span style={{ color: "rgba(164,158,208,0.90)" }}>sozinha.</span>
              </h2>
              <p style={{ fontSize: "clamp(14px,1.7vw,17px)", color: "rgba(245,240,232,0.52)", maxWidth: "540px", margin: "0 auto", lineHeight: 1.90, fontWeight: 300 }}>
                Um espaço anônimo, seguro e vivo — onde mulheres em jornada se encontram, se apoiam e celebram juntas.
              </p>
            </div>

            {/* Two-column */}
            <div className="grid lg:grid-cols-[0.9fr_1.1fr]" style={{ gap: "clamp(28px,5vw,64px)", alignItems: "start" }}>
              <div className="reveal-left">
                <p style={{ fontSize: "9px", letterSpacing: "0.26em", textTransform: "uppercase", color: "rgba(164,158,208,0.65)", fontFamily: "Montserrat,sans-serif", fontWeight: 500, marginBottom: "20px" }}>Espaço exclusivo para alunas</p>
                <h3 style={{ fontSize: "clamp(22px,3.5vw,44px)", fontWeight: 300, lineHeight: 1.13, color: "#f5f0e8", marginBottom: "20px", fontFamily: "Cormorant Garamond,serif" }}>
                  Um lugar onde você pode ser<span style={{ fontStyle: "italic", color: "rgba(164,158,208,0.85)" }}> quem realmente é.</span>
                </h3>
                <p style={{ fontSize: "clamp(13px,1.5vw,15px)", color: "rgba(245,240,232,0.50)", lineHeight: 1.92, marginBottom: "clamp(24px,4vw,36px)" }}>
                  Um fórum anônimo com 5 categorias: conquistas, desabafos, dúvidas, dicas e celebrações. Seu nome real nunca aparece — só o seu ser.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "clamp(28px,4vw,40px)" }}>
                  {[
                    { color: "#8caa96", label: "Anonimato total", desc: "Nome real nunca exposto" },
                    { color: "rgba(164,158,208,0.85)", label: "5 categorias temáticas", desc: "Conquistas · Desabafo · Dicas · Dúvidas · Geral" },
                    { color: "#c6a870", label: "Moderação cuidadosa", desc: "Espaço seguro e respeitoso" },
                    { color: "#c99aaa", label: "Sempre ativo", desc: "Comunidade 24h por dia" },
                  ].map(({ color, label, desc }) => (
                    <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                      <div style={{ width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0, background: `${color}18`, border: `1px solid ${color}45`, display: "flex", alignItems: "center", justifyContent: "center", marginTop: "1px" }}>
                        <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: color }} />
                      </div>
                      <div>
                        <p style={{ fontSize: "13px", color: "rgba(245,240,232,0.80)", fontWeight: 500, marginBottom: "2px", fontFamily: "Montserrat,sans-serif" }}>{label}</p>
                        <p style={{ fontSize: "11px", color: "rgba(245,240,232,0.35)", fontFamily: "Montserrat,sans-serif" }}>{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Link
                  to="/checkout/mulher-espiral"
                  className="btn-gold"
                  style={{ fontSize: "10px" }}
                  onMouseEnter={prefetchCheckout}
                  onFocus={prefetchCheckout}
                >
                  Entrar para a comunidade <ArrowRight size={14} />
                </Link>
              </div>

              {/* Convite (o "feed ao vivo" com posts ficticios saiu — 18/08) */}
              <div className="reveal-right" style={{ display: "flex", flexDirection: "column", gap: "10px", justifyContent: "center" }}>
                <div style={{ borderRadius: "clamp(12px,1.5vw,16px)", border: "1px dashed rgba(81,72,152,0.35)", padding: "clamp(28px,4vw,44px)", textAlign: "center", background: "rgba(81,72,152,0.05)" }}>
                  <p style={{ fontSize: "clamp(13px,1.4vw,14px)", color: "rgba(245,240,232,0.40)", fontFamily: "Montserrat,sans-serif", marginBottom: "12px", lineHeight: 1.6 }}>
                    Sua voz também pertence aqui.
                  </p>
                  <Link
                    to="/checkout/mulher-espiral"
                    style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "10px", color: "rgba(164,158,208,0.90)", letterSpacing: "0.18em", textTransform: "uppercase", fontFamily: "Montserrat,sans-serif", fontWeight: 500, textDecoration: "none" }}
                    onMouseEnter={prefetchCheckout}
                    onFocus={prefetchCheckout}
                  >
                    Fazer parte da comunidade <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
               7 — SUNYAN
            ══════════════════════════════════════ */}
        <section id="section-5" className="cv-auto" style={{
          position: "relative", zIndex: 1, overflow: "hidden",
          padding: "clamp(72px,10vw,128px) clamp(16px,5vw,24px)",
          background: "var(--surface-glass)",
        }}>
          <div className="glow-gold" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} aria-hidden="true" />
          <div style={{ position: "relative", maxWidth: "1060px", margin: "0 auto", display: "grid", gap: "clamp(32px,5vw,72px)", alignItems: "center" }} className="grid md:grid-cols-2">
            <div className="reveal-left" style={{ position: "relative", display: "flex", justifyContent: "center" }}>
              <div style={{ position: "relative", width: "clamp(200px,30vw,360px)", aspectRatio: "3/4", borderRadius: "clamp(18px,2.5vw,26px)", overflow: "hidden", border: "1px solid var(--border-soft)", boxShadow: "var(--shadow-lg)", flexShrink: 0 }}>
                <img src={sunyanPortrait} alt="Sunyan Nunes — Criadora do Método Espiral" loading="lazy" decoding="async" width="360" height="480"
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
              <h2 style={{ fontSize: "clamp(26px,4.5vw,54px)", fontWeight: 300, lineHeight: 1.1, marginBottom: "18px", color: "var(--text-primary)" }}>Sunyan Nunes</h2>
              <p style={{ fontSize: "clamp(14px,1.6vw,16px)", color: "var(--text-secondary)", lineHeight: 1.92, marginBottom: "16px" }}>
                Terapeuta, facilitadora e criadora do Método Espiral. Por mais de 8 anos acompanha mulheres no processo de reencontro com sua essência — uma abordagem que une profundidade emocional, sabedoria do corpo e espiritualidade prática.
              </p>
              <p style={{ fontSize: "clamp(13px,1.5vw,15px)", color: "var(--text-muted)", lineHeight: 1.92, fontStyle: "italic", marginBottom: "clamp(20px,3vw,32px)" }}>
                "Não sou guru. Sou uma companheira de jornada que já percorreu o caminho e voltou para te mostrar que é possível."
              </p>
              <Link
                to="/checkout/mulher-espiral"
                className="btn-gold"
                onMouseEnter={prefetchCheckout}
                onFocus={prefetchCheckout}
              >
                Quero aprender com Sunyan <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
               8 — FAQ
            ══════════════════════════════════════ */}
        <section id="section-6" className="cv-auto" style={{
          position: "relative", zIndex: 1, overflow: "hidden",
          padding: "clamp(72px,10vw,128px) clamp(16px,5vw,24px)",
          background: "var(--surface-glass-2)",
        }}>
          <div style={{ position: "relative", maxWidth: "720px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "clamp(36px,6vw,56px)" }}>
              <p className="overline reveal" style={{ color: "var(--gold)", marginBottom: "16px" }}>Dúvidas frequentes</p>
              <h2 className="font-display text-balance reveal reveal-delay-1" style={{ fontSize: "clamp(28px,5vw,60px)", fontWeight: 300, color: "var(--text-primary)" }}>
                O que você precisa saber
              </h2>
            </div>
            <div className="reveal reveal-delay-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
              {faqs.map((faq, i) => <FaqItem key={i} q={faq.q} a={faq.a} />)}
            </div>
            <div className="reveal reveal-delay-3" style={{ textAlign: "center", marginTop: "clamp(28px,4vw,44px)" }}>
              <p style={{ fontSize: "clamp(13px,1.5vw,15px)", color: "var(--text-muted)", marginBottom: "20px" }}>
                Ainda tem dúvidas? Fale com a gente.
              </p>
              <a
                href="mailto:contato@despertarespiral.com"
                className="btn-outline-gold"
                rel="noopener noreferrer"
                style={{ display: "inline-flex" }}
              >
                contato@despertarespiral.com
              </a>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
               9 — CTA FINAL
            ══════════════════════════════════════ */}
        <section id="section-7" className="cv-auto" style={{
          position: "relative", zIndex: 1, overflow: "hidden",
          padding: "clamp(100px,14vw,180px) clamp(16px,5vw,24px)",
          textAlign: "center",
          background: isLight ? "var(--bg-surface-3)" : "#060810",
        }}>
          <div data-parallax="-0.04" style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none" }} aria-hidden="true">
            <SectionSpiral3D size={160} height={430} opacity={isLight ? 0.10 : 0.14} color={isLight ? "#8f6e28" : "#c6a870"} emissive="#3a1c08" speed={0.00024} withRings lightBg={isLight} />
          </div>
          <Orb color={isLight ? "rgba(122,94,30,0.09)" : "rgba(198,168,112,0.12)"} x="50%" y="50%" size="800px" blur="160px" opacity={0.8} />

          <div style={{ position: "relative", maxWidth: "680px", margin: "0 auto" }}>
            <p className="overline reveal reveal-delay-1" style={{ color: "var(--gold)", marginBottom: "20px", letterSpacing: "0.32em" }}>
              Você chegou até aqui por um motivo
            </p>
            <h2 className="font-display text-balance reveal reveal-delay-2" style={{ fontSize: "clamp(34px,6.5vw,86px)", fontWeight: 300, fontStyle: "italic", lineHeight: 1.03, marginBottom: "22px", color: "var(--text-primary)" }}>
              Algo dentro de você reconhece esse chamado.
            </h2>
            <p className="reveal reveal-delay-3" style={{ fontSize: "clamp(14px,1.8vw,17px)", color: "var(--text-secondary)", lineHeight: 1.88, marginBottom: "clamp(32px,5vw,52px)" }}>
              Não é coincidência. É reconhecimento.
            </p>
            <div className="reveal reveal-delay-4" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
              <Link
                to="/checkout/mulher-espiral"
                className="btn-gold"
                style={{ padding: "17px clamp(32px,5vw,60px)", fontSize: "10px", width: "100%", maxWidth: "440px", justifyContent: "center" }}
                onMouseEnter={prefetchCheckout}
                onFocus={prefetchCheckout}
              >
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

        {/* ══════════════════════════════════════
               FOOTER
            ══════════════════════════════════════ */}
        <footer style={{
          position: "relative", zIndex: 1,
          padding: "clamp(36px,6vw,60px) clamp(16px,5vw,24px)",
          background: isLight ? "var(--bg-surface-3)" : "#060810",
          borderTop: "1px solid var(--border-subtle)",
        }}>
          <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "clamp(16px,3vw,28px)" }}>
              <div>
                <p className="font-label" style={{ fontSize: "11px", letterSpacing: "0.32em", textTransform: "uppercase", color: "var(--gold)", fontWeight: 500, marginBottom: "5px" }}>DESPERTAR ESPIRAL</p>
                <p className="font-label" style={{ fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-faint)" }}>por Sunyan Nunes</p>
              </div>
              <nav aria-label="Footer navigation" style={{ display: "flex", gap: "clamp(14px,2.5vw,24px)", flexWrap: "wrap" }}>
                {[
                  ["Método", "#section-2"],
                  ["Jornadas", "#section-3"],
                  ["Comunidade", "#section-6"],
                  ["Privacidade", "/privacidade"],
                  ["Termos", "/termos"],
                  ["Entrar", "/login"],
                ].map(([label, href]) =>
                  href.startsWith("#") ? (
                    <a
                      key={label}
                      href={href}
                      className="font-label"
                      style={{ fontSize: "9px", letterSpacing: "0.20em", textTransform: "uppercase", color: "var(--text-muted)", textDecoration: "none", transition: "color 0.2s", minHeight: "44px", display: "inline-flex", alignItems: "center" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gold)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                    >{label}</a>
                  ) : (
                    <Link
                      key={label}
                      to={href}
                      className="font-label"
                      style={{ fontSize: "9px", letterSpacing: "0.20em", textTransform: "uppercase", color: "var(--text-muted)", textDecoration: "none", transition: "color 0.2s", minHeight: "44px", display: "inline-flex", alignItems: "center" }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.color = "var(--gold)";
                        if (href === "/login") prefetchLogin();
                      }}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-muted)")}
                    >{label}</Link>
                  )
                )}
              </nav>
              <p className="font-label" style={{ fontSize: "9px", color: "var(--text-faint)", letterSpacing: "0.12em" }}>contato@despertarespiral.com</p>
            </div>
            <hr className="divider-gold" style={{ margin: "clamp(24px,4vw,40px) 0 clamp(20px,3vw,28px)" }} />
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
              <p className="font-label" style={{ fontSize: "8px", color: "var(--text-faint)", letterSpacing: "0.18em", textTransform: "uppercase" }}>
                © {new Date().getFullYear()} Despertar Espiral — Todos os direitos reservados.
              </p>
              <p className="font-label" style={{ fontSize: "8px", color: "var(--text-faint)", letterSpacing: "0.14em" }}>
                CNPJ · Sunyan Nunes · São Paulo, Brasil
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
