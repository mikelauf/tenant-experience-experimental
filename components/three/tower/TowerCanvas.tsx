"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, PerformanceMonitor } from "@react-three/drei";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { levelY, neighborsFor, sceneLandmarks, topOf, treesFor, trueNorth, type Landmark, type SceneLandmark, type TowerProfile } from "@/lib/tower";

/* ------------------------------------------------------------------ light */

/**
 * Three keyframes of light. `sun` runs 0 (night) → 0.5 (dusk) → 1 (day) and
 * everything in the scene blends between them, so a time scrubber can relight the city.
 */
type Key = {
  slab: string;
  wing: string;
  tree: string;
  ground: string;
  neighbor: string;
  water: string;
  fog: string;
  sky: string;
  skyGround: string;
  sun: string;
  hemi: number;
  sunI: number;
  lit: number;
  shadow: number;
  sunPos: [number, number, number];
};

const KEYS: Record<"night" | "dusk" | "day", Key> = {
  night: {
    slab: "#c3c6ca",
    wing: "#8d9296",
    tree: "#121a15",
    ground: "#0e1317",
    neighbor: "#1b222a",
    water: "#0b151d",
    fog: "#0a0e12",
    sky: "#40506a",
    skyGround: "#161c24",
    sun: "#b9c9ea",
    hemi: 0.75,
    sunI: 0.5,
    lit: 1.8,
    shadow: 0.55,
    sunPos: [-6, 10, -8],
  },
  dusk: {
    slab: "#e4e2dd",
    wing: "#c4c3c0",
    tree: "#1d2a22",
    ground: "#1b2126",
    neighbor: "#303a44",
    water: "#233444",
    fog: "#151b21",
    sky: "#7890ad",
    skyGround: "#3a4450",
    sun: "#f6d8c2",
    hemi: 1.5,
    sunI: 1.15,
    lit: 1.5,
    shadow: 0.5,
    sunPos: [-10, 5, 6],
  },
  day: {
    slab: "#efece5",
    wing: "#e4e0d7",
    tree: "#33443a",
    ground: "#e2e0d9",
    neighbor: "#d9d7d0",
    water: "#b7c7cd",
    fog: "#e9e8e3",
    sky: "#dfe7ea",
    skyGround: "#e2e0d9",
    sun: "#fff3e2",
    hemi: 1.1,
    sunI: 2.2,
    lit: 0,
    shadow: 0.35,
    sunPos: [8, 14, 6],
  },
};

const COLORS = ["slab", "wing", "tree", "ground", "neighbor", "water", "fog", "sky", "skyGround", "sun"] as const;
const NUMS = ["hemi", "sunI", "lit", "shadow"] as const;
type Env = Record<(typeof COLORS)[number], THREE.Color> & Record<(typeof NUMS)[number], number> & { sunPos: THREE.Vector3; value: number };

const _a = new THREE.Color();
const _b = new THREE.Color();
const _v = new THREE.Vector3();
function mixEnv(sun: number, out: Env) {
  const [a, b, t] = sun < 0.5 ? [KEYS.night, KEYS.dusk, sun / 0.5] : [KEYS.dusk, KEYS.day, (sun - 0.5) / 0.5];
  for (const k of COLORS) out[k].copy(_a.set(a[k])).lerp(_b.set(b[k]), t);
  for (const k of NUMS) out[k] = a[k] + (b[k] - a[k]) * t;
  out.sunPos.set(...a.sunPos).lerp(_v.set(...b.sunPos), t);
  out.value = sun;
  return out;
}
const makeEnv = (sun: number): Env =>
  mixEnv(sun, {
    ...(Object.fromEntries(COLORS.map((k) => [k, new THREE.Color()])) as Record<(typeof COLORS)[number], THREE.Color>),
    ...(Object.fromEntries(NUMS.map((k) => [k, 0])) as Record<(typeof NUMS)[number], number>),
    sunPos: new THREE.Vector3(),
    value: sun,
  });

/** Eases the light toward the requested sun and applies it to the fog and lights. */
function Sky({ sun, env }: { sun: number; env: Env }) {
  const { scene } = useThree();
  const hemi = useRef<THREE.HemisphereLight>(null);
  const dir = useRef<THREE.DirectionalLight>(null);
  useFrame((_, dt) => {
    const v = THREE.MathUtils.damp(env.value, sun, 3, dt);
    mixEnv(Math.abs(v - sun) < 0.001 ? sun : v, env);
    const e = env;
    if (scene.fog instanceof THREE.Fog) scene.fog.color.copy(e.fog);
    if (hemi.current) {
      hemi.current.color.copy(e.sky);
      hemi.current.groundColor.copy(e.skyGround);
      hemi.current.intensity = e.hemi;
    }
    if (dir.current) {
      dir.current.color.copy(e.sun);
      dir.current.intensity = e.sunI;
      dir.current.position.copy(e.sunPos);
    }
  });
  const e = env;
  return (
    <>
      <fog attach="fog" args={[e.fog, 30, 80]} />
      <hemisphereLight ref={hemi} args={[e.sky, e.skyGround, e.hemi]} />
      <directionalLight
        ref={dir}
        position={e.sunPos}
        intensity={e.sunI}
        color={e.sun}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={14}
        shadow-camera-bottom={-4}
      />
    </>
  );
}

/* ------------------------------------------------------------------ tower */

/** Vertical window slits; the emissive twin lights some of them after dark. */
function useFacadeTextures(p: TowerProfile) {
  return useMemo(() => {
    const make = (lit: boolean) => {
      const c = document.createElement("canvas");
      c.width = 256;
      c.height = 16;
      const g = c.getContext("2d")!;
      g.fillStyle = lit ? "#000" : "#ffffff";
      g.fillRect(0, 0, 256, 16);
      const slot = 252 / p.facade.slits;
      let s = 3;
      for (let i = 0; i < p.facade.slits; i++) {
        const x = 4 + i * slot;
        if (lit) {
          s = (s * 16807) % 2147483647;
          const on = s % 5 < 2;
          g.fillStyle = on ? `rgba(255,${170 + (s % 50)},${90 + (s % 40)},${0.55 + (s % 40) / 100})` : "#000";
        } else {
          g.fillStyle = "#8a8f94";
        }
        g.fillRect(x, 3, slot * p.facade.width, 10);
      }
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      return t;
    };
    return { map: make(false), emissive: make(true) };
  }, [p]);
}

/** The pickable level a slab belongs to, if any: venue floors are thin, so a floor either side counts too. */
function snap(floor: number, pickable: number[] | undefined, p: TowerProfile): number | null {
  if (!pickable) return floor;
  let best: number | null = null;
  for (const l of pickable) {
    const slab = Math.min(l, p.floors - 1);
    if (Math.abs(slab - floor) <= 1 && (best == null || Math.abs(slab - floor) < Math.abs(Math.min(best, p.floors - 1) - floor))) best = l;
  }
  return best;
}

