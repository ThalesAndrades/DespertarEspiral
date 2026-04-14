/**
 * MacbookMockup — Real MacBook Pro photo with platform UI overlay on screen.
 * Boot animation: IntersectionObserver triggers screen fade-in + 120ms stagger
 * on every UI element when MacBook enters the viewport.
 * Parallax mouse tilt on desktop (passive listeners, rAF).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import macbookPhoto from "@/assets/macbook-mockup.png";
import sunyanPortrait from "@/assets/sunyan-portrait.jpg";

/* ── Animated typing for the lesson title ──────────────────── */
const LESSONS = [
  "O Corpo como Sabedoria",
  "Reconhecendo Padrões",
  "A Voz Interior",
  "Integração Somática",
];

function useTypingCycle() {
  const [idx, setIdx]     = useState(0);
  const [text, setText]   = useState("");
  const [phase, setPhase] = useState<"typing" | "hold" | "erasing">("typing");

  useEffect(() => {
    const target = LESSONS[idx];
    let timer: ReturnType<typeof setTimeout>;

    if (phase === "typing") {
      if (text.length < target.length) {
        timer = setTimeout(() => setText(target.slice(0, text.length + 1)), 52);
      } else {
        timer = setTimeout(() => setPhase("hold"), 2000);
      }
    } else if (phase === "hold") {
      timer = setTimeout(() => setPhase("erasing"), 100);
    } else {
      if (text.length > 0) {
        timer = setTimeout(() => setText(text.slice(0, -1)), 28);
      } else {
        setIdx((i) => (i + 1) % LESSONS.length);
        setPhase("typing");
      }
    }
    return () => clearTimeout(timer);
  }, [text, phase, idx]);

  return text;
}

/* ── Progress bar animated on mount ───────────────────────── */
function AnimatedProgress({ target, booted }: { target: number; booted: boolean }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!booted) return;
    const t = setTimeout(() => setVal(target), 600);
    return () => clearTimeout(t);
  }, [target, booted]);
  return (
    <div style={{ width: "48px", height: "3px", borderRadius: "100px", background: "rgba(198,168,112,0.12)" }}>
      <div style={{ width: `${val}%`, height: "100%", borderRadius: "100px", background: "#c6a870", transition: "width 1.6s cubic-bezier(.16,1,.3,1)" }} />
    </div>
  );
}

/* ── Boot stagger helper ─────────────────────────────────── */
function bootStyle(booted: boolean, delay: number, extra?: React.CSSProperties): React.CSSProperties {
  return {
    opacity: booted ? 1 : 0,
    transform: booted ? "translateY(0)" : "translateY(4px)",
    transition: `opacity 0.45s ease ${delay}ms, transform 0.45s ease ${delay}ms`,
    ...extra,
  };
}

