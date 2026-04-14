/**
 * ThemeToggle — Apple-quality toggle with spring animation
 */
import { useState, useEffect } from "react";
import { useTheme } from "@/hooks/useTheme";
import { Sun, Moon } from "lucide-react";

interface ThemeToggleProps {
  className?: string;
  size?: "sm" | "md";
}

export default function ThemeToggle({ className = "", size = "md" }: ThemeToggleProps) {
  const { theme, toggle } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => setMounted(true), []);

  const isDark = theme === "dark";
  const iconSize = size === "sm" ? 14 : 16;
  const btnSize  = size === "sm" ? "36px" : "44px";

  if (!mounted) return (
    <div style={{ width: btnSize, height: btnSize, borderRadius: "50%", background: "var(--border-subtle)", flexShrink: 0 }} />
  );

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      aria-pressed={isDark}
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{
        width: btnSize, height: btnSize,
        borderRadius: "50%",
        border: "1px solid var(--border-soft)",
        background: "var(--gold-glow)",
        color: "var(--gold)",
        cursor: "pointer", flexShrink: 0,
        transition: "background 0.2s ease, border-color 0.2s ease, transform 0.15s cubic-bezier(.34,1.56,.64,1)",
        overflow: "hidden",
        position: "relative",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1.08)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
      onMouseDown={(e)  => { (e.currentTarget as HTMLElement).style.transform = "scale(0.94)"; }}
      onMouseUp={(e)    => { (e.currentTarget as HTMLElement).style.transform = "scale(1.05)"; setTimeout(() => (e.currentTarget as HTMLElement).style.transform = "scale(1)", 150); }}
    >
      {/* Moon */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          opacity: isDark ? 1 : 0,
          transform: isDark ? "rotate(0deg) scale(1)" : "rotate(90deg) scale(0.4)",
          transition: "opacity 0.25s ease, transform 0.3s cubic-bezier(.34,1.56,.64,1)",
          pointerEvents: "none",
        }}
      >
        <Moon size={iconSize} strokeWidth={1.5} />
      </span>
      {/* Sun */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          opacity: isDark ? 0 : 1,
          transform: isDark ? "rotate(-90deg) scale(0.4)" : "rotate(0deg) scale(1)",
          transition: "opacity 0.25s ease, transform 0.3s cubic-bezier(.34,1.56,.64,1)",
          pointerEvents: "none",
        }}
      >
        <Sun size={iconSize} strokeWidth={1.5} />
      </span>
    </button>
  );
}