function Tower({
  p,
  env,
  glow,
  onPick,
  onHover,
  pickable,
}: {
  p: TowerProfile;
  env: Env;
  glow: string;
  onPick?: (floor: number) => void;
  onHover?: (floor: number | null) => void;
  pickable?: number[];
}) {
  const slabs = useRef<THREE.InstancedMesh>(null);
  const wings = useRef<THREE.InstancedMesh>(null);
  const slabMat = useRef<THREE.MeshStandardMaterial>(null);
  const wingMat = useRef<THREE.MeshStandardMaterial>(null);
  const crownMat = useRef<THREE.MeshStandardMaterial>(null);
  const tex = useFacadeTextures(p);
  const top = topOf(p);
  const { gl } = useThree();
  const hoverTo = (raw: number | null) => {
    const f = raw == null ? null : snap(raw, pickable, p);
    gl.domElement.style.cursor = f == null ? "grab" : "pointer";
    onHover?.(f);
  };
  const wingCount = p.wings ? (p.wings.to - p.wings.from) * 2 : 0;

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    for (let i = 0; i < p.floors; i++) {
      m.compose(new THREE.Vector3(0, i * p.floorH + p.floorH / 2, 0), q, new THREE.Vector3(p.widthAt(i), p.floorH * 0.94, p.depthAt(i)));
      slabs.current!.setMatrixAt(i, m);
    }
    slabs.current!.instanceMatrix.needsUpdate = true;
    slabs.current!.computeBoundingSphere();

    if (p.wings && wings.current) {
      let k = 0;
      const { from, to } = p.wings;
      for (let i = from; i < to; i++) {
        const w = p.widthAt(Math.min(i, p.floors + 2));
        const t = (i - from) / (to - from);
        const depth = 0.36 - t * 0.12;
        for (const side of [-1, 1]) {
          m.compose(new THREE.Vector3(side * (w / 2 + 0.09), i * p.floorH + p.floorH / 2, 0), q, new THREE.Vector3(0.2, p.floorH * 0.98, depth));
          wings.current.setMatrixAt(k++, m);
        }
      }
      wings.current.instanceMatrix.needsUpdate = true;
    }
  }, [p]);

  useFrame(() => {
    const e = env;
    if (slabMat.current) {
      slabMat.current.color.copy(e.slab);
      slabMat.current.emissiveIntensity = e.lit;
    }
    wingMat.current?.color.copy(e.wing);
    if (crownMat.current) {
      crownMat.current.color.copy(e.wing);
      // The spire catches the last light; a lantern glows the building's color
      crownMat.current.emissiveIntensity = p.crown.kind === "lantern" ? 0.2 + e.lit * 0.9 : (e.lit / 1.5) * 0.35;
    }
  });

  const pick = (e: ThreeEvent<MouseEvent>) => {
    if (!onPick || e.instanceId == null || e.delta > 8) return;
    const f = snap(e.instanceId, pickable, p);
    if (f == null) return;
    e.stopPropagation();
    onPick(f);
  };

  const e0 = env;
  return (
    <group>
      <instancedMesh
        ref={slabs}
        args={[undefined, undefined, p.floors]}
        castShadow
        receiveShadow
        onClick={onPick ? pick : undefined}
        onPointerMove={
          onHover
            ? (e) => {
                e.stopPropagation();
                hoverTo(e.instanceId ?? null);
              }
            : undefined
        }
        onPointerOut={onHover ? () => hoverTo(null) : undefined}
      >
        <boxGeometry />
        <meshStandardMaterial
          ref={slabMat}
          color={e0.slab}
          map={tex.map}
          emissive="#ffffff"
          emissiveMap={tex.emissive}
          emissiveIntensity={e0.lit}
          roughness={0.82}
          metalness={0.05}
        />
      </instancedMesh>
      {p.wings && (
        <instancedMesh ref={wings} args={[undefined, undefined, wingCount]} castShadow>
          <boxGeometry />
          <meshStandardMaterial ref={wingMat} color={e0.wing} roughness={0.7} metalness={0.15} />
        </instancedMesh>
      )}
      {p.crown.kind === "spire" ? (
        <mesh position={[0, top + p.crown.height / 2, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[p.crown.radius, p.crown.height, 4, 1]} />
          <meshStandardMaterial ref={crownMat} color={e0.wing} roughness={0.45} metalness={0.35} emissive="#ffd2a8" emissiveIntensity={0} />
        </mesh>
      ) : (
        <group position={[0, top, 0]}>
          <mesh position={[0, p.crown.height / 2, 0]} rotation={[0, Math.PI / 8, 0]} castShadow>
            <cylinderGeometry args={[p.crown.radius * 0.82, p.crown.radius, p.crown.height, 8, 1]} />
            <meshStandardMaterial ref={crownMat} color={e0.wing} roughness={0.4} metalness={0.3} emissive={glow} emissiveIntensity={0.2} toneMapped={false} />
          </mesh>
          <mesh position={[0, p.crown.height + p.crown.mast / 2, 0]} castShadow>
            <coneGeometry args={[0.09, p.crown.mast, 8, 1]} />
            <meshStandardMaterial color="#9aa0a6" roughness={0.35} metalness={0.6} />
          </mesh>
        </group>
      )}
      {/* Base plinth */}
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <boxGeometry args={[p.widthAt(0) + 0.5, 0.12, p.depthAt(0) + 0.5]} />
        <meshStandardMaterial color={e0.wing} roughness={0.9} />
      </mesh>
    </group>
  );
}

function Park({ p, env, glow, color, onPick }: { p: TowerProfile; env: Env; glow: number; color: string; onPick?: () => void }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const trees = useMemo(() => treesFor(p), [p]);
  const round = p.park?.shape === "round";
  useLayoutEffect(() => {
    if (!ref.current) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    trees.forEach(([x, z, h], i) => {
      if (round) m.compose(new THREE.Vector3(x, h * 0.42 + 0.1, z), q, new THREE.Vector3(0.5 + h * 0.2, h * 0.62, 0.5 + h * 0.2));
      else m.compose(new THREE.Vector3(x, h / 2 + 0.1, z), q, new THREE.Vector3(0.42 + h * 0.08, h, 0.42 + h * 0.08));
      ref.current!.setMatrixAt(i, m);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [trees, round]);
  useFrame((_, dt) => {
    if (!mat.current) return;
    mat.current.color.copy(env.tree);
    mat.current.emissiveIntensity = THREE.MathUtils.damp(mat.current.emissiveIntensity, glow, 4, dt);
  });
  if (!trees.length) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, trees.length]}
      castShadow
      onClick={
        onPick
          ? (e) => {
              if (e.delta > 8) return;
              e.stopPropagation();
              onPick();
            }
          : undefined
      }
    >
      {round ? <icosahedronGeometry args={[0.5, 1]} /> : <coneGeometry args={[0.5, 1, 7]} />}
      <meshStandardMaterial ref={mat} color={env.tree} roughness={0.95} emissive={color} emissiveIntensity={0} flatShading={round} />
    </instancedMesh>
  );
}

/* ------------------------------------------------------------------ city */

/** Per-building heights for merged geometry: a strip of factors the vertex shader reads by building id */
type Sink = { tex: THREE.DataTexture; n: number };

function injectSink(sh: THREE.WebGLProgramParametersWithUniforms, sink: Sink) {
  sh.uniforms.uSink = { value: sink.tex };
  sh.uniforms.uSinkN = { value: sink.n };
  sh.vertexShader = sh.vertexShader
    .replace("#include <common>", "#include <common>\nattribute float aId;\nuniform sampler2D uSink;\nuniform float uSinkN;")
    .replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed.y *= texture2D(uSink, vec2((aId + 0.5) / uSinkN, 0.5)).r;");
}

/**
 * Procedural windows in world space, so every block gets the same crisp,
 * floor-sized grid at any height or pixel density; after dark some are lit.
 * Works on instanced blocks and on merged real footprints (with `sink`), at any wall angle.
 */
