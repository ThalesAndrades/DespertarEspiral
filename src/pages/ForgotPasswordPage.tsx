/**
 * ForgotPasswordPage — Mobile-first, full theme coverage
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import SpiralLogo from "@/components/layout/SpiralLogo";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft, CheckCircle, Mail } from "lucide-react";
import { fireEventAsync } from "@/lib/sequenzy";

const LABEL: React.CSSProperties = {
  display: "block",
  fontFamily: "Montserrat, sans-serif",
  fontSize: "9px",
  letterSpacing: "0.20em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
  marginBottom: "8px",
  fontWeight: 500,
};

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState("");
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error("Digite seu e-mail."); return; }
    setLoading(true);
    // /reset-password handles the Supabase magic-link callback and prompts for new password
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setSent(true);

    // Sequenzy: password reset requested → triggers "Recuperação de Senha" sequence
    fireEventAsync("user.password_reset_requested", {
      email,
      properties: { method: "email_link", requested_at: new Date().toISOString() },
    });
  };

  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      background: "var(--bg-surface)",
      color: "var(--text-primary)",
    }}>
      {/* Mobile sticky header */}
      <header style={{
        height: "60px", display: "flex", alignItems: "center",
        justifyContent: "space-between",
        padding: "0 clamp(16px,5vw,28px)",
        background: "var(--nav-bg)",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border-subtle)",
        flexShrink: 0, position: "sticky", top: 0, zIndex: 20,
      }}>
        <Link to="/" style={{ textDecoration: "none" }}>
          <SpiralLogo variant="dark" size={26} autoTheme />
        </Link>
        <Link to="/login" className="btn-ghost" style={{ padding: "8px 16px", fontSize: "9px", minHeight: "36px" }}>
          Entrar
        </Link>
      </header>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "clamp(32px,6vw,64px) clamp(20px,5vw,32px)", position: "relative", overflow: "hidden" }}>

        {/* Spiral decoration */}
        <svg aria-hidden="true" style={{ position: "absolute", right: "-80px", bottom: "-80px", opacity: 0.05, pointerEvents: "none" }} width="360" height="360" viewBox="0 0 600 600" fill="none">
          <path d="M300 550C120 550 50 420 50 300C50 165 155 65 285 65C395 65 480 152 480 262C480 355 410 420 320 420C245 420 185 360 185 286C185 220 237 170 303 170C362 170 408 216 408 275C408 327 370 362 320 362C277 362 245 330 245 288C245 252 273 226 308 226C340 226 365 251 365 283C365 312 343 333 315 333" stroke="var(--gold)" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        </svg>

        <div style={{ width: "100%", maxWidth: "380px", position: "relative", zIndex: 1 }}>

          {!sent ? (
            <>
              <div style={{ textAlign: "center", marginBottom: "clamp(24px,4vw,36px)" }}>
                <div style={{
                  width: "60px", height: "60px", borderRadius: "50%",
                  background: "rgba(198,168,112,0.10)", border: "1px solid var(--border-soft)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto clamp(16px,3vw,24px)",
                }}>
                  <Mail size={24} style={{ color: "var(--gold)" }} strokeWidth={1.5} />
                </div>
                <p className="overline" style={{ color: "var(--gold)", marginBottom: "8px" }}>Recuperação de acesso</p>
                <h1 className="font-display" style={{
                  fontSize: "clamp(34px,5vw,48px)", fontWeight: 300,
                  color: "var(--text-primary)", marginBottom: "12px",
                }}>
                  Esqueci a senha
                </h1>
                <p style={{ fontSize: "clamp(13px,1.6vw,15px)", color: "var(--text-secondary)", lineHeight: 1.82 }}>
                  Digite seu e-mail e enviaremos um link de recuperação.
                </p>
              </div>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "clamp(14px,2vw,18px)" }}>
                <div>
                  <label style={LABEL}>E-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="input-dark"
                    autoComplete="email"
                    style={{ borderRadius: "14px" }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-gold"
                  style={{ width: "100%", borderRadius: "16px", minHeight: "54px" }}
                >
                  {loading ? "Enviando…" : <><span>Enviar link de recuperação</span><ArrowRight size={14} /></>}
                </button>
              </form>
            </>
          ) : (
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: "72px", height: "72px", borderRadius: "50%",
                background: "rgba(140,170,150,0.12)", border: "1px solid rgba(140,170,150,0.28)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto clamp(20px,3vw,28px)",
                boxShadow: "0 0 40px rgba(140,170,150,0.12)",
              }}>
                <CheckCircle size={30} style={{ color: "var(--sage)" }} strokeWidth={1.2} />
              </div>
              <p className="overline" style={{ color: "var(--sage)", marginBottom: "10px", letterSpacing: "0.22em" }}>
                Link enviado
              </p>
              <h1 className="font-display" style={{
                fontSize: "clamp(30px,4vw,44px)", fontWeight: 300,
                color: "var(--text-primary)", marginBottom: "14px",
              }}>
                Verifique seu e-mail
              </h1>
              <p style={{ fontSize: "clamp(13px,1.6vw,15px)", color: "var(--text-secondary)", lineHeight: 1.82, marginBottom: "28px" }}>
                Enviamos as instruções de recuperação para{" "}
                <strong style={{ color: "var(--text-primary)" }}>{email}</strong>.
              </p>
              <div className="card-dark" style={{ padding: "16px 18px", marginBottom: "24px" }}>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.7 }}>
                  Não recebeu? Verifique a pasta de spam ou{" "}
                  <button
                    onClick={() => setSent(false)}
                    style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--gold)", fontFamily: "DM Sans", fontSize: "13px", padding: 0 }}
                  >
                    tente novamente
                  </button>.
                </p>
              </div>
            </div>
          )}

          <div style={{ textAlign: "center", marginTop: "clamp(20px,3vw,32px)" }}>
            <Link to="/login" style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              fontFamily: "Montserrat, sans-serif", fontSize: "9px",
              letterSpacing: "0.18em", textTransform: "uppercase",
              color: "var(--text-muted)", textDecoration: "none",
              transition: "color 0.2s", minHeight: "44px",
            }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--gold)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-muted)")}
            >
              <ArrowLeft size={12} /> Voltar ao login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