export default function MacbookMockup() {
  const wrapRef     = useRef<HTMLDivElement>(null);
  const [booted, setBooted] = useState(false);
  const lessonTitle = useTypingCycle();

  /* ── IntersectionObserver — trigger boot on viewport entry ── */
  const triggerBoot = useCallback(() => setBooted(true), []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { triggerBoot(); io.disconnect(); }
      },
      { threshold: 0.18 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [triggerBoot]);

  /* ── Parallax tilt ── */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || window.innerWidth < 1024) return;

    let raf = 0;
    let cx = 0, cy = 0;
    let tx = 0, ty = 0;

    const onMove = (e: MouseEvent) => {
      const rect = (el.closest("section") ?? document.documentElement).getBoundingClientRect();
      cx = ((e.clientX - rect.left) / rect.width  - 0.5) * 2;
      cy = ((e.clientY - rect.top)  / rect.height - 0.5) * 2;
    };
    const onLeave = () => { cx = 0; cy = 0; };

    const frame = () => {
      tx += (cx * 3  - tx) * 0.05;
      ty += (cy * -2 - ty) * 0.05;
      const inner = el.querySelector<HTMLElement>(".macbook-photo-inner");
      if (inner) inner.style.transform = `rotateY(${tx}deg) rotateX(${ty}deg)`;
      raf = requestAnimationFrame(frame);
    };

    const parent = el.closest("section") ?? document.documentElement;
    parent.addEventListener("mousemove", onMove as EventListener, { passive: true });
    parent.addEventListener("mouseleave", onLeave);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      parent.removeEventListener("mousemove", onMove as EventListener);
      parent.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  const SIDEBAR_ITEMS = [
    { label: "Dashboard",  active: false },
    { label: "Meu Curso",  active: true  },
    { label: "Comunidade", active: false },
    { label: "Progresso",  active: false },
  ];

  const LESSONS_LIST = [
    { title: "Introdução ao Módulo",   done: true,  active: false },
    { title: "Reconhecendo Padrões",   done: true,  active: false },
    { title: "A Voz do Corpo",         done: true,  active: false },
    { title: "O Corpo como Sabedoria", done: false, active: true  },
    { title: "Integração Somática",    done: false, active: false },
  ];

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      className="macbook-wrapper"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        userSelect: "none",
        width: "100%",
      }}
    >
      <div style={{ perspective: "1600px", perspectiveOrigin: "50% 45%", width: "100%" }}>
        <div
          className="macbook-photo-inner"
          style={{
            position: "relative",
            width: "100%",
            transformStyle: "preserve-3d",
            transform: "rotateY(0deg) rotateX(0deg)",
            transition: "transform 0.08s linear",
            willChange: "transform",
            filter: "drop-shadow(0 32px 64px rgba(0,0,0,0.55)) drop-shadow(0 0 40px rgba(198,168,112,0.08))",
          }}
        >
          {/* ── MacBook photo base ── */}
          <img
            src={macbookPhoto}
            alt=""
            loading="eager"
            decoding="async"
            fetchPriority="high"
            style={{
              width: "100%",
              height: "auto",
              display: "block",
              position: "relative",
              zIndex: 1,
            }}
          />

          {/*
            ── Screen UI overlay ──
            Calibrated for this specific MacBook image:
            Screen left  ≈ 15.2% of image width
            Screen top   ≈ 2.6%  of image height
            Screen right ≈ 84.8% → width ≈ 69.6%
            Screen bottom≈ 67.4% → height ≈ 64.8%
          */}
          <div
            style={{
              position: "absolute",
              left:   "15.2%",
              top:    "2.6%",
              width:  "69.6%",
              height: "64.8%",
              zIndex: 2,
              overflow: "hidden",
              borderRadius: "2px",
              /* Screen boots from black to platform */
              background: "#070915",
              opacity: booted ? 1 : 0,
              transition: "opacity 0.55s ease 60ms",
            }}
          >
            {/* ── Mini platform UI ── */}
            <div style={{ display: "flex", width: "100%", height: "100%", fontFamily: "system-ui, -apple-system, sans-serif" }}>

              {/* ── Sidebar ── */}
              <div style={bootStyle(booted, 80, {
                width: "22%", height: "100%", flexShrink: 0,
                background: "#0c0f22",
                borderRight: "1px solid rgba(198,168,112,0.07)",
                display: "flex", flexDirection: "column",
                padding: "8px 6px 8px", gap: "2px",
              })}>
                {/* Logo */}
                <div style={bootStyle(booted, 100, { display: "flex", alignItems: "center", gap: "4px", padding: "3px 5px 8px" })}>
                  <svg width="9" height="9" viewBox="0 0 64 64" fill="none" aria-hidden="true">
                    <path d="M32 58C14 58 6 46 6 32C6 18 17 8 30 8C42 8 51 17 51 29C51 39 44 47 34 47C26 47 20 40 20 32C20 25 25 20 32 20C38 20 42 25 42 30C42 35 38 39 34 39"
                      stroke="#c6a870" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                  <span style={{ fontSize: "4.5px", letterSpacing: "0.14em", color: "rgba(198,168,112,0.70)", fontWeight: 600, textTransform: "uppercase" }}>Espiral</span>
                </div>

                {SIDEBAR_ITEMS.map(({ label, active }, i) => (
                  <div key={label} style={bootStyle(booted, 160 + i * 120, {
                    padding: "4px 5px", borderRadius: "4px",
                    background: active ? "rgba(198,168,112,0.10)" : "transparent",
                    borderLeft: active ? "1.5px solid #c6a870" : "1.5px solid transparent",
                  })}>
                    <span style={{ fontSize: "4px", color: active ? "#c6a870" : "rgba(198,168,112,0.38)", fontWeight: active ? 600 : 400 }}>
                      {label}
                    </span>
                  </div>
                ))}

                <div style={{ flex: 1 }} />

                {/* User row */}
                <div style={bootStyle(booted, 700, {
                  display: "flex", alignItems: "center", gap: "4px",
                  padding: "5px 5px 0",
                  borderTop: "1px solid rgba(198,168,112,0.07)",
                })}>
                  <div style={{
                    width: "10px", height: "10px", borderRadius: "50%",
                    background: "rgba(198,168,112,0.15)",
                    border: "1px solid rgba(198,168,112,0.30)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <span style={{ fontSize: "4.5px", color: "#c6a870" }}>S</span>
                  </div>
                  <div>
                    <span style={{ display: "block", fontSize: "3.5px", color: "rgba(245,240,232,0.70)", lineHeight: 1.3 }}>Sunyan</span>
                    <span style={{ display: "block", fontSize: "3px", color: "rgba(198,168,112,0.40)" }}>Admin</span>
                  </div>
                </div>
              </div>

              {/* ── Main content ── */}
              <div style={{ flex: 1, height: "100%", background: "#070915", display: "flex", flexDirection: "column", overflow: "hidden" }}>

                {/* Top bar */}
                <div style={bootStyle(booted, 180, {
                  height: "18px", flexShrink: 0,
                  borderBottom: "1px solid rgba(198,168,112,0.07)",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "0 8px",
                })}>
                  <span style={{ fontSize: "4.5px", color: "#c6a870", letterSpacing: "0.09em" }}>
                    Mulher Espiral — Módulo 3
                  </span>
                  <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                    <AnimatedProgress target={55} booted={booted} />
                    <span style={{ fontSize: "3.5px", color: "rgba(198,168,112,0.55)" }}>55%</span>
                  </div>
                </div>

                {/* Video player area */}
                <div style={bootStyle(booted, 280, {
                  position: "relative",
                  width: "100%",
                  flexShrink: 0,
                  overflow: "hidden",
                  background: "#030508",
                  aspectRatio: "16/9",
                })}>
                  <img
                    src={sunyanPortrait}
                    alt=""
                    loading="eager"
                    decoding="async"
                    style={{
                      width: "100%", height: "100%",
                      objectFit: "cover", objectPosition: "50% 10%",
                      opacity: 0.78,
                      mixBlendMode: "luminosity",
                      display: "block",
                    }}
                  />
                  {/* Dark gradient */}
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(7,9,21,0.90) 0%, transparent 55%)" }} />
                  {/* Gold vignette */}
                  <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 100% 80% at 50% 100%, rgba(198,168,112,0.10) 0%, transparent 65%)" }} />

                  {/* Play button */}
                  <div style={{
                    position: "absolute", top: "50%", left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "16px", height: "16px", borderRadius: "50%",
                    background: "rgba(198,168,112,0.92)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 2px 10px rgba(198,168,112,0.50)",
                  }}>
                    <svg width="5" height="6" viewBox="0 0 8 10" fill="none" aria-hidden="true">
                      <path d="M2 1.5L7 5L2 8.5V1.5Z" fill="#0b0d1c" />
                    </svg>
                  </div>

                  {/* Lesson meta bar */}
                  <div style={{
                    position: "absolute", bottom: "4px", left: "5px", right: "5px",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <span style={{
                      fontSize: "3px", color: "rgba(245,240,232,0.60)",
                      letterSpacing: "0.07em", maxWidth: "70%",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      Aula 08 — {lessonTitle}<span style={{ borderRight: "1px solid rgba(198,168,112,0.7)", marginLeft: "1px", animation: "blink 1s steps(1) infinite" }} />
                    </span>
                    <span style={{ fontSize: "3px", color: "rgba(198,168,112,0.55)", flexShrink: 0 }}>24:15</span>
                  </div>
                </div>

                {/* Lesson list header */}
                <div style={bootStyle(booted, 420, {
                  padding: "5px 7px 2px",
                  flexShrink: 0,
                })}>
                  <p style={{ fontSize: "3.5px", color: "rgba(198,168,112,0.45)", letterSpacing: "0.16em", textTransform: "uppercase" }}>
                    Conteúdo do módulo
                  </p>
                </div>

                {/* Lesson list items — staggered */}
                <div style={{ flex: 1, overflow: "hidden", padding: "2px 7px 4px", display: "flex", flexDirection: "column", gap: "2px" }}>
                  {LESSONS_LIST.map(({ title, done, active }, i) => (
                    <div key={title} style={bootStyle(booted, 480 + i * 120, {
                      display: "flex", alignItems: "center", gap: "4px",
                      padding: "2.5px 4px", borderRadius: "3px",
                      background: active ? "rgba(198,168,112,0.07)" : "transparent",
                      borderLeft: active ? "1.5px solid #c6a870" : "1.5px solid transparent",
                    })}>
                      {/* Status dot */}
                      <div style={{
                        width: "6px", height: "6px", borderRadius: "50%", flexShrink: 0,
                        background: done
                          ? "rgba(140,170,150,0.18)"
                          : active
                            ? "rgba(198,168,112,0.14)"
                            : "rgba(198,168,112,0.05)",
                        border: `0.8px solid ${done ? "rgba(140,170,150,0.55)" : active ? "rgba(198,168,112,0.55)" : "rgba(198,168,112,0.14)"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {done && <span style={{ fontSize: "3.5px", color: "#8caa96", lineHeight: 1 }}>✓</span>}
                      </div>
                      <span style={{
                        fontSize: "3.5px",
                        color: done
                          ? "rgba(140,170,150,0.65)"
                          : active
                            ? "#c6a870"
                            : "rgba(245,240,232,0.35)",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {title}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Community pulse strip */}
                <div style={bootStyle(booted, 1080, {
                  flexShrink: 0,
                  borderTop: "1px solid rgba(198,168,112,0.07)",
                  padding: "4px 7px",
                  display: "flex", alignItems: "center", gap: "6px",
                  background: "rgba(164,158,208,0.04)",
                })}>
                  <span style={{ fontSize: "3px", color: "rgba(164,158,208,0.60)", letterSpacing: "0.14em", textTransform: "uppercase" }}>Comunidade</span>
                  <div style={{ flex: 1, display: "flex", gap: "4px", overflow: "hidden" }}>
                    {["conquista", "desabafo", "dica"].map((cat, i) => (
                      <div key={i} style={{
                        display: "flex", alignItems: "center", gap: "2px",
                        padding: "1.5px 4px", borderRadius: "100px",
                        background: "rgba(164,158,208,0.08)",
                        border: "0.5px solid rgba(164,158,208,0.15)",
                      }}>
                        <div style={{ width: "3px", height: "3px", borderRadius: "50%", background: i === 0 ? "#8caa96" : i === 1 ? "#c99aaa" : "#c6a870", flexShrink: 0 }} />
                        <span style={{ fontSize: "3px", color: "rgba(245,240,232,0.40)" }}>{cat}</span>
                      </div>
                    ))}
                  </div>
                  <span style={{ fontSize: "3px", color: "rgba(198,168,112,0.40)", flexShrink: 0 }}>47 online</span>
                </div>
              </div>
            </div>

            {/* Subtle screen glare */}
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(130deg, rgba(255,255,255,0.035) 0%, transparent 32%)",
              pointerEvents: "none",
              zIndex: 10,
            }} />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .macbook-wrapper {
          max-width: 340px;
          margin: 0 auto;
        }
        @media (min-width: 640px) {
          .macbook-wrapper {
            max-width: 420px;
          }
        }
        @media (min-width: 1024px) {
          .macbook-wrapper {
            max-width: 580px;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}