function useCityMaterial(env: Env, floor: number, sink?: Sink) {
  const uniforms = useMemo(() => ({ uLit: { value: 0 }, uFloor: { value: floor } }), [floor]);
  const mat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color: env.neighbor, roughness: 0.92 });
    m.customProgramCacheKey = () => (sink ? "city-sink" : "city");
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uLit = uniforms.uLit;
      sh.uniforms.uFloor = uniforms.uFloor;
      if (sink) injectSink(sh, sink);
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWP;\nvarying vec3 vWN;").replace(
        "#include <project_vertex>",
        `#include <project_vertex>
          #ifdef USE_INSTANCING
            mat4 cityM = modelMatrix * instanceMatrix;
          #else
            mat4 cityM = modelMatrix;
          #endif
          vWP = (cityM * vec4(transformed, 1.0)).xyz;
          vWN = normalize(mat3(cityM) * objectNormal);`,
      );
      sh.fragmentShader = sh.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
          varying vec3 vWP;
          varying vec3 vWN;
          uniform float uLit;
          uniform float uFloor;
          float cityHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float cityBand(float x, float a, float b) {
            float w = fwidth(x);
            float f = fract(x);
            return smoothstep(a - w, a + w, f) - smoothstep(b - w, b + w, f);
          }`,
        )
        .replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>
          if (abs(vWN.y) < 0.5) {
            // Along the wall, whichever way it faces
            vec2 tn = normalize(vec2(-vWN.z, vWN.x));
            float along = dot(vWP.xz, tn) / 0.15;
            float up = vWP.y / uFloor;
            float win = cityBand(along, 0.28, 0.72) * cityBand(up, 0.22, 0.78);
            float lit = step(0.7, cityHash(vec2(floor(along), floor(up)) + floor(vWP.xz * 0.5)));
            diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.5, win);
            totalEmissiveRadiance += uLit * win * lit * vec3(1.0, 0.7, 0.4);
          }`,
        );
    };
    return m;
    // env is a stable ref; only its contents change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uniforms, sink]);
  useFrame(() => {
    mat.color.copy(env.neighbor);
    uniforms.uLit.value = env.lit * 0.73;
  });
  return mat;
}

const _ray = new THREE.Ray();
const _box = new THREE.Box3();
const _dir = new THREE.Vector3();
const _hit = new THREE.Vector3();
const _pos = new THREE.Vector3();
const _scale = new THREE.Vector3();

/** Neighboring blocks. Any block standing between the camera and the focus sinks out of the way. */
function City({ p, env, focus }: { p: TowerProfile; env: Env; focus: RefObject<THREE.Vector3> }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const neighbors = useMemo(() => neighborsFor(p), [p]);
  const mat = useCityMaterial(env, p.floorH * 1.4);
  const heights = useRef(neighbors.map(() => 1));
  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);

  useFrame(({ camera }, dt) => {
    const f = focus.current;
    const dist = camera.position.distanceTo(f);
    _ray.set(camera.position, _dir.subVectors(f, camera.position).normalize());
    neighbors.forEach(([x, z, w, d, h], i) => {
      // pad the box so the whole highlighted band stays clear, not just its center
      _box.min.set(x - w / 2 - 0.5, 0, z - d / 2 - 0.5);
      _box.max.set(x + w / 2 + 0.5, h + 0.4, z + d / 2 + 0.5);
      const hit = _ray.intersectBox(_box, _hit);
      const blocking = !!hit && camera.position.distanceTo(hit) < dist;
      const k = (heights.current[i] = THREE.MathUtils.damp(heights.current[i], blocking ? 0.04 : 1, blocking ? 5 : 2.5, dt));
      m.compose(_pos.set(x, (h * k) / 2, z), q, _scale.set(w, h * k, d));
      ref.current!.setMatrixAt(i, m);
    });
    ref.current!.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, mat, neighbors.length]} receiveShadow castShadow>
      <boxGeometry />
    </instancedMesh>
  );
}

/* ------------------------------------------------------------------ the real neighborhood */

type CityData = { buildings: { p: number[]; h: number; b?: number }[]; roads: { p: number[]; w: number }[]; parks: number[][] };

/** Loads the neighborhood with the 3D chunk, never with the page */
function useCityData(src?: string) {
  const [data, setData] = useState<CityData | null>(null);
  useEffect(() => {
    if (!src) return;
    let live = true;
    fetch(src)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: CityData | null) => live && d && setData(d))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [src]);
  return data;
}

const pairs = (flat: number[]) => Array.from({ length: flat.length / 2 }, (_, i) => [flat[i * 2], flat[i * 2 + 1]] as [number, number]);

