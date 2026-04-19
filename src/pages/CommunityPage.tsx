/**
 * CommunityPage — Mobile-first forum — Supabase-connected
 * Persists posts and likes to community_posts / community_likes tables.
 * Optimistic UI for likes; full async for post creation.
 */
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { CommunityPost } from "@/types";
import { Flame, MessageSquare, Heart, Plus, X, ChevronRight, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Category = "all" | CommunityPost["category"];

const CATEGORIES: { value: Category; label: string; color: string }[] = [
  { value: "all",        label: "Todas",      color: "var(--lavender)" },
  { value: "geral",      label: "Geral",      color: "var(--lavender)" },
  { value: "desabafo",   label: "Desabafo",   color: "var(--rose)" },
  { value: "duvidas",    label: "Dúvidas",    color: "var(--gold)" },
  { value: "conquistas", label: "Conquistas", color: "var(--sage)" },
  { value: "dicas",      label: "Dicas",      color: "var(--gold-soft)" },
];

const catColor = (cat: CommunityPost["category"]) =>
  CATEGORIES.find((c) => c.value === cat)?.color ?? "var(--lavender)";
const catLabel = (cat: CommunityPost["category"]) =>
  CATEGORIES.find((c) => c.value === cat)?.label ?? cat;

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return "agora";
  if (mins < 60)  return `${mins}min`;
  if (hours < 24) return `${hours}h`;
  if (days === 1) return "ontem";
  return `${days}d`;
}

