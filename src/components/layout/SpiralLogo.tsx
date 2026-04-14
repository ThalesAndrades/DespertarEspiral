/**
 * SpiralLogo — Theme-aware brand mark
 */
interface SpiralLogoProps {
  variant?: "dark" | "light";
  size?: number;
  showText?: boolean;
  autoTheme?: boolean;
}

export default function SpiralLogo({
  variant = "dark",
  size = 40,
  showText = true,
  autoTheme = false,
}: SpiralLogoProps) {
  const color = autoTheme
    ? "var(--gold)"
    : variant === "dark" ? "#c6a870" : "#0b0d1c";
  const sub = autoTheme
    ? "var(--text-muted)"
    : variant === "dark" ? "rgba(198,168,112,0.50)" : "rgba(11,13,28,0.40)";

  return (
    <div className="flex items-center gap-3 select-none">
      <svg
        width={size} height={size}
        viewBox="0 0 64 64" fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
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
          stroke={color}
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M33.5 39 L34.8 37.4 L36.1 39 L34.8 40.6 Z"
          fill={color}
          opacity="0.82"
        />
      </svg>

      {showText && (
        <div className="flex flex-col leading-none gap-[3px]">
          <span
            className="font-label font-medium tracking-[0.20em] uppercase"
            style={{ fontSize: "10px", color, lineHeight: 1 }}
          >
            DESPERTAR ESPIRAL
          </span>
          <span
            className="font-label font-light tracking-[0.14em] uppercase"
            style={{ fontSize: "8px", color: sub, lineHeight: 1 }}
          >
            por Sunyan Nunes
          </span>
        </div>
      )}
    </div>
  );
}