/** Walls and roofs for every footprint, merged into one mesh; `aId` ties each vertex to its building */
function buildBlocks(buildings: CityData["buildings"]) {
  const pos: number[] = [];
  const nor: number[] = [];
  const ids: number[] = [];
  const boxes = new Float32Array(buildings.length * 5);
  const tri = (a: number[], b: number[], c: number[], n: number[], id: number) => {
    // Wind each triangle to face along its normal
    const ux = b[0] - a[0],
      uy = b[1] - a[1],
      uz = b[2] - a[2];
    const vx = c[0] - a[0],
      vy = c[1] - a[1],
      vz = c[2] - a[2];
    const face = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
    if (face[0] * n[0] + face[1] * n[1] + face[2] * n[2] < 0) [b, c] = [c, b];
    pos.push(...a, ...b, ...c);
    nor.push(...n, ...n, ...n);
    ids.push(id, id, id);
  };
  buildings.forEach((bd, id) => {
    const pts = pairs(bd.p);
    const lo = bd.b ?? 0;
    const hi = bd.h;
    let area = 0;
    for (let i = 0; i < pts.length; i++) {
      const [x1, z1] = pts[i];
      const [x2, z2] = pts[(i + 1) % pts.length];
      area += x1 * z2 - x2 * z1;
    }
    const out = area >= 0 ? 1 : -1;
    let minX = Infinity,
      minZ = Infinity,
      maxX = -Infinity,
      maxZ = -Infinity;
    for (let i = 0; i < pts.length; i++) {
      const [ax, az] = pts[i];
      const [bx, bz] = pts[(i + 1) % pts.length];
      const len = Math.hypot(bx - ax, bz - az) || 1;
      const n = [(out * (bz - az)) / len, 0, (-out * (bx - ax)) / len];
      tri([ax, lo, az], [bx, lo, bz], [bx, hi, bz], n, id);
      tri([ax, lo, az], [bx, hi, bz], [ax, hi, az], n, id);
      minX = Math.min(minX, ax);
      maxX = Math.max(maxX, ax);
      minZ = Math.min(minZ, az);
      maxZ = Math.max(maxZ, az);
    }
    const faces = THREE.ShapeUtils.triangulateShape(
      pts.map(([x, z]) => new THREE.Vector2(x, z)),
      [],
    );
    for (const [i, j, k] of faces) tri([pts[i][0], hi, pts[i][1]], [pts[j][0], hi, pts[j][1]], [pts[k][0], hi, pts[k][1]], [0, 1, 0], id);
    boxes.set([minX, minZ, maxX, maxZ, hi], id * 5);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("aId", new THREE.Float32BufferAttribute(ids, 1));
  g.computeBoundingSphere();
  return { g, boxes };
}

/** Flat ribbons for the streets (with a sidewalk either side), and the parks as lawns, trimmed to the land */
function buildGround(data: CityData, radius: number) {
  const ribbons = (pad: number) => {
    const roads: number[] = [];
    for (const r0 of data.roads) {
      const r = { ...r0, w: r0.w + pad };
      const pts = pairs(r.p);
      for (let i = 1; i < pts.length; i++) {
        const [ax, az] = pts[i - 1];
        const [bx, bz] = pts[i];
        if (Math.hypot((ax + bx) / 2, (az + bz) / 2) > radius - 0.4) continue;
        const len = Math.hypot(bx - ax, bz - az) || 1;
        // Half a width either side, and a little past each end so corners close up
        const nx = (-(bz - az) / len) * (r.w / 2);
        const nz = ((bx - ax) / len) * (r.w / 2);
        const ex = ((bx - ax) / len) * (r.w / 2);
        const ez = ((bz - az) / len) * (r.w / 2);
        const q = [
          [ax - ex + nx, az - ez + nz],
          [bx + ex + nx, bz + ez + nz],
          [bx + ex - nx, bz + ez - nz],
          [ax - ex - nx, az - ez - nz],
        ];
        for (const [a, b, c] of [
          [0, 2, 1],
          [0, 3, 2],
        ])
          roads.push(q[a][0], 0, q[a][1], q[b][0], 0, q[b][1], q[c][0], 0, q[c][1]);
      }
    }
    return roads;
  };
  const lawns: number[] = [];
  for (const park of data.parks) {
    const pts = pairs(park);
    const faces = THREE.ShapeUtils.triangulateShape(
      pts.map(([x, z]) => new THREE.Vector2(x, z)),
      [],
    );
    for (const f of faces) for (const i of [f[0], f[2], f[1]]) lawns.push(pts[i][0], 0, pts[i][1]);
  }
  const make = (v: number[]) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
    g.computeVertexNormals();
    // Face up whichever way a triangle was wound
    const n = g.attributes.normal;
    for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
    return g;
  };
  return { walks: make(ribbons(0.3)), roads: make(ribbons(0)), lawns: make(lawns) };
}

/**
 * The real buildings and streets around the tower, from OpenStreetMap. The blocks rise out of the ground in a
 * wave from the tower when they arrive; like the procedural ones, any building between the camera and the
 * focus sinks out of the way.
 */
function RealCity({ p, env, focus, flat, clearPark }: { p: TowerProfile; env: Env; focus: RefObject<THREE.Vector3>; flat?: boolean; clearPark?: boolean }) {
  const data = useCityData(p.realCity?.src);
  const radius = p.ground ?? 14.5;
  const blocks = useMemo(() => (data ? buildBlocks(data.buildings) : null), [data]);
  const ground = useMemo(() => (data ? buildGround(data, radius) : null), [data, radius]);
  const n = data?.buildings.length ?? 0;
  const sink = useMemo<Sink | undefined>(() => {
    if (!n) return undefined;
    const tex = new THREE.DataTexture(new Float32Array(n), n, 1, THREE.RedFormat, THREE.FloatType);
    tex.needsUpdate = true;
    return { tex, n };
  }, [n]);
  const mat = useCityMaterial(env, p.floorH * 1.05, sink);
  const depth = useMemo(() => {
    if (!sink) return undefined;
    const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
    m.onBeforeCompile = (sh) => injectSink(sh, sink);
    return m;
  }, [sink]);
  const walkMat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }), []);
  const roadMat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), []);
  const lawnMat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 1, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), []);
  const born = useRef<number | null>(null);

  useFrame(({ camera, clock }, dt) => {
    // Pale sidewalks around darker asphalt, in any light
    walkMat.color.copy(env.ground).lerp(env.slab, 0.16);
    roadMat.color.copy(env.ground).lerp(env.slab, 0.045);
    lawnMat.color.copy(env.tree).lerp(env.ground, 0.35);
    if (!blocks || !sink) return;
    born.current ??= clock.elapsedTime;
    const age = clock.elapsedTime - born.current;
    const f = focus.current;
    const dist = camera.position.distanceTo(f);
    _ray.set(camera.position, _dir.subVectors(f, camera.position).normalize());
    const k = sink.tex.image.data as Float32Array;
    const park = clearPark ? p.park : null;
    const b = blocks.boxes;
    for (let i = 0; i < n; i++) {
      const o = i * 5;
      _box.min.set(b[o] - 0.3, 0, b[o + 1] - 0.3);
      _box.max.set(b[o + 2] + 0.3, b[o + 4] + 0.3, b[o + 3] + 0.3);
      const hit = _ray.intersectBox(_box, _hit);
      const blocking = !!hit && camera.position.distanceTo(hit) < dist;
      // The first time through, each building waits its turn: nearest the tower rises first
      const risen = age > 0.2 + Math.hypot((b[o] + b[o + 2]) / 2, (b[o + 1] + b[o + 3]) / 2) * 0.07;
      // With the park open, the buildings hemming it in step back so it reads as the open space it is
      const byPark =
        !!park &&
        b[o + 2] > park.x - park.w / 2 - 1.2 &&
        b[o] < park.x + park.w / 2 + 1.2 &&
        b[o + 3] > park.z - park.d / 2 - 1.2 &&
        b[o + 1] < park.z + park.d / 2 + 1.2;
      // Arriving, the city settles into a map so the streets and entrances read at a glance
      const target = blocking ? 0.04 : !risen ? 0 : flat || byPark ? 0.07 : 1;
      k[i] = THREE.MathUtils.damp(k[i], target, blocking ? 5 : risen && k[i] < 0.98 ? 3.2 : 2.5, dt);
    }
    sink.tex.needsUpdate = true;
  });

  return (
    <>
      {ground && (
        <>
          <mesh geometry={ground.walks} material={walkMat} position={[0, 0.005, 0]} receiveShadow />
          <mesh geometry={ground.roads} material={roadMat} position={[0, 0.007, 0]} receiveShadow />
          <mesh geometry={ground.lawns} material={lawnMat} position={[0, 0.009, 0]} receiveShadow />
        </>
      )}
      {blocks && <mesh geometry={blocks.g} material={mat} customDepthMaterial={depth} castShadow receiveShadow />}
    </>
  );
}

/* ------------------------------------------------------------------ landmarks */

const GG_RED = "#b5432f";

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

