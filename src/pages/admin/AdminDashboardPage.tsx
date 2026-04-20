/**
 * AdminDashboardPage — Painel geral da administração
 * Dados reais do Supabase: pedidos, alunos, produtos, receita
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/lib/supabase";
import {
  Users, ShoppingBag, BookOpen, TrendingUp,
  CheckCircle, Clock, AlertCircle, ArrowRight,
  Package, MessageSquare,
} from "lucide-react";

interface DashStats {
  totalMembers: number;
  paidOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  totalProducts: number;
  totalPosts: number;
}

interface RecentOrder {
  id: string;
  email: string;
  amount: number;
  status: string;
  created_at: string;
  products?: { title: string };
}

const statCard = (label: string, value: string | number, icon: React.ElementType, color: string) => {
  const Icon = icon;
  return (
    <div className="card-dark" style={{ padding: "clamp(16px,2.5vw,22px)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <p className="font-label" style={{ fontSize: "8px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-faint)" }}>{label}</p>
        <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={14} style={{ color }} strokeWidth={1.5} />
        </div>
      </div>
      <p className="font-display" style={{ fontSize: "clamp(24px,3vw,32px)", color: "var(--text-primary)", fontWeight: 300, lineHeight: 1 }}>
        {value}
      </p>
    </div>
  );
};

export default function AdminDashboardPage() {
  const [stats, setStats]   = useState<DashStats>({ totalMembers: 0, paidOrders: 0, pendingOrders: 0, totalRevenue: 0, totalProducts: 0, totalPosts: 0 });
  const [orders, setOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("user_profiles").select("id", { count: "exact", head: true }).eq("role", "member"),
      supabase.from("orders").select("id,status,amount,email,created_at,product_id,products(title)").order("created_at", { ascending: false }).limit(10),
      supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("community_posts").select("id", { count: "exact", head: true }).eq("is_visible", true),
      supabase.from("orders").select("amount", { count: "exact" }).eq("status", "paid"),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ])
      .then(([members, ordersRes, products, posts, paidTotals, pendingCount]) => {
        const recent = (ordersRes.data ?? []) as RecentOrder[];
        const paidRows = (paidTotals.data ?? []) as { amount: number | string }[];
        const revenue = paidRows.reduce((s, o) => s + Number(o.amount), 0);

        setStats({
          totalMembers:  members.count ?? 0,
          paidOrders:    paidTotals.count ?? paidRows.length,
          pendingOrders: pendingCount.count ?? 0,
          totalRevenue:  revenue,
          totalProducts: products.count ?? 0,
          totalPosts:    posts.count ?? 0,
        });
        setOrders(recent.slice(0, 8));
      })
      .finally(() => setLoading(false));
  }, []);

  const statusBadge = (status: string) => {
    if (status === "paid")    return <span className="badge-sage"     style={{ fontSize: "8px" }}>PAGO</span>;
    if (status === "pending") return <span className="badge-lavender" style={{ fontSize: "8px" }}>PENDENTE</span>;
    return                           <span className="badge-rose"     style={{ fontSize: "8px" }}>FALHOU</span>;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px" }}>
          <div style={{ width: "32px", height: "32px", border: "2px solid var(--border-soft)", borderTopColor: "var(--gold)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* ── Header ── */}
      <div style={{ marginBottom: "clamp(24px,4vw,36px)" }}>
        <p className="overline" style={{ color: "var(--gold)", marginBottom: "8px" }}>Visão geral</p>
        <h1 className="font-display" style={{ fontSize: "clamp(28px,4vw,40px)", fontWeight: 300, color: "var(--text-primary)" }}>
          Painel Geral
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-muted)", marginTop: "6px" }}>
          Bem-vinda, Sunyan. Aqui está o resumo da plataforma.
        </p>
      </div>

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3" style={{ gap: "clamp(10px,2vw,16px)", marginBottom: "clamp(24px,4vw,36px)" }}>
        {statCard("Membros ativos",      stats.totalMembers,  Users,        "var(--lavender)")}
        {statCard("Pedidos pagos",       stats.paidOrders,    CheckCircle,  "var(--sage)")}
        {statCard("Aguardando pagamento",stats.pendingOrders, Clock,        "var(--gold)")}
        {statCard("Receita total",       `R$ ${stats.totalRevenue.toLocaleString("pt-BR",{minimumFractionDigits:2})}`, TrendingUp, "var(--rose)")}
        {statCard("Produtos ativos",     stats.totalProducts, Package,      "var(--gold)")}
        {statCard("Posts na comunidade", stats.totalPosts,    MessageSquare,"var(--lavender)")}
      </div>

      {/* ── Quick links ── */}
      <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: "10px", marginBottom: "clamp(24px,4vw,36px)" }}>
        {[
          { label: "Usuários",   href: "/admin/users",     icon: Users,       badge: stats.totalMembers },
          { label: "Produtos",   href: "/admin/products",  icon: BookOpen,    badge: stats.totalProducts },
          { label: "Pedidos",    href: "/admin/orders",    icon: ShoppingBag, badge: stats.pendingOrders > 0 ? `${stats.pendingOrders} pend.` : "Ver" },
          { label: "Comunidade", href: "/admin/community", icon: MessageSquare, badge: "Moderar" },
        ].map(({ label, href, icon: Icon, badge }) => (
          <Link key={href} to={href} style={{ textDecoration: "none" }}>
            <div className="card-dark" style={{ padding: "16px", display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", transition: "border-color 0.2s" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(198,168,112,0.10)", border: "1px solid var(--border-soft)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={15} style={{ color: "var(--gold)" }} strokeWidth={1.5} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>{label}</p>
                <p className="font-label" style={{ fontSize: "9px", color: "var(--text-faint)", letterSpacing: "0.1em" }}>{String(badge)}</p>
              </div>
              <ArrowRight size={12} style={{ color: "var(--text-faint)", flexShrink: 0 }} />
            </div>
          </Link>
        ))}
      </div>

      {/* ── Recent orders ── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
          <h2 className="font-label" style={{ fontSize: "9px", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--gold)" }}>
            Pedidos recentes
          </h2>
          <Link to="/admin/orders" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "5px" }}>
            <span className="font-label" style={{ fontSize: "9px", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text-muted)" }}>Ver todos</span>
            <ArrowRight size={10} style={{ color: "var(--text-muted)" }} />
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="card-dark" style={{ padding: "40px", textAlign: "center" }}>
            <AlertCircle size={28} style={{ color: "var(--text-faint)", margin: "0 auto 12px" }} strokeWidth={1.5} />
            <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>Nenhum pedido ainda</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="card-dark hidden md:block" style={{ overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      {["E-mail", "Produto", "Valor", "Status", "Data"].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: "14px 18px", fontSize: "8px", fontFamily: "Montserrat,sans-serif", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-faint)", fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o, i) => (
                      <tr key={o.id} style={{ borderBottom: i < orders.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                        <td style={{ padding: "14px 18px", fontSize: "13px", color: "var(--text-primary)" }}>{o.email}</td>
                        <td style={{ padding: "14px 18px", fontSize: "12px", color: "var(--text-secondary)" }}>
                          {(o as { products?: { title: string } }).products?.title ?? "—"}
                        </td>
                        <td style={{ padding: "14px 18px", fontSize: "14px", color: "var(--gold)", fontFamily: "Cormorant Garamond,serif", fontWeight: 300 }}>
                          R$ {Number(o.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: "14px 18px" }}>{statusBadge(o.status)}</td>
                        <td style={{ padding: "14px 18px", fontSize: "11px", color: "var(--text-faint)" }}>
                          {new Date(o.created_at).toLocaleDateString("pt-BR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile: card list */}
            <div className="md:hidden" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {orders.map((o) => (
                <div key={o.id} className="card-dark" style={{ padding: "16px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px", marginBottom: "10px" }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.email}</p>
                      <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                        {(o as { products?: { title: string } }).products?.title ?? "—"}
                      </p>
                    </div>
                    {statusBadge(o.status)}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <p className="font-display" style={{ fontSize: "18px", color: "var(--gold)", fontWeight: 300 }}>
                      R$ {Number(o.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="font-label" style={{ fontSize: "9px", color: "var(--text-faint)", letterSpacing: "0.1em" }}>
                      {new Date(o.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </AdminLayout>
  );
}
