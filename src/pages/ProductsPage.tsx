/**
 * ProductsPage — Mobile-first course library
 * Mobile: scroll-snap horizontal featured + vertical list
 * Desktop: 2-col grid with hover animations
 * Polish: lock overlay, progress gradients, snap dots
 */
import { useEffect, useState, useRef } from "react";
import { Helmet } from "@/lib/helmet";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import mulherEspiralProduct from "@/assets/mulher-espiral-hero-new.jpg";
import {
  BookOpen, Play, CheckCircle, Lock, ArrowRight,
  Award, ChevronRight,
} from "lucide-react";

const FALLBACK = mulherEspiralProduct;

interface ProductCard {
  id: string; slug: string; title: string; subtitle: string | null;
  thumbnail_url: string | null; price: number;
  total_lessons: number; completed_lessons: number; progress_pct: number;
  has_access: boolean;
}

function Sk({ w = "100%", h = "14px", r = "8px", style }: {
  w?: string; h?: string; r?: string; style?: React.CSSProperties;
}) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: r, flexShrink: 0, ...style }} />;
}

function CardSkeleton() {
  return (
    <div className="card-dark" style={{ overflow: "hidden" }}>
      <Sk h="clamp(140px,28vw,200px)" r="var(--r-xl) var(--r-xl) 0 0" />
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Sk w="120px" h="12px" /><Sk w="36px" h="12px" />
        </div>
        <Sk h="4px" r="100px" />
        <Sk w="66%" h="12px" />
        <Sk w="120px" h="36px" r="100px" style={{ alignSelf: "flex-start" }} />
      </div>
    </div>
  );
}

function SnapDots({ count, activeIndex }: { count: number; activeIndex: number }) {
  if (count <= 1) return null;
  return (
    <div className="snap-dots" style={{ marginTop: "12px" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`snap-dot${i === activeIndex ? " active" : ""}`} />
      ))}
    </div>
  );
}