/** One stylized landmark, built from a few primitives in the same language as the tower. */
function LandmarkModel({ l, mat, treeMat, env }: { l: SceneLandmark; mat: THREE.Material; treeMat: THREE.Material; env: Env }) {
  const { x, z } = l;
  const heading = ((l.heading ?? 0) * Math.PI) / 180;
  switch (l.kind) {
    case "coit":
      // Telegraph Hill, then the fluted column on top
      return (
        <group position={[x, 0, z]}>
          <mesh scale={[2.6, 1.5, 2.6]} material={treeMat} castShadow receiveShadow>
            <sphereGeometry args={[1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          <mesh position={[0, 1.5 + 1.5, 0]} material={mat} castShadow>
            <cylinderGeometry args={[0.28, 0.32, 3, 16]} />
          </mesh>
          <mesh position={[0, 4.55, 0]} material={mat} castShadow>
            <cylinderGeometry args={[0.36, 0.3, 0.2, 16]} />
          </mesh>
        </group>
      );
    case "skyscraper":
      // Salesforce Tower: taller than the Pyramid, tapering to an open crown
      return (
        <group position={[x, 0, z]}>
          <SalesforceTower env={env} />
        </group>
      );
    case "ferry":
      return (
        <group position={[x, 0, z]} rotation={[0, heading || 0.35, 0]}>
          <mesh position={[0, 0.4, 0]} material={mat} castShadow receiveShadow>
            <boxGeometry args={[0.9, 0.8, 3.4]} />
          </mesh>
          <mesh position={[0, 1.6, 0]} material={mat} castShadow>
            <boxGeometry args={[0.36, 3.2, 0.36]} />
          </mesh>
          <mesh position={[0, 3.35, 0]} material={mat}>
            <coneGeometry args={[0.2, 0.4, 4]} />
          </mesh>
        </group>
      );
    case "church":
      return (
        <group position={[x, 0, z]} rotation={[0, 0.6, 0]}>
          <mesh position={[0, 0.5, 0]} material={mat} castShadow receiveShadow>
            <boxGeometry args={[1, 1, 1.7]} />
          </mesh>
          {[-0.28, 0.28].map((dx) => (
            <group key={dx} position={[dx, 0, 0.72]}>
              <mesh position={[0, 1.2, 0]} material={mat} castShadow>
                <boxGeometry args={[0.3, 2.4, 0.3]} />
              </mesh>
              <mesh position={[0, 2.75, 0]} material={mat} castShadow>
                <coneGeometry args={[0.18, 0.7, 6]} />
              </mesh>
            </group>
          ))}
        </group>
      );
    case "island":
      // Alcatraz: a rock, the cellhouse, the lighthouse
      return (
        <group position={[x, 0, z]} rotation={[0, 0.5, 0]}>
          <mesh scale={[2.1, 0.7, 1.1]} material={treeMat} receiveShadow castShadow>
            <sphereGeometry args={[1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          <mesh position={[0.1, 0.85, 0]} material={mat} castShadow>
            <boxGeometry args={[1.5, 0.4, 0.5]} />
          </mesh>
          <mesh position={[-0.7, 1.15, 0.2]} material={mat} castShadow>
            <cylinderGeometry args={[0.07, 0.09, 1, 8]} />
          </mesh>
        </group>
      );
    case "bay-bridge":
    case "golden-gate": {
      const gg = l.kind === "golden-gate";
      const len = gg ? 16 : 22;
      const towerH = gg ? 6.2 : 4.6;
      const deckY = gg ? 1.4 : 1.1;
      const towers = gg ? [-3.6, 3.6] : [-6.5, -2.2, 2.2, 6.5];
      const color = gg ? GG_RED : undefined;
      const m = color ? undefined : mat;
      return (
        <group position={[x, 0, z]} rotation={[0, -heading, 0]}>
          <mesh position={[0, deckY, 0]} material={m} castShadow>
            <boxGeometry args={[0.34, 0.14, len]} />
            {color && <meshStandardMaterial color={color} roughness={0.6} />}
          </mesh>
          {towers.map((tz) => (
            <group key={tz} position={[0, 0, tz]}>
              {[-0.18, 0.18].map((tx) => (
                <mesh key={tx} position={[tx, towerH / 2, 0]} material={m} castShadow>
                  <boxGeometry args={[0.1, towerH, 0.12]} />
                  {color && <meshStandardMaterial color={color} roughness={0.6} />}
                </mesh>
              ))}
            </group>
          ))}
          {/* Main cables as straight runs between tower tops and the deck's ends: enough to read as suspension */}
          {towers.slice(0, -1).map((tz, i) => {
            const nz = towers[i + 1];
            const dz = nz - tz;
            const sag = towerH - deckY - 0.3;
            const half = dz / 2;
            const seg = Math.hypot(half, sag);
            const ang = Math.atan2(sag, half);
            return [
              <mesh key={`${tz}a`} position={[0, deckY + 0.3 + sag / 2, tz + half / 2]} rotation={[ang, 0, 0]} material={m}>
                <boxGeometry args={[0.04, 0.04, seg]} />
                {color && <meshStandardMaterial color={color} />}
              </mesh>,
              <mesh key={`${tz}b`} position={[0, deckY + 0.3 + sag / 2, nz - half / 2]} rotation={[-ang, 0, 0]} material={m}>
                <boxGeometry args={[0.04, 0.04, seg]} />
                {color && <meshStandardMaterial color={color} />}
              </mesh>,
            ];
          })}
        </group>
      );
    }
  }
}

/** Where a landmark's label floats: just above its highest point */
function landmarkTop(l: SceneLandmark) {
  const { x, z } = l;
  const h = { coit: 5, skyscraper: SF.top + SF.crown, ferry: 3.8, church: 3.3, island: 1.8, "bay-bridge": 5, "golden-gate": 6.6 }[l.kind];
  return new THREE.Vector3(x, h + 0.35, z);
}

/** Half-width of each landmark's footprint, for the "get out of the way" test */
const REACH: Record<Landmark["kind"], number> = { coit: 2.6, skyscraper: SF.half, ferry: 1.8, church: 1.1, island: 2.2, "bay-bridge": 0, "golden-gate": 0 };

/** The landmarks. Like the city blocks, one standing between the camera and the focus sinks out of the way. */
function Landmarks({ p, env, focus, sink = true }: { p: TowerProfile; env: Env; focus: RefObject<THREE.Vector3>; sink?: boolean }) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0.05 }), []);
  const treeMat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true }), []);
  const list = useMemo(() => sceneLandmarks(p), [p]);
  const groups = useRef<(THREE.Group | null)[]>([]);
  const k = useRef(list.map(() => 1));
  useFrame(({ camera }, dt) => {
    mat.color.copy(env.slab).multiplyScalar(0.92);
    treeMat.color.copy(env.tree);
    const f = focus.current;
    const dist = camera.position.distanceTo(f);
    _ray.set(camera.position, _dir.subVectors(f, camera.position).normalize());
    list.forEach((l, i) => {
      const g = groups.current[i];
      const reach = REACH[l.kind];
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
          <LandmarkModel l={l} mat={mat} treeMat={treeMat} env={env} />
        </group>
      ))}
    </>
  );
}

/** Distant hills across the bay (Marin, Angel Island, the East Bay): silhouettes for depth, bearing in degrees */
const HILLS: [bearing: number, r: number, w: number, h: number][] = [
  [292, 46, 16, 5],
  [318, 44, 12, 4.2],
  [342, 42, 7, 2.6],
  [6, 50, 18, 3.4],
  [48, 54, 22, 3],
];

/** The bay: a wide plane under the city disc, with hills on the far shore */
function Water({ env, hills, turn = 0 }: { env: Env; hills?: boolean; turn?: number }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const hillMat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), []);
  useFrame(() => {
    mat.current?.color.copy(env.water);
    hillMat.color.copy(env.tree).lerp(env.fog, 0.35);
  });
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} receiveShadow>
        <circleGeometry args={[110, 64]} />
        <meshStandardMaterial ref={mat} color={env.water} roughness={0.35} metalness={0.2} />
      </mesh>
      {hills &&
        HILLS.map(([b, r, w, h]) => {
          const a = ((b + turn) * Math.PI) / 180;
          return (
            <mesh key={b} position={[Math.sin(a) * r, 0, -Math.cos(a) * r]} rotation={[0, -a, 0]} scale={[w, h, 5]} material={hillMat}>
              <sphereGeometry args={[1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            </mesh>
          );
        })}
    </>
  );
}

/** Street-level places: a glowing dot and a short stem, so the label has something to stand on */
function PoiMarkers({ p, color, active }: { p: TowerProfile; color: string; active?: string | null }) {
  return (
    <>
      {p.pois
        ?.filter((x) => !x.pending)
        .map((x) => (
          <group key={x.id} position={[x.x, 0, x.z]}>
            <mesh position={[0, 0.45, 0]}>
              <cylinderGeometry args={[0.025, 0.025, 0.9, 6]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} toneMapped={false} />
            </mesh>
            <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[x.id === active ? 0.42 : 0.26, 24]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} transparent opacity={0.85} toneMapped={false} />
            </mesh>
          </group>
        ))}
    </>
  );
}

/* ------------------------------------------------------------------ overlays */

/** Where a level's band sits: a slab-hugging ring, or a pad over the park at street level */
function bandBox(p: TowerProfile, level: number) {
  if (level === 0 && p.park) {
    const { x, z, w, d } = p.park;
    return { pos: [x, 0.08, z] as const, size: [w + 0.6, 0.06, d + 0.4] as const };
  }
  const f = Math.min(level, p.floors - 1);
  return {
    pos: [0, levelY(p, level) + p.floorH / 2, 0] as const,
    size: [p.widthAt(f) + 0.08, p.floorH * 1.05, p.depthAt(f) + 0.08] as const,
  };
}

