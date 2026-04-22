/**
 * SkeletonShimmer — Reutilizável
 * Bloco animado com shimmer dourado. Use como placeholder enquanto dados carregam.
 */

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
  className?: string;
}

export function Skeleton({ width = "100%", height = "16px", borderRadius = "8px", style, className }: SkeletonProps) {
  return (
    <div
      className={className}
      style={{
        width,
        height,
        borderRadius,
        background: "linear-gradient(90deg, var(--skeleton-base) 0%, var(--skeleton-shine) 50%, var(--skeleton-base) 100%)",
        backgroundSize: "200% 100%",
        animation: "skeletonShimmer 1.6s ease-in-out infinite",
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

/** Skeleton style injection — adicione em index.css ou via <style> global */
export const SKELETON_STYLES = `
  :root {
    --skeleton-base:  rgba(198, 168, 112, 0.06);
    --skeleton-shine: rgba(198, 168, 112, 0.14);
  }
  [data-theme="light"] {
    --skeleton-base:  rgba(122, 94, 30, 0.07);
    --skeleton-shine: rgba(122, 94, 30, 0.16);
  }
  @keyframes skeletonShimmer {
    0%   { background-position:  200% center; }
    100% { background-position: -200% center; }
  }
`;

export default Skeleton;
