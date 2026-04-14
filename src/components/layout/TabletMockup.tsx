/**
 * TabletMockup — CSS 3D perspective tablet with Sunyan portrait fullscreen.
 * Responsive: visible on lg+ (desktop); compact card on mobile.
 * CTA "Conheça Sunyan" scrolls to section-6 (Sunyan section).
 */
import { useRef, useEffect } from "react";
import sunyanPortrait from "@/assets/sunyan-portrait.jpg";

interface TabletMockupProps {
  /** Override scroll target */
  targetSection?: string;
}

export default function TabletMockup({ targetSection = "section-6" }: TabletMockupProps) {
  const wrapRef = useRef<HTMLDivElement>(null);

  const scrollToSunyan = () => {
    const el = document.getElementById(targetSection);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* Subtle parallax — desktop only, passive listeners */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (window.innerWidth < 1024) return; // skip on mobile

    let raf = 0;
    let cx = 0, cy = 0;
    let tx = -16, ty = 3;

    const onMove = (e: MouseEvent) => {
      const rect = (el.closest("section") ?? document.documentElement).getBoundingClientRect();
      cx = ((e.clientX - rect.left) / rect.width  - 0.5) * 2;
      cy = ((e.clientY - rect.top)  / rect.height - 0.5) * 2;
    };
    const onLeave = () => { cx = 0; cy = 0; };

    const frame = () => {
      tx += (-16 + cy * 5 - tx) * 0.07;
      ty += (  3 + cx * 3 - ty) * 0.07;
      const inner = el.querySelector<HTMLElement>(".tablet-inner");
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
      style={{
        display:       "flex",
        flexDirection: "column",
        alignItems:    "center",
        gap:           "24px",
        pointerEvents: "none",
        userSelect:    "none",
      }}
    >
      {/* ── Perspective wrapper ── */}
      <div style={{ perspective: "1200px", perspectiveOrigin: "48% 44%" }}>
        <div
          className="tablet-inner"
          style={{
            /* Responsive width: clamp tighter for better fit */
            width:          "clamp(200px, 22vw, 320px)",
            transformStyle: "preserve-3d",
            transform:      "rotateY(-16deg) rotateX(3deg)",
            transition:     "transform 0.06s linear",
            position:       "relative",
          }}
        >
          {/* ── Bezel ── */}
          <div style={{
            position:     "relative",
            borderRadius: "20px",
            background:   "linear-gradient(160deg, #1e2240 0%, #0c0e20 55%, #141628 100%)",
            padding:      "12px 12px 18px",
            boxShadow: [
              "0 2px 0 0 rgba(198,168,112,0.30)",
              "0 44px 72px -10px rgba(0,0,0,0.80)",
              "0 0 48px 0 rgba(198,168,112,0.08)",
              "inset 0 1px 0 rgba(198,168,112,0.18)",
            ].join(", "),
            border: "1px solid rgba(198,168,112,0.16)",
          }}>
            {/* Camera notch */}
            <div style={{
              width: "40px", height: "4px", borderRadius: "100px",
              background: "rgba(198,168,112,0.15)",
              margin: "0 auto 10px",
            }} />

            {/* ── Screen — portrait ratio ── */}
            <div style={{
              borderRadius: "10px",
              overflow:     "hidden",
              background:   "#06080f",
              position:     "relative",
              aspectRatio:  "9/13", /* portrait — fits Sunyan's photo naturally */
              boxShadow:    "inset 0 0 32px rgba(0,0,0,0.6)",
            }}>
              {/* Sunyan fullscreen portrait */}
              <img
                src={sunyanPortrait}
                alt="Sunyan Nunes — Mulher Espiral"
                loading="eager"
                decoding="async"
                style={{
                  width:          "100%",
                  height:         "100%",
                  objectFit:      "cover",
                  objectPosition: "center top",
                  display:        "block",
                }}
              />

              {/* Glare — subtle top-left shine */}
              <div style={{
                position:   "absolute",
                inset:      0,
                background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 42%)",
                pointerEvents: "none",
              }} />

              {/* Bottom brand overlay */}
              <div style={{
                position:   "absolute",
                bottom:     0,
                left:       0,
                right:      0,
                padding:    "32px 14px 16px",
                background: "linear-gradient(to top, rgba(6,8,15,0.90) 0%, rgba(6,8,15,0.40) 55%, transparent 100%)",
              }}>
                <p style={{
                  fontFamily:    "Cormorant Garamond, serif",
                  fontSize:      "clamp(15px, 2.2vw, 20px)",
                  color:         "#d4af72",
                  fontStyle:     "italic",
                  fontWeight:    300,
                  textAlign:     "center",
                  lineHeight:    1.2,
                  textShadow:    "0 1px 10px rgba(0,0,0,0.8)",
                }}>
                  Sunyan Nunes
                </p>
                <p style={{
                  fontFamily:    "Montserrat, sans-serif",
                  fontSize:      "7px",
                  letterSpacing: "0.20em",
                  textTransform: "uppercase",
                  color:         "rgba(198,168,112,0.60)",
                  textAlign:     "center",
                  marginTop:     "3px",
                }}>
                  Método Espiral
                </p>
              </div>
            </div>

            {/* Home bar */}
            <div style={{
              width:  "60px", height: "4px", borderRadius: "100px",
              background: "rgba(198,168,112,0.18)",
              margin: "12px auto 0",
            }} />
          </div>

          {/* ── Right edge depth ── */}
          <div style={{
            position:        "absolute",
            top:             "6px",
            right:           "-9px",
            bottom:          "6px",
            width:           "9px",
            borderRadius:    "0 3px 3px 0",
            background:      "linear-gradient(to right, #0c0e20, #060810)",
            transform:       "rotateY(90deg) translateZ(-4.5px)",
            transformOrigin: "left center",
            boxShadow:       "2px 0 10px rgba(0,0,0,0.5)",
          }} />

          {/* ── Bottom edge depth ── */}
          <div style={{
            position:        "absolute",
            left:            "8px",
            right:           "8px",
            bottom:          "-7px",
            height:          "7px",
            borderRadius:    "0 0 3px 3px",
            background:      "linear-gradient(to bottom, #0a0c1e, #04060c)",
            transform:       "rotateX(-90deg) translateZ(-3.5px)",
            transformOrigin: "top center",
          }} />
        </div>
      </div>

      {/* ── Ground reflection ── */}
      <div style={{
        width:       "clamp(140px, 16vw, 240px)",
        height:      "22px",
        background:  "radial-gradient(ellipse 80% 100% at 50% 0%, rgba(198,168,112,0.12) 0%, transparent 70%)",
        filter:      "blur(5px)",
        marginTop:   "-12px",
        borderRadius:"50%",
        flexShrink:  0,
      }} />

      {/* ── CTA Button ── */}
      <div style={{ pointerEvents: "all", textAlign: "center", marginTop: "4px" }}>
        <button
          onClick={scrollToSunyan}
          style={{
            display:        "inline-flex",
            alignItems:     "center",
            gap:            "8px",
            padding:        "13px 30px",
            background:     "linear-gradient(135deg, #c6a870 0%, #dac394 55%, #c6a870 100%)",
            backgroundSize: "200% 100%",
            border:         "none",
            borderRadius:   "100px",
            color:          "#0b0d1c",
            fontFamily:     "Montserrat, sans-serif",
            fontSize:       "9px",
            fontWeight:     600,
            letterSpacing:  "0.20em",
            textTransform:  "uppercase",
            cursor:         "pointer",
            boxShadow:      "0 8px 28px rgba(198,168,112,0.38), 0 2px 6px rgba(0,0,0,0.28)",
            animation:      "tabletCtaPulse 2.8s ease-in-out infinite",
            whiteSpace:     "nowrap",
            minHeight:      "44px",
            transition:     "box-shadow 0.2s, transform 0.2s",
          }}
          aria-label="Conheça Sunyan Nunes"
        >
          ✦ Conheça Sunyan
        </button>

        <p style={{
          fontFamily:    "Montserrat, sans-serif",
          fontSize:      "8px",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color:         "rgba(198,168,112,0.45)",
          marginTop:     "10px",
        }}>
          Criadora do Método Espiral
        </p>
      </div>

      <style>{`
        @keyframes tabletCtaPulse {
          0%, 100% {
            box-shadow: 0 8px 28px rgba(198,168,112,0.38), 0 2px 6px rgba(0,0,0,0.28);
            transform: translateY(0);
          }
          50% {
            box-shadow: 0 12px 44px rgba(198,168,112,0.58), 0 4px 14px rgba(0,0,0,0.32);
            transform: translateY(-3px);
          }
        }
      `}</style>
    </div>
  );
}
