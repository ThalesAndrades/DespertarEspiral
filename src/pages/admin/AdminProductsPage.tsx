/**
 * AdminProductsPage — Mobile-first CRUD with edit, image preview & access management
 */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Plus, Layers, X, Check, Loader2, RefreshCw,
  ToggleLeft, ToggleRight, Edit2, Save, Image as ImageIcon,
  Users, ChevronDown, ChevronUp,
} from "lucide-react";

interface Product {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  price: number;
  original_price: number | null;
  is_active: boolean;
  thumbnail_url: string | null;
  created_at: string;
}

interface UserForAccess {
  id: string;
  email: string;
  full_name: string | null;
  username: string | null;
  has_access: boolean;
}

const LABEL: React.CSSProperties = {
  display: "block",
  fontFamily: "Montserrat, sans-serif",
  fontSize: "9px",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
  marginBottom: "8px",
  fontWeight: 500,
};

export default function AdminProductsPage() {
  const [products,      setProducts]      = useState<Product[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [showForm,      setShowForm]      = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [toggling,      setToggling]      = useState<string | null>(null);
  const [editingId,     setEditingId]     = useState<string | null>(null);
  const [editForm,      setEditForm]      = useState<Partial<Product>>({});
  const [savingEdit,    setSavingEdit]    = useState(false);
  const [accessPanelId, setAccessPanelId] = useState<string | null>(null);
  const [accessUsers,   setAccessUsers]   = useState<UserForAccess[]>([]);
  const [loadingAccess, setLoadingAccess] = useState(false);
  const [togglingAccess,setTogglingAccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "", subtitle: "", description: "",
    price: "", original_price: "", thumbnail_url: "",
  });

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) toast.error("Erro ao carregar produtos.");
    else setProducts(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, []);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.price) { toast.error("Título e preço são obrigatórios."); return; }
    setSaving(true);

    const slug = form.title
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    const { data, error } = await supabase.from("products").insert({
      slug,
      title:          form.title,
      subtitle:       form.subtitle || null,
      description:    form.description || null,
      price:          parseFloat(form.price.replace(",", ".")),
      original_price: form.original_price ? parseFloat(form.original_price.replace(",", ".")) : null,
      thumbnail_url:  form.thumbnail_url || null,
      is_active:      true,
    }).select().single();

    if (error) { toast.error(`Erro: ${error.message}`); }
    else {
      toast.success("Produto criado. ✦");
      setProducts((prev) => [...prev, data]);
      setForm({ title: "", subtitle: "", description: "", price: "", original_price: "", thumbnail_url: "" });
      setShowForm(false);
    }
    setSaving(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    setToggling(id);
    const { error } = await supabase.from("products").update({ is_active: !current }).eq("id", id);
    if (error) toast.error("Erro ao atualizar produto.");
    else {
      setProducts((prev) => prev.map((p) => p.id === id ? { ...p, is_active: !current } : p));
      toast.success(current ? "Produto desativado." : "Produto ativado. ✦");
    }
    setToggling(null);
  };

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setEditForm({ title: p.title, subtitle: p.subtitle ?? "", description: p.description ?? "", price: p.price, original_price: p.original_price ?? undefined, thumbnail_url: p.thumbnail_url ?? "" });
  };

  const saveEdit = async (id: string) => {
    setSavingEdit(true);
    const { error } = await supabase.from("products").update({
      title:          editForm.title,
      subtitle:       editForm.subtitle || null,
      description:    editForm.description || null,
      price:          typeof editForm.price === "string" ? parseFloat((editForm.price as string).replace(",", ".")) : editForm.price,
      original_price: editForm.original_price ? (typeof editForm.original_price === "string" ? parseFloat((editForm.original_price as string).replace(",", ".")) : editForm.original_price) : null,
      thumbnail_url:  editForm.thumbnail_url || null,
    }).eq("id", id);
    if (error) toast.error(`Erro: ${error.message}`);
    else {
      setProducts((prev) => prev.map((p) => p.id === id ? { ...p, ...(editForm as Product) } : p));
      toast.success("Produto atualizado. ✦");
      setEditingId(null);
    }
    setSavingEdit(false);
  };

  /* ── Access management ── */
  const openAccessPanel = async (productId: string) => {
    if (accessPanelId === productId) { setAccessPanelId(null); return; }
    setAccessPanelId(productId);
    setLoadingAccess(true);

    const [{ data: allUsers }, { data: granted }] = await Promise.all([
      supabase.from("user_profiles").select("id, email, full_name, username").eq("role", "member"),
      supabase.from("user_products").select("user_id").eq("product_id", productId),
    ]);

    const grantedSet = new Set((granted ?? []).map((r: { user_id: string }) => r.user_id));
    setAccessUsers((allUsers ?? []).map((u: { id: string; email: string; full_name: string | null; username: string | null }) => ({
      ...u,
      has_access: grantedSet.has(u.id),
    })));
    setLoadingAccess(false);
  };

  const toggleUserAccess = async (userId: string, productId: string, hasAccess: boolean) => {
    if (hasAccess && !confirm("Revogar acesso desta usuária ao curso?")) return;
    setTogglingAccess(userId);
    if (hasAccess) {
      const { error } = await supabase.from("user_products").delete().eq("user_id", userId).eq("product_id", productId);
      if (error) toast.error("Erro ao revogar acesso.");
      else {
        setAccessUsers((prev) => prev.map((u) => u.id === userId ? { ...u, has_access: false } : u));
        toast.success("Acesso revogado.");
      }
    } else {
      const { error } = await supabase.from("user_products").upsert({ user_id: userId, product_id: productId }, { onConflict: "user_id,product_id" });
      if (error) toast.error("Erro ao liberar acesso.");
      else {
        setAccessUsers((prev) => prev.map((u) => u.id === userId ? { ...u, has_access: true } : u));
        toast.success("Acesso liberado. ✦");
      }
    }
    setTogglingAccess(null);
  };

  const FALLBACK = "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=400&h=300&fit=crop&q=80";

  return (
    <AdminLayout>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "clamp(20px,3vw,32px)", flexWrap: "wrap" }}>
        <div>
          <p className="overline" style={{ color: "var(--gold)", marginBottom: "6px" }}>Gestão</p>
          <h1 className="font-display" style={{ fontSize: "clamp(26px,4vw,40px)", fontWeight: 300, color: "var(--text-primary)" }}>Produtos</h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>{products.length} produto(s) cadastrado(s)</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={fetchProducts} className="btn-ghost" style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: "6px" }}>
            <RefreshCw size={12} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            <span className="font-label" style={{ fontSize: "9px" }}>Atualizar</span>
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className={showForm ? "btn-outline-gold" : "btn-gold"}
            style={{ padding: "10px 18px", fontSize: "9px", display: "flex", alignItems: "center", gap: "7px" }}
          >
            {showForm ? <X size={13} /> : <Plus size={13} />}
            {showForm ? "Cancelar" : "Novo produto"}
          </button>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card-dark animate-fade-up" style={{ padding: "clamp(18px,3vw,28px)", marginBottom: "20px" }}>
          <p className="overline" style={{ color: "var(--gold)", marginBottom: "20px", fontSize: "9px" }}>Novo produto</p>
          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div className="grid sm:grid-cols-2" style={{ gap: "14px" }}>
              <div>
                <label style={LABEL}>Título *</label>
                <input type="text" value={form.title} onChange={set("title")} placeholder="Nome do curso" className="input-dark" style={{ borderRadius: "12px" }} />
              </div>
              <div>
                <label style={LABEL}>Subtítulo</label>
                <input type="text" value={form.subtitle} onChange={set("subtitle")} placeholder="Tagline curta" className="input-dark" style={{ borderRadius: "12px" }} />
              </div>
            </div>
            <div>
              <label style={LABEL}>Descrição</label>
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} placeholder="Descrição do produto…" className="input-dark" style={{ resize: "none", borderRadius: "12px" }} />
            </div>
            <div className="grid grid-cols-2" style={{ gap: "14px" }}>
              <div>
                <label style={LABEL}>Preço (R$) *</label>
                <input type="text" value={form.price} onChange={set("price")} placeholder="497,00" className="input-dark" style={{ borderRadius: "12px" }} />
              </div>
              <div>
                <label style={LABEL}>Preço original</label>
                <input type="text" value={form.original_price} onChange={set("original_price")} placeholder="997,00" className="input-dark" style={{ borderRadius: "12px" }} />
              </div>
            </div>
            <div>
              <label style={LABEL}>URL da imagem (thumbnail)</label>
              <input type="url" value={form.thumbnail_url} onChange={set("thumbnail_url")} placeholder="https://…" className="input-dark" style={{ borderRadius: "12px" }} />
            </div>
            <button type="submit" disabled={saving} className="btn-gold" style={{ alignSelf: "flex-start", padding: "12px 28px", fontSize: "9px", borderRadius: "12px" }}>
              {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={13} />}
              {saving ? "Criando…" : "Criar produto"}
            </button>
          </form>
        </div>
      )}

      {/* Product list */}
      {loading ? (
        <div style={{ padding: "60px", textAlign: "center" }}>
          <Loader2 size={24} style={{ color: "var(--gold)", animation: "spin 1s linear infinite", margin: "0 auto" }} />
        </div>
      ) : products.length === 0 ? (
        <div className="card-dark" style={{ padding: "56px 24px", textAlign: "center" }}>
          <p style={{ fontSize: "15px", color: "var(--text-muted)", lineHeight: 1.7, marginBottom: "20px" }}>
            Nenhum produto cadastrado ainda.
          </p>
          <button onClick={() => setShowForm(true)} className="btn-outline-gold" style={{ fontSize: "9px" }}>
            Criar primeiro produto <Plus size={13} />
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {products.map((product) => (
            <div key={product.id} className="card-dark" style={{ overflow: "hidden" }}>

              {/* ── Main row ── */}
              <div style={{ display: "flex", gap: "14px", padding: "16px 18px", alignItems: "flex-start" }}>
                {/* Thumbnail */}
                <div style={{ width: "60px", height: "60px", borderRadius: "10px", overflow: "hidden", flexShrink: 0, background: "var(--bg-surface-2)", position: "relative" }}>
                  <img src={product.thumbnail_url || FALLBACK} alt={product.title}
                    loading="lazy" decoding="async"
                    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                    <h3 style={{ fontSize: "15px", color: "var(--text-primary)", fontWeight: 500 }}>{product.title}</h3>
                    {product.is_active
                      ? <span className="badge-sage" style={{ fontSize: "7px", padding: "2px 8px" }}>ATIVO</span>
                      : <span className="badge-rose" style={{ fontSize: "7px", padding: "2px 8px" }}>INATIVO</span>
                    }
                  </div>
                  {product.subtitle && (
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>{product.subtitle}</p>
                  )}
                  <p className="font-display" style={{ fontSize: "18px", color: "var(--gold)", fontWeight: 300 }}>
                    R$ {product.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    {product.original_price && (
                      <span style={{ fontSize: "12px", color: "var(--text-faint)", textDecoration: "line-through", marginLeft: "8px" }}>
                        R$ {product.original_price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* ── Actions row ── */}
              <div style={{ display: "flex", gap: "8px", padding: "0 18px 14px", flexWrap: "wrap" }}>
                <button
                  onClick={() => startEdit(product)}
                  className="btn-ghost"
                  style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", fontSize: "9px", minHeight: "36px" }}
                >
                  <Edit2 size={11} /> Editar
                </button>
                <Link to={`/admin/products/${product.id}/content`} className="btn-ghost"
                  style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", fontSize: "9px", minHeight: "36px" }}>
                  <Layers size={11} /> Conteúdo
                </Link>
                <button
                  onClick={() => openAccessPanel(product.id)}
                  className="btn-ghost"
                  style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", fontSize: "9px", minHeight: "36px" }}
                >
                  <Users size={11} /> Acessos
                  {accessPanelId === product.id ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                </button>
                <button
                  onClick={() => toggleActive(product.id, product.is_active)}
                  disabled={toggling === product.id}
                  className="btn-ghost"
                  style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", fontSize: "9px", minHeight: "36px", color: product.is_active ? "var(--rose)" : "var(--sage)", borderColor: product.is_active ? "rgba(201,154,170,0.3)" : "rgba(140,170,150,0.3)" }}
                >
                  {toggling === product.id
                    ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} />
                    : product.is_active ? <ToggleRight size={13} /> : <ToggleLeft size={13} />
                  }
                  {product.is_active ? "Desativar" : "Ativar"}
                </button>
              </div>

              {/* ── Inline edit form ── */}
              {editingId === product.id && (
                <div style={{ borderTop: "1px solid var(--border-subtle)", padding: "16px 18px", background: "rgba(198,168,112,0.03)" }}>
                  <p className="overline" style={{ color: "var(--gold)", marginBottom: "14px", fontSize: "9px" }}>Editar produto</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div className="grid sm:grid-cols-2" style={{ gap: "12px" }}>
                      <div>
                        <label style={LABEL}>Título</label>
                        <input type="text" value={editForm.title ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} className="input-dark" style={{ borderRadius: "10px" }} />
                      </div>
                      <div>
                        <label style={LABEL}>Subtítulo</label>
                        <input type="text" value={editForm.subtitle ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, subtitle: e.target.value }))} className="input-dark" style={{ borderRadius: "10px" }} />
                      </div>
                    </div>
                    <div>
                      <label style={LABEL}>Descrição</label>
                      <textarea value={editForm.description ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="input-dark" style={{ resize: "none", borderRadius: "10px" }} />
                    </div>
                    <div className="grid grid-cols-2" style={{ gap: "12px" }}>
                      <div>
                        <label style={LABEL}>Preço (R$)</label>
                        <input type="text" value={String(editForm.price ?? "")} onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value as unknown as number }))} className="input-dark" style={{ borderRadius: "10px" }} />
                      </div>
                      <div>
                        <label style={LABEL}>Preço original</label>
                        <input type="text" value={String(editForm.original_price ?? "")} onChange={(e) => setEditForm((f) => ({ ...f, original_price: e.target.value as unknown as number }))} className="input-dark" style={{ borderRadius: "10px" }} />
                      </div>
                    </div>
                    <div>
                      <label style={LABEL}>
                        <ImageIcon size={10} style={{ display: "inline", marginRight: "5px" }} />
                        URL da imagem do produto
                      </label>
                      <input type="url" value={editForm.thumbnail_url ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, thumbnail_url: e.target.value }))} placeholder="https://…" className="input-dark" style={{ borderRadius: "10px" }} />
                      {editForm.thumbnail_url && (
                        <div style={{ marginTop: "8px", width: "80px", height: "60px", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--border-soft)" }}>
                          <img src={editForm.thumbnail_url} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button onClick={() => saveEdit(product.id)} disabled={savingEdit} className="btn-gold" style={{ padding: "9px 20px", fontSize: "9px", borderRadius: "10px", display: "flex", alignItems: "center", gap: "5px" }}>
                        {savingEdit ? <Loader2 size={12} style={{ animation: "spin 0.8s linear infinite" }} /> : <Save size={12} />}
                        {savingEdit ? "Salvando…" : "Salvar"}
                      </button>
                      <button onClick={() => setEditingId(null)} className="btn-ghost" style={{ padding: "9px 16px", fontSize: "9px", borderRadius: "10px" }}>
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Access panel ── */}
              {accessPanelId === product.id && (
                <div style={{ borderTop: "1px solid var(--border-subtle)", padding: "16px 18px", background: "rgba(164,158,208,0.03)" }}>
                  <p className="overline" style={{ color: "var(--lavender)", marginBottom: "12px", fontSize: "9px" }}>Gerenciar acessos</p>
                  {loadingAccess ? (
                    <div style={{ textAlign: "center", padding: "24px" }}>
                      <Loader2 size={18} style={{ color: "var(--gold)", animation: "spin 1s linear infinite", margin: "0 auto" }} />
                    </div>
                  ) : accessUsers.length === 0 ? (
                    <p style={{ fontSize: "13px", color: "var(--text-faint)" }}>Nenhuma aluna cadastrada.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "320px", overflowY: "auto" }}>
                      {accessUsers.map((u) => (
                        <div key={u.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "10px", background: u.has_access ? "rgba(140,170,150,0.07)" : "transparent", border: `1px solid ${u.has_access ? "rgba(140,170,150,0.20)" : "var(--border-subtle)"}` }}>
                          <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "rgba(198,168,112,0.12)", color: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontFamily: "Montserrat", fontWeight: 500, flexShrink: 0 }}>
                            {(u.full_name ?? u.username ?? u.email).charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {u.full_name ?? u.username ?? u.email.split("@")[0]}
                            </p>
                            <p style={{ fontSize: "11px", color: "var(--text-faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</p>
                          </div>
                          <button
                            onClick={() => toggleUserAccess(u.id, product.id, u.has_access)}
                            disabled={togglingAccess === u.id}
                            className="btn-ghost"
                            style={{
                              padding: "5px 10px", fontSize: "9px", minHeight: "32px", flexShrink: 0,
                              color: u.has_access ? "var(--rose)" : "var(--sage)",
                              borderColor: u.has_access ? "rgba(201,154,170,0.3)" : "rgba(140,170,150,0.3)",
                              display: "flex", alignItems: "center", gap: "4px",
                            }}
                          >
                            {togglingAccess === u.id ? <Loader2 size={10} style={{ animation: "spin 0.8s linear infinite" }} /> : null}
                            {u.has_access ? "Revogar" : "Liberar"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </AdminLayout>
  );
}
