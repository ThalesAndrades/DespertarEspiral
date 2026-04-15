/**
 * RegisterPage — Mobile-first, theme-aware
 * Passo 1: dados + OTP | Passo 2: verificação
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SpiralLogo from "@/components/layout/SpiralLogo";
import { LazyAuthSpiral3D as AuthSpiral3D } from "@/components/layout/LazyDecorative";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowRight, Mail, KeyRound, ChevronLeft } from "lucide-react";

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

type Step = "form" | "otp";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { sendOtp, verifyOtpAndRegister, loginWithGoogle } = useAuth();

  const [step,          setStep]          = useState<Step>("form");
  const [form,          setForm]          = useState({ name: "", email: "", password: "", confirm: "" });
  const [otp,           setOtp]           = useState("");
  const [showPass,      setShowPass]      = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleGoogle = async () => {
    setGoogleLoading(true);
    const result = await loginWithGoogle("/dashboard");
    if (result.error) { toast.error(result.error); setGoogleLoading(false); }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { toast.error("Preencha todos os campos."); return; }
    if (form.password !== form.confirm) { toast.error("As senhas não coincidem."); return; }
    if (form.password.length < 6) { toast.error("Senha com no mínimo 6 caracteres."); return; }
    setLoading(true);
    const result = await sendOtp(form.email);
    setLoading(false);
    if (result.error) { toast.error(result.error); return; }
    toast.success("Código enviado! Verifique seu e-mail.");
    setStep("otp");
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 4) { toast.error("Digite o código de 4 dígitos."); return; }
    setLoading(true);
    const result = await verifyOtpAndRegister(form.email, otp, form.password, form.name);
    if (result.error) { toast.error(result.error); setLoading(false); return; }
    toast.success("Bem-vinda à espiral. ✦");
    navigate("/dashboard", { replace: true });
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
        <div style={{ position: "relative", zIndex: 2 }}>
          <h2 className="font-display" style={{ fontSize: "clamp(28px,2.8vw,38px)", fontStyle: "italic", fontWeight: 300, lineHeight: 1.15, color: "var(--text-primary)", marginBottom: "20px" }}>
            Cada jornada começa com um primeiro passo.
          </h2>
          <p style={{ fontSize: "15px", color: "var(--text-secondary)", lineHeight: 1.88, marginBottom: "28px" }}>
            Ao criar sua conta, você receberá um nome anônimo exclusivo para participar da comunidade com total segurança.
          </p>
          <div className="card-dark" style={{ padding: "20px 22px" }}>
            <div style={{ display: "flex", gap: "3px", marginBottom: "12px" }}>
              {[...Array(5)].map((_, i) => (
                <svg key={i} width="10" height="10" viewBox="0 0 12 12" fill="var(--gold)">
                  <path d="M6 1l1.33 2.7L10.5 4.18l-2.25 2.19.53 3.09L6 7.95 3.22 9.46l.53-3.09L1.5 4.18l3.17-.48z" />
                </svg>
              ))}
            </div>
            <p className="font-display" style={{ fontSize: "16px", color: "var(--text-secondary)", fontStyle: "italic", fontWeight: 300, lineHeight: 1.68, marginBottom: "14px" }}>
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
          <Link to="/login" className="btn-ghost" style={{ padding: "8px 16px", fontSize: "9px", minHeight: "36px" }}>
            Entrar
          </Link>
        </div>

        {/* Step progress — mobile */}
        <div className="lg:hidden" style={{ padding: "16px 20px 0" }}>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            {[1, 2].map((n) => (
              <div key={n} style={{ flex: 1, height: "3px", borderRadius: "100px", background: n <= (step === "form" ? 1 : 2) ? "var(--gold)" : "var(--border-subtle)", transition: "background 0.4s" }} />
            ))}
          </div>
          <p className="font-label" style={{ fontSize: "8px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-faint)", marginTop: "8px" }}>
            Passo {step === "form" ? "1" : "2"} de 2
          </p>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "clamp(28px,5vw,56px) clamp(20px,6vw,48px)" }}>
          <div style={{ width: "100%", maxWidth: "390px" }}>

            {/* ── STEP 1 ── */}
            {step === "form" && (
              <>
                <p className="overline" style={{ color: "var(--gold)", marginBottom: "8px", textAlign: "center" }}>Primeiro acesso</p>
                <h1 className="font-display" style={{ fontSize: "clamp(34px,5vw,48px)", fontWeight: 300, textAlign: "center", marginBottom: "clamp(24px,4vw,32px)", color: "var(--text-primary)" }}>
                  Criar conta
                </h1>

                {/* Google */}
                <button type="button" onClick={handleGoogle} disabled={googleLoading}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                    padding: "14px 20px", background: "var(--input-bg)", border: "1.5px solid var(--input-border)",
                    borderRadius: "14px", color: "var(--text-primary)", fontFamily: "DM Sans, sans-serif",
                    fontSize: "15px", fontWeight: 400, cursor: "pointer",
                    transition: "border-color 0.2s, background 0.2s", marginBottom: "18px", minHeight: "52px",
                  }}
                >
                  {googleLoading
                    ? <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>Redirecionando…</span>
                    : <><GoogleIcon /><span>Continuar com Google</span></>
                  }
                </button>

                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px" }}>
                  <div style={{ flex: 1, height: "1px", background: "var(--border-subtle)" }} />
                  <span className="font-label" style={{ fontSize: "8px", letterSpacing: "0.18em", color: "var(--text-faint)", textTransform: "uppercase" }}>ou</span>
                  <div style={{ flex: 1, height: "1px", background: "var(--border-subtle)" }} />
                </div>

                <form onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div>
                    <label style={LABEL}>Nome completo</label>
                    <input type="text" value={form.name} onChange={set("name")} placeholder="Seu nome" className="input-dark" autoComplete="name" />
                  </div>
                  <div>
                    <label style={LABEL}>E-mail</label>
                    <input type="email" value={form.email} onChange={set("email")} placeholder="seu@email.com" className="input-dark" autoComplete="email" />
                  </div>
                  <div>
                    <label style={LABEL}>Senha</label>
                    <div style={{ position: "relative" }}>
                      <input type={showPass ? "text" : "password"} value={form.password} onChange={set("password")}
                        placeholder="Mínimo 6 caracteres" className="input-dark" style={{ paddingRight: "52px" }} autoComplete="new-password" />
                      <button type="button"
                        style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", background: "transparent", border: "none", cursor: "pointer", minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}
                        onClick={() => setShowPass(!showPass)} aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}>
                        {showPass ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label style={LABEL}>Confirmar senha</label>
                    <input type="password" value={form.confirm} onChange={set("confirm")} placeholder="Repita a senha" className="input-dark" autoComplete="new-password" />
                  </div>
                  <button type="submit" disabled={loading} className="btn-gold" style={{ width: "100%", marginTop: "4px", borderRadius: "16px", minHeight: "54px" }}>
                    {loading
                      ? "Enviando código…"
                      : <><Mail size={14} /><span>Enviar código de verificação</span></>
                    }
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
                  Já tem conta?{" "}
                  <Link to="/login" style={{ color: "var(--gold)", textDecoration: "none", fontWeight: 500 }}>Entrar</Link>
                </p>
                <p style={{ textAlign: "center", fontSize: "13px", color: "var(--text-faint)", marginTop: "12px" }}>
                  <Link to="/" style={{ color: "var(--text-faint)", textDecoration: "none" }}>← Voltar ao início</Link>
                </p>
              </>
            )}

            {/* ── STEP 2: OTP ── */}
            {step === "otp" && (
              <>
                <button onClick={() => setStep("form")}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "13px", fontFamily: "DM Sans, sans-serif", padding: "0 0 24px", minHeight: "44px" }}>
                  <ChevronLeft size={16} strokeWidth={1.5} /> Voltar
                </button>

                <div style={{ textAlign: "center", marginBottom: "clamp(24px,4vw,36px)" }}>
                  <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: "rgba(198,168,112,0.10)", border: "1px solid var(--border-soft)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto clamp(16px,3vw,22px)" }}>
                    <KeyRound size={24} style={{ color: "var(--gold)" }} strokeWidth={1.5} />
                  </div>
                  <p className="overline" style={{ color: "var(--gold)", marginBottom: "8px" }}>Verificação</p>
                  <h1 className="font-display" style={{ fontSize: "clamp(30px,4vw,44px)", fontWeight: 300, color: "var(--text-primary)", marginBottom: "12px" }}>
                    Código enviado
                  </h1>
                  <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.78 }}>
                    Digite o código de 4 dígitos enviado para<br />
                    <strong style={{ color: "var(--text-primary)", fontWeight: 500 }}>{form.email}</strong>
                  </p>
                </div>

                <form onSubmit={handleVerify} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div>
                    <label style={LABEL}>Código de verificação</label>
                    <input
                      type="text" inputMode="numeric" pattern="[0-9]*" maxLength={4}
                      value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="• • • •" className="input-dark"
                      style={{ textAlign: "center", fontSize: "clamp(24px,5vw,32px)", letterSpacing: "0.38em", fontFamily: "Montserrat, sans-serif", fontWeight: 500, minHeight: "64px" }}
                      autoFocus
                    />
                  </div>
                  <button type="submit" disabled={loading} className="btn-gold" style={{ width: "100%", borderRadius: "16px", minHeight: "54px" }}>
                    {loading ? "Verificando…" : <><span>Confirmar e criar conta</span><ArrowRight size={14} /></>}
                  </button>
                </form>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", marginTop: "20px" }}>
                  <button
                    onClick={async () => {
                      setLoading(true);
                      const r = await sendOtp(form.email);
                      setLoading(false);
                      if (r.error) toast.error(r.error);
                      else toast.success("Novo código enviado!");
                    }}
                    style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "14px", color: "var(--gold)", padding: "10px", minHeight: "44px", fontFamily: "DM Sans, sans-serif" }}>
                    Reenviar código
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
