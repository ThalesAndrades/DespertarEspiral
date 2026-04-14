/**
 * AdminLayout — Mobile-first admin layout
 * Mobile: top bar + slide-in drawer + bottom quick-nav
 * Desktop: fixed sidebar
 */
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import SpiralLogo from "./SpiralLogo";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard, BookOpen, Users, ShoppingBag,
  MessageSquare, LogOut, X, ChevronRight,
  ArrowLeft, Shield, Menu,
} from "lucide-react";

interface NavItem { label: string; icon: React.ElementType; href: string; }

const adminNav: NavItem[] = [
  { label: "Painel",     icon: LayoutDashboard, href: "/admin" },
  { label: "Usuários",   icon: Users,           href: "/admin/users" },
  { label: "Produtos",   icon: BookOpen,        href: "/admin/products" },
  { label: "Pedidos",    icon: ShoppingBag,     href: "/admin/orders" },
  { label: "Comunidade", icon: MessageSquare,   href: "/admin/community" },
];

function isActive(href: string, pathname: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

function AdminSidebar({ onClose }: { onClose?: () => void }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <aside style={{
      display: "flex", flexDirection: "column", height: "100%",
      background: "var(--bg-base)",
      borderRight: "1px solid var(--border-subtle)",
      transition: "background 0.4s ease",
    }}>
      {/* Header */}
      <div style={{ padding: "24px 20px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link to="/" onClick={onClose} style={{ textDecoration: "none" }}>
          <SpiralLogo variant="dark" size={26} autoTheme />
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <ThemeToggle size="sm" />
          {onClose && (
            <button
              onClick={onClose}
              style={{ padding: "6px", color: "var(--text-muted)", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", minWidth: "36px", minHeight: "36px" }}
              aria-label="Fechar menu"
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      {/* Admin identity */}
      <div style={{ padding: "0 16px 20px" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "12px 14px",
          background: "rgba(198,168,112,0.08)",
          border: "1px solid rgba(198,168,112,0.18)",
          borderRadius: "12px",
        }}>
          <div style={{
            width: "32px", height: "32px", borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(198,168,112,0.3), rgba(198,168,112,0.1))",
            border: "1px solid rgba(198,168,112,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
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

      {/* Nav */}
      <nav style={{ flex: 1, padding: "0 10px", display: "flex", flexDirection: "column", gap: "2px" }}>
        {adminNav.map(({ label, icon: Icon, href }) => {
          const active = isActive(href, location.pathname);
          return (
            <Link
              key={href}
              to={href}
              onClick={onClose}
              className={`sidebar-link ${active ? "active" : ""}`}
              style={{ textDecoration: "none" }}
            >
              <Icon size={15} strokeWidth={1.5} />
              <span style={{ fontSize: "14px" }}>{label}</span>
              {active && <ChevronRight size={11} style={{ marginLeft: "auto", color: "var(--gold)", opacity: 0.5 }} />}
            </Link>
          );
        })}
      </nav>

      <div style={{ margin: "8px 16px", height: "1px", background: "var(--border-subtle)" }} />

      <div style={{ padding: "0 10px 8px", display: "flex", flexDirection: "column", gap: "2px" }}>
        <Link to="/dashboard" onClick={onClose} className="sidebar-link" style={{ textDecoration: "none" }}>
          <ArrowLeft size={15} strokeWidth={1.5} />
          <span style={{ fontSize: "14px" }}>Área do Membro</span>
        </Link>
        <button onClick={() => { logout(); navigate("/"); }} className="sidebar-link">
          <LogOut size={15} strokeWidth={1.5} />
          <span style={{ fontSize: "14px" }}>Sair</span>
        </button>
      </div>

      <div style={{ padding: "8px 20px 20px" }}>
        <p className="font-label" style={{ fontSize: "9px", letterSpacing: "0.1em", color: "var(--text-faint)", wordBreak: "break-all" }}>
          {user?.email}
        </p>
      </div>
    </aside>
  );
}

/* ── Mobile bottom quick-nav for admin ── */
function AdminBottomNav() {
  const location = useLocation();
  const quickLinks = adminNav.slice(0, 5);

  return (
    <nav
      aria-label="Navegação admin"
      className="md:hidden"
      style={{
        position: "fixed",
        bottom: 0, left: 0, right: 0,
        background: "var(--bg-base)",
        borderTop: "1px solid var(--border-subtle)",
        display: "flex",
        alignItems: "stretch",
        height: "60px",
        zIndex: 150,
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {quickLinks.map(({ label, icon: Icon, href }) => {
        const active = isActive(href, location.pathname);
        return (
          <Link
            key={href}
            to={href}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "3px",
              textDecoration: "none",
              color: active ? "var(--gold)" : "var(--text-faint)",
              transition: "color 0.2s",
              position: "relative",
              fontSize: "8px",
            }}
            aria-current={active ? "page" : undefined}
          >
            {active && (
              <span style={{
                position: "absolute",
                top: 0, left: "15%", right: "15%",
                height: "2px",
                background: "var(--gold)",
                borderRadius: "0 0 4px 4px",
              }} />
            )}
            <Icon size={18} strokeWidth={active ? 2 : 1.5} />
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

  const titles: Record<string, string> = {
    "/admin":           "Painel",
    "/admin/users":     "Usuários",
    "/admin/products":  "Produtos",
    "/admin/orders":    "Pedidos",
    "/admin/community": "Comunidade",
  };
  const currentTitle = Object.entries(titles).find(([p]) => isActive(p, location.pathname))?.[1] ?? "Admin";

  return (
    <div style={{ display: "flex", height: "100dvh", overflow: "hidden", background: "var(--bg-surface)", transition: "background 0.4s ease" }}>

      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col" style={{ width: "212px", flexShrink: 0 }}>
        <AdminSidebar />
      </div>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 250, display: "flex" }} className="md:hidden">
          <div style={{ width: "260px", display: "flex", flexDirection: "column", boxShadow: "4px 0 40px rgba(0,0,0,0.4)" }}>
            <AdminSidebar onClose={() => setSidebarOpen(false)} />
          </div>
          <div
            style={{ flex: 1, background: "rgba(7,9,21,0.7)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
            onClick={() => setSidebarOpen(false)}
          />
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* Mobile top bar */}
        <header className="md:hidden" style={{
          height: "56px", display: "flex", alignItems: "center",
          justifyContent: "space-between", padding: "0 16px",
          background: "var(--bg-base)",
          borderBottom: "1px solid var(--border-subtle)",
          flexShrink: 0, transition: "background 0.4s ease",
          position: "sticky", top: 0, zIndex: 100,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              style={{ padding: "8px", color: "var(--gold)", background: "transparent", border: "none", cursor: "pointer", minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu size={20} strokeWidth={1.5} />
            </button>
            <div style={{ height: "16px", width: "1px", background: "var(--border-soft)" }} />
            <span className="font-label" style={{ fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold)" }}>
              Admin · {currentTitle}
            </span>
          </div>
          <ThemeToggle size="sm" />
        </header>

        {/* Desktop breadcrumb bar */}
        <div className="hidden md:flex" style={{
          height: "48px", alignItems: "center", justifyContent: "space-between",
          padding: "0 28px",
          background: "var(--bg-base)",
          borderBottom: "1px solid var(--border-subtle)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Shield size={11} style={{ color: "var(--gold)" }} strokeWidth={1.5} />
            <span className="font-label" style={{ fontSize: "8px", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text-faint)" }}>Painel Administrativo</span>
            <span style={{ color: "var(--border-mid)", margin: "0 4px", fontSize: "12px" }}>›</span>
            <span className="font-label" style={{ fontSize: "8px", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold)" }}>{currentTitle}</span>
          </div>
        </div>

        <main className="scrollbar-thin" style={{ flex: 1, overflowY: "auto", background: "var(--bg-surface)", transition: "background 0.4s ease" }}>
          <div
            className="pb-20 md:pb-0"
            style={{ maxWidth: "1100px", margin: "0 auto", padding: "clamp(16px,3vw,32px) clamp(14px,3vw,28px)" }}
          >
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom quick nav */}
      <AdminBottomNav />
    </div>
  );
}