/** The glowing band that slides to the active level, like an elevator readout. */
function Marker({ p, level, color }: { p: TowerProfile; level: number | null; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((_, dt) => {
    const m = ref.current!;
    const { pos, size } = bandBox(p, level ?? p.restLevel);
    m.position.x = THREE.MathUtils.damp(m.position.x, pos[0], 5, dt);
    m.position.y = THREE.MathUtils.damp(m.position.y, pos[1], 5, dt);
    m.position.z = THREE.MathUtils.damp(m.position.z, pos[2], 5, dt);
    m.scale.x = THREE.MathUtils.damp(m.scale.x, size[0], 5, dt);
    m.scale.y = THREE.MathUtils.damp(m.scale.y, size[1], 5, dt);
    m.scale.z = THREE.MathUtils.damp(m.scale.z, size[2], 5, dt);
    // Over the park it's a wash of colour, so the trees and paths still read through it
    mat.current!.opacity = THREE.MathUtils.damp(mat.current!.opacity, level == null ? 0 : level === 0 && p.park ? 0.38 : 0.92, 4, dt);
  });
  return (
    <mesh ref={ref} position={[0, levelY(p, p.restLevel), 0]}>
      <boxGeometry />
      <meshStandardMaterial ref={mat} color={color} emissive={color} emissiveIntensity={1.4} transparent opacity={0} toneMapped={false} />
    </mesh>
  );
}

export type Band = { level: number; tone: "mine" | "open" | "event" | "full"; live?: boolean };
export type Pin = { level: number; label: string };

const TONES: Record<Band["tone"], string> = { mine: "", open: "#5fc08f", event: "#f0c77e", full: "#7d858c" };

/** Floors with something on them glow; floors with something happening right now breathe. */
function Bands({ p, bands, accent }: { p: TowerProfile; bands: Band[]; accent: string }) {
  return bands.map((b) => <BandMesh key={`${b.level}-${b.tone}`} p={p} b={b} color={b.tone === "mine" ? accent : TONES[b.tone]} />);
}

function BandMesh({ p, b, color }: { p: TowerProfile; b: Band; color: string }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const { pos, size } = bandBox(p, b.level);
  const base = b.tone === "full" ? 0.35 : b.tone === "mine" ? 0.95 : 0.7;
  useFrame(({ clock }, dt) => {
    if (!mat.current) return;
    const target = b.live ? base * (0.55 + 0.45 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 3.2))) : base;
    mat.current.opacity = THREE.MathUtils.damp(mat.current.opacity, target, 6, dt);
  });
  // Slightly proud of the facade so it reads as a ring of light around the floor
  return (
    <mesh position={[pos[0], pos[1], pos[2]]} scale={[size[0] + 0.03, size[1] * (b.tone === "mine" ? 1.3 : 1), size[2] + 0.03]}>
      <boxGeometry />
      <meshStandardMaterial ref={mat} color={color} emissive={color} emissiveIntensity={1.6} transparent opacity={0} toneMapped={false} depthWrite={false} />
    </mesh>
  );
}

/** World anchor for a pin: just off the floor's east face, or over the park */
function pinAnchor(p: TowerProfile, level: number) {
  const { pos, size } = bandBox(p, level);
  return new THREE.Vector3(level === 0 ? pos[0] : pos[0] + size[0] / 2 + 0.05, pos[1] + 0.02, pos[2]);
}

const _proj = new THREE.Vector3();

/**
 * Projects each pin's anchor to the screen every frame and moves its DOM label there.
 * Plain DOM (not drei's Html) so pins can come and go while you scrub without extra React roots.
 */
function PinTracker({ p, pins, els }: { p: TowerProfile; pins: Pin[]; els: RefObject<(HTMLElement | null)[]> }) {
  const anchors = useMemo(() => pins.map((pin) => pinAnchor(p, pin.level)), [p, pins]);
  return <AnchorTracker anchors={anchors} els={els} />;
}

/** Moves each DOM label to its anchor's screen position; hides labels behind the camera or off screen. */
function AnchorTracker({ anchors, els, center }: { anchors: THREE.Vector3[]; els: RefObject<(HTMLElement | null)[]>; center?: boolean }) {
  useFrame(({ camera, size }) => {
    anchors.forEach((v, i) => {
      const el = els.current[i];
      if (!el) return;
      _proj.copy(v).project(camera);
      const hidden = _proj.z > 1 || Math.abs(_proj.x) > 1.05 || Math.abs(_proj.y) > 1.05;
      el.style.transform = `translate3d(${((_proj.x + 1) / 2) * size.width}px, ${((1 - _proj.y) / 2) * size.height}px, 0) ${center ? "translate(-50%, -100%)" : "translateY(-50%)"}`;
      el.style.opacity = hidden ? "0" : "1";
    });
  });
  return null;
}

const _right = new THREE.Vector3();

/**
 * Keeps each hotspot on its floor's right-hand silhouette edge as seen from the camera, so a marker
 * never ends up behind the tower as it turns. Exact for the box slabs: the edge's reach along the
 * screen's right is |rx|·w/2 + |rz|·d/2.
 */
function HotspotTracker({ p, levels, els }: { p: TowerProfile; levels: number[]; els: RefObject<(HTMLElement | null)[]> }) {
  const anchor = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }) => {
    _right.setFromMatrixColumn(camera.matrixWorld, 0).setY(0).normalize();
    levels.forEach((level, i) => {
      const el = els.current[i];
      if (!el) return;
      const { pos, size: box } = bandBox(p, level);
      if (level === 0) anchor.set(pos[0], pos[1] + 0.9, pos[2]);
      else {
        const reach = (Math.abs(_right.x) * box[0] + Math.abs(_right.z) * box[2]) / 2 + 0.12;
        anchor.set(pos[0] + _right.x * reach, pos[1], pos[2] + _right.z * reach);
      }
      _proj.copy(anchor).project(camera);
      const hidden = _proj.z > 1 || Math.abs(_proj.x) > 1.05 || Math.abs(_proj.y) > 1.05;
      el.style.transform = `translate3d(${((_proj.x + 1) / 2) * size.width}px, ${((1 - _proj.y) / 2) * size.height}px, 0) translateY(-50%)`;
      el.style.visibility = hidden ? "hidden" : "visible";
    });
  });
  return null;
}

const _north = new THREE.Vector3();

/** Turns the compass needle so it always points to true north on screen */
function CompassTracker({ focus, el, north }: { focus: RefObject<THREE.Vector3>; el: RefObject<HTMLElement | null>; north: [number, number] }) {
  useFrame(({ camera }) => {
    if (!el.current) return;
    _proj.copy(focus.current).project(camera);
    _north
      .copy(focus.current)
      .add(_dir.set(north[0], 0, north[1]))
      .project(camera);
    const a = Math.atan2(_north.x - _proj.x, _north.y - _proj.y);
    el.current.style.transform = `rotate(${a}rad)`;
  });
  return null;
}

/* ------------------------------------------------------------------ camera */

/** Where the camera frames each stop. `yaw` limits keep the subject on the open side. */
type View = { target: THREE.Vector3; radius: number; lift: number; yaw?: [center: number, range: number] };

function viewFor(p: TowerProfile, level: number | null, narrow: boolean, zoom = 1): View {
  const r = (narrow ? 1.3 : 1) * (level == null ? 1 : zoom);
  const top = topOf(p);
  if (level == null) return { target: new THREE.Vector3(0, top * 0.62 + 0.6, 0), radius: 30 * r, lift: 7 };
  // The park faces the camera, with the tower rising behind it.
  if (level === 0 && p.park) return { target: new THREE.Vector3(p.park.x * 0.944, 0.4, p.park.z * 0.944), radius: 11 * r, lift: 6.5, yaw: p.park.yaw };
  // Low floors look down over the rooftops; higher ones sit level with the band.
  const lift = level < 15 ? 4.2 : 2.4;
  return { target: new THREE.Vector3(0, levelY(p, level) + 0.3, 0), radius: 17 * r, lift };
}

/** The middle of the street scene: halfway between the tower and its park */
const streetCenter = (p: TowerProfile): [number, number] => (p.park ? [p.park.x / 2, p.park.z / 2] : [0, 0]);

/** Arriving: a high oblique over the whole block, or close on one spot */
function streetView(p: TowerProfile, spot: [number, number] | null, narrow: boolean): View {
  const r = narrow ? 1.3 : 1;
  if (spot) return { target: new THREE.Vector3(spot[0], 0.3, spot[1]), radius: 8 * r, lift: 7 };
  const [cx, cz] = streetCenter(p);
  return { target: new THREE.Vector3(cx, 0.3, cz), radius: 12 * r, lift: 15 };
}

/** The camera yaw that looks at a spot from outside the block, so the tower stands behind it rather than in front */
function outsideYaw(p: TowerProfile, spot: [number, number] | null) {
  if (!spot) return Math.PI / 2; // from the south: the lobby on the left, the park on the right
  const [cx, cz] = streetCenter(p);
  return Math.atan2(spot[1] - cz, spot[0] - cx);
}

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * Orbits the active stop. Drag to spin it (with a little inertia); it drifts
 * on its own again a few seconds after you let go.
 */
