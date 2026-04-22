/**
 * ResetPasswordPage — Handles Supabase password-reset magic-link callback
 * Supabase sends the user here with a recovery token in the URL hash.
 * We detect the USER_UPDATED / SIGNED_IN event via onAuthStateChange,
 * allow the user to set a new password, then redirect to /dashboard.
 */
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import SpiralLogo from "@/components/layout/SpiralLogo";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowRight, KeyRound, Loader2 } from "lucide-react";
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

export default function ResetPasswordPage() {
  const navigate = useNavigate();

  const [ready,     setReady]     = useState(false);   // true once recovery session is established
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [showPass,  setShowPass]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [invalid,   setInvalid]   = useState(false);   // link expired / already used

  // Supabase injects the recovery token into the URL hash (#access_token=...&type=recovery)
  // and fires onAuthStateChange with event "PASSWORD_RECOVERY". If detection
  // ran before this component mounted, fall back to checking for an active
  // session alongside the recovery marker in the URL.
  useEffect(() => {
    let cancelled = false;

    const hashHasRecovery = /[#&?]type=recovery/.test(window.location.hash + window.location.search);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        if (!cancelled) setReady(true);
      }
    });

    // Race-safe fallback: if PASSWORD_RECOVERY already fired before the
    // subscription attached, getSession() will still return the recovery session.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled && session && hashHasRecovery) setReady(true);
    });

    // After 8s with no recovery session, show invalid-link UI.
    const timer = setTimeout(() => {
      if (!cancelled) {
        setReady((prevReady) => {
          if (!prevReady) setInvalid(true);
          return prevReady;
        });
      }
    }, 8000);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) { toast.error("A senha deve ter no mínimo 6 caracteres."); return; }
    if (password !== confirm) { toast.error("As senhas não coincidem."); return; }

    setLoading(true);
    const { error, data } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Senha atualizada com sucesso. ✦");

    // Invalidate sessions on other devices after a password reset.
    await supabase.auth.signOut({ scope: "others" }).catch(() => {});

    // Sequenzy: password reset completed → triggers "Senha redefinida" sequence
    if (data?.user?.email) {
      fireEventAsync("user.password_reset_completed", {
        email: data.user.email,
        firstName: data.user.user_metadata?.full_name?.split(" ")[0] ?? "",
        properties: { completed_at: new Date().toISOString() },
      });
    }

    navigate("/dashboard");
  };

  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      background: "var(--bg-surface)",
      color: "var(--text-primary)",
    }}>
      {/* Header */}
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
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "clamp(32px,6vw,64px) clamp(20px,5vw,32px)",
      }}>
        <div style={{ width: "100%", maxWidth: "380px" }}>

          {/* Icon */}
          <div style={{
            width: "64px", height: "64px", borderRadius: "50%",
            background: "rgba(198,168,112,0.10)", border: "1px solid var(--border-soft)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto clamp(20px,3vw,28px)",
          }}>
            <KeyRound size={26} style={{ color: "var(--gold)" }} strokeWidth={1.5} />
          </div>

          <p className="overline" style={{ color: "var(--gold)", marginBottom: "8px", textAlign: "center" }}>
            Redefinir senha
          </p>
          <h1 className="font-display" style={{
            fontSize: "clamp(30px,4.5vw,46px)", fontWeight: 300,
            textAlign: "center", color: "var(--text-primary)", marginBottom: "12px",
          }}>
            Nova senha
          </h1>

          {/* Link invalid */}
          {invalid && !ready && (
            <div className="card-dark" style={{ padding: "20px", textAlign: "center", marginTop: "16px" }}>
              <p style={{ fontSize: "14px", color: "var(--rose)", lineHeight: 1.7, marginBottom: "16px" }}>
                Link de recuperação inválido ou expirado.
              </p>
              <Link to="/forgot-password" className="btn-outline-gold" style={{ fontSize: "9px", padding: "10px 24px" }}>
                Solicitar novo link
              </Link>
            </div>
          )}

          {/* Waiting for recovery token */}
          {!ready && !invalid && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "14px", marginTop: "32px" }}>
              <Loader2 size={22} style={{ color: "var(--gold)", animation: "spin 1s linear infinite" }} />
              <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Validando link de recuperação…</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* Form — shown after recovery event */}
          {ready && (
            <>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.8, textAlign: "center", marginBottom: "28px" }}>
                Escolha uma nova senha para acessar sua conta.
              </p>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={LABEL}>Nova senha</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres (sua escolha)"
                      className="input-dark"
                      autoComplete="new-password"
                      style={{ paddingRight: "52px", borderRadius: "14px" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}
                      style={{
                        position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)",
                        background: "transparent", border: "none", cursor: "pointer",
                        color: "var(--text-muted)", minWidth: "44px", minHeight: "44px",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      {showPass ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={LABEL}>Confirmar nova senha</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repita a senha"
                    className="input-dark"
                    autoComplete="new-password"
                    style={{ borderRadius: "14px" }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-gold"
                  style={{ width: "100%", borderRadius: "16px", minHeight: "54px" }}
                >
                  {loading
                    ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Salvando…</>
                    : <><span>Salvar nova senha</span><ArrowRight size={14} /></>
                  }
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
