/**
 * ProductsPage — My Courses library
 * Mobile-first: course cards with thumbnail, progress bar, clear CTAs
 * Performance: batch queries with Promise.all
 */
import { useEffect, useState, memo } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import MulherEspiralMark from "@/components/layout/MulherEspiralMark";
import { Lock, Play, ArrowRight, BookOpen, Clock, CheckCircle } from "lucide-react";
import mulherEspiralCover from "@/assets/mulher-espiral-cover.svg";

interface Product {
  id: string; slug: string; title: string; subtitle: string | null;
  description: string | null; price: number; original_price: number | null;
  thumbnail_url: string | null; total_modules: number; total_lessons: number;
  completed_lessons: number; progress_pct: number; has_access: boolean;
}

const FALLBACK = mulherEspiralCover;

/* ── Skeleton ── */
function Sk({ w = "100%", h = "14px", r = "8px", style }: {
  w?: string; h?: string; r?: string; style?: React.CSSProperties;
}) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

const ProductCardSkeleton = memo(function ProductCardSkeleton() {
  return (
    <div className="course-card" style={{ pointerEvents: "none" }}>
      <Sk h="clamp(180px,30vw,240px)" r="var(--r-xl) var(--r-xl) 0 0" />
      <div style={{ padding: "clamp(14px,3vw,20px)", display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <Sk w="100px" h="10px" /><Sk w="70px" h="10px" />
          </div>
          <Sk w="36px" h="10px" />
        </div>
        <Sk h="4px" r="100px" />
        <Sk w="58%" h="38px" r="100px" />
      </div>
    </div>
  );
});

export default function ProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);

      const [allProductsRes, ownedRes] = await Promise.all([
        supabase.from("products")
          .select("id, slug, title, subtitle, description, price, original_price, thumbnail_url, modules(id, lessons(id))")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase.from("user_products").select("product_id").eq("user_id", user.id),
      ]);

      const allProducts = allProductsRes.data ?? [];
      const ownedIds = new Set((ownedRes.data ?? []).map((r: { product_id: string }) => r.product_id));

      const allLessonIds = allProducts.flatMap((p: Record<string, unknown>) =>
        ((p.modules as { lessons: { id: string }[] }[]) ?? []).flatMap((m) => m.lessons.map((l) => l.id))
      );

      let completedSet = new Set<string>();
      if (allLessonIds.length > 0) {
        const { data: progress } = await supabase
          .from("lesson_progress").select("lesson_id")
          .eq("user_id", user.id).eq("completed", true).in("lesson_id", allLessonIds);
        completedSet = new Set((progress ?? []).map((r: { lesson_id: string }) => r.lesson_id));
      }

      const results: Product[] = allProducts.map((p: Record<string, unknown>) => {
        const mods = (p.modules as { id: string; lessons: { id: string }[] }[]) ?? [];
        const lessonIds = mods.flatMap((m) => m.lessons.map((l) => l.id));
        const totalLessons = lessonIds.length;
        const hasAccess = ownedIds.has(p.id as string);
        const completed = hasAccess ? lessonIds.filter((id) => completedSet.has(id)).length : 0;
        return {
          id: p.id as string, slug: p.slug as string, title: p.title as string,
          subtitle: p.subtitle as string | null, description: p.description as string | null,
          price: p.price as number, original_price: p.original_price as number | null,
          thumbnail_url: p.thumbnail_url as string | null,
          total_modules: mods.length, total_lessons: totalLessons, completed_lessons: completed,
          progress_pct: totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0,
          has_access: hasAccess,
        };
      });

      setProducts(results);
      setLoading(false);
    })();
  }, [user]);

  /* Separate owned from not-owned for better visual hierarchy */
  const ownedProducts  = products.filter((p) => p.has_access);
  const lockedProducts = products.filter((p) => !p.has_access);

  return (
    <DashboardLayout>
      <Helmet>
        <title>Meus Cursos — Despertar Espiral</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div style={{ maxWidth: "820px", margin: "0 auto", padding: "clamp(20px,4vw,32px) clamp(14px,4vw,24px)" }}>

        {/* Header */}
        <div style={{ marginBottom: "clamp(20px,3vw,28px)" }}>
          <p className="overline" style={{ color: "var(--gold)", marginBottom: "6px" }}>Biblioteca</p>
          <h1 className="font-display" style={{ fontSize: "clamp(26px,4vw,40px)", fontWeight: 300, color: "var(--text-primary)" }}>
            Meus Cursos
          </h1>
          {!loading && ownedProducts.length > 0 && (
            <div className="flow-card" style={{ padding: "13px 15px", marginTop: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "5px" }}>
                <span className="step-chip">02</span>
                <p className="font-label" style={{ fontSize: "9px", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--gold)" }}>
                  Escolha com clareza
                </p>
              </div>
              <p className="reading-note" style={{ margin: 0, fontSize: "13px" }}>
                Os cursos com acesso liberado mostram seu progresso. Continue de onde parou com leveza e constância.
              </p>
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "clamp(12px,2vw,16px)" }}>
            <ProductCardSkeleton /><ProductCardSkeleton />
          </div>
        ) : products.length === 0 ? (
          <div className="card-dark" style={{ padding: "clamp(40px,8vw,72px) clamp(20px,4vw,32px)", textAlign: "center" }}>
            <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: "rgba(198,168,112,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto clamp(16px,3vw,24px)" }}>
              <BookOpen size={24} style={{ color: "var(--gold)" }} strokeWidth={1.5} />
            </div>
            <p className="font-display" style={{ fontSize: "clamp(20px,3vw,28px)", fontWeight: 300, color: "var(--text-primary)", marginBottom: "10px" }}>
              Nenhum curso disponível
            </p>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.78, marginBottom: "24px" }}>
              Em breve novas jornadas estarão disponíveis.
            </p>
            <Link to="/dashboard" className="btn-ghost" style={{ fontSize: "9px" }}>
              ← Voltar ao dashboard
            </Link>
          </div>
        ) : (
          <>
            {/* Owned courses */}
            {ownedProducts.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "clamp(12px,2vw,16px)", marginBottom: lockedProducts.length > 0 ? "clamp(24px,4vw,36px)" : 0 }}>
                {ownedProducts.map((product) => (
                  <Link
                    key={product.id}
                    to={`/products/${product.slug}`}
                    className="course-card"
                    style={{ textDecoration: "none" }}
                  >
                    {/* Thumbnail */}
                    <div style={{ position: "relative", height: "clamp(180px,30vw,240px)", overflow: "hidden" }}>
                      <img
                        className="thumb-img"
                        src={product.slug === "mulher-espiral" ? mulherEspiralCover : (product.thumbnail_url || FALLBACK)}
                        alt={product.title}
                        loading="lazy" decoding="async"
                        width="820" height="240"
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(11,13,28,0.96) 0%, rgba(11,13,28,0.12) 58%, transparent 100%)" }} />

                      {/* Watermark badge */}
                      {product.slug === "mulher-espiral" && (
                        <div style={{
                          position: "absolute", right: "14px", top: "14px",
                          padding: "9px 12px", borderRadius: "14px",
                          background: "rgba(11,13,28,0.55)",
                          border: "1px solid rgba(198,168,112,0.22)",
                          backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                        }}>
                          <MulherEspiralMark size="sm" align="left" showSubtitle={false} />
                        </div>
                      )}

                      {/* Badges */}
                      <div style={{ position: "absolute", top: "12px", left: "14px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        {product.subtitle && <span className="badge-rose" style={{ fontSize: "8px" }}>{product.subtitle}</span>}
                        {product.progress_pct === 100 && <span className="badge-sage" style={{ fontSize: "8px" }}>✓ Concluído</span>}
                      </div>

                      {/* Title overlay */}
                      <div style={{ position: "absolute", bottom: "14px", left: "14px", right: "14px" }}>
                        <h2 className="font-display" style={{ fontSize: "clamp(20px,3.5vw,28px)", fontWeight: 300, lineHeight: 1.1, color: "#f8f5ee" }}>
                          {product.title}
                        </h2>
                        <div style={{ display: "flex", gap: "14px", marginTop: "5px" }}>
                          <span style={{ fontSize: "9px", fontFamily: "Montserrat", color: "rgba(248,245,238,0.40)", letterSpacing: "0.1em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "4px" }}>
                            <BookOpen size={9} /> {product.total_modules} módulos
                          </span>
                          <span style={{ fontSize: "9px", fontFamily: "Montserrat", color: "rgba(248,245,238,0.40)", letterSpacing: "0.1em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "4px" }}>
                            <Clock size={9} /> {product.total_lessons} aulas
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div style={{ padding: "clamp(13px,2.5vw,18px) clamp(14px,3vw,20px)" }}>
                      {/* Progress */}
                      <div style={{ marginBottom: "clamp(12px,2vw,16px)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <CheckCircle
                              size={11}
                              style={{ color: product.progress_pct === 100 ? "var(--sage)" : "var(--text-faint)" }}
                              strokeWidth={2}
                            />
                            <span className="font-label" style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: "0.15em", textTransform: "uppercase" }}>Progresso</span>
                          </div>
                          <span className="font-label" style={{
                            fontSize: "10px",
                            color: product.progress_pct === 100 ? "var(--sage)" : "var(--gold)",
                          }}>
                            {product.completed_lessons}/{product.total_lessons} · {product.progress_pct}%
                          </span>
                        </div>
                        <div className="progress-bar thick">
                          <div
                            className={`progress-bar-fill${product.progress_pct === 100 ? " sage" : ""}`}
                            style={{ width: `${product.progress_pct}%` }}
                          />
                        </div>
                      </div>

                      <div className="btn-gold" style={{ width: "100%", justifyContent: "center", fontSize: "9px", borderRadius: "14px", display: "flex", alignItems: "center", gap: "7px" }}>
                        <Play size={13} fill="#0b0d1c" style={{ color: "#0b0d1c" }} />
                        {product.progress_pct === 100 ? "Ver certificado" : product.progress_pct > 0 ? "Continuar" : "Começar"}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Locked courses */}
            {lockedProducts.length > 0 && (
              <div>
                {ownedProducts.length > 0 && (
                  <div style={{ marginBottom: "16px" }}>
                    <p className="overline" style={{ color: "var(--text-faint)", fontSize: "8px" }}>Disponíveis para adquirir</p>
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: "clamp(12px,2vw,16px)" }}>
                  {lockedProducts.map((product) => (
                    <div key={product.id} className="course-card" style={{ opacity: 0.88 }}>
                      {/* Thumbnail */}
                      <div style={{ position: "relative", height: "clamp(160px,26vw,210px)", overflow: "hidden" }}>
                        <img
                          className="thumb-img"
                          src={product.slug === "mulher-espiral" ? mulherEspiralCover : (product.thumbnail_url || FALLBACK)}
                          alt={product.title}
                          loading="lazy" decoding="async"
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        />
                        <div style={{ position: "absolute", inset: 0, background: "rgba(11,13,28,0.60)", backdropFilter: "blur(2px)" }} />

                        {/* Lock indicator */}
                        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                          <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "rgba(198,168,112,0.15)", border: "1px solid rgba(198,168,112,0.30)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Lock size={18} style={{ color: "var(--gold)" }} strokeWidth={1.5} />
                          </div>
                          <p className="font-label" style={{ fontSize: "9px", letterSpacing: "0.20em", textTransform: "uppercase", color: "rgba(198,168,112,0.75)" }}>
                            Acesso necessário
                          </p>
                        </div>

                        {/* Title */}
                        <div style={{ position: "absolute", bottom: "12px", left: "14px", right: "14px" }}>
                          <h2 className="font-display" style={{ fontSize: "clamp(18px,3vw,24px)", fontWeight: 300, color: "rgba(248,245,232,0.75)", lineHeight: 1.15 }}>
                            {product.title}
                          </h2>
                        </div>
                      </div>

                      {/* Content */}
                      <div style={{ padding: "clamp(13px,2.5vw,18px) clamp(14px,3vw,20px)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                        <div>
                          <p className="font-label" style={{ fontSize: "8px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: "4px" }}>
                            Investimento
                          </p>
                          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                            <p className="font-display" style={{ fontSize: "clamp(22px,3vw,30px)", color: "var(--gold)", fontWeight: 300, lineHeight: 1 }}>
                              R$ {Number(product.price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </p>
                            {product.original_price && (
                              <p style={{ fontSize: "12px", color: "var(--text-faint)", textDecoration: "line-through" }}>
                                R$ {Number(product.original_price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </p>
                            )}
                          </div>
                        </div>
                        <Link to={`/checkout/${product.slug}`} className="btn-gold" style={{ fontSize: "9px", padding: "11px 22px", borderRadius: "14px" }}>
                          Adquirir <ArrowRight size={13} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
