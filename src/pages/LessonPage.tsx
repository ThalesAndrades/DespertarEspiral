import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { safeEmbedUrl, safeExternalUrl, sanitizeHtml, isStorageVideoUrl } from "@/lib/contentSafety";
import {
  CheckCircle, ArrowLeft, ArrowRight, Play, FileText,
  File, Volume2, ChevronRight, ChevronDown, List, X,
  Award, Download, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { fireEventAsync } from "@/lib/sequenzy";
import { sendEmailAsync } from "@/lib/email";

const typeIcons: Record<string, React.ElementType> = {
  video: Play, text: FileText, pdf: File, audio: Volume2,
};

const typeLabel: Record<string, string> = {
  video: "Vídeo", text: "Leitura", pdf: "PDF", audio: "Áudio",
};

interface CertConfig {
  courseName?: string;
  instructorName?: string;
  instructorTitle?: string;
  courseTagline?: string;
  certDescription?: string;
  institutionLabel?: string;
  footerNote?: string;
}

export default function LessonPage() {
  const { slug, lessonId } = useParams<{ slug: string; lessonId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState<Record<string, unknown> | null>(null);
  const [lessonData, setLessonData] = useState<Record<string, unknown> | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCertModal, setShowCertModal] = useState(false);
  const certCanvasRef = useRef<HTMLCanvasElement>(null);
  const [certConfig, setCertConfig] = useState<CertConfig | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!slug || !lessonId) return;

    (async () => {
      setLoading(true);

      const { data: prod } = await supabase
        .from("products")
        .select(`
          id, slug, title, subtitle, certificate_config,
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
        // Store certificate config
        const rawCfg = normalized.certificate_config;
        if (rawCfg) setCertConfig(rawCfg as CertConfig);
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

  /* ── Draw certificate on canvas ── */
  const drawCertificate = useCallback(() => {
    const canvas = certCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width, H = canvas.height;
    const cfg = certConfig ?? {};
    const studentName = user?.name || user?.email?.split("@")[0] || "Sua Aluna";
    const courseName = cfg.courseName || (product?.title as string) || "";

    // Background + texture
    ctx.fillStyle = "#FAF7F2";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(198,168,112,0.05)";
    ctx.lineWidth = 1;
    for (let y = 0; y < H; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // Borders
    const pad = 22, pad2 = 32;
    ctx.strokeStyle = "#C6A870"; ctx.lineWidth = 1.5;
    ctx.strokeRect(pad, pad, W - pad * 2, H - pad * 2);
    ctx.strokeStyle = "rgba(198,168,112,0.28)"; ctx.lineWidth = 0.7;
    ctx.strokeRect(pad2, pad2, W - pad2 * 2, H - pad2 * 2);

    // Corner ornaments
    ([[pad + 7, pad + 7], [W - pad - 7, pad + 7], [pad + 7, H - pad - 7], [W - pad - 7, H - pad - 7]] as [number, number][]).forEach(([cx, cy]) => {
      ctx.strokeStyle = "#C6A870"; ctx.lineWidth = 1.2;
      const dx = cx < W / 2 ? 1 : -1, dy = cy < H / 2 ? 1 : -1, s = 12;
      ctx.beginPath(); ctx.moveTo(cx, cy + dy * s); ctx.lineTo(cx, cy); ctx.lineTo(cx + dx * s, cy); ctx.stroke();
      ctx.fillStyle = "#C6A870"; ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.PI / 4); ctx.fillRect(-2, -2, 4, 4); ctx.restore();
    });

    // Gold gradient bar
    const grad = ctx.createLinearGradient(pad2 + 20, 0, W - pad2 - 20, 0);
    grad.addColorStop(0, "rgba(198,168,112,0)"); grad.addColorStop(0.35, "rgba(198,168,112,0.85)");
    grad.addColorStop(0.65, "rgba(198,168,112,0.85)"); grad.addColorStop(1, "rgba(198,168,112,0)");
    ctx.fillStyle = grad; ctx.fillRect(pad2 + 20, 50, W - (pad2 + 20) * 2, 1.2);

    // Institution
    ctx.fillStyle = "#C6A870"; ctx.font = "500 10px Montserrat,sans-serif"; ctx.textAlign = "center";
    ctx.fillText((cfg.institutionLabel || "Despertar Espiral").toUpperCase(), W / 2, 70);

    // Diamonds
    ([[W / 2 - 50, 81], [W / 2, 81], [W / 2 + 50, 81]] as [number, number][]).forEach(([dx, dy]) => {
      ctx.fillStyle = "#C6A870"; ctx.save(); ctx.translate(dx, dy); ctx.rotate(Math.PI / 4); ctx.fillRect(-2.2, -2.2, 4.4, 4.4); ctx.restore();
    });

    // "Certificado" headline
    ctx.fillStyle = "#1A1209"; ctx.font = "300 44px Georgia,serif"; ctx.fillText("Certificado", W / 2, 138);
    ctx.fillStyle = "rgba(26,18,9,0.48)"; ctx.font = "italic 300 20px Georgia,serif";
    ctx.fillText("de Conclusão", W / 2, 163);
    ctx.fillStyle = "rgba(26,18,9,0.38)"; ctx.font = "400 11px DM Sans,sans-serif";
    ctx.fillText("Certificamos que", W / 2, 198);

    // Student name
    ctx.fillStyle = "#1A1209"; ctx.font = "italic 300 34px Georgia,serif";
    ctx.fillText(studentName, W / 2, 238);
    const nw = ctx.measureText(studentName).width;
    const gn = ctx.createLinearGradient(W / 2 - nw / 2, 0, W / 2 + nw / 2, 0);
    gn.addColorStop(0, "rgba(198,168,112,0)"); gn.addColorStop(0.5, "rgba(198,168,112,0.7)"); gn.addColorStop(1, "rgba(198,168,112,0)");
    ctx.strokeStyle = gn; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(W / 2 - nw / 2, 246); ctx.lineTo(W / 2 + nw / 2, 246); ctx.stroke();

    // Description (word-wrapped)
    const desc = cfg.certDescription ||
      `concluiu com êxito o programa ${courseName}${cfg.courseTagline ? " — " + cfg.courseTagline : ""}.`;
    ctx.fillStyle = "rgba(26,18,9,0.45)"; ctx.font = "400 11.5px DM Sans,sans-serif";
    const words = desc.split(" "); let line = "", lineY = 272;
    for (const word of words) {
      const t = line + word + " ";
      if (ctx.measureText(t).width > W - 180 && line) { ctx.fillText(line.trim(), W / 2, lineY); line = word + " "; lineY += 17; }
      else line = t;
    }
    ctx.fillText(line.trim(), W / 2, lineY);

    // Date
    ctx.fillStyle = "rgba(26,18,9,0.32)"; ctx.font = "400 10.5px DM Sans,sans-serif";
    ctx.fillText(new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }), W / 2, lineY + 22);

    // Divider
    const divY = H - 120;
    ctx.strokeStyle = grad; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(pad2 + 28, divY); ctx.lineTo(W - pad2 - 28, divY); ctx.stroke();
    ctx.fillStyle = "#C6A870"; ctx.save(); ctx.translate(W / 2, divY); ctx.rotate(Math.PI / 4); ctx.fillRect(-2.8, -2.8, 5.6, 5.6); ctx.restore();

    // Signature block
    const sn = cfg.instructorName || "Sunyan Nunes";
    const st = cfg.instructorTitle || "Mentora & Fundadora · Despertar Espiral";
    ctx.fillStyle = "#1A1209"; ctx.font = "italic 300 24px Georgia,serif"; ctx.fillText(sn, W / 2, H - 88);
    ctx.strokeStyle = "rgba(198,168,112,0.45)"; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(W / 2 - 80, H - 80); ctx.lineTo(W / 2 + 80, H - 80); ctx.stroke();
    ctx.fillStyle = "rgba(26,18,9,0.58)"; ctx.font = "600 8.5px Montserrat,sans-serif";
    ctx.fillText(sn.toUpperCase(), W / 2, H - 68);
    ctx.fillStyle = "rgba(26,18,9,0.36)"; ctx.font = "400 8.5px DM Sans,sans-serif";
    ctx.fillText(st, W / 2, H - 55);

    // Footer note
    const fn = cfg.footerNote || "Este certificado atesta a conclusão integral do programa, com dedicação, presença e comprometimento.";
    ctx.fillStyle = "rgba(26,18,9,0.25)"; ctx.font = "400 8.5px DM Sans,sans-serif";
    ctx.fillText(fn.slice(0, 108), W / 2, H - 34);
    ctx.fillStyle = grad; ctx.fillRect(pad2 + 18, H - 48, W - (pad2 + 18) * 2, 0.9);
  }, [certConfig, product, user]);

  useEffect(() => {
    if (showCertModal) setTimeout(drawCertificate, 90);
  }, [showCertModal, drawCertificate]);

  const downloadCertPng = () => {
    drawCertificate();
    const canvas = certCanvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.download = `certificado-${((product?.title as string) ?? "curso").toLowerCase().replace(/\s+/g, "-")}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
    toast.success("Certificado baixado! ✦");
  };

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
        setCompleted((prev) => { const s = new Set(prev); s.delete(id); return s; });
        toast.error("Não foi possível salvar o progresso.");
        return;
      }
    }
    toast.success("Aula concluída. ✦");

    // Sequenzy: lesson.completed
    if (user?.email) {
      const allLessonsForCourse = mods.flatMap((m) => (m.lessons as Record<string, unknown>[]) ?? []);
      const newCompleted = new Set(completed);
      newCompleted.add(id);
      const completedCount = allLessonsForCourse.filter((l) => newCompleted.has(l.id as string)).length;
      const totalCount = allLessonsForCourse.length;
      const newProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      fireEventAsync("lesson.completed", {
        email: user.email,
        firstName: user.name?.split(" ")[0] ?? "",
        properties: {
          lesson_id: id,
          lesson_title: lesson.title as string,
          lesson_type: lesson.type as string,
          product_slug: slug ?? "",
          module_title: moduleOfLesson?.title ?? "",
          course_progress: newProgress,
          completed_lessons: completedCount,
          total_lessons: totalCount,
        },
      });

      // Sequenzy: course.completed — fire when progress reaches 100%
      if (newProgress === 100 && totalCount > 0) {
        const productTitle = (product?.title as string) ?? "";
        fireEventAsync("course.completed", {
          email: user.email,
          firstName: user.name?.split(" ")[0] ?? "",
          properties: {
            product_slug: slug ?? "",
            product_title: productTitle,
            total_lessons: totalCount,
            completed_at: new Date().toISOString(),
          },
        });
        // Transactional: course completed email
        sendEmailAsync({
          to: user.email,
          template: {
            slug: "curso-concluido",
            variables: {
              firstName: user.name?.split(" ")[0] ?? "",
              productTitle,
              certificateUrl: `${window.location.origin}/products/${slug}/certificado`,
            },
          },
          metadata: { product_slug: slug ?? "", total_lessons: totalCount },
        });
        // Show completion + certificate modal instead of auto-advancing
        setTimeout(() => setShowCertModal(true), 700);
        return;
      }
    }

    // Auto-advance after short delay
    if (nextLesson?.id) setTimeout(() => navigate(`/products/${slug}/lesson/${nextLesson.id as string}`), 800);
  };

  /* ── Module progress bar for current lesson ── */
  const moduleDoneCount = moduleOfLesson
    ? (moduleOfLesson.lessons as Record<string, unknown>[]).filter((l) => completed.has(l.id as string)).length
    : 0;
  const moduleTotalCount = moduleOfLesson ? (moduleOfLesson.lessons as Record<string, unknown>[]).length : 0;
  const modulePct = moduleTotalCount > 0 ? Math.round((moduleDoneCount / moduleTotalCount) * 100) : 0;

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

            {/* Module progress mini-bar */}
            {moduleOfLesson && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "clamp(12px,2vw,18px)", padding: "10px 14px", borderRadius: "12px", background: "var(--bg-surface-2)", border: "1px solid var(--border-subtle)" }}>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "Montserrat, sans-serif", whiteSpace: "nowrap", letterSpacing: "0.06em" }}>Módulo atual</span>
                <div style={{ flex: 1, height: "3px", borderRadius: "100px", background: "var(--border-subtle)", overflow: "hidden" }}>
                  <div style={{ width: `${modulePct}%`, height: "100%", borderRadius: "100px", background: modulePct === 100 ? "var(--sage)" : "var(--gold)", transition: "width 0.6s cubic-bezier(.16,1,.3,1)" }} />
                </div>
                <span style={{ fontSize: "11px", fontFamily: "Montserrat, sans-serif", fontWeight: 600, color: modulePct === 100 ? "var(--sage)" : "var(--gold)", whiteSpace: "nowrap" }}>
                  {moduleDoneCount}/{moduleTotalCount}
                </span>
              </div>
            )}

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
            {lesson.type === "video" && (() => {
              const contentUrl = lesson.content as string | null | undefined;
              const storageUrl = isStorageVideoUrl(contentUrl) ? contentUrl as string : null;
              const embedUrl   = !storageUrl ? safeEmbedUrl(contentUrl ?? "") : null;

              /* ── Storage video: native <video> element ── */
              if (storageUrl) return (
                <div style={{
                  borderRadius: "clamp(12px,2vw,18px)",
                  overflow: "hidden",
                  background: "#000",
                  marginBottom: "clamp(20px,3vw,32px)",
                  boxShadow: "0 12px 48px rgba(0,0,0,0.5)",
                  lineHeight: 0,
                }}>
                  <video
                    src={storageUrl}
                    controls
                    controlsList="nodownload"
                    preload="metadata"
                    style={{ width: "100%", display: "block", maxHeight: "72vh", outline: "none" }}
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    Seu navegador não suporta a reprodução de vídeo.
                  </video>
                </div>
              );

              /* ── External embed: YouTube / Vimeo iframe ── */
              if (embedUrl) return (
                <div style={{
                  position: "relative", width: "100%",
                  paddingTop: "56.25%",
                  borderRadius: "clamp(12px,2vw,18px)",
                  overflow: "hidden",
                  background: "#000",
                  marginBottom: "clamp(20px,3vw,32px)",
                  boxShadow: "0 12px 48px rgba(0,0,0,0.5)",
                }}>
                  <iframe
                    src={embedUrl}
                    title={lesson.title as string}
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
                    sandbox="allow-same-origin allow-scripts allow-presentation"
                    referrerPolicy="no-referrer"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              );

              /* ── Fallback: invalid / unsupported URL ── */
              return (
                <div style={{
                  position: "relative", width: "100%",
                  paddingTop: "56.25%",
                  borderRadius: "clamp(12px,2vw,18px)",
                  overflow: "hidden",
                  background: "#000",
                  marginBottom: "clamp(20px,3vw,32px)",
                  boxShadow: "0 12px 48px rgba(0,0,0,0.5)",
                }}>
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "18px" }}>
                    <div style={{ textAlign: "center" }}>
                      <p style={{ fontSize: "14px", color: "rgba(245,240,232,0.75)", lineHeight: 1.7, marginBottom: "10px" }}>
                        Link de vídeo inválido ou não permitido.
                      </p>
                      <a href="mailto:contato@despertarespiral.com" className="btn-outline-gold" style={{ fontSize: "9px", padding: "10px 22px" }}>
                        Falar com suporte
                      </a>
                    </div>
                  </div>
                </div>
              );
            })()}

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
              <div className="card-dark" style={{ padding: "clamp(32px,6vw,56px)", textAlign: "center", marginBottom: "clamp(20px,3vw,32px)" }}>
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
              style={{ alignItems: "center", justifyContent: "space-between", paddingTop: "24px", borderTop: "1px solid var(--border-subtle)", gap: "12px" }}
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
          display: "flex", alignItems: "center", gap: "8px",
        }}
      >
        {prevLesson ? (
          <Link to={`/products/${slug}/lesson/${prevLesson.id}`} className="btn-ghost" style={{ padding: "12px 14px", flex: "0 0 auto", minHeight: "48px", display: "flex", alignItems: "center", gap: "5px", fontSize: "9px" }}>
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
          <div style={{ flex: 1, minHeight: "48px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", borderRadius: "14px", background: "rgba(140,170,150,0.10)", border: "1px solid rgba(140,170,150,0.22)" }}>
            <CheckCircle size={14} style={{ color: "var(--sage)" }} strokeWidth={2} />
            <span style={{ fontSize: "9px", fontFamily: "Montserrat", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--sage)" }}>Concluída</span>
          </div>
        )}

        {nextLesson ? (
          <Link to={`/products/${slug}/lesson/${nextLesson.id}`} className="btn-ghost" style={{ padding: "12px 14px", flex: "0 0 auto", minHeight: "48px", display: "flex", alignItems: "center", gap: "5px", fontSize: "9px" }}>
            <ArrowRight size={13} />
          </Link>
        ) : (
          <div style={{ flex: "0 0 auto", width: "48px" }} />
        )}
      </div>

      {/* ══ Course Completion Certificate Modal ══ */}
      {showCertModal && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 500,
            background: "rgba(4,6,15,0.87)",
            backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "16px", overflowY: "auto",
          }}
          onClick={() => setShowCertModal(false)}
        >
          {/* Confetti rain */}
          <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 501 }} aria-hidden="true">
            {Array.from({ length: 26 }).map((_, i) => (
              <div key={i} style={{
                position: "absolute",
                left: `${(i * 3.9 + 1.5) % 100}%`,
                top: "-14px",
                width: `${i % 3 === 0 ? 9 : i % 2 === 0 ? 5 : 7}px`,
                height: `${i % 3 === 0 ? 9 : i % 2 === 0 ? 5 : 14}px`,
                borderRadius: i % 4 === 0 ? "50%" : "2px",
                background: ["#C6A870", "rgba(198,168,112,0.55)", "#f5e6c8", "#e8d5a3", "#d4b896", "rgba(245,240,232,0.70)"][i % 6],
                animation: `confettiFall ${2.3 + (i % 6) * 0.32}s ease-in ${i * 0.11}s forwards`,
                transform: `rotate(${i * 19}deg)`,
              }} />
            ))}
          </div>

          {/* Modal card */}
          <div
            style={{
              position: "relative", zIndex: 502,
              width: "100%", maxWidth: "680px",
              background: "var(--sidebar-bg)",
              border: "1px solid rgba(198,168,112,0.28)",
              borderRadius: "28px",
              padding: "clamp(22px,5vw,38px)",
              boxShadow: "0 48px 120px rgba(0,0,0,0.60), 0 0 0 1px rgba(198,168,112,0.08) inset",
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowCertModal(false)}
              style={{
                position: "absolute", top: "16px", right: "16px",
                width: "34px", height: "34px", borderRadius: "50%",
                background: "rgba(255,255,255,0.06)", border: "none",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--text-muted)",
              }}
              aria-label="Fechar"
            >
              <X size={15} strokeWidth={1.5} />
            </button>

            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: "22px" }}>
              <div style={{
                width: "62px", height: "62px", borderRadius: "50%",
                background: "rgba(198,168,112,0.10)",
                border: "1.5px solid rgba(198,168,112,0.32)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 14px",
              }}>
                <Award size={25} style={{ color: "var(--gold)" }} strokeWidth={1.2} />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "8px" }}>
                <Sparkles size={13} style={{ color: "var(--gold)" }} strokeWidth={1.5} />
                <p className="overline" style={{ color: "var(--gold)", fontSize: "9px", letterSpacing: "0.28em" }}>Curso concluído</p>
                <Sparkles size={13} style={{ color: "var(--gold)" }} strokeWidth={1.5} />
              </div>
              <h2 className="font-display" style={{ fontSize: "clamp(22px,4vw,34px)", fontWeight: 300, color: "var(--text-primary)", lineHeight: 1.15, marginBottom: "8px" }}>
                Parabéns, {user?.name?.split(" ")[0] || "Aluna"}! ✦
              </h2>
              <p style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.75, maxWidth: "440px", margin: "0 auto" }}>
                Você concluiu{" "}
                <strong style={{ color: "var(--text-primary)" }}>{product?.title as string}</strong>.
                {" "}Seu certificado está pronto para baixar.
              </p>
            </div>

            {/* Certificate canvas preview */}
            <div style={{ marginBottom: "18px", borderRadius: "14px", overflow: "hidden", border: "1px solid rgba(198,168,112,0.16)", lineHeight: 0 }}>
              <canvas
                ref={certCanvasRef}
                width={900}
                height={636}
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                onClick={downloadCertPng}
                className="btn-gold"
                style={{ flex: 1, minWidth: "150px", justifyContent: "center", minHeight: "50px", fontSize: "9px", borderRadius: "14px", display: "flex", alignItems: "center", gap: "7px" }}
              >
                <Download size={13} /> Baixar PNG
              </button>
              <Link
                to={`/products/${slug}/certificado`}
                className="btn-outline-gold"
                style={{ flex: 1, minWidth: "140px", justifyContent: "center", minHeight: "50px", fontSize: "9px", borderRadius: "14px", display: "flex", alignItems: "center", gap: "7px", textDecoration: "none" }}
                onClick={() => setShowCertModal(false)}
              >
                <Award size={13} /> Certificado completo
              </Link>
              <button
                onClick={() => { setShowCertModal(false); navigate(`/products/${slug}`); }}
                className="btn-ghost"
                style={{ flex: "0 0 auto", justifyContent: "center", minHeight: "50px", fontSize: "9px", borderRadius: "14px", padding: "0 18px" }}
              >
                Voltar ao curso
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes confettiFall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(740deg); opacity: 0; }
        }
      `}</style>
    </DashboardLayout>
  );
}
