/**
 * AdminLayout — Apple-quality admin layout
 * Mobile: sticky header + slide-up drawer + bottom quick-nav
 * Desktop: fixed sidebar + breadcrumb
 */
import { useState, useCallback, useEffect } from "react";
import { Link, useLocation, useNavigate, Navigate } from "react-router-dom";
import SpiralLogo from "./SpiralLogo";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard, BookOpen, Users, ShoppingBag,
  MessageSquare, LogOut, X, ChevronRight,
  ArrowLeft, Shield, Menu, Instagram, BarChart2,
  Trello, Megaphone, TrendingUp,
} from "lucide-react";

interface NavItem { label: string; icon: React.ElementType; href: string; }

const adminNav: NavItem[] = [
  { label: "Painel",     icon: LayoutDashboard, href: "/admin" },
  { label: "Usuários",   icon: Users,           href: "/admin/users" },
  { label: "Produtos",   icon: BookOpen,        href: "/admin/products" },
  { label: "Pedidos",    icon: ShoppingBag,     href: "/admin/orders" },
  { label: "Comunidade", icon: MessageSquare,   href: "/admin/community" },
];

const marketingNav: NavItem[] = [
  { label: "Redes Sociais", icon: Instagram,   href: "/admin/social" },
  { label: "CRM & Automação", icon: Megaphone, href: "/admin/crm" },
  { label: "Funil Eventos",  icon: TrendingUp, href: "/admin/events" },
  { label: "Projetos",      icon: Trello,      href: "/admin/media" },
  { label: "Anúncios",      icon: BarChart2,   href: "/admin/traffic" },
];

