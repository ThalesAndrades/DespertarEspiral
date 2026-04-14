/**
 * Spiral3D — Lightweight CSS/SVG animated crystal clusters.
 * Replaces the Three.js implementation to remove the `three` dependency
 * that was causing "Importing a module script failed" on Vite chunk loading.
 *
 * Exports: BackgroundSpiral3D, HeroSpiral3D, SectionSpiral3D, AuthSpiral3D
 */
import { useEffect, useRef } from "react";

/* ─── Reduced motion ─────────────────────────────────────── */
function prefersReduced() {
  return typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* ══════════════════════════════════════════════════════════
   Shared keyframes injected once
══════════════════════════════════════════════════════════ */
let _injected = false;
function injectKeyframes() {
  if (_injected || typeof document === "undefined") return;
  _injected = true;
  const style = document.createElement("style");
  style.textContent = `
    @keyframes crystalSpin   { to { transform: rotate(360deg); } }
    @keyframes crystalSpinR  { to { transform: rotate(-360deg); } }
    @keyframes crystalFloat  { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
    @keyframes crystalFloat2 { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-7px); } }
    @keyframes crystalPulse  { 0%,100% { opacity: 0.55; } 50% { opacity: 1; } }
    @keyframes ringRotate    { 0% { transform: rotateX(65deg) rotateZ(0deg); } 100% { transform: rotateX(65deg) rotateZ(360deg); } }
    @keyframes ringRotate2   { 0% { transform: rotateX(45deg) rotateZ(0deg); } 100% { transform: rotateX(45deg) rotateZ(-360deg); } }
  `;
  document.head.appendChild(style);
}

/* ══════════════════════════════════════════════════════════
   Crystal SVG cluster — faceted octahedron shapes
══════════════════════════════════════════════════════════ */
interface CrystalClusterProps {
  color?:    string;
  opacity?:  number;
  scale?:    number;
  speed?:    number;
  withRings?: boolean;
  lightBg?:  boolean;
}

function CrystalCluster({
  color     = "#c6a870",
  opacity   = 0.7,
  scale     = 1,
  speed     = 1,
  withRings = false,
  lightBg   = false,
}: CrystalClusterProps) {
  useEffect(() => { injectKeyframes(); }, []);
  const reduced = prefersReduced();
  const dur = (s: number) => `${(s / speed).toFixed(1)}s`;

  const stroke    = color;
  const fill      = lightBg ? `${color}22` : `${color}18`;
  const fillBright = lightBg ? `${color}44` : `${color}30`;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", pointerEvents: "none" }}>

      {/* Outer ring */}
      {withRings && (
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%,-50%)",
          width: `${180 * scale}px`, height: `${180 * scale}px`,
          borderRadius: "50%",
          border: `1.5px solid ${color}`,
          opacity: opacity * 0.22,
          animation: reduced ? "none" : `ringRotate ${dur(14)} linear infinite`,
          transformOrigin: "center center",
        }} />
      )}
      {withRings && (
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%,-50%)",
          width: `${240 * scale}px`, height: `${240 * scale}px`,
          borderRadius: "50%",
          border: `1px solid ${color}`,
          opacity: opacity * 0.12,
          animation: reduced ? "none" : `ringRotate2 ${dur(22)} linear infinite`,
          transformOrigin: "center center",
        }} />
      )}

      {/* Main crystal — large octahedron SVG */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-52%, -50%)",
        animation: reduced ? "none" : `crystalFloat ${dur(4)} ease-in-out infinite`,
      }}>
        <svg
          width={`${68 * scale}`} height={`${168 * scale}`}
          viewBox="0 0 68 168"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: "block", filter: `drop-shadow(0 4px 24px ${color}55)` }}
        >
          {/* Top facets */}
          <polygon points="34,4 58,60 34,80" fill={fillBright} stroke={stroke} strokeWidth="0.6" opacity={opacity} />
          <polygon points="34,4 10,60 34,80" fill={fill}      stroke={stroke} strokeWidth="0.6" opacity={opacity * 0.75} />
          {/* Middle band */}
          <polygon points="58,60 10,60 34,80"  fill={fill}       stroke={stroke} strokeWidth="0.5" opacity={opacity * 0.55} />
          <polygon points="58,60 10,60 34,90"  fill={fillBright} stroke={stroke} strokeWidth="0.5" opacity={opacity * 0.60} />
          {/* Bottom facets */}
          <polygon points="34,164 58,105 34,90" fill={fill}       stroke={stroke} strokeWidth="0.6" opacity={opacity * 0.70} />
          <polygon points="34,164 10,105 34,90" fill={fillBright} stroke={stroke} strokeWidth="0.6" opacity={opacity * 0.55} />
          {/* Center equator */}
          <polygon points="58,105 10,105 34,90" fill={fill} stroke={stroke} strokeWidth="0.5" opacity={opacity * 0.40} />
        </svg>
      </div>

      {/* Secondary crystal — smaller, offset */}
      <div style={{
        position: "absolute", top: "34%", left: "22%",
        animation: reduced ? "none" : `crystalFloat2 ${dur(5.2)} ease-in-out infinite`,
        animationDelay: "-1.6s",
      }}>
        <svg
          width={`${42 * scale}`} height={`${100 * scale}`}
          viewBox="0 0 42 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: "block", transform: "rotate(15deg)", filter: `drop-shadow(0 2px 14px ${color}44)` }}
        >
          <polygon points="21,3 37,37 21,50"   fill={fillBright} stroke={stroke} strokeWidth="0.7" opacity={opacity * 0.65} />
          <polygon points="21,3 5,37 21,50"    fill={fill}       stroke={stroke} strokeWidth="0.7" opacity={opacity * 0.50} />
          <polygon points="37,37 5,37 21,50"   fill={fill}       stroke={stroke} strokeWidth="0.5" opacity={opacity * 0.35} />
          <polygon points="21,97 37,63 21,50"  fill={fill}       stroke={stroke} strokeWidth="0.7" opacity={opacity * 0.55} />
          <polygon points="21,97 5,63 21,50"   fill={fillBright} stroke={stroke} strokeWidth="0.7" opacity={opacity * 0.45} />
        </svg>
      </div>

      {/* Tertiary crystal — tiny, top-right */}
      <div style={{
        position: "absolute", top: "20%", left: "56%",
        animation: reduced ? "none" : `crystalFloat ${dur(6)} ease-in-out infinite`,
        animationDelay: "-3.1s",
      }}>
        <svg
          width={`${28 * scale}`} height={`${66 * scale}`}
          viewBox="0 0 28 66"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: "block", transform: "rotate(-22deg)", opacity: 0.72 }}
        >
          <polygon points="14,2 24,24 14,32"  fill={fill}       stroke={stroke} strokeWidth="0.8" opacity={opacity * 0.60} />
          <polygon points="14,2 4,24 14,32"   fill={fillBright} stroke={stroke} strokeWidth="0.8" opacity={opacity * 0.45} />
          <polygon points="14,64 24,42 14,32" fill={fillBright} stroke={stroke} strokeWidth="0.8" opacity={opacity * 0.55} />
          <polygon points="14,64 4,42 14,32"  fill={fill}       stroke={stroke} strokeWidth="0.8" opacity={opacity * 0.40} />
        </svg>
      </div>

      {/* Glow orb */}
      <div style={{
        position: "absolute", top: "35%", left: "30%",
        width: `${80 * scale}px`, height: `${80 * scale}px`,
        borderRadius: "50%",
        background: `radial-gradient(ellipse at 40% 35%, ${color}28 0%, transparent 68%)`,
        animation: reduced ? "none" : `crystalPulse ${dur(3.5)} ease-in-out infinite`,
        pointerEvents: "none",
      }} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   BackgroundSpiral3D