function Rig({
  p,
  level,
  auto,
  focus,
  onInteract,
  shift,
  zoom,
  street,
  spot,
}: {
  p: TowerProfile;
  level: number | null;
  auto: boolean;
  focus: RefObject<THREE.Vector3>;
  onInteract?: () => void;
  shift?: [x: number, y: number];
  zoom?: number;
  street?: boolean;
  spot?: [number, number] | null;
}) {
  const { camera, size, gl } = useThree();
  const narrow = size.width < 640;
  const aim = useRef(0.7); // where the user/auto-drift wants the camera
  const yaw = useRef(0.7); // where it is, eased
  const pitch = useRef(0);
  const vel = useRef(0);
  const drift = useRef(1);
  const drag = useRef<{ x: number; y: number; t: number } | null>(null);
  const idleUntil = useRef(0);
  const cur = useRef({ radius: 30, lift: 4 });
  const off = useRef<[number, number]>([0, 0]);

  const interact = useRef(onInteract);
  useEffect(() => {
    interact.current = onInteract;
  }, [onInteract]);

  useEffect(() => {
    const el = gl.domElement;
    el.style.cursor = "grab";
    el.style.touchAction = "pan-y"; // vertical swipes still scroll the page
    const down = (e: PointerEvent) => {
      drag.current = { x: e.clientX, y: e.clientY, t: performance.now() };
      vel.current = 0;
      el.setPointerCapture(e.pointerId);
      el.style.cursor = "grabbing";
      interact.current?.();
    };
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const now = performance.now();
      const dx = e.clientX - d.x;
      const step = -dx * 0.0065;
      aim.current += step;
      vel.current = step / Math.max(1, now - d.t);
      pitch.current = THREE.MathUtils.clamp(pitch.current + (e.clientY - d.y) * 0.004, -0.35, 0.9);
      drag.current = { x: e.clientX, y: e.clientY, t: now };
    };
    const up = (e: PointerEvent) => {
      if (!drag.current) return;
      drag.current = null;
      idleUntil.current = performance.now() + 3500;
      el.style.cursor = "grab";
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [gl]);

  // Arriving, and each time a spot is picked, swing round to face it from the street
  const sx = spot?.[0];
  const sz = spot?.[1];
  useEffect(() => {
    if (!street) return;
    const target = outsideYaw(p, sx == null || sz == null ? null : [sx, sz]);
    aim.current = yaw.current + wrap(target - yaw.current);
    vel.current = 0;
    idleUntil.current = performance.now() + 6000;
  }, [street, sx, sz, p]);

  useFrame((_, dt) => {
    const v = street ? streetView(p, spot ?? null, narrow) : viewFor(p, level, narrow, zoom);
    const dragging = !!drag.current;

    // Fling, then the slow drift picks back up once the user has been idle.
    if (!dragging) {
      aim.current += vel.current * dt * 1000;
      vel.current = THREE.MathUtils.damp(vel.current, 0, 4, dt);
      if (auto && performance.now() > idleUntil.current) aim.current += dt * 0.05 * drift.current;
      pitch.current = THREE.MathUtils.damp(pitch.current, 0, performance.now() > idleUntil.current ? 0.6 : 0, dt);
    }

    // Views with a limited arc: hold the camera inside it and ping-pong the drift.
    if (v.yaw) {
      const [c, range] = v.yaw;
      const off = wrap(aim.current - c);
      if (Math.abs(off) > range) {
        aim.current = c + Math.sign(off) * range;
        vel.current = 0;
        drift.current = -Math.sign(off);
      }
    }

    // Ease along the orbit (shortest way round) so moves sweep around the tower rather than cut through it.
    yaw.current += wrap(aim.current - yaw.current) * (1 - Math.exp(-(dragging ? 12 : 2.2) * dt));
    cur.current.radius = THREE.MathUtils.damp(cur.current.radius, v.radius, 2.2, dt);
    cur.current.lift = THREE.MathUtils.damp(cur.current.lift, v.lift, 2.2, dt);
    focus.current.x = THREE.MathUtils.damp(focus.current.x, v.target.x, 2.6, dt);
    focus.current.y = THREE.MathUtils.damp(focus.current.y, v.target.y, 2.6, dt);
    focus.current.z = THREE.MathUtils.damp(focus.current.z, v.target.z, 2.6, dt);

    const { radius, lift } = cur.current;
    const f = focus.current;
    camera.position.set(f.x + Math.cos(yaw.current) * radius, Math.max(0.6, f.y + lift + pitch.current * radius * 0.45), f.z + Math.sin(yaw.current) * radius);
    camera.lookAt(f);

    // Slide the subject out from under an overlay (a side panel, a bottom sheet) by shifting the
    // projection window: a pure screen-space pan, so the orbit, drag and perspective are untouched.
    const [tx, ty] = shift ?? [0, 0];
    const o = off.current;
    o[0] = THREE.MathUtils.damp(o[0], tx, 3, dt);
    o[1] = THREE.MathUtils.damp(o[1], ty, 3, dt);
    const cam = camera as THREE.PerspectiveCamera;
    if (Math.abs(o[0]) > 0.5 || Math.abs(o[1]) > 0.5) cam.setViewOffset(size.width, size.height, o[0], o[1], size.width, size.height);
    else if (cam.view?.enabled) cam.clearViewOffset();
  });
  return null;
}

/* ------------------------------------------------------------------ scene */

function Ground({ env, radius = 14.5 }: { env: Env; radius?: number }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(() => mat.current?.color.copy(env.ground));
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[radius, 96]} />
      <meshStandardMaterial ref={mat} color={env.ground} roughness={1} />
    </mesh>
  );
}

export type TowerCanvasProps = {
  profile: TowerProfile;
  /** Highlighted level (null = the whole building) */
  level: number | null;
  /** 0 night · 0.5 dusk · 1 day */
  sun?: number;
  /** The building's accent glow, for the marker, park and your own plans */
  accent: string;
  active?: boolean;
  auto?: boolean;
  onReady?: () => void;
  onInteract?: () => void;
  /** Live mode: status bands, your pins, and floor picking */
  bands?: Band[];
  pins?: Pin[];
  onPick?: (floor: number) => void;
  /** Only these levels can be hovered and picked (venue floors) */
  pickable?: number[];
  /** DOM markers pinned to these levels' silhouette edge; `renderHotspot` draws each one */
  hotspots?: { id: string; level: number }[];
  renderHotspot?: (id: string) => React.ReactNode;
  /** Pickable floor under the pointer, and a floor to highlight from outside (a list row) */
  onHover?: (floor: number | null) => void;
  hoverLevel?: number | null;
  /** Screen-space pan of the subject in px, to clear an overlay; eased */
  shift?: [x: number, y: number];
  /** Camera distance multiplier while a level is selected */
  zoom?: number;
  /** Show the profile's landmarks and their labels */
  landmarks?: boolean;
  /** Arriving: street-level places, street names and a compass; `activePoi` is enlarged */
  pois?: boolean;
  activePoi?: string | null;
  /** The place the camera flies to while arriving */
  focusPoi?: string | null;
  onPoi?: (id: string) => void;
  onPoiHover?: (id: string | null) => void;
  /** Where the compass sits, as classes; no compass without it */
  compass?: string;
};

