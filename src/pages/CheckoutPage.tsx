
/**
 * CheckoutPage — Mobile-first, theme-aware, Asaas-integrated
 * Improved flow: live form validation, Asaas payment link surfaced on success
 */
import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useParams, Link, useNavigate } from "react-router-dom";
import SpiralLogo from "@/components/layout/SpiralLogo";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { FunctionsHttpError } from "@supabase/supabase-js";
import mulherEspiralProductImg from "@/assets/mulher-espiral-hero.jpg";
import { Shield, CheckCircle, ArrowLeft, ArrowRight, Lock, Loader2, Zap, Star, Users } from "lucide-react";
import { toast } from "sonner";
import { fireEventAsync } from "@/lib/sequenzy";
import { getAttribution } from "@/lib/analytics";

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
  { id: "pix",    label: "PIX",    sub: "Aprovação imediata", icon: Zap },
  { id: "credit", label: "Cartão", sub: "12× sem juros",      icon: Shield },
  { id: "boleto", label: "Boleto", sub: "Vence em 3 dias",    icon: Star },
];

function validateEmail(e: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

export default function CheckoutPage() {
  const { slug }  = useParams<{ slug: string }>();
  const navigate  = useNavigate();
  const { user }  = useAuth();

  const [product,       setProduct]       = useState<{ id: string; slug: string; title: string; subtitle?: string; description?: string; price: number; original_price?: number } | null>(null);
  const [productLoading, setProductLoading] = useState(true);
  const [form,          setForm]          = useState({ name: user?.name ?? "", email: user?.email ?? "" });
  const [errors,        setErrors]        = useState<{ name?: string; email?: string }>({});
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "credit" | "boleto">("pix");
  const [loading,       setLoading]       = useState(false);
  const [step,          setStep]          = useState<"form" | "success">("form");
  const [successData,   setSuccessData]   = useState<{ orderId: string; invoiceUrl?: string; pixKey?: string; pixQrCode?: string; barCode?: string } | null>(null);

  useEffect(() => {
    if (user) setForm({ name: user.name, email: user.email });
  }, [user]);

  // Sequenzy: checkout.started — fire once on page load
  useEffect(() => {
    const email = user?.email ?? sessionStorage.getItem("checkout_email") ?? "";
    if (!email || !slug) return;
    fireEventAsync("checkout.started", {
      email,
      firstName: user?.name?.split(" ")[0] ?? "",
      properties: {
        product_slug: slug ?? "",
        source: "web",
        started_at: new Date().toISOString(),
      },
    });
  }, [slug, user]);

  useEffect(() => {
    if (!slug) { setProductLoading(false); return; }
    supabase.from("products").select("*").eq("slug", slug).eq("is_active", true).single()
      .then(({ data, error }) => {
        if (data) {
          const priceNum = typeof data.price === "number" ? data.price : parseFloat(data.price);
          const originalNum = data.original_price
            ? (typeof data.original_price === "number" ? data.original_price : parseFloat(data.original_price))
            : undefined;
          if (!Number.isFinite(priceNum)) {
            toast.error("Produto com preço inválido.");
            navigate("/products");
            return;
          }
          setProduct({
            id: data.id, title: data.title,
            subtitle: data.subtitle ?? undefined,
            description: data.description ?? undefined,
            price: priceNum,
            original_price: Number.isFinite(originalNum as number) ? originalNum : undefined,
            slug: data.slug,
          });
        } else {
          toast.error("Produto não encontrado.");
          navigate("/products");
        }
        setProductLoading(false);
      });
  }, [slug, navigate]);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((err) => ({ ...err, [field]: undefined }));
  };

  const validate = () => {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = "Nome obrigatório";
    if (!form.email.trim()) e.email = "E-mail obrigatório";
    else if (!validateEmail(form.email)) e.email = "E-mail inválido";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    const body: Record<string, unknown> = {
      productSlug: slug,
      email: form.email.trim().toLowerCase(),
      name: form.name.trim(),
      userId: user?.id ?? null,
      paymentMethod,
    };

    const { data, error } = await supabase.functions.invoke("checkout-session", { body });

    if (error) {
      let msg = error.message;
      if (error instanceof FunctionsHttpError) {
        try { const t = await error.context?.text(); msg = `[${error.context?.status}] ${t || error.message}`; } catch { /* ignore */ }
      }
      toast.error(msg);
      setLoading(false);
      return;
    }

    toast.success("Pedido registrado! ✦");

    // Sequenzy: checkout.completed — fired immediately when order is registered
    const attribution = getAttribution();
    fireEventAsync("checkout.completed", {
      email: form.email.trim().toLowerCase(),
      firstName: form.name.trim().split(" ")[0],
      properties: {
        product_slug: slug ?? "",
        product_title: product.title as string,
        payment_method: paymentMethod,
        order_id: data?.orderId ?? "",
        amount: product.price as number,
        completed_at: new Date().toISOString(),
        utm_source:   attribution.utm_source   ?? "",
        utm_medium:   attribution.utm_medium   ?? "",
        utm_campaign: attribution.utm_campaign ?? "",
      },
    });

    // If we have an invoice URL from Asaas, redirect there immediately for credit card
    if (paymentMethod === "credit" && data?.payment?.invoiceUrl) {
      const qs = new URLSearchParams({
        orderId: data.orderId ?? "",
        slug: product.slug,
        title: product.title,
        email: form.email,
        method: paymentMethod,
        invoiceUrl: data.payment.invoiceUrl,
      });
      navigate(`/obrigado?${qs.toString()}`);
      setLoading(false);
      return;
    }

    // Store pixQrCode in sessionStorage (too long for URL params)
    if (data.payment?.pixQrCode) {
      sessionStorage.setItem("pix_qr_code", data.payment.pixQrCode);
    } else {
      sessionStorage.removeItem("pix_qr_code");
    }

    // For PIX/boleto: show success state inline with payment details
    setSuccessData({
      orderId:    data.orderId ?? "",
      invoiceUrl: data.payment?.invoiceUrl,
      pixKey:     data.payment?.pixKey,
      pixQrCode:  data.payment?.pixQrCode,
      barCode:    data.payment?.barCode,
    });
    setStep("success");
    setLoading(false);
  };

  if (productLoading) return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-surface)" }}>
      <Loader2 size={28} style={{ color: "var(--gold)", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
  if (!product) return null;

  const helmetTitle = `Checkout — ${product.title} | Despertar Espiral`;

  // Helmet (rendered once product is loaded)
  const helmetNode = (
    <Helmet>
      <title>{helmetTitle}</title>
      <meta name="robots" content="noindex" />
    </Helmet>
  );

  // Success state — inline payment instructions
  if (step === "success" && successData) {
    const qs = new URLSearchParams({
      orderId: successData.orderId,
      slug: product.slug,
      title: product.title,
      email: form.email,
      method: paymentMethod,
      ...(successData.invoiceUrl ? { invoiceUrl: successData.invoiceUrl } : {}),
      ...(successData.pixKey     ? { pixKey: successData.pixKey } : {}),
      ...(successData.barCode    ? { barCode: successData.barCode } : {}),
    });

    return (
      <>
        {helmetNode}
      <div style={{ minHeight: "100dvh", background: "var(--bg-surface)", color: "var(--text-primary)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ maxWidth: "480px", width: "100%", textAlign: "center" }}>
          <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "rgba(140,170,150,0.12)", border: "1px solid rgba(140,170,150,0.30)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <CheckCircle size={30} style={{ color: "var(--sage)" }} strokeWidth={1.2} />
          </div>
          <p className="overline" style={{ color: "var(--gold)", marginBottom: "10px" }}>Pedido registrado</p>
          <h1 className="font-display" style={{ fontSize: "clamp(26px,4vw,38px)", fontWeight: 300, marginBottom: "14px" }}>
            {paymentMethod === "pix" ? "Realize o PIX" : "Pague o boleto"}
          </h1>

          {/* PIX details */}
          {paymentMethod === "pix" && (
            <div className="card-dark" style={{ padding: "20px", marginBottom: "16px", textAlign: "left" }}>
              <p className="font-label" style={{ fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "14px" }}>
                Pagamento via PIX
              </p>

              {/* QR Code */}
              {successData.pixQrCode && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "16px", gap: "10px" }}>
                  <div style={{
                    background: "#fff", borderRadius: "16px", padding: "14px",
                    border: "2px solid rgba(198,168,112,0.30)",
                    boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
                    display: "inline-flex",
                  }}>
                    <img
                      src={`data:image/png;base64,${successData.pixQrCode}`}
                      alt="QR Code PIX"
                      width={180} height={180}
                      style={{ display: "block", borderRadius: "6px" }}
                    />
                  </div>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", textAlign: "center", lineHeight: 1.6 }}>
                    Escaneie o QR Code com o app do seu banco
                  </p>
                </div>
              )}

              {/* Divider between QR and key */}
              {successData.pixQrCode && successData.pixKey && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                  <div style={{ flex: 1, height: "1px", background: "var(--border-subtle)" }} />
                  <span className="font-label" style={{ fontSize: "8px", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text-faint)" }}>ou copie a chave</span>
                  <div style={{ flex: 1, height: "1px", background: "var(--border-subtle)" }} />
                </div>
              )}

              {successData.pixKey ? (
                <div>
                  <code style={{ fontSize: "12px", color: "var(--text-primary)", wordBreak: "break-all", display: "block", marginBottom: "10px", lineHeight: 1.6, background: "var(--bg-surface-2)", padding: "10px 12px", borderRadius: "10px", border: "1px solid var(--border-subtle)" }}>
                    {successData.pixKey}
                  </code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(successData.pixKey!); toast.success("Chave copiada!"); }}
                    className="btn-outline-gold" style={{ fontSize: "9px", padding: "8px 18px", minHeight: "40px", width: "100%", justifyContent: "center" }}>
                    Copiar chave PIX copia e cola
                  </button>
                </div>
              ) : (
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.7 }}>
                  Realize o PIX para: <strong style={{ color: "var(--text-primary)" }}>contato@despertarespiral.com</strong><br />
                  Envie o comprovante com <strong style={{ color: "var(--gold)" }}>#{successData.orderId.slice(0, 8).toUpperCase()}</strong> para o mesmo e-mail.
                </p>
              )}
            </div>
          )}

          {/* Boleto details */}
          {paymentMethod === "boleto" && (
            <div className="card-dark" style={{ padding: "20px", marginBottom: "16px", textAlign: "left" }}>
              <p className="font-label" style={{ fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "10px" }}>
                Boleto bancário
              </p>
              {successData.barCode && (
                <div style={{ marginBottom: "10px" }}>
                  <code style={{ fontSize: "11px", color: "var(--text-secondary)", wordBreak: "break-all", display: "block", marginBottom: "8px", letterSpacing: "0.04em" }}>
                    {successData.barCode}
                  </code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(successData.barCode!); toast.success("Código de barras copiado!"); }}
                    className="btn-outline-gold" style={{ fontSize: "9px", padding: "8px 18px", minHeight: "40px" }}>
                    Copiar código
                  </button>
                </div>
              )}
              {successData.invoiceUrl && (
                <a href={successData.invoiceUrl} target="_blank" rel="noopener noreferrer" className="btn-gold"
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "9px", padding: "10px 22px", marginTop: successData.barCode ? "10px" : "0" }}>
                  Abrir boleto <ArrowRight size={12} />
                </a>
              )}
              {!successData.barCode && !successData.invoiceUrl && (
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.7 }}>
                  O boleto foi enviado para <strong style={{ color: "var(--text-primary)" }}>{form.email}</strong>. Pague em até 3 dias úteis.
                </p>
              )}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <button onClick={() => navigate(`/obrigado?${qs.toString()}`)} className="btn-gold"
              style={{ width: "100%", justifyContent: "center" }}>
              Ver página de confirmação <ArrowRight size={13} />
            </button>
            <Link to="/dashboard" className="btn-ghost" style={{ justifyContent: "center" }}>
              Ir para minha área
            </Link>
          </div>
        </div>
      </div>
      </>
    );
  }

  const savings = (product as { original_price?: number }).original_price
    ? (product as { original_price?: number }).original_price! - product.price
    : null;

  return (
    <>
      {helmetNode}
    <div style={{ minHeight: "100dvh", background: "var(--bg-surface)", color: "var(--text-primary)" }}>

      {/* Top bar */}
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

      {/* Trust strip */}
      <div style={{
        background: "linear-gradient(135deg, rgba(198,168,112,0.10) 0%, rgba(201,154,170,0.06) 100%)",
        borderBottom: "1px solid var(--border-subtle)",
        padding: "10px clamp(16px,5vw,32px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: "clamp(12px,3vw,28px)", flexWrap: "wrap",
      }}>
        {[
          { icon: Users, text: "280+ mulheres em jornada" },
          { icon: Star,  text: "4.8 ★ avaliação" },
          { icon: Shield, text: "7 dias de garantia" },
        ].map(({ icon: Icon, text }) => (
          <div key={text} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Icon size={11} style={{ color: "var(--gold)" }} strokeWidth={1.5} />
            <span className="font-label" style={{ fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)" }}>{text}</span>
          </div>
        ))}
      </div>

      <div style={{ maxWidth: "1020px", margin: "0 auto", padding: "clamp(20px,4vw,40px) clamp(16px,5vw,24px) clamp(40px,6vw,80px)" }}>

        <button onClick={() => navigate(-1)}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "clamp(20px,3vw,32px)", background: "transparent", border: "none", cursor: "pointer", fontSize: "9px", fontFamily: "Montserrat, sans-serif", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)", padding: 0, minHeight: "44px", transition: "color 0.2s" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--gold)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-muted)")}
        >
          <ArrowLeft size={13} /> Voltar
        </button>

        {/* Mobile summary */}
        <div className="lg:hidden" style={{ marginBottom: "clamp(20px,4vw,32px)" }}>
          <OrderSummary product={product} savings={savings} compact />
        </div>

        <div style={{ display: "grid", gap: "clamp(24px,4vw,40px)" }} className="grid lg:grid-cols-5">

          {/* Form */}
          <div style={{ gridColumn: "span 3" }}>
            <p className="overline" style={{ color: "var(--gold)", marginBottom: "8px" }}>Finalizar pedido</p>
            <h1 className="font-display" style={{ fontSize: "clamp(26px,4vw,40px)", fontWeight: 300, marginBottom: "8px", color: "var(--text-primary)" }}>
              {user ? `Olá, ${user.name.split(" ")[0]}` : "Seus dados"}
            </h1>
            <p style={{ fontSize: "clamp(13px,1.5vw,15px)", color: "var(--text-secondary)", lineHeight: 1.78, marginBottom: "clamp(20px,3vw,28px)" }}>
              Preencha seus dados para registrar o pedido. As instruções de pagamento chegam ao seu e-mail.
            </p>

            {user && (
              <div className="card-dark" style={{ padding: "14px 18px", marginBottom: "clamp(16px,2.5vw,24px)", display: "flex", alignItems: "center", gap: "10px" }}>
                <CheckCircle size={14} style={{ color: "var(--sage)", flexShrink: 0 }} strokeWidth={2} />
                <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                  Logada como <strong style={{ color: "var(--text-primary)" }}>{user.email}</strong>
                </p>
              </div>
            )}

            <form onSubmit={handleCheckout} noValidate style={{ display: "flex", flexDirection: "column", gap: "clamp(14px,2vw,18px)" }}>
              <div style={{ display: "grid", gap: "clamp(12px,2vw,16px)" }} className="grid sm:grid-cols-2">
                <div>
                  <label style={LABEL}>Nome completo</label>
                  <input type="text" value={form.name} onChange={set("name")} placeholder="Seu nome" className="input-dark" disabled={!!user} autoComplete="name"
                    style={{ borderRadius: "14px", borderColor: errors.name ? "rgba(201,80,80,0.6)" : undefined }} />
                  {errors.name && <p style={{ fontSize: "11px", color: "#e07070", marginTop: "4px" }}>{errors.name}</p>}
                </div>
                <div>
                  <label style={LABEL}>E-mail</label>
                  <input type="email" value={form.email} onChange={set("email")} placeholder="seu@email.com" className="input-dark" disabled={!!user} autoComplete="email"
                    style={{ borderRadius: "14px", borderColor: errors.email ? "rgba(201,80,80,0.6)" : undefined }} />
                  {errors.email && <p style={{ fontSize: "11px", color: "#e07070", marginTop: "4px" }}>{errors.email}</p>}
                </div>
              </div>

              {!user && (
                <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.65 }}>
                  Já tem conta?{" "}
                  <Link to={`/login?next=/checkout/${slug}`} style={{ color: "var(--gold)", textDecoration: "none", fontWeight: 500 }}>Entrar</Link>{" "}
                  para preencher automaticamente.
                </p>
              )}

              {/* Payment selector */}
              <div>
                <label style={LABEL}>Forma de pagamento</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                  {PAYMENT_METHODS.map(({ id, label, sub, icon: Icon }) => {
                    const active = paymentMethod === id;
                    return (
                      <button key={id} type="button" onClick={() => setPaymentMethod(id as "pix" | "credit" | "boleto")}
                        style={{
                          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                          gap: "5px", padding: "14px 8px",
                          borderRadius: "14px", border: `1.5px solid ${active ? "var(--gold)" : "var(--border-soft)"}`,
                          background: active ? "rgba(198,168,112,0.08)" : "var(--input-bg)",
                          cursor: "pointer", transition: "all 0.2s ease", minHeight: "72px",
                        }}>
                        <Icon size={16} style={{ color: active ? "var(--gold)" : "var(--text-faint)" }} strokeWidth={1.5} />
                        <span className="font-label" style={{ fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: active ? "var(--gold)" : "var(--text-primary)", fontWeight: active ? 600 : 400 }}>{label}</span>
                        <span style={{ fontSize: "10px", color: active ? "var(--text-secondary)" : "var(--text-faint)" }}>{sub}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Method tip */}
                {paymentMethod === "pix" && (
                  <div style={{ marginTop: "10px", padding: "10px 14px", borderRadius: "10px", background: "rgba(140,170,150,0.07)", border: "1px solid rgba(140,170,150,0.18)" }}>
                    <p style={{ fontSize: "12px", color: "var(--sage)", display: "flex", alignItems: "center", gap: "5px" }}>
                      <Zap size={11} /> Chave PIX enviada por e-mail e gerada automaticamente após o pedido.
                    </p>
                  </div>
                )}
                {paymentMethod === "credit" && (
                  <div style={{ marginTop: "10px", padding: "10px 14px", borderRadius: "10px", background: "rgba(164,158,208,0.07)", border: "1px solid rgba(164,158,208,0.18)" }}>
                    <p style={{ fontSize: "12px", color: "var(--lavender)" }}>
                      Você será redirecionada para a página de pagamento seguro do cartão após confirmar o pedido.
                    </p>
                  </div>
                )}
                {paymentMethod === "boleto" && (
                  <div style={{ marginTop: "10px", padding: "10px 14px", borderRadius: "10px", background: "rgba(206,200,190,0.07)", border: "1px solid var(--border-subtle)" }}>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      Boleto gerado automaticamente. Vencimento em 3 dias úteis.
                    </p>
                  </div>
                )}
              </div>

              {/* How it works */}
              <div className="card-dark" style={{ padding: "clamp(14px,2.5vw,20px)" }}>
                <p className="overline" style={{ color: "var(--text-muted)", marginBottom: "12px", fontSize: "8px" }}>Como funciona</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {[
                    { n: "01", t: "Registre o pedido", d: "Seus dados são salvos com segurança." },
                    { n: "02", t: "Realize o pagamento", d: `Instruções de ${paymentMethod === "pix" ? "PIX" : paymentMethod === "credit" ? "cartão seguro" : "boleto"} chegam ao seu e-mail.` },
                    { n: "03", t: "Acesso automático", d: "Confirmamos e liberamos acesso em até 1h útil." },
                  ].map(({ n, t, d }) => (
                    <div key={n} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                      <span className="step-chip">{n}</span>
                      <div>
                        <p style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500, marginBottom: "2px" }}>{t}</p>
                        <p className="reading-note" style={{ fontSize: "12px", lineHeight: 1.6 }}>{d}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-gold" style={{ width: "100%", borderRadius: "16px", minHeight: "56px" }}>
                {loading
                  ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Registrando…</>
                  : <><span>Registrar pedido</span><ArrowRight size={14} /></>
                }
              </button>

              <p style={{ textAlign: "center", fontSize: "12px", color: "var(--text-faint)", lineHeight: 1.7 }}>
                Ao continuar, você concorda com{" "}
                <Link to="/termos" style={{ color: "var(--gold)", textDecoration: "none" }}>Termos de Uso</Link>{" "}
                e{" "}
                <Link to="/privacidade" style={{ color: "var(--gold)", textDecoration: "none" }}>Privacidade</Link>. 7 dias de garantia incondicional.
              </p>
            </form>
          </div>

          {/* Desktop summary */}
          <div className="hidden lg:block" style={{ gridColumn: "span 2" }}>
            <div style={{ position: "sticky", top: "80px" }}>
              <OrderSummary product={product} savings={savings} />
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
    </>
  );
}

/* ── Order Summary ── */
function OrderSummary({ product, savings, compact = false }: { product: Record<string, unknown>; savings: number | null; compact?: boolean }) {
  const p = product as { slug?: string; thumbnail?: string; thumbnail_url?: string; title?: string; subtitle?: string; price?: number; original_price?: number; modules?: unknown[] };
  const isMulherEspiral = p.slug === "mulher-espiral";
  const thumbSrc = isMulherEspiral ? mulherEspiralProductImg : (p.thumbnail_url || p.thumbnail || "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=600&q=80&auto=format");

  return (
    <div className="card-dark" style={{ padding: compact ? "clamp(14px,3vw,20px)" : "clamp(20px,3vw,28px)" }}>
      <p className="overline" style={{ color: "var(--gold)", marginBottom: "16px", fontSize: "9px" }}>Resumo do pedido</p>

      {!compact && (
        <div style={{ overflow: "hidden", borderRadius: "14px", marginBottom: "18px", background: "var(--bg-surface-2)", aspectRatio: "4/5", maxHeight: "320px", position: "relative" }}>
          <img src={thumbSrc} alt={p.title as string}
            loading="lazy" decoding="async"
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: "block" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 50%, rgba(11,13,28,0.85) 100%)", pointerEvents: "none" }} />
        </div>
      )}

      {compact && (
        <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "14px" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "10px", overflow: "hidden", flexShrink: 0, background: "var(--bg-surface-2)" }}>
            <img src={thumbSrc} alt={p.title as string} loading="lazy" decoding="async" width="56" height="56"
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: "block" }} />
          </div>
          <div>
            {p.subtitle && <span className="badge-rose" style={{ marginBottom: "5px" }}>{p.subtitle as string}</span>}
            <h3 className="font-display" style={{ fontSize: "18px", fontWeight: 300, lineHeight: 1.2, color: "var(--text-primary)" }}>{p.title as string}</h3>
          </div>
        </div>
      )}

      {!compact && (
        <>
          {p.subtitle && <span className="badge-rose" style={{ marginBottom: "10px", display: "inline-flex" }}>{p.subtitle as string}</span>}
          <h3 className="font-display" style={{ fontSize: "clamp(18px,2.5vw,24px)", fontWeight: 300, lineHeight: 1.2, color: "var(--text-primary)", marginBottom: "6px", marginTop: compact ? 0 : "10px" }}>
            {p.title as string}
          </h3>
          <p className="font-label" style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "16px" }}>
            {((p.modules as unknown[])?.length ?? 8)} módulos · Acesso vitalício
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
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
            <span className="badge-sage" style={{ fontSize: "9px" }}>— R$ {savings.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
          </div>
        </>
      )}

      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <span className="font-label" style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: "0.12em", textTransform: "uppercase" }}>Total</span>
        <p className="font-display" style={{ fontSize: "clamp(26px,3.5vw,34px)", color: "var(--gold)", fontWeight: 300, lineHeight: 1 }}>
          R$ {(p.price as number).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </p>
      </div>
      {!compact && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", marginTop: "14px" }}>
          <Shield size={11} style={{ color: "var(--text-muted)" }} strokeWidth={1.5} />
          <span className="font-label" style={{ fontSize: "8px", letterSpacing: "0.14em", color: "var(--text-muted)", textTransform: "uppercase" }}>7 dias de garantia incondicional</span>
        </div>
      )}
    </div>
  );
}

