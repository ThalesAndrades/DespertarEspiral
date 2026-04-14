
/**
 * Crystal3D — Pure THREE.js (no React Three Fiber reconciler).
 *
 * Uses useEffect + canvas ref to build the scene imperatively,
 * completely bypassing R3F's applyProps which caused persistent crashes.
 *
 * Exports: BackgroundSpiral3D, HeroSpiral3D, SectionSpiral3D, AuthSpiral3D
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";

/* ─── Reduced motion ────────────────────────────────────────────── */
function prefersReduced() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/* ─── Core scene builder ────────────────────────────────────────── */
interface SceneConfig {
  scale?: number;
  opacity?: number;
  color?: string;
  emissive?: string;
  speed?: number;
  withRings?: boolean;
  ringOpacity?: number;
  heroMode?: boolean;
  lightBg?: boolean;
  cameraZ?: number;
  fov?: number;
}

function buildScene(canvas: HTMLCanvasElement, cfg: SceneConfig) {
  const {
    scale      = 1,
    opacity    = 0.92,
    color      = "#d4af72",
    emissive   = "#6a3c10",
    speed      = 1,
    withRings  = false,
    ringOpacity = 0.22,
    heroMode   = false,
    lightBg    = false,
    cameraZ    = 5.5,
    fov        = 42,
  } = cfg;

  const reduced = prefersReduced();

  /* ── Renderer ── */
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
  renderer.setSize(canvas.clientWidth || 200, canvas.clientHeight || 400, false);
  renderer.setClearColor(0x000000, 0);

  /* ── Scene & Camera ── */
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, canvas.clientWidth / canvas.clientHeight || 0.5, 0.1, 100);
  camera.position.set(2.8, 0.3, cameraZ);

  /* ── Lights ── */
  const ambInt = lightBg ? 0.70 : 0.35;
  scene.add(new THREE.AmbientLight(0xffffff, ambInt));

  const lightRig = new THREE.Group();
  const lightRadius = 3.5;
  const int = heroMode ? 1.8 : (lightBg ? 1.1 : 1.4);

  const addPoint = (hex: number, pos: [number,number,number], intensity: number, dist: number) => {
    const l = new THREE.PointLight(hex, intensity, dist);
    l.position.set(...pos);
    lightRig.add(l);
  };
  addPoint(0xe8c870, [lightRadius, 2, 0],                      int * 2.2, 12);
  addPoint(0xf0a8c0, [-lightRadius*0.7, 1, lightRadius*0.7],   int * 0.9, 10);
  addPoint(0xb8b0f0, [0, -2, -lightRadius],                    int * 0.7,  9);
  addPoint(0x6040a0, [0, -lightRadius, 0],                     int * 0.4,  8);

  const dirLight = new THREE.DirectionalLight(0xffe8b0, heroMode ? 1.4 : 0.8);
  dirLight.position.set(1, 6, 2);
  scene.add(dirLight);
  scene.add(lightRig);

  /* ── Crystal factory ── */
  const s = scale;

  function makeCrystal(opts: {
    radius?: number; scaleY?: number; color?: string; emissive?: string;
    emissiveInt?: number; metalness?: number; roughness?: number; opacity?: number;
    pos: [number,number,number]; rot?: [number,number,number];
    rotSpeed?: number; floatAmp?: number; floatFreq?: number;
    wire?: boolean; wireColor?: string; wireOpacity?: number;
  }) {
    const {
      radius     = 0.24,
      scaleY     = 3.8,
      color: c   = color,
      emissive: e = emissive,
      emissiveInt = 0.24,
      metalness  = 0.85,
      roughness  = 0.05,
      opacity: op = opacity,
      pos, rot   = [0,0,0],
      rotSpeed   = 0.0006,
      floatAmp   = 0.055,
      floatFreq  = 0.30,
      wire       = false,
      wireColor  = c,
      wireOpacity = 0.11,
    } = opts;

    const geo = new THREE.OctahedronGeometry(radius, 0);
    geo.applyMatrix4(new THREE.Matrix4().makeScale(1, scaleY, 1));

    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(c),
      emissive: new THREE.Color(e),
      emissiveIntensity: emissiveInt,
      metalness,
      roughness,
      transparent: true,
      opacity: op,
      side: THREE.DoubleSide,
      flatShading: true,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...pos);
    mesh.rotation.set(...rot);

    const group = new THREE.Group();
    group.add(mesh);

    let wireMesh: THREE.Mesh | null = null;
    if (wire) {
      const wGeo = new THREE.OctahedronGeometry(radius, 0);
      wGeo.applyMatrix4(new THREE.Matrix4().makeScale(1, scaleY, 1));
      const wMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(wireColor),
        wireframe: true,
        transparent: true,
        opacity: wireOpacity,
      });
      wireMesh = new THREE.Mesh(wGeo, wMat);
      wireMesh.position.set(...pos);
      wireMesh.rotation.set(...rot);
      group.add(wireMesh);
    }

    scene.add(group);

    const offset = Math.random() * Math.PI * 2;
    return {
      group, mesh, wireMesh,
      rotSpeed: rotSpeed * speed,
      floatAmp, floatFreq, baseY: pos[1], offset,
    };
  }

  /* ── Ring factory ── */
  function makeRing(opts: {
    radius?: number; tube?: number; color?: string; opacity?: number;
    rotSpeed?: number; tilt?: [number,number,number];
  }) {
    const {
      radius   = 1.0,
      tube     = 0.004,
      color: c = color,
      opacity: op = 0.22,
      rotSpeed = 0.0005,
      tilt     = [Math.PI/3, 0, 0],
    } = opts;

    const geo = new THREE.TorusGeometry(radius, tube, 4, 72);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(c),
      emissive: new THREE.Color(c),
      emissiveIntensity: 0.35,
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: op,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.set(...tilt);
    scene.add(mesh);
    return { mesh, rotSpeed: rotSpeed * speed * 80 };
  }

  /* ── Cluster ── */
  const crystals = [
    makeCrystal({
      radius: 0.24*s, scaleY: 3.8,
      color, emissive,
      emissiveInt: heroMode ? 0.38 : 0.24,
      metalness: 0.85, roughness: 0.05,
      opacity,
      pos: [0, 0, 0], rot: [0, 0.3, 0],
      rotSpeed: 0.0006, floatAmp: 0.055, floatFreq: 0.30,
      wire: true, wireColor: color, wireOpacity: heroMode ? 0.18 : 0.11,
    }),
    makeCrystal({
      radius: 0.16*s, scaleY: 2.8,
      color: heroMode ? "#e8c090" : "#c8a060",
      emissive: "#5a2c0c", emissiveInt: 0.20,
      metalness: 0.80, roughness: 0.08, opacity: opacity*0.80,
      pos: [-0.55*s, -0.35, 0.12], rot: [0, 0.8, 0.28],
      rotSpeed: 0.0010, floatAmp: 0.045, floatFreq: 0.38,
    }),
    makeCrystal({
      radius: 0.13*s, scaleY: 2.4,
      color: "#b89858", emissive: "#4a2408", emissiveInt: 0.18,
      metalness: 0.78, roughness: 0.10, opacity: opacity*0.68,
      pos: [0.52*s, -0.25, -0.08], rot: [0, -0.6, -0.20],
      rotSpeed: 0.0012, floatAmp: 0.040, floatFreq: 0.44,
    }),
  ];

  if (heroMode) {
    crystals.push(makeCrystal({
      radius: 0.09*s, scaleY: 2.0,
      color: "#f0d8a0", emissive: "#8a5820", emissiveInt: 0.30,
      metalness: 0.88, roughness: 0.04, opacity: opacity*0.60,
      pos: [0.38*s, 0.55, 0.22], rot: [0.15, 1.1, 0.35],
      rotSpeed: 0.0016, floatAmp: 0.035, floatFreq: 0.52,
    }));
  }

  const rings = withRings ? [
    makeRing({ radius: 0.88*s, tube: 0.006*s, color, opacity: ringOpacity, rotSpeed: 0.0006, tilt: [Math.PI/3.2, 0.2, 0] }),
    makeRing({ radius: 1.18*s, tube: 0.004*s, color: "#c0a8e8", opacity: ringOpacity*0.60, rotSpeed: -0.0004, tilt: [Math.PI/2.1, 0.5, 0.4] }),
  ] : [];

  /* ── Animation loop ── */
  let raf = 0;
  let last = performance.now();
  const elapsed = { val: 0 };

  function animate(now: number) {
    const delta = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (!reduced) elapsed.val += delta;

    const e = elapsed.val;

    lightRig.rotation.y += delta * 0.4 * 0.18;

    crystals.forEach((cr) => {
      cr.mesh.rotation.y += delta * cr.rotSpeed * 60;
      const fy = cr.baseY + Math.sin(e * cr.floatFreq + cr.offset) * cr.floatAmp;
      cr.mesh.position.y = fy;
      if (cr.wireMesh) {
        cr.wireMesh.rotation.y += delta * cr.rotSpeed * 40;
        cr.wireMesh.position.y = fy;
      }
    });

    rings.forEach((r) => {
      r.mesh.rotation.y += delta * r.rotSpeed;
    });

    renderer.render(scene, camera);
    raf = requestAnimationFrame(animate);
  }
  raf = requestAnimationFrame(animate);

  /* ── Resize ── */
  const ro = new ResizeObserver(() => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w > 0 && h > 0) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }
  });
  ro.observe(canvas);

  /* ── Cleanup ── */
  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    renderer.dispose();
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.geometry.dispose();
        // Check if material is an array before iterating
        if (Array.isArray(m.material)) {
          m.material.forEach((mat) => mat.dispose());
        } else {
          (m.material as THREE.Material).dispose();
        }
      }
    });
  };
}

