"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { BRIDGE_HALF, LANDMARK_REACH, sceneLandmarks, type SceneLandmark, type TowerProfile } from "@/lib/tower";
import type { Env } from "./env";

/*
 * The landmarks around the building, each built from primitives in the same language as the tower: pale stone by
 * day, floodlit after dark. At the scene's scale one unit is about 62 ft, but landmarks are drawn a little larger
 * than life and pulled in toward the horizon (see `sceneLandmarks`) so they read as places, not specks.
 */

const _ray = new THREE.Ray();
const _box = new THREE.Box3();
const _dir = new THREE.Vector3();
const _hit = new THREE.Vector3();
const _o = new THREE.Object3D();
const _c = new THREE.Color();

const GG_RED = "#b5432f";

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
const CYL = new THREE.CylinderGeometry(1, 1, 1, 12);
const CONE = new THREE.ConeGeometry(1, 1, 7);

type V3 = [number, number, number];
type Item = { p: V3; s?: V3; r?: V3 };

/** Many copies of one shape in a single draw call */
function Many({ geometry = BOX, material, items, shadow }: { geometry?: THREE.BufferGeometry; material: THREE.Material; items: Item[]; shadow?: boolean }) {
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
function hillGeometry(seed: number) {
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
function hillTrees(seed: number, n: number, rx: number, h: number, rz: number, keepOut = 0.3): Item[] {
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
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

/** A cable hanging between two points (in a bridge's local y/z plane), sagging `dip` below the straight line at mid-span */
function hang(z0: number, y0: number, z1: number, y1: number, dip: number, x: number, n = 18) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    return new THREE.Vector3(x, y0 + (y1 - y0) * t - 4 * dip * t * (1 - t), z0 + (z1 - z0) * t);
  });
}
const cableY = (z0: number, y0: number, z1: number, y1: number, dip: number, z: number) => {
  const t = (z - z0) / (z1 - z0);
  return y0 + (y1 - y0) * t - 4 * dip * t * (1 - t);
};
/** A triangular prism, apex up, `depth` long along z and centered on its base: roofs and pediments */
function prism(w: number, h: number, depth: number) {
  const s = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, h)]);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
  g.translate(0, 0, -depth / 2);
  return g;
}
function tube(points: THREE.Vector3[], r: number) {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), points.length * 3, r, 5, false);
}

