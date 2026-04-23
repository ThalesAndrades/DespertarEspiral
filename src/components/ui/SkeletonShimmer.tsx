/**
 * SkeletonShimmer — Reutilizável
 * Bloco animado com shimmer dourado. Use como placeholder enquanto dados carregam.
 */
import type { CSSProperties } from "react";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: CSSProperties;
  className?: string;
}

/** Normaliza width/height: número → "Npx", string → passado direto */
function dim(v: string | number | undefined, def: string): string {
  if (v === undefined || v === null) return def;
  return typeof v === "number" ? `${v}px` : v;
}

export function Skeleton({ width, height, borderRadius, style, className }: SkeletonProps) {
  return (
    <div
      className={["skeleton", className].filter(Boolean).join(" ")}
      style={{
        width: dim(width, "100%"),
        height: dim(height, "16px"),
        borderRadius: dim(borderRadius, "8px"),
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

export default Skeleton;
