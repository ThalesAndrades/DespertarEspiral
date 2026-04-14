/**
 * DashboardLayout — Apple-quality mobile layout
 * Mobile: 52px sticky header + bottom tab bar (60px + safe area)
 * Desktop: 210px fixed sidebar + scrollable main
 */
import { useState, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import SpiralLogo from "./SpiralLogo";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { LayoutDashboard, BookOpen, Users, LogOut, ChevronRight, Shield } from "lucide-react";

interface NavItem { label: string; icon: React.ElementType; href: string; }

const memberNav: NavItem[] = [
  { label: "Início",     icon: LayoutDashboard, href: "/dashboard" },
  { label: "Cursos",     icon: BookOpen,        href: "/products"  },
  { label: "Comunidade", icon: Users,           href: "/community" },
];

function isActive(href: string, pathname: string) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  return pathname.startsWith(href);
}

/* ── Desktop Sidebar ── */
function Sidebar() {
  const location = useLocation();
  const navigate  = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = useCallback(() => { logout(); navigate("/"); }, [logout, navigate]);

  return (
    <aside style={{
      display: "flex", flexDirection: "column", height: "100%",
      background: "var(--sidebar-bg)",
      borderRight: "1px solid var(--border-subtle)",
      transition: "background 0.35s ease",
    }}>
      <div style={{ padding: "24px 20px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link to="/" style={{ textDecoration: "none" }}>
          <SpiralLogo variant="dark" size={28} autoTheme />
        </Link>
        <ThemeToggle size="sm" />
      </div>

      <nav style={{ flex: 1, padding: "0 10px", display: "flex", flexDirection: "column", gap: "2px" }}>
        {memberNav.map(({ label, icon: Icon, href }) => {
          const active = isActive(href, location.pathname);
          return (
            <Link key={href} to={href}
              className={`sidebar-link ${active ? "active" : ""}`}
              style={{ textDecoration: "none" }}>
              <Icon size={15} strokeWidth={active ? 2 : 1.5} />
              <span style={{ fontSize: "14px" }}>{label}</span>
              {active && <ChevronRight size={11} style={{ marginLeft: "auto", color: "var(--gold)", opacity: 0.5 }} />}
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: "10px", borderTop: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: "2px" }}>
        {user?.role === "admin" && (
          <Link to="/admin" className="sidebar-link" style={{ textDecoration: "none" }}>
            <Shield size={15} strokeWidth={1.5} />
            <span style={{ fontSize: "14px" }}>Painel Admin</span>
          </Link>
        )}
        <button onClick={handleLogout} className="sidebar-link">
          <LogOut size={15} strokeWidth={1.5} />
          <span style={{ fontSize: "14px" }}>Sair</span>
        </button>
      </div>

      {/* User badge */}
      <div style={{ padding: "10px 14px 20px" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "11px 12px", borderRadius: "12px",
          background: "rgba(198,168,112,0.05)",
          border: "1px solid var(--border-subtle)",
        }}>
          <div style={{
            width: "34px", height: "34px", borderRadius: "50%",
            background: "rgba(198,168,112,0.13)",
            color: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "12px", fontFamily: "Montserrat", fontWeight: 500, flexShrink: 0,
            border: "1px solid rgba(198,168,112,0.18)",
          }}>
            {user?.name?.charAt(0).toUpperCase() ?? "U"}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {user?.name}
            </p>
            <p className="font-label" style={{ fontSize: "9px", color: "var(--lavender)", letterSpacing: "0.10em", textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {user?.anonymous_name ?? user?.email?.split("@")[0]}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ── Mobile Bottom Tab Bar ── */
function BottomTabBar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = useCallback(() => { logout(); navigate("/"); }, [logout, navigate]);

  return (
    <>
      <nav
        aria-label="Navegação principal"
        className="md:hidden"
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          height: "calc(60px + env(safe-area-inset-bottom, 0px))",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          background: "var(--sidebar-bg)",
          borderTop: "1px solid var(--border-subtle)",
          display: "flex", alignItems: "stretch",
          zIndex: 150,
          /* Glassmorphism on mobile */
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        {memberNav.map(({ label, icon: Icon, href }) => {
          const active = isActive(href, location.pathname);
          return (
            <Link
              key={href}
              to={href}
              style={{
                flex: 1,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: "3px", textDecoration: "none",
                color: active ? "var(--gold)" : "var(--text-faint)",
                transition: "color 0.16s ease",
                position: "relative",
                minHeight: "60px",
              }}
              aria-current={active ? "page" : undefined}
            >
              {/* Active indicator — pill */}
              {active && (
                <span style={{
                  position: "absolute", top: 0, left: "20%", right: "20%",
                  height: "2px", background: "var(--gold)",
                  borderRadius: "0 0 3px 3px",
                }} />
              )}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: "40px", height: "28px", borderRadius: "12px",
                background: active ? "rgba(198,168,112,0.10)" : "transparent",
                transition: "background 0.2s ease",
              }}>
                <Icon size={20} strokeWidth={active ? 2 : 1.5} />
              </div>
              <span style={{
                fontFamily: "Montserrat, sans-serif", fontSize: "7.5px",
                letterSpacing: "0.10em", textTransform: "uppercase",
                fontWeight: active ? 600 : 400,
              }}>
                {label}
              </span>
            </Link>
          );
        })}

        {/* Profile tab */}
        <button
          onClick={() => setProfileOpen(true)}
          style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: "3px", background: "transparent", border: "none",
            cursor: "pointer", color: "var(--text-faint)",
            minHeight: "60px", transition: "color 0.16s",
          }}
          aria-label="Perfil"
        >
          <div style={{
            width: "28px", height: "28px", borderRadius: "50%",
            background: "rgba(198,168,112,0.16)", color: "var(--gold)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "11px", fontFamily: "Montserrat", fontWeight: 600,
            border: "1.5px solid rgba(198,168,112,0.22)",
          }}>
            {user?.name?.charAt(0).toUpperCase() ?? "U"}
          </div>
          <span style={{ fontFamily: "Montserrat, sans-serif", fontSize: "7.5px", letterSpacing: "0.10em", textTransform: "uppercase" }}>
            Perfil
          </span>
        </button>
      </nav>

      {/* Profile bottom sheet */}
      {profileOpen && (
        <div
          className="md:hidden"
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(4,6,15,0.60)",
            backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
            display: "flex", alignItems: "flex-end",
          }}
          onClick={() => setProfileOpen(false)}
        >
          <div
            className="sheet-enter"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              background: "var(--sidebar-bg)",
              borderTop: "1px solid var(--border-soft)",
              borderRadius: "24px 24px 0 0",
              padding: "0 20px",
              paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
            }}
          >
            {/* Handle */}
            <div style={{ paddingTop: "12px", display: "flex", justifyContent: "center", marginBottom: "20px" }}>
              <div style={{ width: "40px", height: "4px", borderRadius: "100px", background: "var(--border-mid)" }} />
            </div>

            {/* User card */}
            <div style={{
              display: "flex", alignItems: "center", gap: "12px",
              padding: "14px 16px", borderRadius: "16px",
              background: "rgba(198,168,112,0.05)",
              border: "1px solid var(--border-subtle)",
              marginBottom: "16px",
            }}>
              <div style={{
                width: "46px", height: "46px", borderRadius: "50%",
                background: "rgba(198,168,112,0.14)",
                color: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "17px", fontFamily: "Montserrat", fontWeight: 500, flexShrink: 0,
                border: "1.5px solid rgba(198,168,112,0.22)",
              }}>
                {user?.name?.charAt(0).toUpperCase() ?? "U"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "15px", color: "var(--text-primary)", fontWeight: 500, marginBottom: "2px" }}>{user?.name}</p>
                <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>{user?.email}</p>
                <p className="font-label" style={{ fontSize: "9px", color: "var(--lavender)", letterSpacing: "0.10em", textTransform: "uppercase", marginTop: "2px" }}>
                  {user?.anonymous_name}
                </p>
              </div>
              <ThemeToggle size="sm" />
            </div>

            {/* Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
              {user?.role === "admin" && (
                <button
                  onClick={() => { navigate("/admin"); setProfileOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    padding: "15px 18px", borderRadius: "14px",
                    background: "rgba(198,168,112,0.07)",
                    border: "1px solid rgba(198,168,112,0.20)",
                    color: "var(--gold)", cursor: "pointer", width: "100%",
                    fontSize: "15px", fontFamily: "DM Sans, sans-serif",
                    minHeight: "54px", textAlign: "left",
                    transition: "background 0.2s, transform 0.16s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(198,168,112,0.12)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(198,168,112,0.07)")}
                >
                  <Shield size={18} strokeWidth={1.5} />
                  Painel Administrativo
                </button>
              )}
              <button
                onClick={handleLogout}
                style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "15px 18px", borderRadius: "14px",
                  background: "transparent",
                  border: "1px solid var(--border-soft)",
                  color: "var(--text-muted)", cursor: "pointer", width: "100%",
                  fontSize: "15px", fontFamily: "DM Sans, sans-serif",
                  minHeight: "54px", textAlign: "left",
                  transition: "background 0.2s, border-color 0.2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(10,12,26,0.06)"; e.currentTarget.style.borderColor = "var(--border-mid)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "var(--border-soft)"; }}
              >
                <LogOut size={18} strokeWidth={1.5} />
                Sair da conta
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  const pageTitles: Record<string, string> = {
    "/dashboard": "Início",
    "/products":  "Meus Cursos",
    "/community": "Comunidade",
  };
  const currentTitle = Object.entries(pageTitles).find(([p]) => isActive(p, location.pathname))?.[1] ?? "";

  return (
    <div style={{ display: "flex", height: "100dvh", overflow: "hidden", background: "var(--bg-surface)", transition: "background 0.35s ease" }}>

      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col" style={{ width: "210px", flexShrink: 0 }}>
        <Sidebar />
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* Mobile top bar */}
        <header
          className="md:hidden"
          style={{
            height: "52px", display: "flex", alignItems: "center",
            justifyContent: "space-between", padding: "0 16px",
            background: "var(--sidebar-bg)",
            backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
            borderBottom: "1px solid var(--border-subtle)",
            flexShrink: 0, transition: "background 0.35s ease",
            position: "sticky", top: 0, zIndex: 50,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <SpiralLogo variant="dark" size={20} autoTheme />
            {currentTitle && (
              <>
                <div style={{ height: "14px", width: "1px", background: "var(--border-soft)", borderRadius: "1px" }} />
                <span className="font-label" style={{ fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                  {currentTitle}
                </span>
              </>
            )}
          </div>
          <ThemeToggle size="sm" />
        </header>

        {/* Scrollable content */}
        <main
          className="scrollbar-thin scroll-momentum"
          style={{ flex: 1, overflowY: "auto", background: "var(--bg-surface)", transition: "background 0.35s ease" }}
        >
          <div className="pb-tab-bar md:pb-0">
            {children}
          </div>
        </main>
      </div>

      <BottomTabBar />
    </div>
  );
}