/** A span of a suspension bridge: tower top to tower top (or anchor), with vertical hangers down to the deck */
type Span = { z0: number; y0: number; z1: number; y1: number; dip: number };
function spanCables(spans: Span[], xs: number[], r: number) {
  return xs.flatMap((x) => spans.map((s) => tube(hang(s.z0, s.y0, s.z1, s.y1, s.dip, x), r)));
}
function hangers(spans: Span[], x: number, deck: number, step: number, w = 0.014): Item[] {
  return spans.flatMap((s) => {
    const out: Item[] = [];
    const [a, b] = s.z0 < s.z1 ? [s.z0, s.z1] : [s.z1, s.z0];
    for (let z = a + step; z < b - step / 2; z += step) {
      const top = cableY(s.z0, s.y0, s.z1, s.y1, s.dip, z);
      if (top - deck < 0.08) continue;
      out.push({ p: [x, (top + deck) / 2, z], s: [w, top - deck, w] });
    }
    return out;
  });
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
function Lamps({ items, env, color = "#ffd9a0", twinkle = 0, day = "#6b7278" }: { items: Item[]; env: Env; color?: string; twinkle?: number; day?: string }) {
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
const METAL: THREE.MeshStandardMaterialParameters = { metalness: 0.85, roughness: 0.3 };
const LEAD: THREE.MeshStandardMaterialParameters = { metalness: 0.4, roughness: 0.45 };
const ROUGH: THREE.MeshStandardMaterialParameters = { roughness: 0.85 };

/** A material whose glow follows the dark. `opts` must be a stable object (the constants above). */
function useGlow(color: string, emissive: string, k: number, env: Env, opts = NO_OPTS) {
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
const SF = { top: 14.5, crown: 2.7, half: 1.35, corner: 0.42, straight: 0.43, narrow: 0.72, crownNarrow: 0.62 };

function roundedSquare(half: number, r: number, hole?: number) {
  const outline = (h: number, c: number, path: THREE.Shape | THREE.Path) => {
    path.moveTo(-h + c, -h);
    path.lineTo(h - c, -h);
    path.quadraticCurveTo(h, -h, h, -h + c);
    path.lineTo(h, h - c);
    path.quadraticCurveTo(h, h, h - c, h);
    path.lineTo(-h + c, h);
    path.quadraticCurveTo(-h, h, -h, h - c);
    path.lineTo(-h, -h + c);
    path.quadraticCurveTo(-h, -h, -h + c, -h);
    return path;
  };
  const s = outline(half, r, new THREE.Shape()) as THREE.Shape;
  if (hole) s.holes.push(outline(hole, r * (hole / half), new THREE.Path()) as THREE.Path);
  return s;
}

/** An upright rounded-square prism whose faces run straight to `from` (share of its height), then curve in to `narrow` */
function taperedPrism(half: number, corner: number, h: number, from: number, narrow: number, steps: number) {
  const g = new THREE.ExtrudeGeometry(roundedSquare(half, corner), { depth: h, steps, bevelEnabled: false, curveSegments: 5 });
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = p.getY(i) / h;
    const k = t <= from ? 1 : 1 - (1 - narrow) * ((t - from) / (1 - from)) ** 1.5;
    p.setX(i, p.getX(i) * k);
    p.setZ(i, p.getZ(i) * k);
  }
  g.computeVertexNormals();
  return g;
}

/** Pale metal fins and glass by day; a scatter of lit floors after dark. One tile is one scene unit, about four floors. */
function useSalesforceSkin() {
  return useMemo(() => {
    const make = (lit: boolean) => {
      const c = document.createElement("canvas");
      c.width = c.height = 64;
      const g = c.getContext("2d")!;
      g.fillStyle = lit ? "#000" : "#b7bdc2";
      g.fillRect(0, 0, 64, 64);
      let s = 7;
      for (let row = 0; row < 4; row++)
        for (let col = 0; col < 8; col++) {
          const x = col * 8 + 2;
          const y = row * 16 + 3;
          if (lit) {
            s = (s * 16807) % 2147483647;
            if (s % 10 < 3) {
              g.fillStyle = `rgba(255,${200 + (s % 40)},${150 + (s % 50)},0.85)`;
              g.fillRect(x, y, 6, 11);
            }
          } else {
            g.fillStyle = "#7d868d";
            g.fillRect(x, y, 6, 11);
          }
        }
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      return t;
    };
    return { map: make(false), emissive: make(true) };
  }, []);
}

function SalesforceTower({ env }: { env: Env }) {
  const skin = useSalesforceSkin();
  const body = useMemo(() => taperedPrism(SF.half, SF.corner, SF.top, SF.straight, SF.narrow, 24), []);
  const crownHalf = SF.half * SF.narrow;
  const crown = useMemo(() => taperedPrism(crownHalf, SF.corner * SF.narrow, SF.crown, 0, SF.crownNarrow / SF.narrow, 6), [crownHalf]);
  // The lattice: open rings stepping up the crown, each a little narrower
  const rings = useMemo(
    () =>
      [0, 0.25, 0.5, 0.75, 1].map((t) => {
        const k = 1 - (1 - SF.crownNarrow / SF.narrow) * t ** 1.5;
        const h = crownHalf * k;
        const g = new THREE.ExtrudeGeometry(roundedSquare(h + 0.04, SF.corner * SF.narrow * k, h - 0.05), {
          depth: 0.07,
          bevelEnabled: false,
          curveSegments: 5,
        });
        g.rotateX(-Math.PI / 2);
        return { g, y: SF.top + t * SF.crown - 0.035 };
      }),
    [crownHalf],
  );
  const bodyMat = useRef<THREE.MeshStandardMaterial>(null);
  const glowMat = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(() => {
    if (bodyMat.current) bodyMat.current.emissiveIntensity = env.lit * 0.55;
    if (glowMat.current) glowMat.current.emissiveIntensity = 0.15 + env.lit * 0.5;
  });
  return (
    // Square to the South of Market grid, which runs about 45° off the Financial District's (and the Pyramid's)
    <group rotation={[0, Math.PI / 4, 0]}>
      <mesh geometry={body} castShadow receiveShadow>
        <meshStandardMaterial
          ref={bodyMat}
          color="#d9dde0"
          map={skin.map}
          emissive="#ffffff"
          emissiveMap={skin.emissive}
          emissiveIntensity={0}
          roughness={0.4}
          metalness={0.35}
        />
      </mesh>
      {/* The crown: see-through, with a soft glow from the light sculpture inside it */}
      <mesh geometry={crown} position={[0, SF.top, 0]}>
        <meshStandardMaterial
          ref={glowMat}
          color="#c9d1d6"
          emissive="#dfe8f0"
          emissiveIntensity={0.2}
          transparent
          opacity={0.22}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {rings.map(({ g, y }) => (
        <mesh key={y} geometry={g} position={[0, y, 0]} castShadow>
          <meshStandardMaterial color="#d5dadd" roughness={0.45} metalness={0.4} />
        </mesh>
      ))}
    </group>
  );
}


/* ------------------------------------------------------------------ Coit Tower */

/* Telegraph Hill, wooded, with Pioneer Park on top and the 210 ft fluted column: an arcade of arched windows
   under a scalloped cornice. Floodlit warm white at night. */
function CoitTower({ m }: { m: LandmarkMats }) {
  const hill = useMemo(() => hillGeometry(3), []);
  const trees = useMemo(() => hillTrees(7, 46, 2.7, 1.5, 2.7), []);
  const column = useMemo(() => {
    // Sixteen shallow flutes, pressed into a slightly tapering shaft
    const g = new THREE.CylinderGeometry(0.29, 0.32, 3, 64, 1, true);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const a = Math.atan2(p.getZ(i), p.getX(i));
      const k = 1 - 0.07 * Math.max(0, Math.cos(a * 16)) ** 0.6;
      p.setX(i, p.getX(i) * k);
      p.setZ(i, p.getZ(i) * k);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const arches = useMemo<Item[]>(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return { p: [Math.cos(a) * 0.335, 4.63, Math.sin(a) * 0.335], s: [0.075, 0.26, 0.05], r: [0, -a + Math.PI / 2, 0] };
      }),
    [],
  );
  return (
    <group>
      <mesh geometry={hill} scale={[2.7, 1.5, 2.7]} material={m.tree} castShadow receiveShadow />
      <Many material={m.tree} geometry={CONE} items={trees} shadow />
      {/* Pioneer Park's lawn and the lobby at the column's foot */}
      <mesh position={[0, 1.47, 0]} scale={[0.9, 0.06, 0.9]} geometry={CYL} material={m.stone} receiveShadow />
      <mesh position={[0, 1.62, 0]} scale={[0.95, 0.28, 0.95]} material={m.lit} castShadow>
        <boxGeometry />
      </mesh>
      <mesh geometry={column} position={[0, 1.5 + 1.5, 0]} material={m.lit} castShadow />
      {/* The observation gallery: a band of arches, then the cornice and a crenellated crown */}
      <mesh position={[0, 4.63, 0]} scale={[0.34, 0.36, 0.34]} geometry={CYL} material={m.lit} castShadow />
      <Many material={m.window} items={arches} />
      <mesh position={[0, 4.86, 0]} scale={[0.38, 0.08, 0.38]} geometry={CYL} material={m.lit} />
      <mesh position={[0, 4.97, 0]} scale={[0.33, 0.14, 0.33]} geometry={CYL} material={m.lit} />
    </group>
  );
}

/* ------------------------------------------------------------------ Ferry Building */

/* A long two-storey shed along the Embarcadero, arcaded, under a low roof, and its 245 ft clock tower (after
   Seville's Giralda): a plain shaft, an arcaded belfry, four clock faces that glow at night, stepped stages and a cupola. */
function FerryBuilding({ m, env }: { m: LandmarkMats; env: Env }) {
  const clock = useGlow("#e9e4d8", "#fff4dc", 1.1, env);
  const len = 6;
  const arcade = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (let i = 0; i < 26; i++) {
      const z = -len / 2 + 0.2 + (i * (len - 0.4)) / 25;
      if (Math.abs(z) < 0.35) continue;
      for (const x of [-0.56, 0.56]) out.push({ p: [x, 0.3, z], s: [0.02, 0.26, 0.12] }, { p: [x, 0.62, z], s: [0.02, 0.14, 0.1] });
    }
    return out;
  }, []);
  const belfry = useMemo<Item[]>(
    () =>
      [0, 1, 2, 3].flatMap((f) =>
        [-0.14, 0, 0.14].map((u) => {
          const a = (f * Math.PI) / 2;
          return { p: [Math.sin(a) * 0.28 + Math.cos(a) * u, 2.88, Math.cos(a) * 0.28 - Math.sin(a) * u] as V3, s: [0.08, 0.24, 0.02] as V3, r: [0, a, 0] as V3 };
        }),
      ),
    [],
  );
  const faces = useMemo<Item[]>(
    () =>
      [0, 1, 2, 3].map((f) => {
        const a = (f * Math.PI) / 2;
        // A disc stood up to face out: about x for the front and back, about z for the sides
        return { p: [Math.sin(a) * 0.235, 3.26, Math.cos(a) * 0.235], s: [0.16, 0.03, 0.16], r: f % 2 ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0] };
      }),
    [],
  );
  return (
    <group>
      <mesh position={[0, 0.4, 0]} scale={[1.1, 0.8, len]} material={m.lit} castShadow receiveShadow>
        <boxGeometry />
      </mesh>
      <mesh position={[0, 0.86, 0]} scale={[0.96, 0.12, len - 0.1]} material={m.stone} castShadow>
        <boxGeometry />
      </mesh>
      <Many material={m.window} items={arcade} />
      {/* The clock tower */}
      <mesh position={[0, 1.7, 0]} scale={[0.5, 2, 0.5]} material={m.lit} castShadow>
        <boxGeometry />
      </mesh>
      <mesh position={[0, 2.88, 0]} scale={[0.56, 0.36, 0.56]} material={m.lit} castShadow>
        <boxGeometry />
      </mesh>
      <Many material={m.window} items={belfry} />
      <mesh position={[0, 3.26, 0]} scale={[0.46, 0.4, 0.46]} material={m.lit} castShadow>
        <boxGeometry />
      </mesh>
      <Many material={clock} geometry={CYL} items={faces} />
      <mesh position={[0, 3.6, 0]} scale={[0.36, 0.28, 0.36]} material={m.lit} castShadow>
        <boxGeometry />
      </mesh>
      <mesh position={[0, 3.87, 0]} scale={[0.17, 0.26, 0.17]} material={m.lit} castShadow>
        <cylinderGeometry args={[1, 1, 1, 8]} />
      </mesh>
      <mesh position={[0, 4.0, 0]} scale={0.16} material={m.lit}>
        <sphereGeometry args={[1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh position={[0, 4.35, 0]} scale={[0.012, 0.5, 0.012]} geometry={CYL} material={m.stone} />
    </group>
  );
}

/* ------------------------------------------------------------------ Saints Peter and Paul */

/* The white Romanesque church on Washington Square: a nave behind a tall facade, a rose window, and twin spires
   in stages (tower, arcaded belfry, octagonal lantern, spire). Floodlit at night. */
function Church({ m, env }: { m: LandmarkMats; env: Env }) {
  const rose = useGlow("#3a3f45", "#ffcf8f", 1, env);
  const roof = useMemo(() => prism(1.04, 0.38, 1.9), []);
  const belfries = useMemo<Item[]>(
    () =>
      [-0.42, 0.42].flatMap((dx) =>
        [0, 1, 2, 3].map((f) => {
          const a = (f * Math.PI) / 2;
          return { p: [dx + Math.sin(a) * 0.17, 2.28, 0.72 + Math.cos(a) * 0.17] as V3, s: [0.12, 0.3, 0.02] as V3, r: [0, a, 0] as V3 };
        }),
      ),
    [],
  );
  return (
    <group>
      <mesh position={[0, 0.6, -0.2]} scale={[1, 1.2, 1.9]} material={m.lit} castShadow receiveShadow>
        <boxGeometry />
      </mesh>
      {/* The pitched nave roof */}
      <mesh position={[0, 1.2, -0.2]} geometry={roof} material={m.stone} castShadow />
      <mesh position={[0, 1.05, 0.78]} scale={[0.62, 1.4, 0.16]} material={m.lit} castShadow>
        <boxGeometry />
      </mesh>
      <mesh position={[0, 1.2, 0.865]} rotation={[Math.PI / 2, 0, 0]} scale={[0.17, 0.02, 0.17]} geometry={CYL} material={rose} />
      {[-0.42, 0.42].map((dx) => (
        <group key={dx} position={[dx, 0, 0.72]}>
          <mesh position={[0, 1.02, 0]} scale={[0.36, 2.04, 0.36]} material={m.lit} castShadow>
            <boxGeometry />
          </mesh>
          <mesh position={[0, 2.28, 0]} scale={[0.33, 0.48, 0.33]} material={m.lit} castShadow>
            <boxGeometry />
          </mesh>
          <mesh position={[0, 2.64, 0]} scale={[0.15, 0.26, 0.15]} material={m.lit} castShadow>
            <cylinderGeometry args={[1, 1, 1, 8]} />
          </mesh>
          <mesh position={[0, 3.1, 0]} scale={[0.15, 0.68, 0.15]} geometry={CONE} material={m.lit} castShadow />
        </group>
      ))}
      <Many material={m.window} items={belfries} />
    </group>
  );
}

/* ------------------------------------------------------------------ Alcatraz */

/* The Rock: the cellhouse along its spine, the lighthouse beside it (its lamp lit after dark), and the water
   tower on its stilts at the north end. */
function Alcatraz({ m, env }: { m: LandmarkMats; env: Env }) {
  const rock = useMemo(() => hillGeometry(11), []);
  const lamp = useGlow("#d9d4c6", "#fff2cc", 2.2, env);
  const cells = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (let i = 0; i < 9; i++) for (const z of [-0.26, 0.26]) out.push({ p: [-0.6 + i * 0.15, 0.95, z], s: [0.07, 0.12, 0.02] });
    return out;
  }, []);
  const legs = useMemo<Item[]>(() => [-1, 1].flatMap((a) => [-1, 1].map((b) => ({ p: [1.2 + a * 0.1, 0.95, b * 0.1] as V3, s: [0.02, 0.5, 0.02] as V3 }))), []);
  return (
    <group>
      <mesh geometry={rock} scale={[2.2, 0.72, 1.15]} material={m.tree} receiveShadow castShadow />
      <mesh position={[0, 0.9, 0]} scale={[1.45, 0.34, 0.5]} material={m.lit} castShadow>
        <boxGeometry />
      </mesh>
      <mesh position={[0, 1.1, 0]} scale={[1.35, 0.06, 0.42]} material={m.stone} />
      <Many material={m.window} items={cells} />
      {/* Lighthouse */}
      <group position={[-0.95, 0.62, 0.3]}>
        <mesh position={[0, 0.42, 0]} material={m.lit} castShadow>
          <cylinderGeometry args={[0.055, 0.085, 0.84, 8]} />
        </mesh>
        <mesh position={[0, 0.9, 0]} scale={[0.07, 0.1, 0.07]} geometry={CYL} material={lamp} />
      </group>
      {/* Water tower */}
      <Many material={m.stone} items={legs} />
      <mesh position={[1.2, 1.3, 0]} scale={[0.17, 0.2, 0.17]} geometry={CYL} material={m.stone} castShadow />
    </group>
  );
}

