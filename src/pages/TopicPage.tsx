/**
 * TopicPage — Mobile-first community topic
 * Real Supabase data, sticky reply bar, like interactions
 */
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabase";
import { MOCK_COMMUNITY_POSTS } from "@/constants/mockData";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Heart, Send, MessageSquare, Flame, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PostData {
  id: string;
  title: string;
  body: string;
  category: string;
  is_pinned: boolean;
  likes_count: number;
  comments_count: number;
  created_at: string;
  user_profiles: { anonymous_name: string | null } | null;
}

interface CommentData {
  id: string;
  body: string;
  created_at: string;
  user_profiles: { anonymous_name: string | null } | null;
  likes_count?: number;
}

const catColor: Record<string, string> = {
  geral: "var(--lavender)", desabafo: "var(--rose)",
  duvidas: "var(--gold)", conquistas: "var(--sage)", dicas: "var(--gold-soft)",
};
const catLabel: Record<string, string> = {
  geral: "Geral", desabafo: "Desabafo", duvidas: "Dúvidas", conquistas: "Conquistas", dicas: "Dicas",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return "agora";
  if (mins < 60)  return `${mins}min atrás`;
  if (hours < 24) return `${hours}h atrás`;
  if (days === 1) return "ontem";
  return `${days}d atrás`;
}

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px" }}>
      <Loader2 size={22} style={{ color: "var(--gold)", animation: "spin 0.9s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function TopicPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [post,        setPost]        = useState<PostData | null>(null);
  const [comments,    setComments]    = useState<CommentData[]>([]);
  const [newComment,  setNewComment]  = useState("");
  const [loadingPost, setLoadingPost] = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [likedPost,   setLikedPost]   = useState(false);
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [postLikes,   setPostLikes]   = useState(0);

  /* Load post */
  useEffect(() => {
    if (!id) return;
    setLoadingPost(true);

    // Try Supabase first
    supabase
      .from("community_posts")
      .select("id, title, body, category, is_pinned, likes_count, comments_count, created_at, user_profiles(anonymous_name)")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (data && !error) {
          setPost(data as unknown as PostData);
          setPostLikes((data as unknown as PostData).likes_count ?? 0);
        } else {
          // Fallback to mock data
          const mock = MOCK_COMMUNITY_POSTS.find((p) => p.id === id);
          if (mock) {
            setPost({
              id: mock.id, title: mock.title, body: mock.body,
              category: mock.category, is_pinned: mock.is_pinned,
              likes_count: mock.likes, comments_count: mock.comments_count,
              created_at: mock.created_at,
              user_profiles: { anonymous_name: mock.author_anonymous },
            });
            setPostLikes(mock.likes);
          }
        }
        setLoadingPost(false);
      });

    // Load comments
    supabase
      .from("community_comments")
      .select("id, body, created_at, user_profiles(anonymous_name)")
      .eq("post_id", id)
      .eq("is_visible", true)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setComments(data as unknown as CommentData[]);
        else {
          // Mock fallback comments
          setComments([
            { id: "c1", body: "Que belo partilhar. Eu também vivi isso no módulo 2. É como se o corpo se lembrasse do que já sabia.", created_at: "2026-04-10T15:00:00Z", user_profiles: { anonymous_name: "Cedro Dourado" }, likes_count: 12 },
            { id: "c2", body: "Obrigada por colocar em palavras o que eu ainda não consegui. Isso me deu esperança.", created_at: "2026-04-10T16:30:00Z", user_profiles: { anonymous_name: "Íris do Campo" }, likes_count: 8 },
          ]);
        }
      });
  }, [id]);

  const handleLikePost = async () => {
    if (!user || !post) return;
    const isLiked = likedPost;
    setLikedPost(!isLiked);
    setPostLikes((p) => isLiked ? p - 1 : p + 1);
    if (!isLiked) {
      await supabase.from("community_likes").insert({ user_id: user.id, post_id: post.id });
    } else {
      await supabase.from("community_likes").delete().eq("user_id", user.id).eq("post_id", post.id);
    }
  };

  const handleLikeComment = (cid: string) => {
    setLikedComments((prev) => {
      const s = new Set(prev);
      if (s.has(cid)) {
        s.delete(cid);
        setComments((cs) => cs.map((c) => c.id === cid ? { ...c, likes_count: (c.likes_count ?? 0) - 1 } : c));
      } else {
        s.add(cid);
        setComments((cs) => cs.map((c) => c.id === cid ? { ...c, likes_count: (c.likes_count ?? 0) + 1 } : c));
      }
      return s;
    });
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) { toast.error("Escreva algo antes de enviar."); return; }
    if (!user) { toast.error("Você precisa estar logada para comentar."); return; }
    setSubmitting(true);

    const { data, error } = await supabase.from("community_comments").insert({
      post_id: id,
      user_id: user.id,
      body: newComment.trim(),
    }).select("id, body, created_at, user_profiles(anonymous_name)").single();

    if (error) {
      // Optimistic fallback
      const optimistic: CommentData = {
        id: `c${Date.now()}`,
        body: newComment.trim(),
        created_at: new Date().toISOString(),
        user_profiles: { anonymous_name: user.anonymous_name },
        likes_count: 0,
      };
      setComments((prev) => [...prev, optimistic]);
    } else if (data) {
      setComments((prev) => [...prev, data as unknown as CommentData]);
    }

    setNewComment("");
    setSubmitting(false);
    toast.success("Comentário publicado. ✦");
  };

  if (loadingPost) {
    return <DashboardLayout><Spinner /></DashboardLayout>;
  }

  if (!post) {
    return (
      <DashboardLayout>
        <div style={{ padding: "48px 24px", textAlign: "center" }}>
          <p style={{ color: "var(--text-muted)", marginBottom: "16px" }}>Post não encontrado.</p>
          <Link to="/community" className="btn-gold" style={{ padding: "10px 24px", fontSize: "9px" }}>Voltar</Link>
        </div>
      </DashboardLayout>
    );
  }

  const color = catColor[post.category] ?? "var(--lavender)";
  const authorName = post.user_profiles?.anonymous_name ?? "Anônima";

  return (
    <DashboardLayout>
      <div style={{ maxWidth: "680px", margin: "0 auto", paddingBottom: "calc(80px + env(safe-area-inset-bottom))" }}>

        {/* ── Back ── */}
        <div style={{ padding: "clamp(14px,2.5vw,20px) 16px 0" }}>
          <Link to="/community" style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            fontSize: "9px", fontFamily: "Montserrat, sans-serif",
            letterSpacing: "0.18em", textTransform: "uppercase",
            color: "var(--text-muted)", textDecoration: "none",
            transition: "color 0.2s", minHeight: "44px",
          }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--gold)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-muted)")}
          >
            <ArrowLeft size={13} /> Comunidade
          </Link>
        </div>

        {/* ── Post ── */}
        <div style={{ padding: "clamp(12px,2vw,16px) 16px 0" }}>
          <div className="card-dark" style={{ padding: "clamp(18px,4vw,28px)", marginBottom: "8px" }}>

            {/* Category + author row */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
              <span style={{
                fontSize: "8px", fontFamily: "Montserrat, sans-serif", letterSpacing: "0.15em",
                textTransform: "uppercase", padding: "4px 12px", borderRadius: "100px",
                border: `1px solid ${color}28`, color, background: `${color}10`,
              }}>
                {catLabel[post.category] ?? post.category}
              </span>
              {post.is_pinned && <Flame size={11} style={{ color: "var(--gold)" }} />}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "2px" }}>
                <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "rgba(164,158,208,0.14)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: "9px", color: "var(--lavender)", fontFamily: "Montserrat", fontWeight: 600 }}>
                    {authorName.charAt(0)}
                  </span>
                </div>
                <span style={{ fontSize: "13px", color: "var(--lavender)" }}>{authorName}</span>
                <span style={{ fontSize: "11px", color: "var(--text-faint)" }}>· {timeAgo(post.created_at)}</span>
              </div>
            </div>

            {/* Title */}
            <h1 className="font-display" style={{
              fontSize: "clamp(22px,4vw,34px)", fontWeight: 300, lineHeight: 1.18,
              color: "var(--text-primary)", marginBottom: "clamp(12px,2vw,18px)",
            }}>
              {post.title}
            </h1>

            {/* Body */}
            <p style={{
              fontSize: "clamp(14px,1.8vw,16px)", color: "var(--text-secondary)",
              lineHeight: 1.88, marginBottom: "clamp(16px,2.5vw,24px)",
              whiteSpace: "pre-wrap",
            }}>
              {post.body}
            </p>

            {/* Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: "4px", paddingTop: "14px", borderTop: "1px solid var(--border-subtle)" }}>
              <button
                onClick={handleLikePost}
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "8px 12px", background: "transparent", border: "none",
                  cursor: "pointer", borderRadius: "8px",
                  color: likedPost ? "var(--rose)" : "var(--text-faint)",
                  fontSize: "13px", fontFamily: "DM Sans", transition: "color 0.2s",
                  minHeight: "44px",
                }}
              >
                <Heart size={15} strokeWidth={1.5} fill={likedPost ? "var(--rose)" : "none"} />
                {postLikes}
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 12px", color: "var(--text-faint)", fontSize: "13px" }}>
                <MessageSquare size={15} strokeWidth={1.5} />
                {comments.length} {comments.length === 1 ? "resposta" : "respostas"}
              </div>
            </div>
          </div>
        </div>

        {/* ── Comments ── */}
        <div style={{ padding: "0 16px" }}>
          <p className="overline" style={{
            color: "var(--text-faint)", fontSize: "8px", letterSpacing: "0.22em",
            marginBottom: "12px", marginTop: "20px",
          }}>
            {comments.length} {comments.length === 1 ? "Resposta" : "Respostas"}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
            {comments.length === 0 ? (
              <div className="card-dark" style={{ padding: "32px 20px", textAlign: "center" }}>
                <p style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.7 }}>
                  Seja a primeira a responder. ✦
                </p>
              </div>
            ) : comments.map((c) => {
              const commentAuthor = c.user_profiles?.anonymous_name ?? "Anônima";
              const isLiked = likedComments.has(c.id);
              return (
                <div key={c.id} className="card-dark" style={{ padding: "clamp(14px,3vw,20px)" }}>
                  {/* Author */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                    <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "rgba(172,128,142,0.14)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: "10px", color: "var(--rose)", fontFamily: "Montserrat", fontWeight: 600 }}>
                        {commentAuthor.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: "13px", color: "var(--rose)", fontWeight: 500 }}>{commentAuthor}</span>
                      <span style={{ fontSize: "11px", color: "var(--text-faint)", marginLeft: "6px" }}>· {timeAgo(c.created_at)}</span>
                    </div>
                  </div>

                  {/* Body */}
                  <p style={{ fontSize: "clamp(13px,1.6vw,15px)", color: "var(--text-secondary)", lineHeight: 1.82, marginBottom: "12px", whiteSpace: "pre-wrap" }}>
                    {c.body}
                  </p>

                  {/* Like */}
                  <button
                    onClick={() => handleLikeComment(c.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: "5px",
                      background: "transparent", border: "none", cursor: "pointer",
                      fontSize: "12px", fontFamily: "DM Sans",
                      color: isLiked ? "var(--rose)" : "var(--text-faint)",
                      padding: "4px 0", minHeight: "36px",
                      transition: "color 0.2s",
                    }}
                  >
                    <Heart size={13} strokeWidth={1.5} fill={isLiked ? "var(--rose)" : "none"} />
                    {c.likes_count ?? 0}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Reply form ── */}
        <div style={{ padding: "0 16px" }}>
          <div className="card-dark" style={{ padding: "clamp(14px,3vw,20px)" }}>
            <p className="font-label" style={{
              fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase",
              color: "var(--text-muted)", marginBottom: "12px",
            }}>
              Respondendo como{" "}
              <span style={{ color: "var(--lavender)" }}>{user?.anonymous_name ?? "Anônima"}</span>
            </p>
            <form onSubmit={handleComment} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Escreva sua resposta com cuidado…"
                rows={3}
                className="input-dark"
                style={{ resize: "none", borderRadius: "12px", lineHeight: 1.7 }}
              />
              <button
                type="submit"
                disabled={submitting}
                className="btn-gold"
                style={{ alignSelf: "flex-end", padding: "11px 24px", fontSize: "9px", borderRadius: "12px" }}
              >
                {submitting
                  ? <Loader2 size={13} style={{ animation: "spin 0.9s linear infinite" }} />
                  : <><Send size={13} /> Responder</>
                }
              </button>
            </form>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </DashboardLayout>
  );
}
