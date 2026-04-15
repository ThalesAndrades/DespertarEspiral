/**
 * ThankYouPage — /obrigado — Mobile-first, full theme coverage
 * Fixes: var(--surface-2) → var(--bg-surface-2) | var(--bg-base) tokens
 */
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import SpiralLogo from "@/components/layout/SpiralLogo";
import { CheckCircle, ArrowRight, Mail, Copy, Check, Star, Shield, Infinity as InfinityIcon, Clock, BookOpen, Users, Award } from "lucide-react";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2200);
        });
      }}
      style={{
        display: "inline-flex", alignItems: "center", gap: "5px",
        background: "transparent", border: "1px solid var(--border-soft)",
        borderRadius: "8px", padding: "6px 14px", cursor: "pointer",
        color: copied ? "var(--sage)" : "var(--text-muted)",
        fontFamily: "Montserrat, sans-serif", fontSize: "9px",
        letterSpacing: "0.12em", textTransform: "uppercase",
        transition: "all 0.2s", flexShrink: 0, minHeight: "36px",
      }}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? "Copiado!" : "Copiar"}
    </button>
  );
}

function StepItem({ num, title, desc, icon: Icon, status = "pending" }: {
  num: string; title: string; desc: string;
  icon: React.ElementType; status?: "done" | "active" | "pending";
}) {
  const colors = {
    done:    { bg: "rgba(140,170,150,0.10)", border: "rgba(140,170,150,0.30)", num: "var(--sage)", icon: "var(--sage)" },
    active:  { bg: "rgba(198,168,112,0.08)", border: "rgba(198,168,112,0.30)", num: "var(--gold)", icon: "var(--gold)" },
    pending: { bg: "var(--bg-surface-2)",    border: "var(--border-subtle)",   num: "var(--text-faint)", icon: "var(--text-faint)" },
  }[status];

  return (
    <div style={{
      display: "flex", gap: "clamp(12px,3vw,20px)", alignItems: "flex-start",
      padding: "clamp(14px,2.5vw,20px) clamp(14px,3vw,22px)",
      background: colors.bg, border: `1px solid ${colors.border}`,
      borderRadius: "clamp(14px,2vw,18px)", transition: "border-color 0.3s",
    }}>
      <div style={{
        width: "clamp(36px,5vw,44px)", height: "clamp(36px,5vw,44px)", borderRadius: "50%",
        background: colors.bg, border: `1px solid ${colors.border}`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Icon size={clamp(15, 2, 18)} style={{ color: colors.icon }} strokeWidth={1.5} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
          <span className="font-label" style={{ fontSize: "8px", color: colors.num, letterSpacing: "0.22em", textTransform: "uppercase" }}>
            Passo {num}
          </span>
          {status === "done"   && <span style={{ fontSize: "8px", color: "var(--sage)", fontFamily: "Montserrat" }}>✓ concluído</span>}
          {status === "active" && <span style={{ fontSize: "8px", color: "var(--gold)", fontFamily: "Montserrat", animation: "pulseOpacity 2s ease-in-out infinite" }}>● aguardando</span>}
        </div>
        <p style={{ fontSize: "clamp(13px,1.6vw,15px)", color: "var(--text-primary)", fontWeight: 500, marginBottom: "4px", lineHeight: 1.4 }}>{title}</p>
        <p style={{ fontSize: "clamp(12px,1.4vw,13px)", color: "var(--text-secondary)", lineHeight: 1.72 }}>{desc}</p>
      </div>
    </div>
  );
}

// Helper to avoid TS issues
function clamp(min: number, _: number, max: number) { return Math.max(min, Math.min(max, 16)); }

export default function ThankYouPage() {
  const [params] = useSearchParams();
  const confettiRef = useRef<HTMLDivElement>(null);

  const orderId      = params.get("orderId")  ?? "";
  const productSlug  = params.get("slug")     ?? "mulher-espiral";
  const productTitle = params.get("title")    ?? "Mulher Espiral";
  const buyerEmail   = params.get("email")    ?? "";
  const payMethod    = (params.get("method")  ?? "pix") as "pix" | "credit" | "boleto";
  const invoiceUrl   = params.get("invoiceUrl") ?? "";
  const pixKey       = params.get("pixKey")   ?? "";
  const shortId      = orderId ? orderId.slice(0, 8).toUpperCase() : "—";

  // Suppress unused warning
  void productSlug;

  /* CSS confetti burst */
  useEffect(() => {
    const el = confettiRef.current;
    if (!el) return;
    const colors = ["#c6a870", "#dac394", "#c99aaa", "#a49ed0", "#8caa96"];
    const particles = Array.from({ length: 24 }, (_, i) => {
      const p = document.createElement("div");
      const color = colors[i % colors.length];
      const angle = (i / 24) * 360;
      const dist  = 70 + Math.random() * 100;
      const dx = Math.cos((angle * Math.PI) / 180) * dist;
      const dy = Math.sin((angle * Math.PI) / 180) * dist - 36;
      const sheet = document.createElement("style");
      sheet.textContent = `@keyframes burst${i} {
        0%   { opacity:1; transform: translate(-50%,-50%) scale(0); }
        60%  { opacity:1; }
        100% { opacity:0; transform: translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1) rotate(${Math.random()*360}deg); }
      }`;
      document.head.appendChild(sheet);
      p.style.cssText = `position:absolute;width:5px;height:5px;border-radius:${Math.random()>0.5?"50%":"2px"};background:${color};top:50%;left:50%;animation:burst${i} 1.1s cubic-bezier(.22,1,.36,1) forwards;opacity:0;`;
      el.appendChild(p);
      return { p, sheet };
    });
    return () => particles.forEach(({ p, sheet }) => { p.remove(); sheet.remove(); });
  }, []);

  return (
    <div style={{
      minHeight: "100dvh", background: "var(--bg-surface)", color: "var(--text-primary)",
      display: "flex", flexDirection: "column", alignItems: "center", overflowX: "hidden",
    }}>
      {/* Gold glow */}
      <div aria-hidden="true" style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, background: "radial-gradient(ellipse 70% 50% at 50% 20%, var(--gold-glow) 0%, transparent 65%)" }} />

      {/* Nav */}
      <header style={{
        width: "100%", padding: "clamp(16px,3vw,28px) clamp(16px,5vw,24px)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 2,
        background: "var(--nav-bg)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border-subtle)",
      }}>
        <Link to="/" style={{ textDecoration: "none" }}>
          <SpiralLogo variant="dark" size={28} autoTheme />
        </Link>
        <span className="font-label" style={{ fontSize: "9px", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--text-muted)" }}>
          Área do membro
        </span>
      </header>

      <main style={{
        position: "relative", zIndex: 1, width: "100%",
        maxWidth: "680px", padding: "0 clamp(16px,5vw,24px) clamp(60px,10vw,100px)",
        display: "flex", flexDirection: "column", alignItems: "center",
      }}>
        {/* Hero icon */}
        <div style={{ position: "relative", width: "80px", height: "80px", margin: "clamp(28px,5vw,48px) auto clamp(20px,3vw,28px)" }}>
          <div ref={confettiRef} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
          <div style={{
            width: "80px", height: "80px", borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(198,168,112,0.16) 0%, rgba(198,168,112,0.06) 100%)",
            border: "1px solid rgba(198,168,112,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 40px rgba(198,168,112,0.18)",
          }}>
            <CheckCircle size={34} style={{ color: "var(--gold)" }} strokeWidth={1.2} />
          </div>
        </div>

        {/* Stars */}
        <div style={{ display: "flex", gap: "5px", justifyContent: "center", marginBottom: "18px" }}>
          {[...Array(5)].map((_, i) => <Star key={i} size={13} fill="var(--gold)" style={{ color: "var(--gold)" }} />)}
        </div>

        {/* Headline */}
        <p className="overline" style={{ color: "var(--gold)", letterSpacing: "0.28em", marginBottom: "12px", textAlign: "center" }}>
          Pedido registrado com sucesso
        </p>
        <h1 className="font-display text-balance" style={{
          fontSize: "clamp(30px,5.5vw,58px)", fontWeight: 300, fontStyle: "italic",
          lineHeight: 1.08, textAlign: "center", marginBottom: "14px", color: "var(--text-primary)",
        }}>
          Bem-vinda à sua jornada,<br />
          <span style={{ color: "var(--gold)" }}>Mulher Espiral.</span>
        </h1>
        <p style={{
          fontSize: "clamp(14px,1.8vw,16px)", color: "var(--text-secondary)",
          lineHeight: 1.85, textAlign: "center", maxWidth: "520px", marginBottom: "clamp(28px,5vw,44px)",
        }}>
          Estamos ansiosas para te ver florescer. Siga os passos abaixo para garantir seu acesso ao{" "}
          <strong style={{ color: "var(--text-primary)" }}>{productTitle}</strong>.
        </p>

        {/* Order number card */}
        <div style={{
          width: "100%",
          background: "linear-gradient(135deg, rgba(198,168,112,0.10) 0%, rgba(198,168,112,0.04) 100%)",
          border: "1px solid rgba(198,168,112,0.28)", borderRadius: "clamp(16px,2.5vw,22px)",
          padding: "clamp(18px,4vw,28px)", marginBottom: "clamp(16px,3vw,24px)",
          display: "flex", flexDirection: "column", gap: "clamp(12px,2vw,18px)",
        }}>
          <p className="overline" style={{ color: "var(--gold)", fontSize: "8px", letterSpacing: "0.25em" }}>Número do pedido</p>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
            <p className="font-display" style={{ fontSize: "clamp(28px,5vw,42px)", color: "var(--gold)", fontWeight: 300, lineHeight: 1, letterSpacing: "0.06em" }}>
              #{shortId}
            </p>
            {orderId && <CopyButton text={shortId} />}
          </div>

          <hr className="divider-gold" />

          {buyerEmail && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Mail size={14} style={{ color: "var(--lavender)", flexShrink: 0 }} strokeWidth={1.5} />
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                Instruções enviadas para <strong style={{ color: "var(--text-primary)" }}>{buyerEmail}</strong>
              </p>
            </div>
          )}

          {/* Payment instructions — dynamic per method */}
          {payMethod === "pix" && (
            <div style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border-subtle)", borderRadius: "12px", padding: "clamp(12px,2vw,16px)" }}>
              <p className="font-label" style={{ fontSize: "8px", color: "var(--text-muted)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "10px" }}>
                Chave PIX para pagamento
              </p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                <code style={{ fontSize: "clamp(12px,1.5vw,14px)", color: "var(--text-primary)", flex: 1, wordBreak: "break-all" }}>
                  contato@despertarespiral.com
                </code>
                <CopyButton text="contato@despertarespiral.com" />
              </div>
            </div>
          )}

          {payMethod === "credit" && (
            <div style={{ background: "var(--bg-surface-2)", border: "1px solid rgba(164,158,208,0.20)", borderRadius: "12px", padding: "clamp(12px,2vw,16px)" }}>
              <p className="font-label" style={{ fontSize: "8px", color: "var(--lavender)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "8px" }}>
                Pagamento via cartão
              </p>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.72 }}>
                O link de pagamento seguro foi enviado para <strong style={{ color: "var(--text-primary)" }}>{buyerEmail || "seu e-mail"}</strong>. Clique no link para inserir os dados do cartão e confirmar em até 12×.
              </p>
            </div>
          )}

          {payMethod === "boleto" && (
            <div style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border-subtle)", borderRadius: "12px", padding: "clamp(12px,2vw,16px)" }}>
              <p className="font-label" style={{ fontSize: "8px", color: "var(--text-muted)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "8px" }}>
                Boleto bancário
              </p>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.72 }}>
                O boleto foi enviado para <strong style={{ color: "var(--text-primary)" }}>{buyerEmail || "seu e-mail"}</strong>. Pague até a data de vencimento (3 dias úteis). Acesso liberado em até 1 dia útil após compensação.
              </p>
            </div>
          )}

          <p style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.72 }}>
            {payMethod === "pix"
              ? <>Após o pagamento, envie o comprovante com o número <strong style={{ color: "var(--text-primary)" }}>#{shortId}</strong> para{" "}<a href="mailto:contato@despertarespiral.com" style={{ color: "var(--gold)", textDecoration: "none" }}>contato@despertarespiral.com</a>. Acesso liberado em até 1h.</>
              : <>Em caso de dúvidas, entre em contato com o número <strong style={{ color: "var(--text-primary)" }}>#{shortId}</strong> pelo e-mail{" "}<a href="mailto:contato@despertarespiral.com" style={{ color: "var(--gold)", textDecoration: "none" }}>contato@despertarespiral.com</a>.</>}
          </p>
        </div>

        {/* Steps */}
        <div style={{ width: "100%", marginBottom: "clamp(20px,3vw,32px)" }}>
          <p className="overline" style={{ color: "var(--text-muted)", letterSpacing: "0.22em", marginBottom: "clamp(12px,2vw,18px)" }}>
            Próximos passos
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <StepItem num="01" icon={CheckCircle} status="done"   title="Pedido registrado" desc="Seus dados foram salvos com segurança e o pedido está aguardando pagamento." />
            <StepItem num="02" icon={Mail}        status="active"
              title={payMethod === "pix" ? "Efetue o pagamento via PIX" : payMethod === "credit" ? "Pague via link de cartão" : "Pague o boleto bancário"}
              desc={payMethod === "pix" ? `Transfira para a chave PIX e envie o comprovante com o nº #${shortId}.` : payMethod === "credit" ? "Acesse o link no seu e-mail e insira os dados do cartão para confirmar." : "Abra o boleto no seu e-mail e pague em qualquer banco até o vencimento."}
            />
            <StepItem num="03" icon={BookOpen}    status="pending" title="Receba a confirmação" desc="Nossa equipe confirma e libera seu acesso em até 1h (dias úteis)." />
            <StepItem num="04" icon={Award}       status="pending" title="Acesse seu curso" desc={`Entre na sua conta e comece ${productTitle} no seu ritmo.`} />
          </div>
        </div>

        {/* CTAs */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "10px", marginBottom: "clamp(20px,3vw,32px)" }}>
          <Link to="/dashboard" className="btn-gold" style={{ width: "100%", justifyContent: "center" }}>
            Ir para minha área <ArrowRight size={14} />
          </Link>
          <Link to="/login" className="btn-outline-gold" style={{ width: "100%", justifyContent: "center" }}>
            Criar / acessar conta
          </Link>
        </div>

        {/* Guarantees */}
        <div style={{
          width: "100%", display: "flex", justifyContent: "center",
          gap: "clamp(12px,3vw,24px)", flexWrap: "wrap",
          padding: "clamp(16px,3vw,22px)",
          background: "var(--bg-surface-2)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "clamp(14px,2vw,18px)", marginBottom: "clamp(28px,5vw,44px)",
        }}>
          {[
            { icon: Shield,   label: "7 dias de garantia"   },
            { icon: InfinityIcon, label: "Acesso vitalício"      },
            { icon: Users,    label: "Comunidade exclusiva"  },
            { icon: Clock,    label: "Suporte humanizado"    },
          ].map(({ icon: Icon, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "7px" }}>
              <Icon size={12} style={{ color: "var(--text-muted)" }} strokeWidth={1.5} />
              <span className="font-label" style={{ fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)" }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Quote */}
        <div style={{ textAlign: "center", maxWidth: "400px" }}>
          <p className="font-display" style={{ fontSize: "clamp(18px,2.5vw,22px)", fontStyle: "italic", fontWeight: 300, color: "var(--text-secondary)", lineHeight: 1.55, marginBottom: "10px" }}>
            "Você não está começando do zero.<br />Você está começando com tudo que já é."
          </p>
          <p className="overline" style={{ color: "var(--text-faint)", fontSize: "8px", letterSpacing: "0.22em" }}>
            — Sunyan Nunes
          </p>
        </div>
      </main>

      <style>{`
        @keyframes pulseOpacity { 0%,100% { opacity:0.5; } 50% { opacity:1; } }
      `}</style>
    </div>
  );
}