/* ------------------------------------------------------------------ Bay Bridge */

/* The western span as it stands: two suspension bridges end to end, meeting at a concrete anchorage mid-bay, with
   X-braced silver towers. Then Yerba Buena Island, and past it the white single-tower eastern span. After dark the
   western span's hangers carry the Bay Lights, 25,000 LEDs in a slow shimmer. Local +z runs toward San Francisco. */
const BB_TOWERS = [8.2, 2.6, -2.6, -8.2];
const SAS_BEACONS: Item[] = [-1, 1].map((x) => ({ p: [x * 0.07, 5.25, -19], s: [0.05, 0.05, 0.05] }));

function BayBridge({ m, env }: { m: LandmarkMats; env: Env }) {
  const H = 4.6;
  const deck = 1.2;
  const half = BRIDGE_HALF["bay-bridge"];
  const steel = useMemo(() => new THREE.MeshStandardMaterial({ color: "#a3acb3", roughness: 0.55, metalness: 0.35 }), []);
  const white = useGlow("#e8e8e4", "#ffffff", 0.18, env);
  const spans: Span[] = useMemo(
    () => [
      { z0: half, y0: 1.7, z1: 8.2, y1: H - 0.05, dip: 0.2 },
      { z0: 8.2, y0: H - 0.05, z1: 2.6, y1: H - 0.05, dip: H - 0.05 - (deck + 0.25) },
      { z0: 2.6, y0: H - 0.05, z1: 0, y1: 2.2, dip: 0.2 },
      { z0: 0, y0: 2.2, z1: -2.6, y1: H - 0.05, dip: 0.2 },
      { z0: -2.6, y0: H - 0.05, z1: -8.2, y1: H - 0.05, dip: H - 0.05 - (deck + 0.25) },
      { z0: -8.2, y0: H - 0.05, z1: -half, y1: 1.7, dip: 0.2 },
    ],
    [half],
  );
  const cables = useMemo(() => spanCables(spans, [-0.3, 0.3], 0.03), [spans]);
  const plainHangers = useMemo(() => hangers(spans, -0.3, deck, 0.22), [spans]);
  // The Bay Lights hang on the north side: here, the one facing the city's waterfront
  const lightHangers = useMemo(() => hangers(spans, 0.3, deck, 0.22, 0.02), [spans]);
  const frames = useMemo<Item[]>(() => {
    const out: Item[] = [];
    const levels = [deck + 0.05, 2.3, 3.4, H - 0.05];
    for (const tz of BB_TOWERS) {
      for (const x of [-0.3, 0.3]) out.push({ p: [x, H / 2, tz], s: [0.1, H, 0.14] });
      for (const y of levels) out.push({ p: [0, y, tz], s: [0.6, 0.08, 0.1] });
      for (let i = 0; i < levels.length - 1; i++) {
        const h = levels[i + 1] - levels[i];
        const len = Math.hypot(0.6, h);
        const a = Math.atan2(h, 0.6);
        const y = (levels[i] + levels[i + 1]) / 2;
        out.push({ p: [0, y, tz], s: [len, 0.035, 0.05], r: [0, 0, a] }, { p: [0, y, tz], s: [len, 0.035, 0.05], r: [0, 0, -a] });
      }
    }
    return out;
  }, []);
  const lamps = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (let z = -half; z <= half; z += 0.45) for (const x of [-0.26, 0.26]) out.push({ p: [x, deck + 0.13, z], s: [0.03, 0.03, 0.03] });
    return out;
  }, [half]);
  const island = useMemo(() => hillGeometry(23), []);
  const islandTrees = useMemo(() => hillTrees(5, 34, 3.1, 1.3, 2.3, 0.15), []);
  // The eastern span: one white tower, cables fanning down to either side of the deck
  const sas = useMemo(() => {
    const top = new THREE.Vector3(0, 5.2, -19);
    return [-1, 1].flatMap((side) =>
      [0.9, 1.6, 2.3, 3].map((d) => tube([top.clone().setY(4.8 - d * 0.35), new THREE.Vector3(side * 0.28, deck + 0.05, -19 + d * (side > 0 ? 1 : -1) * 1.1)], 0.018)),
    );
  }, []);
  return (
    <group>
      {/* Double deck: the upper roadway over a truss */}
      <mesh position={[0, deck, 0]} scale={[0.62, 0.12, half * 2]} material={steel} castShadow receiveShadow>
        <boxGeometry />
      </mesh>
      <mesh position={[0, deck - 0.2, 0]} scale={[0.54, 0.22, half * 2]} material={steel}>
        <boxGeometry />
      </mesh>
      <Many material={steel} items={frames} shadow />
      {cables.map((g, i) => (
        <mesh key={i} geometry={g} material={steel} />
      ))}
      <Many material={steel} items={plainHangers} />
      <Lamps items={lightHangers} env={env} color="#f4f7ff" day="#a3acb3" twinkle={1} />
      <Lamps items={lamps} env={env} />
      {/* Anchorages: the city end and the great concrete block mid-bay */}
      <mesh position={[0, 1, half]} scale={[0.9, 2, 1]} material={m.lit} castShadow>
        <boxGeometry />
      </mesh>
      <mesh position={[0, 1.2, 0]} scale={[0.9, 2.4, 1.1]} material={m.lit} castShadow>
        <boxGeometry />
      </mesh>
      {/* Yerba Buena Island, and the tunnel the deck runs into */}
      <group position={[0, 0, -half - 2.6]}>
        <mesh geometry={island} scale={[3.1, 1.3, 2.3]} material={m.tree} castShadow receiveShadow />
        <Many material={m.tree} geometry={CONE} items={islandTrees} shadow />
      </group>
      <mesh position={[0, 0.95, -half - 0.4]} scale={[0.8, 0.9, 0.8]} material={m.stone}>
        <boxGeometry />
      </mesh>
      {/* The eastern span */}
      <mesh position={[0, deck, -19]} scale={[0.66, 0.12, 7.2]} material={white} castShadow>
        <boxGeometry />
      </mesh>
      <mesh position={[0, 2.6, -19]} scale={[0.22, 5.2, 0.3]} material={white} castShadow>
        <boxGeometry />
      </mesh>
      {sas.map((g, i) => (
        <mesh key={i} geometry={g} material={white} />
      ))}
      <Lamps items={SAS_BEACONS} env={env} color="#ff3b30" day="#8a3a33" />
    </group>
  );
}

