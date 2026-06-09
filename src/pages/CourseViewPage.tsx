/**
 * CourseViewPage — Device-optimized course overview
 * Mobile: stacked hero + collapsible accordion, full-width tap targets
 * Desktop: hero banner + spacious accordion with sidebar margins
 * + Quiz CTA per module, achievement banner at 100%
 */
import { useState, useEffect, memo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import QuizPlayer from "@/components/features/QuizPlayer";
import {
  ChevronDown, ChevronRight, Play, FileText, File, Volume2,
  CheckCircle, ArrowLeft, BookOpen, Clock, Award, ClipboardList,
} from "lucide-react";

const lessonIcon: Record<string, React.ElementType> = {
  video: Play, text: FileText, pdf: File, audio: Volume2,
};
const lessonLabel: Record<string, string> = {
  video: "Vídeo", text: "Leitura", pdf: "PDF", audio: "Áudio",
};

import mulherEspiralProduct from "@/assets/mulher-espiral-hero-new.jpg";
const FALLBACK = mulherEspiralProduct;

/* ── Skeleton ── */
function Sk({ w = "100%", h = "14px", r = "8px", style }: {
  w?: string; h?: string; r?: string; style?: React.CSSProperties;
}) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

const CourseViewSkeleton = memo(function CourseViewSkeleton() {
  return (
    <div style={{ maxWidth: "760px", margin: "0 auto", padding: "clamp(20px,4vw,32px) clamp(14px,4vw,24px)" }}>
      <Sk w="80px" h="12px" style={{ marginBottom: "24px" }} />
      <div className="card-dark" style={{ overflow: "hidden", marginBottom: "12px" }}>
        <Sk h="clamp(160px,28vw,240px)" r="0" />
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Sk w="130px" h="12px" /><Sk w="36px" h="12px" />
          </div>
          <Sk h="4px" r="100px" />
        </div>
      </div>
      {[1, 2].map((i) => (
        <div key={i} className="card-dark" style={{ padding: "16px 20px", marginBottom: "8px", display: "flex", alignItems: "center", gap: "12px" }}>
          <Sk w="34px" h="34px" r="50%" />
          <div style={{ flex: 1 }}>
            <Sk h="14px" style={{ marginBottom: "6px" }} /><Sk w="60%" h="11px" />
          </div>
          <Sk w="16px" h="16px" r="4px" />
        </div>
      ))}
    </div>
  );
});

export default function CourseViewPage() {
  const { slug }   = useParams<{ slug: string }>();
  const navigate   = useNavigate();
  const { user }   = useAuth();

  const [product,     setProduct]     = useState<null | Record<string, unknown>>(null);
  const [loading,     setLoading]     = useState(true);
  const [completed,   setCompleted]   = useState<Set<string>>(new Set());
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});
  const [activeQuiz,  setActiveQuiz]  = useState<string | null>(null);

  useEffect(() => {
    if (!user || !slug) return;
    let cancelled = false;
    setLoading(true);

    Promise.all([
      supabase.from("products")
        .select(`id, slug, title, subtitle, description, thumbnail_url, modules(id, title, sort_order, lessons(id, title, type, duration_min, is_free, sort_order))`)
        .eq("slug", slug).single(),
      supabase.from("lesson_progress")
        .select("lesson_id").eq("user_id", user.id).eq("completed", true),
    ]).then(([productRes, progressRes]) => {
      if (cancelled) return;

      if (!productRes.data) { navigate("/products"); return; }

      const data = productRes.data as unknown as Record<string, unknown>;
      // Sort modules and lessons
      const mods = ((data.modules as unknown[]) ?? []).slice().sort(
        (a, b) => ((a as Record<string, unknown>).sort_order as number ?? 0) - ((b as Record<string, unknown>).sort_order as number ?? 0)
      );
      for (const m of mods as Record<string, unknown>[]) {
        m.lessons = ((m.lessons as unknown[]) ?? []).slice().sort(
          (a, b) => ((a as Record<string, unknown>).sort_order as number ?? 0) - ((b as Record<string, unknown>).sort_order as number ?? 0)
        );
      }
      data.modules = mods;
      setProduct(data);

      const firstModId = (mods[0] as Record<string, unknown>)?.id as string;
      if (firstModId) setOpenModules({ [firstModId]: true });

      if (progressRes.data) {
        setCompleted(new Set(progressRes.data.map((r: { lesson_id: string }) => r.lesson_id)));
      }
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [user, slug, navigate]);

  if (loading) return <DashboardLayout><CourseViewSkeleton /></DashboardLayout>;

  if (!product) return (
    <DashboardLayout>
      <div style={{ padding: "64px 24px", textAlign: "center" }}>
        <p style={{ color: "var(--text-muted)", marginBottom: "16px" }}>Produto não encontrado.</p>
        <Link to="/products" className="btn-outline-gold" style={{ fontSize: "9px", padding: "10px 24px" }}>Ver meus cursos</Link>
      </div>
    </DashboardLayout>
  );

  // Normalize modules
  if (!Array.isArray(product.modules)) (product as Record<string, unknown>).modules = [];

  const hasAccess = Boolean(user?.products?.includes((product as unknown as { slug?: string }).slug ?? slug ?? ""));

  /* ── Access denied view ── */
  if (!hasAccess) {
    const previewLessons = (product.modules as { lessons: { is_free_preview?: boolean; is_free?: boolean }[] }[])
      .flatMap((m) => m.lessons)
      .filter((l) => Boolean(l.is_free_preview ?? l.is_free));

    return (
      <DashboardLayout>
        <div style={{ maxWidth: "760px", margin: "0 auto", padding: "clamp(20px,4vw,32px) clamp(14px,4vw,24px) clamp(40px,6vw,80px)" }}>
          <div className="card-dark" style={{ overflow: "hidden" }}>
            <div style={{ padding: "clamp(20px,4vw,32px)" }}>
              <p className="overline" style={{ color: "var(--gold)", marginBottom: "8px" }}>Acesso necessário</p>
              <h1 className="font-display" style={{ fontSize: "clamp(22px,4vw,40px)", fontWeight: 300, color: "var(--text-primary)", marginBottom: "10px" }}>
                {product.title as string}
              </h1>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.85, marginBottom: "20px" }}>
                Para ver o conteúdo completo, ative seu acesso ao curso.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "400px" }}>
                <Link to={`/checkout/${slug}`} className="btn-gold" style={{ justifyContent: "center", minHeight: "54px", borderRadius: "16px", fontSize: "9px" }}>
                  Liberar acesso agora <Play size={13} fill="#060810" style={{ color: "#060810" }} />
                </Link>
                <button onClick={() => navigate("/products")} className="btn-ghost" style={{ justifyContent: "center", minHeight: "50px", borderRadius: "16px", fontSize: "9px" }}>
                  ← Voltar para meus cursos
                </button>
              </div>
            </div>

            {previewLessons.length > 0 && (
              <div style={{ borderTop: "1px solid var(--border-subtle)", padding: "clamp(18px,3vw,26px)" }}>
                <p className="font-label" style={{ fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: "12px" }}>
                  Prévia gratuita disponível
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {previewLessons.slice(0, 6).map((l: { id: string; title: string; type: string }) => (
                    <Link key={l.id} to={`/products/${slug}/lesson/${l.id}`} className="card-dark" style={{ padding: "12px 14px", textDecoration: "none" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                        <span style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500, lineHeight: 1.35 }}>{l.title}</span>
                        <span className="badge-sage" style={{ fontSize: "8px" }}>GRÁTIS</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  /* ── Compute stats ── */
  const allLessons     = (product.modules as { lessons: { id: string }[] }[] ?? []).flatMap((m) => m.lessons);
  const totalLessons   = allLessons.length;
  const completedCount = allLessons.filter((l: { id: string }) => completed.has(l.id)).length;
  const progress       = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
  const isCourseComplete = progress === 100 && totalLessons > 0;
  const toggleModule = (id: string) => setOpenModules((p) => ({ ...p, [id]: !p[id] }));
  const nextLesson = allLessons.find((l) => !completed.has((l as { id: string }).id)) ?? allLessons[0];

  return (
    <DashboardLayout>
      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "0 0 clamp(40px,6vw,80px)" }}>

        {/* ── Back ── */}
        <div style={{ padding: "clamp(14px,2.5vw,20px) clamp(14px,4vw,24px) 0" }}>
          <button
            onClick={() => navigate("/products")}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "transparent", border: "none", cursor: "pointer", fontSize: "9px", fontFamily: "Montserrat, sans-serif", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)", padding: "8px 0", minHeight: "44px", transition: "color 0.2s" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--gold)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-muted)")}
          >
            <ArrowLeft size={13} /> Meus Cursos
          </button>
        </div>

        {/* ── Hero card ── */}
        <div style={{ margin: "clamp(8px,1.5vw,12px) clamp(14px,4vw,24px)" }}>
          <div className="course-card" style={{ cursor: "default" }}>
            {/* Thumbnail */}
            <div style={{ position: "relative", height: "clamp(160px,28vw,240px)", overflow: "hidden" }}>
              <img
                className="thumb-img"
                src={(product as unknown as { thumbnail_url?: string }).thumbnail_url ?? FALLBACK}
                alt={product.title as string}
                loading="lazy" decoding="async"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(7,9,21,0.95) 0%, rgba(7,9,21,0.5) 55%, rgba(7,9,21,0.12) 100%)" }} />

              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "clamp(16px,3vw,28px)" }}>
                {product.subtitle && (
                  <span className="badge-rose" style={{ marginBottom: "10px", alignSelf: "flex-start" }}>
                    {product.subtitle as string}
                  </span>
                )}
                <h1 className="font-display" style={{ fontSize: "clamp(22px,4.5vw,40px)", fontWeight: 300, color: "#f5f0e8", lineHeight: 1.1, marginBottom: "6px" }}>
                  {product.title as string}
                </h1>
                <p style={{ fontSize: "9px", fontFamily: "Montserrat", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(245,240,232,0.38)" }}>
                  {(product.modules as unknown[]).length} módulos · {totalLessons} aulas
                </p>
              </div>
            </div>

            {/* Progress + CTA footer */}
            <div style={{ padding: "clamp(13px,2.5vw,18px) clamp(16px,3vw,24px)", borderTop: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "140px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    {completedCount} de {totalLessons} aulas
                  </span>
                  <span style={{ fontSize: "13px", fontFamily: "Montserrat", fontWeight: 600, color: isCourseComplete ? "var(--sage)" : "var(--gold)" }}>
                    {progress}%
                  </span>
                </div>
                <div className="progress-bar thick">
                  <div
                    className={`progress-bar-fill${isCourseComplete ? " sage" : ""}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {isCourseComplete ? (
                  <Link to={`/products/${slug}/certificado`} className="btn-gold" style={{ padding: "11px 20px", fontSize: "9px", borderRadius: "12px", flexShrink: 0, whiteSpace: "nowrap" }}>
                    <Award size={13} /> Ver certificado
                  </Link>
                ) : nextLesson ? (
                  <Link to={`/products/${slug}/lesson/${(nextLesson as { id: string }).id}`} className="btn-gold" style={{ padding: "11px 20px", fontSize: "9px", borderRadius: "12px", flexShrink: 0, whiteSpace: "nowrap" }}>
                    <Play size={12} fill="#060810" style={{ color: "#060810" }} />
                    {completedCount === 0 ? "Começar" : "Continuar"}
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* ── Module progress strip ── */}
        {(product.modules as unknown[]).length > 0 && (
          <div className="scroll-x-hidden" style={{ padding: "0 clamp(14px,4vw,24px)", margin: "clamp(8px,1.5vw,12px) 0" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              {(product.modules as { id: string; title: string; lessons: { id: string }[] }[]).slice(0, 6).map((mod, i) => {
                const modLessons = mod.lessons.map((l) => l.id);
                const modDone    = modLessons.filter((id) => completed.has(id)).length;
                const pct        = modLessons.length > 0 ? Math.round((modDone / modLessons.length) * 100) : 0;
                const allDone    = pct === 100;
                return (
                  <div key={mod.id} className={`module-chip${allDone ? " done" : ""}`} style={{ padding: "7px 11px", borderRadius: "10px", background: "var(--bg-surface-2)", border: `1px solid ${allDone ? "rgba(140,170,150,0.28)" : "var(--border-subtle)"}`, display: "flex", alignItems: "center", gap: "7px", flexShrink: 0 }}>
                    <span style={{ fontSize: "9px", fontFamily: "Montserrat", color: allDone ? "var(--sage)" : "var(--text-faint)", letterSpacing: "0.08em" }}>M{i + 1}</span>
                    <div style={{ width: "36px", height: "3px", borderRadius: "100px", background: "var(--border-subtle)", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", borderRadius: "100px", background: allDone ? "var(--sage)" : "var(--gold)", transition: "width 0.7s" }} />
                    </div>
                    <span style={{ fontSize: "9px", fontFamily: "Montserrat", color: allDone ? "var(--sage)" : "var(--gold)", fontWeight: 600 }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Stats strip ── */}
        <div className="scroll-x-hidden" style={{ padding: "0 clamp(14px,4vw,24px)", margin: "clamp(8px,1.5vw,12px) 0" }}>
          <div style={{ display: "flex", gap: "10px" }}>
            {[
              { icon: BookOpen,    val: `${(product.modules as unknown[]).length}`, lbl: "módulos" },
              { icon: Play,        val: `${totalLessons}`,                          lbl: "aulas" },
              { icon: CheckCircle, val: `${completedCount}`,                        lbl: "concluídas" },
              { icon: Clock,       val: progress > 0 ? `${progress}%` : "0%",      lbl: "progresso" },
              ...(isCourseComplete ? [{ icon: Award, val: "✦", lbl: "certificado" }] : []),
            ].map(({ icon: Icon, val, lbl }) => (
              <div key={lbl} className="stat-chip">
                <Icon size={12} style={{ color: "var(--gold)" }} strokeWidth={1.5} />
                <div>
                  <p style={{ fontSize: "13px", fontFamily: "Montserrat", fontWeight: 600, color: "var(--text-primary)", lineHeight: 1 }}>{val}</p>
                  <p style={{ fontSize: "9px", fontFamily: "Montserrat", letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--text-faint)", marginTop: "2px" }}>{lbl}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Achievement banner ── */}
        {isCourseComplete && (
          <div style={{ padding: "0 clamp(14px,4vw,24px)", marginBottom: "clamp(8px,1.5vw,14px)" }}>
            <Link to={`/products/${slug}/certificado`} className="achievement-banner" style={{ display: "flex", textDecoration: "none" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "rgba(198,168,112,0.12)", border: "1px solid rgba(198,168,112,0.30)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Award size={20} style={{ color: "var(--gold)" }} strokeWidth={1.3} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "clamp(14px,1.8vw,16px)", color: "var(--gold)", fontWeight: 600, marginBottom: "3px" }}>
                  🎉 Parabéns! Curso concluído.
                </p>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  Seu certificado de conclusão está disponível para download.
                </p>
              </div>
              <span className="btn-gold" style={{ padding: "9px 16px", fontSize: "9px", borderRadius: "10px", flexShrink: 0, whiteSpace: "nowrap" }}>
                Ver certificado
              </span>
            </Link>
          </div>
        )}

        {/* ── Module accordion ── */}
        <div style={{ padding: "0 clamp(14px,4vw,24px)" }}>
          <p className="overline" style={{ color: "var(--gold)", marginBottom: "clamp(12px,2vw,16px)", fontSize: "8px" }}>
            Conteúdo do curso
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {(product.modules as { id: string; title: string; lessons: { id: string; title: string; type: string; duration_min?: number }[] }[]).map((mod, mIdx) => {
              const isOpen  = !!openModules[mod.id];
              const modDone = mod.lessons.filter((l) => completed.has(l.id)).length;
              const allDone = modDone === mod.lessons.length && mod.lessons.length > 0;

              return (
                <div key={mod.id} className="card-dark" style={{ overflow: "hidden" }}>
                  {/* Module header */}
                  <button
                    onClick={() => toggleModule(mod.id)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: "clamp(10px,2vw,14px)",
                      padding: "clamp(14px,2vw,18px) clamp(14px,2.5vw,20px)",
                      background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
                      minHeight: "clamp(60px,8vw,72px)", transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.018)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                  >
                    <span style={{
                      width: "clamp(28px,4vw,34px)", height: "clamp(28px,4vw,34px)", borderRadius: "50%", flexShrink: 0,
                      background: allDone ? "rgba(140,170,150,0.15)" : "rgba(198,168,112,0.12)",
                      color: allDone ? "var(--sage)" : "var(--gold)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "11px", fontFamily: "Montserrat", fontWeight: 500,
                      transition: "background 0.2s, color 0.2s",
                    }}>
                      {allDone ? <CheckCircle size={14} strokeWidth={2} /> : mIdx + 1}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "clamp(14px,1.8vw,16px)", fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.3, marginBottom: "3px" }}>
                        {mod.title}
                      </p>
                      <p style={{ fontSize: "11px", fontFamily: "Montserrat", letterSpacing: "0.08em", textTransform: "uppercase", color: allDone ? "var(--sage)" : "var(--text-faint)" }}>
                        {modDone}/{mod.lessons.length} aulas concluídas
                      </p>
                    </div>
                    {isOpen
                      ? <ChevronDown  size={15} style={{ color: "var(--border-mid)", flexShrink: 0 }} />
                      : <ChevronRight size={15} style={{ color: "var(--border-mid)", flexShrink: 0 }} />
                    }
                  </button>

                  {/* Lessons + quiz */}
                  {isOpen && (
                    <div style={{ borderTop: "1px solid var(--border-subtle)" }}>
                      {mod.lessons.map((lesson, lIdx) => {
                        const Icon   = lessonIcon[lesson.type] ?? FileText;
                        const done   = completed.has(lesson.id);
                        const isLast = lIdx === mod.lessons.length - 1;

                        return (
                          <Link
                            key={lesson.id}
                            to={`/products/${slug}/lesson/${lesson.id}`}
                            className="lesson-row"
                            style={{ borderBottom: isLast ? "none" : "1px solid var(--border-subtle)", display: "flex" }}
                          >
                            <div style={{
                              width: "clamp(28px,4vw,32px)", height: "clamp(28px,4vw,32px)", borderRadius: "50%", flexShrink: 0,
                              background: done ? "rgba(140,170,150,0.12)" : "rgba(198,168,112,0.07)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              transition: "background 0.2s",
                            }}>
                              {done
                                ? <CheckCircle size={13} style={{ color: "var(--sage)" }} strokeWidth={2} />
                                : <Icon size={12} style={{ color: "rgba(198,168,112,0.55)" }} strokeWidth={1.5} />
                              }
                            </div>
                            <p style={{
                              flex: 1, minWidth: 0, fontSize: "clamp(13px,1.6vw,15px)", lineHeight: 1.4,
                              color: done ? "var(--sage)" : "var(--text-muted)",
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>
                              {lesson.title}
                            </p>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                              {lesson.duration_min != null && lesson.duration_min > 0 && (
                                <span style={{ fontSize: "10px", fontFamily: "Montserrat", color: "var(--text-faint)", letterSpacing: "0.06em" }}>
                                  {lesson.duration_min}min
                                </span>
                              )}
                              <span style={{ fontSize: "8px", fontFamily: "Montserrat", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-faint)" }}>
                                {lessonLabel[lesson.type] ?? lesson.type}
                              </span>
                            </div>
                          </Link>
                        );
                      })}

                      {/* Quiz CTA — shown after first lesson is done */}
                      {modDone > 0 && (
                        <div style={{ borderTop: "1px solid var(--border-subtle)", padding: "10px 14px" }}>
                          {activeQuiz === mod.id ? (
                            <div>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                                <p className="font-label" style={{ fontSize: "8.5px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--lavender)" }}>
                                  Quiz do módulo
                                </p>
                                <button
                                  onClick={() => setActiveQuiz(null)}
                                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-faint)", fontSize: "20px", lineHeight: 1, padding: "2px 8px" }}
                                  aria-label="Fechar quiz"
                                >
                                  ×
                                </button>
                              </div>
                              <QuizPlayer
                                moduleId={mod.id} moduleTitle={mod.title}
                                onClose={() => setActiveQuiz(null)}
                                onPassed={() => setActiveQuiz(null)}
                              />
                            </div>
                          ) : (
                            <button
                              onClick={() => setActiveQuiz(mod.id)}
                              data-testid={`start-quiz-${mod.id}`}
                              style={{
                                display: "flex", alignItems: "center", gap: "10px",
                                padding: "10px 14px", borderRadius: "12px",
                                background: "rgba(164,158,208,0.06)",
                                border: "1px solid rgba(164,158,208,0.18)",
                                cursor: "pointer", width: "100%", textAlign: "left",
                                minHeight: "52px",
                                transition: "background 0.15s, border-color 0.15s, transform 0.15s var(--ease-spring)",
                              }}
                              onMouseEnter={(e) => {
                                (e.currentTarget as HTMLElement).style.background = "rgba(164,158,208,0.11)";
                                (e.currentTarget as HTMLElement).style.borderColor = "rgba(164,158,208,0.30)";
                                (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                              }}
                              onMouseLeave={(e) => {
                                (e.currentTarget as HTMLElement).style.background = "rgba(164,158,208,0.06)";
                                (e.currentTarget as HTMLElement).style.borderColor = "rgba(164,158,208,0.18)";
                                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                              }}
                            >
                              <div style={{ width: "34px", height: "34px", borderRadius: "9px", background: "rgba(164,158,208,0.10)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <ClipboardList size={14} style={{ color: "var(--lavender)" }} strokeWidth={1.5} />
                              </div>
                              <div style={{ flex: 1 }}>
                                <p style={{ fontSize: "13px", color: "var(--lavender)", fontWeight: 500, marginBottom: "2px" }}>Quiz do módulo</p>
                                <p style={{ fontSize: "11px", color: "var(--text-faint)" }}>Teste seus conhecimentos antes de avançar</p>
                              </div>
                              <ChevronRight size={13} style={{ color: "rgba(164,158,208,0.50)", flexShrink: 0 }} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