export default function CommunityPage() {
  const { user } = useAuth();
  const [category,     setCategory]     = useState<Category>("all");
  const [posts,        setPosts]        = useState<CommunityPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [showCompose,  setShowCompose]  = useState(false);
  const [newPost,      setNewPost]      = useState({ title: "", body: "", category: "geral" as CommunityPost["category"] });
  const [liked,        setLiked]        = useState<Set<string>>(new Set());
  const [submitting,   setSubmitting]   = useState(false);

  /* ── Load posts from Supabase ── */
  const fetchPosts = useCallback(async () => {
    setPostsLoading(true);
    const { data, error } = await supabase
      .from("community_posts")
      .select("id, user_id, category, title, body, is_pinned, likes_count, comments_count, created_at, user_profiles(anonymous_name)")
      .eq("is_visible", true)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(60);

    if (error) {
      console.error("community_posts fetch:", error);
    } else if (data) {
      const mapped: CommunityPost[] = (data as Record<string, unknown>[]).map((r) => ({
        id: r.id as string,
        author_anonymous:
          (r.user_profiles as { anonymous_name?: string } | null)?.anonymous_name ?? "Anônima",
        category: r.category as CommunityPost["category"],
        title: r.title as string,
        body: r.body as string,
        is_pinned: Boolean(r.is_pinned),
        is_visible: true,
        likes: (r.likes_count as number) ?? 0,
        comments_count: (r.comments_count as number) ?? 0,
        created_at: r.created_at as string,
      }));
      setPosts(mapped);
    }
    setPostsLoading(false);
  }, []);

  /* ── Load user's existing likes ── */
  const fetchLikes = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("community_likes")
      .select("post_id")
      .eq("user_id", user.id)
      .not("post_id", "is", null);
    if (data) setLiked(new Set((data as { post_id: string }[]).map((r) => r.post_id)));
  }, [user?.id]);

  useEffect(() => {
    fetchPosts();
    fetchLikes();
  }, [fetchPosts, fetchLikes]);

  const filtered = category === "all" ? posts : posts.filter((p) => p.category === category);

  /* ── Like / unlike with optimistic UI ── */
  const handleLike = async (postId: string) => {
    if (!user?.id) { toast.error("Faça login para curtir."); return; }
    const isLiked = liked.has(postId);

    // Optimistic update
    setLiked((prev) => {
      const s = new Set(prev);
      if (isLiked) s.delete(postId); else s.add(postId);
      return s;
    });
    setPosts((ps) =>
      ps.map((p) => p.id === postId ? { ...p, likes: p.likes + (isLiked ? -1 : 1) } : p)
    );

    if (isLiked) {
      const { error } = await supabase
        .from("community_likes")
        .delete()
        .eq("user_id", user.id)
        .eq("post_id", postId);
      if (error) {
        // Revert on failure
        setLiked((prev) => { const s = new Set(prev); s.add(postId); return s; });
        setPosts((ps) => ps.map((p) => p.id === postId ? { ...p, likes: p.likes + 1 } : p));
      }
    } else {
      const { error } = await supabase
        .from("community_likes")
        .insert({ user_id: user.id, post_id: postId });
      if (error) {
        // Revert on failure
        setLiked((prev) => { const s = new Set(prev); s.delete(postId); return s; });
        setPosts((ps) => ps.map((p) => p.id === postId ? { ...p, likes: p.likes - 1 } : p));
      }
    }
  };

  /* ── Submit new post to Supabase ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.title.trim() || !newPost.body.trim()) { toast.error("Preencha título e conteúdo."); return; }
    if (!user?.id) { toast.error("Faça login para publicar."); return; }
    setSubmitting(true);

    const { data, error } = await supabase
      .from("community_posts")
      .insert({
        user_id: user.id,
        category: newPost.category,
        title: newPost.title.trim(),
        body: newPost.body.trim(),
      })
      .select("id, category, title, body, is_pinned, likes_count, comments_count, created_at")
      .single();

    setSubmitting(false);

    if (error || !data) {
      toast.error("Não foi possível publicar. Tente novamente.");
      console.error("insert post:", error);
      return;
    }

    const row = data as Record<string, unknown>;
    const newEntry: CommunityPost = {
      id: row.id as string,
      author_anonymous: user.anonymous_name ?? "Anônima",
      category: row.category as CommunityPost["category"],
      title: row.title as string,
      body: row.body as string,
      is_pinned: false,
      is_visible: true,
      likes: 0,
      comments_count: 0,
      created_at: row.created_at as string,
    };
    setPosts((prev) => [newEntry, ...prev]);
    setNewPost({ title: "", body: "", category: "geral" });
    setShowCompose(false);
    toast.success("Post publicado. ✦");
  };

  return (
    <DashboardLayout>
      <div style={{ maxWidth: "680px", margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ padding: "20px 16px 0", marginBottom: "4px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
            <div>
              <p className="overline" style={{ color: "var(--lavender)", marginBottom: "4px", fontSize: "8px" }}>Espaço seguro</p>
              <h1 className="font-display" style={{ fontSize: "clamp(26px,4vw,36px)", fontWeight: 300, color: "var(--text-primary)", lineHeight: 1.1 }}>
                Comunidade
              </h1>
            </div>
            <button
              onClick={() => setShowCompose(true)}
              className="btn-gold hidden md:inline-flex"
              style={{ padding: "10px 20px", fontSize: "9px" }}
            >
              <Plus size={13} /> Novo post
            </button>
          </div>

          {/* Anonymous identity pill */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            padding: "6px 12px", borderRadius: "100px",
            background: "rgba(164,158,208,0.08)",
            border: "1px solid rgba(164,158,208,0.2)",
            marginBottom: "16px",
          }}>
            <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: "rgba(164,158,208,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: "9px", color: "var(--lavender)", fontFamily: "Montserrat, sans-serif", fontWeight: 600 }}>
                {user?.anonymous_name?.charAt(0) ?? "A"}
              </span>
            </div>
            <span style={{ fontSize: "12px", color: "var(--lavender)" }}>
              {user?.anonymous_name ?? "Anônima"}
            </span>
            <span style={{ fontSize: "10px", color: "var(--text-faint)" }}>· identidade anônima</span>
          </div>
        </div>

        {/* ── Category pills ── */}
        <div style={{
          display: "flex", gap: "8px", overflowX: "auto", padding: "0 16px 16px",
          scrollbarWidth: "none", msOverflowStyle: "none",
        }}>
          <style>{`.cat-scroll::-webkit-scrollbar { display: none; }`}</style>
          {CATEGORIES.map((c) => {
            const active = category === c.value;
            return (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className="font-label"
                style={{
                  padding: "8px 16px", borderRadius: "100px", border: "1px solid",
                  fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase",
                  whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.2s",
                  borderColor: active ? c.color : "var(--border-subtle)",
                  color: active ? c.color : "var(--text-faint)",
                  background: active ? `${c.color}18` : "transparent",
                  minHeight: "36px", cursor: "pointer",
                }}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        {/* ── Posts ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2px", padding: "0 0 8px" }}>
          {postsLoading ? (
            <div style={{ padding: "60px 24px", display: "flex", justifyContent: "center" }}>
              <Loader2 size={22} style={{ color: "var(--gold)", animation: "spin 1s linear infinite" }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "60px 24px", textAlign: "center" }}>
              <p style={{ fontSize: "16px", color: "var(--text-muted)", marginBottom: "16px" }}>Nenhum post nessa categoria.</p>
              <button onClick={() => setShowCompose(true)} className="btn-outline-gold" style={{ fontSize: "9px" }}>
                Ser a primeira a escrever <ArrowRight size={13} />
              </button>
            </div>
          ) : filtered.map((post, i) => (
            <article
              key={post.id}
              style={{
                background: "var(--card-bg)",
                borderBottom: "1px solid var(--border-subtle)",
                borderTop: i === 0 ? "1px solid var(--border-subtle)" : "none",
              }}
            >
              <div style={{ padding: "16px 16px 0" }}>
                {/* Author row */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                  <div style={{
                    width: "30px", height: "30px", borderRadius: "50%",
                    background: "rgba(164,158,208,0.14)", color: "var(--lavender)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "11px", fontFamily: "Montserrat, sans-serif", fontWeight: 600, flexShrink: 0,
                  }}>
                    {post.author_anonymous.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "13px", color: "var(--lavender)", fontWeight: 500 }}>{post.author_anonymous}</span>
                      <span style={{ fontSize: "11px", color: "var(--text-faint)" }}>·</span>
                      <span style={{ fontSize: "11px", color: "var(--text-faint)" }}>{timeAgo(post.created_at)}</span>
                      {post.is_pinned && <Flame size={10} style={{ color: "var(--gold)" }} />}
                    </div>
                  </div>
                  <span style={{
                    fontSize: "8px", fontFamily: "Montserrat, sans-serif", letterSpacing: "0.14em",
                    textTransform: "uppercase", padding: "3px 10px", borderRadius: "100px",
                    border: `1px solid ${catColor(post.category)}30`,
                    color: catColor(post.category),
                    background: `${catColor(post.category)}12`,
                    whiteSpace: "nowrap", flexShrink: 0,
                  }}>
                    {catLabel(post.category)}
                  </span>
                </div>

                {/* Title + body */}
                <Link to={`/community/topic/${post.id}`} style={{ textDecoration: "none", display: "block" }}>
                  <h2 style={{ fontSize: "clamp(15px,2.2vw,17px)", fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.45, marginBottom: "6px" }}>
                    {post.title}
                  </h2>
                  <p style={{
                    fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.7,
                    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                    marginBottom: "12px",
                  }}>
                    {post.body}
                  </p>
                </Link>
              </div>

              {/* Actions row */}
              <div style={{
                display: "flex", alignItems: "center",
                padding: "0 8px 4px",
                borderTop: "1px solid var(--border-subtle)",
              }}>
                <button
                  onClick={() => handleLike(post.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    padding: "10px 12px", background: "transparent", border: "none", cursor: "pointer",
                    color: liked.has(post.id) ? "var(--rose)" : "var(--text-faint)",
                    fontSize: "13px", fontFamily: "DM Sans, sans-serif",
                    transition: "color 0.2s", minHeight: "44px", borderRadius: "8px",
                  }}
                  aria-label={liked.has(post.id) ? "Remover curtida" : "Curtir"}
                >
                  <Heart size={15} strokeWidth={1.5} fill={liked.has(post.id) ? "var(--rose)" : "none"} />
                  <span style={{ fontSize: "13px" }}>{post.likes}</span>
                </button>

                <Link
                  to={`/community/topic/${post.id}`}
                  style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    padding: "10px 12px", textDecoration: "none",
                    color: "var(--text-faint)", fontSize: "13px", transition: "color 0.2s",
                    minHeight: "44px", borderRadius: "8px",
                  }}
                >
                  <MessageSquare size={15} strokeWidth={1.5} />
                  <span>{post.comments_count}</span>
                </Link>

                <Link
                  to={`/community/topic/${post.id}`}
                  style={{
                    display: "flex", alignItems: "center", gap: "5px",
                    padding: "10px 12px", textDecoration: "none",
                    color: "var(--text-faint)", fontSize: "12px", marginLeft: "auto",
                    fontFamily: "Montserrat, sans-serif", letterSpacing: "0.1em", textTransform: "uppercase",
                    minHeight: "44px", borderRadius: "8px",
                  }}
                >
                  <span style={{ fontSize: "9px" }}>Ver post</span>
                  <ChevronRight size={12} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* ── FAB — mobile compose ── */}
      <button
        onClick={() => setShowCompose(true)}
        className="md:hidden"
        style={{
          position: "fixed",
          bottom: "calc(64px + 20px + env(safe-area-inset-bottom))",
          right: "20px",
          width: "52px", height: "52px", borderRadius: "50%",
          background: "var(--gold)", color: "#0b0d1c",
          border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 8px 28px rgba(198,168,112,0.45)",
          zIndex: 140, transition: "transform 0.2s, box-shadow 0.2s",
        }}
        aria-label="Novo post"
      >
        <Plus size={22} strokeWidth={2} />
      </button>

      {/* ── Compose sheet ── */}
      {showCompose && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 300,
            background: "rgba(7,9,21,0.65)",
            backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
            display: "flex", alignItems: "flex-end",
          }}
          onClick={() => setShowCompose(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: "680px", margin: "0 auto",
              background: "var(--sidebar-bg)",
              borderRadius: "24px 24px 0 0",
              borderTop: "1px solid var(--border-soft)",
              padding: "20px 20px calc(24px + env(safe-area-inset-bottom))",
              maxHeight: "90dvh", overflowY: "auto",
            }}
          >
            <div style={{ width: "36px", height: "3px", borderRadius: "100px", background: "var(--border-mid)", margin: "0 auto 20px" }} />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <div>
                <p className="overline" style={{ color: "var(--gold)", marginBottom: "4px", fontSize: "8px" }}>Compartilhar</p>
                <h2 className="font-display" style={{ fontSize: "22px", fontWeight: 300, color: "var(--text-primary)" }}>Novo post</h2>
              </div>
              <button
                onClick={() => setShowCompose(false)}
                style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}
                aria-label="Fechar"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            {/* Anonymous notice */}
            <div style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "10px 12px", borderRadius: "10px",
              background: "rgba(164,158,208,0.08)",
              border: "1px solid rgba(164,158,208,0.18)",
              marginBottom: "20px",
            }}>
              <span style={{ fontSize: "12px", color: "var(--lavender)" }}>✦</span>
              <span style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.5 }}>
                Publicando como <strong style={{ color: "var(--lavender)" }}>{user?.anonymous_name ?? "Anônima"}</strong>
              </span>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontFamily: "Montserrat, sans-serif", fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "8px" }}>
                  Categoria
                </label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setNewPost((p) => ({ ...p, category: c.value as CommunityPost["category"] }))}
                      style={{
                        padding: "7px 14px", borderRadius: "100px", border: "1px solid",
                        fontSize: "9px", fontFamily: "Montserrat, sans-serif", letterSpacing: "0.15em", textTransform: "uppercase",
                        cursor: "pointer", minHeight: "36px", transition: "all 0.18s",
                        borderColor: newPost.category === c.value ? c.color : "var(--border-subtle)",
                        color: newPost.category === c.value ? c.color : "var(--text-faint)",
                        background: newPost.category === c.value ? `${c.color}18` : "transparent",
                      }}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontFamily: "Montserrat, sans-serif", fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "8px" }}>
                  Título
                </label>
                <input
                  type="text"
                  value={newPost.title}
                  onChange={(e) => setNewPost((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Do que você quer falar?"
                  className="input-dark"
                  style={{ borderRadius: "12px", minHeight: "52px" }}
                  maxLength={120}
                />
              </div>

              <div>
                <label style={{ display: "block", fontFamily: "Montserrat, sans-serif", fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "8px" }}>
                  Conteúdo
                </label>
                <textarea
                  value={newPost.body}
                  onChange={(e) => setNewPost((p) => ({ ...p, body: e.target.value }))}
                  placeholder="Escreva com cuidado. Esse espaço é sagrado."
                  rows={5}
                  className="input-dark"
                  style={{ resize: "none", borderRadius: "12px", lineHeight: 1.7 }}
                />
              </div>

              <button type="submit" disabled={submitting} className="btn-gold" style={{ width: "100%", borderRadius: "12px", minHeight: "54px", fontSize: "10px" }}>
                {submitting
                  ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Publicando…</>
                  : "Publicar ✦"
                }
              </button>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