function isActive(href: string, pathname: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

function AdminSidebar({ onClose }: { onClose?: () => void }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = useCallback(() => { logout(); navigate("/"); }, [logout, navigate]);

  return (
    <aside style={{
      display: "flex", flexDirection: "column", height: "100%",
      background: "var(--bg-base)",
      borderRight: "1px solid var(--border-subtle)",
      transition: "background 0.35s ease",
    }}>
      <div style={{ padding: "22px 18px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link to="/" onClick={onClose} style={{ textDecoration: "none" }}>
          <SpiralLogo variant="dark" size={26} autoTheme />
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <ThemeToggle size="sm" />
          {onClose && (
            <button
              onClick={onClose}
              style={{
                padding: "6px", color: "var(--text-muted)", background: "transparent", border: "none",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                minWidth: "36px", minHeight: "36px", borderRadius: "8px",
                transition: "background 0.15s",
              }}
              aria-label="Fechar menu"
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      {/* Admin identity */}
      <div style={{ padding: "0 14px 18px" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "12px 14px",
          background: "rgba(198,168,112,0.07)",
          border: "1px solid rgba(198,168,112,0.16)",
          borderRadius: "12px",
        }}>
          <div style={{
            width: "34px", height: "34px", borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(198,168,112,0.28), rgba(198,168,112,0.10))",
            border: "1px solid rgba(198,168,112,0.28)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Shield size={13} style={{ color: "var(--gold)" }} strokeWidth={1.5} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: "12px", color: "var(--text-primary)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {user?.name ?? "Admin"}
            </p>
            <span className="badge-gold" style={{ fontSize: "7px", padding: "2px 8px", marginTop: "3px", display: "inline-flex" }}>ADMIN</span>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: "0 10px", display: "flex", flexDirection: "column", gap: "2px", overflowY: "auto" }} className="scrollbar-thin">
        {adminNav.map(({ label, icon: Icon, href }) => {
          const active = isActive(href, location.pathname);
          return (
            <Link
              key={href} to={href} onClick={onClose}
              className={`sidebar-link ${active ? "active" : ""}`}
              style={{ textDecoration: "none" }}
            >
              <Icon size={15} strokeWidth={active ? 2 : 1.5} />
              <span style={{ fontSize: "14px" }}>{label}</span>
              {active && <ChevronRight size={11} style={{ marginLeft: "auto", color: "var(--gold)", opacity: 0.5 }} />}
            </Link>
          );
        })}
        {/* ─── Marketing ─── */}
        <div style={{ margin: "10px 4px 4px", display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ flex: 1, height: "1px", background: "var(--border-subtle)" }} />
          <span className="font-label" style={{ fontSize: "7px", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--text-faint)", whiteSpace: "nowrap" }}>Marketing</span>
          <div style={{ flex: 1, height: "1px", background: "var(--border-subtle)" }} />
        </div>
        {marketingNav.map(({ label, icon: Icon, href }) => {
          const active = isActive(href, location.pathname);
          return (
            <Link
              key={href} to={href} onClick={onClose}
              className={`sidebar-link ${active ? "active" : ""}`}
              style={{ textDecoration: "none" }}
            >
              <Icon size={15} strokeWidth={active ? 2 : 1.5} />
              <span style={{ fontSize: "14px" }}>{label}</span>
              {active && <ChevronRight size={11} style={{ marginLeft: "auto", color: "var(--gold)", opacity: 0.5 }} />}
            </Link>
          );
        })}
      </nav>

      <div style={{ margin: "6px 14px", height: "1px", background: "var(--border-subtle)" }} />

      <div style={{ padding: "0 10px 8px", display: "flex", flexDirection: "column", gap: "2px" }}>
        <Link to="/dashboard" onClick={onClose} className="sidebar-link" style={{ textDecoration: "none" }}>
          <ArrowLeft size={15} strokeWidth={1.5} />
          <span style={{ fontSize: "14px" }}>Área do Membro</span>
        </Link>
        <button onClick={handleLogout} className="sidebar-link">
          <LogOut size={15} strokeWidth={1.5} />
          <span style={{ fontSize: "14px" }}>Sair</span>
        </button>
      </div>

      <div style={{ padding: "6px 18px 20px" }}>
        <p style={{ fontSize: "11px", color: "var(--text-faint)", wordBreak: "break-all", lineHeight: 1.5 }}>
          {user?.email}
        </p>
      </div>
    </aside>
  );
}

/* ── Mobile bottom quick-nav ── */
function AdminBottomNav() {
  const location = useLocation();

  return (
    <nav
      aria-label="Navegação admin"
      className="md:hidden"
      style={{
        position: "fixed",
        bottom: 0, left: 0, right: 0,
        background: "var(--bg-base)",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid var(--border-subtle)",
        display: "flex", alignItems: "stretch",
        height: "calc(58px + env(safe-area-inset-bottom, 0px))",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        zIndex: 150,
      }}
    >
      {[...adminNav, ...marketingNav].map(({ label, icon: Icon, href }) => {
        const active = isActive(href, location.pathname);
        return (
          <Link
            key={href} to={href}
            style={{
              flex: 1,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: "3px",
              textDecoration: "none",
              color: active ? "var(--gold)" : "var(--text-faint)",
              transition: "color 0.16s",
              position: "relative",
              fontSize: "8px",
            }}
            aria-current={active ? "page" : undefined}
          >
            {active && (
              <span style={{
                position: "absolute", top: 0, left: "15%", right: "15%",
                height: "2px", background: "var(--gold)",
                borderRadius: "0 0 3px 3px",
              }} />
            )}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: "36px", height: "26px", borderRadius: "10px",
              background: active ? "rgba(198,168,112,0.10)" : "transparent",
              transition: "background 0.18s",
            }}>
              <Icon size={17} strokeWidth={active ? 2 : 1.5} />
            </div>
            <span style={{ fontFamily: "Montserrat, sans-serif", fontSize: "7px", letterSpacing: "0.10em", textTransform: "uppercase", fontWeight: active ? 600 : 400 }}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, loading } = useAuth();

  // Defense-in-depth: block non-admins at the layout level even if the route
  // guard is bypassed. Wait for auth hydration before deciding.
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.role !== "admin") return <Navigate to="/dashboard" replace />;

  const titles: Record<string, string> = {
    "/admin":           "Painel",
    "/admin/users":     "Usuários",
    "/admin/products":  "Produtos",
    "/admin/orders":    "Pedidos",
    "/admin/community": "Comunidade",
    "/admin/social":    "Redes Sociais",
    "/admin/crm":       "CRM & Automação",
    "/admin/media":     "Projetos",
    "/admin/traffic":   "Anúncios",
    "/admin/events":    "Funil Eventos",
  };
  const currentTitle = Object.entries(titles).find(([p]) => isActive(p, location.pathname))?.[1] ?? "Admin";

  return (
    <div style={{ display: "flex", height: "100dvh", overflow: "hidden", background: "var(--bg-surface)", transition: "background 0.35s ease" }}>

      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col" style={{ width: "212px", flexShrink: 0 }}>
        <AdminSidebar />
      </div>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 250, display: "flex" }} className="md:hidden">
          <div
            className="sheet-enter"
            style={{ width: "268px", display: "flex", flexDirection: "column", boxShadow: "8px 0 48px rgba(0,0,0,0.45)" }}
          >
            <AdminSidebar onClose={() => setSidebarOpen(false)} />
          </div>
          <div
            style={{ flex: 1, background: "rgba(4,6,15,0.65)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
            onClick={() => setSidebarOpen(false)}
          />
        </div>
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* Mobile top bar */}
        <header className="md:hidden" style={{
          height: "56px", display: "flex", alignItems: "center",
          justifyContent: "space-between", padding: "0 16px",
          background: "var(--bg-base)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--border-subtle)",
          flexShrink: 0, transition: "background 0.35s ease",
          position: "sticky", top: 0, zIndex: 100,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              style={{
                width: "44px", height: "44px", color: "var(--gold)", background: "rgba(198,168,112,0.08)",
                border: "1px solid rgba(198,168,112,0.16)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: "12px", transition: "background 0.15s",
                flexShrink: 0,
              }}
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu size={18} strokeWidth={1.5} />
            </button>
            <div style={{ height: "18px", width: "1px", background: "var(--border-soft)", borderRadius: "1px" }} />
            <span className="font-label" style={{ fontSize: "9px", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--gold)" }}>
              {currentTitle}
            </span>
          </div>
          <ThemeToggle size="sm" />
        </header>

        {/* Desktop breadcrumb */}
        <div className="hidden md:flex" style={{
          height: "46px", alignItems: "center", justifyContent: "space-between",
          padding: "0 28px",
          background: "var(--bg-base)",
          borderBottom: "1px solid var(--border-subtle)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Shield size={10} style={{ color: "var(--gold)" }} strokeWidth={1.5} />
            <span className="font-label" style={{ fontSize: "8px", letterSpacing: "0.20em", textTransform: "uppercase", color: "var(--text-faint)" }}>Admin</span>
            <span style={{ color: "var(--border-mid)", margin: "0 2px", fontSize: "12px" }}>›</span>
            <span className="font-label" style={{ fontSize: "8px", letterSpacing: "0.20em", textTransform: "uppercase", color: "var(--gold)" }}>{currentTitle}</span>
          </div>
        </div>

        <main className="scrollbar-thin scroll-momentum" style={{ flex: 1, overflowY: "auto", background: "var(--bg-surface)", transition: "background 0.35s ease" }}>
          <div
            className="pb-20 md:pb-0"
            style={{ maxWidth: "1100px", margin: "0 auto", padding: "clamp(16px,3vw,32px) clamp(14px,3vw,28px)" }}
          >
            {children}
          </div>
        </main>
      </div>

      <AdminBottomNav />
    </div>
  );
}
