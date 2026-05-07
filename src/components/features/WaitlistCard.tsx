/**
 * WaitlistCard — Pre-launch capture component
 * Captures: name + email + phone (optional)
 * Shows: live counter, urgency pulse, success state
 * Stores: launch_waitlist table via Supabase
 */
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowRight, Loader2, Bell, CheckCircle, Users, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface WaitlistEntry {
  name: string;
  email: string;
  phone: string;
}

const EMPTY: WaitlistEntry = { name: "", email: "", phone: "" };

/* ── Animated counter ── */
function AnimatedCount({ target }: { target: number }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (target === 0) return;
    let start: number | null = null;
    const duration = 1400;
    const step = (ts: number) => {
      if (!start) start = ts;
      const pct = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - pct, 3);
      setDisplay(Math.round(ease * target));
      if (pct < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target]);

  return <>{display.toLocaleString("pt-BR")}</>;
}

export default function WaitlistCard() {
  const [form,       setForm]       = useState<WaitlistEntry>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [done,       setDone]       = useState(false);
  const [count,      setCount]      = useState(0);
  const [errors,     setErrors]     = useState<Partial<WaitlistEntry>>({});

  /* ── Fetch count on mount ── */
  useEffect(() => {
    (async () => {
      const { count: c } = await supabase
        .from("launch_waitlist")
        .select("*", { count: "exact", head: true });
      setCount((c ?? 0) + 147); // seed offset for social proof
    })();
  }, []);

  /* ── Validation ── */
  function validate(): boolean {
    const e: Partial<WaitlistEntry> = {};
    if (!form.name.trim())                         e.name  = "Informe seu nome.";
    if (!form.email.trim())                        e.email = "Informe seu email.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Email inválido.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  /* ── Submit ── */
  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    const { error } = await supabase.from("launch_waitlist").insert({
      name:   form.name.trim(),
      email:  form.email.trim().toLowerCase(),
      phone:  form.phone.trim() || null,
      source: "landing_waitlist",
    });

    setSubmitting(false);

    if (error) {
      // Duplicate email — still show success to avoid enumeration
      if (error.code === "23505") {
        setDone(true);
        return;
      }
      toast.error("Não foi possível salvar. Tente novamente.");
      console.error("waitlist insert:", error);
      return;
    }

    setCount((c) => c + 1);
    setDone(true);
  };

  const set = (field: keyof WaitlistEntry) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((p) => ({ ...p, [field]: e.target.value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: undefined }));
  };

  /* ═══════════════════════════════
     SUCCESS STATE
  ═══════════════════════════════ */
  if (done) {
    return (
      <div style={{
        maxWidth: "560px", margin: "0 auto",
        padding: "clamp(32px,5vw,52px) clamp(24px,4vw,40px)",
        borderRadius: "clamp(18px,2.5vw,26px)",
        background: "linear-gradient(135deg, rgba(140,170,150,0.12) 0%, rgba(12,15,34,0.90) 100%)",
        border: "1px solid rgba(140,170,150,0.35)",
        boxShadow: "0 24px 80px rgba(0,0,0,0.50)",
        textAlign: "center",
        animation: "popIn 0.5s cubic-bezier(.34,1.56,.64,1) both",
      }}>
        <div style={{
          width: "64px", height: "64px", borderRadius: "50%", margin: "0 auto 20px",
          background: "rgba(140,170,150,0.14)", border: "1.5px solid rgba(140,170,150,0.36)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <CheckCircle size={28} style={{ color: "var(--sage)" }} strokeWidth={1.5} />
        </div>

        <p className="overline" style={{ color: "var(--sage)", marginBottom: "10px", fontSize: "9px" }}>
          Você está na lista
        </p>
        <h3 className="font-display" style={{
          fontSize: "clamp(24px,3.5vw,36px)", fontWeight: 300, color: "var(--text-primary)",
          lineHeight: 1.15, marginBottom: "12px",
        }}>
          Te vemos no lançamento. ✦
        </h3>
        <p style={{
          fontSize: "clamp(14px,1.6vw,16px)", color: "var(--text-muted)",
          lineHeight: 1.82, marginBottom: "24px",
        }}>
          Você será avisada com antecedência e terá acesso a condições especiais de pré-lançamento — exclusivas para quem entrou na lista.
        </p>

        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
          padding: "10px 18px", borderRadius: "100px",
          background: "rgba(140,170,150,0.08)", border: "1px solid rgba(140,170,150,0.20)",
        }}>
          <Users size={13} style={{ color: "var(--sage)" }} strokeWidth={1.5} />
          <span style={{
            fontFamily: "Montserrat, sans-serif", fontSize: "12px",
            color: "var(--sage)",
          }}>
            <AnimatedCount target={count} /> pessoas já na lista
          </span>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════
     FORM STATE
  ═══════════════════════════════ */
  return (
    <div style={{
      maxWidth: "560px", margin: "0 auto",
      borderRadius: "clamp(18px,2.5vw,26px)",
      background: "linear-gradient(160deg, rgba(198,168,112,0.09) 0%, rgba(12,15,34,0.94) 40%)",
      border: "1px solid rgba(198,168,112,0.28)",
      boxShadow: "0 28px 80px rgba(0,0,0,0.55), 0 0 0 0.5px rgba(198,168,112,0.12)",
      overflow: "hidden",
      position: "relative",
    }}>

      {/* Glow accent */}
      <div aria-hidden="true" style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "2px",
        background: "linear-gradient(90deg, transparent, rgba(198,168,112,0.70), transparent)",
        pointerEvents: "none",
      }} />
      <div aria-hidden="true" style={{
        position: "absolute", top: "-80px", right: "-60px", width: "300px", height: "300px",
        borderRadius: "50%", background: "radial-gradient(circle, rgba(198,168,112,0.07) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{ padding: "clamp(28px,4vw,44px) clamp(24px,4vw,40px)" }}>

        {/* Header */}
        <div style={{ marginBottom: "clamp(22px,3vw,30px)" }}>
          {/* Bell icon + live badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
            <div style={{
              width: "40px", height: "40px", borderRadius: "12px", flexShrink: 0,
              background: "rgba(198,168,112,0.10)", border: "1px solid rgba(198,168,112,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Bell size={17} style={{ color: "var(--gold)" }} strokeWidth={1.5} />
            </div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "7px",
              padding: "5px 12px", borderRadius: "100px",
              background: "rgba(201,154,170,0.10)", border: "1px solid rgba(201,154,170,0.24)",
            }}>
              {/* Pulse dot */}
              <span style={{ position: "relative", width: "7px", height: "7px", display: "inline-flex" }}>
                <span style={{
                  position: "absolute", inset: 0, borderRadius: "50%",
                  background: "var(--rose)", opacity: 0.6,
                  animation: "communityPulse 2s ease-out infinite",
                }} />
                <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "var(--rose)", display: "block" }} />
              </span>
              <span style={{
                fontFamily: "Montserrat, sans-serif", fontSize: "8.5px",
                letterSpacing: "0.20em", textTransform: "uppercase",
                color: "var(--rose)", fontWeight: 500,
              }}>Em breve</span>
            </div>
          </div>

          <h3 className="font-display" style={{
            fontSize: "clamp(24px,3.5vw,38px)", fontWeight: 300, lineHeight: 1.12,
            color: "var(--text-primary)", marginBottom: "10px",
          }}>
            Garanta seu lugar<br />
            <span style={{ color: "var(--gold)", fontStyle: "italic" }}>antes de todo mundo.</span>
          </h3>
          <p style={{
            fontSize: "clamp(13px,1.5vw,15px)", color: "var(--text-muted)",
            lineHeight: 1.82,
          }}>
            Entre na lista e seja avisada em primeira mão — com acesso antecipado e condições exclusivas de lançamento.
          </p>
        </div>

        {/* Live counter */}
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "10px 14px", borderRadius: "12px", marginBottom: "22px",
          background: "rgba(198,168,112,0.06)", border: "1px solid rgba(198,168,112,0.14)",
        }}>
          <Users size={14} style={{ color: "var(--gold)", flexShrink: 0 }} strokeWidth={1.5} />
          <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            <span style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, color: "var(--gold)" }}>
              <AnimatedCount target={count} />
            </span>
            {" "}pessoas já na lista de espera
          </span>
          <Sparkles size={12} style={{ color: "var(--gold-dim)", marginLeft: "auto", flexShrink: 0 }} strokeWidth={1.5} />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

          {/* Name */}
          <div>
            <label
              htmlFor="wl-name"
              style={{
                display: "block", fontFamily: "Montserrat, sans-serif",
                fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase",
                color: "var(--text-muted)", marginBottom: "7px",
              }}
            >
              Seu nome *
            </label>
            <input
              id="wl-name"
              type="text"
              value={form.name}
              onChange={set("name")}
              placeholder="Como posso te chamar?"
              className="input-dark"
              style={{ borderRadius: "12px", borderColor: errors.name ? "rgba(201,80,80,0.50)" : undefined }}
              autoComplete="given-name"
              maxLength={80}
            />
            {errors.name && (
              <p style={{ fontSize: "11px", color: "#e07070", marginTop: "5px", fontFamily: "Montserrat, sans-serif" }}>
                {errors.name}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="wl-email"
              style={{
                display: "block", fontFamily: "Montserrat, sans-serif",
                fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase",
                color: "var(--text-muted)", marginBottom: "7px",
              }}
            >
              Seu melhor email *
            </label>
            <input
              id="wl-email"
              type="email"
              value={form.email}
              onChange={set("email")}
              placeholder="seu@email.com"
              className="input-dark"
              style={{ borderRadius: "12px", borderColor: errors.email ? "rgba(201,80,80,0.50)" : undefined }}
              autoComplete="email"
              inputMode="email"
            />
            {errors.email && (
              <p style={{ fontSize: "11px", color: "#e07070", marginTop: "5px", fontFamily: "Montserrat, sans-serif" }}>
                {errors.email}
              </p>
            )}
          </div>

          {/* Phone (optional) */}
          <div>
            <label
              htmlFor="wl-phone"
              style={{
                display: "block", fontFamily: "Montserrat, sans-serif",
                fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase",
                color: "var(--text-muted)", marginBottom: "7px",
              }}
            >
              WhatsApp{" "}
              <span style={{ color: "var(--text-faint)", fontStyle: "italic", textTransform: "none", letterSpacing: "0", fontFamily: "DM Sans, sans-serif" }}>
                (opcional — avisamos por lá também)
              </span>
            </label>
            <input
              id="wl-phone"
              type="tel"
              value={form.phone}
              onChange={set("phone")}
              placeholder="(11) 9 8765-4321"
              className="input-dark"
              style={{ borderRadius: "12px" }}
              autoComplete="tel"
              inputMode="tel"
              maxLength={20}
            />
          </div>

          {/* CTA */}
          <button
            type="submit"
            disabled={submitting}
            className="btn-gold"
            style={{
              width: "100%", justifyContent: "center",
              borderRadius: "14px", minHeight: "56px",
              fontSize: "10px", marginTop: "4px",
            }}
          >
            {submitting ? (
              <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Enviando…</>
            ) : (
              <>Quero ser avisada <ArrowRight size={14} /></>
            )}
          </button>

          <p style={{
            textAlign: "center", fontSize: "11px",
            color: "var(--text-faint)", lineHeight: 1.7,
            fontFamily: "Montserrat, sans-serif",
          }}>
            ✓ Sem spam · ✓ Você pode sair quando quiser · ✓ Seus dados são protegidos
          </p>
        </form>
      </div>
    </div>
  );
}
