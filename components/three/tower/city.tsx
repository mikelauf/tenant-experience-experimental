"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { neighborsFor, type TowerProfile } from "@/lib/tower";
import type { Env } from "./env";

/** The city around the tower: the real neighborhood from OpenStreetMap, the procedural ring beyond it, the ground and the bay. */

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
export const _dir = new THREE.Vector3();
const _hit = new THREE.Vector3();
const _pos = new THREE.Vector3();
const _scale = new THREE.Vector3();

/** Neighboring blocks. Any block standing between the camera and the focus sinks out of the way. */
export function City({ p, env, focus }: { p: TowerProfile; env: Env; focus: RefObject<THREE.Vector3> }) {
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
export function RealCity({
  p,
  env,
  focus,
  flat,
  clearPark,
}: {
  p: TowerProfile;
  env: Env;
  focus: RefObject<THREE.Vector3>;
  flat?: boolean;
  clearPark?: boolean;
}) {
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

/** Distant hills across the bay (Marin, Angel Island, the East Bay): silhouettes for depth, bearing in degrees */
const HILLS: [bearing: number, r: number, w: number, h: number][] = [
  [292, 46, 16, 5],
  [318, 44, 12, 4.2],
  [342, 42, 7, 2.6],
  [6, 50, 18, 3.4],
  [48, 54, 22, 3],
];

/** The bay: a wide plane under the city disc, with hills on the far shore */
export function Water({ env, hills, turn = 0 }: { env: Env; hills?: boolean; turn?: number }) {
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

export function Ground({ env, radius = 14.5 }: { env: Env; radius?: number }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(() => mat.current?.color.copy(env.ground));
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[radius, 96]} />
      <meshStandardMaterial ref={mat} color={env.ground} roughness={1} />
    </mesh>
  );
}
