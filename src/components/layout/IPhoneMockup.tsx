/**
 * IPhoneMockup — CSS 3D iPhone with Spiral logo inside
 * Responsive: shown in hero on mobile (below headline) and desktop (right col)
 * Parallax tilt on desktop via mouse tracking
 */
import { useEffect, useRef } from "react";

export default function IPhoneMockup() {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || window.innerWidth < 1024) return;

    let raf = 0;
    let cx = 0, cy = 0;
    let tx = -10, ty = 6;

    const onMove = (e: MouseEvent) => {
      const rect = (el.closest("section") ?? document.documentElement).getBoundingClientRect();
      cx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      cy = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    const onLeave = () => { cx = 0; cy = 0; };

    const frame = () => {
      tx += (-10 + cy * 4 - tx) * 0.065;
      ty += (  6 + cx * 3 - ty) * 0.065;
      const inner = el.querySelector<HTMLElement>(".iphone-inner");
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
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "18px", pointerEvents: "none", userSelect: "none" }}
    >
      <div style={{ perspective: "1200px", perspectiveOrigin: "52% 46%" }}>
        <div
          className="iphone-inner"
          style={{
            width: "clamp(160px, 42vw, 236px)",
            transformStyle: "preserve-3d",
            transform: "rotateY(-10deg) rotateX(6deg)",
            transition: "transform 0.06s linear",
            position: "relative",
            willChange: "transform",
          }}
        >
          {/* Bezel */}
          <div style={{
            position: "relative", borderRadius: "34px", padding: "10px",
            background: "linear-gradient(160deg, #1e2248 0%, #090b18 55%, #13152a 100%)",
            border: "1px solid rgba(198,168,112,0.16)",
            boxShadow: [
              "0 2px 0 0 rgba(198,168,112,0.26)",
              "0 52px 100px -18px rgba(0,0,0,0.80)",
              "0 0 56px 0 rgba(198,168,112,0.09)",
              "inset 0 1px 0 rgba(198,168,112,0.14)",
            ].join(", "),
          }}>
            {/* Notch */}
            <div style={{
              position: "absolute", top: "10px", left: "50%", transform: "translateX(-50%)",
              width: "88px", height: "22px", borderRadius: "14px",
              background: "rgba(0,0,0,0.55)",
              border: "1px solid rgba(255,255,255,0.05)", zIndex: 3,
            }} />

            {/* Screen */}
            <div style={{
              borderRadius: "28px", overflow: "hidden", background: "#060810",
              position: "relative", aspectRatio: "9/19.5",
              boxShadow: "inset 0 0 40px rgba(0,0,0,0.65)",
            }}>
              <div aria-hidden="true" style={{
                position: "absolute", inset: 0,
                background: [
                  "radial-gradient(ellipse 70% 55% at 50% 35%, rgba(198,168,112,0.17) 0%, transparent 62%)",
                  "radial-gradient(ellipse 60% 55% at 30% 75%, rgba(201,154,170,0.10) 0%, transparent 65%)",
                  "linear-gradient(180deg, #0b0d1c 0%, #060810 60%, #050610 100%)",
                ].join(", "),
              }} />

              {/* Spiral icon */}
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "28px" }}>
                <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"
                  style={{ width: "86%", maxWidth: "220px", filter: "drop-shadow(0 10px 32px rgba(198,168,112,0.18))" }}
                  className="spiral-outer"
                >
                  <path
                    d="M32 58C14.3 58 6 45.5 6 32C6 18.5 16.5 8 30 8C41.5 8 51 17.5 51 29C51 38.8 43.5 46.5 34 46.5C26 46.5 19.5 40 19.5 32.2C19.5 25.5 24.8 20.2 31.5 20.2C37.2 20.2 41.8 24.8 41.8 30.5C41.8 35.2 38.2 39 33.5 39"
                    stroke="var(--gold)" strokeWidth="1.7" strokeLinecap="round" fill="none"
                  />
                  <path d="M33.5 39 L34.8 37.4 L36.1 39 L34.8 40.6 Z" fill="var(--gold)" opacity="0.82" />
                </svg>
              </div>

              {/* Glare */}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 42%)", pointerEvents: "none" }} />
            </div>
          </div>

          {/* Right edge depth */}
          <div style={{
            position: "absolute", top: "18px", right: "-10px", bottom: "18px", width: "10px",
            borderRadius: "0 4px 4px 0",
            background: "linear-gradient(to right, #0c0e20, #060810)",
            transform: "rotateY(90deg) translateZ(-5px)",
            transformOrigin: "left center",
            boxShadow: "2px 0 10px rgba(0,0,0,0.45)",
          }} />

          {/* Bottom edge depth */}
          <div style={{
            position: "absolute", left: "10px", right: "10px", bottom: "-8px", height: "8px",
            borderRadius: "0 0 4px 4px",
            background: "linear-gradient(to bottom, #0a0c1e, #04060c)",
            transform: "rotateX(-90deg) translateZ(-4px)",
            transformOrigin: "top center",
          }} />
        </div>
      </div>

      {/* Ground reflection */}
      <div style={{
        width: "clamp(120px, 28vw, 196px)", height: "20px",
        background: "radial-gradient(ellipse 80% 100% at 50% 0%, rgba(198,168,112,0.12) 0%, transparent 70%)",
        filter: "blur(6px)", marginTop: "-12px", borderRadius: "50%", flexShrink: 0,
      }} />
    </div>
  );
}
