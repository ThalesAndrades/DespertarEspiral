/**
 * CourseViewPage — Device-optimized course overview
 * Mobile: stacked hero card + collapsible module accordion, full-width tap targets
 * Desktop: hero banner + spacious accordion with side margins
 */
import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import {
  ChevronDown, ChevronRight, Play, FileText, File, Volume2,
  CheckCircle, ArrowLeft, BookOpen, Clock, Award,
} from "lucide-react";

const lessonIcon: Record<string, React.ElementType> = {
  video: Play, text: FileText, pdf: File, audio: Volume2,
};
const lessonLabel: Record<string, string> = {
  video: "Vídeo", text: "Leitura", pdf: "PDF", audio: "Áudio",
};

import mulherEspiralProduct from "@/assets/mulher-espiral-hero-new.jpg";
const FALLBACK = mulherEspiralProduct;

export default function CourseViewPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate  = useNavigate();
  const { user }  = useAuth();

  const [product,     setProduct]     = useState<null | Record<string, unknown>>(null);
  const [completed,   setCompleted]   = useState<Set<string>>(new Set());
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});

  /* -- Load real progress from Supabase */
  useEffect(() => {
    if (!user || !slug) return;
    supabase
      .from("products")
      .select(`
        id, slug, title, subtitle, description, thumbnail_url,
        modules(id, title, sort_order,
          lessons(id, title, type, duration_min, is_free, sort_order)
        )
      `)
      .eq("slug", slug)
      .single()
      .then(({ data }) => {
        if (!data) { navigate("/products"); return; }
        setProduct(data as unknown as Record<string, unknown>);
        const firstModId = (data as unknown as { modules?: { id: string }[] }).modules?.[0]?.id;
        if (firstModId) setOpenModules((prev) => (prev[firstModId] !== undefined ? prev : { ...prev, [firstModId]: true }));
      });

    supabase
      .from("lesson_progress")
      .select("lesson_id")
      .eq("user_id", user.id)
      .eq("completed", true)
      .then(({ data }) => {
        if (data) setCompleted(new Set(data.map((r: { lesson_id: string }) => r.lesson_id)));
      });
  }, [user, slug]);

  // Safe guard — normalize modules to always be an array
  if (product && !Array.isArray(product.modules)) {
    (product as Record<string, unknown>).modules = [];
  }

  if (!product) return (
    <DashboardLayout>
      <div style={{ padding: "64px 24px", textAlign: "center" }}>
        <p style={{ color: "var(--text-muted)", marginBottom: "16px" }}>Produto não encontrado.</p>
        <Link to="/products" className="btn-outline-gold" style={{ fontSize: "9px", padding: "10px 24px" }}>Ver meus cursos</Link>
      </div>
    </DashboardLayout>
  );

  const hasAccess = Boolean(user?.products?.includes((product as unknown as { slug?: string }).slug ?? slug ?? ""));

  if (!hasAccess) {
    const previewLessons = product.modules
      .flatMap((m: { lessons: { is_free_preview?: boolean; is_free?: boolean }[] }) => m.lessons)
      .filter((l: { is_free_preview?: boolean; is_free?: boolean }) => Boolean(l.is_free_preview ?? l.is_free));

    return (
      <DashboardLayout>
        <div style={{ maxWidth: "760px", margin: "0 auto", padding: "clamp(20px,4vw,32px) clamp(14px,4vw,24px) clamp(40px,6vw,80px)" }}>
          <div className="card-dark" style={{ overflow: "hidden" }}>
            <div style={{ padding: "clamp(18px,3vw,26px)" }}>
              <p className="overline" style={{ color: "var(--gold)", marginBottom: "8px" }}>Acesso necessário</p>
              <h1 className="font-display" style={{ fontSize: "clamp(22px,4vw,40px)", fontWeight: 300, color: "var(--text-primary)", marginBottom: "10px" }}>
                {product.title}
              </h1>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.85, marginBottom: "18px" }}>
                Para ver o conteúdo completo, ative seu acesso ao curso. Você pode começar com as aulas de prévia gratuita quando disponíveis.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "420px" }}>
                <Link to={`/checkout/${slug}`} className="btn-gold" style={{ justifyContent: "center", minHeight: "54px", borderRadius: "16px", fontSize: "9px" }}>
                  Liberar acesso agora <Play size={13} fill="#060810" style={{ color: "#060810" }} />
                </Link>
                <button
                  onClick={() => navigate("/products")}
                  className="btn-ghost"
                  style={{ justifyContent: "center", minHeight: "50px", borderRadius: "16px", fontSize: "9px" }}
                >
                  ← Voltar para meus cursos
                </button>
              </div>
            </div>

            {previewLessons.length > 0 && (
              <div style={{ borderTop: "1px solid var(--border-subtle)", padding: "clamp(18px,3vw,26px)" }}>
                <p className="font-label" style={{ fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: "12px" }}>
                  Prévia gratuita
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {previewLessons.slice(0, 6).map((l: { id: string; title: string; type: string }) => (
                    <Link
                      key={l.id}
                      to={`/products/${slug}/lesson/${l.id}`}
                      className="card-dark"
                      style={{ padding: "12px 14px", textDecoration: "none" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                        <span style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500, lineHeight: 1.35 }}>
                          {l.title}
                        </span>
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

  const allLessons     = (product.modules as { lessons: { id: string }[] }[] ?? []).flatMap((m) => m.lessons);
  const totalLessons   = allLessons.length;
  const completedCount = allLessons.filter((l: { id: string }) => completed.has(l.id)).length;
  const progress       = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
  const isCourseComplete = progress === 100 && totalLessons > 0;

  const toggleModule = (id: string) =>
    setOpenModules((p) => ({ ...p, [id]: !p[id] }));

  /* Find first uncompleted lesson for "continuar" CTA */
  const nextLesson = allLessons.find((l) => !completed.has((l as { id: string }).id)) ?? allLessons[0];

  return (
    <DashboardLayout>
      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "0 0 clamp(40px,6vw,80px)" }}>

        {/* ── Back button ── */}
        <div style={{ padding: "clamp(14px,2.5vw,20px) clamp(14px,4vw,24px) 0" }}>
          <button
            onClick={() => navigate("/products")}
            style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              background: "transparent", border: "none", cursor: "pointer",
              fontSize: "9px", fontFamily: "Montserrat, sans-serif",
              letterSpacing: "0.18em", textTransform: "uppercase",
              color: "var(--text-muted)", padding: "8px 0", minHeight: "44px",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--gold)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-muted)")}
          >
            <ArrowLeft size={13} /> Meus Cursos
          </button>
        </div>

        {/* ── Hero card ── */}
        <div style={{ margin: "clamp(8px,1.5vw,12px) clamp(14px,4vw,24px)" }}>
          <div className="card-dark" style={{ overflow: "hidden" }}>
            {/* Thumbnail */}
            <div style={{ position: "relative", height: "clamp(160px,28vw,240px)", overflow: "hidden" }}>
              <img
                src={(product as unknown as { thumbnail_url?: string }).thumbnail_url
                  ?? (product as unknown as { thumbnail?: string }).thumbnail
                  ?? FALLBACK}
                alt={product.title}
                loading="lazy" decoding="async"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(7,9,21,0.94) 0%, rgba(7,9,21,0.5) 55%, rgba(7,9,21,0.15) 100%)" }} />

              {/* Hero text overlay */}
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "clamp(16px,3vw,28px)" }}>
                {product.subtitle && (
                  <span className="badge-rose" style={{ marginBottom: "10px", alignSelf: "flex-start" }}>
                    {product.subtitle}
                  </span>
                )}
                <h1 className="font-display" style={{ fontSize: "clamp(22px,4.5vw,40px)", fontWeight: 300, color: "#f5f0e8", lineHeight: 1.1, marginBottom: "6px" }}>
                  {product.title}
                </h1>
                <p style={{ fontSize: "9px", fontFamily: "Montserrat, sans-serif", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(245,240,232,0.40)" }}>
                  {product.modules.length} módulos · {totalLessons} aulas
                </p>
              </div>
            </div>

            {/* Progress + CTA footer */}
            <div style={{ padding: "clamp(14px,2.5vw,20px) clamp(16px,3vw,24px)", borderTop: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "140px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    {completedCount} de {totalLessons} aulas
                  </span>
                  <span style={{ fontSize: "13px", fontFamily: "Montserrat, sans-serif", fontWeight: 600, color: "var(--gold)" }}>
                    {progress}%
                  </span>
                </div>
                <div className="progress-bar" style={{ height: "4px" }}>
                  <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {isCourseComplete ? (
                  <Link
                    to={`/products/${slug}/certificado`}
                    className="btn-gold"
                    style={{ padding: "11px 20px", fontSize: "9px", borderRadius: "12px", flexShrink: 0, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "6px" }}
                  >
                    <Award size={13} /> Ver certificado
                  </Link>
                ) : nextLesson ? (
                  <Link
                    to={`/products/${slug}/lesson/${nextLesson.id}`}
                    className="btn-gold"
                    style={{ padding: "11px 20px", fontSize: "9px", borderRadius: "12px", flexShrink: 0, whiteSpace: "nowrap" }}
                  >
                    <Play size={12} fill="#060810" style={{ color: "#060810" }} />
                    {completedCount === 0 ? "Começar" : "Continuar"}
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* ── Module progress quick view ── */}
        {product.modules.length > 0 && (
          <div style={{ padding: "0 clamp(14px,4vw,24px)", margin: "clamp(8px,1.5vw,12px) 0" }}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {product.modules.slice(0, 4).map((mod: { id: string; title: string; lessons: { id: string }[] }, i: number) => {
                const modLessons = mod.lessons.map((l) => l.id);
                const modDone    = modLessons.filter((id) => completed.has(id)).length;
                const pct        = modLessons.length > 0 ? Math.round((modDone / modLessons.length) * 100) : 0;
                const allDone    = pct === 100;
                return (
                  <div key={mod.id} style={{ padding: "8px 12px", borderRadius: "10px", background: "var(--bg-surface-2)", border: `1px solid ${allDone ? "rgba(140,170,150,0.25)" : "var(--border-subtle)"}`, display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                    <span style={{ fontSize: "9px", fontFamily: "Montserrat, sans-serif", color: allDone ? "var(--sage)" : "var(--text-faint)", letterSpacing: "0.08em" }}>M{i + 1}</span>
                    <div style={{ width: "40px", height: "3px", borderRadius: "100px", background: "var(--border-subtle)", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", borderRadius: "100px", background: allDone ? "var(--sage)" : "var(--gold)", transition: "width 0.6s" }} />
                    </div>
                    <span style={{ fontSize: "9px", fontFamily: "Montserrat, sans-serif", color: allDone ? "var(--sage)" : "var(--gold)", fontWeight: 600 }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Stats strip ── */}
        <div style={{ padding: "0 clamp(14px,4vw,24px)", margin: "clamp(12px,2vw,16px) 0" }}>
          <div style={{ display: "flex", gap: "12px", overflowX: "auto", scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {[
              { icon: BookOpen, val: `${product.modules.length}`,   lbl: "módulos" },
              { icon: Play,     val: `${totalLessons}`,             lbl: "aulas" },
              { icon: CheckCircle, val: `${completedCount}`,        lbl: "concluídas" },
              { icon: Clock,    val: progress > 0 ? `${progress}%` : "0%", lbl: "progresso" },
              ...(isCourseComplete ? [{ icon: Award, val: "✦", lbl: "certificado" }] : []),
            ].map(({ icon: Icon, val, lbl }) => (
              <div
                key={lbl}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "10px 14px", borderRadius: "12px", flexShrink: 0,
                  background: "var(--bg-surface-2)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <Icon size={13} style={{ color: "var(--gold)" }} strokeWidth={1.5} />
                <div>
                  <p style={{ fontSize: "14px", fontFamily: "Montserrat, sans-serif", fontWeight: 600, color: "var(--text-primary)", lineHeight: 1 }}>{val}</p>
                  <p style={{ fontSize: "9px", fontFamily: "Montserrat, sans-serif", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-faint)", marginTop: "2px" }}>{lbl}</p>
                </div>
              </div>
            ))}
          </div>
          <style>{`.scroll-x-hide::-webkit-scrollbar { display: none; }`}</style>
        </div>

        {/* ── Certificate CTA — shown when 100% complete ── */}
        {isCourseComplete && (
          <div style={{ padding: "0 clamp(14px,4vw,24px)", marginBottom: "clamp(8px,1.5vw,14px)" }}>
            <Link
              to={`/products/${slug}/certificado`}
              style={{ textDecoration: "none", display: "block" }}
            >
              <div style={{
                display: "flex", alignItems: "center", gap: "14px",
                padding: "clamp(14px,2.5vw,20px) clamp(16px,3vw,22px)",
                borderRadius: "clamp(14px,2vw,18px)",
                background: "linear-gradient(135deg, rgba(198,168,112,0.12) 0%, rgba(198,168,112,0.05) 100%)",
                border: "1px solid rgba(198,168,112,0.35)",
              }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "rgba(198,168,112,0.12)", border: "1px solid rgba(198,168,112,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
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
              </div>
            </Link>
          </div>
        )}

        {/* ── Module accordion ── */}
        <div style={{ padding: "0 clamp(14px,4vw,24px)" }}>
          <p className="overline" style={{ color: "var(--gold)", marginBottom: "clamp(12px,2vw,16px)", fontSize: "8px" }}>Conteúdo do curso</p>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {product.modules.map((mod: { id: string; title: string; lessons: { id: string; title: string; type: string; duration_min?: number }[] }, mIdx: number) => {
              const isOpen   = !!openModules[mod.id];
              const modDone  = mod.lessons.filter((l) => completed.has(l.id)).length;
              const allDone  = modDone === mod.lessons.length && mod.lessons.length > 0;

              return (
                <div key={mod.id} className="card-dark" style={{ overflow: "hidden" }}>
                  {/* Module header — full tap target */}
                  <button
                    onClick={() => toggleModule(mod.id)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: "clamp(10px,2vw,14px)",
                      padding: "clamp(14px,2vw,18px) clamp(14px,2.5vw,20px)",
                      background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
                      minHeight: "clamp(60px,8vw,72px)",
                      transition: "background 0.15s",
                    }}
                  >
                    {/* Number badge */}
                    <span style={{
                      width: "clamp(28px,4vw,34px)", height: "clamp(28px,4vw,34px)",
                      borderRadius: "50%", flexShrink: 0,
                      background: allDone ? "rgba(140,170,150,0.15)" : "rgba(198,168,112,0.12)",
                      color: allDone ? "var(--sage)" : "var(--gold)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "11px", fontFamily: "Montserrat, sans-serif", fontWeight: 500,
                    }}>
                      {allDone ? <CheckCircle size={14} strokeWidth={2} /> : mIdx + 1}
                    </span>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: "clamp(14px,1.8vw,16px)", fontWeight: 500,
                        color: "var(--text-primary)", lineHeight: 1.3, marginBottom: "3px",
                      }}>
                        {mod.title}
                      </p>
                      <p style={{
                        fontSize: "11px", fontFamily: "Montserrat, sans-serif",
                        letterSpacing: "0.08em", textTransform: "uppercase",
                        color: allDone ? "var(--sage)" : "var(--text-faint)",
                      }}>
                        {modDone}/{mod.lessons.length} aulas concluídas
                      </p>
                    </div>

                    {isOpen
                      ? <ChevronDown  size={15} style={{ color: "var(--border-mid)", flexShrink: 0 }} />
                      : <ChevronRight size={15} style={{ color: "var(--border-mid)", flexShrink: 0 }} />
                    }
                  </button>

                  {/* Lessons list */}
                  {isOpen && (
                    <div style={{ borderTop: "1px solid var(--border-subtle)" }}>
                      {mod.lessons.map((lesson, lIdx) => {
                        const Icon = lessonIcon[lesson.type] ?? FileText;
                        const done = completed.has(lesson.id);
                        const isLast = lIdx === mod.lessons.length - 1;

                        return (
                          <Link
                            key={lesson.id}
                            to={`/products/${slug}/lesson/${lesson.id}`}
                            style={{
                              display: "flex", alignItems: "center", gap: "clamp(10px,2vw,14px)",
                              padding: "clamp(12px,2vw,14px) clamp(14px,2.5vw,20px)",
                              textDecoration: "none",
                              borderBottom: isLast ? "none" : "1px solid var(--border-subtle)",
                              transition: "background 0.15s",
                              minHeight: "clamp(52px,7vw,60px)",
                            }}
                            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.025)")}
                            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                          >
                            {/* Lesson icon */}
                            <div style={{
                              width: "clamp(28px,4vw,32px)", height: "clamp(28px,4vw,32px)",
                              borderRadius: "50%", flexShrink: 0,
                              background: done ? "rgba(140,170,150,0.12)" : "rgba(198,168,112,0.07)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              transition: "background 0.2s",
                            }}>
                              {done
                                ? <CheckCircle size={13} style={{ color: "var(--sage)" }} strokeWidth={2} />
                                : <Icon size={12} style={{ color: "rgba(198,168,112,0.55)" }} strokeWidth={1.5} />
                              }
                            </div>

                            {/* Title */}
                            <p style={{
                              flex: 1, minWidth: 0,
                              fontSize: "clamp(13px,1.6vw,15px)", lineHeight: 1.4,
                              color: done ? "var(--sage)" : "var(--text-muted)",
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>
                              {lesson.title}
                            </p>

                            {/* Meta */}
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                              {lesson.duration_min != null && lesson.duration_min > 0 && (
                                <span style={{ fontSize: "10px", fontFamily: "Montserrat", color: "var(--text-faint)", letterSpacing: "0.06em" }}>
                                  {lesson.duration_min}min
                                </span>
                              )}
                              <span style={{
                                fontSize: "8px", fontFamily: "Montserrat, sans-serif", letterSpacing: "0.14em",
                                textTransform: "uppercase", color: "var(--text-faint)",
                              }}>
                                {lessonLabel[lesson.type] ?? lesson.type}
                              </span>
                            </div>
                          </Link>
                        );
                      })}
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
