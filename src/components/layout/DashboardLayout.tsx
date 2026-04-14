/**
 * DashboardLayout — Device-optimized layout
 * Mobile: compact sticky header (logo + theme toggle) + bottom tab bar
 * Desktop: fixed sidebar (210px) + scrollable main
 * No hamburger on mobile — bottom tab handles all navigation
 */
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import SpiralLogo from "./SpiralLogo";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard, BookOpen, Users, LogOut,
  ChevronRight, Shield,
} from "lucide-react";

interface NavItem { label: string; icon: React.ElementType; href: string; }

const memberNav: NavItem[] = [
  { label: "Início",     icon: LayoutDashboard, href: "/dashboard" },
  { label: "Cursos",     icon: BookOpen,        href: "/products"  },
  { label: "Comunidade", icon: Users,           href: "/community" },
];

function isActive(href: string, pathname: string) {
  // Exact match for dashboard to avoid /products matching /dashboard
  if (href === "/dashboard") return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  return pathname.startsWith(href);
}

/* ── Desktop Sidebar ── */
function Sidebar() {
  const location = useLocation();
  const navigate  = useNavigate();
  const { user, logout } = useAuth();

  return (
    <aside style={{
      display: "flex", flexDirection: "column", height: "100%",
      background: "var(--sidebar-bg)",
      borderRight: "1px solid var(--border-subtle)",
      transition: "background 0.4s ease",
    }}>
      {/* Logo + theme */}
      <div style={{ padding: "24px 20px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link to="/" style={{ textDecoration: "none" }}>
          <SpiralLogo variant="dark" size={28} autoTheme />
        </Link>
        <ThemeToggle size="sm" />
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "0 10px", display: "flex", flexDirection: "column", gap: "2px" }}>
        {memberNav.map(({ label, icon: Icon, href }) => {
          const active = isActive(href, location.pathname);
          return (
            <Link key={href} to={href}
              className={`sidebar-link ${active ? "active" : ""}`}
              style={{ textDecoration: "none" }}>
              <Icon size={15} strokeWidth={1.5} />
              <span style={{ fontSize: "14px" }}>{label}</span>
              {active && <ChevronRight size={11} style={{ marginLeft: "auto", color: "var(--gold)", opacity: 0.5 }} />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div style={{ padding: "10px", borderTop: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: "2px" }}>
        {user?.role === "admin" && (
          <Link to="/admin" className="sidebar-link" style={{ textDecoration: "none" }}>
            <Shield size={15} strokeWidth={1.5} />
            <span style={{ fontSize: "14px" }}>Painel Admin</span>
          </Link>
        )}
        <button onClick={() => { logout(); navigate("/"); }} className="sidebar-link">
          <LogOut size={15} strokeWidth={1.5} />
          <span style={{ fontSize: "14px" }}>Sair</span>
        </button>
      </div>

      {/* User badge */}
      <div style={{ padding: "10px 14px 20px" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "11px 12px", borderRadius: "12px",
          background: "rgba(198,168,112,0.06)",
          border: "1px solid var(--border-subtle)",
        }}>
          <div style={{
            width: "34px", height: "34px", borderRadius: "50%",
            background: "rgba(198,168,112,0.15)",
            color: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "12px", fontFamily: "Montserrat", fontWeight: 500, flexShrink: 0,
          }}>
            {user?.name?.charAt(0) ?? "U"}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {user?.name}
            </p>
            <p className="font-label" style={{ fontSize: "9px", color: "var(--lavender)", letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
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

  return (
    <>
      {/* Tab bar */}
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
                transition: "color 0.18s",
                position: "relative",
                minHeight: "60px",
              }}
              aria-current={active ? "page" : undefined}
            >
              {active && (
                <span style={{
                  position: "absolute", top: 0, left: "18%", right: "18%",
                  height: "2px", background: "var(--gold)",
                  borderRadius: "0 0 4px 4px",
                }} />
              )}
              <Icon size={21} strokeWidth={active ? 2 : 1.5} />
              <span style={{
                fontFamily: "Montserrat, sans-serif", fontSize: "7.5px",
                letterSpacing: "0.12em", textTransform: "uppercase",
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
            minHeight: "60px",
          }}
          aria-label="Perfil"
        >
          <div style={{
            width: "26px", height: "26px", borderRadius: "50%",
            background: "rgba(198,168,112,0.18)", color: "var(--gold)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "11px", fontFamily: "Montserrat", fontWeight: 600,
          }}>
            {user?.name?.charAt(0) ?? "U"}
          </div>
          <span style={{ fontFamily: "Montserrat, sans-serif", fontSize: "7.5px", letterSpacing: "0.12em", textTransform: "uppercase" }}>
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
            background: "rgba(7,9,21,0.65)",
            backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
            display: "flex", alignItems: "flex-end",
          }}
          onClick={() => setProfileOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              background: "var(--sidebar-bg)",
              borderTop: "1px solid var(--border-soft)",
              borderRadius: "24px 24px 0 0",
              padding: "20px 20px",
              paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
            }}
          >
            {/* Handle */}
            <div style={{ width: "36px", height: "3px", borderRadius: "100px", background: "var(--border-mid)", margin: "0 auto 20px" }} />

            {/* User info */}
            <div style={{
              display: "flex", alignItems: "center", gap: "12px",
              padding: "14px", borderRadius: "14px",
              background: "rgba(198,168,112,0.06)",
              border: "1px solid var(--border-subtle)",
              marginBottom: "16px",
            }}>
              <div style={{
                width: "44px", height: "44px", borderRadius: "50%",
                background: "rgba(198,168,112,0.15)",
                color: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "16px", fontFamily: "Montserrat", fontWeight: 500, flexShrink: 0,
              }}>
                {user?.name?.charAt(0) ?? "U"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "15px", color: "var(--text-primary)", fontWeight: 500 }}>{user?.name}</p>
                <p className="font-label" style={{ fontSize: "9px", color: "var(--lavender)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  {user?.anonymous_name ?? user?.email?.split("@")[0]}
                </p>
              </div>
              <ThemeToggle size="sm" />
            </div>

            {/* Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {user?.role === "admin" && (
                <button
                  onClick={() => { navigate("/admin"); setProfileOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    padding: "14px 16px", borderRadius: "14px",
                    background: "rgba(198,168,112,0.08)",
                    border: "1px solid rgba(198,168,112,0.22)",
                    color: "var(--gold)", cursor: "pointer", width: "100%",
                    fontSize: "14px", fontFamily: "DM Sans, sans-serif",
                    minHeight: "52px",
                  }}
                >
                  <Shield size={16} strokeWidth={1.5} />
                  Painel Administrativo
                </button>
              )}
              <button
                onClick={() => { logout(); navigate("/"); }}
                style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "14px 16px", borderRadius: "14px",
                  background: "transparent",
                  border: "1px solid var(--border-soft)",
                  color: "var(--text-muted)", cursor: "pointer", width: "100%",
                  fontSize: "14px", fontFamily: "DM Sans, sans-serif",
                  minHeight: "52px",
                }}
              >
                <LogOut size={16} strokeWidth={1.5} />
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
    <div style={{ display: "flex", height: "100dvh", overflow: "hidden", background: "var(--bg-surface)", transition: "background 0.4s ease" }}>

      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:flex flex-col" style={{ width: "210px", flexShrink: 0 }}>
        <Sidebar />
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* Mobile top bar — compact: logo + page title + theme toggle */}
        <header
          className="md:hidden"
          style={{
            height: "52px", display: "flex", alignItems: "center",
            justifyContent: "space-between", padding: "0 16px",
            background: "var(--sidebar-bg)",
            borderBottom: "1px solid var(--border-subtle)",
            flexShrink: 0, transition: "background 0.4s ease",
            position: "sticky", top: 0, zIndex: 50,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <SpiralLogo variant="dark" size={20} autoTheme />
            {currentTitle && (
              <>
                <div style={{ height: "12px", width: "1px", background: "var(--border-soft)" }} />
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
          className="scrollbar-thin"
          style={{ flex: 1, overflowY: "auto", background: "var(--bg-surface)", transition: "background 0.4s ease" }}
        >
          {/* Bottom clearance: 60px tab bar + safe area on mobile, 0 on desktop */}
          <div style={{ paddingBottom: 0 }} className="pb-tab-bar md:pb-0">
            {children}
          </div>
        </main>
      </div>

      {/* Bottom tab bar — mobile only */}
      <BottomTabBar />
    </div>
  );
}
