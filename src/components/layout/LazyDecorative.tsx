/**
 * LazyDecorative — Dynamic imports for all heavy decorative components.
 *
 * Strategy:
 *   1. All visual/3D decorative components are lazily loaded via React.lazy
 *   2. Each export provides a Suspense-wrapped version with a lightweight
 *      invisible placeholder so layout never shifts on load
 *   3. Components are chunked separately from the main bundle — ~0 impact
 *      on First Contentful Paint
 *
 * Usage:
 *   import { LazyIPhoneMockup, LazyTabletMockup } from "@/components/layout/LazyDecorative";
 */
import React, { Suspense } from "react";

/* ── Invisible placeholders (preserve layout space) ────────────── */
function MacbookHolder() {
  return (
    <div
      aria-hidden="true"
      style={{
        width: "clamp(320px, 46vw, 580px)",
        aspectRatio: "1300/820",
        background: "rgba(198,168,112,0.03)",
        flexShrink: 0,
        position: "relative",
        overflow: "hidden",
        borderRadius: "4px",
      }}
    />
  );
}

function TabletHolder() {
  return (
    <div
      aria-hidden="true"
      style={{
        width: "clamp(200px, 22vw, 320px)",
        aspectRatio: "9/13",
        borderRadius: "20px",
        background: "rgba(198,168,112,0.04)",
        border: "1px solid rgba(198,168,112,0.08)",
        flexShrink: 0,
        position: "relative",
        overflow: "hidden",
      }}
    />
  );
}

function SpiralHolder() {
  return <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />;
}

function InvisibleHolder({ width = 180, height = 432 }: { width?: number; height?: number }) {
  return (
    <div
      aria-hidden="true"
      style={{ width, height, flexShrink: 0, pointerEvents: "none" }}
    />
  );
}

/* ── Lazy component definitions ─────────────────────────────────── */
const LazyMacbook = React.lazy(() => import("@/components/layout/MacbookMockup"));
const LazyTablet  = React.lazy(() => import("@/components/layout/TabletMockup"));
const LazyBgSpiral = React.lazy(() =>
  import("@/components/layout/Spiral3D").then((m) => ({ default: m.BackgroundSpiral3D }))
);
const LazySectionSpiral = React.lazy(() =>
  import("@/components/layout/Spiral3D").then((m) => ({ default: m.SectionSpiral3D }))
);
const LazyAuthSpiral = React.lazy(() =>
  import("@/components/layout/Spiral3D").then((m) => ({ default: m.AuthSpiral3D }))
);
const LazyScrollSpiral = React.lazy(() => import("@/components/layout/ScrollSpiral"));

/* ── Exported wrappers with Suspense fallbacks ──────────────────── */
export function LazyMacbookMockup() {
  return (
    <Suspense fallback={<MacbookHolder />}>
      <LazyMacbook />
    </Suspense>
  );
}

export function LazyTabletMockup(props: { targetSection?: string }) {
  return (
    <Suspense fallback={<TabletHolder />}>
      <LazyTablet {...props} />
    </Suspense>
  );
}

export function LazyBackgroundSpiral3D() {
  return (
    <Suspense fallback={<SpiralHolder />}>
      <LazyBgSpiral />
    </Suspense>
  );
}

interface SectionSpiralExternalProps {
  size?: number | string;
  height?: number | string;
  opacity?: number;
  color?: string;
  emissive?: string;
  emissiveInt?: number;
  speed?: number;
  style?: React.CSSProperties;
  lightBg?: boolean;
  withRings?: boolean;
  turns?: number;
  rCrown?: number;
  rTip?: number;
  helixHeight?: number;
  flare?: number;
  shadow?: boolean;
}

export function LazySectionSpiral3D(props: SectionSpiralExternalProps) {
  const { size = 180, height } = props;
  const w = typeof size === "number" ? size : 180;
  const h = height ? (typeof height === "number" ? height : 432) : Math.round(w * 2.4);
  return (
    <Suspense fallback={<InvisibleHolder width={w} height={h} />}>
      <LazySectionSpiral {...(props as Parameters<typeof LazySectionSpiral>[0])} />
    </Suspense>
  );
}

export function LazyAuthSpiral3D(props: { opacity?: number; color?: string }) {
  return (
    <Suspense fallback={<SpiralHolder />}>
      <LazyAuthSpiral {...props} />
    </Suspense>
  );
}

export function LazyScrollSpiral3D() {
  return (
    <Suspense fallback={null}>
      <LazyScrollSpiral />
    </Suspense>
  );
}
