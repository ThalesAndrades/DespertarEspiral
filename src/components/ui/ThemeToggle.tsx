import { useTheme } from "@/hooks/useTheme";
import { Sun, Moon } from "lucide-react";

interface ThemeToggleProps {
  className?: string;
  size?: "sm" | "md";
}

export default function ThemeToggle({ className = "", size = "md" }: ThemeToggleProps) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  const iconSize = size === "sm" ? 14 : 16;

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      className={`relative inline-flex items-center justify-center transition-all duration-300 ${className}`}
      style={{
        width:  size === "sm" ? "36px" : "44px",
        height: size === "sm" ? "36px" : "44px",
        borderRadius: "50%",
        border: "1px solid var(--border-subtle)",
        background: "var(--surface-2)",
        color: "var(--text-muted)",
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      <span
        className="absolute inset-0 flex items-center justify-center transition-all duration-300"
        style={{
          opacity: isDark ? 1 : 0,
          transform: isDark ? "rotate(0deg) scale(1)" : "rotate(90deg) scale(0.5)",
        }}
      >
        <Moon size={iconSize} strokeWidth={1.5} />
      </span>
      <span
        className="absolute inset-0 flex items-center justify-center transition-all duration-300"
        style={{
          opacity: isDark ? 0 : 1,
          transform: isDark ? "rotate(-90deg) scale(0.5)" : "rotate(0deg) scale(1)",
        }}
      >
        <Sun size={iconSize} strokeWidth={1.5} />
      </span>
    </button>
  );
}
