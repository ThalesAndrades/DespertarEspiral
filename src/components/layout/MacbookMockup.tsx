/**
 * MacbookMockup — CSS 3D MacBook Pro with platform UI preview inside screen.
 * Parallax mouse tilt on desktop (passive listeners, rAF).
 * Shows a mini course player / dashboard UI inside the screen for conversion impact.
 */
import { useEffect, useRef } from "react";
import sunyanPortrait from "@/assets/sunyan-portrait.jpg";

export default function MacbookMockup() {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || window.innerWidth < 1024) return;

    let raf = 0;
    let cx = 0, cy = 0;
    let tx = -6, ty = 2;

    const onMove = (e: MouseEvent) => {
      const rect = (el.closest("section") ?? document.documentElement).getBoundingClientRect();
      cx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      cy = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    const onLeave = () => { cx = 0; cy = 0; };

    const frame = () => {
      tx += (-6 + cy * 4 - tx) * 0.055;
      ty += (2 + cx * 2 - ty) * 0.055;
      const inner = el.querySelector<HTMLElement>(".macbook-inner");
      if (inner) inner.style.transform = `rotateY(${ty}deg) rotateX(${tx}deg)`;
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

  const W = "clamp(280px, 44vw, 540px)";

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0,
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      <div style={{ perspective: "1400px", perspectiveOrigin: "50% 44%" }}>
        <div
          className="macbook-inner"
          style={{
            width: W,
            transformStyle: "preserve-3d",
            transform: "rotateY(2deg) rotateX(-6deg)",
            transition: "transform 0.06s linear",
            position: "relative",
            willChange: "transform",
          }}
        >
          {/* ── LID / SCREEN ────────────────────────────── */}
          <div
            style={{
              position: "relative",
              width: "100%",
              borderRadius: "12px 12px 0 0",
              background: "linear-gradient(170deg, #1e2248 0%, #0b0d1e 60%, #0e1030 100%)",
              border: "1px solid rgba(198,168,112,0.18)",
              borderBottom: "none",
              boxShadow: [
                "0 0 0 1px rgba(255,255,255,0.04) inset",
                "0 48px 96px -16px rgba(0,0,0,0.82)",
                "0 0 60px 0 rgba(198,168,112,0.07)",
              ].join(", "),
              padding: "8px 8px 0",
            }}
          >
            {/* Camera dot */}
            <div style={{
              width: "6px", height: "6px", borderRadius: "50%",
              background: "rgba(198,168,112,0.20)",
              margin: "0 auto 6px",
              border: "1px solid rgba(198,168,112,0.10)",
            }} />

            {/* ── Screen area ── */}
            <div style={{
              borderRadius: "6px 6px 0 0",
              overflow: "hidden",
              background: "#070915",
              position: "relative",
              aspectRatio: "16/10",
            }}>
              {/* ── Mini UI: Sidebar + Course player ── */}
              <div style={{ display: "flex", width: "100%", height: "100%", fontFamily: "system-ui, sans-serif" }}>

                {/* Sidebar */}
                <div style={{
                  width: "22%", height: "100%", flexShrink: 0,
                  background: "#0c0f22",
                  borderRight: "1px solid rgba(198,168,112,0.07)",
                  display: "flex", flexDirection: "column",
                  padding: "10px 8px", gap: "3px",
                }}>
                  {/* Logo */}
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", padding: "4px 6px 10px" }}>
                    <svg width="10" height="10" viewBox="0 0 64 64" fill="none">
                      <path d="M32 58C14 58 6 46 6 32C6 18 17 8 30 8C42 8 51 17 51 29C51 39 44 47 34 47C26 47 20 40 20 32C20 25 25 20 32 20C38 20 42 25 42 30C42 35 38 39 34 39"
                        stroke="#c6a870" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                    <span style={{ fontSize: "5px", letterSpacing: "0.14em", color: "rgba(198,168,112,0.70)", fontWeight: 600, textTransform: "uppercase" }}>Espiral</span>
                  </div>

                  {[
                    { label: "Dashboard", active: false, dot: "var(--gold)" },
                    { label: "Meu Curso",  active: true,  dot: "#c6a870" },
                    { label: "Comunidade", active: false, dot: "#a49ed0" },
                    { label: "Progresso",  active: false, dot: "#8caa96" },
                  ].map(({ label, active }) => (
                    <div key={label} style={{
                      padding: "5px 6px", borderRadius: "5px",
                      background: active ? "rgba(198,168,112,0.10)" : "transparent",
                      borderLeft: active ? "2px solid #c6a870" : "2px solid transparent",
                    }}>
                      <span style={{ fontSize: "4.5px", color: active ? "#c6a870" : "rgba(198,168,112,0.40)", fontWeight: active ? 600 : 400 }}>
                        {label}
                      </span>
                    </div>
                  ))}

                  <div style={{ flex: 1 }} />

                  {/* User avatar */}
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 6px", borderTop: "1px solid rgba(198,168,112,0.07)", paddingTop: "8px" }}>
                    <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "rgba(198,168,112,0.15)", border: "1px solid rgba(198,168,112,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: "5px", color: "#c6a870" }}>S</span>
                    </div>
                    <div>
                      <span style={{ display: "block", fontSize: "4px", color: "rgba(245,240,232,0.70)" }}>Sunyan</span>
                      <span style={{ display: "block", fontSize: "3.5px", color: "rgba(198,168,112,0.40)" }}>Admin</span>
                    </div>
                  </div>
                </div>

                {/* Main content */}
                <div style={{ flex: 1, height: "100%", background: "#070915", display: "flex", flexDirection: "column", overflow: "hidden" }}>

                  {/* Top bar */}
                  <div style={{
                    height: "20px", flexShrink: 0,
                    borderBottom: "1px solid rgba(198,168,112,0.07)",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "0 10px",
                  }}>
                    <span style={{ fontSize: "5px", color: "#c6a870", letterSpacing: "0.10em" }}>Mulher Espiral — Módulo 3</span>
                    <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                      <div style={{ width: "28px", height: "3px", borderRadius: "100px", background: "rgba(198,168,112,0.12)" }}>
                        <div style={{ width: "55%", height: "100%", borderRadius: "100px", background: "#c6a870" }} />
                      </div>
                      <span style={{ fontSize: "4px", color: "rgba(198,168,112,0.50)" }}>55%</span>
                    </div>
                  </div>

                  {/* Video area */}
                  <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", flexShrink: 0, overflow: "hidden", background: "#030508" }}>
                    <img
                      src={sunyanPortrait}
                      alt=""
                      loading="eager"
                      decoding="async"
                      fetchPriority="high"
                      style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 12%", opacity: 0.82, mixBlendMode: "luminosity" }}
                    />
                    {/* Video gradient */}
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(7,9,21,0.88) 0%, transparent 50%)" }} />
                    {/* Play button */}
                    <div style={{
                      position: "absolute", top: "50%", left: "50%",
                      transform: "translate(-50%, -50%)",
                      width: "18px", height: "18px", borderRadius: "50%",
                      background: "rgba(198,168,112,0.90)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 2px 12px rgba(198,168,112,0.45)",
                    }}>
                      <svg width="6" height="7" viewBox="0 0 8 10" fill="none">
                        <path d="M2 1.5L7 5L2 8.5V1.5Z" fill="#0b0d1c" />
                      </svg>
                    </div>
                    {/* Lesson label */}
                    <div style={{ position: "absolute", bottom: "5px", left: "7px", right: "7px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "3.5px", color: "rgba(245,240,232,0.55)", letterSpacing: "0.08em" }}>Aula 08 — O Corpo como Sabedoria</span>
                      <span style={{ fontSize: "3.5px", color: "rgba(198,168,112,0.60)" }}>24:15</span>
                    </div>
                  </div>

                  {/* Lesson list */}
                  <div style={{ flex: 1, overflow: "hidden", padding: "6px 8px", display: "flex", flexDirection: "column", gap: "3px" }}>
                    {[
                      { title: "Introdução ao Módulo", done: true },
                      { title: "Reconhecendo Padrões",  done: true },
                      { title: "A Voz do Corpo",        done: true },
                      { title: "O Corpo como Sabedoria", done: false, active: true },
                      { title: "Integração Somática",   done: false },
                    ].map(({ title, done, active }) => (
                      <div key={title} style={{
                        display: "flex", alignItems: "center", gap: "5px",
                        padding: "3px 5px", borderRadius: "4px",
                        background: active ? "rgba(198,168,112,0.07)" : "transparent",
                        borderLeft: active ? "1.5px solid #c6a870" : "1.5px solid transparent",
                      }}>
                        <div style={{
                          width: "7px", height: "7px", borderRadius: "50%", flexShrink: 0,
                          background: done ? "rgba(140,170,150,0.20)" : active ? "rgba(198,168,112,0.14)" : "rgba(198,168,112,0.06)",
                          border: `1px solid ${done ? "rgba(140,170,150,0.50)" : active ? "rgba(198,168,112,0.50)" : "rgba(198,168,112,0.14)"}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {done && <span style={{ fontSize: "4px", color: "#8caa96" }}>✓</span>}
                        </div>
                        <span style={{
                          fontSize: "4px",
                          color: done ? "rgba(140,170,150,0.70)" : active ? "#c6a870" : "rgba(245,240,232,0.40)",
                          textDecoration: done ? "none" : "none",
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>{title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Glare overlay */}
              <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(135deg, rgba(255,255,255,0.055) 0%, transparent 38%)",
                pointerEvents: "none",
              }} />
            </div>
          </div>

          {/* ── HINGE ──────────────────────────────────── */}
          <div style={{
            width: "100%", height: "3px",
            background: "linear-gradient(180deg, #1a1d38 0%, #0c0e1e 100%)",
            borderLeft: "1px solid rgba(198,168,112,0.10)",
            borderRight: "1px solid rgba(198,168,112,0.10)",
          }} />

          {/* ── BASE / KEYBOARD ────────────────────────── */}
          <div style={{
            width: "100%",
            borderRadius: "0 0 10px 10px",
            background: "linear-gradient(180deg, #181b30 0%, #0e1028 60%, #0b0d22 100%)",
            border: "1px solid rgba(198,168,112,0.12)",
            borderTop: "none",
            padding: "8px 12px 10px",
            position: "relative",
            boxShadow: "0 16px 56px -10px rgba(0,0,0,0.75)",
          }}>
            {/* Keyboard grid */}
            <div style={{ display: "grid", gap: "2px" }}>
              {/* Row 1 — function keys */}
              <div style={{ display: "flex", gap: "1.5px" }}>
                {Array.from({ length: 14 }, (_, i) => (
                  <div key={i} style={{ flex: 1, height: "4px", borderRadius: "2px", background: "rgba(198,168,112,0.07)", border: "1px solid rgba(198,168,112,0.05)" }} />
                ))}
              </div>
              {/* Rows 2–4 — main keys */}
              {[13, 12, 11].map((cols, ri) => (
                <div key={ri} style={{ display: "flex", gap: "1.5px" }}>
                  {Array.from({ length: cols }, (_, i) => (
                    <div key={i} style={{
                      flex: i === 0 && ri > 0 ? 1.5 : 1,
                      height: "5px", borderRadius: "2px",
                      background: "rgba(198,168,112,0.065)",
                      border: "1px solid rgba(198,168,112,0.05)",
                    }} />
                  ))}
                </div>
              ))}
              {/* Space bar row */}
              <div style={{ display: "flex", gap: "1.5px", marginTop: "1px" }}>
                <div style={{ flex: 0.8, height: "5px", borderRadius: "2px", background: "rgba(198,168,112,0.065)", border: "1px solid rgba(198,168,112,0.05)" }} />
                <div style={{ flex: 5, height: "5px", borderRadius: "2px", background: "rgba(198,168,112,0.07)", border: "1px solid rgba(198,168,112,0.08)" }} />
                <div style={{ flex: 0.8, height: "5px", borderRadius: "2px", background: "rgba(198,168,112,0.065)", border: "1px solid rgba(198,168,112,0.05)" }} />
              </div>
            </div>

            {/* Trackpad */}
            <div style={{
              width: "36%", height: "clamp(14px, 2.5vw, 22px)", borderRadius: "5px",
              background: "rgba(198,168,112,0.055)",
              border: "1px solid rgba(198,168,112,0.08)",
              margin: "5px auto 0",
            }} />

            {/* Bottom notch / Apple-style lip */}
            <div style={{
              position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
              width: "28%", height: "2px", borderRadius: "0 0 4px 4px",
              background: "rgba(198,168,112,0.10)",
            }} />
          </div>

          {/* ── Bottom edge depth (3D side) ── */}
          <div style={{
            position: "absolute", left: "6px", right: "6px", bottom: "-5px", height: "5px",
            borderRadius: "0 0 4px 4px",
            background: "linear-gradient(to bottom, #0a0c1e, #04060c)",
            transform: "rotateX(-90deg) translateZ(-2.5px)",
            transformOrigin: "top center",
          }} />
        </div>
      </div>

      {/* ── Ground shadow / reflection ── */}
      <div style={{
        width: "clamp(200px, 38vw, 460px)",
        height: "24px",
        background: "radial-gradient(ellipse 90% 100% at 50% 0%, rgba(198,168,112,0.10) 0%, transparent 72%)",
        filter: "blur(8px)",
        marginTop: "-4px",
        borderRadius: "50%",
        flexShrink: 0,
      }} />
    </div>
  );
}
