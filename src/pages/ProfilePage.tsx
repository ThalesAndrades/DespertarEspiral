/**
 * ProfilePage — /perfil
 * Aluna pode editar nome, nome anônimo e senha.
 * Mobile-first, integrado ao Supabase.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { User, Shield, KeyRound, Check, Loader2, Eye, EyeOff, LogOut } from "lucide-react";

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

export default function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();

  /* Profile form */
  const [name,          setName]          = useState(user?.name ?? "");
  const [anonymousName, setAnonymousName] = useState(user?.anonymous_name ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  /* Password form */
  const [currentPass,   setCurrentPass]   = useState("");
  const [newPass,       setNewPass]       = useState("");
  const [confirmPass,   setConfirmPass]   = useState("");
  const [showCurrent,   setShowCurrent]   = useState(false);
  const [showNew,       setShowNew]       = useState(false);
  const [savingPass,    setSavingPass]    = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Nome não pode estar vazio."); return; }
    setSavingProfile(true);

    // Update auth metadata first — if it fails, the user_profiles table stays
    // untouched so the two stores don't desync.
    const { error: authErr } = await supabase.auth.updateUser({
      data: { full_name: name.trim() },
    });
    if (authErr) {
      toast.error(authErr.message || "Erro ao salvar perfil.");
      setSavingProfile(false);
      return;
    }

    const { error: profileErr } = await supabase
      .from("user_profiles")
      .update({
        full_name:      name.trim(),
        anonymous_name: anonymousName.trim() || user?.anonymous_name,
      })
      .eq("id", user!.id);

    if (profileErr) {
      // Auth succeeded but profile row failed — surface the discrepancy so the
      // user can retry. A subsequent retry is idempotent.
      toast.error(
        `${profileErr.message || "Erro ao salvar perfil."} Tente novamente.`
      );
      setSavingProfile(false);
      return;
    }

    await refreshUser();
    toast.success("Perfil atualizado. ✦");
    setSavingProfile(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPass) { toast.error("Digite a nova senha."); return; }
    if (newPass !== confirmPass) { toast.error("As senhas não coincidem."); return; }
    if (newPass.length < 6) { toast.error("Senha com no mínimo 6 caracteres."); return; }
    setSavingPass(true);

    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Senha alterada com sucesso. ✦");
      setCurrentPass(""); setNewPass(""); setConfirmPass("");
    }
    setSavingPass(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  if (!user) return null;

  return (
    <DashboardLayout>
      <div style={{ maxWidth: "560px", margin: "0 auto", padding: "clamp(20px,4vw,32px) clamp(14px,4vw,24px) clamp(60px,8vw,100px)" }}>

        {/* Header */}
        <div style={{ marginBottom: "clamp(24px,4vw,36px)" }}>
          <p className="overline" style={{ color: "var(--gold)", marginBottom: "8px" }}>Conta</p>
          <h1 className="font-display" style={{ fontSize: "clamp(28px,5vw,44px)", fontWeight: 300, color: "var(--text-primary)" }}>
            Meu Perfil
          </h1>
        </div>

        {/* Avatar card */}
        <div className="card-dark" style={{ padding: "clamp(18px,3vw,24px)", marginBottom: "clamp(16px,2.5vw,20px)", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{
            width: "56px", height: "56px", borderRadius: "50%", flexShrink: 0,
            background: "rgba(198,168,112,0.14)", color: "var(--gold)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "22px", fontFamily: "Montserrat", fontWeight: 500,
            border: "2px solid rgba(198,168,112,0.22)",
          }}>
            {user.name?.charAt(0).toUpperCase() ?? "U"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: "16px", fontWeight: 500, color: "var(--text-primary)", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.name}
            </p>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.email}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
              <span style={{ fontSize: "11px", fontFamily: "Montserrat, sans-serif", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--lavender)" }}>
                {user.anonymous_name}
              </span>
              <span style={{ fontSize: "10px", color: "var(--text-faint)" }}>na comunidade</span>
            </div>
          </div>
          {user.role === "admin" && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "100px", background: "rgba(198,168,112,0.08)", border: "1px solid rgba(198,168,112,0.20)", flexShrink: 0 }}>
              <Shield size={10} style={{ color: "var(--gold)" }} />
              <span style={{ fontSize: "9px", fontFamily: "Montserrat", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--gold)" }}>Admin</span>
            </div>
          )}
        </div>

        {/* Profile form */}
        <div className="card-dark" style={{ padding: "clamp(18px,3vw,24px)", marginBottom: "clamp(16px,2.5vw,20px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "clamp(16px,2.5vw,22px)" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(198,168,112,0.10)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <User size={14} style={{ color: "var(--gold)" }} strokeWidth={1.5} />
            </div>
            <p style={{ fontSize: "15px", fontWeight: 500, color: "var(--text-primary)" }}>Informações pessoais</p>
          </div>

          <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={LABEL}>Nome completo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome completo"
                className="input-dark"
                style={{ borderRadius: "12px" }}
              />
            </div>

            <div>
              <label style={LABEL}>Nome anônimo na comunidade</label>
              <input
                type="text"
                value={anonymousName}
                onChange={(e) => setAnonymousName(e.target.value)}
                placeholder={user.anonymous_name}
                className="input-dark"
                style={{ borderRadius: "12px" }}
              />
              <p style={{ fontSize: "12px", color: "var(--text-faint)", marginTop: "6px", lineHeight: 1.6 }}>
                Este nome é exibido na comunidade. Outros membros não veem seu nome real.
              </p>
            </div>

            <div>
              <label style={LABEL}>E-mail</label>
              <input
                type="email"
                value={user.email}
                disabled
                className="input-dark"
                style={{ borderRadius: "12px", opacity: 0.55, cursor: "not-allowed" }}
              />
              <p style={{ fontSize: "12px", color: "var(--text-faint)", marginTop: "6px" }}>
                Entre em contato para alterar o e-mail.
              </p>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="btn-gold"
              style={{ alignSelf: "flex-start", padding: "12px 28px", fontSize: "9px", borderRadius: "12px", display: "flex", alignItems: "center", gap: "7px" }}
            >
              {savingProfile
                ? <><Loader2 size={13} style={{ animation: "spin 0.8s linear infinite" }} /> Salvando…</>
                : <><Check size={13} /> Salvar alterações</>
              }
            </button>
          </form>
        </div>

        {/* Password form */}
        <div className="card-dark" style={{ padding: "clamp(18px,3vw,24px)", marginBottom: "clamp(16px,2.5vw,20px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "clamp(16px,2.5vw,22px)" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(198,168,112,0.10)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <KeyRound size={14} style={{ color: "var(--gold)" }} strokeWidth={1.5} />
            </div>
            <p style={{ fontSize: "15px", fontWeight: 500, color: "var(--text-primary)" }}>Alterar senha</p>
          </div>

          <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={LABEL}>Nova senha</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showNew ? "text" : "password"}
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="input-dark"
                  style={{ paddingRight: "52px", borderRadius: "12px" }}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", minWidth: "44px", minHeight: "44px" }}
                  aria-label={showNew ? "Ocultar" : "Mostrar"}
                >
                  {showNew ? <EyeOff size={15} strokeWidth={1.5} /> : <Eye size={15} strokeWidth={1.5} />}
                </button>
              </div>
            </div>

            <div>
              <label style={LABEL}>Confirmar nova senha</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showCurrent ? "text" : "password"}
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  placeholder="Repita a senha"
                  className="input-dark"
                  style={{ paddingRight: "52px", borderRadius: "12px" }}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", minWidth: "44px", minHeight: "44px" }}
                  aria-label={showCurrent ? "Ocultar" : "Mostrar"}
                >
                  {showCurrent ? <EyeOff size={15} strokeWidth={1.5} /> : <Eye size={15} strokeWidth={1.5} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={savingPass}
              className="btn-outline-gold"
              style={{ alignSelf: "flex-start", padding: "11px 26px", fontSize: "9px", borderRadius: "12px", display: "flex", alignItems: "center", gap: "7px" }}
            >
              {savingPass
                ? <><Loader2 size={13} style={{ animation: "spin 0.8s linear infinite" }} /> Alterando…</>
                : <><KeyRound size={13} /> Alterar senha</>
              }
            </button>
          </form>
        </div>

        {/* Logout */}
        <div className="card-dark" style={{ padding: "clamp(16px,2.5vw,22px)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
            <div>
              <p style={{ fontSize: "15px", fontWeight: 500, color: "var(--text-primary)", marginBottom: "3px" }}>Sair da conta</p>
              <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Você será redirecionada para a página inicial.</p>
            </div>
            <button
              onClick={handleLogout}
              className="btn-ghost"
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 20px", fontSize: "9px", color: "var(--rose)", borderColor: "rgba(201,154,170,0.30)", flexShrink: 0 }}
            >
              <LogOut size={13} /> Sair
            </button>
          </div>
        </div>

      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </DashboardLayout>
  );
}
