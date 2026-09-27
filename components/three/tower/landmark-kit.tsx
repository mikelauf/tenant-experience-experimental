"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import type { Env } from "./env";

/** The landmarks' shared kit: materials that floodlight after dark, instanced primitives, hills, lamps, and a few shape helpers. */

const _o = new THREE.Object3D();
const _c = new THREE.Color();

/** The materials every landmark shares; their colors follow the light each frame */
export type LandmarkMats = {
  /** Pale stone, the tower's own slab color */
  stone: THREE.MeshStandardMaterial;
  /** The same stone, floodlit after dark */
  lit: THREE.MeshStandardMaterial;
  tree: THREE.MeshStandardMaterial;
  /** Dark glass that glows warm at night */
  window: THREE.MeshStandardMaterial;
};

export function useLandmarkMats(env: Env): LandmarkMats {
  const m = useMemo(
    () => ({
      stone: new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0.05 }),
      lit: new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.05, emissive: new THREE.Color("#ffe3c0") }),
      tree: new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true }),
      window: new THREE.MeshStandardMaterial({ color: "#2b3036", roughness: 0.35, metalness: 0.3, emissive: new THREE.Color("#ffc983") }),
    }),
    [],
  );
  useFrame(() => {
    m.stone.color.copy(env.slab).multiplyScalar(0.92);
    m.lit.color.copy(env.slab).multiplyScalar(0.92);
    m.lit.emissiveIntensity = env.lit * 0.16;
    m.tree.color.copy(env.tree);
    m.window.emissiveIntensity = env.lit * 0.75;
  });
  return m;
}

/* ------------------------------------------------------------------ helpers */

const BOX = new THREE.BoxGeometry();
export const CYL = new THREE.CylinderGeometry(1, 1, 1, 12);
export const CONE = new THREE.ConeGeometry(1, 1, 7);

export type V3 = [number, number, number];
export type Item = { p: V3; s?: V3; r?: V3 };

/** Many copies of one shape in a single draw call */
export function Many({
  geometry = BOX,
  material,
  items,
  shadow,
}: {
  geometry?: THREE.BufferGeometry;
  material: THREE.Material;
  items: Item[];
  shadow?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current!;
    items.forEach((it, i) => {
      _o.position.set(...it.p);
      _o.rotation.set(...(it.r ?? [0, 0, 0]));
      _o.scale.set(...(it.s ?? [1, 1, 1]));
      _o.updateMatrix();
      m.setMatrixAt(i, _o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [items]);
  return <instancedMesh key={items.length} ref={ref} args={[geometry, material, items.length]} castShadow={shadow} receiveShadow={shadow} />;
}

/** A dome of land, lumpy enough to read as a hill rather than a bowl. Flat-shaded, so every facet catches the light. */
export function hillGeometry(seed: number) {
  const g = new THREE.SphereGeometry(1, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const [x, y, z] = [p.getX(i), p.getY(i), p.getZ(i)];
    if (y < 0.02) continue;
    const n = 1 + 0.08 * Math.sin(x * 5.1 + seed) * Math.cos(z * 4.3 + seed * 1.7) + 0.05 * Math.sin((x + z) * 9 + seed * 0.3);
    p.setXYZ(i, x * n, y * n, z * n);
  }
  g.computeVertexNormals();
  return g;
}

/** Little conifers scattered over a hill of radius `rx`×`rz` and height `h`, below its crown */
export function hillTrees(seed: number, n: number, rx: number, h: number, rz: number, keepOut = 0.3): Item[] {
  let s = seed * 9301 + 49297;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const out: Item[] = [];
  while (out.length < n) {
    const a = rnd() * Math.PI * 2;
    const f = keepOut + rnd() * (0.92 - keepOut);
    const y = h * Math.sqrt(1 - f * f) * 0.94;
    const k = 0.14 + rnd() * 0.1;
    out.push({ p: [Math.cos(a) * f * rx, y + k * 1.1, Math.sin(a) * f * rz], s: [k, k * 2.6, k] });
  }
  return out;
}

/** A triangular prism, apex up, `depth` long along z and centered on its base: roofs and pediments */
export function prism(w: number, h: number, depth: number) {
  const s = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, h)]);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
  g.translate(0, 0, -depth / 2);
  return g;
}
export function tube(points: THREE.Vector3[], r: number) {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), points.length * 3, r, 5, false);
}

