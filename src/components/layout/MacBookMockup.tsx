import { useEffect, useRef } from "react";

export default function MacBookMockup() {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (window.innerWidth < 1024) return;

    let raf = 0;
    let cx = 0;
    let cy = 0;
    let tx = 0;
    let ty = 0;

    const onMove = (e: MouseEvent) => {
      const rect = (el.closest("section") ?? document.documentElement).getBoundingClientRect();
      cx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      cy = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    const onLeave = () => { cx = 0; cy = 0; };

    const frame = () => {
      tx += (cy * 6 - tx) * 0.07;
      ty += (-cx * 6 - ty) * 0.07;
      const inner = el.querySelector<HTMLElement>(".macbook-inner");
      if (inner) inner.style.transform = `perspective(1200px) rotateX(${tx}deg) rotateY(${ty}deg)`;
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
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        maxWidth: "680px",
        margin: "0 auto",
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      <div
        className="macbook-inner"
        style={{
          width: "100%",
          transformStyle: "preserve-3d",
          transition: "transform 0.06s linear",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center"
        }}
      >
        {/* Screen Enclosure */}
        <div
          style={{
            position: "relative",
            width: "90%",
            aspectRatio: "16/10",
            backgroundColor: "#16181c",
            borderRadius: "clamp(6px, 1.5vw, 12px) clamp(6px, 1.5vw, 12px) 0 0",
            padding: "clamp(3px, 1vw, 8px)",
            boxShadow: "inset 0 1px 1px rgba(255,255,255,0.1), 0 20px 40px -10px rgba(0,0,0,0.7)",
            border: "1px solid #2a2c35",
            borderBottom: "none",
            zIndex: 2,
          }}
        >
          {/* Inner Display */}
          <div
            style={{
              width: "100%",
              height: "100%",
              backgroundColor: "#060810",
              borderRadius: "clamp(3px, 0.8vw, 6px)",
              overflow: "hidden",
              position: "relative",
              boxShadow: "inset 0 0 20px rgba(0,0,0,0.8)",
            }}
          >
            {/* Background matching the platform */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(180deg, #0b0d1c 0%, #060810 60%, #050610 100%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "radial-gradient(ellipse 70% 55% at 50% 35%, rgba(198,168,112,0.15) 0%, transparent 62%)",
              }}
            />

            {/* Tornado Spiral */}
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "4%" }}>
              <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%", maxWidth: "340px", filter: "drop-shadow(0 4px 16px rgba(198,168,112,0.4))" }}>
                <g stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round">
                  {/* Back paths (dim) */}
                  <path d="M 30 40 C 30 25, 170 60, 170 75" opacity="0.25" />
                  <path d="M 50 75 C 50 60, 150 95, 150 110" opacity="0.25" />
                  <path d="M 70 110 C 70 100, 130 130, 130 145" opacity="0.25" />
                  <path d="M 85 145 C 85 135, 115 160, 115 175" opacity="0.25" />
                  <path d="M 95 175 C 95 170, 105 185, 105 190" opacity="0.25" />

                  {/* Front paths (bright) */}
                  <path d="M 190 40 C 190 55, 30 55, 30 40" />
                  <path d="M 170 75 C 170 85, 50 85, 50 75" />
                  <path d="M 150 110 C 150 118, 70 118, 70 110" />
                  <path d="M 130 145 C 130 151, 85 151, 85 145" />
                  <path d="M 115 175 C 115 179, 95 179, 95 175" />
                  
                  <circle cx="100" cy="190" r="2" fill="var(--gold)" />
                </g>
              </svg>
            </div>

            {/* Glare overlay */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 40%)",
                pointerEvents: "none",
              }}
            />
          </div>
          
          {/* Webcam dot */}
          <div
            style={{
              position: "absolute",
              top: "clamp(1px, 0.5vw, 4px)",
              left: "50%",
              transform: "translateX(-50%)",
              width: "clamp(2px, 0.4vw, 4px)",
              height: "clamp(2px, 0.4vw, 4px)",
              borderRadius: "50%",
              backgroundColor: "#000",
              border: "1px solid #1a1a1a",
            }}
          />
        </div>

        {/* Base / Keyboard lip */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "clamp(6px, 1vw, 10px)",
            backgroundColor: "#9ea3a8",
            borderTop: "1px solid #d4d8db",
            borderRadius: "0 0 clamp(6px, 1.5vw, 12px) clamp(6px, 1.5vw, 12px)",
            boxShadow: "0 10px 25px rgba(0,0,0,0.5), inset 0 -2px 4px rgba(0,0,0,0.2)",
            display: "flex",
            justifyContent: "center",
            zIndex: 1,
          }}
        >
          {/* Trackpad notch */}
          <div
            style={{
              width: "14%",
              height: "40%",
              backgroundColor: "#7e8388",
              borderBottomLeftRadius: "3px",
              borderBottomRightRadius: "3px",
              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.3)",
            }}
          />
        </div>
      </div>
      
      {/* Shadow below laptop */}
      <div
        style={{
          width: "clamp(200px, 60vw, 600px)",
          height: "14px",
          background: "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(0,0,0,0.35) 0%, transparent 100%)",
          filter: "blur(6px)",
          marginTop: "-7px",
          borderRadius: "50%",
          zIndex: 0,
        }}
      />
    </div>
  );
}
