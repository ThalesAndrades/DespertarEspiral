/**
 * DashboardPage — Mobile-first immersive member home
 * Features: hero progress bar, scroll-snap course carousel, community pulse
 * Performance: Promise.all parallel fetches, localStorage cache hydration
 */
import { useEffect, useState, memo, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import mulherEspiralProduct from "@/assets/mulher-espiral-hero-new.jpg";
import {
  ArrowRight, Play, MessageSquare, BookOpen, TrendingUp,
  Flame, CheckCircle2, Award, Sparkles,
} from "lucide-react";
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

const CourseCardSkeleton = memo(function CourseCardSkeleton() {
  return (
    <div style={{
      width: "clamp(240px, 68vw, 300px)",
      background: "var(--card-bg)",
      borderRadius: "var(--r-xl)",
      border: "1px solid var(--border-subtle)",
      overflow: "hidden",
      flexShrink: 0,
    }}>
      <Sk h="clamp(140px,32vw,180px)" r="var(--r-xl) var(--r-xl) 0 0" />
      <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Sk w="110px" h="12px" /><Sk w="34px" h="12px" />
        </div>
        <Sk h="4px" r="100px" />
        <Sk w="66%" h="12px" />
      </div>
    </div>
  );
});

const CommunitySkeletonList = memo(function CommunitySkeletonList() {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {[1,2,3,4].map((i) => (
        <div key={i} style={{ padding: "14px 0", borderBottom: i < 4 ? "1px solid var(--border-subtle)" : "none", display: "flex", gap: "12px" }}>
          <Sk w="7px" h="7px" r="50%" style={{ marginTop: "7px", flexShrink: 0 }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", gap: "8px" }}><Sk w="80px" h="11px" /><Sk w="26px" h="11px" /></div>
            <Sk h="15px" />
            <Sk w="54%" h="11px" />
            <div style={{ display: "flex", gap: "12px" }}><Sk w="30px" h="11px" /><Sk w="30px" h="11px" /></div>
          </div>
        </div>
      ))}
    </div>
  );
});

/* ── Snap-scroll dot indicators ── */
function SnapDots({ count, activeIndex }: { count: number; activeIndex: number }) {
  if (count <= 1) return null;
  return (
    <div className="snap-dots">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`snap-dot${i === activeIndex ? " active" : ""}`} />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [products,  setProducts]  = useState<ProductWithProgress[]>([]);
  const [posts,     setPosts]     = useState<CommunityPost[]>([]);
  const [totalDone, setTotalDone] = useState(0);
  const [loadingP,  setLoadingP]  = useState(true);
  const [loadingC,  setLoadingC]  = useState(true);
  const [activeSnap, setActiveSnap] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

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
        const p = row.products as {
          id: string; slug: string; title: string; subtitle: string | null;
          thumbnail_url: string | null;
          modules: { id: string; lessons: { id: string }[] }[]
        } | null;
        if (!p) return null;
        const lessonIds = (p.modules ?? []).flatMap((m) => m.lessons.map((l) => l.id));
        const totalLessons = lessonIds.length;
        const completedLessons = lessonIds.filter((id) => completedSet.has(id)).length;
        return {
          id: p.id, slug: p.slug, title: p.title, subtitle: p.subtitle,
          thumbnail_url: p.thumbnail_url, total_lessons: totalLessons,
          completed_lessons: completedLessons,
          progress_pct: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
        };
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
        .order("created_at", { ascending: false }).limit(5);
      setPosts((data as CommunityPost[] | null) ?? []);
      setLoadingC(false);
    };

    Promise.all([fetchCourses(), fetchPosts()]);
  }, [user]);

  /* ── Track snap position ── */
  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const onScroll = () => {
      const cardWidth = el.firstElementChild ? (el.firstElementChild as HTMLElement).offsetWidth + 12 : 260;
      setActiveSnap(Math.round(el.scrollLeft / cardWidth));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [products]);

  const totalLessons = products.reduce((s, p) => s + p.total_lessons, 0);
  const overallPct   = progressPct(totalDone, totalLessons);
  const firstName    = user?.name?.split(" ")[0] ?? "";

  return (
    <DashboardLayout>
      <Helmet>
        <title>Início — Despertar Espiral</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div style={{ maxWidth: "780px", margin: "0 auto" }}>

        {/* ══ IMMERSIVE GREETING HERO ══ */}
        <div style={{
          padding: "clamp(22px,4vw,32px) clamp(16px,4vw,24px) clamp(18px,3vw,24px)",
          borderBottom: "1px solid var(--border-subtle)",
          background: "linear-gradient(180deg, var(--bg-surface-2) 0%, var(--bg-surface) 100%)",
          position: "relative", overflow: "hidden",
        }}>
          {/* Decorative spiral */}
          <svg aria-hidden="true" style={{ position: "absolute", right: "-20px", top: "-20px", opacity: 0.04, pointerEvents: "none" }} width="180" height="180" viewBox="0 0 600 600" fill="none">
            <path d="M300 550C120 550 50 420 50 300C50 165 155 65 285 65C395 65 480 152 480 262C480 355 410 420 320 420C245 420 185 360 185 286C185 220 237 170 303 170C362 170 408 216 408 275C408 327 370 362 320 362C277 362 245 330 245 288C245 252 273 226 308 226C340 226 365 251 365 283C365 312 343 333 315 333"
              stroke="var(--gold)" strokeWidth="12" strokeLinecap="round" fill="none" />
          </svg>

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "18px" }}>
            <div style={{ flex: 1 }}>
              <p className="overline" style={{ color: "var(--gold)", fontSize: "8px", marginBottom: "5px" }}>
                {greeting()}{firstName ? `, ${firstName}` : ""}
              </p>
              <h1 className="font-display" style={{
                fontSize: "clamp(26px,5vw,38px)", fontWeight: 300,
                color: "var(--text-primary)", lineHeight: 1.08, marginBottom: "10px",
              }}>
                Bem-vinda de volta.
              </h1>

              {/* Anonymous identity */}
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
                <span style={{ fontSize: "12px", color: "var(--lavender)" }}>{user?.anonymous_name ?? "Convidada"}</span>
                <span style={{ fontSize: "10px", color: "var(--text-faint)" }}>na comunidade</span>
              </div>
            </div>

            {/* Avatar */}
            <div style={{
              width: "48px", height: "48px", borderRadius: "50%",
              background: "linear-gradient(135deg, rgba(198,168,112,0.22) 0%, rgba(198,168,112,0.08) 100%)",
              color: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "18px", fontFamily: "Montserrat", fontWeight: 600, flexShrink: 0,
              border: "2px solid rgba(198,168,112,0.24)",
              boxShadow: "0 4px 20px rgba(198,168,112,0.15)",
            }}>
              {user?.name?.charAt(0) ?? "U"}
            </div>
          </div>

          {/* Overall progress */}
          {products.length > 0 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Jornada geral</span>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {overallPct === 100 && <Sparkles size={11} style={{ color: "var(--gold)" }} />}
                  <span style={{ fontSize: "12px", color: "var(--gold)", fontFamily: "Montserrat", fontWeight: 600 }}>{overallPct}%</span>
                </div>
              </div>
              <div className="progress-bar thick" style={{ marginBottom: "12px" }}>
                <div className={`progress-bar-fill${overallPct === 100 ? " sage" : ""}`} style={{ width: `${overallPct}%` }} />
              </div>
              <div style={{ display: "flex", gap: "clamp(14px,3vw,22px)", flexWrap: "wrap" }}>
                {[
                  { icon: CheckCircle2, val: totalDone,       lbl: "concluídas" },
                  { icon: BookOpen,     val: totalLessons,    lbl: "no total" },
                  { icon: TrendingUp,   val: products.length, lbl: products.length === 1 ? "curso" : "cursos" },
                ].map(({ icon: Icon, val, lbl }) => (
                  <div key={lbl} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <Icon size={12} style={{ color: "var(--gold)" }} strokeWidth={1.5} />
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      <strong style={{ color: "var(--text-primary)", fontWeight: 600 }}>{val}</strong>{" "}{lbl}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ══ COURSE CAROUSEL ══ */}
        <div style={{ paddingTop: "clamp(18px,3vw,24px)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 clamp(16px,4vw,24px)", marginBottom: "clamp(10px,2vw,14px)" }}>
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
            /* Skeleton carousel */
            <div className="snap-x-carousel">
              <CourseCardSkeleton /><CourseCardSkeleton />
            </div>
          ) : products.length > 0 ? (
            <>
              {/* Scroll-snap carousel */}
              <div ref={carouselRef} className="snap-x-carousel">
                {products.map((p) => (
                  <Link
                    key={p.id}
                    to={`/products/${p.slug}`}
                    className="course-card"
                    style={{
                      width: "clamp(240px, 72vw, 300px)",
                      textDecoration: "none",
                      display: "block",
                    }}
                  >
                    {/* Thumbnail */}
                    <div style={{ position: "relative", height: "clamp(140px,32vw,180px)", overflow: "hidden" }}>
                      <img
                        className="thumb-img"
                        src={p.thumbnail_url || FALLBACK}
                        alt={p.title}
                        loading="lazy" decoding="async"
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(11,13,28,0.96) 0%, rgba(11,13,28,0.10) 55%, transparent 100%)" }} />

                      {/* Play chip */}
                      <div style={{
                        position: "absolute", bottom: "10px", right: "10px",
                        width: "40px", height: "40px", borderRadius: "50%",
                        background: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 4px 18px rgba(198,168,112,0.50)",
                      }}>
                        <Play size={14} fill="#0b0d1c" style={{ color: "#0b0d1c", marginLeft: "2px" }} />
                      </div>

                      {/* Title overlay */}
                      <div style={{ position: "absolute", bottom: "10px", left: "10px", right: "58px" }}>
                        <h2 className="font-display" style={{ fontSize: "clamp(15px,3.5vw,20px)", fontWeight: 300, color: "#f8f5ee", lineHeight: 1.15 }}>
                          {p.title}
                        </h2>
                      </div>
                    </div>

                    {/* Progress footer */}
                    <div style={{ padding: "10px 12px 13px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                          {p.completed_lessons}/{p.total_lessons} aulas
                        </span>
                        <span style={{
                          fontSize: "11px", fontFamily: "Montserrat", fontWeight: 600,
                          color: p.progress_pct === 100 ? "var(--sage)" : "var(--gold)",
                        }}>
                          {p.progress_pct === 100 ? "✓ Concluído" : `${p.progress_pct}%`}
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div className={`progress-bar-fill${p.progress_pct === 100 ? " sage" : ""}`} style={{ width: `${p.progress_pct}%` }} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              <SnapDots count={products.length} activeIndex={activeSnap} />
            </>
          ) : (
            /* Empty state */
            <div style={{ padding: "0 clamp(16px,4vw,24px)" }}>
              <div className="hero-card-immersive" style={{ cursor: "default", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "clamp(32px,6vw,48px) clamp(20px,4vw,28px)" }}>
                <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: "rgba(198,168,112,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
                  <BookOpen size={24} style={{ color: "var(--gold)" }} strokeWidth={1.5} />
                </div>
                <p className="font-display" style={{ fontSize: "24px", fontWeight: 300, color: "var(--text-primary)", marginBottom: "8px" }}>Inicie sua jornada</p>
                <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.75, marginBottom: "22px", maxWidth: "320px" }}>
                  Adquira um curso e desperte o que está dentro de você.
                </p>
                <Link to="/checkout/mulher-espiral" className="btn-gold" style={{ fontSize: "9px", padding: "12px 28px" }}>
                  Conhecer cursos <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ══ ACHIEVEMENT STRIP — completed courses ══ */}
        {products.some((p) => p.progress_pct === 100) && (
          <div style={{ padding: "clamp(16px,3vw,20px) clamp(16px,4vw,24px) 0" }}>
            {products.filter((p) => p.progress_pct === 100).map((p) => (
              <Link key={p.id} to={`/products/${p.slug}/certificado`} className="achievement-banner" style={{ display: "flex", textDecoration: "none", marginBottom: "8px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(198,168,112,0.10)", border: "1px solid rgba(198,168,112,0.28)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Award size={18} style={{ color: "var(--gold)" }} strokeWidth={1.3} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "13px", color: "var(--gold)", fontWeight: 600, marginBottom: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {p.title}
                  </p>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>Ver certificado de conclusão</p>
                </div>
                <ArrowRight size={14} style={{ color: "var(--gold)", flexShrink: 0 }} />
              </Link>
            ))}
          </div>
        )}

        {/* ══ COMMUNITY PULSE ══ */}
        <div style={{ padding: "clamp(20px,3vw,28px) clamp(16px,4vw,24px) 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "clamp(10px,2vw,14px)" }}>
            <div className="section-label-live">Comunidade ativa</div>
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
            <>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {posts.map((post, i) => (
                  <Link key={post.id} to={`/community/topic/${post.id}`} style={{ textDecoration: "none" }}>
                    <div
                      className="post-article"
                      style={{
                        padding: "clamp(12px,2vw,15px) 0",
                        borderBottom: i < posts.length - 1 ? "1px solid var(--border-subtle)" : "none",
                        display: "flex", gap: "12px", alignItems: "flex-start",
                      }}
                    >
                      {/* Category dot */}
                      <div style={{
                        width: "7px", height: "7px", borderRadius: "50%",
                        background: CAT_COLOR[post.category] ?? "var(--lavender)",
                        flexShrink: 0, marginTop: "8px",
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
                          fontSize: "14px", color: "var(--text-primary)", lineHeight: 1.45, marginBottom: "5px", fontWeight: 500,
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
              </div>
              <Link to="/community" className="btn-ghost"
                style={{ display: "flex", width: "100%", justifyContent: "center", fontSize: "9px", marginTop: "clamp(10px,2vw,14px)" }}>
                Ver toda a comunidade
              </Link>
            </>
          )}
        </div>

        {/* ══ UPSELL — if no products ══ */}
        {!loadingP && products.length === 0 && (
          <div style={{ padding: "clamp(16px,3vw,20px) clamp(16px,4vw,24px) clamp(24px,4vw,32px)" }}>
            <div style={{
              borderRadius: "22px", padding: "clamp(28px,5vw,40px) clamp(20px,4vw,28px)",
              background: "linear-gradient(135deg, rgba(198,168,112,0.08) 0%, rgba(172,128,142,0.05) 100%)",
              border: "1px solid var(--border-soft)", textAlign: "center",
              position: "relative", overflow: "hidden",
            }}>
              {/* Decorative */}
              <svg aria-hidden="true" style={{ position: "absolute", bottom: "-30px", right: "-30px", opacity: 0.06, pointerEvents: "none" }} width="140" height="140" viewBox="0 0 600 600" fill="none">
                <path d="M300 550C120 550 50 420 50 300C50 165 155 65 285 65C395 65 480 152 480 262C480 355 410 420 320 420C245 420 185 360 185 286C185 220 237 170 303 170C362 170 408 216 408 275C408 327 370 362 320 362C277 362 245 330 245 288C245 252 273 226 308 226C340 226 365 251 365 283C365 312 343 333 315 333"
                  stroke="var(--gold)" strokeWidth="14" strokeLinecap="round" fill="none" />
              </svg>
              <p className="overline" style={{ color: "var(--gold)", marginBottom: "10px", fontSize: "8px" }}>Comece agora</p>
              <h2 className="font-display" style={{ fontSize: "clamp(24px,4vw,34px)", fontWeight: 300, color: "var(--text-primary)", marginBottom: "10px", lineHeight: 1.12 }}>
                Você chegou até aqui por um motivo.
              </h2>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.82, marginBottom: "24px", maxWidth: "360px", margin: "0 auto 24px" }}>
                O Mulher Espiral tem 8 módulos de autoconhecimento esperando por você.
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