/** Lights on an instanced mesh that brighten after dark; `twinkle` makes them shimmer like the Bay Lights */
function useNightLights(ref: RefObject<THREE.InstancedMesh | null>, env: Env, count: number, day: string, night: string, twinkle = 0) {
  const d = useMemo(() => new THREE.Color(day), [day]);
  const n = useMemo(() => new THREE.Color(night), [night]);
  const last = useRef(-1);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const k = Math.min(1, env.lit / 1.5);
    if (!twinkle && Math.abs(k - last.current) < 0.005) return;
    last.current = k;
    const t = clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const w = twinkle ? 0.35 + 0.65 * Math.max(0, Math.sin(t * 1.1 + i * 0.37 + Math.sin(t * 0.23 + i * 0.05) * 3)) ** 2 : 1;
      m.setColorAt(i, _c.copy(d).lerp(n, k * w));
    }
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });
}

/** Warm points along a road deck, or anything else that lights up at night */
export function Lamps({
  items,
  env,
  color = "#ffd9a0",
  twinkle = 0,
  day = "#6b7278",
}: {
  items: Item[];
  env: Env;
  color?: string;
  twinkle?: number;
  day?: string;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  useNightLights(ref, env, items.length, day, color, twinkle);
  useLayoutEffect(() => {
    const m = ref.current!;
    items.forEach((it, i) => {
      _o.position.set(...it.p);
      _o.rotation.set(...(it.r ?? [0, 0, 0]));
      _o.scale.set(...(it.s ?? [1, 1, 1]));
      _o.updateMatrix();
      m.setMatrixAt(i, _o.matrix);
      m.setColorAt(i, _c.set(day));
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [items, day]);
  return <instancedMesh key={items.length} ref={ref} args={[BOX, mat, items.length]} />;
}

const NO_OPTS: THREE.MeshStandardMaterialParameters = {};
export const METAL: THREE.MeshStandardMaterialParameters = { metalness: 0.85, roughness: 0.3 };
export const LEAD: THREE.MeshStandardMaterialParameters = { metalness: 0.4, roughness: 0.45 };
export const ROUGH: THREE.MeshStandardMaterialParameters = { roughness: 0.85 };

/** A material whose glow follows the dark. `opts` must be a stable object (the constants above). */
export function useGlow(color: string, emissive: string, k: number, env: Env, opts = NO_OPTS) {
  const m = useMemo(() => new THREE.MeshStandardMaterial({ color, emissive, roughness: 0.6, ...opts }), [color, emissive, opts]);
  useFrame(() => {
    m.emissiveIntensity = env.lit * k;
  });
  return m;
}

/* ------------------------------------------------------------------ Salesforce Tower */

/* Salesforce Tower, from its published dimensions at the scene's scale (1 unit ≈ 62 ft, the Pyramid's 853 ft = 13.7):
   1,070 ft overall, 901 ft to the top floor, a rounded-square plan roughly as wide as the Pyramid's base, straight
   sides to about floor 26, then every face curving in to a slender top and an open lattice crown lit at night. */
export function sector(r1: number, r2: number, a0: number, a1: number) {
  const s = new THREE.Shape();
  s.absarc(0, 0, r2, a0, a1, false);
  s.absarc(0, 0, r1, a1, a0, true);
  return s;
}
export function flat(shape: THREE.Shape, depth: number) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 28 });
  g.rotateX(-Math.PI / 2);
  return g;
}
export const deg = (d: number) => (d * Math.PI) / 180;
