/**
 * CheckoutPage — Mobile-first, theme-aware
 * Stacked layout on mobile (summary first), split grid on desktop
 */
import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import SpiralLogo from "@/components/layout/SpiralLogo";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { MOCK_PRODUCTS } from "@/constants/mockData";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { Shield, CheckCircle, ArrowLeft, ArrowRight, Lock, Loader2, Zap, Star, Users } from "lucide-react";
import { toast } from "sonner";

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

const PAYMENT_METHODS = [
  { id: "pix",    label: "PIX",         sub: "Aprovação imediata", icon: Zap },
  { id: "credit", label: "Cartão",      sub: "12× sem juros",      icon: Shield },
  { id: "boleto", label: "Boleto",      sub: "Vence em 3 dias",    icon: Star },
];

export default function CheckoutPage() {
  const { slug }  = useParams<{ slug: string }>();
  const navigate  = useNavigate();
  const { user }  = useAuth();

  const [product,       setProduct]       = useState(MOCK_PRODUCTS.find((p) => p.slug === slug) ?? MOCK_PRODUCTS[0]);
  const [form,          setForm]          = useState({ name: user?.name ?? "", email: user?.email ?? "" });
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "credit" | "boleto">("pix");
  const [loading,       setLoading]       = useState(false);

  useEffect(() => {
    if (user) setForm({ name: user.name, email: user.email });
  }, [user]);

  useEffect(() => {
    if (!slug) return;
    supabase.from("products").select("*").eq("slug", slug).eq("is_active", true).single()
      .then(({ data }) => {
        if (data) setProduct((prev) => ({
          ...prev, id: data.id, title: data.title,
          subtitle: data.subtitle ?? prev.subtitle,
          description: data.description ?? prev.description,
          price: parseFloat(data.price),
          original_price: data.original_price ? parseFloat(data.original_price) : undefined,
          slug: data.slug,
        }));
      });
  }, [slug]);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) { toast.error("Preencha nome e e-mail."); return; }
    setLoading(true);

    const { data, error } = await supabase.functions.invoke("checkout-session", {
      body: { productSlug: slug, email: form.email, name: form.name, userId: user?.id ?? null, paymentMethod },
    });

    if (error) {
      let msg = error.message;
      if (error instanceof FunctionsHttpError) {
        try { const t = await error.context?.text(); msg = `[${error.context?.status}] ${t || error.message}`; } catch {}
      }
      toast.error(msg);
      setLoading(false);
      return;
    }

    toast.success("Pedido registrado! Verifique seu e-mail. ✦");
    const qs = new URLSearchParams({ orderId: data.orderId ?? "", slug: product.slug, title: product.title, email: form.email });
    navigate(`/obrigado?${qs.toString()}`);
    setLoading(false);
  };

  const savings = (product as { original_price?: number }).original_price
    ? (product as { original_price?: number }).original_price! - product.price
    : null;

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg-surface)", color: "var(--text-primary)" }}>

      {/* ── Top bar ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "var(--nav-bg)",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border-subtle)",
        padding: "0 clamp(16px,5vw,32px)",
        height: "60px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <Link to="/" style={{ textDecoration: "none" }}>
          <SpiralLogo variant="dark" size={28} autoTheme />
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Lock size={11} style={{ color: "var(--text-muted)" }} strokeWidth={1.5} />
          <span className="font-label" style={{ fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)" }}>
            Checkout seguro
          </span>
        </div>
      </header>

      {/* Urgency strip */}
      <div style={{
        background: "linear-gradient(135deg, rgba(198,168,112,0.10) 0%, rgba(201,154,170,0.06) 100%)",
        borderBottom: "1px solid var(--border-subtle)",
        padding: "10px clamp(16px,5vw,32px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: "clamp(12px,3vw,28px)", flexWrap: "wrap",
      }}>
        {[
          { icon: Users, text: "+1.200 mulheres já transformadas" },
          { icon: Star,  text: "4.9 ★ avaliação média" },
          { icon: Shield, text: "7 dias de garantia incondicional" },
        ].map(({ icon: Icon, text }) => (
          <div key={text} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Icon size={11} style={{ color: "var(--gold)" }} strokeWidth={1.5} />
            <span className="font-label" style={{ fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)" }}>{text}</span>
          </div>
        ))}
      </div>

      <div style={{ maxWidth: "1020px", margin: "0 auto", padding: "clamp(20px,4vw,40px) clamp(16px,5vw,24px) clamp(40px,6vw,80px)" }}>

        {/* Back */}
        <button onClick={() => navigate(-1)}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "clamp(20px,3vw,32px)", background: "transparent", border: "none", cursor: "pointer", fontSize: "9px", fontFamily: "Montserrat, sans-serif", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)", padding: 0, minHeight: "44px", transition: "color 0.2s" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--gold)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-muted)")}
        >
          <ArrowLeft size={13} /> Voltar
        </button>

        {/* Mobile: Order summary (top) */}
        <div className="lg:hidden" style={{ marginBottom: "clamp(20px,4vw,32px)" }}>
          <OrderSummary product={product} savings={savings} compact />
        </div>

        <div style={{ display: "grid", gap: "clamp(24px,4vw,40px)" }} className="grid lg:grid-cols-5">

          {/* ── Form col (span 3) ── */}
          <div style={{ gridColumn: "span 3" }}>
            <p className="overline" style={{ color: "var(--gold)", marginBottom: "8px" }}>Finalizar pedido</p>
            <h1 className="font-display" style={{ fontSize: "clamp(26px,4vw,40px)", fontWeight: 300, marginBottom: "8px", color: "var(--text-primary)" }}>
              {user ? `Olá, ${user.name.split(" ")[0]}` : "Seus dados"}
            </h1>
            <p style={{ fontSize: "clamp(13px,1.5vw,15px)", color: "var(--text-secondary)", lineHeight: 1.78, marginBottom: "clamp(20px,3vw,28px)" }}>
              Preencha seus dados para registrar o pedido. As instruções de pagamento chegam no seu e-mail.
            </p>

            {user && (
              <div className="card-dark" style={{ padding: "14px 18px", marginBottom: "clamp(16px,2.5vw,24px)", display: "flex", alignItems: "center", gap: "10px" }}>
                <CheckCircle size={14} style={{ color: "var(--sage)", flexShrink: 0 }} strokeWidth={2} />
                <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                  Logada como <strong style={{ color: "var(--text-primary)" }}>{user.email}</strong>
                </p>
              </div>
            )}

            <form onSubmit={handleCheckout} style={{ display: "flex", flexDirection: "column", gap: "clamp(14px,2vw,18px)" }}>
              <div style={{ display: "grid", gap: "clamp(12px,2vw,16px)" }} className="grid sm:grid-cols-2">
                <div>
                  <label style={LABEL}>Nome completo</label>
                  <input type="text" value={form.name} onChange={set("name")} placeholder="Seu nome" className="input-dark" disabled={!!user} autoComplete="name" style={{ borderRadius: "14px" }} />
                </div>
                <div>
                  <label style={LABEL}>E-mail</label>
                  <input type="email" value={form.email} onChange={set("email")} placeholder="seu@email.com" className="input-dark" disabled={!!user} autoComplete="email" style={{ borderRadius: "14px" }} />
                </div>
              </div>

              {!user && (
                <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.65 }}>
                  Já tem conta?{" "}
                  <Link to="/login" style={{ color: "var(--gold)", textDecoration: "none", fontWeight: 500 }}>Entrar</Link>{" "}
                  para preencher automaticamente.
                </p>
              )}

              {/* Payment method selector */}
              <div>
                <label style={LABEL}>Forma de pagamento</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                  {PAYMENT_METHODS.map(({ id, label, sub, icon: Icon }) => {
                    const active = paymentMethod === id;
                    return (
                      <button
                        key={id} type="button"
                        onClick={() => setPaymentMethod(id as "pix" | "credit" | "boleto")}
                        style={{
                          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                          gap: "5px", padding: "14px 8px",
                          borderRadius: "14px", border: `1.5px solid ${active ? "var(--gold)" : "var(--border-soft)"}`,
                          background: active ? "rgba(198,168,112,0.08)" : "var(--input-bg)",
                          cursor: "pointer", transition: "all 0.2s ease",
                          minHeight: "72px",
                        }}
                      >
                        <Icon size={16} style={{ color: active ? "var(--gold)" : "var(--text-faint)" }} strokeWidth={1.5} />
                        <span className="font-label" style={{ fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: active ? "var(--gold)" : "var(--text-primary)", fontWeight: active ? 600 : 400 }}>{label}</span>
                        <span style={{ fontSize: "10px", color: active ? "var(--text-secondary)" : "var(--text-faint)" }}>{sub}</span>
                      </button>
                    );
                  })}
                </div>
                {paymentMethod === "pix" && (
                  <p style={{ fontSize: "12px", color: "var(--sage)", marginTop: "8px", display: "flex", alignItems: "center", gap: "5px" }}>
                    <Zap size={10} /> Você receberá a chave PIX por e-mail após o registro.
                  </p>
                )}
                {paymentMethod === "credit" && (
                  <p style={{ fontSize: "12px", color: "var(--lavender)", marginTop: "8px" }}>
                    Link de pagamento seguro enviado por e-mail após o registro.
                  </p>
                )}
                {paymentMethod === "boleto" && (
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "8px" }}>
                    Boleto gerado e enviado por e-mail. Vencimento em 3 dias úteis.
                  </p>
                )}
              </div>

              {/* How it works */}
              <div className="card-dark" style={{ padding: "clamp(16px,2.5vw,22px)" }}>
                <p className="overline" style={{ color: "var(--text-muted)", marginBottom: "14px", fontSize: "8px" }}>Como funciona</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "clamp(10px,1.5vw,14px)" }}>
                  {[
                    { n: "01", t: "Registre seu pedido", d: "Seus dados são registrados com segurança." },
                    { n: "02", t: "Receba as instruções", d: `Instruções de pagamento via ${paymentMethod === "pix" ? "PIX" : paymentMethod === "credit" ? "cartão" : "boleto"} chegam ao seu e-mail.` },
                    { n: "03", t: "Acesso liberado", d: "Confirmamos o pagamento e liberamos acesso em até 1h." },
                  ].map(({ n, t, d }) => (
                    <div key={n} style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                      <span className="font-label" style={{ fontSize: "9px", color: "var(--gold)", minWidth: "22px", marginTop: "2px", fontWeight: 600 }}>{n}</span>
                      <div>
                        <p style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500, marginBottom: "2px" }}>{t}</p>
                        <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.6 }}>{d}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-gold" style={{ width: "100%", borderRadius: "16px", minHeight: "56px" }}>
                {loading
                  ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Registrando pedido…</>
                  : <><span>Registrar pedido e receber instruções</span><ArrowRight size={14} /></>
                }
              </button>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                <Shield size={11} style={{ color: "var(--text-muted)" }} strokeWidth={1.5} />
                <span className="font-label" style={{ fontSize: "9px", letterSpacing: "0.14em", color: "var(--text-muted)", textTransform: "uppercase" }}>
                  7 dias de garantia incondicional
                </span>
              </div>
            </form>
          </div>

          {/* ── Desktop: Order summary ── */}
          <div className="hidden lg:block" style={{ gridColumn: "span 2" }}>
            <div style={{ position: "sticky", top: "80px" }}>
              <OrderSummary product={product} savings={savings} />
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ── Order Summary component ── */
function OrderSummary({
  product, savings, compact = false,
}: {
  product: Record<string, unknown>;
  savings: number | null;
  compact?: boolean;
}) {
  const p = product as {
    thumbnail?: string; title?: string; subtitle?: string;
    price?: number; original_price?: number; modules?: unknown[];
  };
  const FALLBACK = "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=600&q=80&auto=format";

  return (
    <div className="card-dark" style={{ padding: compact ? "clamp(14px,3vw,20px)" : "clamp(20px,3vw,28px)" }}>
      <p className="overline" style={{ color: "var(--gold)", marginBottom: "16px", fontSize: "9px" }}>Resumo do pedido</p>

      {!compact && (
        <div style={{ overflow: "hidden", borderRadius: "12px", aspectRatio: "16/9", marginBottom: "18px", background: "var(--bg-surface-2)" }}>
          <img src={(p.thumbnail as string) || FALLBACK} alt={(p.title as string) || "Produto"}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        </div>
      )}

      {compact && (
        <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "14px" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "10px", overflow: "hidden", flexShrink: 0 }}>
            <img src={(p.thumbnail as string) || FALLBACK} alt={(p.title as string) || "Produto"}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
          <div>
            <span className="badge-rose" style={{ marginBottom: "6px" }}>
              {(p.subtitle as string) || "Método"}
            </span>
            <h3 className="font-display" style={{ fontSize: "18px", fontWeight: 300, lineHeight: 1.2, color: "var(--text-primary)" }}>
              {p.title as string}
            </h3>
          </div>
        </div>
      )}

      {!compact && (
        <>
          <span className="badge-rose" style={{ marginBottom: "10px", display: "inline-flex" }}>
            {(p.subtitle as string) || "Método"}
          </span>
          <h3 className="font-display" style={{ fontSize: "clamp(20px,2.5vw,26px)", fontWeight: 300, lineHeight: 1.2, color: "var(--text-primary)", marginBottom: "6px", marginTop: "8px" }}>
            {p.title as string}
          </h3>
          <p className="font-label" style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "18px" }}>
            {((p.modules as unknown[])?.length ?? 8)} módulos · Acesso vitalício
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "18px" }}>
            {["Acesso vitalício", "Comunidade exclusiva", "Certificado de conclusão", "Suporte humanizado"].map((f) => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <CheckCircle size={12} style={{ color: "var(--sage)", flexShrink: 0 }} strokeWidth={2} />
                <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{f}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <hr className="divider-gold" style={{ margin: "clamp(12px,2vw,18px) 0" }} />

      {savings && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Valor original</span>
            <span style={{ fontSize: "13px", color: "var(--text-muted)", textDecoration: "line-through" }}>
              R$ {(p.original_price as number).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px" }}>
            <span style={{ fontSize: "13px", color: "var(--sage)" }}>Desconto</span>
            <span className="badge-sage" style={{ fontSize: "9px" }}>
              — R$ {savings.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </>
      )}

      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <span className="font-label" style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: "0.12em", textTransform: "uppercase" }}>Total</span>
        <p className="font-display" style={{ fontSize: "clamp(28px,3.5vw,36px)", color: "var(--gold)", fontWeight: 300, lineHeight: 1 }}>
          R$ {(p.price as number).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </p>
      </div>
      <p className="font-label" style={{ fontSize: "8px", color: "var(--text-faint)", textAlign: "right", marginTop: "5px", letterSpacing: "0.10em", textTransform: "uppercase" }}>
        7 dias de garantia incondicional
      </p>
    </div>
  );
}
