/**
 * AdminProductContentPage — Real Supabase CRUD for modules & lessons
 * Mobile-first: accordion cards, sticky header, floating save
 */
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Plus, Trash2, GripVertical, X, Check, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface LessonRow { id: string; title: string; type: string; content: string; duration_min: number; sort_order: number; is_free: boolean; }
interface ModuleRow { id: string; title: string; sort_order: number; lessons: LessonRow[]; }
interface ProductInfo { id: string; title: string; subtitle: string | null; }

const LESSON_TYPES = ["video", "text", "pdf", "audio"] as const;

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontFamily: "Montserrat, sans-serif", fontSize: "9px",
  letterSpacing: "0.18em", textTransform: "uppercase",
  color: "var(--text-muted)", marginBottom: "8px", fontWeight: 500,
};

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

  /* Load product + modules + lessons */
  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);

      const { data: prod } = await supabase.from("products").select("id, title, subtitle").eq("id", id).single();
      if (prod) setProduct(prod as ProductInfo);

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

      // Open first module by default
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
    if (!confirm("Remover módulo e todas as aulas?")) return;
    setDeleting(modId);
    const { error } = await supabase.from("modules").delete().eq("id", modId);
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

  /* Delete lesson */
  const deleteLesson = async (modId: string, lessonId: string) => {
    setDeleting(lessonId);
    const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
    if (error) { toast.error("Erro ao remover."); }
    else {
      setModules((prev) => prev.map((m) => m.id === modId ? { ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) } : m));
      toast.success("Aula removida.");
    }
    setDeleting(null);
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
                    {mod.lessons.map((lesson) => (
                      <div key={lesson.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px 10px 18px", borderBottom: "1px solid var(--border-subtle)", minHeight: "48px" }}>
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
                        <button
                          onClick={() => deleteLesson(mod.id, lesson.id)} disabled={deleting === lesson.id}
                          style={{ width: "28px", height: "28px", borderRadius: "6px", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(172,128,142,0.35)", flexShrink: 0 }}
                        >
                          {deleting === lesson.id ? <Loader2 size={11} style={{ animation: "spin 0.8s linear infinite" }} /> : <Trash2 size={11} strokeWidth={1.5} />}
                        </button>
                      </div>
                    ))}

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
                        <input
                          type="text" value={newLesson.content}
                          onChange={(e) => setNewLesson((l) => ({ ...l, content: e.target.value }))}
                          placeholder="URL do conteúdo (vídeo embed, PDF, áudio...)"
                          className="input-dark" style={{ marginBottom: "10px", borderRadius: "10px" }}
                        />
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
      </div>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </AdminLayout>
  );
}