/* ═══════════════════════════════════════════════════════════════
   Reusable canvas hook
═══════════════════════════════════════════════════════════════ */
function useCrystalCanvas(cfg: SceneConfig) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const cleanup = buildScene(canvas, cfg);
    return cleanup;
  }, [cfg]); // Added cfg to dependency array

  return ref;
}

/* ══════════════════════════════════════════════════════════════
   BackgroundSpiral3D
══════════════════════════════════════════════════════════════ */
export function BackgroundSpiral3D() {
  const ref = useCrystalCanvas({
    scale: 0.72, opacity: 0.12, color: "#c6a870", emissive: "#4a2c08",
    speed: 0.55, withRings: false, cameraZ: 5.8, fov: 40,
  });

  return (
    <div
      aria-hidden="true"
      style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}
    >
      <div style={{
        position: "absolute", right: "4%", top: "8%",
        width: "360px", height: "680px",
        background: "radial-gradient(ellipse 55% 60% at 60% 35%, rgba(198,168,112,0.07) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute",
        right: "clamp(-60px, 2vw, 40px)",
        top: "8vh",
        width: "min(200px, 18vw)",
        height: "min(680px, 84vh)",
      }}>
        <canvas ref={ref} style={{ width: "100%", height: "100%", display: "block" }} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   HeroSpiral3D
══════════════════════════════════════════════════════════════ */
export function HeroSpiral3D() {
  const ref = useCrystalCanvas({
    scale: 1.0, opacity: 0.94, color: "#d4af72", emissive: "#8a5020",
    speed: 1.0, withRings: true, ringOpacity: 0.28, heroMode: true,
    cameraZ: 5.5, fov: 42,
  });

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        right: "clamp(-80px, -2vw, 0px)",
        top: "50%",
        transform: "translateY(-52%)",
        width: "clamp(260px, 32vw, 480px)",
        height: "clamp(600px, 92vh, 980px)",
        pointerEvents: "none",
        zIndex: 1,
      }}
    >
      <div style={{
        position: "absolute", top: "5%", left: "5%", right: "5%", height: "42%",
        background: "radial-gradient(ellipse 75% 50% at 55% 20%, rgba(198,168,112,0.22) 0%, transparent 65%)",
        pointerEvents: "none",
      }} />
      <canvas ref={ref} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SectionSpiral3D
