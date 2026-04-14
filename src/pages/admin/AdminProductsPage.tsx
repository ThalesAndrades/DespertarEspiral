/**
 * AdminProductsPage — Mobile-first CRUD
 * Real Supabase data, mobile-friendly form sheet
 */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Plus, Layers, X, Check, Loader2, RefreshCw, ToggleLeft, ToggleRight } from "lucide-react";

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
  const [products,  setProducts]  = useState<Product[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [toggling,  setToggling]  = useState<string | null>(null);
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

      {/* Form */}
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
            <div className="grid grid-cols-2 sm:grid-cols-3" style={{ gap: "14px" }}>
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
              <label style={LABEL}>URL da thumbnail</label>
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
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {products.map((product) => (
            <div key={product.id} className="card-dark" style={{ overflow: "hidden" }}>
              {/* Desktop: single row */}
              <div className="hidden md:flex" style={{ alignItems: "center", gap: "16px", padding: "14px 18px" }}>
                <img src={product.thumbnail_url || FALLBACK} alt={product.title}
                  style={{ width: "56px", height: "56px", borderRadius: "10px", objectFit: "cover", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                    <h3 style={{ fontSize: "14px", color: "var(--text-primary)", fontWeight: 500 }}>{product.title}</h3>
                    {product.is_active
                      ? <span className="badge-sage" style={{ fontSize: "7px", padding: "2px 8px" }}>ATIVO</span>
                      : <span className="badge-rose" style={{ fontSize: "7px", padding: "2px 8px" }}>INATIVO</span>
                    }
                  </div>
                  <p className="font-label" style={{ fontSize: "9px", color: "var(--text-faint)", letterSpacing: "0.1em" }}>
                    R$ {product.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    {product.original_price && ` · era R$ ${product.original_price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Link to={`/admin/products/${product.id}/content`} className="btn-ghost"
                    style={{ padding: "6px 14px", fontSize: "9px", display: "flex", alignItems: "center", gap: "5px" }}>
                    <Layers size={11} /> Conteúdo
                  </Link>
                  <button
                    onClick={() => toggleActive(product.id, product.is_active)}
                    disabled={toggling === product.id}
                    className="btn-ghost"
                    style={{ padding: "6px 14px", fontSize: "9px", display: "flex", alignItems: "center", gap: "5px", color: product.is_active ? "var(--rose)" : "var(--sage)", borderColor: product.is_active ? "rgba(201,154,170,0.3)" : "rgba(140,170,150,0.3)" }}
                  >
                    {toggling === product.id
                      ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} />
                      : product.is_active ? <ToggleRight size={13} /> : <ToggleLeft size={13} />
                    }
                    {product.is_active ? "Desativar" : "Ativar"}
                  </button>
                </div>
              </div>

              {/* Mobile: card layout */}
              <div className="md:hidden" style={{ padding: "14px" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginBottom: "12px" }}>
                  <img src={product.thumbnail_url || FALLBACK} alt={product.title}
                    style={{ width: "50px", height: "50px", borderRadius: "10px", objectFit: "cover", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "4px" }}>
                      <h3 style={{ fontSize: "14px", color: "var(--text-primary)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{product.title}</h3>
                    </div>
                    <p className="font-display" style={{ fontSize: "18px", color: "var(--gold)", fontWeight: 300 }}>
                      R$ {product.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  {product.is_active
                    ? <span className="badge-sage" style={{ fontSize: "7px", padding: "2px 8px", flexShrink: 0 }}>ATIVO</span>
                    : <span className="badge-rose" style={{ fontSize: "7px", padding: "2px 8px", flexShrink: 0 }}>INATIVO</span>
                  }
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <Link to={`/admin/products/${product.id}/content`} className="btn-ghost"
                    style={{ flex: 1, justifyContent: "center", padding: "8px 12px", fontSize: "9px", display: "flex", alignItems: "center", gap: "5px", minHeight: "40px" }}>
                    <Layers size={11} /> Conteúdo
                  </Link>
                  <button
                    onClick={() => toggleActive(product.id, product.is_active)}
                    disabled={toggling === product.id}
                    className="btn-ghost"
                    style={{ flex: 1, justifyContent: "center", padding: "8px 12px", fontSize: "9px", display: "flex", alignItems: "center", gap: "5px", minHeight: "40px", color: product.is_active ? "var(--rose)" : "var(--sage)", borderColor: product.is_active ? "rgba(201,154,170,0.3)" : "rgba(140,170,150,0.3)" }}
                  >
                    {toggling === product.id ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> : (product.is_active ? <ToggleRight size={13} /> : <ToggleLeft size={13} />)}
                    {product.is_active ? "Desativar" : "Ativar"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </AdminLayout>
  );
}
