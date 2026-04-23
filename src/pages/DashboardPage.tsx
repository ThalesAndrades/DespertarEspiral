/**
 * DashboardPage — Mobile-first member home
 * Priority: progress widget, quick-access course card, community pulse
 * Performance: Promise.all parallel fetches, localStorage cache hydration
 */
import { useEffect, useState, memo } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import mulherEspiralProduct from "@/assets/mulher-espiral-hero-new.jpg";
import { ArrowRight, Play, MessageSquare, BookOpen, TrendingUp, Flame, Clock, CheckCircle2 } from "lucide-react";
import { timeAgo, greeting, progressPct } from "@/lib/dateUtils";

interface ProductWithProgress {
  id: string; slug: string; title: string; subtitle: string | null;
  thumbnail_url: string | null; total_lessons: number;
  completed_lessons: number; progress_pct: number;
}
interface CommunityPost {
  id: string; title: string; category: string; likes_count: number;
  comments_count: number; is_pinned: boolean; created_at: string;
  user_profiles: { anonymous_name: string | null } | null;
}

const CAT_COLOR: Record<string, string> = {
  conquistas: "var(--sage)", desabafo: "var(--rose)",
  duvidas: "var(--lavender)", dicas: "var(--gold)", geral: "var(--text-muted)",
};
const FALLBACK = mulherEspiralProduct;

/* ── Skeleton helpers ── */
function Sk({ w = "100%", h = "14px", r = "8px", style }: {
  w?: string; h?: string; r?: string; style?: React.CSSProperties;
}) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

const DashboardCourseSkeleton = memo(function DashboardCourseSkeleton() {
  return (
    <div className="course-card" style={{ pointerEvents: "none" }}>
      <Sk h="clamp(160px,28vw,220px)" r="var(--r-xl) var(--r-xl) 0 0" />
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Sk w="120px" h="12px" />
          <Sk w="36px" h="12px" />
        </div>
        <Sk h="4px" r="100px" />
        <Sk w="68%" h="12px" />
      </div>
    </div>
  );
});

const CommunitySkeletonList = memo(function CommunitySkeletonList() {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {[1,2,3,4].map((i) => (
        <div key={i} style={{ padding: "13px 0", borderBottom: i < 4 ? "1px solid var(--border-subtle)" : "none", display: "flex", gap: "12px" }}>
          <Sk w="8px" h="8px" r="50%" style={{ marginTop: "6px", flexShrink: 0 }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", gap: "8px" }}><Sk w="80px" h="11px" /><Sk w="28px" h="11px" /></div>
            <Sk h="15px" />
            <Sk w="52%" h="12px" />
            <div style={{ display: "flex", gap: "12px" }}><Sk w="30px" h="11px" /><Sk w="30px" h="11px" /></div>
          </div>
        </div>
      ))}
    </div>
  );
});