══════════════════════════════════════════════════════════════ */
interface SectionSpiralProps {
  size?:        number | string;
  height?:      number | string;
  opacity?:     number;
  color?:       string;
  emissive?:    string;
  emissiveInt?: number;
  speed?:       number;
  style?:       React.CSSProperties;
  lightBg?:     boolean;
  withRings?:   boolean;
  // legacy ignored props:
  turns?: number; rCrown?: number; rTip?: number; helixHeight?: number; flare?: number; shadow?: boolean;
}

export function SectionSpiral3D({
  size      = 180,
  height,
  opacity   = 0.60,
  color     = "#c6a870",
  emissive  = "#4a2c08",
  speed     = 0.0004,
  style,
  lightBg   = false,
  withRings = false,
}: SectionSpiralProps) {
  const ref = useCrystalCanvas({
    scale: 0.78, opacity, color, emissive,
    speed: speed * 2400,
    withRings, ringOpacity: 0.18, lightBg,
    cameraZ: 5.5, fov: 43,
  });

  const w = typeof size   === "number" ? `${size}px`   : size;
  const h = height
    ? typeof height === "number" ? `${height}px` : height
    : typeof size   === "number" ? `${Math.round((size as number) * 2.4)}px` : "432px";

  return (
    <div aria-hidden="true" style={{ width: w, height: h, pointerEvents: "none", flexShrink: 0, ...style }}>
      <canvas ref={ref} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   AuthSpiral3D
══════════════════════════════════════════════════════════════ */
export function AuthSpiral3D({
  opacity = 0.38,
  color   = "#c6a870",
}: {
  opacity?: number;
  color?:   string;
}) {
  const ref = useCrystalCanvas({
    scale: 0.90, opacity, color, emissive: "#4a2c08",
    speed: 0.65, withRings: true, ringOpacity: 0.16,
    cameraZ: 5.5, fov: 46,
  });

  return (
    <div
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}
    >
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "50%",
        background: "radial-gradient(ellipse 75% 50% at 50% 15%, rgba(198,168,112,0.12) 0%, transparent 68%)",
      }} />
      <canvas ref={ref} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}

export default BackgroundSpiral3D;
