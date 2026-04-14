/**
 * MacbookMockup — MacBook Pro photo with embedded platform screenshot.
 *
 * Technique: The platform UI is a generated image (16:9) positioned
 * absolutely inside the MacBook photo. The screen overlay uses
 * CSS clip + border-radius to sit flush within the white screen area.
 *
 * Screen area measured from macbook-mockup.png (800×500 reference):
 *   left   ≈ 13.1%   top    ≈  3.4%
 *   width  ≈ 73.8%   height ≈ 61.2%
 *
 * Boot animation: IntersectionObserver → screen fade-in + shimmer sweep.
 * Parallax tilt: desktop fine-pointer only, throttled to 16ms.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import macbookPhoto from "@/assets/macbook-mockup.png";
import platformUI from "@/assets/platform-screen-v2.jpg";

/* ── Screen calibration constants ─────────────────────────── */
const SCREEN = {
  left:   "13.1%",
  top:    "3.4%",
  width:  "73.8%",
  height: "61.2%",
  radius: "2px 2px 0 0",
} as const;

/* ── Shimmer overlay ──────────────────────────────────────── */
function Shimmer({ active }: { active: boolean }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 10,
        pointerEvents: "none",
        background: "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.18) 50%, transparent 65%)",
        backgroundSize: "200% 100%",
        backgroundPositionX: active ? "200%" : "-200%",
        transition: active ? "background-position-x 1.1s cubic-bezier(.25,.46,.45,.94) 0.3s" : "none",
        opacity: active ? 0 : 1,
        animation: active ? "shimmer-sweep 1.1s cubic-bezier(.25,.46,.45,.94) 0.3s forwards" : "none",
      }}
    />
  );
}

export default function MacbookMockup() {
  const wrapRef            = useRef<HTMLDivElement>(null);
  const [booted, setBooted] = useState(false);

  /* ── Boot trigger via IntersectionObserver ── */
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

  /* ── Parallax tilt — desktop fine pointer only ── */
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
          {/* ── MacBook chassis photo ── */}
          <img
            src={macbookPhoto}
            alt=""
            loading="eager"
            decoding="async"
            fetchPriority="high"
            style={{ width: "100%", height: "auto", display: "block" }}
          />

          {/* ── Screen overlay — clipped flush to white area ── */}
          <div
            style={{
              position: "absolute",
              left:   SCREEN.left,
              top:    SCREEN.top,
              width:  SCREEN.width,
              height: SCREEN.height,
              overflow: "hidden",
              borderRadius: SCREEN.radius,
              zIndex: 2,
              background: "#070915",
              /* Boot fade-in */
              opacity: booted ? 1 : 0,
              transition: "opacity 0.60s cubic-bezier(.25,.46,.45,.94) 80ms",
            }}
          >
            {/* Platform UI screenshot — fills entire screen area */}
            <img
              src={platformUI}
              alt="Plataforma Despertar Espiral"
              loading="eager"
              decoding="async"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "top left",
                display: "block",
                /* Boot scale-in: slight zoom from 1.04 → 1.00 */
                transform: booted ? "scale(1)" : "scale(1.04)",
                transition: "transform 0.80s cubic-bezier(.16,1,.3,1) 80ms",
              }}
            />

            {/* Shimmer sweep on boot */}
            <Shimmer active={booted} />

            {/* Subtle screen glare (always visible) */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none",
                background: "linear-gradient(130deg, rgba(255,255,255,0.045) 0%, transparent 30%)",
              }}
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shimmer-sweep {
          from { background-position-x: -200%; }
          to   { background-position-x:  200%; }
        }
        .macbook-wrapper {
          max-width: min(92vw, 360px);
          margin: 0 auto;
        }
        @media (min-width: 480px)  { .macbook-wrapper { max-width: 450px; } }
        @media (min-width: 640px)  { .macbook-wrapper { max-width: 540px; } }
        @media (min-width: 1024px) { .macbook-wrapper { max-width: min(50vw, 740px); } }
        @media (min-width: 1280px) { .macbook-wrapper { max-width: min(48vw, 800px); } }
      `}</style>
    </div>
  );
}
