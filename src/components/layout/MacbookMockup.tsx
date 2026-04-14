/**
 * MacbookMockup — MacBook Pro photo with embedded platform UI.
 *
 * Technique: The MacBook image is 1440×900px (16:10 ratio).
 * Screen area in original pixels: left=184 top=28 right=1256 bottom=578
 *   → left   = 184/1440 = 12.78%
 *   → top    = 28/900   = 3.11%
 *   → width  = (1256-184)/1440 = 74.44%
 *   → height = (578-28)/900    = 61.11%
 *
 * The overlay div uses these % values so it scales perfectly with the image
 * at any container width. overflow:hidden + borderRadius clip the UI flush.
 *
 * Boot animation: IntersectionObserver → screen fade-in + 120ms stagger.
 * Parallax tilt: desktop only, throttled to rAF.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import macbookPhoto from "@/assets/macbook-mockup.png";
import sunyanPortrait from "@/assets/sunyan-portrait.jpg";

/* ─────────────────────────────────────────────────────────
   DEV CALIBRATION MODE
   Toggle with the floating button bottom-right of the mockup.
   Copy the printed values into the SCREEN constant and remove
   the entire CALIBRATION block before shipping to production.
───────────────────────────────────────────────────────── */
const CALIBRATION_ENABLED = true; // ← set false to hide controls

/* ── Animated typing ─────────────────────────────────────── */
const LESSONS = [
  "O Corpo como Sabedoria",
  "Reconhecendo Padrões",
  "A Voz Interior",
  "Integração Somática",
];

function useTypingCycle() {
  const [idx, setIdx]     = useState(0);
  const [text, setText]   = useState("");
  const [phase, setPhase] = useState<"typing"|"hold"|"erasing">("typing");

  useEffect(() => {
    const target = LESSONS[idx];
    let t: ReturnType<typeof setTimeout>;
    if (phase === "typing") {
      if (text.length < target.length)
        t = setTimeout(() => setText(target.slice(0, text.length + 1)), 52);
      else t = setTimeout(() => setPhase("hold"), 2000);
    } else if (phase === "hold") {
      t = setTimeout(() => setPhase("erasing"), 100);
    } else {
      if (text.length > 0)
        t = setTimeout(() => setText(text.slice(0, -1)), 28);
      else { setIdx(i => (i + 1) % LESSONS.length); setPhase("typing"); }
    }
    return () => clearTimeout(t);
  }, [text, phase, idx]);

  return text;
}

/* ── Animated progress bar ───────────────────────────────── */
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

/* ── Stagger helper ──────────────────────────────────────── */
function bootStyle(booted: boolean, delay: number, extra?: React.CSSProperties): React.CSSProperties {
  return {
    opacity: booted ? 1 : 0,
    transform: booted ? "translateY(0)" : "translateY(4px)",
    transition: `opacity 0.45s ease ${delay}ms, transform 0.45s ease ${delay}ms`,
    ...extra,
  };
}

/* ──────────────────────────────────────────────────────────
   Screen area calibration (% of image dimensions)
   Measure from the actual macbook-mockup.png pixel boundaries:
     left  edge of white screen  → x_left  / img_width
     top   edge of white screen  → y_top   / img_height
     right edge of white screen  → x_right / img_width  → width = right - left
     bot.  edge of white screen  → y_bot   / img_height → height = bot - top
────────────────────────────────────────────────────────── */
/*
  SCREEN calibration for macbook-mockup.png
  The photo has the MacBook centered on a pure-black bg.
  Measured by overlaying a grid on the 800×500 reference render:
    screen left  ≈ 105px / 800px = 13.1%
    screen top   ≈  17px / 500px =  3.4%
    screen right ≈ 695px / 800px → width = 695-105 = 590 → 73.8%
    screen bot   ≈ 323px / 500px → height= 323-17  = 306 → 61.2%
*/
const SCREEN = {
  left:   "13.1%",
  top:    "3.4%",
  width:  "73.8%",
  height: "61.2%",
  radius: "2px 2px 0 0",
} as const;

/* ───────────────────────────────────────────────────────── */

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