export default function DashboardPage() {
  const { user } = useAuth();
  const [products,  setProducts]  = useState<ProductWithProgress[]>([]);
  const [posts,     setPosts]     = useState<CommunityPost[]>([]);
  const [totalDone, setTotalDone] = useState(0);
  const [loadingP,  setLoadingP]  = useState(true);
  const [loadingC,  setLoadingC]  = useState(true);

  /* ── Parallel data fetching ── */
  useEffect(() => {
    if (!user) return;

    const fetchCourses = async () => {
      setLoadingP(true);
      const { data: owned } = await supabase
        .from("user_products")
        .select(`product_id, products(id, slug, title, subtitle, thumbnail_url, modules(id, lessons(id)))`)
        .eq("user_id", user.id);

      if (!owned || owned.length === 0) { setLoadingP(false); return; }

      const allLessonIds = owned.flatMap((row: Record<string, unknown>) => {
        const p = row.products as { modules: { lessons: { id: string }[] }[] } | null;
        return (p?.modules ?? []).flatMap((m) => m.lessons.map((l) => l.id));
      });

      let completedSet = new Set<string>();
      if (allLessonIds.length > 0) {
        const { data: progress } = await supabase
          .from("lesson_progress").select("lesson_id")
          .eq("user_id", user.id).eq("completed", true).in("lesson_id", allLessonIds);
        completedSet = new Set((progress ?? []).map((r: { lesson_id: string }) => r.lesson_id));
      }

      const valid = owned.map((row: Record<string, unknown>) => {
        const p = row.products as { id: string; slug: string; title: string; subtitle: string | null; thumbnail_url: string | null; modules: { id: string; lessons: { id: string }[] }[] } | null;
        if (!p) return null;
        const lessonIds = (p.modules ?? []).flatMap((m) => m.lessons.map((l) => l.id));
        const totalLessons = lessonIds.length;
        const completedLessons = lessonIds.filter((id) => completedSet.has(id)).length;
        return { id: p.id, slug: p.slug, title: p.title, subtitle: p.subtitle, thumbnail_url: p.thumbnail_url, total_lessons: totalLessons, completed_lessons: completedLessons, progress_pct: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0 };
      }).filter(Boolean) as ProductWithProgress[];

      setProducts(valid);
      setTotalDone(valid.reduce((s, p) => s + p.completed_lessons, 0));
      setLoadingP(false);
    };

    const fetchPosts = async () => {
      setLoadingC(true);
      const { data } = await supabase.from("community_posts")
        .select("id, title, category, likes_count, comments_count, is_pinned, created_at, user_profiles(anonymous_name)")
        .eq("is_visible", true).order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false }).limit(4);
      setPosts((data as CommunityPost[] | null) ?? []);
      setLoadingC(false);
    };

    Promise.all([fetchCourses(), fetchPosts()]);
  }, [user]);

  const totalLessons = products.reduce((s, p) => s + p.total_lessons, 0);
  const overallPct   = progressPct(totalDone, totalLessons);
  const mainProduct  = products[0];
  const firstName    = user?.name?.split(" ")[0] ?? "";

  return (
    <DashboardLayout>
      <Helmet>
        <title>Início — Despertar Espiral</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div style={{ maxWidth: "760px", margin: "0 auto" }}>

        {/* ══ GREETING HERO ══ */}
        <div style={{
          padding: "clamp(20px,4vw,28px) clamp(16px,4vw,24px) clamp(16px,3vw,22px)",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-surface-2)",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: products.length > 0 ? "18px" : "0" }}>
            <div style={{ flex: 1 }}>
              <p className="overline" style={{ color: "var(--gold)", fontSize: "8px", marginBottom: "5px" }}>
                {greeting()}{firstName ? `, ${firstName}` : ""}
              </p>
              <h1 className="font-display" style={{
                fontSize: "clamp(24px,4.5vw,34px)", fontWeight: 300,
                color: "var(--text-primary)", lineHeight: 1.1, marginBottom: "10px",
              }}>
                Bem-vinda de volta.
              </h1>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: "7px",
                padding: "5px 12px", borderRadius: "100px",
                background: "rgba(164,158,208,0.08)", border: "1px solid rgba(164,158,208,0.18)",
              }}>
                <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: "rgba(164,158,208,0.20)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: "8px", color: "var(--lavender)", fontFamily: "Montserrat", fontWeight: 600 }}>
                    {user?.anonymous_name?.charAt(0) ?? "A"}
                  </span>
                </div>
                <span style={{ fontSize: "12px", color: "var(--lavender)" }}>
                  {user?.anonymous_name ?? "Convidada"}
                </span>
                <span style={{ fontSize: "10px", color: "var(--text-faint)" }}>na comunidade</span>
              </div>
            </div>

            {/* Avatar */}
            <div style={{
              width: "46px", height: "46px", borderRadius: "50%",
              background: "linear-gradient(135deg, rgba(198,168,112,0.20) 0%, rgba(198,168,112,0.08) 100%)",
              color: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "17px", fontFamily: "Montserrat", fontWeight: 600, flexShrink: 0,
              border: "2px solid rgba(198,168,112,0.22)",
              boxShadow: "0 4px 16px rgba(198,168,112,0.12)",
            }}>
              {user?.name?.charAt(0) ?? "U"}
            </div>
          </div>

          {/* Overall progress */}
          {products.length > 0 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Jornada geral</span>
                <span style={{ fontSize: "12px", color: "var(--gold)", fontFamily: "Montserrat", fontWeight: 600 }}>{overallPct}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${overallPct}%` }} />
              </div>
              <div style={{ display: "flex", gap: "clamp(12px,3vw,20px)", marginTop: "12px", flexWrap: "wrap" }}>
                {[
                  { icon: CheckCircle2, val: totalDone,       lbl: "concluídas" },
                  { icon: BookOpen,     val: totalLessons,    lbl: "no total" },
                  { icon: TrendingUp,   val: products.length, lbl: products.length === 1 ? "curso" : "cursos" },
                ].map(({ icon: Icon, val, lbl }) => (
                  <div key={lbl} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <Icon size={12} style={{ color: "var(--gold)" }} strokeWidth={1.5} />
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      <strong style={{ color: "var(--text-primary)", fontWeight: 500 }}>{val}</strong>{" "}{lbl}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ══ COURSE SECTION ══ */}
        <div style={{ padding: "clamp(16px,3vw,22px) clamp(16px,4vw,24px) 0" }}>

          {/* Context card */}
          {mainProduct && !loadingP && (
            <div className="flow-card" style={{ padding: "13px 15px", marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "5px" }}>
                <span className="step-chip">01</span>
                <p className="font-label" style={{ fontSize: "9px", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--gold)" }}>
                  Próximo passo da sua jornada
                </p>
              </div>
              <p className="reading-note" style={{ margin: 0, fontSize: "13px" }}>
                Retome <strong style={{ color: "var(--text-primary)", fontWeight: 500 }}>{mainProduct.title}</strong> e avance mais uma aula para manter seu ritmo com leveza.
              </p>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <p className="overline" style={{ color: "var(--gold)", fontSize: "8px" }}>Continuar assistindo</p>
            <Link to="/products" className="font-label"
              style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-muted)", textDecoration: "none", transition: "color 0.2s", minHeight: "36px" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--gold)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-muted)")}
            >
              Ver todos <ArrowRight size={10} />
            </Link>
          </div>

          {loadingP ? (
            <DashboardCourseSkeleton />
          ) : mainProduct ? (
            /* Featured course hero card */
            <Link to={`/products/${mainProduct.slug}`} className="course-card" style={{ display: "block", textDecoration: "none", marginBottom: "10px" }}>
              {/* Thumbnail */}
              <div style={{ position: "relative", height: "clamp(160px,28vw,220px)", overflow: "hidden" }}>
                <img
                  className="thumb-img"
                  src={mainProduct.thumbnail_url || FALLBACK}
                  alt={mainProduct.title}
                  loading="lazy" decoding="async"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(11,13,28,0.96) 0%, rgba(11,13,28,0.18) 58%, transparent 100%)" }} />

                {/* Play button */}
                <div style={{
                  position: "absolute", bottom: "14px", right: "14px",
                  width: "48px", height: "48px", borderRadius: "50%",
                  background: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 6px 24px rgba(198,168,112,0.55)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}>
                  <Play size={17} fill="#0b0d1c" style={{ color: "#0b0d1c", marginLeft: "2px" }} />
                </div>

                {/* Title overlay */}
                <div style={{ position: "absolute", bottom: "14px", left: "14px", right: "76px" }}>
                  {mainProduct.subtitle && (
                    <span className="badge-rose" style={{ fontSize: "8px", marginBottom: "7px", display: "inline-flex" }}>
                      {mainProduct.subtitle}
                    </span>
                  )}
                  <h2 className="font-display" style={{ fontSize: "clamp(20px,4vw,28px)", fontWeight: 300, color: "#f8f5ee", lineHeight: 1.12 }}>
                    {mainProduct.title}
                  </h2>
                </div>
              </div>

              {/* Progress footer */}
              <div style={{ padding: "12px 15px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    {mainProduct.completed_lessons} de {mainProduct.total_lessons} aulas
                  </span>
                  <span style={{
                    fontSize: "12px", color: mainProduct.progress_pct === 100 ? "var(--sage)" : "var(--gold)",
                    fontFamily: "Montserrat", fontWeight: 600,
                  }}>
                    {mainProduct.progress_pct}%
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className={`progress-bar-fill${mainProduct.progress_pct === 100 ? " sage" : ""}`}
                    style={{ width: `${mainProduct.progress_pct}%` }}
                  />
                </div>
                {mainProduct.progress_pct < 100 && (
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "9px", lineHeight: 1.6 }}>
                    Continue de onde parou para manter consistência sem sobrecarga.
                  </p>
                )}
                {mainProduct.progress_pct === 100 && (
                  <p style={{ fontSize: "12px", color: "var(--sage)", marginTop: "9px", lineHeight: 1.6, display: "flex", alignItems: "center", gap: "5px" }}>
                    <CheckCircle2 size={12} strokeWidth={2} /> Curso concluído! Acesse seu certificado.
                  </p>
                )}
              </div>
            </Link>
          ) : !loadingP ? (
            /* Empty state */
            <div className="card-dark" style={{ padding: "clamp(28px,6vw,48px) clamp(20px,4vw,32px)", textAlign: "center" }}>
              <div style={{ width: "54px", height: "54px", borderRadius: "50%", background: "rgba(198,168,112,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                <BookOpen size={22} style={{ color: "var(--gold)" }} strokeWidth={1.5} />
              </div>
              <p className="font-display" style={{ fontSize: "22px", fontWeight: 300, color: "var(--text-primary)", marginBottom: "8px" }}>
                Inicie sua jornada
              </p>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.75, marginBottom: "20px" }}>
                Adquira um curso e desperte o que está dentro de você.
              </p>
              <Link to="/checkout/mulher-espiral" className="btn-gold" style={{ fontSize: "9px", padding: "12px 28px" }}>
                Conhecer cursos <ArrowRight size={13} />
              </Link>
            </div>
          ) : null}

          {/* Other products — compact rows */}
          {products.length > 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
              {products.slice(1).map((p) => (
                <Link key={p.id} to={`/products/${p.slug}`} className="course-card" style={{ display: "flex", gap: "12px", padding: "11px 13px", alignItems: "center", textDecoration: "none", borderRadius: "14px" }}>
                  <div style={{ width: "50px", height: "50px", borderRadius: "10px", overflow: "hidden", flexShrink: 0 }}>
                    <img className="thumb-img" src={p.thumbnail_url || FALLBACK} alt={p.title} loading="lazy" decoding="async" width="50" height="50" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500, marginBottom: "5px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.title}</p>
                    <div className="progress-bar thin" style={{ marginBottom: "4px" }}>
                      <div className="progress-bar-fill" style={{ width: `${p.progress_pct}%` }} />
                    </div>
                    <p style={{ fontSize: "11px", color: "var(--text-faint)" }}>{p.completed_lessons}/{p.total_lessons} aulas · {p.progress_pct}%</p>
                  </div>
                  <Clock size={12} style={{ color: "var(--gold)", flexShrink: 0 }} strokeWidth={1.5} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ══ COMMUNITY PULSE ══ */}
        <div style={{ padding: "clamp(20px,3vw,26px) clamp(16px,4vw,24px) 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <p className="overline" style={{ color: "var(--lavender)", fontSize: "8px" }}>Pulso da comunidade</p>
            <Link to="/community" className="font-label"
              style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-muted)", textDecoration: "none", transition: "color 0.2s", minHeight: "36px" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--lavender)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-muted)")}
            >
              Ver tudo <ArrowRight size={10} />
            </Link>
          </div>

          {loadingC ? (
            <CommunitySkeletonList />
          ) : posts.length === 0 ? (
            <div className="card-dark" style={{ padding: "clamp(24px,4vw,36px) clamp(16px,3vw,24px)", textAlign: "center" }}>
              <p style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.75, marginBottom: "14px" }}>
                Nenhum post ainda. Seja a primeira.
              </p>
              <Link to="/community" className="btn-ghost" style={{ fontSize: "9px" }}>Ir para a comunidade</Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {posts.map((post, i) => (
                <Link key={post.id} to={`/community/topic/${post.id}`} style={{ textDecoration: "none" }}>
                  <div
                    className="post-article"
                    style={{
                      padding: "13px 0",
                      borderBottom: i < posts.length - 1 ? "1px solid var(--border-subtle)" : "none",
                      display: "flex", gap: "12px", alignItems: "flex-start",
                    }}
                  >
                    {/* Category dot */}
                    <div style={{
                      width: "7px", height: "7px", borderRadius: "50%",
                      background: CAT_COLOR[post.category] ?? "var(--lavender)",
                      flexShrink: 0, marginTop: "7px",
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px", flexWrap: "wrap" }}>
                        {post.is_pinned && <Flame size={9} style={{ color: "var(--gold)" }} />}
                        <span style={{ fontSize: "11px", color: "var(--lavender)", fontWeight: 500 }}>
                          {post.user_profiles?.anonymous_name ?? "Anônima"}
                        </span>
                        <span style={{ fontSize: "10px", color: "var(--text-faint)" }}>·</span>
                        <span style={{ fontSize: "10px", color: "var(--text-faint)" }}>{timeAgo(post.created_at)}</span>
                      </div>
                      <p style={{
                        fontSize: "14px", color: "var(--text-primary)", lineHeight: 1.5,
                        marginBottom: "5px", fontWeight: 400,
                        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                      }}>
                        {post.title}
                      </p>
                      <div style={{ display: "flex", gap: "12px" }}>
                        <span style={{ fontSize: "11px", color: "var(--text-faint)", display: "flex", alignItems: "center", gap: "4px" }}>
                          ♡ {post.likes_count}
                        </span>
                        <span style={{ fontSize: "11px", color: "var(--text-faint)", display: "flex", alignItems: "center", gap: "4px" }}>
                          <MessageSquare size={9} /> {post.comments_count}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
              <Link to="/community" className="btn-ghost"
                style={{ display: "flex", width: "100%", justifyContent: "center", fontSize: "9px", marginTop: "12px" }}>
                Ver mais da comunidade
              </Link>
            </div>
          )}
        </div>

        {/* ══ UPSELL — if no products ══ */}
        {!loadingP && products.length === 0 && (
          <div style={{ padding: "clamp(16px,3vw,20px) clamp(16px,4vw,24px) clamp(24px,4vw,32px)" }}>
            <div style={{
              borderRadius: "20px", padding: "clamp(24px,5vw,36px) clamp(20px,4vw,28px)",
              background: "linear-gradient(135deg, rgba(198,168,112,0.08) 0%, rgba(172,128,142,0.05) 100%)",
              border: "1px solid var(--border-soft)", textAlign: "center",
            }}>
              <p className="overline" style={{ color: "var(--gold)", marginBottom: "10px", fontSize: "8px" }}>Comece agora</p>
              <h2 className="font-display" style={{ fontSize: "clamp(22px,4vw,32px)", fontWeight: 300, color: "var(--text-primary)", marginBottom: "10px", lineHeight: 1.15 }}>
                Você chegou até aqui por um motivo.
              </h2>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.82, marginBottom: "24px", maxWidth: "380px", margin: "0 auto 24px" }}>
                O Mulher Espiral tem 8 módulos de autoconhecimento profundo esperando por você.
              </p>
              <Link to="/checkout/mulher-espiral" className="btn-gold" style={{ width: "100%", justifyContent: "center", fontSize: "10px" }}>
                Quero começar <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}

        <div style={{ height: "8px" }} />
      </div>
    </DashboardLayout>
  );
}
