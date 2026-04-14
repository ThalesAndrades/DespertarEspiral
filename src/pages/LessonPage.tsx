/**
 * LessonPage — Device-optimized
 * Mobile: top nav strip + full-width player + sticky bottom bar
 * Desktop: fixed sidebar + spacious content area
 */
import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { MOCK_PRODUCTS } from "@/constants/mockData";
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
  const [completed, setCompleted] = useState<Set<string>>(new Set(["l1", "l2"]));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const product = MOCK_PRODUCTS.find((p) => p.slug === slug);
  if (!product) return null;

  const allLessons = product.modules.flatMap((m) => m.lessons);
  const currentIndex = allLessons.findIndex((l) => l.id === lessonId);
  const lesson = allLessons[currentIndex];
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;
  const moduleOfLesson = product.modules.find((m) => m.id === lesson?.module_id);

  if (!lesson) return (
    <DashboardLayout>
      <div style={{ padding: "48px 24px", textAlign: "center" }}>
        <p style={{ color: "var(--text-muted)", marginBottom: "16px" }}>Aula não encontrada.</p>
        <Link to={`/products/${slug}`} className="btn-outline-gold" style={{ fontSize: "9px", padding: "10px 24px" }}>
          Voltar ao curso
        </Link>
      </div>
    </DashboardLayout>
  );

  const markComplete = () => {
    setCompleted((prev) => { const s = new Set(prev); s.add(lesson.id); return s; });
    toast.success("Aula concluída. ✦");
    if (nextLesson) {
      setTimeout(() => navigate(`/products/${slug}/lesson/${nextLesson.id}`), 500);
    }
  };

  const isDone = completed.has(lesson.id);

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
                <iframe
                  src={lesson.content}
                  title={lesson.title}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
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
                dangerouslySetInnerHTML={{ __html: lesson.content }}
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
                <a href={lesson.content} target="_blank" rel="noopener noreferrer" className="btn-gold" style={{ fontSize: "9px", padding: "12px 28px" }}>
                  Abrir PDF
                </a>
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
                <audio controls style={{ width: "100%", borderRadius: "8px" }} src={lesson.content}>
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