/* ------------------------------------------------------------------ Golden Gate Bridge */

/* International Orange. Art Deco towers whose legs step in as they rise, tied by portal struts; the main cables sag
   almost to the deck at mid-span and hangers drop every few metres. At night the towers are uplit and red aircraft
   lights sit on top. Local +z runs toward San Francisco. */
function GoldenGate({ env }: { env: Env }) {
  const H = 6.2;
  const deck = 1.4;
  const half = BRIDGE_HALF["golden-gate"];
  const red = useGlow(GG_RED, GG_RED, 0.22, env);
  const tz = 4.2;
  const spans: Span[] = useMemo(
    () => [
      { z0: half, y0: deck + 0.15, z1: tz, y1: H - 0.1, dip: 0.3 },
      { z0: tz, y0: H - 0.1, z1: -tz, y1: H - 0.1, dip: H - 0.1 - (deck + 0.2) },
      { z0: -tz, y0: H - 0.1, z1: -half, y1: deck + 0.15, dip: 0.3 },
    ],
    [half],
  );
  const cables = useMemo(() => spanCables(spans, [-0.27, 0.27], 0.035), [spans]);
  const drops = useMemo(() => [...hangers(spans, -0.27, deck, 0.2, 0.012), ...hangers(spans, 0.27, deck, 0.2, 0.012)], [spans]);
  const frames = useMemo<Item[]>(() => {
    const out: Item[] = [];
    const steps: [number, number, number][] = [
      [0, 2.7, 0.18],
      [2.7, 4.5, 0.155],
      [4.5, H, 0.13],
    ];
    for (const z of [tz, -tz]) {
      for (const x of [-0.27, 0.27]) for (const [a, b, w] of steps) out.push({ p: [x, (a + b) / 2, z], s: [w, b - a, w * 1.3] });
      for (const y of [0.9, 2.55, 3.55, 4.45, 5.3, H - 0.05]) out.push({ p: [0, y, z], s: [0.54, 0.1, 0.13] });
    }
    return out;
  }, []);
  const lamps = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (let z = -half; z <= half; z += 0.5) for (const x of [-0.24, 0.24]) out.push({ p: [x, deck + 0.12, z], s: [0.03, 0.03, 0.03] });
    return out;
  }, [half]);
  const beacons = useMemo<Item[]>(() => [tz, -tz].flatMap((z) => [-0.27, 0.27].map((x) => ({ p: [x, H + 0.06, z] as V3, s: [0.06, 0.06, 0.06] as V3 }))), []);
  return (
    <group>
      <mesh position={[0, deck, 0]} scale={[0.5, 0.16, half * 2]} material={red} castShadow receiveShadow>
        <boxGeometry />
      </mesh>
      <Many material={red} items={frames} shadow />
      {cables.map((g, i) => (
        <mesh key={i} geometry={g} material={red} />
      ))}
      <Many material={red} items={drops} />
      <Lamps items={lamps} env={env} />
      <Lamps items={beacons} env={env} color="#ff3b30" day="#b5432f" />
      {/* Anchorage blocks where the cables come down at either end */}
      {[half, -half].map((z) => (
        <mesh key={z} position={[0, 0.8, z]} scale={[0.8, 1.6, 0.9]} material={red} castShadow>
          <boxGeometry />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ Oracle Park */

/* The Giants' ballpark on the waterfront: a brick seating bowl wrapped around home plate, open to the bay past right
   field, light towers on the rim, the clock tower over the Willie Mays Gate, and the giant Coke bottle and glove in
   left field. After dark the field glows under the lights. Local −z points to center field. */
function sector(r1: number, r2: number, a0: number, a1: number) {
  const s = new THREE.Shape();
  s.absarc(0, 0, r2, a0, a1, false);
  s.absarc(0, 0, r1, a1, a0, true);
  return s;
}
function flat(shape: THREE.Shape, depth: number) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 28 });
  g.rotateX(-Math.PI / 2);
  return g;
}
const deg = (d: number) => (d * Math.PI) / 180;

function Ballpark({ m, env }: { m: LandmarkMats; env: Env }) {
  const brick = useGlow("#a65a40", "#ffb48a", 0.08, env, ROUGH);
  const seats = useMemo(() => new THREE.MeshStandardMaterial({ color: "#5d7282", roughness: 0.8 }), []);
  const grass = useGlow("#3f6b3c", "#7fbf6a", 0.35, env);
  const dirt = useGlow("#8a6a4c", "#c79a6c", 0.25, env);
  const coke = useMemo(() => new THREE.MeshStandardMaterial({ color: "#6d2a26", roughness: 0.5 }), []);
  const glove = useMemo(() => new THREE.MeshStandardMaterial({ color: "#7a5230", roughness: 0.8 }), []);
  const g = useMemo(
    () => ({
      field: flat(sector(0, 2.05, deg(45), deg(135)), 0.03),
      foul: flat(sector(0, 1.2, deg(135), deg(405)), 0.03),
      lower: flat(sector(1.2, 1.62, deg(140), deg(400)), 0.34),
      upper: flat(sector(1.55, 2.0, deg(165), deg(375)), 0.78),
      wall: flat(sector(2.05, 2.12, deg(45), deg(140)), 0.16),
    }),
    [],
  );
  const poles = useMemo(() => [155, 205, 250, 290, 335, 25].map((a) => [Math.cos(deg(a)) * 2.05, -Math.sin(deg(a)) * 2.05, deg(a)] as const), []);
  const heads = useMemo<Item[]>(() => poles.map(([x, z, a]) => ({ p: [x, 1.72, z], s: [0.22, 0.1, 0.03], r: [0, a + Math.PI / 2, 0] })), [poles]);
  return (
    <group position={[0, 0, 0.9]}>
      <mesh geometry={g.foul} material={grass} receiveShadow />
      <mesh geometry={g.field} material={grass} receiveShadow />
      <mesh position={[0, 0.035, -0.4]} rotation={[-Math.PI / 2, 0, Math.PI / 4]} material={dirt}>
        <planeGeometry args={[0.52, 0.52]} />
      </mesh>
      <mesh position={[0, 0.04, -0.4]} rotation={[-Math.PI / 2, 0, Math.PI / 4]} material={grass}>
        <planeGeometry args={[0.36, 0.36]} />
      </mesh>
      <mesh geometry={g.lower} material={[seats, brick]} castShadow receiveShadow />
      <mesh geometry={g.upper} material={[seats, brick]} castShadow receiveShadow />
      <mesh geometry={g.wall} material={seats} />
      {poles.map(([x, z]) => (
        <mesh key={x} position={[x, 0.86, z]} scale={[0.025, 1.72, 0.025]} geometry={CYL} material={m.stone} />
      ))}
      <Lamps items={heads} env={env} color="#f6f8ff" day="#b9bec2" />
      {/* The clock tower over the gate behind home plate */}
      <group position={[0, 0, 2.18]}>
        <mesh position={[0, 0.7, 0]} scale={[0.3, 1.4, 0.3]} material={brick} castShadow>
          <boxGeometry />
        </mesh>
        <mesh position={[0, 1.18, 0.155]} rotation={[Math.PI / 2, 0, 0]} scale={[0.1, 0.02, 0.1]} geometry={CYL} material={m.window} />
        <mesh position={[0, 1.55, 0]} rotation={[0, Math.PI / 4, 0]} scale={[0.24, 0.3, 0.24]} material={m.stone}>
          <coneGeometry args={[1, 1, 4]} />
        </mesh>
      </group>
      {/* The Coke bottle and the old-time glove, beyond the left-field bleachers */}
      <group position={[Math.cos(deg(122)) * 2.4, 0, -Math.sin(deg(122)) * 2.4]} scale={0.55}>
        <mesh position={[0, 0.35, 0]} scale={[0.13, 0.7, 0.13]} geometry={CYL} material={coke} castShadow />
        <mesh position={[0, 0.85, 0]} material={coke} castShadow>
          <cylinderGeometry args={[0.04, 0.13, 0.32, 12]} />
        </mesh>
        <mesh position={[0.34, 0.2, 0.12]} scale={[0.2, 0.24, 0.1]} rotation={[0, 0.6, 0.2]} material={glove} castShadow>
          <sphereGeometry args={[1, 12, 10]} />
        </mesh>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ City Hall */

/* Beaux-Arts City Hall on Civic Center Plaza: a long colonnaded front between end pavilions, and the dome, taller
   than the Capitol's, on a colonnaded drum, capped by a gilded lantern. Local +z is the front, facing the plaza. */
function CityHall({ m, env }: { m: LandmarkMats; env: Env }) {
  const dome = useGlow("#76847f", "#c9d6cf", 0.12, env, LEAD);
  const gold = useGlow("#c8a04c", "#ffd27a", 0.5, env, METAL);
  const pediment = useMemo(() => prism(1, 0.22, 0.32), []);
  const front = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (let i = 0; i < 16; i++) {
      const x = -1.05 + (i * 2.1) / 15;
      if (Math.abs(x) < 0.4) continue;
      out.push({ p: [x, 0.52, 0.8], s: [0.035, 0.62, 0.035] });
    }
    for (let i = 0; i < 6; i++) out.push({ p: [-0.32 + i * 0.128, 0.56, 0.98], s: [0.04, 0.7, 0.04] });
    return out;
  }, []);
  const drum = useMemo<Item[]>(
    () =>
      Array.from({ length: 20 }, (_, i) => {
        const a = (i / 20) * Math.PI * 2;
        return { p: [Math.cos(a) * 0.56, 1.42, Math.sin(a) * 0.56], s: [0.03, 0.52, 0.03] };
      }),
    [],
  );
  const windows = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (let i = 0; i < 13; i++) {
      const x = -1.1 + (i * 2.2) / 12;
      if (Math.abs(x) < 0.45) continue;
      out.push({ p: [x, 0.55, 0.755], s: [0.07, 0.36, 0.02] });
    }
    return out;
  }, []);
  return (
    <group>
      <mesh position={[0, 0.08, 0.1]} scale={[3.1, 0.16, 1.9]} material={m.stone} receiveShadow>
        <boxGeometry />
      </mesh>
      <mesh position={[0, 0.5, 0]} scale={[2.8, 0.84, 1.5]} material={m.lit} castShadow receiveShadow>
        <boxGeometry />
      </mesh>
      <Many material={m.window} items={windows} />
      {[-1.25, 1.25].map((x) => (
        <mesh key={x} position={[x, 0.56, 0.05]} scale={[0.5, 0.96, 1.6]} material={m.lit} castShadow>
          <boxGeometry />
        </mesh>
      ))}
      {/* The central portico and its pediment */}
      <mesh position={[0, 0.2, 0.95]} scale={[0.95, 0.08, 0.35]} material={m.stone}>
        <boxGeometry />
      </mesh>
      <mesh position={[0, 0.95, 0.95]} scale={[0.95, 0.12, 0.35]} material={m.lit} castShadow>
        <boxGeometry />
      </mesh>
      <mesh position={[0, 1.01, 0.95]} geometry={pediment} material={m.lit} castShadow />
      <Many material={m.lit} geometry={CYL} items={front} shadow />
      {/* The drum, its colonnade, the dome and the lantern */}
      <mesh position={[0, 1.1, 0]} scale={[0.62, 0.22, 0.62]} geometry={CYL} material={m.lit} castShadow />
      <mesh position={[0, 1.42, 0]} scale={[0.5, 0.52, 0.5]} geometry={CYL} material={m.lit} castShadow />
      <Many material={m.lit} geometry={CYL} items={drum} />
      <mesh position={[0, 1.71, 0]} scale={[0.62, 0.07, 0.62]} geometry={CYL} material={m.lit} />
      <mesh position={[0, 1.83, 0]} scale={[0.5, 0.18, 0.5]} geometry={CYL} material={m.lit} />
      <mesh position={[0, 1.92, 0]} scale={[0.5, 0.68, 0.5]} material={dome} castShadow>
        <sphereGeometry args={[1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh position={[0, 2.72, 0]} scale={[0.11, 0.3, 0.11]} geometry={CYL} material={gold} />
      <mesh position={[0, 2.9, 0]} scale={0.1} material={gold}>
        <sphereGeometry args={[1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh position={[0, 3.08, 0]} scale={[0.03, 0.3, 0.03]} geometry={CONE} material={gold} />
    </group>
  );
}

/* ------------------------------------------------------------------ placement */

const BIG = { ballpark: 1.35, "city-hall": 1.5 };

/** One landmark, placed and turned. `heading` is the model's long axis (bridges, the Ferry Building) or its front. */
export function LandmarkModel({ l, m, env }: { l: SceneLandmark; m: LandmarkMats; env: Env }) {
  const h = ((l.heading ?? 0) * Math.PI) / 180;
  // Models run along local +z: turning by −h lays that axis on the compass heading
  const along = [0, -h, 0] as const;
  // Models face local +z: turning by π−h faces them along the heading
  const facing = [0, Math.PI - h, 0] as const;
  const at = [l.x, 0, l.z] as const;
  switch (l.kind) {
    case "coit":
      return (
        <group position={at}>
          <CoitTower m={m} />
        </group>
      );
    case "skyscraper":
      return (
        <group position={at}>
          <SalesforceTower env={env} />
        </group>
      );
    case "ferry":
      return (
        <group position={at} rotation={along}>
          <FerryBuilding m={m} env={env} />
        </group>
      );
    case "church":
      return (
        <group position={at} rotation={facing}>
          <Church m={m} env={env} />
        </group>
      );
    case "island":
      return (
        <group position={at} rotation={[0, 0.5, 0]}>
          <Alcatraz m={m} env={env} />
        </group>
      );
    case "bay-bridge":
      return (
        <group position={at} rotation={along}>
          <BayBridge m={m} env={env} />
        </group>
      );
    case "golden-gate":
      return (
        <group position={at} rotation={along}>
          <GoldenGate env={env} />
        </group>
      );
    // These two stand low among the city blocks; drawn larger than life, like the rest, so they clear the rooftops
    case "ballpark":
      return (
        <group position={at} rotation={facing} scale={BIG.ballpark}>
          <Ballpark m={m} env={env} />
        </group>
      );
    case "city-hall":
      return (
        <group position={at} rotation={facing} scale={BIG["city-hall"]}>
          <CityHall m={m} env={env} />
        </group>
      );
  }
}

/** Where a landmark's label floats: just above its highest point */
export function landmarkTop(l: SceneLandmark) {
  const h = {
    coit: 5.05,
    skyscraper: SF.top + SF.crown,
    ferry: 4.6,
    church: 3.45,
    island: 1.7,
    "bay-bridge": 5,
    "golden-gate": 6.4,
    ballpark: 1.9 * BIG.ballpark,
    "city-hall": 3.2 * BIG["city-hall"],
  }[l.kind];
  return new THREE.Vector3(l.x, h + 0.35, l.z);
}

/** The landmarks. Like the city blocks, one standing between the camera and the focus sinks out of the way. */
export function Landmarks({ p, env, focus, sink = true }: { p: TowerProfile; env: Env; focus: RefObject<THREE.Vector3>; sink?: boolean }) {
  const m = useLandmarkMats(env);
  const list = useMemo(() => sceneLandmarks(p), [p]);
  const groups = useRef<(THREE.Group | null)[]>([]);
  const k = useRef(list.map(() => 1));
  useFrame(({ camera }, dt) => {
    const f = focus.current;
    const dist = camera.position.distanceTo(f);
    _ray.set(camera.position, _dir.subVectors(f, camera.position).normalize());
    list.forEach((l, i) => {
      const g = groups.current[i];
      const reach = LANDMARK_REACH[l.kind];
      if (!g || !reach) return;
      const { x, z } = l;
      _box.min.set(x - reach, 0, z - reach);
      _box.max.set(x + reach, landmarkTop(l).y, z + reach);
      const hit = _ray.intersectBox(_box, _hit);
      // When looking out from a floor, the landmarks in front of you are the point: never sink them.
      const blocking = sink && !!hit && camera.position.distanceTo(hit) < dist;
      k.current[i] = THREE.MathUtils.damp(k.current[i], blocking ? 0.03 : 1, blocking ? 5 : 2.5, dt);
      g.scale.y = k.current[i];
    });
  });
  return (
    <>
      {list.map((l, i) => (
        <group
          key={l.name}
          ref={(el) => {
            groups.current[i] = el;
          }}
        >
          <LandmarkModel l={l} m={m} env={env} />
        </group>
      ))}
    </>
  );
}
