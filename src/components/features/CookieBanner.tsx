/**
 * CookieBanner — LGPD-compliant consent banner
 * Shows once until the user accepts or rejects analytics cookies.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { setAnalyticsConsent } from "@/lib/analytics";

const CONSENT_KEY = "de_cookie_consent";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      if (!stored) {
        const t = setTimeout(() => setVisible(true), 800);
        return () => clearTimeout(t);
      }
    } catch {
      /* localStorage disabled — don't show banner */
    }
  }, []);

  const handleDecision = (accepted: boolean) => {
    setAnalyticsConsent(accepted);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Aviso de cookies"
      style={{
        position: "fixed",
        left: "clamp(12px, 3vw, 24px)",
        right: "clamp(12px, 3vw, 24px)",
        bottom: "clamp(12px, 3vw, 24px)",
        maxWidth: "520px",
        marginInline: "auto",
        zIndex: 1000,
        padding: "clamp(16px, 2.5vw, 22px)",
        borderRadius: "16px",
        background: "var(--bg-surface-2, rgba(18,20,32,0.97))",
        color: "var(--text-primary, #f4f0e6)",
        border: "1px solid var(--border-subtle, rgba(198,168,112,0.18))",
        boxShadow: "0 16px 48px rgba(0,0,0,0.35)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <p
        style={{
          fontFamily: "Montserrat, sans-serif",
          fontSize: "9px",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "var(--gold, #c6a870)",
          marginBottom: "8px",
        }}
      >
        Sua privacidade
      </p>
      <p
        style={{
          fontSize: "13px",
          lineHeight: 1.7,
          color: "var(--text-secondary, #b9b3a1)",
          marginBottom: "14px",
        }}
      >
        Usamos cookies essenciais para o funcionamento da plataforma e, se você permitir, cookies
        de análise para entender como melhorar sua experiência. Leia nossa{" "}
        <Link
          to="/privacidade"
          style={{ color: "var(--gold, #c6a870)", textDecoration: "none", fontWeight: 500 }}
        >
          Política de Privacidade
        </Link>
        .
      </p>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button
          onClick={() => handleDecision(true)}
          style={{
            flex: 1,
            minWidth: "140px",
            minHeight: "44px",
            padding: "10px 20px",
            fontSize: "10px",
            fontFamily: "Montserrat, sans-serif",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            fontWeight: 500,
            borderRadius: "12px",
            border: "1px solid var(--gold, #c6a870)",
            background: "var(--gold, #c6a870)",
            color: "var(--bg-surface, #0b0d1c)",
            cursor: "pointer",
          }}
        >
          Aceitar todos
        </button>
        <button
          onClick={() => handleDecision(false)}
          style={{
            flex: 1,
            minWidth: "140px",
            minHeight: "44px",
            padding: "10px 20px",
            fontSize: "10px",
            fontFamily: "Montserrat, sans-serif",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            fontWeight: 500,
            borderRadius: "12px",
            border: "1px solid var(--border-soft, rgba(198,168,112,0.28))",
            background: "transparent",
            color: "var(--text-primary, #f4f0e6)",
            cursor: "pointer",
          }}
        >
          Apenas essenciais
        </button>
      </div>
    </div>
  );
}