export default function TowerCanvas({
  profile: p,
  level,
  sun = 1,
  accent,
  active = true,
  auto = true,
  onReady,
  onInteract,
  bands,
  pins,
  onPick,
  pickable,
  hotspots,
  renderHotspot,
  onHover,
  hoverLevel,
  shift,
  zoom,
  landmarks,
  pois,
  activePoi,
  focusPoi,
  onPoi,
  onPoiHover,
  compass,
}: TowerCanvasProps) {
  // One mutable light state per canvas; useFrame blends it every frame
  const [env] = useState(() => makeEnv(sun));
  const focus = useRef(new THREE.Vector3(0, topOf(p) * 0.62, 0));
  const [hover, setHoverState] = useState<number | null>(null);
  const [dpr, setDpr] = useState(2);
  const hoverOut = useRef(onHover);
  useEffect(() => {
    hoverOut.current = onHover;
  }, [onHover]);
  const setHover = useCallback((f: number | null) => {
    setHoverState(f);
    hoverOut.current?.(f);
  }, []);
  const lit = hoverLevel ?? hover;
  const pinEls = useRef<(HTMLElement | null)[]>([]);
  const landmarkEls = useRef<(HTMLElement | null)[]>([]);
  const poiEls = useRef<(HTMLElement | null)[]>([]);
  const shownLandmarks = useMemo(() => (landmarks ? sceneLandmarks(p) : []), [landmarks, p]);
  const north = useMemo(() => trueNorth(p), [p]);
  const shownPois = useMemo(() => (pois ? (p.pois ?? []).filter((x) => !x.pending) : []), [pois, p]);
  const landmarkAnchors = useMemo(() => shownLandmarks.map(landmarkTop), [shownLandmarks]);
  const poiAnchors = useMemo(() => shownPois.map((x) => new THREE.Vector3(x.x, 1.05, x.z)), [shownPois]);
  const streetEls = useRef<(HTMLElement | null)[]>([]);
  const shownStreets = useMemo(() => (pois ? (p.streets ?? []) : []), [pois, p]);
  const streetAnchors = useMemo(() => shownStreets.map((x) => new THREE.Vector3(x.x, 0.05, x.z)), [shownStreets]);
  const compassEl = useRef<HTMLSpanElement>(null);
  const spotPoi = shownPois.find((x) => x.id === focusPoi);
  const spot = useMemo<[number, number] | null>(() => (spotPoi ? [spotPoi.x, spotPoi.z] : null), [spotPoi]);
  const hotspotEls = useRef<(HTMLElement | null)[]>([]);
  const hotspotLevels = useMemo(() => (hotspots ?? []).map((h) => h.level), [hotspots]);

  return (
    <div className="relative h-full w-full">
      <Canvas
        shadows
        dpr={[1, dpr]}
        frameloop={active ? "always" : "never"}
        camera={{ position: [20, 12, 20], fov: 32, near: 0.5, far: 120 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={() => onReady?.()}
        onPointerMissed={() => setHover(null)}
        aria-hidden
      >
        {/* Weak GPUs step down to a lighter pixel ratio instead of dropping frames */}
        <PerformanceMonitor onDecline={() => setDpr(1.25)} />
        <Sky sun={sun} env={env} />
        <Rig p={p} level={level} auto={auto} focus={focus} onInteract={onInteract} shift={shift} zoom={zoom} street={pois} spot={spot} />
        <Tower p={p} env={env} glow={accent} onPick={onPick} onHover={onPick ? setHover : undefined} pickable={pickable} />
        <Park p={p} env={env} glow={level === 0 ? 0.14 : 0} color={accent} onPick={onPick ? () => onPick(0) : undefined} />
        <City p={p} env={env} focus={focus} />
        {p.realCity && <RealCity p={p} env={env} focus={focus} flat={pois} clearPark={level === 0} />}
        <Marker p={p} level={level} color={accent} />
        {bands && <Bands p={p} bands={bands} accent={accent} />}
        {pins && <PinTracker p={p} pins={pins} els={pinEls} />}
        {lit != null && lit !== level && <BandMesh key={lit} p={p} b={{ level: lit, tone: "full" }} color="#ffffff" />}
        <Ground env={env} radius={p.ground} />
        <Water env={env} hills={!!p.landmarks?.length} turn={-(p.north ?? 0)} />
        {landmarks && <Landmarks p={p} env={env} focus={focus} />}
        {hotspots && <HotspotTracker p={p} levels={hotspotLevels} els={hotspotEls} />}
        {landmarks && <AnchorTracker anchors={landmarkAnchors} els={landmarkEls} center />}
        {pois && <PoiMarkers p={p} color={accent} active={activePoi} />}
        {pois && <AnchorTracker anchors={poiAnchors} els={poiEls} center />}
        {pois && <AnchorTracker anchors={streetAnchors} els={streetEls} center />}
        {pois && compass && <CompassTracker focus={focus} el={compassEl} north={north} />}
        <ContactShadows position={[0, 0.01, 0]} opacity={env.shadow} scale={14} blur={2.4} far={6} />
      </Canvas>
      {shownLandmarks.map((l, i) => (
        <span
          key={l.name}
          ref={(el) => {
            landmarkEls.current[i] = el;
          }}
          className="pointer-events-none absolute left-0 top-0 whitespace-nowrap rounded-full bg-black/30 px-2 py-0.5 text-[0.625rem] font-medium tracking-[0.01em] text-white/65 opacity-0 backdrop-blur-sm transition-opacity duration-300"
        >
          {l.name}
        </span>
      ))}
      {shownStreets.map((x, i) => (
        <span
          key={x.name}
          ref={(el) => {
            streetEls.current[i] = el;
          }}
          className="pointer-events-none absolute left-0 top-0 whitespace-nowrap text-[0.6875rem] font-medium tracking-[0.02em] text-white/60 opacity-0 transition-opacity duration-300 [text-shadow:0_1px_6px_rgb(0_0_0/0.9)]"
        >
          {x.name}
        </span>
      ))}
      {shownPois.map((x, i) => {
        const on = x.id === activePoi;
        return (
          <button
            key={x.id}
            ref={(el) => {
              poiEls.current[i] = el;
            }}
            onClick={() => onPoi?.(x.id)}
            onPointerEnter={() => onPoiHover?.(x.id)}
            onPointerLeave={() => onPoiHover?.(null)}
            aria-label={`${i + 1}. ${x.label}`}
            aria-pressed={on}
            className={`absolute left-0 top-0 flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full pl-1 pr-2.5 text-[0.75rem] font-medium opacity-0 shadow-[var(--shadow-float)] transition-[opacity,background-color,color] duration-300 ${on ? "z-10 bg-accent text-paper" : "bg-paper text-ink hover:bg-white"}`}
          >
            <span
              className={`keep-round t-num grid size-5 place-items-center rounded-full text-[0.6875rem] ${on ? "bg-paper text-accent" : "bg-accent text-paper"}`}
            >
              {i + 1}
            </span>
            {x.label}
          </button>
        );
      })}
      {pois && compass && (
        <span className={`pointer-events-none absolute grid size-11 place-items-center rounded-full bg-black/40 backdrop-blur-md ${compass}`} aria-hidden>
          <span ref={compassEl} className="relative block h-7 w-7">
            <span className="absolute left-1/2 top-0 -translate-x-1/2 text-[0.625rem] font-semibold leading-none text-accent-glow">N</span>
            <span className="absolute bottom-1 left-1/2 h-3.5 w-px -translate-x-1/2 bg-moon/70" />
          </span>
        </span>
      )}
      {hotspots?.map((h, i) => (
        <div
          key={h.id}
          ref={(el) => {
            hotspotEls.current[i] = el;
          }}
          className="absolute left-0 top-0"
          style={{ visibility: "hidden" }}
        >
          {renderHotspot?.(h.id)}
        </div>
      ))}
      {pins?.map((pin, i) => (
        <span
          key={`${pin.level}-${pin.label}`}
          ref={(el) => {
            pinEls.current[i] = el;
          }}
          className="pointer-events-none absolute left-0 top-0 flex items-center gap-1.5 whitespace-nowrap rounded-full bg-accent px-2.5 py-1 text-[0.75rem] font-medium text-paper opacity-0 shadow-[var(--shadow-float)] transition-opacity duration-300"
        >
          <span className="size-1.5 rounded-full bg-paper" />
          {pin.label}
        </span>
      ))}
    </div>
  );
}