/* ── Calibration panel ─────────────────────────────────── */
function CalibrationPanel({
  left, top, width, height,
  onChange,
}: {
  left: number; top: number; width: number; height: number;
  onChange: (k: "left" | "top" | "width" | "height", v: number) => void;
}) {
  const fields: { key: "left" | "top" | "width" | "height"; label: string; min: number; max: number }[] = [
    { key: "left",   label: "Left",   min: 0, max: 30 },
    { key: "top",    label: "Top",    min: 0, max: 20 },
    { key: "width",  label: "Width",  min: 50, max: 100 },
    { key: "height", label: "Height", min: 40, max: 90 },
  ];
  const val = { left, top, width, height };

  return (
    <div style={{
      position: "absolute", bottom: "calc(100% + 8px)", left: "50%",
      transform: "translateX(-50%)",
      background: "rgba(7,9,21,0.96)",
      border: "1px solid rgba(198,168,112,0.35)",
      borderRadius: "8px",
      padding: "14px 16px",
      zIndex: 9999,
      minWidth: "280px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.70)",
      backdropFilter: "blur(12px)",
      pointerEvents: "all",
    }}>
      <p style={{ fontSize: "10px", color: "#c6a870", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "12px", fontWeight: 600 }}>
        🎯 Screen Calibration
      </p>

      {fields.map(({ key, label, min, max }) => (
        <div key={key} style={{ marginBottom: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <label style={{ fontSize: "10px", color: "rgba(245,240,232,0.70)", fontWeight: 500 }}>{label}</label>
            <span style={{
              fontSize: "10px", color: "#c6a870", fontWeight: 700,
              background: "rgba(198,168,112,0.10)", borderRadius: "4px",
              padding: "1px 5px", fontVariantNumeric: "tabular-nums",
            }}>
              {val[key].toFixed(1)}%
            </span>
          </div>
          <input
            type="range"
            min={min} max={max} step={0.1}
            value={val[key]}
            onChange={e => onChange(key, parseFloat(e.target.value))}
            style={{ width: "100%", accentColor: "#c6a870", cursor: "pointer" }}
          />
        </div>
      ))}

      {/* Copy values */}
      <div style={{
        marginTop: "12px",
        background: "rgba(198,168,112,0.06)",
        border: "1px solid rgba(198,168,112,0.18)",
        borderRadius: "6px",
        padding: "8px 10px",
      }}>
        <p style={{ fontSize: "9px", color: "rgba(198,168,112,0.55)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.12em" }}>Copie para SCREEN:</p>
        <pre style={{ fontSize: "9px", color: "#c6a870", margin: 0, lineHeight: 1.6, fontFamily: "monospace" }}>
{`left:   "${left.toFixed(1)}%",
top:    "${top.toFixed(1)}%",
width:  "${width.toFixed(1)}%",
height: "${height.toFixed(1)}%",`}
        </pre>
      </div>
    </div>
  );
}

/* ── Grid 10×10 overlay ─────────────────────────────────── */
function CalibrationGrid() {
  const lines = Array.from({ length: 9 }, (_, i) => i + 1); // 9 inner lines = 10 cells
  return (
    <div style={{
      position: "absolute", inset: 0, pointerEvents: "none", zIndex: 50,
    }}>
      {/* Vertical lines */}
      {lines.map(i => (
        <div key={`v${i}`} style={{
          position: "absolute", top: 0, bottom: 0,
          left: `${i * 10}%`,
          width: "1px",
          background: i === 5 ? "rgba(198,168,112,0.60)" : "rgba(198,168,112,0.25)",
        }} />
      ))}
      {/* Horizontal lines */}
      {lines.map(i => (
        <div key={`h${i}`} style={{
          position: "absolute", left: 0, right: 0,
          top: `${i * 10}%`,
          height: "1px",
          background: i === 5 ? "rgba(198,168,112,0.60)" : "rgba(198,168,112,0.25)",
        }} />
      ))}
      {/* Percentage labels on axes */}
      {[10,20,30,40,50,60,70,80,90].map(p => (
        <span key={`xl${p}`} style={{
          position: "absolute", top: "1px", left: `${p}%`,
          transform: "translateX(-50%)",
          fontSize: "5px", color: "rgba(198,168,112,0.70)",
          fontFamily: "monospace", pointerEvents: "none",
          background: "rgba(0,0,0,0.4)", padding: "0 1px", borderRadius: "1px",
        }}>{p}</span>
      ))}
      {[10,20,30,40,50,60,70,80,90].map(p => (
        <span key={`yl${p}`} style={{
          position: "absolute", left: "1px", top: `${p}%`,
          transform: "translateY(-50%)",
          fontSize: "5px", color: "rgba(198,168,112,0.70)",
          fontFamily: "monospace", pointerEvents: "none",
          background: "rgba(0,0,0,0.4)", padding: "0 1px", borderRadius: "1px",
        }}>{p}</span>
      ))}
    </div>
  );
}

export default function MacbookMockup() {
  const wrapRef  = useRef<HTMLDivElement>(null);
  const [booted, setBooted] = useState(false);
  const lessonTitle = useTypingCycle();

  /* ── Calibration state ── */
  const [calOpen,  setCalOpen]  = useState(false);
  const [calLeft,   setCalLeft]  = useState(parseFloat(SCREEN.left));
  const [calTop,    setCalTop]   = useState(parseFloat(SCREEN.top));
  const [calWidth,  setCalWidth] = useState(parseFloat(SCREEN.width));
  const [calHeight, setCalHeight]= useState(parseFloat(SCREEN.height));

  const handleCalChange = (k: "left" | "top" | "width" | "height", v: number) => {
    if (k === "left")   setCalLeft(v);
    if (k === "top")    setCalTop(v);
    if (k === "width")  setCalWidth(v);
    if (k === "height") setCalHeight(v);
  };

  const liveScreen = CALIBRATION_ENABLED && calOpen
    ? { left: `${calLeft}%`, top: `${calTop}%`, width: `${calWidth}%`, height: `${calHeight}%`, radius: SCREEN.radius }
    : SCREEN;

  /* ── Boot trigger ── */
  const triggerBoot = useCallback(() => setBooted(true), []);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { triggerBoot(); io.disconnect(); } },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [triggerBoot]);

  /* ── Parallax tilt (desktop fine pointer only) ── */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || window.innerWidth < 1024) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    let raf = 0, cx = 0, cy = 0, tx = 0, ty = 0, lastMove = 0;
    const onMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastMove < 16) return;
      lastMove = now;
      const rect = (el.closest("section") ?? document.documentElement).getBoundingClientRect();
      cx = ((e.clientX - rect.left) / rect.width  - 0.5) * 2;
      cy = ((e.clientY - rect.top)  / rect.height - 0.5) * 2;
    };
    const onLeave = () => { cx = 0; cy = 0; };
    const frame = () => {
      tx += (cx * 1.8 - tx) * 0.035;
      ty += (cy * -1.2 - ty) * 0.035;
      const inner = el.querySelector<HTMLElement>(".macbook-inner");
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

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      className="macbook-wrapper"
      style={{ pointerEvents: "none", userSelect: "none", width: "100%" }}
    >
      <div style={{ perspective: "1600px", perspectiveOrigin: "50% 45%", width: "100%" }}>
        <div
          className="macbook-inner"
          style={{
            position: "relative",
            width: "100%",
            transformStyle: "preserve-3d",
            willChange: "transform",
            filter: "drop-shadow(0 28px 56px rgba(0,0,0,0.60)) drop-shadow(0 0 32px rgba(198,168,112,0.07))",
          }}
        >
          {/* ── Calibration grid (full image overlay) ── */}
          {CALIBRATION_ENABLED && calOpen && <CalibrationGrid />}

          {/* ── MacBook photo ── */}
          <img
            src={macbookPhoto}
            alt=""
            loading="eager"
            decoding="async"
            fetchPriority="high"
            style={{ width: "100%", height: "auto", display: "block" }}
          />

          {/* ── Screen overlay — embedded & clipped ── */}
          <div
            style={{
              position: "absolute",
              left:   liveScreen.left,
              top:    liveScreen.top,
              width:  liveScreen.width,
              height: liveScreen.height,
              zIndex: 2,
              overflow: "hidden",
              borderRadius: liveScreen.radius,
              outline: CALIBRATION_ENABLED && calOpen ? "1.5px dashed rgba(198,168,112,0.80)" : "none",
              background: "#07091580",
              opacity: booted ? 1 : 0,
              transition: "opacity 0.55s ease 60ms",
            }}
          >
            {/* ── Platform UI (scales with container) ── */}
            <div style={{
              display: "flex",
              width: "100%",
              height: "100%",
              fontFamily: "system-ui, -apple-system, sans-serif",
              background: "#070915",
            }}>

              {/* ── Sidebar ── */}
              <div style={bootStyle(booted, 80, {
                width: "22%", flexShrink: 0,
                background: "#0c0f22",
                borderRight: "1px solid rgba(198,168,112,0.08)",
                display: "flex", flexDirection: "column",
                padding: "6% 5% 5%", gap: "2px",
              })}>
                {/* Logo */}
                <div style={bootStyle(booted, 100, {
                  display: "flex", alignItems: "center", gap: "4px", paddingBottom: "8px",
                })}>
                  <svg width="9" height="9" viewBox="0 0 64 64" fill="none">
                    <path d="M32 58C14 58 6 46 6 32C6 18 17 8 30 8C42 8 51 17 51 29C51 39 44 47 34 47C26 47 20 40 20 32C20 25 25 20 32 20C38 20 42 25 42 30C42 35 38 39 34 39"
                      stroke="#c6a870" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                  <span style={{ fontSize: "4.5px", letterSpacing: "0.14em", color: "rgba(198,168,112,0.70)", fontWeight: 600, textTransform: "uppercase" }}>
                    Espiral
                  </span>
                </div>

                {SIDEBAR_ITEMS.map(({ label, active }, i) => (
                  <div key={label} style={bootStyle(booted, 160 + i * 100, {
                    padding: "3.5px 5px", borderRadius: "3px",
                    background: active ? "rgba(198,168,112,0.10)" : "transparent",
                    borderLeft: `1.5px solid ${active ? "#c6a870" : "transparent"}`,
                  })}>
                    <span style={{ fontSize: "4px", color: active ? "#c6a870" : "rgba(198,168,112,0.38)", fontWeight: active ? 600 : 400 }}>
                      {label}
                    </span>
                  </div>
                ))}

                <div style={{ flex: 1 }} />

                {/* User row */}
                <div style={bootStyle(booted, 680, {
                  display: "flex", alignItems: "center", gap: "4px",
                  paddingTop: "6px",
                  borderTop: "1px solid rgba(198,168,112,0.08)",
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
                    <span style={{ display: "block", fontSize: "3px",   color: "rgba(198,168,112,0.40)" }}>Admin</span>
                  </div>
                </div>
              </div>

              {/* ── Main content ── */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

                {/* Top bar */}
                <div style={bootStyle(booted, 180, {
                  height: "14px", flexShrink: 0,
                  borderBottom: "1px solid rgba(198,168,112,0.07)",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "0 6px",
                })}>
                  <span style={{ fontSize: "4px", color: "#c6a870", letterSpacing: "0.09em" }}>
                    Mulher Espiral — Módulo 3
                  </span>
                  <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                    <AnimatedProgress target={55} booted={booted} />
                    <span style={{ fontSize: "3px", color: "rgba(198,168,112,0.55)" }}>55%</span>
                  </div>
                </div>

                {/* ── Video player ── */}
                <div style={bootStyle(booted, 260, {
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
                      position: "absolute", inset: 0,
                      width: "100%", height: "100%",
                      objectFit: "cover", objectPosition: "50% 12%",
                      opacity: 0.82,
                      mixBlendMode: "luminosity",
                    }}
                  />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(7,9,21,0.88) 0%, transparent 55%)" }} />
                  <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 100% 80% at 50% 100%, rgba(198,168,112,0.10) 0%, transparent 65%)" }} />

                  {/* Play btn */}
                  <div style={{
                    position: "absolute", top: "50%", left: "50%",
                    transform: "translate(-50%, -52%)",
                    width: "13px", height: "13px", borderRadius: "50%",
                    background: "rgba(198,168,112,0.92)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 2px 10px rgba(198,168,112,0.50)",
                  }}>
                    <svg width="4" height="5" viewBox="0 0 8 10" fill="none">
                      <path d="M2 1.5L7 5L2 8.5V1.5Z" fill="#0b0d1c" />
                    </svg>
                  </div>

                  {/* Lesson meta */}
                  <div style={{
                    position: "absolute", bottom: "3px", left: "5px", right: "5px",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <span style={{ fontSize: "2.8px", color: "rgba(245,240,232,0.60)", letterSpacing: "0.07em", maxWidth: "70%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      Aula 08 — {lessonTitle}
                      <span style={{ borderRight: "1px solid rgba(198,168,112,0.7)", marginLeft: "1px", animation: "blink 1s steps(1) infinite" }} />
                    </span>
                    <span style={{ fontSize: "2.8px", color: "rgba(198,168,112,0.55)" }}>24:15</span>
                  </div>
                </div>

                {/* Lesson list header */}
                <div style={bootStyle(booted, 400, { padding: "4px 6px 2px", flexShrink: 0 })}>
                  <p style={{ fontSize: "3px", color: "rgba(198,168,112,0.45)", letterSpacing: "0.16em", textTransform: "uppercase" }}>
                    Conteúdo do módulo
                  </p>
                </div>

                {/* Lesson items */}
                <div style={{ flex: 1, overflow: "hidden", padding: "1px 6px 3px", display: "flex", flexDirection: "column", gap: "2px" }}>
                  {LESSONS_LIST.map(({ title, done, active }, i) => (
                    <div key={title} style={bootStyle(booted, 460 + i * 100, {
                      display: "flex", alignItems: "center", gap: "4px",
                      padding: "2px 3px", borderRadius: "3px",
                      background: active ? "rgba(198,168,112,0.07)" : "transparent",
                      borderLeft: `1.5px solid ${active ? "#c6a870" : "transparent"}`,
                    })}>
                      <div style={{
                        width: "5px", height: "5px", borderRadius: "50%", flexShrink: 0,
                        background: done ? "rgba(140,170,150,0.18)" : active ? "rgba(198,168,112,0.14)" : "rgba(198,168,112,0.05)",
                        border: `0.8px solid ${done ? "rgba(140,170,150,0.55)" : active ? "rgba(198,168,112,0.55)" : "rgba(198,168,112,0.14)"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {done && <span style={{ fontSize: "3px", color: "#8caa96", lineHeight: 1 }}>✓</span>}
                      </div>
                      <span style={{
                        fontSize: "3px",
                        color: done ? "rgba(140,170,150,0.65)" : active ? "#c6a870" : "rgba(245,240,232,0.35)",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {title}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Community strip */}
                <div style={bootStyle(booted, 1020, {
                  flexShrink: 0,
                  borderTop: "1px solid rgba(198,168,112,0.07)",
                  padding: "3px 6px",
                  display: "flex", alignItems: "center", gap: "5px",
                  background: "rgba(164,158,208,0.03)",
                })}>
                  <span style={{ fontSize: "2.8px", color: "rgba(164,158,208,0.60)", letterSpacing: "0.14em", textTransform: "uppercase" }}>Comunidade</span>
                  <div style={{ flex: 1, display: "flex", gap: "3px", overflow: "hidden" }}>
                    {["conquista","desabafo","dica"].map((cat, i) => (
                      <div key={i} style={{
                        display: "flex", alignItems: "center", gap: "2px",
                        padding: "1px 3px", borderRadius: "100px",
                        background: "rgba(164,158,208,0.08)",
                        border: "0.5px solid rgba(164,158,208,0.15)",
                      }}>
                        <div style={{ width: "2.5px", height: "2.5px", borderRadius: "50%", background: i === 0 ? "#8caa96" : i === 1 ? "#c99aaa" : "#c6a870", flexShrink: 0 }} />
                        <span style={{ fontSize: "2.8px", color: "rgba(245,240,232,0.40)" }}>{cat}</span>
                      </div>
                    ))}
                  </div>
                  <span style={{ fontSize: "2.8px", color: "rgba(198,168,112,0.40)", flexShrink: 0 }}>47 online</span>
                </div>
              </div>
            </div>

            {/* Screen glare */}
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10,
              background: "linear-gradient(130deg, rgba(255,255,255,0.04) 0%, transparent 28%)",
            }} />
          </div>
        </div>
      </div>

      {/* ── Calibration toggle button ── */}
      {CALIBRATION_ENABLED && (
        <div style={{ position: "relative", display: "flex", justifyContent: "center", marginTop: "6px" }}>
          {calOpen && (
            <CalibrationPanel
              left={calLeft} top={calTop} width={calWidth} height={calHeight}
              onChange={handleCalChange}
            />
          )}
          <button
            onClick={() => { setCalOpen(o => !o); setBooted(true); }}
            style={{
              pointerEvents: "all",
              fontSize: "10px",
              fontWeight: 600,
              color: calOpen ? "#070915" : "#c6a870",
              background: calOpen ? "#c6a870" : "rgba(198,168,112,0.12)",
              border: "1px solid rgba(198,168,112,0.40)",
              borderRadius: "100px",
              padding: "4px 12px",
              cursor: "pointer",
              letterSpacing: "0.10em",
              transition: "all 0.2s",
            }}
          >
            {calOpen ? "✕ Fechar calibração" : "⊞ Calibrar tela"}
          </button>
        </div>
      )}

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        .macbook-wrapper {
          max-width: min(92vw, 360px);
          margin: 0 auto;
        }
        @media (min-width: 480px) { .macbook-wrapper { max-width: 450px; } }
        @media (min-width: 640px) { .macbook-wrapper { max-width: 540px; } }
        @media (min-width: 1024px){ .macbook-wrapper { max-width: min(50vw, 740px); } }
        @media (min-width: 1280px){ .macbook-wrapper { max-width: min(48vw, 800px); } }
      `}</style>
    </div>
  );
}
