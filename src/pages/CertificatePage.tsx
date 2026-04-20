/**
 * CertificatePage — /products/:slug/certificado
 * Renderizado em HTML com design Despertar Espiral, download via window.print()
 * Dados: nome da aluna + nome do curso + data de conclusão + config do admin
 */
import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Download, Share2, Award, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CertConfig {
  instructorName?: string;
  instructorTitle?: string;
  courseTagline?: string;
  certDescription?: string;
  signatureLabel?: string;
  institutionLabel?: string;
  footerNote?: string;
}

interface CertData {
  studentName: string;
  courseName: string;
  courseTagline: string;
  completedAt: string;
  totalHours: number;
  config: CertConfig;
}

export default function CertificatePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const certRef = useRef<HTMLDivElement>(null);

  const [certData, setCertData] = useState<CertData | null>(null);
  const [loading, setLoading] = useState(true);
  const [eligible, setEligible] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !slug) return;
    (async () => {
      setLoading(true);
      setFetchError(null);

      // 1. Load product with certificate config
      const { data: product, error: productErr } = await supabase
        .from("products")
        .select("id, title, subtitle, certificate_config, modules(id, lessons(id, duration_min))")
        .eq("slug", slug)
        .single();

      if (productErr || !product) {
        setFetchError(productErr?.message ?? "Curso não encontrado.");
        setLoading(false);
        return;
      }

      const allLessons = (product.modules ?? []).flatMap(
        (m: { lessons: { id: string; duration_min?: number }[] }) => m.lessons
      );
      const totalLessonIds = allLessons.map((l: { id: string }) => l.id);
      const totalHours = Math.ceil(
        allLessons.reduce((s: number, l: { duration_min?: number }) => s + (l.duration_min ?? 0), 0) / 60
      );

      if (totalLessonIds.length === 0) { setLoading(false); return; }

      // 2. Check completion
      const { data: progress, error: progressErr } = await supabase
        .from("lesson_progress")
        .select("lesson_id, completed_at")
        .eq("user_id", user.id)
        .eq("completed", true)
        .in("lesson_id", totalLessonIds);

      if (progressErr) {
        setFetchError(progressErr.message);
        setLoading(false);
        return;
      }

      const completedIds = new Set((progress ?? []).map((r: { lesson_id: string }) => r.lesson_id));
      const isComplete = totalLessonIds.every((id: string) => completedIds.has(id));

      setEligible(isComplete);

      if (!isComplete) { setLoading(false); return; }

      // 3. Get completion date (most recent completed_at)
      const dates = (progress ?? [])
        .map((r: { completed_at: string | null }) => r.completed_at)
        .filter(Boolean)
        .sort();
      const completedAt = dates.length > 0
        ? new Date(dates[dates.length - 1]).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })
        : new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });

      const cfg = (product.certificate_config as CertConfig) ?? {};

      setCertData({
        studentName:  user.name || user.email.split("@")[0],
        courseName:   product.title,
        courseTagline: cfg.courseTagline || product.subtitle || "Método de Reconexão e Cura",
        completedAt,
        totalHours:   totalHours || 8,
        config: cfg,
      });
      setLoading(false);
    })();
  }, [user, slug]);

  const handlePrint = () => {
    const style = document.createElement("style");
    style.id = "cert-print-style";
    style.textContent = `
      @media print {
        body > *:not(#cert-print-target) { display: none !important; }
        #cert-print-target {
          display: block !important;
          position: fixed !important;
          inset: 0 !important;
          z-index: 99999 !important;
          background: white !important;
        }
        @page { size: A4 landscape; margin: 0; }
      }
    `;
    document.head.appendChild(style);
    if (certRef.current) certRef.current.id = "cert-print-target";
    window.print();
    setTimeout(() => {
      if (style.parentNode) style.parentNode.removeChild(style);
      if (certRef.current) certRef.current.removeAttribute("id");
      toast.success("Certificado salvo/impresso.");
    }, 1000);
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Certificado — ${certData?.courseName}`, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copiado!");
      }
    } catch {
      // User cancelled share — no-op
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", background: "var(--bg-surface)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={28} style={{ color: "var(--gold)", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div style={{ minHeight: "100dvh", background: "var(--bg-surface)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", gap: "20px" }}>
        <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "rgba(201,154,170,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Award size={30} style={{ color: "rgba(201,154,170,0.5)" }} strokeWidth={1.2} />
        </div>
        <h1 className="font-display" style={{ fontSize: "clamp(22px,4vw,32px)", fontWeight: 300, color: "var(--text-primary)", textAlign: "center" }}>
          Não foi possível carregar o certificado
        </h1>
        <p style={{ fontSize: "15px", color: "var(--text-secondary)", lineHeight: 1.8, textAlign: "center", maxWidth: "420px" }}>
          {fetchError} Tente novamente em instantes.
        </p>
        <Link to={`/products/${slug}`} className="btn-gold" style={{ padding: "13px 32px", fontSize: "9px" }}>
          Voltar ao curso
        </Link>
      </div>
    );
  }

  if (!eligible || !certData) {
    return (
      <div style={{ minHeight: "100dvh", background: "var(--bg-surface)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", gap: "20px" }}>
        <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "rgba(198,168,112,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Award size={30} style={{ color: "rgba(198,168,112,0.4)" }} strokeWidth={1.2} />
        </div>
        <h1 className="font-display" style={{ fontSize: "clamp(22px,4vw,32px)", fontWeight: 300, color: "var(--text-primary)", textAlign: "center" }}>
          Certificado ainda não disponível
        </h1>
        <p style={{ fontSize: "15px", color: "var(--text-secondary)", lineHeight: 1.8, textAlign: "center", maxWidth: "420px" }}>
          Complete todas as aulas do curso para desbloquear e baixar seu certificado de conclusão.
        </p>
        <Link to={`/products/${slug}`} className="btn-gold" style={{ padding: "13px 32px", fontSize: "9px" }}>
          Voltar ao curso
        </Link>
      </div>
    );
  }

  const cfg = certData.config;
  const instructorName  = cfg.instructorName  || "Sunyan Nunes";
  const instructorTitle = cfg.instructorTitle || "Mentora & Fundadora · Despertar Espiral";
  const signatureLabel  = cfg.signatureLabel  || "Assinatura da mentora";
  const institutionLabel= cfg.institutionLabel|| "Despertar Espiral";
  const footerNote      = cfg.footerNote      || "Este certificado atesta a conclusão integral do programa, com dedicação, presença e comprometimento.";
  const certDesc        = cfg.certDescription ||
    `Certificamos que ${certData.studentName} concluiu com êxito o programa ${certData.courseName}, ` +
    `desenvolvendo habilidades de autoconhecimento, reconexão e cura, com carga horária de ${certData.totalHours}h.`;

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg-surface)", color: "var(--text-primary)" }}>

      {/* ── Top control bar ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "var(--nav-bg)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border-subtle)",
        padding: "0 clamp(14px,4vw,24px)",
        height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px",
      }}>
        <button
          onClick={() => navigate(`/products/${slug}`)}
          style={{ display: "flex", alignItems: "center", gap: "6px", background: "transparent", border: "none", cursor: "pointer", fontSize: "9px", fontFamily: "Montserrat, sans-serif", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)", minHeight: "44px", padding: "0 4px" }}
        >
          <ArrowLeft size={12} /> Curso
        </button>

        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={handleShare} className="btn-ghost"
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", fontSize: "9px", minHeight: "40px" }}>
            <Share2 size={12} /> Compartilhar
          </button>
          <button onClick={handlePrint} className="btn-gold"
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 18px", fontSize: "9px", minHeight: "40px" }}>
            <Download size={12} /> Baixar PDF
          </button>
        </div>
      </div>

      {/* ── Preview hint ── */}
      <div style={{ textAlign: "center", padding: "clamp(16px,3vw,24px) 16px 8px" }}>
        <p className="overline" style={{ color: "var(--gold)", fontSize: "8px", letterSpacing: "0.28em" }}>
          Certificado de Conclusão
        </p>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
          Clique em "Baixar PDF" para salvar ou imprimir.
        </p>
      </div>

      {/* ── Certificate canvas ── */}
      <div style={{ display: "flex", justifyContent: "center", padding: "clamp(12px,3vw,24px) clamp(12px,4vw,24px) clamp(40px,6vw,80px)" }}>
        <div
          ref={certRef}
          style={{
            width: "100%",
            maxWidth: "900px",
            aspectRatio: "1.414 / 1", /* A4 landscape ratio */
            background: "#faf7f2",
            borderRadius: "clamp(12px,2vw,20px)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.28)",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "clamp(24px,5%,56px)",
          }}
        >
          {/* Gold border frame */}
          <div style={{
            position: "absolute", inset: "clamp(10px,2%,20px)",
            border: "1.5px solid rgba(198,168,112,0.55)",
            borderRadius: "clamp(8px,1.5vw,14px)",
            pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute", inset: "clamp(14px,2.5%,26px)",
            border: "0.5px solid rgba(198,168,112,0.22)",
            borderRadius: "clamp(6px,1vw,10px)",
            pointerEvents: "none",
          }} />

          {/* Spiral watermark */}
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            pointerEvents: "none",
          }}>
            <svg width="55%" viewBox="0 0 600 600" fill="none" opacity={0.035} aria-hidden="true">
              <path
                d="M300 550C120 550 50 420 50 300C50 165 155 65 285 65C395 65 480 152 480 262C480 355 410 420 320 420C245 420 185 360 185 286C185 220 237 170 303 170C362 170 408 216 408 275C408 327 370 362 320 362C277 362 245 330 245 288C245 252 273 226 308 226C340 226 365 251 365 283C365 312 343 333 315 333"
                stroke="#c6a870" strokeWidth="14" strokeLinecap="round" fill="none"
              />
            </svg>
          </div>

          {/* Corner ornaments */}
          {[
            { top: "clamp(26px,4%,44px)",    left:  "clamp(26px,4%,44px)",    rotate: "0deg" },
            { top: "clamp(26px,4%,44px)",    right: "clamp(26px,4%,44px)",    rotate: "90deg" },
            { bottom: "clamp(26px,4%,44px)", right: "clamp(26px,4%,44px)",    rotate: "180deg" },
            { bottom: "clamp(26px,4%,44px)", left:  "clamp(26px,4%,44px)",    rotate: "270deg" },
          ].map((s, i) => (
            <svg key={i} width="28" height="28" viewBox="0 0 28 28" fill="none"
              style={{ position: "absolute", ...s, opacity: 0.5 }} aria-hidden="true">
              <path d="M2 26 L2 2 L26 2" stroke="#c6a870" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            </svg>
          ))}

          {/* ── Certificate content ── */}
          <div style={{ position: "relative", zIndex: 1, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: "clamp(8px,1.8%,18px)", textAlign: "center" }}>

            {/* Institution */}
            <p style={{
              fontFamily: "Montserrat, sans-serif",
              fontSize: "clamp(7px,1.1vw,11px)",
              letterSpacing: "clamp(0.18em,0.3vw,0.38em)",
              textTransform: "uppercase",
              color: "#9a8260",
              fontWeight: 500,
            }}>
              {institutionLabel}
            </p>

            {/* Title */}
            <h2 style={{
              fontFamily: "Cormorant Garamond, serif",
              fontSize: "clamp(11px,2.2vw,22px)",
              fontWeight: 400,
              color: "#c6a870",
              letterSpacing: "clamp(0.08em,0.15vw,0.22em)",
              textTransform: "uppercase",
              lineHeight: 1.2,
              margin: 0,
            }}>
              Certificado de Conclusão
            </h2>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: "clamp(8px,1.5%,16px)", width: "60%", maxWidth: "380px" }}>
              <div style={{ flex: 1, height: "0.5px", background: "rgba(198,168,112,0.40)" }} />
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                <polygon points="5,0 10,5 5,10 0,5" fill="rgba(198,168,112,0.55)" />
              </svg>
              <div style={{ flex: 1, height: "0.5px", background: "rgba(198,168,112,0.40)" }} />
            </div>

            {/* "Certifica que" */}
            <p style={{
              fontFamily: "Cormorant Garamond, serif",
              fontSize: "clamp(9px,1.4vw,14px)",
              color: "#7a6a52",
              fontStyle: "italic",
              letterSpacing: "0.05em",
              margin: 0,
            }}>
              Certificamos com honra que
            </p>

            {/* Student name */}
            <h1 style={{
              fontFamily: "Cormorant Garamond, serif",
              fontSize: "clamp(18px,4.2vw,52px)",
              fontWeight: 600,
              fontStyle: "italic",
              color: "#2c2218",
              lineHeight: 1.05,
              margin: 0,
              letterSpacing: "-0.01em",
            }}>
              {certData.studentName}
            </h1>

            {/* Completion text */}
            <p style={{
              fontFamily: "Cormorant Garamond, serif",
              fontSize: "clamp(9px,1.4vw,14px)",
              color: "#7a6a52",
              fontStyle: "italic",
              letterSpacing: "0.05em",
              margin: 0,
            }}>
              concluiu com êxito o programa
            </p>

            {/* Course name */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "clamp(2px,0.4%,5px)" }}>
              <h2 style={{
                fontFamily: "Cormorant Garamond, serif",
                fontSize: "clamp(14px,2.8vw,34px)",
                fontWeight: 700,
                color: "#c6a870",
                letterSpacing: "clamp(0.05em,0.1vw,0.14em)",
                textTransform: "uppercase",
                lineHeight: 1.1,
                margin: 0,
              }}>
                {certData.courseName}
              </h2>
              <p style={{
                fontFamily: "Cormorant Garamond, serif",
                fontSize: "clamp(8px,1.2vw,13px)",
                color: "#9a8260",
                fontStyle: "italic",
                margin: 0,
                letterSpacing: "0.06em",
              }}>
                {certData.courseTagline}
              </p>
            </div>

            {/* Hours + date row */}
            <div style={{ display: "flex", gap: "clamp(16px,3%,36px)", alignItems: "center", marginTop: "clamp(2px,0.5%,6px)" }}>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "clamp(14px,2vw,22px)", fontWeight: 600, color: "#c6a870", lineHeight: 1, margin: 0 }}>{certData.totalHours}h</p>
                <p style={{ fontFamily: "Montserrat, sans-serif", fontSize: "clamp(6px,0.9vw,9px)", letterSpacing: "0.2em", textTransform: "uppercase", color: "#9a8260", marginTop: "2px" }}>Carga horária</p>
              </div>
              <div style={{ width: "0.5px", height: "clamp(24px,3.5%,36px)", background: "rgba(198,168,112,0.35)" }} />
              <div style={{ textAlign: "center" }}>
                <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "clamp(10px,1.5vw,15px)", fontWeight: 500, color: "#4a3c2c", lineHeight: 1, margin: 0 }}>{certData.completedAt}</p>
                <p style={{ fontFamily: "Montserrat, sans-serif", fontSize: "clamp(6px,0.9vw,9px)", letterSpacing: "0.2em", textTransform: "uppercase", color: "#9a8260", marginTop: "2px" }}>Data de conclusão</p>
              </div>
            </div>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: "clamp(8px,1.5%,16px)", width: "70%", maxWidth: "480px", margin: "clamp(2px,0.5%,6px) 0" }}>
              <div style={{ flex: 1, height: "0.5px", background: "rgba(198,168,112,0.30)" }} />
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
                <circle cx="4" cy="4" r="2" fill="rgba(198,168,112,0.45)" />
              </svg>
              <div style={{ flex: 1, height: "0.5px", background: "rgba(198,168,112,0.30)" }} />
            </div>

            {/* Signature row */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "clamp(2px,0.4%,5px)" }}>
              {/* Signature flourish */}
              <svg width="clamp(60px,10%,110px)" height="clamp(22px,4%,36px)" viewBox="0 0 110 36" fill="none" aria-hidden="true">
                <path d="M8 28 C 20 8, 40 4, 55 18 C 68 30, 85 10, 102 20" stroke="#c6a870" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.7" />
                <path d="M12 32 C 30 26, 60 30, 98 26" stroke="#c6a870" strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.4" />
              </svg>
              <p style={{ fontFamily: "Montserrat, sans-serif", fontSize: "clamp(7px,1vw,10px)", fontWeight: 600, color: "#4a3c2c", letterSpacing: "0.18em", textTransform: "uppercase", margin: 0 }}>
                {instructorName}
              </p>
              <p style={{ fontFamily: "Montserrat, sans-serif", fontSize: "clamp(6px,0.85vw,9px)", color: "#9a8260", letterSpacing: "0.12em", margin: 0 }}>
                {instructorTitle}
              </p>
              <p style={{ fontFamily: "Montserrat, sans-serif", fontSize: "clamp(6px,0.8vw,8px)", color: "rgba(154,130,96,0.55)", letterSpacing: "0.14em", textTransform: "uppercase", margin: 0 }}>
                {signatureLabel}
              </p>
            </div>

            {/* Footer note */}
            <p style={{
              fontFamily: "Cormorant Garamond, serif",
              fontSize: "clamp(7px,1vw,10px)",
              color: "rgba(122,106,82,0.55)",
              fontStyle: "italic",
              maxWidth: "70%",
              lineHeight: 1.6,
              margin: 0,
              letterSpacing: "0.03em",
            }}>
              {footerNote}
            </p>
          </div>
        </div>
      </div>

      {/* ── Description card (outside cert) ── */}
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "0 clamp(12px,4vw,24px) clamp(40px,6vw,80px)" }}>
        <div className="card-dark" style={{ padding: "clamp(18px,3vw,28px)", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(198,168,112,0.10)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Award size={16} style={{ color: "var(--gold)" }} strokeWidth={1.5} />
            </div>
            <div>
              <p style={{ fontSize: "15px", color: "var(--text-primary)", fontWeight: 500 }}>Seu certificado está pronto</p>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>{certData.totalHours}h de conclusão · {certData.completedAt}</p>
            </div>
          </div>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.8 }}>
            {certDesc}
          </p>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button onClick={handlePrint} className="btn-gold" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "11px 24px", fontSize: "9px" }}>
              <Download size={13} /> Baixar / Imprimir PDF
            </button>
            <button onClick={handleShare} className="btn-outline-gold" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 20px", fontSize: "9px" }}>
              <Share2 size={13} /> Compartilhar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