══════════════════════════════════════════════════════════ */
export function BackgroundSpiral3D() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed", inset: 0, zIndex: 0,
        pointerEvents: "none", overflow: "hidden",
      }}
    >
      <div style={{
        position: "absolute",
        right: "clamp(-40px, 0vw, 20px)",
        top: "8vh",
        width: "min(180px, 16vw)",
        height: "min(600px, 80vh)",
        opacity: 0.9,
      }}>
        <CrystalCluster color="#c6a870" opacity={0.52} scale={0.72} speed={0.55} />
      </div>
      {/* Ambient glow */}
      <div style={{
        position: "absolute", right: "4%", top: "8%",
        width: "360px", height: "680px",
        background: "radial-gradient(ellipse 55% 60% at 60% 35%, rgba(198,168,112,0.07) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   HeroSpiral3D
══════════════════════════════════════════════════════════ */
export function HeroSpiral3D() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        right: "clamp(-80px, -2vw, 0px)",
        top: "50%",
        transform: "translateY(-52%)",
        width: "clamp(260px, 32vw, 480px)",
        height: "clamp(600px, 92vh, 980px)",
        pointerEvents: "none",
        zIndex: 1,
      }}
    >
      <div style={{
        position: "absolute", top: "5%", left: "5%", right: "5%", height: "42%",
        background: "radial-gradient(ellipse 75% 50% at 55% 20%, rgba(198,168,112,0.22) 0%, transparent 65%)",
        pointerEvents: "none",
      }} />
      <CrystalCluster
        color="#d4af72" opacity={0.94}
        scale={1.0} speed={1.0}
        withRings
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SectionSpiral3D
══════════════════════════════════════════════════════════ */
interface SectionSpiralProps {
  size?:        number | string;
  height?:      number | string;
  opacity?:     number;
  color?:       string;
  emissive?:    string;
  emissiveInt?: number;
  speed?:       number;
  style?:       React.CSSProperties;
  lightBg?:     boolean;
  withRings?:   boolean;
  // legacy/ignored props:
  turns?: number; rCrown?: number; rTip?: number; helixHeight?: number; flare?: number; shadow?: boolean;
}

export function SectionSpiral3D({
  size      = 180,
  height,
  opacity   = 0.60,
  color     = "#c6a870",
  speed     = 0.0004,
  style,
  lightBg   = false,
  withRings = false,
}: SectionSpiralProps) {
  const w = typeof size   === "number" ? `${size}px`   : size;
  const h = height
    ? typeof height === "number" ? `${height}px` : height
    : typeof size   === "number" ? `${Math.round((size as number) * 2.4)}px` : "432px";

  return (
    <div
      aria-hidden="true"
      style={{ width: w, height: h, pointerEvents: "none", flexShrink: 0, ...style }}
    >
      <CrystalCluster
        color={color}
        opacity={opacity}
        scale={0.78}
        speed={speed * 2400}
        withRings={withRings}
        lightBg={lightBg}
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   AuthSpiral3D
══════════════════════════════════════════════════════════ */
export function AuthSpiral3D({
  opacity = 0.38,
  color   = "#c6a870",
}: {
  opacity?: number;
  color?:   string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}
    >
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "50%",
        background: "radial-gradient(ellipse 75% 50% at 50% 15%, rgba(198,168,112,0.12) 0%, transparent 68%)",
      }} />
      <CrystalCluster
        color={color}
        opacity={opacity}
        scale={0.90}
        speed={0.65}
        withRings
      />
    </div>
  );
}

export default BackgroundSpiral3D;
