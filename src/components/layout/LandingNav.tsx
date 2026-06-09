/**
 * LandingNav — Apple-quality sticky nav
 * Mobile: logo + hamburger | Desktop: full links + actions
 * Glassmorphism on scroll, transparent at top
 */
import { useState, useEffect, useCallback } from "react";
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
    const fn = () => setScrolled(window.scrollY > 52);
    window.addEventListener("scroll", fn, { passive: true });
    fn();
    return () => window.removeEventListener("scroll", fn);
  }, []);

  /* Close drawer on route change / resize */
  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("resize", close, { passive: true });
    return () => window.removeEventListener("resize", close);
  }, []);

  const navLinks = [
    { label: "Método",     href: "#section-2" },
    { label: "Jornadas",   href: "#section-3" },
    { label: "Comunidade", href: "#section-5" },
  ];

  const linkStyle: React.CSSProperties = {
    fontFamily: "Montserrat, sans-serif",
    fontSize: "9px",
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    color: "var(--nav-link)",
    textDecoration: "none",
    transition: "color 0.18s ease",
    padding: "6px 0",
    minHeight: "44px",
    display: "inline-flex",
    alignItems: "center",
  };

  const handleNavLink = useCallback((href: string) => {
    setOpen(false);
    if (href.startsWith("#")) {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      navigate(href);
    }
  }, [navigate]);

  return (
    <nav
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0,
        zIndex: 100,
        transition: "background 0.38s ease, border-bottom 0.38s ease, backdrop-filter 0.38s ease, box-shadow 0.38s ease",
        background: scrolled ? "var(--nav-bg)" : "transparent",
        backdropFilter: scrolled ? "blur(28px) saturate(1.4)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(28px) saturate(1.4)" : "none",
        borderBottom: scrolled ? "1px solid var(--border-subtle)" : "1px solid transparent",
        boxShadow: scrolled ? "var(--shadow-xs)" : "none",
      }}
    >
      <div style={{
        maxWidth: "1140px", margin: "0 auto",
        padding: "0 clamp(16px,4vw,24px)",
        height: "68px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "24px",
      }}>
        {/* Logo */}
        <Link to="/" style={{ textDecoration: "none", flexShrink: 0 }} aria-label="Início">
          <SpiralLogo variant="dark" size={30} autoTheme />
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex" style={{ alignItems: "center", gap: "36px", flex: 1, justifyContent: "center" }}>
          {navLinks.map(({ label, href }) => (
            <a
              key={label} href={href}
              style={linkStyle}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--gold)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--nav-link)")}
            >
              {label}
            </a>
          ))}
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex" style={{ alignItems: "center", gap: "14px", flexShrink: 0 }}>
          <ThemeToggle size="sm" />
          {user ? (
            <button
              onClick={() => navigate(user.role === "admin" ? "/admin" : "/dashboard")}
              className="btn-gold"
              style={{ padding: "10px 22px", fontSize: "9px", minHeight: "40px" }}
            >
              {user.role === "admin" ? "Painel Admin" : "Minha Área"}
            </button>
          ) : (
            <>
              <a
                href="/login"
                style={linkStyle}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--gold)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--nav-link)")}
              >
                Entrar
              </a>
              <Link to="/checkout/mulher-espiral" className="btn-gold" style={{ padding: "10px 22px", fontSize: "9px", minHeight: "40px" }}>
                Começar
              </Link>
            </>
          )}
        </div>

        {/* Mobile: hamburger */}
        <button
          className="md:hidden"
          style={{
            width: "44px", height: "44px",
            color: "var(--text-primary)",
            background: scrolled ? "var(--gold-glow)" : "transparent",
            border: scrolled ? "1px solid var(--border-soft)" : "1px solid transparent",
            borderRadius: "12px",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.2s, border-color 0.2s",
            flexShrink: 0,
          }}
          onClick={() => setOpen(!open)}
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
          aria-controls="mobile-nav"
        >
          {open
            ? <X size={18} strokeWidth={1.5} />
            : <Menu size={18} strokeWidth={1.5} />
          }
        </button>
      </div>

      {/* Mobile drawer */}
      <div
        id="mobile-nav"
        className="md:hidden"
        style={{
          maxHeight: open ? "400px" : "0px",
          overflow: "hidden",
          transition: "max-height 0.32s var(--ease-out)",
          background: "var(--nav-bg)",
          backdropFilter: "blur(28px) saturate(1.4)",
          WebkitBackdropFilter: "blur(28px) saturate(1.4)",
          borderTop: open ? "1px solid var(--border-subtle)" : "none",
        }}
        aria-hidden={!open}
      >
        <div style={{ padding: "8px clamp(16px,4vw,24px) 20px", display: "flex", flexDirection: "column", gap: "2px" }}>
          {navLinks.map(({ label, href }) => (
            <button
              key={label}
              onClick={() => handleNavLink(href)}
              style={{
                display: "flex", alignItems: "center",
                padding: "14px 0", width: "100%", background: "transparent", border: "none",
                borderBottom: "1px solid var(--border-subtle)",
                fontFamily: "Montserrat, sans-serif", fontSize: "9px",
                letterSpacing: "0.22em", textTransform: "uppercase",
                color: "var(--text-secondary)", cursor: "pointer",
                textAlign: "left", minHeight: "52px",
                transition: "color 0.16s",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--gold)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-secondary)")}
            >
              {label}
            </button>
          ))}

          {/* Theme toggle row */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 0",
            borderBottom: "1px solid var(--border-subtle)",
          }}>
            <span className="font-label" style={{ fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)" }}>Aparência</span>
            <ThemeToggle size="sm" />
          </div>

          {/* CTAs */}
          <div style={{ paddingTop: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
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
                <Link to="/login" onClick={() => setOpen(false)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "14px", fontFamily: "Montserrat, sans-serif", fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-secondary)", textDecoration: "none", minHeight: "52px" }}>
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
