/**
 * DashboardPage — Mobile-first member home
 * Priority: progress widget, quick-access course card, community pulse
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import mulherEspiralProduct from "@/assets/mulher-espiral-hero.jpg";
import { ArrowRight, Play, MessageSquare, BookOpen, TrendingUp, Flame, Clock, CheckCircle2 } from "lucide-react";

interface ProductWithProgress {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  thumbnail_url: string | null;
  total_lessons: number;
  completed_lessons: number;
  progress_pct: number;
}

interface CommunityPost {
  id: string;
  title: string;
  category: string;
  likes_count: number;
  comments_count: number;
  is_pinned: boolean;
  created_at: string;
  user_profiles: { anonymous_name: string | null } | null;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return "agora";
  if (diff < 3600)  return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

const CAT_COLOR: Record<string, string> = {
  conquistas: "var(--sage)", desabafo: "var(--rose)",
  duvidas: "var(--lavender)", dicas: "var(--gold)", geral: "var(--text-muted)",
};
const FALLBACK = mulherEspiralProduct;

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px" }}>
      <div style={{ width: "22px", height: "22px", borderRadius: "50%", border: "2px solid var(--border-subtle)", borderTopColor: "var(--gold)", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [products,   setProducts]   = useState<ProductWithProgress[]>([]);
  const [posts,      setPosts]      = useState<CommunityPost[]>([]);
  const [totalDone,  setTotalDone]  = useState(0);
  const [loadingP,   setLoadingP]   = useState(true);
  const [loadingC,   setLoadingC]   = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoadingP(true);

      // 1. Owned products with nested structure (single query)
      const { data: owned } = await supabase
        .from("user_products")
        .select(`
          product_id,
          products(id, slug, title, subtitle, thumbnail_url,
            modules(id, lessons(id))
          )
        `)
        .eq("user_id", user.id);

      if (!owned || owned.length === 0) { setLoadingP(false); return; }

      // 2. Collect all lesson IDs across all owned products
      const allLessonIds = owned.flatMap((row: Record<string, unknown>) => {
        const p = row.products as { modules: { lessons: { id: string }[] }[] } | null;
        return (p?.modules ?? []).flatMap((m) => m.lessons.map((l) => l.id));
      });

      // 3. Single progress query for all lessons
      let completedSet = new Set<string>();
      if (allLessonIds.length > 0) {
        const { data: progress } = await supabase
          .from("lesson_progress")
          .select("lesson_id")
          .eq("user_id", user.id)
          .eq("completed", true)
          .in("lesson_id", allLessonIds);
        completedSet = new Set((progress ?? []).map((r: { lesson_id: string }) => r.lesson_id));
      }

      const valid: ProductWithProgress[] = owned.map((row: Record<string, unknown>) => {
        const p = row.products as { id: string; slug: string; title: string; subtitle: string | null; thumbnail_url: string | null; modules: { id: string; lessons: { id: string }[] }[] } | null;
        if (!p) return null;
        const lessonIds = (p.modules ?? []).flatMap((m) => m.lessons.map((l) => l.id));
        const totalLessons = lessonIds.length;
        const completedLessons = lessonIds.filter((id) => completedSet.has(id)).length;
        return {
          id: p.id, slug: p.slug, title: p.title, subtitle: p.subtitle, thumbnail_url: p.thumbnail_url,
          total_lessons: totalLessons, completed_lessons: completedLessons,
          progress_pct: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
        };
      }).filter(Boolean) as ProductWithProgress[];

      setProducts(valid);
      setTotalDone(valid.reduce((s, p) => s + p.completed_lessons, 0));
      setLoadingP(false);
    })();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoadingC(true);
      const { data } = await supabase.from("community_posts")
        .select("id, title, category, likes_count, comments_count, is_pinned, created_at, user_profiles(anonymous_name)")
        .eq("is_visible", true).order("created_at", { ascending: false }).limit(4);
      setPosts((data as CommunityPost[] | null) ?? []);
      setLoadingC(false);
    })();
  }, [user]);

  const totalLessons = products.reduce((s, p) => s + p.total_lessons, 0);
  const overallPct   = totalLessons > 0 ? Math.round((totalDone / totalLessons) * 100) : 0;
  const mainProduct  = products[0];

  return (
    <DashboardLayout>
      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "0" }}>

        {/* ══ GREETING HERO — mobile-first full-width ══ */}
        <div style={{
          padding: "24px 16px 20px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-surface-2)",
        }}>
          {/* Top row */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "16px" }}>
            <div>
              <p className="overline" style={{ color: "var(--gold)", fontSize: "8px", marginBottom: "6px" }}>
                {greeting()}{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
              </p>
              <h1 className="font-display" style={{ fontSize: "clamp(22px,4vw,32px)", fontWeight: 300, color: "var(--text-primary)", lineHeight: 1.15, marginBottom: "6px" }}>
                Bem-vinda de volta.
              </h1>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 10px", borderRadius: "100px", background: "rgba(164,158,208,0.08)", border: "1px solid rgba(164,158,208,0.18)" }}>
                <span style={{ fontSize: "11px", color: "var(--lavender)" }}>
                  {user?.anonymous_name ?? "Convidada"}
                </span>
                <span style={{ fontSize: "10px", color: "var(--text-faint)" }}>na comunidade</span>
              </div>
            </div>
            {/* Avatar */}
            <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "rgba(198,168,112,0.15)", color: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontFamily: "Montserrat", fontWeight: 600, flexShrink: 0, border: "2px solid rgba(198,168,112,0.2)" }}>
              {user?.name?.charAt(0) ?? "U"}
            </div>
          </div>

          {/* Progress bar — overall */}
          {products.length > 0 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Jornada geral</span>
                <span style={{ fontSize: "12px", color: "var(--gold)", fontFamily: "Montserrat, sans-serif", fontWeight: 600 }}>
                  {overallPct}%
                </span>
              </div>
              <div className="progress-bar" style={{ height: "4px" }}>
                <div className="progress-bar-fill" style={{ width: `${overallPct}%` }} />
              </div>
              <div style={{ display: "flex", gap: "16px", marginTop: "12px" }}>
                {[
                  { icon: CheckCircle2, val: totalDone,      lbl: "concluídas" },
                  { icon: BookOpen,     val: totalLessons,   lbl: "no total" },
                  { icon: TrendingUp,   val: products.length,lbl: "cursos" },
                ].map(({ icon: Icon, val, lbl }) => (
                  <div key={lbl} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <Icon size={12} style={{ color: "var(--gold)" }} strokeWidth={1.5} />
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      <strong style={{ color: "var(--text-primary)", fontWeight: 500 }}>{val}</strong> {lbl}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ══ CONTINUE COURSE — prominent mobile card ══ */}
        <div style={{ padding: "16px 16px 0" }}>
          {mainProduct && (
            <div className="flow-card" style={{ padding: "14px 16px", marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "6px" }}>
                <span className="step-chip">01</span>
                <p className="font-label" style={{ fontSize: "9px", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--gold)" }}>
                  Próximo passo da sua jornada
                </p>
              </div>
              <p className="reading-note" style={{ margin: 0 }}>
                Retome <strong style={{ color: "var(--text-primary)", fontWeight: 500 }}>{mainProduct.title}</strong> e avance mais uma aula para manter seu ritmo com leveza.
              </p>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <p className="overline" style={{ color: "var(--gold)", fontSize: "8px" }}>Continuar assistindo</p>
            <Link to="/products" className="font-label"
              style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-muted)", textDecoration: "none" }}>
              Ver todos <ArrowRight size={10} />
            </Link>
          </div>

          {loadingP ? <Spinner /> : mainProduct ? (
            /* Featured course hero card */
            <Link to={`/products/${mainProduct.slug}`} style={{ textDecoration: "none", display: "block" }}>
              <div className="card-dark" style={{ overflow: "hidden", position: "relative" }}>
                {/* Thumbnail */}
                <div style={{ position: "relative", height: "clamp(160px,28vw,220px)", overflow: "hidden" }}>
                  <img src={mainProduct.thumbnail_url || FALLBACK} alt={mainProduct.title}
                    loading="lazy" decoding="async"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(11,13,28,0.95) 0%, rgba(11,13,28,0.2) 55%, transparent 100%)" }} />
                  {/* Play button */}
                  <div style={{
                    position: "absolute", bottom: "14px", right: "14px",
                    width: "46px", height: "46px", borderRadius: "50%",
                    background: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 4px 20px rgba(198,168,112,0.5)",
                  }}>
                    <Play size={16} fill="#0b0d1c" style={{ color: "#0b0d1c", marginLeft: "2px" }} />
                  </div>
                  {/* Title overlay */}
                  <div style={{ position: "absolute", bottom: "14px", left: "14px", right: "72px" }}>
                    {mainProduct.subtitle && (
                      <span className="badge-rose" style={{ fontSize: "8px", marginBottom: "6px", display: "inline-flex" }}>
                        {mainProduct.subtitle}
                      </span>
                    )}
                    <h2 className="font-display" style={{ fontSize: "clamp(20px,4vw,28px)", fontWeight: 300, color: "#f8f5ee", lineHeight: 1.15 }}>
                      {mainProduct.title}
                    </h2>
                  </div>
                </div>
                {/* Progress footer */}
                <div style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      {mainProduct.completed_lessons} de {mainProduct.total_lessons} aulas
                    </span>
                    <span style={{ fontSize: "13px", color: "var(--gold)", fontFamily: "Montserrat, sans-serif", fontWeight: 600 }}>
                      {mainProduct.progress_pct}%
                    </span>
                  </div>
                  <div className="progress-bar" style={{ height: "3px" }}>
                    <div className="progress-bar-fill" style={{ width: `${mainProduct.progress_pct}%` }} />
                  </div>
                  <p className="reading-note" style={{ fontSize: "12px", margin: "10px 0 0" }}>
                    Continue de onde parou para manter consistência sem sobrecarga.
                  </p>
                </div>
              </div>
            </Link>
          ) : !loadingP ? (
            /* Empty state */
            <div className="card-dark" style={{ padding: "32px 24px", textAlign: "center" }}>
              <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "rgba(198,168,112,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                <BookOpen size={22} style={{ color: "var(--gold)" }} strokeWidth={1.5} />
              </div>
              <p className="font-display" style={{ fontSize: "20px", fontWeight: 300, color: "var(--text-primary)", marginBottom: "8px" }}>
                Inicie sua jornada
              </p>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "20px" }}>
                Adquira um curso e desperte o que está dentro de você.
              </p>
              <Link to="/checkout/mulher-espiral" className="btn-gold" style={{ fontSize: "9px", padding: "12px 28px" }}>
                Conhecer cursos <ArrowRight size={13} />
              </Link>
            </div>
          ) : null}

          {/* Other products (compact rows) */}
          {products.length > 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
              {products.slice(1).map((p) => (
                <Link key={p.id} to={`/products/${p.slug}`} style={{ textDecoration: "none" }}>
                  <div className="card-dark" style={{ display: "flex", gap: "12px", padding: "12px 14px", alignItems: "center" }}>
                    <div style={{ width: "52px", height: "52px", borderRadius: "10px", overflow: "hidden", flexShrink: 0 }}>
                      <img src={p.thumbnail_url || FALLBACK} alt={p.title} loading="lazy" decoding="async" width="52" height="52" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "14px", color: "var(--text-primary)", fontWeight: 500, marginBottom: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.title}</p>
                      <div className="progress-bar" style={{ height: "2px", marginBottom: "4px" }}>
                        <div className="progress-bar-fill" style={{ width: `${p.progress_pct}%` }} />
                      </div>
                      <p style={{ fontSize: "11px", color: "var(--text-faint)" }}>{p.completed_lessons}/{p.total_lessons} aulas · {p.progress_pct}%</p>
                    </div>
                    <Clock size={13} style={{ color: "var(--gold)", flexShrink: 0 }} strokeWidth={1.5} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ══ COMMUNITY PULSE ══ */}
        <div style={{ padding: "20px 16px 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <p className="overline" style={{ color: "var(--lavender)", fontSize: "8px" }}>Comunidade</p>
            <Link to="/community" className="font-label"
              style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-muted)", textDecoration: "none" }}>
              Ver tudo <ArrowRight size={10} />
            </Link>
          </div>

          {loadingC ? <Spinner /> : posts.length === 0 ? (
            <div className="card-dark" style={{ padding: "28px 20px", textAlign: "center" }}>
              <p style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.7, marginBottom: "14px" }}>
                Nenhum post ainda. Seja a primeira.
              </p>
              <Link to="/community" className="btn-ghost" style={{ fontSize: "9px" }}>Ir para a comunidade</Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
              {posts.map((post, i) => (
                <Link key={post.id} to={`/community/topic/${post.id}`} style={{ textDecoration: "none" }}>
                  <div style={{
                    padding: "14px 0",
                    borderBottom: i < posts.length - 1 ? "1px solid var(--border-subtle)" : "none",
                    display: "flex", gap: "12px", alignItems: "flex-start",
                  }}>
                    {/* Category dot */}
                    <div style={{
                      width: "8px", height: "8px", borderRadius: "50%",
                      background: CAT_COLOR[post.category] ?? "var(--lavender)",
                      flexShrink: 0, marginTop: "6px",
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                        {post.is_pinned && <Flame size={9} style={{ color: "var(--gold)" }} />}
                        <span style={{ fontSize: "11px", color: "var(--lavender)" }}>
                          {post.user_profiles?.anonymous_name ?? "Anônima"}
                        </span>
                        <span style={{ fontSize: "10px", color: "var(--text-faint)" }}>{timeAgo(post.created_at)}</span>
                      </div>
                      <p style={{ fontSize: "14px", color: "var(--text-primary)", lineHeight: 1.5, marginBottom: "4px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {post.title}
                      </p>
                      <div style={{ display: "flex", gap: "12px" }}>
                        <span style={{ fontSize: "11px", color: "var(--text-faint)", display: "flex", alignItems: "center", gap: "3px" }}>
                          ♡ {post.likes_count}
                        </span>
                        <span style={{ fontSize: "11px", color: "var(--text-faint)", display: "flex", alignItems: "center", gap: "3px" }}>
                          <MessageSquare size={9} /> {post.comments_count}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
              <Link to="/community" className="btn-ghost"
                style={{ display: "flex", width: "100%", justifyContent: "center", fontSize: "9px", marginTop: "12px" }}>
                Ver mais posts
              </Link>
            </div>
          )}
        </div>

        {/* ══ UPSELL — if no products ══ */}
        {!loadingP && products.length === 0 && (
          <div style={{ padding: "16px 16px 24px" }}>
            <div style={{
              borderRadius: "20px", padding: "28px 24px",
              background: "linear-gradient(135deg, rgba(198,168,112,0.07) 0%, rgba(172,128,142,0.05) 100%)",
              border: "1px solid var(--border-soft)", textAlign: "center",
            }}>
              <p className="overline" style={{ color: "var(--gold)", marginBottom: "10px", fontSize: "8px" }}>Comece agora</p>
              <h2 className="font-display" style={{ fontSize: "clamp(20px,3vw,30px)", fontWeight: 300, color: "var(--text-primary)", marginBottom: "10px", lineHeight: 1.2 }}>
                Você chegou até aqui por um motivo.
              </h2>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.8, marginBottom: "24px" }}>
                O Mulher Espiral tem 8 módulos de autoconhecimento profundo esperando por você.
              </p>
              <Link to="/checkout/mulher-espiral" className="btn-gold" style={{ width: "100%", justifyContent: "center", fontSize: "10px" }}>
                Quero começar <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}

        {/* Bottom spacer — extra on mobile for tab bar */}
        <div style={{ height: "8px" }} />
      </div>
    </DashboardLayout>
  );
}
