/**
 * LoginPage — Mobile-first, full theme coverage
 * Mobile: full-screen form | Desktop: split panel
 * Supports ?next= redirect param (safe open-redirect guard included)
 */
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import SpiralLogo from "@/components/layout/SpiralLogo";
import { LazyAuthSpiral3D as AuthSpiral3D } from "@/components/layout/LazyDecorative";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowRight } from "lucide-react";

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

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Safe open-redirect guard: only allow same-origin relative paths
  const nextPath = (() => {
    const raw = searchParams.get("next") ?? "";
    return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";
  })();

  const { loginWithPassword, loginWithGoogle } = useAuth();
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [showPass,   setShowPass]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [googleLoad, setGoogleLoad] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Preencha todos os campos."); return; }
    setLoading(true);
    const result = await loginWithPassword(email, password);
    if (result.error) { toast.error(result.error); setLoading(false); return; }
    toast.success("Bem-vinda de volta. ✦");
    navigate(nextPath, { replace: true });
  };

  const handleGoogle = async () => {
    setGoogleLoad(true);
    const result = await loginWithGoogle();
    if (result.error) { toast.error(result.error); setGoogleLoad(false); }
    // On success: Supabase redirects to window.location.origin, auth listener handles profile hydration
  };

  return (
    <div style={{ minHeight: "100dvh", display: "flex", background: "var(--bg-surface)", color: "var(--text-primary)" }}>

      {/* ── Left panel — desktop only ── */}
      <div className="hidden lg:flex" style={{
        flexDirection: "column", justifyContent: "space-between",
        width: "42%", padding: "clamp(36px,5vw,56px)",
        position: "relative", overflow: "hidden",
        background: "var(--bg-surface-2)",
        borderRight: "1px solid var(--border-subtle)",
        flexShrink: 0,
      }}>
        <AuthSpiral3D opacity={0.22} color="var(--gold)" />
        <Link to="/" style={{ textDecoration: "none", position: "relative", zIndex: 2 }}>
          <SpiralLogo variant="dark" size={34} autoTheme />
        </Link>
        <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", gap: "24px" }}>
          <h2 className="font-display" style={{ fontSize: "clamp(26px,2.8vw,38px)", fontStyle: "italic", fontWeight: 300, lineHeight: 1.15, color: "var(--text-primary)" }}>
            Seu caminho de volta para si começa aqui.
          </h2>
          <div className="card-dark" style={{ padding: "clamp(16px,2.5vw,22px)" }}>
            <div style={{ display: "flex", gap: "3px", marginBottom: "12px" }}>
              {[...Array(5)].map((_, i) => (
                <svg key={i} width="10" height="10" viewBox="0 0 12 12" fill="var(--gold)">
                  <path d="M6 1l1.33 2.7L10.5 4.18l-2.25 2.19.53 3.09L6 7.95 3.22 9.46l.53-3.09L1.5 4.18l3.17-.48z" />
                </svg>
              ))}
            </div>
            <p className="font-display" style={{ fontSize: "16px", color: "var(--text-secondary)", fontStyle: "italic", fontWeight: 300, lineHeight: 1.68, marginBottom: "12px" }}>
              "Esse método mudou a forma como eu me relaciono comigo mesma."
            </p>
            <p className="font-label" style={{ fontSize: "9px", color: "var(--lavender)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
              Lua Crescente · Mulher Espiral
            </p>
          </div>
        </div>
        <p className="font-label" style={{ fontSize: "9px", letterSpacing: "0.28em", color: "var(--text-faint)", textTransform: "uppercase", position: "relative", zIndex: 2 }}>DESPERTAR ESPIRAL</p>
      </div>

      {/* ── Form panel ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden auto", minWidth: 0 }}>

        {/* Mobile sticky header */}
        <div className="lg:hidden" style={{
          padding: "16px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "var(--bg-surface)",
          borderBottom: "1px solid var(--border-subtle)",
          position: "sticky", top: 0, zIndex: 20,
        }}>
          <Link to="/" style={{ textDecoration: "none" }}>
            <SpiralLogo variant="dark" size={26} autoTheme />
          </Link>
          <Link to="/register" className="btn-ghost" style={{ padding: "8px 16px", fontSize: "9px", minHeight: "36px" }}>
            Criar conta
          </Link>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "clamp(28px,6vw,60px) clamp(20px,6vw,48px)" }}>
          <div style={{ width: "100%", maxWidth: "390px" }}>
            <p className="overline" style={{ color: "var(--gold)", marginBottom: "8px", textAlign: "center" }}>Área do membro</p>
            <h1 className="font-display" style={{ fontSize: "clamp(34px,6vw,52px)", fontWeight: 300, textAlign: "center", marginBottom: "clamp(24px,4vw,32px)", color: "var(--text-primary)" }}>
              Entrar
            </h1>

            {/* Google */}
            <button type="button" onClick={handleGoogle} disabled={googleLoad}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                padding: "14px 20px", background: "var(--input-bg)", border: "1.5px solid var(--input-border)",
                borderRadius: "14px", color: "var(--text-primary)", fontFamily: "DM Sans, sans-serif",
                fontSize: "15px", fontWeight: 400, cursor: "pointer",
                transition: "border-color 0.2s, background 0.2s", marginBottom: "18px", minHeight: "52px",
              }}
            >
              {googleLoad
                ? <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>Redirecionando…</span>
                : <><GoogleIcon /><span>Continuar com Google</span></>
              }
            </button>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px" }}>
              <div style={{ flex: 1, height: "1px", background: "var(--border-subtle)" }} />
              <span className="font-label" style={{ fontSize: "8px", letterSpacing: "0.18em", color: "var(--text-faint)", textTransform: "uppercase" }}>ou</span>
              <div style={{ flex: 1, height: "1px", background: "var(--border-subtle)" }} />
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={LABEL}>E-mail</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com" className="input-dark" autoComplete="email"
                  style={{ borderRadius: "14px" }} />
              </div>

              <div>
                <label style={LABEL}>Senha</label>
                <div style={{ position: "relative" }}>
                  <input type={showPass ? "text" : "password"} value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" className="input-dark" autoComplete="current-password"
                    style={{ paddingRight: "52px", borderRadius: "14px" }} />
                  <button type="button"
                    style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", background: "transparent", border: "none", cursor: "pointer", padding: "6px", minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}
                    onClick={() => setShowPass(!showPass)} aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}>
                    {showPass ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "-2px" }}>
                <Link to="/forgot-password" className="font-label"
                  style={{ fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-muted)", textDecoration: "none", padding: "6px 0", minHeight: "36px", display: "inline-flex", alignItems: "center" }}>
                  Esqueci a senha
                </Link>
              </div>

              <button type="submit" disabled={loading} className="btn-gold"
                style={{ width: "100%", marginTop: "2px", borderRadius: "16px", minHeight: "54px" }}>
                {loading ? "Entrando…" : <><span>Entrar com e-mail</span><ArrowRight size={14} /></>}
              </button>
            </form>

            <p style={{ textAlign: "center", fontSize: "13px", color: "var(--text-faint)", marginTop: "14px", lineHeight: 1.7 }}>
              Ao continuar, você concorda com{" "}
              <Link to="/termos" style={{ color: "var(--gold)", textDecoration: "none", fontWeight: 500 }}>
                Termos de Uso
              </Link>{" "}
              e{" "}
              <Link to="/privacidade" style={{ color: "var(--gold)", textDecoration: "none", fontWeight: 500 }}>
                Política de Privacidade
              </Link>
              .
            </p>

            <p style={{ textAlign: "center", fontSize: "14px", color: "var(--text-muted)", marginTop: "clamp(20px,3vw,28px)", lineHeight: 1.7 }}>
              Não tem conta?{" "}
              <Link to="/register" style={{ color: "var(--gold)", textDecoration: "none", fontWeight: 500 }}>
                Criar conta gratuita
              </Link>
            </p>

            <p style={{ textAlign: "center", fontSize: "13px", color: "var(--text-faint)", marginTop: "12px" }}>
              <Link to="/" style={{ color: "var(--text-faint)", textDecoration: "none" }}>← Voltar ao início</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