export default function ProductsPage() {
  const { user } = useAuth();
  const [myProducts,    setMyProducts]    = useState<ProductCard[]>([]);
  const [otherProducts, setOtherProducts] = useState<ProductCard[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [activeSnap,    setActiveSnap]    = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    (async () => {
      // Fetch all active products
      const { data: allProds } = await supabase
        .from("products")
        .select("id, slug, title, subtitle, thumbnail_url, price, modules(id, lessons(id))")
        .eq("is_active", true)
        .order("sort_order");

      // Fetch user's owned products
      const { data: owned } = await supabase
        .from("user_products")
        .select("product_id")
        .eq("user_id", user.id);

      const ownedIds = new Set((owned ?? []).map((r: { product_id: string }) => r.product_id));

      // Fetch lesson progress
      const allLessonIds = (allProds ?? []).flatMap((p: Record<string, unknown>) =>
        ((p.modules as { lessons: { id: string }[] }[]) ?? []).flatMap((m) => m.lessons.map((l) => l.id))
      );

      let completedSet = new Set<string>();
      if (allLessonIds.length > 0) {
        const { data: progress } = await supabase
          .from("lesson_progress").select("lesson_id")
          .eq("user_id", user.id).eq("completed", true).in("lesson_id", allLessonIds);
        completedSet = new Set((progress ?? []).map((r: { lesson_id: string }) => r.lesson_id));
      }

      const mapped = (allProds ?? []).map((p: Record<string, unknown>) => {
        const lessonIds = ((p.modules as { lessons: { id: string }[] }[]) ?? [])
          .flatMap((m) => m.lessons.map((l) => l.id));
        const total = lessonIds.length;
        const done = lessonIds.filter((id) => completedSet.has(id)).length;
        return {
          id: p.id as string,
          slug: p.slug as string,
          title: p.title as string,
          subtitle: p.subtitle as string | null,
          thumbnail_url: p.thumbnail_url as string | null,
          price: typeof p.price === "number" ? p.price : parseFloat(String(p.price) || "0"),
          total_lessons: total,
          completed_lessons: done,
          progress_pct: total > 0 ? Math.round((done / total) * 100) : 0,
          has_access: ownedIds.has(p.id as string),
        };
      });

      setMyProducts(mapped.filter((p) => p.has_access));
      setOtherProducts(mapped.filter((p) => !p.has_access));
      setLoading(false);
    })();
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
  }, [myProducts]);

  return (
    <DashboardLayout>
      <Helmet>
        <title>Meus Cursos — Despertar Espiral</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div style={{ maxWidth: "780px", margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ padding: "clamp(22px,4vw,30px) clamp(16px,4vw,24px) 0" }}>
          <p className="overline" style={{ color: "var(--gold)", marginBottom: "5px", fontSize: "8px" }}>Biblioteca</p>
          <h1 className="font-display" style={{ fontSize: "clamp(28px,5vw,42px)", fontWeight: 300, color: "var(--text-primary)", lineHeight: 1.08, marginBottom: "4px" }}>
            Meus Cursos
          </h1>
          {!loading && myProducts.length > 0 && (
            <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              {myProducts.length} {myProducts.length === 1 ? "curso" : "cursos"} na sua jornada
            </p>
          )}
        </div>

        {/* ── My Products ── */}
        <div style={{ marginTop: "clamp(16px,3vw,22px)" }}>
          {loading ? (
            <div style={{ padding: "0 clamp(16px,4vw,24px)", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "14px" }}>
              <CardSkeleton /><CardSkeleton />
            </div>
          ) : myProducts.length === 0 ? (
            /* Empty state — no courses */
            <div style={{ padding: "0 clamp(16px,4vw,24px)" }}>
              <div className="card-dark" style={{ padding: "clamp(32px,6vw,56px) clamp(24px,5vw,36px)", textAlign: "center" }}>
                <div style={{ width: "62px", height: "62px", borderRadius: "50%", background: "rgba(198,168,112,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
                  <BookOpen size={26} style={{ color: "var(--gold)" }} strokeWidth={1.5} />
                </div>
                <p className="font-display" style={{ fontSize: "24px", fontWeight: 300, color: "var(--text-primary)", marginBottom: "8px" }}>
                  Nenhum curso ainda
                </p>
                <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.82, marginBottom: "24px", maxWidth: "340px", margin: "0 auto 24px" }}>
                  Explore nossos cursos e inicie sua jornada de autoconhecimento.
                </p>
                <Link to="/checkout/mulher-espiral" className="btn-gold" style={{ fontSize: "10px" }}>
                  Conhecer cursos <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Mobile scroll-snap carousel */}
              <div className="md:hidden">
                <div ref={carouselRef} className="snap-x-carousel">
                  {myProducts.map((p) => (
                    <Link
                      key={p.id}
                      to={`/products/${p.slug}`}
                      className="course-card"
                      style={{ width: "clamp(240px, 78vw, 310px)", textDecoration: "none", display: "block" }}
                    >
                      {/* Thumbnail */}
                      <div style={{ position: "relative", height: "clamp(150px,34vw,200px)", overflow: "hidden" }}>
                        <img
                          className="thumb-img"
                          src={p.thumbnail_url || FALLBACK}
                          alt={p.title}
                          loading="lazy" decoding="async"
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        />
                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(11,13,28,0.96) 0%, rgba(11,13,28,0.12) 55%, transparent 100%)" }} />

                        {/* Status badge */}
                        <div style={{ position: "absolute", top: "10px", right: "10px" }}>
                          {p.progress_pct === 100 ? (
                            <span className="badge-sage" style={{ fontSize: "7.5px" }}><CheckCircle size={8} /> Concluído</span>
                          ) : p.progress_pct > 0 ? (
                            <span className="badge-gold" style={{ fontSize: "7.5px" }}>{p.progress_pct}%</span>
                          ) : null}
                        </div>

                        {/* Play button */}
                        <div style={{
                          position: "absolute", bottom: "10px", right: "10px",
                          width: "40px", height: "40px", borderRadius: "50%",
                          background: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center",
                          boxShadow: "0 4px 16px rgba(198,168,112,0.50)",
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

                      {/* Footer */}
                      <div style={{ padding: "10px 12px 13px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                            {p.completed_lessons}/{p.total_lessons} aulas
                          </span>
                          {p.progress_pct === 100 && (
                            <Link to={`/products/${p.slug}/certificado`} onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: "var(--sage)", textDecoration: "none" }}>
                              <Award size={11} /> Certificado
                            </Link>
                          )}
                        </div>
                        <div className="progress-bar">
                          <div className={`progress-bar-fill${p.progress_pct === 100 ? " sage" : ""}`} style={{ width: `${p.progress_pct}%` }} />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
                <SnapDots count={myProducts.length} activeIndex={activeSnap} />
              </div>

              {/* Desktop grid */}
              <div
                className="hidden md:grid"
                style={{
                  padding: "0 clamp(16px,4vw,24px)",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: "14px",
                }}
              >
                {myProducts.map((p) => (
                  <Link key={p.id} to={`/products/${p.slug}`} className="course-card" style={{ textDecoration: "none" }}>
                    <div style={{ position: "relative", height: "190px", overflow: "hidden" }}>
                      <img
                        className="thumb-img"
                        src={p.thumbnail_url || FALLBACK}
                        alt={p.title}
                        loading="lazy" decoding="async"
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(11,13,28,0.96) 0%, rgba(11,13,28,0.12) 55%, transparent 100%)" }} />
                      <div style={{ position: "absolute", bottom: "12px", left: "14px", right: "14px" }}>
                        {p.subtitle && <span className="badge-rose" style={{ marginBottom: "7px", fontSize: "7.5px" }}>{p.subtitle}</span>}
                        <h2 className="font-display" style={{ fontSize: "22px", fontWeight: 300, color: "#f8f5ee", lineHeight: 1.12 }}>{p.title}</h2>
                      </div>
                      {p.progress_pct === 100 && (
                        <span style={{ position: "absolute", top: "12px", right: "12px" }} className="badge-sage">{String.fromCharCode(10003)} Concluído</span>
                      )}
                    </div>
                    <div style={{ padding: "14px 16px 16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{p.completed_lessons} de {p.total_lessons} aulas</span>
                        <span style={{ fontSize: "12px", fontFamily: "Montserrat", fontWeight: 600, color: p.progress_pct === 100 ? "var(--sage)" : "var(--gold)" }}>{p.progress_pct}%</span>
                      </div>
                      <div className="progress-bar" style={{ marginBottom: "14px" }}>
                        <div className={`progress-bar-fill${p.progress_pct === 100 ? " sage" : ""}`} style={{ width: `${p.progress_pct}%` }} />
                      </div>
                      <span className="btn-gold" style={{ fontSize: "9px", padding: "11px 20px" }}>
                        {p.progress_pct === 0 ? "Começar" : p.progress_pct === 100 ? "Revisar" : "Continuar"} <ChevronRight size={12} />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Locked/Available Products ── */}
        {!loading && otherProducts.length > 0 && (
          <div style={{ padding: "clamp(28px,4vw,36px) clamp(16px,4vw,24px) 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "clamp(12px,2vw,16px)" }}>
              <Lock size={12} style={{ color: "var(--text-faint)" }} strokeWidth={1.5} />
              <p className="overline" style={{ color: "var(--text-faint)", fontSize: "8px" }}>Disponíveis para acesso</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {otherProducts.map((p) => (
                <div
                  key={p.id}
                  className="course-card"
                  style={{ position: "relative", display: "flex", gap: "12px", padding: "13px", alignItems: "center", opacity: 0.72 }}
                >
                  {/* Lock overlay */}
                  <div style={{ position: "relative", width: "56px", height: "56px", borderRadius: "12px", overflow: "hidden", flexShrink: 0 }}>
                    <img src={p.thumbnail_url || FALLBACK} alt={p.title} loading="lazy" decoding="async" width="56" height="56" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter: "grayscale(0.5)" }} />
                    <div style={{ position: "absolute", inset: 0, background: "rgba(7,9,21,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Lock size={14} style={{ color: "rgba(198,168,112,0.7)" }} strokeWidth={1.5} />
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "14px", color: "var(--text-primary)", fontWeight: 500, marginBottom: "3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.title}</p>
                    <p style={{ fontSize: "12px", color: "var(--text-faint)", fontFamily: "Montserrat" }}>
                      {p.total_lessons} aulas
                      {p.price > 0 ? ` · R$ ${p.price.toFixed(2).replace(".", ",")}` : ""}
                    </p>
                  </div>
                  <Link to={`/checkout/${p.slug}`} className="btn-outline-gold" style={{ padding: "9px 16px", fontSize: "8.5px", borderRadius: "12px", flexShrink: 0 }}>
                    Acessar
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ height: "clamp(24px,4vw,40px)" }} />
      </div>
    </DashboardLayout>
  );
}
