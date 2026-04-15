import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { safeEmbedUrl, safeExternalUrl, sanitizeHtml } from "@/lib/contentSafety";
import {
  CheckCircle, ArrowLeft, ArrowRight, Play, FileText,
  File, Volume2, ChevronRight, ChevronDown, List, X,
} from "lucide-react";
import { toast } from "sonner";

const typeIcons: Record<string, React.ElementType> = {
  video: Play, text: FileText, pdf: File, audio: Volume2,
};

const typeLabel: Record<string, string> = {
  video: "Vídeo", text: "Leitura", pdf: "PDF", audio: "Áudio",
};

export default function LessonPage() {
  const { slug, lessonId } = useParams<{ slug: string; lessonId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState<Record<string, unknown> | null>(null);
  const [lessonData, setLessonData] = useState<Record<string, unknown> | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!slug || !lessonId) return;

    (async () => {
      setLoading(true);

      const { data: prod } = await supabase
        .from("products")
        .select(`
          id, slug, title, subtitle,
          modules(id, title, sort_order,
            lessons(id, module_id, title, type, sort_order, is_free)
          )
        `)
        .eq("slug", slug)
        .single();

      if (cancelled) return;

      if (prod) {
        const normalized = prod as unknown as Record<string, unknown>;
        const mods = ((normalized.modules as unknown[]) ?? []).slice().sort((a, b) =>
          ((a as Record<string, unknown>).sort_order as number ?? 0) - ((b as Record<string, unknown>).sort_order as number ?? 0)
        );
        for (const m of mods as Record<string, unknown>[]) {
          const ls = ((m.lessons as unknown[]) ?? []).slice().sort((a, b) =>
            ((a as Record<string, unknown>).sort_order as number ?? 0) - ((b as Record<string, unknown>).sort_order as number ?? 0)
          );
          m.lessons = ls;
        }
        normalized.modules = mods;
        setProduct(normalized);
      } else {
        setProduct(null);
      }

      if (user?.id) {
        const { data: progress } = await supabase
          .from("lesson_progress")
          .select("lesson_id")
          .eq("user_id", user.id)
          .eq("completed", true);
        if (!cancelled) setCompleted(new Set((progress ?? []).map((r: { lesson_id: string }) => r.lesson_id)));
      } else if (!cancelled) {
        setCompleted(new Set());
      }

      const { data: lessonRow } = await supabase
        .from("lessons")
        .select("id, module_id, title, type, content, sort_order, is_free")
        .eq("id", lessonId)
        .maybeSingle();

      if (!cancelled) setLessonData((lessonRow as unknown as Record<string, unknown>) ?? null);
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [slug, lessonId, user?.id]);

  if (loading) {
    return (
      <DashboardLayout>
        <div style={{ padding: "72px 24px", display: "flex", justifyContent: "center" }}>
          <div style={{ width: "24px", height: "24px", borderRadius: "50%", border: "2px solid var(--border-subtle)", borderTopColor: "var(--gold)", animation: "spin 0.8s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </DashboardLayout>
    );
  }

  if (!product) {
    return (
      <DashboardLayout>
        <div style={{ padding: "48px 24px", textAlign: "center" }}>
          <p style={{ color: "var(--text-muted)", marginBottom: "16px" }}>Produto não encontrado.</p>
          <Link to="/products" className="btn-outline-gold" style={{ fontSize: "9px", padding: "10px 24px" }}>
            Ver meus cursos
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const mods = (product.modules as { id: string; title: string; lessons: Record<string, unknown>[] }[]) ?? [];
  const allLessons = mods.flatMap((m) => (m.lessons as Record<string, unknown>[]) ?? []);
  const currentIndex = allLessons.findIndex((l) => (l.id as string) === lessonId);
  const lessonMeta = currentIndex >= 0 ? allLessons[currentIndex] : null;
  const lesson = (lessonData ?? lessonMeta) as Record<string, unknown> | null;
  const prevLesson = currentIndex > 0 ? (allLessons[currentIndex - 1] as Record<string, unknown>) : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? (allLessons[currentIndex + 1] as Record<string, unknown>) : null;
  const moduleOfLesson = mods.find((m) => m.id === ((lesson?.module_id as string | undefined) ?? (lessonMeta?.module_id as string | undefined)));

  if (!lesson) {
    return (
      <DashboardLayout>
        <div style={{ maxWidth: "760px", margin: "0 auto", padding: "clamp(24px,4vw,40px) clamp(14px,4vw,24px)" }}>
          <div className="card-dark" style={{ padding: "clamp(20px,4vw,36px)", textAlign: "center" }}>
            <p className="overline" style={{ color: "var(--gold)", marginBottom: "10px" }}>Indisponível</p>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.85, marginBottom: "18px" }}>
              Esta aula não está disponível para sua conta.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "360px", margin: "0 auto" }}>
              <Link to={`/checkout/${product.slug as string}`} className="btn-gold" style={{ justifyContent: "center", minHeight: "54px", borderRadius: "16px", fontSize: "9px" }}>
                Liberar acesso agora <ArrowRight size={14} />
              </Link>
              <Link to="/products" className="btn-ghost" style={{ justifyContent: "center", minHeight: "50px", borderRadius: "16px", fontSize: "9px" }}>
                Voltar para meus cursos
              </Link>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const markComplete = async () => {
    const id = lesson.id as string;
    setCompleted((prev) => { const s = new Set(prev); s.add(id); return s; });
    if (user?.id) {
      const { error } = await supabase
        .from("lesson_progress")
        .upsert(
          { user_id: user.id, lesson_id: id, completed: true, completed_at: new Date().toISOString() },
          { onConflict: "user_id,lesson_id" }
        );
      if (error) {
        // Revert optimistic update on failure
        setCompleted((prev) => { const s = new Set(prev); s.delete(id); return s; });
        toast.error("Não foi possível salvar o progresso.");
        return;
      }
    }
    toast.success("Aula concluída. ✦");
    if (nextLesson?.id) setTimeout(() => navigate(`/products/${slug}/lesson/${nextLesson.id as string}`), 500);
  };

  const isDone = completed.has(lesson.id as string);
  const isFreePreview = Boolean((lesson as unknown as { is_free_preview?: boolean; is_free?: boolean }).is_free_preview ?? (lesson as unknown as { is_free?: boolean }).is_free);
  const hasAccess = Boolean(user?.products?.includes(product.slug as string));

  if (!hasAccess && !isFreePreview) {
    return (
      <DashboardLayout>
        <div style={{ maxWidth: "760px", margin: "0 auto", padding: "clamp(24px,4vw,40px) clamp(14px,4vw,24px)" }}>
          <div className="card-dark" style={{ padding: "clamp(20px,4vw,36px)", textAlign: "center" }}>
            <p className="overline" style={{ color: "var(--gold)", marginBottom: "10px" }}>Conteúdo exclusivo</p>
            <h1 className="font-display" style={{ fontSize: "clamp(22px,4vw,34px)", fontWeight: 300, color: "var(--text-primary)", marginBottom: "10px" }}>
              Esta aula faz parte do acesso do curso.
            </h1>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.85, marginBottom: "18px" }}>
              Para assistir, ative seu acesso ao <strong style={{ color: "var(--text-primary)", fontWeight: 500 }}>{product.title as string}</strong>.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "360px", margin: "0 auto" }}>
              <Link to={`/checkout/${product.slug as string}`} className="btn-gold" style={{ justifyContent: "center", minHeight: "54px", borderRadius: "16px", fontSize: "9px" }}>
                Liberar acesso agora <ArrowRight size={14} />
              </Link>
              <Link to="/products" className="btn-ghost" style={{ justifyContent: "center", minHeight: "50px", borderRadius: "16px", fontSize: "9px" }}>
                Voltar para meus cursos
              </Link>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  /* ── Modules sidebar content (shared between drawer + desktop panel) ── */
  function ModuleList({ onSelect }: { onSelect?: () => void }) {
    const [openMods, setOpenMods] = useState<Record<string, boolean>>(() => {
      const init: Record<string, boolean> = {};
      product!.modules.forEach((m) => {
        if (m.id === moduleOfLesson?.id) init[m.id] = true;
      });
      return init;
    });

    return (
      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* Back to course */}
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border-subtle)" }}>
          <Link
            to={`/products/${slug}`}
            style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              fontSize: "9px", fontFamily: "Montserrat, sans-serif", letterSpacing: "0.18em",
              textTransform: "uppercase", color: "var(--text-muted)", textDecoration: "none",
              transition: "color 0.2s", minHeight: "36px",
            }}
            onClick={onSelect}
          >
            <ArrowLeft size={12} /> {product!.title}
          </Link>
        </div>

        {/* Modules */}
        {product!.modules.map((mod, mIdx) => {
          const isOpen = !!openMods[mod.id];
          const modDone = mod.lessons.filter((l) => completed.has(l.id)).length;
          return (
            <div key={mod.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              {/* Module header */}
              <button
                onClick={() => setOpenMods((p) => ({ ...p, [mod.id]: !p[mod.id] }))}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: "10px",
                  padding: "12px 16px", background: "transparent", border: "none", cursor: "pointer",
                  textAlign: "left", minHeight: "52px",
                }}
              >
                <span style={{
                  width: "22px", height: "22px", borderRadius: "50%", flexShrink: 0,
                  background: "rgba(198,168,112,0.12)", color: "var(--gold)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "10px", fontFamily: "Montserrat, sans-serif", fontWeight: 500,
                }}>
                  {mIdx + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500, lineHeight: 1.3, marginBottom: "2px" }}>{mod.title}</p>
                  <p style={{ fontSize: "10px", color: "var(--text-faint)", fontFamily: "Montserrat, sans-serif", letterSpacing: "0.08em" }}>
                    {modDone}/{mod.lessons.length} concluídas
                  </p>
                </div>
                {isOpen
                  ? <ChevronDown size={13} style={{ color: "var(--border-mid)", flexShrink: 0 }} />
                  : <ChevronRight size={13} style={{ color: "var(--border-mid)", flexShrink: 0 }} />
                }
              </button>

              {/* Lessons */}
              {isOpen && mod.lessons.map((l) => {
                const Icon = typeIcons[l.type] ?? FileText;
                const isActive = l.id === lessonId;
                const done = completed.has(l.id);
                return (
                  <Link
                    key={l.id}
                    to={`/products/${slug}/lesson/${l.id}`}
                    onClick={onSelect}
                    style={{
                      display: "flex", alignItems: "center", gap: "10px",
                      padding: "10px 16px 10px 24px", textDecoration: "none",
                      background: isActive ? "rgba(198,168,112,0.10)" : "transparent",
                      borderLeft: isActive ? "2px solid var(--gold)" : "2px solid transparent",
                      transition: "background 0.15s",
                      minHeight: "48px",
                    }}
                  >
                    <div style={{
                      width: "24px", height: "24px", borderRadius: "50%", flexShrink: 0,
                      background: done ? "rgba(140,170,150,0.15)" : "rgba(198,168,112,0.07)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {done
                        ? <CheckCircle size={12} style={{ color: "var(--sage)" }} strokeWidth={2} />
                        : <Icon size={11} style={{ color: isActive ? "var(--gold)" : "rgba(198,168,112,0.5)" }} strokeWidth={1.5} />
                      }
                    </div>
                    <p style={{
                      flex: 1, minWidth: 0, fontSize: "13px", lineHeight: 1.4,
                      color: isActive ? "var(--gold)" : done ? "var(--sage)" : "var(--text-muted)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {l.title}
                    </p>
                    {!done && !isActive && (
                      <span style={{ fontSize: "8px", fontFamily: "Montserrat", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-faint)", flexShrink: 0 }}>
                        {typeLabel[l.type] ?? l.type}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <DashboardLayout>
      {/*
        Layout:
        Mobile  → full-width stacked (player → content → actions)
                  + sticky top lesson bar + sticky bottom nav
                  + slide-up drawer for module list
        Desktop → fixed sidebar (256px) + scrollable content (flex-1)
      */}
      <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>

        {/* ── Desktop sidebar ── */}
        <aside
          className="hidden lg:flex flex-col"
          style={{
            width: "256px", flexShrink: 0,
            background: "var(--bg-surface-2)",
            borderRight: "1px solid var(--border-subtle)",
            height: "100%", overflow: "hidden", display: "flex", flexDirection: "column",
          }}
        >
          <ModuleList />
        </aside>

        {/* ── Mobile module drawer ── */}
        {drawerOpen && (
          <div
            style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "flex-end" }}
            className="lg:hidden"
          >
            {/* Backdrop */}
            <div
              style={{ position: "absolute", inset: 0, background: "rgba(7,9,21,0.65)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
              onClick={() => setDrawerOpen(false)}
            />
            {/* Sheet */}
            <div
              style={{
                position: "relative", zIndex: 1, width: "100%",
                background: "var(--bg-surface-2)",
                borderTop: "1px solid var(--border-soft)",
                borderRadius: "24px 24px 0 0",
                maxHeight: "82dvh",
                display: "flex", flexDirection: "column",
                paddingBottom: "env(safe-area-inset-bottom)",
              }}
            >
              {/* Handle + header */}
              <div style={{ padding: "14px 20px 10px", borderBottom: "1px solid var(--border-subtle)", flexShrink: 0 }}>
                <div style={{ width: "36px", height: "3px", borderRadius: "100px", background: "var(--border-mid)", margin: "0 auto 14px" }} />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <p className="overline" style={{ color: "var(--gold)", fontSize: "8px" }}>Conteúdo do curso</p>
                  <button
                    onClick={() => setDrawerOpen(false)}
                    style={{ width: "32px", height: "32px", borderRadius: "50%", background: "rgba(255,255,255,0.05)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}
                    aria-label="Fechar"
                  >
                    <X size={14} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
              <ModuleList onSelect={() => setDrawerOpen(false)} />
            </div>
          </div>
        )}

        {/* ── Main content ── */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", minWidth: 0 }}>

          {/* Mobile: sticky lesson top bar */}
          <div
            className="lg:hidden"
            style={{
              position: "sticky", top: 0, zIndex: 50,
              display: "flex", alignItems: "center", gap: "10px",
              padding: "0 12px",
              height: "48px",
              background: "var(--bg-surface-2)",
              borderBottom: "1px solid var(--border-subtle)",
              flexShrink: 0,
            }}
          >
            <button
              onClick={() => setDrawerOpen(true)}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                background: "transparent", border: "none", cursor: "pointer",
                color: "var(--text-muted)", fontSize: "11px",
                fontFamily: "Montserrat, sans-serif", letterSpacing: "0.12em",
                padding: "6px 0", minHeight: "44px",
              }}
            >
              <List size={14} strokeWidth={1.5} style={{ color: "var(--gold)" }} />
              <span style={{ textTransform: "uppercase" }}>Módulos</span>
            </button>
            <div style={{ flex: 1, height: "1px", background: "var(--border-subtle)" }} />
            <span style={{ fontSize: "10px", fontFamily: "Montserrat, sans-serif", color: "var(--text-faint)" }}>
              {currentIndex + 1}/{allLessons.length}
            </span>
          </div>

          {/* Content area */}
          <div style={{ flex: 1, maxWidth: "780px", width: "100%", margin: "0 auto", padding: "clamp(16px,3vw,32px) clamp(14px,4vw,32px) 100px" }}>

            {/* Breadcrumb */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "clamp(12px,2vw,20px)", flexWrap: "wrap" }}>
              <Link
                to={`/products/${slug}`}
                style={{ fontSize: "9px", fontFamily: "Montserrat, sans-serif", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-faint)", textDecoration: "none", transition: "color 0.2s", display: "inline-flex", alignItems: "center", gap: "4px", minHeight: "36px" }}
              >
                <ArrowLeft size={11} /> Curso
              </Link>
              <span style={{ color: "var(--border-mid)", fontSize: "10px" }}>›</span>
              <span style={{ fontSize: "9px", fontFamily: "Montserrat, sans-serif", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--lavender)" }}>
                {moduleOfLesson?.title}
              </span>
            </div>

            {/* Lesson title */}
            <h1
              className="font-display"
              style={{ fontSize: "clamp(22px,4vw,36px)", fontWeight: 300, color: "var(--text-primary)", lineHeight: 1.15, marginBottom: "clamp(16px,2.5vw,24px)" }}
            >
              {lesson.title}
            </h1>

            {/* Type badge */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "clamp(16px,3vw,28px)" }}>
              {(() => {
                const Icon = typeIcons[lesson.type] ?? FileText;
                return (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: "5px",
                    padding: "4px 12px", borderRadius: "100px",
                    background: "rgba(198,168,112,0.08)", border: "1px solid rgba(198,168,112,0.18)",
                    fontSize: "9px", fontFamily: "Montserrat, sans-serif", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--gold)",
                  }}>
                    <Icon size={10} strokeWidth={1.5} /> {typeLabel[lesson.type] ?? lesson.type}
                  </span>
                );
              })()}
              {isDone && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: "5px",
                  padding: "4px 12px", borderRadius: "100px",
                  background: "rgba(140,170,150,0.10)", border: "1px solid rgba(140,170,150,0.22)",
                  fontSize: "9px", fontFamily: "Montserrat, sans-serif", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--sage)",
                }}>
                  <CheckCircle size={10} strokeWidth={2} /> Concluída
                </span>
              )}
            </div>

            {/* ── VIDEO ── */}
            {lesson.type === "video" && (
              <div style={{
                position: "relative", width: "100%",
                paddingTop: "56.25%", /* 16:9 */
                borderRadius: "clamp(12px,2vw,18px)",
                overflow: "hidden",
                background: "#000",
                marginBottom: "clamp(20px,3vw,32px)",
                boxShadow: "0 12px 48px rgba(0,0,0,0.5)",
              }}>
                {safeEmbedUrl(lesson.content) ? (
                  <iframe
                    src={safeEmbedUrl(lesson.content) as string}
                    title={lesson.title}
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
                    sandbox="allow-same-origin allow-scripts allow-presentation"
                    referrerPolicy="no-referrer"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "18px" }}>
                    <div style={{ textAlign: "center" }}>
                      <p style={{ fontSize: "14px", color: "rgba(245,240,232,0.75)", lineHeight: 1.7, marginBottom: "10px" }}>
                        Link de vídeo inválido ou não permitido.
                      </p>
                      <a
                        href="mailto:contato@despertarespiral.com"
                        className="btn-outline-gold"
                        style={{ fontSize: "9px", padding: "10px 22px" }}
                      >
                        Falar com suporte
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── TEXT ── */}
            {lesson.type === "text" && (
              <div style={{
                borderRadius: "clamp(12px,2vw,16px)",
                padding: "clamp(20px,4vw,36px)",
                marginBottom: "clamp(20px,3vw,32px)",
                background: "var(--bg-surface-2)",
                border: "1px solid var(--border-subtle)",
                fontSize: "clamp(15px,1.7vw,17px)",
                color: "var(--text-secondary)",
                lineHeight: 1.92,
              }}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(lesson.content) }}
              />
            )}

            {/* ── PDF ── */}
            {lesson.type === "pdf" && (
              <div
                className="card-dark"
                style={{ padding: "clamp(32px,6vw,56px)", textAlign: "center", marginBottom: "clamp(20px,3vw,32px)" }}
              >
                <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(198,168,112,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
                  <File size={28} style={{ color: "var(--gold)" }} strokeWidth={1.2} />
                </div>
                <p style={{ fontSize: "15px", color: "var(--text-primary)", marginBottom: "6px", fontWeight: 500 }}>{lesson.title}</p>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "24px" }}>Arquivo PDF disponível para download</p>
                {safeExternalUrl(lesson.content) ? (
                  <a href={safeExternalUrl(lesson.content) as string} target="_blank" rel="noopener noreferrer" className="btn-gold" style={{ fontSize: "9px", padding: "12px 28px" }}>
                    Abrir PDF
                  </a>
                ) : (
                  <span className="btn-outline-gold" style={{ fontSize: "9px", padding: "12px 28px", opacity: 0.7, cursor: "not-allowed" }}>
                    Link inválido
                  </span>
                )}
              </div>
            )}

            {/* ── AUDIO ── */}
            {lesson.type === "audio" && (
              <div className="card-dark" style={{ padding: "clamp(20px,3vw,28px)", marginBottom: "clamp(20px,3vw,32px)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(198,168,112,0.10)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Volume2 size={18} style={{ color: "var(--gold)" }} strokeWidth={1.5} />
                  </div>
                  <p style={{ fontSize: "15px", color: "var(--text-primary)", fontWeight: 500 }}>{lesson.title}</p>
                </div>
                <audio controls style={{ width: "100%", borderRadius: "8px" }} src={safeExternalUrl(lesson.content) ?? ""}>
                  Seu navegador não suporta áudio.
                </audio>
              </div>
            )}

            {/* ── Desktop navigation ── */}
            <div
              className="hidden lg:flex"
              style={{
                alignItems: "center", justifyContent: "space-between",
                paddingTop: "24px",
                borderTop: "1px solid var(--border-subtle)",
                gap: "12px",
              }}
            >
              <div>
                {prevLesson && (
                  <Link
                    to={`/products/${slug}/lesson/${prevLesson.id}`}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "6px",
                      fontSize: "9px", fontFamily: "Montserrat, sans-serif", letterSpacing: "0.15em",
                      textTransform: "uppercase", color: "var(--text-muted)", textDecoration: "none",
                      transition: "color 0.2s", padding: "8px 0", minHeight: "44px",
                    }}
                  >
                    <ArrowLeft size={13} /> Anterior
                  </Link>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                {!isDone ? (
                  <button onClick={markComplete} className="btn-gold" style={{ padding: "12px 28px", fontSize: "9px", borderRadius: "14px" }}>
                    <CheckCircle size={14} /> Marcar como concluída
                  </button>
                ) : (
                  <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "9px", fontFamily: "Montserrat", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--sage)" }}>
                    <CheckCircle size={14} strokeWidth={2} /> Concluída
                  </span>
                )}
                {nextLesson && (
                  <Link
                    to={`/products/${slug}/lesson/${nextLesson.id}`}
                    className="btn-outline-gold"
                    style={{ padding: "11px 22px", fontSize: "9px", borderRadius: "14px" }}
                  >
                    Próxima <ArrowRight size={13} />
                  </Link>
                )}
              </div>
            </div>

          </div>{/* /content area */}
        </div>{/* /main */}
      </div>{/* /layout flex */}

      {/* ── Mobile sticky bottom action bar ── */}
      <div
        className="lg:hidden"
        style={{
          position: "fixed",
          bottom: "calc(64px + env(safe-area-inset-bottom))",
          left: 0, right: 0, zIndex: 140,
          padding: "10px 14px",
          background: "var(--bg-surface-2)",
          borderTop: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        {prevLesson ? (
          <Link
            to={`/products/${slug}/lesson/${prevLesson.id}`}
            className="btn-ghost"
            style={{ padding: "12px 14px", flex: "0 0 auto", minHeight: "48px", display: "flex", alignItems: "center", gap: "5px", fontSize: "9px" }}
          >
            <ArrowLeft size={13} />
          </Link>
        ) : (
          <div style={{ flex: "0 0 auto", width: "48px" }} />
        )}

        {!isDone ? (
          <button onClick={markComplete} className="btn-gold" style={{ flex: 1, minHeight: "48px", fontSize: "9px", borderRadius: "14px" }}>
            <CheckCircle size={14} /> Concluir aula
          </button>
        ) : (
          <div
            style={{
              flex: 1, minHeight: "48px", display: "flex", alignItems: "center", justifyContent: "center",
              gap: "6px", borderRadius: "14px",
              background: "rgba(140,170,150,0.10)",
              border: "1px solid rgba(140,170,150,0.22)",
            }}
          >
            <CheckCircle size={14} style={{ color: "var(--sage)" }} strokeWidth={2} />
            <span style={{ fontSize: "9px", fontFamily: "Montserrat", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--sage)" }}>
              Concluída
            </span>
          </div>
        )}

        {nextLesson ? (
          <Link
            to={`/products/${slug}/lesson/${nextLesson.id}`}
            className="btn-ghost"
            style={{ padding: "12px 14px", flex: "0 0 auto", minHeight: "48px", display: "flex", alignItems: "center", gap: "5px", fontSize: "9px" }}
          >
            <ArrowRight size={13} />
          </Link>
        ) : (
          <div style={{ flex: "0 0 auto", width: "48px" }} />
        )}
      </div>
    </DashboardLayout>
  );
}
