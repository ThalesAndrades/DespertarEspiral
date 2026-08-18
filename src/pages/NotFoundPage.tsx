import { Link } from "react-router-dom";
import SpiralLogo from "@/components/layout/SpiralLogo";
import { ArrowRight, Home } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "clamp(24px,5vw,48px) clamp(20px,5vw,32px)",
      textAlign: "center",
      position: "relative",
      overflow: "hidden",
      background: "var(--bg-surface)",
      color: "var(--text-primary)",
    }}>
      {/* Spiral decoration */}
      <svg
        aria-hidden="true"
        style={{
          position: "absolute", left: "50%", top: "50%",
          transform: "translate(-50%, -50%)",
          opacity: 0.06, pointerEvents: "none", maxWidth: "80vw",
        }}
        width="500" height="500" viewBox="0 0 600 600" fill="none"
      >
        <path
          d="M300 550C120 550 50 420 50 300C50 165 155 65 285 65C395 65 480 152 480 262C480 355 410 420 320 420C245 420 185 360 185 286C185 220 237 170 303 170C362 170 408 216 408 275C408 327 370 362 320 362C277 362 245 330 245 288C245 252 273 226 308 226C340 226 365 251 365 283C365 312 343 333 315 333"
          stroke="var(--gold)" strokeWidth="1.8" strokeLinecap="round" fill="none"
        />
      </svg>

      {/* Gold ambient glow */}
      <div aria-hidden="true" style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 60% 50% at 50% 50%, var(--gold-glow) 0%, transparent 70%)",
      }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        <Link to="/" style={{ textDecoration: "none", display: "inline-block", marginBottom: "clamp(28px,5vw,44px)" }}>
          <SpiralLogo variant="dark" size={40} showText={false} autoTheme />
        </Link>

        <p className="overline" style={{ color: "var(--gold)", fontSize: "9px", letterSpacing: "0.35em", marginBottom: "14px" }}>
          Erro 404
        </p>

        <h1 className="font-display text-balance" style={{
          fontSize: "clamp(34px,6vw,64px)",
          fontWeight: 300, fontStyle: "italic",
          lineHeight: 1.1, marginBottom: "clamp(14px,2.5vw,20px)",
          color: "var(--text-primary)",
        }}>
          Esse caminho<br />não existe.
        </h1>

        <p className="text-pretty" style={{
          fontSize: "clamp(14px,1.8vw,17px)",
          color: "var(--text-secondary)",
          lineHeight: 1.82, maxWidth: "400px",
          margin: "0 auto clamp(28px,5vw,44px)",
        }}>
          Talvez você tenha chegado aqui por um motivo — mas a sua jornada começa em outro lugar.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center" }}>
          <Link to="/" className="btn-gold" style={{ minWidth: "220px", justifyContent: "center" }}>
            <Home size={14} /> Voltar ao início
          </Link>
          <Link to="/dashboard" className="btn-ghost" style={{ minWidth: "220px", justifyContent: "center", fontSize: "9px" }}>
            Ir para o dashboard <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}
