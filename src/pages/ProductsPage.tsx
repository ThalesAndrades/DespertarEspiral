/**
 * ProductsPage — Mobile-first, full-width cards, real Supabase data
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Lock, Play, ArrowRight, BookOpen, Clock, CheckCircle } from "lucide-react";

interface Product {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  price: number;
  original_price: number | null;
  thumbnail_url: string | null;
  total_modules: number;
  total_lessons: number;
  completed_lessons: number;
  progress_pct: number;
  has_access: boolean;
}

const FALLBACK = "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80&auto=format";

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px" }}>
      <div style={{ width: "24px", height: "24px", borderRadius: "50%", border: "2px solid var(--border-subtle)", borderTopColor: "var(--gold)", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function ProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);

      // 1. All products with nested modules → lessons (single query)
      const { data: allProducts } = await supabase
        .from("products")
        .select(`
          id, slug, title, subtitle, description, price, original_price, thumbnail_url,
          modules(id, lessons(id))
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      // 2. User owned products
      const { data: owned } = await supabase
        .from("user_products")
        .select("product_id")
        .eq("user_id", user.id);

      const ownedIds = new Set((owned ?? []).map((r: { product_id: string }) => r.product_id));

      // 3. All lesson progress in one shot
      const allLessonIds = (allProducts ?? []).flatMap((p: Record<string, unknown>) =>
        ((p.modules as { lessons: { id: string }[] }[]) ?? []).flatMap((m) => m.lessons.map((l) => l.id))
      );
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

      const results: Product[] = (allProducts ?? []).map((p: Record<string, unknown>) => {
        const mods = (p.modules as { id: string; lessons: { id: string }[] }[]) ?? [];
        const lessonIds = mods.flatMap((m) => m.lessons.map((l) => l.id));
        const totalLessons = lessonIds.length;
        const completed = ownedIds.has(p.id as string) ? lessonIds.filter((id) => completedSet.has(id)).length : 0;
        return {
          id: p.id as string,
          slug: p.slug as string,
          title: p.title as string,
          subtitle: p.subtitle as string | null,
          description: p.description as string | null,
          price: p.price as number,
          original_price: p.original_price as number | null,
          thumbnail_url: p.thumbnail_url as string | null,
          total_modules: mods.length,
          total_lessons: totalLessons,
          completed_lessons: completed,
          progress_pct: totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0,
          has_access: ownedIds.has(p.id as string),
        };
      });

      setProducts(results);
      setLoading(false);
    })();
  }, [user]);

  return (
    <DashboardLayout>
      <div style={{ maxWidth: "820px", margin: "0 auto", padding: "clamp(20px,4vw,32px) clamp(14px,4vw,24px)" }}>

        {/* Header */}
        <div style={{ marginBottom: "clamp(20px,3vw,28px)" }}>
          <p className="overline" style={{ color: "var(--gold)", marginBottom: "6px" }}>Biblioteca</p>
          <h1 className="font-display" style={{ fontSize: "clamp(26px,4vw,40px)", fontWeight: 300, color: "var(--text-primary)" }}>
            Meus Cursos
          </h1>
        </div>

        {loading ? (
          <Spinner />
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
          <div style={{ display: "flex", flexDirection: "column", gap: "clamp(12px,2vw,16px)" }}>
            {products.map((product) => (
              <div key={product.id} className="card-dark" style={{ overflow: "hidden", opacity: product.has_access ? 1 : 0.88 }}>

                {/* Thumbnail */}
                <div style={{ position: "relative", height: "clamp(180px,30vw,240px)", overflow: "hidden" }}>
                  <img
                    src={product.thumbnail_url || FALLBACK}
                    alt={product.title}
                    loading="lazy" decoding="async"
                    width="820" height="240"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.5s ease" }}
                    onMouseEnter={(e) => product.has_access && ((e.currentTarget as HTMLImageElement).style.transform = "scale(1.03)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLImageElement).style.transform = "scale(1)")}
                  />
                  {/* Gradient */}
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(11,13,28,0.95) 0%, rgba(11,13,28,0.15) 55%, transparent 100%)" }} />

                  {/* Lock overlay */}
                  {!product.has_access && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(11,13,28,0.55)", backdropFilter: "blur(2px)" }}>
                      <div style={{ textAlign: "center" }}>
                        <Lock size={24} style={{ color: "var(--gold)", margin: "0 auto 8px" }} strokeWidth={1.5} />
                        <p className="font-label" style={{ fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold)" }}>Sem acesso</p>
                      </div>
                    </div>
                  )}

                  {/* Badges */}
                  <div style={{ position: "absolute", top: "12px", left: "14px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {product.subtitle && <span className="badge-rose" style={{ fontSize: "8px" }}>{product.subtitle}</span>}
                    {product.has_access && product.progress_pct === 100 && <span className="badge-sage" style={{ fontSize: "8px" }}>Concluído</span>}
                  </div>

                  {/* Bottom title overlay */}
                  <div style={{ position: "absolute", bottom: "14px", left: "14px", right: "14px" }}>
                    <h3 className="font-display" style={{ fontSize: "clamp(20px,3.5vw,28px)", fontWeight: 300, lineHeight: 1.1, color: "#f8f5ee" }}>
                      {product.title}
                    </h3>
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
                <div style={{ padding: "clamp(14px,3vw,20px) clamp(14px,3vw,20px)" }}>
                  {product.has_access ? (
                    <>
                      {/* Progress */}
                      <div style={{ marginBottom: "clamp(12px,2vw,16px)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <CheckCircle size={11} style={{ color: product.progress_pct === 100 ? "var(--sage)" : "var(--text-faint)" }} strokeWidth={2} />
                            <span className="font-label" style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: "0.15em", textTransform: "uppercase" }}>Progresso</span>
                          </div>
                          <span className="font-label" style={{ fontSize: "10px", color: "var(--gold)" }}>
                            {product.completed_lessons}/{product.total_lessons} · {product.progress_pct}%
                          </span>
                        </div>
                        <div className="progress-bar" style={{ height: "4px" }}>
                          <div className="progress-bar-fill" style={{ width: `${product.progress_pct}%` }} />
                        </div>
                      </div>
                      <Link to={`/products/${product.slug}`} className="btn-gold" style={{ width: "100%", justifyContent: "center", fontSize: "9px", borderRadius: "14px" }}>
                        <Play size={13} fill="#0b0d1c" style={{ color: "#0b0d1c" }} />
                        {product.progress_pct > 0 ? "Continuar" : "Começar"}
                      </Link>
                    </>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                      <div>
                        <p className="font-label" style={{ fontSize: "8px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: "4px" }}>Investimento</p>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                          <p className="font-display" style={{ fontSize: "clamp(24px,3vw,30px)", color: "var(--gold)", fontWeight: 300, lineHeight: 1 }}>
                            R$ {product.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                          {product.original_price && (
                            <p style={{ fontSize: "12px", color: "var(--text-faint)", textDecoration: "line-through" }}>
                              R$ {product.original_price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </p>
                          )}
                        </div>
                      </div>
                      <Link to={`/checkout/${product.slug}`} className="btn-gold" style={{ fontSize: "9px", padding: "11px 22px", borderRadius: "14px" }}>
                        Adquirir <ArrowRight size={13} />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
