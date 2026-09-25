"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { levelY, neighborsFor, topOf, treesFor, type TowerProfile } from "@/lib/tower";

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

const COLORS = ["slab", "wing", "tree", "ground", "neighbor", "fog", "sky", "skyGround", "sun"] as const;
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
      <fog attach="fog" args={[e.fog, 26, 64]} />
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

function Tower({
  p,
  env,
  glow,
  onPick,
  onHover,
}: {
  p: TowerProfile;
  env: Env;
  glow: string;
  onPick?: (floor: number) => void;
  onHover?: (floor: number | null) => void;
}) {
  const slabs = useRef<THREE.InstancedMesh>(null);
  const wings = useRef<THREE.InstancedMesh>(null);
  const slabMat = useRef<THREE.MeshStandardMaterial>(null);
  const wingMat = useRef<THREE.MeshStandardMaterial>(null);
  const crownMat = useRef<THREE.MeshStandardMaterial>(null);
  const tex = useFacadeTextures(p);
  const top = topOf(p);
  const { gl } = useThree();
  const hoverTo = (f: number | null) => {
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
    e.stopPropagation();
    onPick(e.instanceId);
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

/**
 * Procedural windows in world space, so every block gets the same crisp,
 * floor-sized grid at any height or pixel density; after dark some are lit.
 */
function useCityMaterial(p: TowerProfile, env: Env) {
  const uniforms = useMemo(() => ({ uLit: { value: 0 }, uFloor: { value: p.floorH * 1.4 } }), [p]);
  const mat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color: env.neighbor, roughness: 0.92 });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uLit = uniforms.uLit;
      sh.uniforms.uFloor = uniforms.uFloor;
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWP;\nvarying vec3 vWN;").replace(
        "#include <project_vertex>",
        `#include <project_vertex>
          mat4 cityM = modelMatrix * instanceMatrix;
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
            float along = (abs(vWN.x) > 0.5 ? vWP.z : vWP.x) / 0.15;
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
  }, [uniforms]);
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
  const mat = useCityMaterial(p, env);
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
    mat.current!.opacity = THREE.MathUtils.damp(mat.current!.opacity, level == null ? 0 : 0.92, 4, dt);
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
  useFrame(({ camera, size }) => {
    anchors.forEach((v, i) => {
      const el = els.current[i];
      if (!el) return;
      _proj.copy(v).project(camera);
      const behind = _proj.z > 1;
      el.style.transform = `translate3d(${((_proj.x + 1) / 2) * size.width}px, ${((1 - _proj.y) / 2) * size.height}px, 0) translateY(-50%)`;
      el.style.opacity = behind ? "0" : "1";
    });
  });
  return null;
}

/* ------------------------------------------------------------------ camera */

/** Where the camera frames each stop. `yaw` limits keep the subject on the open side. */
type View = { target: THREE.Vector3; radius: number; lift: number; yaw?: [center: number, range: number] };

function viewFor(p: TowerProfile, level: number | null, narrow: boolean): View {
  const r = narrow ? 1.3 : 1;
  const top = topOf(p);
  if (level == null) return { target: new THREE.Vector3(0, top * 0.62 + 0.6, 0), radius: 30 * r, lift: 4 };
  // The park faces the camera, with the tower rising behind it.
  if (level === 0 && p.park) return { target: new THREE.Vector3(p.park.x * 0.944, 0.4, p.park.z * 0.944), radius: 11 * r, lift: 6.5, yaw: p.park.yaw };
  // Low floors look down over the rooftops; higher ones sit level with the band.
  const lift = level < 15 ? 4.2 : 2.4;
  return { target: new THREE.Vector3(0, levelY(p, level) + 0.3, 0), radius: 17 * r, lift };
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
}: {
  p: TowerProfile;
  level: number | null;
  auto: boolean;
  focus: RefObject<THREE.Vector3>;
  onInteract?: () => void;
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

  useFrame((_, dt) => {
    const v = viewFor(p, level, narrow);
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
  });
  return null;
}

/* ------------------------------------------------------------------ scene */

function Ground({ env }: { env: Env }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(() => mat.current?.color.copy(env.ground));
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[18, 48]} />
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
}: TowerCanvasProps) {
  // One mutable light state per canvas; useFrame blends it every frame
  const [env] = useState(() => makeEnv(sun));
  const focus = useRef(new THREE.Vector3(0, topOf(p) * 0.62, 0));
  const [hover, setHover] = useState<number | null>(null);
  const pinEls = useRef<(HTMLElement | null)[]>([]);

  return (
    <div className="relative h-full w-full">
      <Canvas
        shadows
        dpr={[1, 2]}
        frameloop={active ? "always" : "never"}
        camera={{ position: [20, 12, 20], fov: 32, near: 0.5, far: 120 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={() => onReady?.()}
        onPointerMissed={() => setHover(null)}
        aria-hidden
      >
        <Sky sun={sun} env={env} />
        <Rig p={p} level={level} auto={auto} focus={focus} onInteract={onInteract} />
        <Tower p={p} env={env} glow={accent} onPick={onPick} onHover={onPick ? setHover : undefined} />
        <Park p={p} env={env} glow={level === 0 ? 0.5 : 0} color={accent} onPick={onPick ? () => onPick(0) : undefined} />
        <City p={p} env={env} focus={focus} />
        <Marker p={p} level={level} color={accent} />
        {bands && <Bands p={p} bands={bands} accent={accent} />}
        {pins && <PinTracker p={p} pins={pins} els={pinEls} />}
        {hover != null && hover !== level && <BandMesh p={p} b={{ level: hover, tone: "full" }} color="#ffffff" />}
        <Ground env={env} />
        <ContactShadows position={[0, 0.01, 0]} opacity={env.shadow} scale={14} blur={2.4} far={6} />
      </Canvas>
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
