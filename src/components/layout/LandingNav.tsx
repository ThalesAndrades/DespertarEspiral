import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import SpiralLogo from "./SpiralLogo";
import { useAuth } from "@/hooks/useAuth";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { Menu, X } from "lucide-react";

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen]         = useState(false);
  const { user }                = useAuth();
  const navigate                = useNavigate();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const navLinks = [
    { label: "Método",     href: "#section-2" },
    { label: "Jornadas",   href: "#section-3" },
    { label: "Comunidade", href: "#section-5" },
  ];

  const linkStyle = {
    fontFamily: "Montserrat, sans-serif",
    fontSize: "9px",
    letterSpacing: "0.22em",
    textTransform: "uppercase" as const,
    color: "var(--nav-link)",
    textDecoration: "none",
    transition: "color 0.2s ease",
  };

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        transition: "background 0.45s ease, border-bottom 0.45s ease, backdrop-filter 0.45s ease",
        background: scrolled ? "var(--nav-bg)" : "transparent",
        backdropFilter: scrolled ? "blur(24px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(24px)" : "none",
        borderBottom: scrolled ? "1px solid var(--border-subtle)" : "1px solid transparent",
      }}
    >
      <div
        style={{
          maxWidth: "1140px",
          margin: "0 auto",
          padding: "0 20px",
          height: "68px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "24px",
        }}
      >
        {/* Logo */}
        <Link to="/" style={{ textDecoration: "none", flexShrink: 0 }}>
          <SpiralLogo variant="dark" size={30} autoTheme />
        </Link>

        {/* Desktop links */}
        <div
          style={{ display: "flex", alignItems: "center", gap: "36px", flex: 1, justifyContent: "center" }}
          className="hidden md:flex"
        >
          {navLinks.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              style={linkStyle}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--gold)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--nav-link)")}
            >
              {label}
            </a>
          ))}
        </div>

        {/* Desktop actions — single ThemeToggle here */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", flexShrink: 0 }} className="hidden md:flex">
          <ThemeToggle size="sm" />
          {user ? (
            <button
              onClick={() => navigate(user.role === "admin" ? "/admin" : "/dashboard")}
              className="btn-gold"
              style={{ padding: "10px 22px", fontSize: "9px" }}
            >
              {user.role === "admin" ? "Painel Admin" : "Minha Área"}
            </button>
          ) : (
            <>
              <Link
                to="/login"
                style={linkStyle}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--gold)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--nav-link)")}
              >
                Entrar
              </Link>
              <Link to="/checkout/mulher-espiral" className="btn-gold" style={{ padding: "10px 22px", fontSize: "9px" }}>
                Começar
              </Link>
            </>
          )}
        </div>

        {/* Mobile: hamburger only — ThemeToggle is inside mobile menu to avoid duplication */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }} className="md:hidden">
          <button
            style={{
              padding: "8px",
              color: "var(--gold)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              minWidth: "44px",
              minHeight: "44px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={() => setOpen(!open)}
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
          >
            {open ? <X size={20} strokeWidth={1.5} /> : <Menu size={20} strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        style={{
          maxHeight: open ? "340px" : "0",
          overflow: "hidden",
          transition: "max-height 0.35s cubic-bezier(.16,1,.3,1)",
          background: "var(--nav-bg)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderTop: open ? "1px solid var(--border-subtle)" : "none",
        }}
        className="md:hidden"
      >
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "4px" }}>
          {navLinks.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              onClick={() => setOpen(false)}
              style={{
                ...linkStyle,
                display: "block",
                padding: "13px 0",
                borderBottom: "1px solid var(--border-subtle)",
                color: "var(--text-secondary)",
              }}
            >
              {label}
            </a>
          ))}
          <div style={{ paddingTop: "12px", display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "12px", borderBottom: "1px solid var(--border-subtle)", marginBottom: "4px" }}>
              <span className="font-label" style={{ fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)" }}>Aparência</span>
              <ThemeToggle size="sm" />
            </div>
          <div style={{ paddingTop: "4px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {user ? (
              <button
                onClick={() => { navigate(user.role === "admin" ? "/admin" : "/dashboard"); setOpen(false); }}
                className="btn-gold"
                style={{ width: "100%", fontSize: "9px" }}
              >
                {user.role === "admin" ? "Painel Admin" : "Minha Área"}
              </button>
            ) : (
              <>
                <Link to="/login" onClick={() => setOpen(false)} style={{ ...linkStyle, display: "block", padding: "12px 0", color: "var(--text-secondary)" }}>
                  Entrar
                </Link>
                <Link to="/checkout/mulher-espiral" onClick={() => setOpen(false)} className="btn-gold" style={{ width: "100%", fontSize: "9px" }}>
                  Começar jornada
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
