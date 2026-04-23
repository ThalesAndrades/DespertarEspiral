/**
 * AdminProductContentPage — Real Supabase CRUD for modules & lessons
 * + Certificate configuration panel with canvas preview
 * Mobile-first: accordion cards, sticky header, floating save
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Plus, Trash2, GripVertical, X, Check, Loader2, ChevronDown, ChevronRight, Award, Save, Download, Eye, EyeOff, Upload, Video, Pencil, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface LessonRow { id: string; title: string; type: string; content: string; duration_min: number; sort_order: number; is_free: boolean; }

interface EditLessonState {
  lessonId: string;
  title: string;
  type: typeof LESSON_TYPES[number];
  content: string;
  duration_min: number;
  is_free: boolean;
}

const VIDEO_BUCKET = "video-content";
const MAX_VIDEO_MB  = 500;
const MAX_VIDEO_BYTES = MAX_VIDEO_MB * 1024 * 1024;
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-msvideo"];
interface ModuleRow { id: string; title: string; sort_order: number; lessons: LessonRow[]; }

interface CertConfig {
  courseName?: string;
  instructorName?: string;
  instructorTitle?: string;
  courseTagline?: string;
  certDescription?: string;
  signatureLabel?: string;
  institutionLabel?: string;
  footerNote?: string;
  issueDate?: string;
}
interface ProductInfo { id: string; title: string; subtitle: string | null; certificate_config?: CertConfig; }

const LESSON_TYPES = ["video", "text", "pdf", "audio"] as const;

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontFamily: "Montserrat, sans-serif", fontSize: "9px",
  letterSpacing: "0.18em", textTransform: "uppercase",
  color: "var(--text-muted)", marginBottom: "8px", fontWeight: 500,
};

const DESC_PLACEHOLDER = 'Deixe em branco para gerar automaticamente: "concluiu com êxito o programa [nome do curso]…"';

export default function AdminProductContentPage() {
  const { id } = useParams<{ id: string }>();

  const [product,       setProduct]       = useState<ProductInfo | null>(null);
  const [modules,       setModules]       = useState<ModuleRow[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [openModules,   setOpenModules]   = useState<Record<string, boolean>>({});
  const [showAddMod,    setShowAddMod]    = useState(false);
  const [newModTitle,   setNewModTitle]   = useState("");
  const [addingMod,     setAddingMod]     = useState(false);
  const [showAddLesson, setShowAddLesson] = useState<string | null>(null);
  const [newLesson,     setNewLesson]     = useState({ title: "", type: "video" as typeof LESSON_TYPES[number], content: "", duration_min: 0, is_free: false });
  const [addingLesson,  setAddingLesson]  = useState(false);
  const [deleting,      setDeleting]      = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<EditLessonState | null>(null);
  const [savingLesson,  setSavingLesson]  = useState(false);

  // Drag-and-drop state
  const dragSrcRef = useRef<{ modId: string; lessonId: string } | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null); // lessonId currently hovered

  // Video upload state for inline edit form
  const [editVideoUploading,  setEditVideoUploading]  = useState(false);
  const [editVideoProgress,   setEditVideoProgress]   = useState(0);
  const [editVideoError,      setEditVideoError]      = useState<string | null>(null);
  const editVideoInputRef = useRef<HTMLInputElement>(null);
  const [certConfig,    setCertConfig]    = useState<CertConfig>({});
  const [savingCert,    setSavingCert]    = useState(false);
  const [certOpen,      setCertOpen]      = useState(false);
  const [showPreview,   setShowPreview]   = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ── Video Upload State ──
  const [videoUploading,  setVideoUploading]  = useState(false);
  const [videoProgress,   setVideoProgress]   = useState(0);  // 0-100
  const [videoError,      setVideoError]      = useState<string | null>(null);
  const [pendingVideoUrl, setPendingVideoUrl] = useState<string>(""); // URL after upload
  const videoInputRef = useRef<HTMLInputElement>(null);

  /* Load product + modules + lessons */
  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);

      const { data: prod } = await supabase
        .from("products")
        .select("id, title, subtitle, certificate_config")
        .eq("id", id)
        .single();

      if (prod) {
        setProduct(prod as ProductInfo);
        setCertConfig((prod as ProductInfo).certificate_config ?? {});
      }

      const { data: mods } = await supabase.from("modules").select("id, title, sort_order").eq("product_id", id).order("sort_order");

      if (!mods || mods.length === 0) { setModules([]); setLoading(false); return; }

      const modulesWithLessons: ModuleRow[] = await Promise.all(
        mods.map(async (m: { id: string; title: string; sort_order: number }) => {
          const { data: lessons } = await supabase.from("lessons")
            .select("id, title, type, content, duration_min, sort_order, is_free")
            .eq("module_id", m.id).order("sort_order");
          return { ...m, lessons: (lessons ?? []) as LessonRow[] };
        })
      );
      setModules(modulesWithLessons);

      if (mods.length > 0) setOpenModules({ [mods[0].id]: true });
      setLoading(false);
    })();
  }, [id]);

  const toggleModule = (modId: string) => setOpenModules((p) => ({ ...p, [modId]: !p[modId] }));

  /* Add module */
  const addModule = async () => {
    if (!newModTitle.trim() || !id) { toast.error("Digite um título."); return; }
    setAddingMod(true);
    const { data, error } = await supabase.from("modules")
      .insert({ product_id: id, title: newModTitle.trim(), sort_order: modules.length + 1 })
      .select("id, title, sort_order").single();
    if (error) { toast.error("Erro ao criar módulo."); }
    else {
      const newMod: ModuleRow = { ...(data as { id: string; title: string; sort_order: number }), lessons: [] };
      setModules((prev) => [...prev, newMod]);
      setOpenModules((p) => ({ ...p, [newMod.id]: true }));
      setNewModTitle("");
      setShowAddMod(false);
      toast.success("Módulo criado.");
    }
    setAddingMod(false);
  };

  /* Delete module */
  const deleteModule = async (modId: string) => {
    if (!id) return;
    if (!confirm("Remover módulo e todas as aulas?")) return;
    setDeleting(modId);
    const { error } = await supabase.from("modules").delete().eq("id", modId).eq("product_id", id);
    if (error) { toast.error("Erro ao remover."); }
    else { setModules((prev) => prev.filter((m) => m.id !== modId)); toast.success("Módulo removido."); }
    setDeleting(null);
  };

  /* Add lesson */
  const addLesson = async (modId: string) => {
    if (!newLesson.title.trim()) { toast.error("Digite um título para a aula."); return; }
    setAddingLesson(true);
    const mod = modules.find((m) => m.id === modId);
    const { data, error } = await supabase.from("lessons")
      .insert({
        module_id: modId,
        title: newLesson.title.trim(),
        type: newLesson.type,
        content: newLesson.content.trim(),
        duration_min: newLesson.duration_min || 0,
        is_free: newLesson.is_free,
        sort_order: (mod?.lessons.length ?? 0) + 1,
      })
      .select("id, title, type, content, duration_min, sort_order, is_free").single();
    if (error) { toast.error("Erro ao criar aula."); }
    else {
      setModules((prev) => prev.map((m) => m.id === modId ? { ...m, lessons: [...m.lessons, data as LessonRow] } : m));
      setNewLesson({ title: "", type: "video", content: "", duration_min: 0, is_free: false });
      setShowAddLesson(null);
      toast.success("Aula criada.");
    }
    setAddingLesson(false);
  };

  /* ── Drag-and-drop handlers ── */
  const handleDragStart = (modId: string, lessonId: string) => {
    dragSrcRef.current = { modId, lessonId };
  };

  const handleDragOver = (e: React.DragEvent, lessonId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(lessonId);
  };

  const handleDragLeave = () => setDragOver(null);

  const handleDrop = async (e: React.DragEvent, targetModId: string, targetLessonId: string) => {
    e.preventDefault();
    setDragOver(null);
    const src = dragSrcRef.current;
    dragSrcRef.current = null;
    if (!src || src.modId !== targetModId || src.lessonId === targetLessonId) return;

    setModules((prevModules) => {
      const updated = prevModules.map((m) => {
        if (m.id !== targetModId) return m;
        const lessons = [...m.lessons];
        const srcIdx    = lessons.findIndex((l) => l.id === src.lessonId);
        const targetIdx = lessons.findIndex((l) => l.id === targetLessonId);
        if (srcIdx === -1 || targetIdx === -1) return m;
        const [moved] = lessons.splice(srcIdx, 1);
        lessons.splice(targetIdx, 0, moved);
        const reordered = lessons.map((l, i) => ({ ...l, sort_order: i + 1 }));
        // Persist batch update in background
        void persistLessonOrder(reordered);
        return { ...m, lessons: reordered };
      });
      return updated;
    });
  };

  const handleDragEnd = () => {
    dragSrcRef.current = null;
    setDragOver(null);
  };

  /* Batch-update sort_order for all lessons after reordering */
  const persistLessonOrder = async (lessons: LessonRow[]) => {
    try {
      await Promise.all(
        lessons.map((l) =>
          supabase.from("lessons").update({ sort_order: l.sort_order }).eq("id", l.id)
        )
      );
    } catch (err) {
      console.error("[persistLessonOrder] batch update failed:", err);
      toast.error("Erro ao salvar nova ordem das aulas.");
    }
  };

  /* Delete lesson */
  const deleteLesson = async (modId: string, lessonId: string) => {
    if (!confirm("Remover esta aula? Esta ação não pode ser desfeita.")) return;
    setDeleting(lessonId);
    const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
    if (error) { toast.error("Erro ao remover."); }
    else {
      setModules((prev) => prev.map((m) => m.id === modId ? { ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) } : m));
      toast.success("Aula removida.");
    }
    setDeleting(null);
  };

  /* ── Open lesson for inline editing ── */
  const startEditLesson = (lesson: LessonRow) => {
    setEditingLesson({
      lessonId:    lesson.id,
      title:       lesson.title,
      type:        lesson.type as typeof LESSON_TYPES[number],
      content:     lesson.content,
      duration_min: lesson.duration_min,
      is_free:     lesson.is_free,
    });
    setEditVideoError(null);
    setEditVideoProgress(0);
    setEditVideoUploading(false);
  };

  const cancelEditLesson = () => {
    setEditingLesson(null);
    setEditVideoError(null);
    if (editVideoInputRef.current) editVideoInputRef.current.value = "";
  };

  /* ── Save inline lesson edits ── */
  const saveEditLesson = async (modId: string) => {
    if (!editingLesson || !editingLesson.title.trim()) {
      toast.error("Título não pode estar vazio.");
      return;
    }
    setSavingLesson(true);
    const { error } = await supabase
      .from("lessons")
      .update({
        title:       editingLesson.title.trim(),
        type:        editingLesson.type,
        content:     editingLesson.content.trim(),
        duration_min: editingLesson.duration_min || 0,
        is_free:     editingLesson.is_free,
      })
      .eq("id", editingLesson.lessonId);

    if (error) {
      toast.error("Erro ao salvar aula.");
    } else {
      setModules((prev) =>
        prev.map((m) =>
          m.id === modId
            ? {
                ...m,
                lessons: m.lessons.map((l) =>
                  l.id === editingLesson.lessonId
                    ? {
                        ...l,
                        title:       editingLesson.title.trim(),
                        type:        editingLesson.type,
                        content:     editingLesson.content.trim(),
                        duration_min: editingLesson.duration_min || 0,
                        is_free:     editingLesson.is_free,
                      }
                    : l
                ),
              }
            : m
        )
      );
      toast.success("Aula atualizada. ✦");
      setEditingLesson(null);
    }
    setSavingLesson(false);
  };

  /* ── Video upload for edit form ── */
  const handleEditVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditVideoError(null);
    setEditVideoProgress(0);
    setEditVideoUploading(true);
    const url = await uploadVideo(file, setEditVideoProgress);
    if (url) {
      setEditingLesson((prev) => prev ? { ...prev, content: url, type: "video" } : prev);
      toast.success("Vídeo enviado. Cole a URL ou salve.");
    } else {
      setEditVideoError("Falha no upload. Tente novamente.");
    }
    setEditVideoUploading(false);
    if (editVideoInputRef.current) editVideoInputRef.current.value = "";
  };

  /* ── Upload video to Storage ── */
  const uploadVideo = async (file: File, onProgress?: (pct: number) => void): Promise<string | null> => {
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      toast.error(`Tipo não suportado: ${file.type}. Use MP4, WebM ou OGG.`);
      return null;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      toast.error(`Arquivo muito grande (máx. ${MAX_VIDEO_MB}MB). Tamanho: ${(file.size / 1024 / 1024).toFixed(1)}MB.`);
      return null;
    }

    // Build deterministic path: products/{productId}/{timestamp}-{slug}.mp4
    const ext  = file.name.split(".").pop() ?? "mp4";
    const ts   = Date.now();
    const path = `products/${id}/${ts}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

    // Upload via fetch+blob for reliable progress tracking
    onProgress?.(5);

    const { data, error } = await supabase.storage
      .from(VIDEO_BUCKET)
      .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });

    if (error) {
      console.error("[uploadVideo] storage error:", error);
      toast.error(`Erro no upload: ${error.message}`);
      return null;
    }

    onProgress?.(100);

    const { data: { publicUrl } } = supabase.storage.from(VIDEO_BUCKET).getPublicUrl(data.path);
    return publicUrl;
  };

  const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVideoError(null);
    setVideoProgress(0);
    setVideoUploading(true);
    setPendingVideoUrl("");

    const url = await uploadVideo(file, setVideoProgress);

    if (url) {
      setPendingVideoUrl(url);
      setNewLesson((l) => ({ ...l, content: url, type: "video" }));
      toast.success("Vídeo enviado com sucesso! ✦ Cole a URL ou salve a aula.");
    } else {
      setVideoError("Falha no upload. Tente novamente.");
    }
    setVideoUploading(false);
    // Reset file input so same file can be re-selected
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  /* ── Draw certificate preview on canvas ── */
  const drawCertificate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;   // 1200
    const H = canvas.height;  // 848

    // Background
    ctx.fillStyle = "#FAF7F2";
    ctx.fillRect(0, 0, W, H);

    // Subtle texture lines
    ctx.strokeStyle = "rgba(198,168,112,0.06)";
    ctx.lineWidth = 1;
    for (let y = 0; y < H; y += 28) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Outer border
    const pad = 32;
    ctx.strokeStyle = "#C6A870";
    ctx.lineWidth = 2;
    ctx.strokeRect(pad, pad, W - pad * 2, H - pad * 2);

    // Inner border
    const pad2 = 44;
    ctx.strokeStyle = "rgba(198,168,112,0.35)";
    ctx.lineWidth = 1;
    ctx.strokeRect(pad2, pad2, W - pad2 * 2, H - pad2 * 2);

    // Corner ornaments
    const corners: [number, number][] = [
      [pad + 10, pad + 10],
      [W - pad - 10, pad + 10],
      [pad + 10, H - pad - 10],
      [W - pad - 10, H - pad - 10],
    ];
    corners.forEach(([cx, cy]) => {
      ctx.strokeStyle = "#C6A870";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const s = 18;
      const dx = cx < W / 2 ? 1 : -1;
      const dy = cy < H / 2 ? 1 : -1;
      ctx.moveTo(cx, cy + dy * s); ctx.lineTo(cx, cy); ctx.lineTo(cx + dx * s, cy);
      ctx.stroke();
      ctx.fillStyle = "#C6A870";
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-3, -3, 6, 6);
      ctx.restore();
    });

    // Top gold gradient bar
    const grad = ctx.createLinearGradient(pad2 + 20, 0, W - pad2 - 20, 0);
    grad.addColorStop(0,   "rgba(198,168,112,0)");
    grad.addColorStop(0.3, "rgba(198,168,112,0.85)");
    grad.addColorStop(0.7, "rgba(198,168,112,0.85)");
    grad.addColorStop(1,   "rgba(198,168,112,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(pad2 + 20, 72, W - (pad2 + 20) * 2, 1.5);

    // Institution label
    const institution = certConfig.institutionLabel || "Despertar Espiral";
    ctx.fillStyle = "#C6A870";
    ctx.font = "500 13px Montserrat, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(institution.toUpperCase(), W / 2, 108);

    // Diamond dividers
    const drawDiamond = (x: number, y: number, r: number) => {
      ctx.fillStyle = "#C6A870";
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4);
      ctx.fillRect(-r, -r, r * 2, r * 2); ctx.restore();
    };
    drawDiamond(W / 2 - 80, 122, 3);
    drawDiamond(W / 2,       122, 3);
    drawDiamond(W / 2 + 80, 122, 3);

    // "Certificado" headline
    ctx.fillStyle = "#1A1209";
    ctx.font = "300 62px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("Certificado", W / 2, 190);

    // "de Conclusão" subtitle
    ctx.fillStyle = "rgba(26,18,9,0.55)";
    ctx.font = "italic 300 28px Georgia, serif";
    ctx.fillText("de Conclusão", W / 2, 225);

    // "Certificamos que"
    ctx.fillStyle = "rgba(26,18,9,0.45)";
    ctx.font = "400 14px DM Sans, sans-serif";
    ctx.fillText("Certificamos que", W / 2, 276);

    // Student name placeholder
    ctx.fillStyle = "#1A1209";
    ctx.font = "italic 300 44px Georgia, serif";
    ctx.fillText("Nome da Aluna", W / 2, 330);

    // Name underline gradient
    const nameW = ctx.measureText("Nome da Aluna").width;
    const gradLine = ctx.createLinearGradient(W / 2 - nameW / 2, 0, W / 2 + nameW / 2, 0);
    gradLine.addColorStop(0,   "rgba(198,168,112,0)");
    gradLine.addColorStop(0.5, "rgba(198,168,112,0.8)");
    gradLine.addColorStop(1,   "rgba(198,168,112,0)");
    ctx.strokeStyle = gradLine;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(W / 2 - nameW / 2, 340); ctx.lineTo(W / 2 + nameW / 2, 340); ctx.stroke();

    // Description (word-wrapped)
    const courseLabel = certConfig.courseName || product?.title || "nome do curso";
    const desc = certConfig.certDescription ||
      ("concluiu com êxito o programa " + courseLabel + (certConfig.courseTagline ? " — " + certConfig.courseTagline : "") + ".");
    ctx.fillStyle = "rgba(26,18,9,0.52)";
    ctx.font = "400 14px DM Sans, sans-serif";
    ctx.textAlign = "center";
    const words = desc.split(" ");
    let line = "";
    let lineY = 374;
    const maxLineW = W - 280;
    for (const word of words) {
      const test = line + word + " ";
      if (ctx.measureText(test).width > maxLineW && line) {
        ctx.fillText(line.trim(), W / 2, lineY);
        line = word + " ";
        lineY += 22;
      } else { line = test; }
    }
    ctx.fillText(line.trim(), W / 2, lineY);

    // Date
    const dateStr = certConfig.issueDate
      ? new Date(certConfig.issueDate + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
      : new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    ctx.fillStyle = "rgba(26,18,9,0.40)";
    ctx.font = "400 13px DM Sans, sans-serif";
    ctx.fillText(dateStr, W / 2, lineY + 32);

    // Horizontal divider
    const divY = H - 178;
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad2 + 40, divY); ctx.lineTo(W - pad2 - 40, divY); ctx.stroke();
    drawDiamond(W / 2, divY, 3.5);

    // Signature block
    const sigBlockW = 220;
    const sigCX = W / 2;
    const sigY = H - 148;

    ctx.fillStyle = "#1A1209";
    ctx.font = "italic 300 32px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText(certConfig.instructorName || "Sunyan Nunes", sigCX, sigY);

    ctx.strokeStyle = "rgba(198,168,112,0.6)";
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(sigCX - sigBlockW / 2, sigY + 8); ctx.lineTo(sigCX + sigBlockW / 2, sigY + 8); ctx.stroke();

    ctx.fillStyle = "rgba(26,18,9,0.65)";
    ctx.font = "600 11px Montserrat, sans-serif";
    ctx.fillText((certConfig.instructorName || "Sunyan Nunes").toUpperCase(), sigCX, sigY + 26);

    ctx.fillStyle = "rgba(26,18,9,0.40)";
    ctx.font = "400 11px DM Sans, sans-serif";
    ctx.fillText(certConfig.instructorTitle || "Mentora & Fundadora · Despertar Espiral", sigCX, sigY + 43);

    // Footer note
    const footerNote = certConfig.footerNote ||
      "Este certificado atesta a conclusão integral do programa, com dedicação, presença e comprometimento.";
    ctx.fillStyle = "rgba(26,18,9,0.30)";
    ctx.font = "400 11px DM Sans, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(footerNote.slice(0, 110), W / 2, H - 56);

    // Bottom bar
    ctx.fillStyle = grad;
    ctx.fillRect(pad2 + 20, H - 72, W - (pad2 + 20) * 2, 1.5);
  }, [certConfig, product]);

  useEffect(() => {
    if (showPreview) drawCertificate();
  }, [showPreview, drawCertificate]);

  /* Download canvas as PNG */
  const downloadCert = () => {
    drawCertificate();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.download = "certificado-" + (product?.title ?? "curso").toLowerCase().replace(/\s+/g, "-") + ".png";
    a.href = canvas.toDataURL("image/png");
    a.click();
  };

  /* Save certificate config */
  const saveCertConfig = async () => {
    if (!id) return;
    setSavingCert(true);
    const { error } = await supabase.from("products").update({ certificate_config: certConfig }).eq("id", id);
    if (error) toast.error("Erro ao salvar configuração.");
    else toast.success("Configuração do certificado salva. ✦");
    setSavingCert(false);
  };

  if (loading) return (
    <AdminLayout>
      <div style={{ padding: "80px", textAlign: "center" }}>
        <Loader2 size={24} style={{ color: "var(--gold)", animation: "spin 1s linear infinite", margin: "0 auto" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>

        {/* Back */}
        <Link to="/admin/products" style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          fontSize: "9px", fontFamily: "Montserrat, sans-serif", letterSpacing: "0.18em",
          textTransform: "uppercase", color: "var(--text-muted)", textDecoration: "none",
          transition: "color 0.2s", marginBottom: "clamp(16px,3vw,24px)", minHeight: "44px",
        }}>
          <ArrowLeft size={12} /> Produtos
        </Link>

        {/* Header */}
        <div style={{ marginBottom: "clamp(20px,3vw,32px)" }}>
          <p className="overline" style={{ color: "var(--gold)", marginBottom: "6px" }}>Editor de conteúdo</p>
          <h1 className="font-display" style={{ fontSize: "clamp(24px,4vw,36px)", fontWeight: 300, color: "var(--text-primary)" }}>
            {product?.title ?? "Produto"}
          </h1>
          {product?.subtitle && (
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>{product.subtitle}</p>
          )}
        </div>

        {/* Modules */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
          {modules.map((mod, mIdx) => {
            const isOpen = !!openModules[mod.id];
            const isDeletingMod = deleting === mod.id;
            return (
              <div key={mod.id} className="card-dark" style={{ overflow: "hidden" }}>
                {/* Module header */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "clamp(12px,2vw,16px) clamp(12px,2.5vw,18px)", borderBottom: isOpen ? "1px solid var(--border-subtle)" : "none" }}>
                  <GripVertical size={14} style={{ color: "var(--border-mid)", flexShrink: 0 }} />
                  <button onClick={() => toggleModule(mod.id)} style={{ flex: 1, display: "flex", alignItems: "center", gap: "10px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", minHeight: "36px", padding: 0 }}>
                    <span style={{ width: "24px", height: "24px", borderRadius: "50%", background: "rgba(198,168,112,0.12)", color: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontFamily: "Montserrat", fontWeight: 500, flexShrink: 0 }}>
                      {mIdx + 1}
                    </span>
                    <p style={{ flex: 1, fontSize: "clamp(13px,1.6vw,15px)", fontWeight: 500, color: "var(--text-primary)", textAlign: "left" }}>{mod.title}</p>
                    <span style={{ fontSize: "10px", fontFamily: "Montserrat", color: "var(--text-faint)", letterSpacing: "0.1em" }}>
                      {mod.lessons.length} aulas
                    </span>
                    {isOpen ? <ChevronDown size={13} style={{ color: "var(--border-mid)" }} /> : <ChevronRight size={13} style={{ color: "var(--border-mid)" }} />}
                  </button>
                  <button
                    onClick={() => deleteModule(mod.id)} disabled={isDeletingMod}
                    style={{ width: "32px", height: "32px", borderRadius: "8px", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(172,128,142,0.45)", flexShrink: 0, transition: "color 0.2s" }}
                  >
                    {isDeletingMod ? <Loader2 size={12} style={{ animation: "spin 0.8s linear infinite" }} /> : <Trash2 size={13} strokeWidth={1.5} />}
                  </button>
                </div>

                {/* Lessons */}
                {isOpen && (
                  <div>
                    {mod.lessons.map((lesson) => {
                      const isEditingThis = editingLesson?.lessonId === lesson.id;

                      /* ── Inline edit form ── */
                      if (isEditingThis && editingLesson) return (
                        <div key={lesson.id} data-testid={`edit-lesson-form-${lesson.id}`}
                          style={{ padding: "16px", background: "rgba(198,168,112,0.03)", borderBottom: "1px solid var(--border-subtle)" }}
                        >
                          <p className="font-label" style={{ fontSize: "8.5px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--gold)", marginBottom: "12px" }}>Editar aula</p>

                          {/* Row: type + title */}
                          <div style={{ display: "flex", gap: "10px", marginBottom: "10px", flexWrap: "wrap" }}>
                            <select
                              value={editingLesson.type}
                              onChange={(e) => setEditingLesson((l) => l ? { ...l, type: e.target.value as typeof LESSON_TYPES[number] } : l)}
                              className="input-dark"
                              style={{ width: "120px", flexShrink: 0, borderRadius: "10px", minHeight: "44px" }}
                              aria-label="Tipo da aula"
                            >
                              {LESSON_TYPES.map((t) => (
                                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={editingLesson.title}
                              onChange={(e) => setEditingLesson((l) => l ? { ...l, title: e.target.value } : l)}
                              placeholder="Título da aula"
                              className="input-dark"
                              style={{ flex: 1, borderRadius: "10px", minWidth: "160px" }}
                              aria-label="Título da aula"
                            />
                          </div>

                          {/* Content field: video upload or URL */}
                          {editingLesson.type === "video" ? (
                            <div style={{ marginBottom: "10px" }}>
                              <input
                                type="text"
                                value={editingLesson.content}
                                onChange={(e) => setEditingLesson((l) => l ? { ...l, content: e.target.value } : l)}
                                placeholder="URL de embed (YouTube, Vimeo) ou faça upload abaixo"
                                className="input-dark"
                                style={{ borderRadius: "10px", marginBottom: "8px" }}
                                aria-label="URL do vídeo"
                              />
                              <div style={{ border: `2px dashed ${editVideoUploading ? "var(--gold)" : "var(--border-soft)"}`, borderRadius: "12px", padding: "14px 16px", background: "rgba(198,168,112,0.03)", transition: "border-color 0.2s" }}>
                                {editVideoUploading ? (
                                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                      <Loader2 size={13} style={{ color: "var(--gold)", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
                                      <span style={{ fontSize: "12px", color: "var(--gold)" }}>Enviando vídeo…</span>
                                      <span style={{ marginLeft: "auto", fontSize: "11px", color: "var(--text-faint)", fontFamily: "Montserrat" }}>{editVideoProgress}%</span>
                                    </div>
                                    <div style={{ height: "3px", borderRadius: "100px", background: "var(--border-subtle)", overflow: "hidden" }}>
                                      <div style={{ height: "100%", width: `${editVideoProgress}%`, borderRadius: "100px", background: "var(--gold)", transition: "width 0.3s" }} />
                                    </div>
                                  </div>
                                ) : (
                                  <label htmlFor={`edit-video-input-${lesson.id}`} style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                                    <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(198,168,112,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                      <Upload size={14} style={{ color: "var(--gold)" }} strokeWidth={1.5} />
                                    </div>
                                    <div>
                                      <p style={{ fontSize: "12px", color: "var(--text-primary)", fontWeight: 500, marginBottom: "2px" }}>Substituir vídeo</p>
                                      <p style={{ fontSize: "10px", color: "var(--text-faint)" }}>MP4, WebM, OGG · máx. {MAX_VIDEO_MB}MB</p>
                                    </div>
                                    <input
                                      id={`edit-video-input-${lesson.id}`}
                                      ref={editVideoInputRef}
                                      type="file"
                                      accept={ALLOWED_VIDEO_TYPES.join(",")}
                                      onChange={handleEditVideoFileChange}
                                      style={{ display: "none" }}
                                      data-testid={`edit-video-file-input-${lesson.id}`}
                                    />
                                  </label>
                                )}
                                {editVideoError && (
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px" }}>
                                    <AlertCircle size={11} style={{ color: "rgba(201,80,80,0.8)", flexShrink: 0 }} />
                                    <span style={{ fontSize: "11px", color: "rgba(201,80,80,0.8)" }}>{editVideoError}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={editingLesson.content}
                              onChange={(e) => setEditingLesson((l) => l ? { ...l, content: e.target.value } : l)}
                              placeholder={editingLesson.type === "pdf" ? "URL do PDF" : editingLesson.type === "audio" ? "URL do áudio" : "URL do conteúdo"}
                              className="input-dark"
                              style={{ marginBottom: "10px", borderRadius: "10px" }}
                              aria-label="Conteúdo da aula"
                            />
                          )}

                          {/* Duration + is_free + actions */}
                          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <label style={{ ...LABEL_STYLE, marginBottom: 0 }}>Min:</label>
                              <input
                                type="number" min={0}
                                value={editingLesson.duration_min}
                                onChange={(e) => setEditingLesson((l) => l ? { ...l, duration_min: parseInt(e.target.value) || 0 } : l)}
                                className="input-dark"
                                style={{ width: "70px", borderRadius: "10px", textAlign: "center" }}
                                aria-label="Duração em minutos"
                              />
                            </div>
                            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                              <input
                                type="checkbox"
                                checked={editingLesson.is_free}
                                onChange={(e) => setEditingLesson((l) => l ? { ...l, is_free: e.target.checked } : l)}
                              />
                              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Aula gratuita</span>
                            </label>
                            <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
                              <button
                                onClick={() => saveEditLesson(mod.id)}
                                disabled={savingLesson}
                                className="btn-gold"
                                style={{ padding: "9px 18px", fontSize: "9px", borderRadius: "10px" }}
                                aria-label="Salvar alterações"
                              >
                                {savingLesson
                                  ? <Loader2 size={12} style={{ animation: "spin 0.8s linear infinite" }} />
                                  : <><Check size={12} /> Salvar</>
                                }
                              </button>
                              <button
                                onClick={cancelEditLesson}
                                className="btn-ghost"
                                style={{ padding: "9px 14px", fontSize: "9px", borderRadius: "10px" }}
                                aria-label="Cancelar edição"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );

                      /* ── Default lesson row ── */
                      const isDragTarget = dragOver === lesson.id;
                      return (
                        <div
                          key={lesson.id}
                          draggable={!editingLesson}
                          onDragStart={() => handleDragStart(mod.id, lesson.id)}
                          onDragOver={(e) => handleDragOver(e, lesson.id)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, mod.id, lesson.id)}
                          onDragEnd={handleDragEnd}
                          data-testid={`lesson-row-${lesson.id}`}
                          style={{
                            display: "flex", alignItems: "center", gap: "10px",
                            padding: "10px 14px 10px 18px",
                            borderBottom: "1px solid var(--border-subtle)",
                            minHeight: "48px",
                            cursor: editingLesson ? "default" : "grab",
                            transition: "background 0.15s, border-top 0.15s",
                            background: isDragTarget ? "rgba(198,168,112,0.08)" : "transparent",
                            borderTop: isDragTarget ? "2px solid var(--gold)" : "2px solid transparent",
                          }}
                        >
                          <GripVertical size={12} style={{ color: "var(--border-subtle)", flexShrink: 0 }} />
                          <span style={{ fontSize: "8px", fontFamily: "Montserrat", letterSpacing: "0.14em", textTransform: "uppercase", padding: "3px 10px", borderRadius: "100px", background: "rgba(198,168,112,0.10)", color: "var(--gold)", flexShrink: 0 }}>
                            {lesson.type}
                          </span>
                          <p style={{ flex: 1, fontSize: "clamp(12px,1.5vw,14px)", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {lesson.title}
                          </p>
                          {lesson.duration_min > 0 && (
                            <span style={{ fontSize: "10px", color: "var(--text-faint)", fontFamily: "Montserrat", flexShrink: 0 }}>{lesson.duration_min}min</span>
                          )}
                          {lesson.is_free && (
                            <span className="badge-sage" style={{ fontSize: "7px", padding: "2px 8px", flexShrink: 0 }}>GRÁTIS</span>
                          )}
                          {/* Edit button */}
                          <button
                            onClick={() => startEditLesson(lesson)}
                            disabled={!!editingLesson}
                            style={{ width: "28px", height: "28px", borderRadius: "6px", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(198,168,112,0.45)", flexShrink: 0, transition: "color 0.2s" }}
                            aria-label={`Editar aula ${lesson.title}`}
                            onMouseEnter={(e) => { if (!editingLesson) (e.currentTarget as HTMLElement).style.color = "var(--gold)"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(198,168,112,0.45)"; }}
                          >
                            <Pencil size={11} strokeWidth={1.5} />
                          </button>
                          {/* Delete button */}
                          <button
                            onClick={() => deleteLesson(mod.id, lesson.id)} disabled={deleting === lesson.id}
                            style={{ width: "28px", height: "28px", borderRadius: "6px", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(172,128,142,0.35)", flexShrink: 0 }}
                            aria-label={`Remover aula ${lesson.title}`}
                          >
                            {deleting === lesson.id ? <Loader2 size={11} style={{ animation: "spin 0.8s linear infinite" }} /> : <Trash2 size={11} strokeWidth={1.5} />}
                          </button>
                        </div>
                      );
                    })}

                    {/* Add lesson form */}
                    {showAddLesson === mod.id ? (
                      <div style={{ padding: "16px", background: "rgba(198,168,112,0.03)", borderTop: "1px solid var(--border-subtle)" }}>
                        <div style={{ display: "flex", gap: "10px", marginBottom: "10px", flexWrap: "wrap" }}>
                          <select
                            value={newLesson.type}
                            onChange={(e) => setNewLesson((l) => ({ ...l, type: e.target.value as typeof LESSON_TYPES[number] }))}
                            className="input-dark"
                            style={{ width: "120px", flexShrink: 0, borderRadius: "10px", minHeight: "44px" }}
                          >
                            {LESSON_TYPES.map((t) => (
                              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                            ))}
                          </select>
                          <input
                            type="text" value={newLesson.title}
                            onChange={(e) => setNewLesson((l) => ({ ...l, title: e.target.value }))}
                            placeholder="Título da aula"
                            className="input-dark" style={{ flex: 1, borderRadius: "10px", minWidth: "160px" }}
                          />
                        </div>
                        {/* Content URL or Video Upload */}
                        {newLesson.type === "video" ? (
                          <div style={{ marginBottom: "10px" }}>
                            {/* URL input */}
                            <input
                              type="text" value={newLesson.content}
                              onChange={(e) => { setNewLesson((l) => ({ ...l, content: e.target.value })); setPendingVideoUrl(""); }}
                              placeholder="URL de embed (YouTube, Vimeo) ou faça upload abaixo"
                              className="input-dark" style={{ borderRadius: "10px", marginBottom: "8px" }}
                            />

                            {/* Upload zone */}
                            <div
                              style={{
                                border: `2px dashed ${videoUploading ? "var(--gold)" : pendingVideoUrl ? "rgba(140,170,150,0.5)" : "var(--border-soft)"}`,
                                borderRadius: "12px",
                                padding: "14px 16px",
                                background: pendingVideoUrl ? "rgba(140,170,150,0.04)" : "rgba(198,168,112,0.03)",
                                transition: "border-color 0.2s, background 0.2s",
                              }}
                            >
                              {pendingVideoUrl ? (
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                  <Video size={16} style={{ color: "var(--sage)", flexShrink: 0 }} strokeWidth={1.5} />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: "12px", color: "var(--sage)", fontWeight: 500, marginBottom: "2px" }}>Upload concluído ✓</p>
                                    <p style={{ fontSize: "10px", color: "var(--text-faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pendingVideoUrl}</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => { setPendingVideoUrl(""); setNewLesson((l) => ({ ...l, content: "" })); }}
                                    style={{ width: "26px", height: "26px", borderRadius: "6px", background: "transparent", border: "none", cursor: "pointer", color: "var(--text-faint)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                                    aria-label="Remover vídeo"
                                  >
                                    <X size={12} strokeWidth={1.5} />
                                  </button>
                                </div>
                              ) : videoUploading ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <Loader2 size={13} style={{ color: "var(--gold)", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
                                    <span style={{ fontSize: "12px", color: "var(--gold)" }}>Enviando vídeo…</span>
                                    <span style={{ marginLeft: "auto", fontSize: "11px", color: "var(--text-faint)", fontFamily: "Montserrat" }}>{videoProgress}%</span>
                                  </div>
                                  <div style={{ height: "3px", borderRadius: "100px", background: "var(--border-subtle)", overflow: "hidden" }}>
                                    <div style={{ height: "100%", width: `${videoProgress}%`, borderRadius: "100px", background: "var(--gold)", transition: "width 0.3s" }} />
                                  </div>
                                </div>
                              ) : (
                                <label
                                  htmlFor="video-upload-input"
                                  style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
                                >
                                  <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(198,168,112,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <Upload size={14} style={{ color: "var(--gold)" }} strokeWidth={1.5} />
                                  </div>
                                  <div>
                                    <p style={{ fontSize: "12px", color: "var(--text-primary)", fontWeight: 500, marginBottom: "2px" }}>Upload de vídeo</p>
                                    <p style={{ fontSize: "10px", color: "var(--text-faint)" }}>MP4, WebM, OGG · máx. {MAX_VIDEO_MB}MB</p>
                                  </div>
                                  <input
                                    id="video-upload-input"
                                    ref={videoInputRef}
                                    type="file"
                                    accept={ALLOWED_VIDEO_TYPES.join(",")}
                                    onChange={handleVideoFileChange}
                                    style={{ display: "none" }}
                                    data-testid="video-file-input"
                                  />
                                </label>
                              )}

                              {videoError && (
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px" }}>
                                  <AlertCircle size={11} style={{ color: "rgba(201,80,80,0.8)", flexShrink: 0 }} />
                                  <span style={{ fontSize: "11px", color: "rgba(201,80,80,0.8)" }}>{videoError}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <input
                            type="text" value={newLesson.content}
                            onChange={(e) => setNewLesson((l) => ({ ...l, content: e.target.value }))}
                            placeholder={newLesson.type === "pdf" ? "URL do PDF" : newLesson.type === "audio" ? "URL do áudio" : "URL do conteúdo"}
                            className="input-dark" style={{ marginBottom: "10px", borderRadius: "10px" }}
                          />
                        )}
                        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <label style={{ ...LABEL_STYLE, marginBottom: 0 }}>Min:</label>
                            <input type="number" min={0} value={newLesson.duration_min}
                              onChange={(e) => setNewLesson((l) => ({ ...l, duration_min: parseInt(e.target.value) || 0 }))}
                              className="input-dark" style={{ width: "70px", borderRadius: "10px", textAlign: "center" }}
                            />
                          </div>
                          <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                            <input type="checkbox" checked={newLesson.is_free} onChange={(e) => setNewLesson((l) => ({ ...l, is_free: e.target.checked }))} />
                            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Aula gratuita</span>
                          </label>
                          <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
                            <button onClick={() => addLesson(mod.id)} disabled={addingLesson} className="btn-gold" style={{ padding: "9px 18px", fontSize: "9px", borderRadius: "10px" }}>
                              {addingLesson ? <Loader2 size={12} style={{ animation: "spin 0.8s linear infinite" }} /> : <><Check size={12} /> Salvar</>}
                            </button>
                            <button onClick={() => setShowAddLesson(null)} className="btn-ghost" style={{ padding: "9px 14px", fontSize: "9px", borderRadius: "10px" }}>
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowAddLesson(mod.id)}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: "8px", padding: "12px 18px", background: "transparent", border: "none", cursor: "pointer", color: "rgba(198,168,112,0.5)", fontSize: "12px", fontFamily: "DM Sans", transition: "color 0.2s, background 0.2s", minHeight: "44px" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--gold)"; (e.currentTarget as HTMLElement).style.background = "rgba(198,168,112,0.04)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(198,168,112,0.5)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                      >
                        <Plus size={13} /> Adicionar aula
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add module */}
        {showAddMod ? (
          <div className="card-dark" style={{ padding: "clamp(14px,2.5vw,20px)", display: "flex", flexDirection: "column", gap: "12px" }}>
            <label style={LABEL_STYLE}>Título do módulo</label>
            <input
              type="text" value={newModTitle}
              onChange={(e) => setNewModTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addModule()}
              placeholder="Ex: Módulo 1 — O Chamado"
              className="input-dark" style={{ borderRadius: "12px" }}
              autoFocus
            />
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={addModule} disabled={addingMod} className="btn-gold" style={{ padding: "11px 24px", fontSize: "9px", borderRadius: "12px" }}>
                {addingMod ? <Loader2 size={13} style={{ animation: "spin 0.8s linear infinite" }} /> : <><Check size={13} /> Criar módulo</>}
              </button>
              <button onClick={() => setShowAddMod(false)} className="btn-ghost" style={{ padding: "10px 18px", fontSize: "9px", borderRadius: "12px" }}>
                <X size={13} />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddMod(true)}
            className="btn-outline-gold"
            style={{ width: "100%", justifyContent: "center", borderRadius: "16px" }}
          >
            <Plus size={14} /> Adicionar módulo
          </button>
        )}

        {/* ══ Certificate Configuration Panel ══ */}
        <div className="card-dark" style={{ marginTop: "24px", overflow: "hidden" }}>
          <button
            onClick={() => setCertOpen((p) => !p)}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: "12px",
              padding: "clamp(14px,2.5vw,18px)",
              background: "transparent", border: "none", cursor: "pointer", textAlign: "left", minHeight: "60px",
            }}
          >
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(198,168,112,0.10)", border: "1px solid rgba(198,168,112,0.20)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Award size={15} style={{ color: "var(--gold)" }} strokeWidth={1.5} />
            </div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <p style={{ fontSize: "15px", color: "var(--text-primary)", fontWeight: 500, marginBottom: "2px" }}>
                Configurar Certificado
              </p>
              <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                Personalize o texto, assinatura e identidade do certificado de conclusão
              </p>
            </div>
            {certOpen
              ? <ChevronDown  size={14} style={{ color: "var(--border-mid)", flexShrink: 0 }} />
              : <ChevronRight size={14} style={{ color: "var(--border-mid)", flexShrink: 0 }} />
            }
          </button>

          {certOpen && (
            <div style={{ borderTop: "1px solid var(--border-subtle)", background: "rgba(198,168,112,0.02)" }}>

              {/* ── Form fields ── */}
              <div style={{ padding: "clamp(16px,3vw,24px)", display: "flex", flexDirection: "column", gap: "16px" }}>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.75 }}>
                  Preencha os campos abaixo. Use <strong style={{ color: "var(--gold)" }}>Visualizar</strong> para ver o preview em tempo real antes de salvar.
                </p>

                {/* Row 1: course name + tagline */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "14px" }}>
                  <div>
                    <label style={LABEL_STYLE}>Nome do curso no certificado</label>
                    <input type="text"
                      value={certConfig.courseName ?? product?.title ?? ""}
                      onChange={(e) => setCertConfig((c) => ({ ...c, courseName: e.target.value }))}
                      placeholder={product?.title ?? "Nome do curso"}
                      className="input-dark" style={{ borderRadius: "10px" }}
                    />
                  </div>
                  <div>
                    <label style={LABEL_STYLE}>Tagline / subtítulo</label>
                    <input type="text"
                      value={certConfig.courseTagline ?? ""}
                      onChange={(e) => setCertConfig((c) => ({ ...c, courseTagline: e.target.value }))}
                      placeholder="Método de Reconexão e Cura"
                      className="input-dark" style={{ borderRadius: "10px" }}
                    />
                  </div>
                </div>

                {/* Row 2: instructor name + title */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "14px" }}>
                  <div>
                    <label style={LABEL_STYLE}>Nome da mentora / instrutora</label>
                    <input type="text"
                      value={certConfig.instructorName ?? ""}
                      onChange={(e) => setCertConfig((c) => ({ ...c, instructorName: e.target.value }))}
                      placeholder="Sunyan Nunes"
                      className="input-dark" style={{ borderRadius: "10px" }}
                    />
                  </div>
                  <div>
                    <label style={LABEL_STYLE}>Cargo / título da mentora</label>
                    <input type="text"
                      value={certConfig.instructorTitle ?? ""}
                      onChange={(e) => setCertConfig((c) => ({ ...c, instructorTitle: e.target.value }))}
                      placeholder="Mentora & Fundadora · Despertar Espiral"
                      className="input-dark" style={{ borderRadius: "10px" }}
                    />
                  </div>
                </div>

                {/* Row 3: institution + date */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "14px" }}>
                  <div>
                    <label style={LABEL_STYLE}>Nome da instituição</label>
                    <input type="text"
                      value={certConfig.institutionLabel ?? ""}
                      onChange={(e) => setCertConfig((c) => ({ ...c, institutionLabel: e.target.value }))}
                      placeholder="Despertar Espiral"
                      className="input-dark" style={{ borderRadius: "10px" }}
                    />
                  </div>
                  <div>
                    <label style={LABEL_STYLE}>Data de emissão padrão</label>
                    <input type="date"
                      value={certConfig.issueDate ?? ""}
                      onChange={(e) => setCertConfig((c) => ({ ...c, issueDate: e.target.value }))}
                      className="input-dark" style={{ borderRadius: "10px" }}
                    />
                    <p style={{ fontSize: "10px", color: "var(--text-faint)", marginTop: "4px" }}>
                      Deixe em branco para usar a data real de conclusão de cada aluna.
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label style={LABEL_STYLE}>Descrição personalizada (opcional)</label>
                  <textarea
                    value={certConfig.certDescription ?? ""}
                    onChange={(e) => setCertConfig((c) => ({ ...c, certDescription: e.target.value }))}
                    placeholder={DESC_PLACEHOLDER}
                    className="input-dark" rows={2}
                    style={{ borderRadius: "10px", resize: "none" }}
                  />
                </div>

                {/* Footer note */}
                <div>
                  <label style={LABEL_STYLE}>Nota de rodapé</label>
                  <textarea
                    value={certConfig.footerNote ?? ""}
                    onChange={(e) => setCertConfig((c) => ({ ...c, footerNote: e.target.value }))}
                    placeholder="Este certificado atesta a conclusão integral do programa, com dedicação, presença e comprometimento."
                    className="input-dark" rows={2}
                    style={{ borderRadius: "10px", resize: "none" }}
                  />
                </div>

                {/* Action buttons */}
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                  <button
                    onClick={saveCertConfig} disabled={savingCert}
                    className="btn-gold"
                    style={{ padding: "11px 24px", fontSize: "9px", borderRadius: "12px", display: "flex", alignItems: "center", gap: "7px" }}
                  >
                    {savingCert
                      ? <><Loader2 size={12} style={{ animation: "spin 0.8s linear infinite" }} /> Salvando…</>
                      : <><Save size={12} /> Salvar configuração</>
                    }
                  </button>
                  <button
                    onClick={() => { setShowPreview(p => !p); if (!showPreview) setTimeout(drawCertificate, 50); }}
                    className="btn-ghost"
                    style={{ padding: "10px 20px", fontSize: "9px", borderRadius: "12px", display: "flex", alignItems: "center", gap: "7px" }}
                  >
                    {showPreview
                      ? <><EyeOff size={12} /> Ocultar preview</>
                      : <><Eye size={12} /> Visualizar certificado</>
                    }
                  </button>
                  {showPreview && (
                    <button
                      onClick={downloadCert}
                      className="btn-ghost"
                      style={{ padding: "10px 20px", fontSize: "9px", borderRadius: "12px", display: "flex", alignItems: "center", gap: "7px", color: "var(--sage)", borderColor: "rgba(140,170,150,0.35)" }}
                    >
                      <Download size={12} /> Baixar PNG
                    </button>
                  )}
                </div>
              </div>

              {/* ── Canvas Preview ── */}
              {showPreview && (
                <div style={{ borderTop: "1px solid var(--border-subtle)", padding: "clamp(16px,3vw,24px)", background: "rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                    <Award size={13} style={{ color: "var(--gold)" }} strokeWidth={1.5} />
                    <p className="font-label" style={{ fontSize: "8.5px", letterSpacing: "0.20em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                      Preview do certificado
                    </p>
                    <button
                      onClick={drawCertificate}
                      className="btn-ghost"
                      style={{ marginLeft: "auto", padding: "5px 12px", fontSize: "8.5px", display: "flex", alignItems: "center", gap: "5px" }}
                    >
                      <Eye size={10} /> Atualizar
                    </button>
                  </div>
                  <div style={{ overflowX: "auto", borderRadius: "12px", border: "1px solid var(--border-subtle)", lineHeight: 0 }}>
                    <canvas
                      ref={canvasRef}
                      width={1200}
                      height={848}
                      style={{ width: "100%", maxWidth: "760px", height: "auto", display: "block", borderRadius: "12px" }}
                    />
                  </div>
                  <p style={{ fontSize: "10px", color: "var(--text-faint)", marginTop: "10px", lineHeight: 1.5 }}>
                    O preview usa <em style={{ color: "var(--text-muted)" }}>"Nome da Aluna"</em> como placeholder. O certificado gerado para cada aluna usará o nome real do perfil dela.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </AdminLayout>
  );
}
