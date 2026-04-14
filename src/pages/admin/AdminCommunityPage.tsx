/**
 * AdminCommunityPage — Moderation with real Supabase data
 * Mobile-first: card layout on all devices
 */
import { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Eye, EyeOff, Pin, Trash2, Loader2, Search, RefreshCw, MessageSquare } from "lucide-react";

interface Post {
  id: string;
  title: string;
  body: string;
  category: string;
  is_pinned: boolean;
  is_visible: boolean;
  likes_count: number;
  comments_count: number;
  created_at: string;
  user_profiles: { anonymous_name: string | null } | null;
}

const catColor: Record<string, string> = {
  geral: "var(--lavender)", desabafo: "var(--rose)",
  duvidas: "var(--gold)", conquistas: "var(--sage)", dicas: "var(--gold-soft)",
};
const catLabel: Record<string, string> = {
  geral: "Geral", desabafo: "Desabafo", duvidas: "Dúvidas", conquistas: "Conquistas", dicas: "Dicas",
};

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return "Hoje";
  if (d === 1) return "Ontem";
  return `${d}d atrás`;
}

export default function AdminCommunityPage() {
  const [posts,   setPosts]   = useState<Post[]>([]);
  const [search,  setSearch]  = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("community_posts")
      .select("id, title, body, category, is_pinned, is_visible, likes_count, comments_count, created_at, user_profiles(anonymous_name)")
      .order("created_at", { ascending: false });

    if (error) toast.error("Erro ao carregar posts.");
    else setPosts((data as unknown as Post[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchPosts(); }, []);

  const toggleVisibility = async (post: Post) => {
    setUpdating(post.id);
    const { error } = await supabase
      .from("community_posts")
      .update({ is_visible: !post.is_visible })
      .eq("id", post.id);
    if (error) toast.error("Erro ao atualizar.");
    else {
      setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, is_visible: !p.is_visible } : p));
      toast.success(post.is_visible ? "Post ocultado." : "Post visível.");
    }
    setUpdating(null);
  };

  const togglePin = async (post: Post) => {
    setUpdating(post.id);
    const { error } = await supabase
      .from("community_posts")
      .update({ is_pinned: !post.is_pinned })
      .eq("id", post.id);
    if (error) toast.error("Erro ao atualizar.");
    else {
      setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, is_pinned: !p.is_pinned } : p));
      toast.success(post.is_pinned ? "Post desafixado." : "Post fixado.");
    }
    setUpdating(null);
  };

  const deletePost = async (id: string) => {
    if (!confirm("Remover este post permanentemente?")) return;
    setUpdating(id);
    const { error } = await supabase.from("community_posts").delete().eq("id", id);
    if (error) toast.error("Erro ao remover.");
    else {
      setPosts((prev) => prev.filter((p) => p.id !== id));
      toast.success("Post removido.");
    }
    setUpdating(null);
  };

  const filtered = posts.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.body.toLowerCase().includes(search.toLowerCase()) ||
    (p.user_profiles?.anonymous_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const visible = filtered.filter((p) => p.is_visible).length;
  const hidden  = filtered.filter((p) => !p.is_visible).length;

  return (
    <AdminLayout>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", marginBottom: "clamp(20px,3vw,32px)", flexWrap: "wrap" }}>
        <div>
          <p className="overline" style={{ color: "var(--gold)", marginBottom: "6px" }}>Moderação</p>
          <h1 className="font-display" style={{ fontSize: "clamp(26px,4vw,40px)", fontWeight: 300, color: "var(--text-primary)" }}>
            Comunidade
          </h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
            {visible} visíveis · {hidden} ocultos
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <div style={{ position: "relative" }}>
            <Search size={13} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-faint)" }} />
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar posts..." className="input-dark"
              style={{ paddingLeft: "34px", width: "clamp(160px,28vw,210px)", fontSize: "13px", minHeight: "40px" }}
            />
          </div>
          <button onClick={fetchPosts} className="btn-ghost" style={{ padding: "8px 14px", minHeight: "40px", display: "flex", alignItems: "center", gap: "6px" }}>
            <RefreshCw size={12} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            <span className="font-label" style={{ fontSize: "9px", letterSpacing: "0.14em" }}>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "clamp(16px,2vw,24px)" }}>
        {[
          { label: "Total",    value: posts.length,  color: "var(--lavender)" },
          { label: "Visíveis", value: visible,        color: "var(--sage)" },
          { label: "Ocultos",  value: hidden,         color: "var(--rose)" },
          { label: "Fixados",  value: posts.filter((p) => p.is_pinned).length, color: "var(--gold)" },
        ].map(({ label, value, color }) => (
          <div key={label} className="card-dark" style={{ padding: "12px 18px", display: "flex", alignItems: "center", gap: "10px", flex: "1 1 80px" }}>
            <div>
              <p className="font-display" style={{ fontSize: "20px", color, fontWeight: 300, lineHeight: 1 }}>{value}</p>
              <p className="font-label" style={{ fontSize: "8px", color: "var(--text-faint)", letterSpacing: "0.15em", textTransform: "uppercase", marginTop: "3px" }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Posts list */}
      {loading ? (
        <div style={{ padding: "60px", textAlign: "center" }}>
          <Loader2 size={24} style={{ color: "var(--gold)", animation: "spin 1s linear infinite", margin: "0 auto" }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-dark" style={{ padding: "48px", textAlign: "center" }}>
          <MessageSquare size={28} style={{ color: "var(--text-faint)", margin: "0 auto 12px" }} strokeWidth={1.5} />
          <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>Nenhum post encontrado.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filtered.map((post) => {
            const color = catColor[post.category] ?? "var(--lavender)";
            const authorName = post.user_profiles?.anonymous_name ?? "Anônima";
            const isUpdating = updating === post.id;
            return (
              <div key={post.id} className="card-dark" style={{ padding: "clamp(14px,2.5vw,20px)", opacity: post.is_visible ? 1 : 0.5, transition: "opacity 0.3s" }}>
                <div style={{ display: "flex", gap: "clamp(10px,2vw,16px)", alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Meta */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
                      <span style={{
                        fontSize: "8px", fontFamily: "Montserrat, sans-serif", letterSpacing: "0.15em",
                        textTransform: "uppercase", padding: "3px 10px", borderRadius: "100px",
                        background: `${color}10`, color, border: `1px solid ${color}28`,
                      }}>
                        {catLabel[post.category] ?? post.category}
                      </span>
                      <span style={{ fontSize: "12px", color: "var(--lavender)" }}>{authorName}</span>
                      <span style={{ fontSize: "11px", color: "var(--text-faint)" }}>{timeAgo(post.created_at)}</span>
                      {post.is_pinned   && <span className="badge-gold"  style={{ fontSize: "7px", padding: "2px 8px" }}>FIXADO</span>}
                      {!post.is_visible && <span className="badge-rose"  style={{ fontSize: "7px", padding: "2px 8px" }}>OCULTO</span>}
                    </div>

                    {/* Content */}
                    <p style={{ fontSize: "clamp(13px,1.6vw,15px)", color: "var(--text-primary)", fontWeight: 500, marginBottom: "4px", lineHeight: 1.4 }}>
                      {post.title}
                    </p>
                    <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.65, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", marginBottom: "10px" }}>
                      {post.body}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                      <span style={{ fontSize: "11px", color: "var(--text-faint)" }}>♡ {post.likes_count}</span>
                      <span style={{ fontSize: "11px", color: "var(--text-faint)", display: "flex", alignItems: "center", gap: "3px" }}>
                        <MessageSquare size={10} strokeWidth={1.5} /> {post.comments_count}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", flexShrink: 0 }}>
                    {/* Pin */}
                    <button
                      onClick={() => togglePin(post)}
                      disabled={isUpdating}
                      title={post.is_pinned ? "Desafixar" : "Fixar"}
                      style={{
                        width: "36px", height: "36px", borderRadius: "50%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        border: "1px solid var(--border-subtle)", cursor: "pointer",
                        background: post.is_pinned ? "rgba(198,168,112,0.15)" : "transparent",
                        color: post.is_pinned ? "var(--gold)" : "var(--text-faint)",
                        transition: "all 0.2s",
                      }}
                    >
                      {isUpdating ? <Loader2 size={13} style={{ animation: "spin 0.8s linear infinite" }} /> : <Pin size={13} strokeWidth={1.5} />}
                    </button>
                    {/* Hide/show */}
                    <button
                      onClick={() => toggleVisibility(post)}
                      disabled={isUpdating}
                      title={post.is_visible ? "Ocultar" : "Mostrar"}
                      style={{
                        width: "36px", height: "36px", borderRadius: "50%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        border: "1px solid var(--border-subtle)", cursor: "pointer",
                        background: "transparent", color: "var(--text-faint)",
                        transition: "all 0.2s",
                      }}
                    >
                      {post.is_visible ? <Eye size={13} strokeWidth={1.5} /> : <EyeOff size={13} strokeWidth={1.5} />}
                    </button>
                    {/* Delete */}
                    <button
                      onClick={() => deletePost(post.id)}
                      disabled={isUpdating}
                      title="Excluir"
                      style={{
                        width: "36px", height: "36px", borderRadius: "50%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        border: "1px solid rgba(172,128,142,0.20)", cursor: "pointer",
                        background: "transparent", color: "rgba(172,128,142,0.55)",
                        transition: "all 0.2s",
                      }}
                    >
                      <Trash2 size={13} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </AdminLayout>
  );
}
