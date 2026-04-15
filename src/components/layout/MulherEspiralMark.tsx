interface MulherEspiralMarkProps {
  size?: "sm" | "md" | "lg";
  align?: "left" | "center";
  showSubtitle?: boolean;
}

export default function MulherEspiralMark({
  size = "md",
  align = "left",
  showSubtitle = true,
}: MulherEspiralMarkProps) {
  const scale =
    size === "sm" ? { icon: 28, title: 20, subtitle: 10 } :
    size === "lg" ? { icon: 42, title: 34, subtitle: 12 } :
    { icon: 34, title: 26, subtitle: 11 };

  return (
    <div style={{ display: "flex", gap: "12px", alignItems: "center", justifyContent: align === "center" ? "center" : "flex-start" }}>
      <svg
        width={scale.icon}
        height={scale.icon}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ flexShrink: 0, filter: "drop-shadow(0 10px 18px rgba(198,168,112,0.18))" }}
      >
        <path
          d="M32 58
             C14.3 58 6 45.5 6 32
             C6 18.5 16.5 8 30 8
             C41.5 8 51 17.5 51 29
             C51 38.8 43.5 46.5 34 46.5
             C26 46.5 19.5 40 19.5 32.2
             C19.5 25.5 24.8 20.2 31.5 20.2
             C37.2 20.2 41.8 24.8 41.8 30.5
             C41.8 35.2 38.2 39 33.5 39"
          stroke="var(--gold)"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
          opacity="0.92"
        />
        <path d="M33.5 39 L34.8 37.4 L36.1 39 L34.8 40.6 Z" fill="var(--gold)" opacity="0.92" />
      </svg>

      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1, minWidth: 0 }}>
        <div
          className="font-display"
          style={{
            fontSize: `${scale.title}px`,
            fontStyle: "italic",
            fontWeight: 300,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          Mulher Espiral
        </div>
        {showSubtitle && (
          <div
            className="font-label"
            style={{
              marginTop: "6px",
              fontSize: `${scale.subtitle}px`,
              letterSpacing: "0.20em",
              textTransform: "uppercase",
              color: "var(--gold)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            Método de Reconexão e Cura
          </div>
        )}
      </div>
    </div>
  );
}

