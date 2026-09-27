"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, PerspectiveCamera } from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { cn } from "@/lib/cn";
import type { Rect, Seg, Setup, SetupSpec, Shell } from "@/lib/data/types";
import { shellBounds } from "@/lib/setup/shell";
import { useOrbit } from "../useOrbit";
import { fitRadius, focusFrame, frameFor, outward, type Box, type Lookout, type Preset } from "./camera";
import { makeLayout, type P } from "./layouts";

const col = {
  wall: "#faf9f6",
  glass: "#bcd3dd",
  solid: "#e3ded4",
  context: "#e4e1da",
  mark: "#ddd4c5",
  chair: "#3b3f43",
  wood: "#6f4a2f",
  cloth: "#f5f2ec",
  sofa: "#e7dfd1",
  stage: "#d8d1c4",
  screen: "#4a4e52",
  tree: "#33443a",
  trunk: "#5b3a28",
};

const guestColors = ["#2a2d30", "#62666a", "#9a3f25", "#c9b8a2", "#4b5a66", "#8f9396"].map((c) => new THREE.Color(c));

const FOV = 28;

/* ------------------------------------------------------------------ furniture */

function chairGeometry() {
  const seat = new THREE.BoxGeometry(0.44, 0.08, 0.42).translate(0, 0.44, 0);
  const back = new THREE.BoxGeometry(0.44, 0.42, 0.07).translate(0, 0.7, 0.19);
  const legs = new THREE.BoxGeometry(0.36, 0.4, 0.34).translate(0, 0.2, 0);
  return mergeGeometries([seat, back, legs]);
}

/** A guest: body, shoulders and a head, so a crowd reads as people rather than pegs. */
function personGeometry() {
  const body = new THREE.CapsuleGeometry(0.16, 0.78, 4, 10).translate(0, 0.55, 0);
  const shoulders = new THREE.CapsuleGeometry(0.13, 0.16, 4, 8).rotateZ(Math.PI / 2).translate(0, 1.2, 0);
  const head = new THREE.SphereGeometry(0.11, 12, 10).translate(0, 1.5, 0);
  return mergeGeometries([body, shoulders, head]);
}

/** A banquet round with a floor-length cloth. */
function roundGeometry() {
  const top = new THREE.CylinderGeometry(0.64, 0.64, 0.04, 32).translate(0, 0.74, 0);
  const skirt = new THREE.CylinderGeometry(0.64, 0.7, 0.72, 32, 1, true).translate(0, 0.36, 0);
  return mergeGeometries([top, skirt]);
}

function coffeeGeometry() {
  return mergeGeometries([new THREE.CylinderGeometry(0.62, 0.62, 0.05, 28).translate(0, 0.42, 0), new THREE.CylinderGeometry(0.08, 0.22, 0.4, 12).translate(0, 0.2, 0)]);
}

function highGeometry() {
  return mergeGeometries([
    new THREE.CylinderGeometry(0.34, 0.34, 0.04, 24).translate(0, 1.08, 0),
    new THREE.CylinderGeometry(0.04, 0.04, 1.06, 8).translate(0, 0.53, 0),
    new THREE.CylinderGeometry(0.24, 0.26, 0.03, 20).translate(0, 0.015, 0),
  ]);
}

function sofaGeometry() {
  return mergeGeometries([
    new THREE.BoxGeometry(1.9, 0.26, 0.8).translate(0, 0.2, 0),
    new THREE.BoxGeometry(1.7, 0.12, 0.62).translate(0, 0.39, 0.06),
    new THREE.BoxGeometry(1.9, 0.4, 0.18).translate(0, 0.53, -0.31),
    new THREE.BoxGeometry(0.16, 0.26, 0.8).translate(-0.87, 0.46, 0),
    new THREE.BoxGeometry(0.16, 0.26, 0.8).translate(0.87, 0.46, 0),
  ]);
}

/**
 * An instanced pool whose members glide from their last position to the new one with a small stagger,
 * and shrink away when unused. With `from`, newcomers walk in from that point (the elevators, check-in)
 * and leavers walk back out to it; `sway` lets standing guests shift their weight.
 */
function Pool({
  items,
  max,
  geometry,
  color,
  palette,
  scaleFromRot,
  from,
  rate = 7,
  sway,
  vary,
}: {
  items: P[];
  max: number;
  geometry: THREE.BufferGeometry;
  color: string;
  palette?: THREE.Color[];
  /** use the third value as x-length (long tables) or size (coffee tables) */
  scaleFromRot?: "length" | "size";
  from?: [number, number];
  rate?: number;
  sway?: boolean;
  /** scale for every member, times a little per-member height variation */
  vary?: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const cur = useRef<Float32Array>(new Float32Array(max * 4)); // x, z, rot, s
  const t0 = useRef(0);
  const clock = useRef(0);

  useLayoutEffect(() => {
    t0.current = clock.current;
    if (palette && ref.current) {
      for (let i = 0; i < max; i++) ref.current.setColorAt(i, palette[(i * 7) % palette.length]);
      ref.current.instanceColor!.needsUpdate = true;
    }
  }, [items, palette, max]);

  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const e = useMemo(() => new THREE.Euler(), []);
  const v = useMemo(() => new THREE.Vector3(), []);
  const s = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dt) => {
    clock.current += dt;
    const mesh = ref.current;
    if (!mesh) return;
    const c = cur.current;
    for (let i = 0; i < max; i++) {
      const it = items[i];
      const started = clock.current - t0.current > i * 0.006;
      const k = started ? 1 - Math.exp(-dt * rate) : 0;
      const o = i * 4;
      if (it) {
        if (c[o + 3] < 0.01) {
          // Newcomers start at the door, or where they'll stand
          c[o] = from ? from[0] : it[0];
          c[o + 1] = from ? from[1] : it[1];
          c[o + 2] = scaleFromRot ? 0 : it[2];
        }
        c[o] += (it[0] - c[o]) * k;
        c[o + 1] += (it[1] - c[o + 1]) * k;
        if (!scaleFromRot) c[o + 2] += (it[2] - c[o + 2]) * k;
        c[o + 3] += (1 - c[o + 3]) * (from ? Math.min(1, k * 2) : k);
      } else {
        const out = 1 - Math.exp(-dt * (from ? 3 : 9));
        if (from && c[o + 3] > 0.01) {
          c[o] += (from[0] - c[o]) * out;
          c[o + 1] += (from[1] - c[o + 1]) * out;
        }
        c[o + 3] += (0 - c[o + 3]) * out;
      }
      const sc = c[o + 3];
      let sx = 1;
      let sy = 1;
      let sz = 1;
      if (vary) {
        const h = 0.94 + ((i * 37) % 13) / 100; // a spread of heights, stable per member
        sx = sz = vary;
        sy = vary * h;
      }
      if (scaleFromRot === "length" && it) sx = it[2];
      if (scaleFromRot === "size" && it && it[2]) {
        sx *= it[2];
        sz *= it[2];
      }
      e.set(0, c[o + 2] + (sway ? Math.sin(clock.current * 0.7 + i * 1.7) * 0.12 : 0), 0);
      q.setFromEuler(e);
      v.set(c[o], 0, c[o + 1]);
      s.set(sx * sc, sy * sc, sz * sc);
      m.compose(v, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[geometry, undefined, max]} castShadow receiveShadow frustumCulled={false}>
      <meshStandardMaterial color={palette ? "#ffffff" : color} roughness={0.75} />
    </instancedMesh>
  );
}

/* ------------------------------------------------------------------ the room */

/** What the rig shares with everything that reacts to the camera: where it looks from, and what it frames. */
type View = { tx: number; tz: number; dx: number; dz: number; pitch: number; box: Box };
type ViewRef = RefObject<View>;

/** Whether a block at (x, z) with this half-size sits between the camera and what it's framing. */
function blocks(v: View, x: number, z: number, half: number) {
  if (v.pitch > 1.15) return false;
  const rx = x - v.tx;
  const rz = z - v.tz;
  const along = rx * v.dx + rz * v.dz;
  const across = Math.abs(rx * -v.dz + rz * v.dx);
  const bw = (v.box.x1 - v.box.x0) / 2;
  const bd = (v.box.z1 - v.box.z0) / 2;
  const reach = Math.abs(v.dz) * bw + Math.abs(v.dx) * bd;
  const depth = Math.abs(v.dx) * bw + Math.abs(v.dz) * bd;
  return along > depth * 0.4 && across < reach + half * 0.7;
}

/**
 * A wall or window run along the outline. When it stands between the camera and the room it drops to a
 * sill (walls) or clears (glass), so the camera can look in from any side.
 */
function CutRun({ seg, n, h, t, glass, view }: { seg: Seg; n: [number, number]; h: number; t: number; glass?: boolean; view: ViewRef }) {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const [x0, z0, x1, z1] = seg;
  const len = Math.hypot(x1 - x0, z1 - z0);
  // Grows up from the floor, so lowering it leaves a sill
  const geo = useMemo(() => new THREE.BoxGeometry(len + t, h, t).translate(0, h / 2, 0), [len, t, h]);
  useFrame((_, dt) => {
    const v = view.current;
    const front = n[0] * v.dx + n[1] * v.dz > 0.2 && v.pitch < 1.15;
    const m = ref.current;
    if (!m) return;
    m.scale.y = THREE.MathUtils.damp(m.scale.y, front ? 0.12 : 1, 5, dt);
    if (glass && mat.current) mat.current.opacity = THREE.MathUtils.damp(mat.current.opacity, front ? 0.06 : 0.32, 5, dt);
  });
  return (
    <mesh ref={ref} geometry={geo} position={[(x0 + x1) / 2, 0, (z0 + z1) / 2]} rotation={[0, -Math.atan2(z1 - z0, x1 - x0), 0]} castShadow={!glass} receiveShadow={!glass}>
      {glass ? (
        <meshStandardMaterial ref={mat} color={col.glass} transparent opacity={0.32} roughness={0.08} metalness={0.2} depthWrite={false} />
      ) : (
        <meshStandardMaterial color={col.wall} roughness={0.9} />
      )}
    </mesh>
  );
}

/** A core, an enclosed room or a neighbouring building: it sinks to a footprint when it would hide the event. */
function CutBlock({ r, h, color, view, children }: { r: Rect; h: number; color: string; view: ViewRef; children?: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const half = Math.hypot(r.w, r.d) / 2;
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const hide = blocks(view.current, r.x, r.z, half);
    g.scale.y = THREE.MathUtils.damp(g.scale.y, hide ? 0.1 : 1, 4, dt);
    if (mat.current) mat.current.opacity = THREE.MathUtils.damp(mat.current.opacity, hide ? 0.55 : 1, 4, dt);
  });
  return (
    <group ref={ref} position={[r.x, 0, r.z]}>
      {children ?? (
        <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[r.w, h, r.d]} />
          <meshStandardMaterial ref={mat} color={color} roughness={0.9} transparent />
        </mesh>
      )}
    </group>
  );
}

function Run({ seg, h, t, y = 0, children, shadow }: { seg: Seg; h: number; t: number; y?: number; children: React.ReactNode; shadow?: boolean }) {
  const [x0, z0, x1, z1] = seg;
  const len = Math.hypot(x1 - x0, z1 - z0);
  return (
    <mesh position={[(x0 + x1) / 2, y + h / 2, (z0 + z1) / 2]} rotation={[0, -Math.atan2(z1 - z0, x1 - x0), 0]} castShadow={shadow} receiveShadow={shadow}>
      <boxGeometry args={[len + t, h, t]} />
      {children}
    </mesh>
  );
}

function Block({ r, h, color, y = 0 }: { r: Rect; h: number; color: string; y?: number }) {
  return (
    <mesh position={[r.x, y + h / 2, r.z]} castShadow receiveShadow>
      <boxGeometry args={[r.w, h, r.d]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}

const sameSeg = (a: Seg, b: Seg) =>
  (a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3]) || (a[0] === b[2] && a[1] === b[3] && a[2] === b[0] && a[3] === b[1]);

/**
 * A floor finish drawn once into a canvas and tiled by the meter: oak planks for Sky Bar, pale stone
 * for the lounges, polished concrete for The Sandbox, grass for the park. Subtle on purpose.
 */
function finishTexture(finish: Shell["finish"]) {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  let seed = 3;
  const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let tile = 4; // meters the canvas covers
  if (finish === "oak") {
    tile = 3.6;
    const rows = 20;
    const h = size / rows;
    for (let y = 0; y < rows; y++) {
      let x = -r() * 200;
      while (x < size) {
        const w = 120 + r() * 160;
        const l = 70 + r() * 9;
        g.fillStyle = `hsl(32 ${30 + r() * 8}% ${l}%)`;
        g.fillRect(x, y * h, w, h);
        g.fillStyle = "rgba(90,60,30,0.18)";
        g.fillRect(x, y * h, 1.5, h);
        x += w;
      }
      g.fillStyle = "rgba(90,60,30,0.16)";
      g.fillRect(0, y * h, size, 1);
    }
  } else if (finish === "grass") {
    tile = 6;
    g.fillStyle = "#b7c2a3";
    g.fillRect(0, 0, size, size);
    for (let i = 0; i < 9000; i++) {
      g.fillStyle = `hsl(${80 + r() * 20} ${18 + r() * 14}% ${55 + r() * 18}% / 0.5)`;
      g.fillRect(r() * size, r() * size, 2, 2 + r() * 3);
    }
  } else {
    const concrete = finish === "concrete";
    tile = concrete ? 6 : 2.4;
    g.fillStyle = concrete ? "#d3cfc6" : "#e4dac8";
    g.fillRect(0, 0, size, size);
    for (let i = 0; i < 14000; i++) {
      g.fillStyle = `rgba(${r() < 0.5 ? "255,255,255" : "80,70,60"},${0.02 + r() * 0.04})`;
      g.fillRect(r() * size, r() * size, 2, 2);
    }
    g.strokeStyle = concrete ? "rgba(80,70,60,0.14)" : "rgba(120,100,75,0.24)";
    g.lineWidth = 2;
    const n = 2;
    for (let i = 0; i <= n; i++) {
      g.beginPath();
      g.moveTo((i * size) / n, 0);
      g.lineTo((i * size) / n, size);
      g.moveTo(0, (i * size) / n);
      g.lineTo(size, (i * size) / n);
      g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / tile, 1 / tile);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** The room itself: floor, walls and windows that clear out of the way, cores, rooms, neighbours and trees. */
function Room({ shell, view }: { shell: Shell; view: ViewRef }) {
  const { outline, glass, solids, rooms = [], context = [], fixed = {}, outdoor } = shell;

  const floor = useMemo(() => new THREE.ShapeGeometry(new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z)))), [outline]);
  const tex = useMemo(() => finishTexture(shell.finish ?? (outdoor ? "grass" : "stone")), [shell.finish, outdoor]);

  const edges = useMemo(() => outline.map((p, i) => [...p, ...outline[(i + 1) % outline.length]] as Seg), [outline]);
  const walls = outdoor ? [] : edges.filter((e) => !glass.some((g) => sameSeg(e, g)));

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <primitive object={floor} attach="geometry" />
        <meshStandardMaterial map={tex} roughness={shell.finish === "concrete" ? 0.6 : 0.85} />
      </mesh>
      <Slab outline={outline} />
      {walls.map((s, i) => (
        <CutRun key={`w${i}`} seg={s} n={outward(s, outline)} h={0.5} t={0.16} view={view} />
      ))}
      {glass.map((s, i) => (
        <CutRun key={`g${i}`} seg={s} n={outward(s, outline)} h={1.6} t={0.05} glass view={view} />
      ))}
      {solids.map((r, i) => (
        <CutBlock key={`s${i}`} r={r} h={1.1} color={col.solid} view={view} />
      ))}
      {rooms.map((r, i) => (
        <CutBlock key={`r${i}`} r={r} h={1} color={col.wall} view={view}>
          {roomWalls(r).map((s, k) => (
            <Run key={k} seg={[s[0] - r.x, s[1] - r.z, s[2] - r.x, s[3] - r.z]} h={1} t={0.1} shadow>
              <meshStandardMaterial color={col.wall} roughness={0.9} />
            </Run>
          ))}
        </CutBlock>
      ))}
      {context.map((r, i) => (
        <CutBlock key={`c${i}`} r={r} h={r.h} color={col.context} view={view} />
      ))}
      {(fixed.marks ?? []).map((r, i) => (
        <Block key={`m${i}`} r={r} h={0.03} color={col.mark} />
      ))}
      {fixed.screen && (
        <Run seg={fixed.screen} h={1.1} t={0.06} y={0.45} shadow>
          <meshStandardMaterial color={col.screen} roughness={0.35} metalness={0.2} />
        </Run>
      )}
      {fixed.trees && <Trees trees={fixed.trees} view={view} />}
    </group>
  );
}

/** Redwoods. Any standing between the camera and the event shrink to saplings so the crowd stays in view. */
function Trees({ trees, view }: { trees: [number, number][]; view: ViewRef }) {
  const refs = useRef<(THREE.Group | null)[]>([]);
  useFrame((_, dt) => {
    trees.forEach(([x, z], i) => {
      const g = refs.current[i];
      if (!g) return;
      g.scale.y = THREE.MathUtils.damp(g.scale.y, blocks(view.current, x, z, 1.2) ? 0.22 : 1, 3, dt);
    });
  });
  return (
    <>
      {trees.map(([x, z], i) => {
        const h = 5.5 + ((i * 37) % 10) / 4;
        return (
          <group
            key={i}
            ref={(g) => {
              refs.current[i] = g;
            }}
            position={[x, 0, z]}
          >
            <mesh position={[0, 0.9, 0]} castShadow>
              <cylinderGeometry args={[0.18, 0.24, 1.8, 6]} />
              <meshStandardMaterial color={col.trunk} roughness={1} />
            </mesh>
            <mesh position={[0, 1.2 + h / 2, 0]} castShadow>
              <coneGeometry args={[1.1, h, 7]} />
              <meshStandardMaterial color={col.tree} roughness={1} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

/** A slab under the floor gives the model a cut edge, like an architect's model. */
function Slab({ outline }: { outline: [number, number][] }) {
  const geo = useMemo(() => {
    const shape = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z)));
    return new THREE.ExtrudeGeometry(shape, { depth: 0.24, bevelEnabled: false }).rotateX(-Math.PI / 2).translate(0, -0.245, 0);
  }, [outline]);
  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial color="#e6e1d8" roughness={0.95} />
    </mesh>
  );
}

/** Four walls of an enclosed room, with a door gap in the side facing the middle of the floor. */
function roomWalls(r: Rect): Seg[] {
  const [x0, x1, z0, z1] = [r.x - r.w / 2, r.x + r.w / 2, r.z - r.d / 2, r.z + r.d / 2];
  const sides: Seg[] = [
    [x0, z0, x1, z0],
    [x1, z0, x1, z1],
    [x1, z1, x0, z1],
    [x0, z1, x0, z0],
  ];
  // The door goes in the side nearest the origin
  const mids = sides.map(([a, b, c, d]) => Math.hypot((a + c) / 2, (b + d) / 2));
  const door = mids.indexOf(Math.min(...mids));
  return sides.flatMap((s, i) => {
    if (i !== door) return [s];
    const [a, b, c, d] = s;
    const len = Math.hypot(c - a, d - b);
    const k = Math.max(0, (len - 1.4) / 2 / len);
    return [
      [a, b, a + (c - a) * k, b + (d - b) * k],
      [c - (c - a) * k, d - (d - b) * k, c, d],
    ] as Seg[];
  });
}

/** Stage or bar that grows up out of the floor when the setup needs it. Bars get a darker counter top. */
function Toggle({ r, h, on, color, counter }: { r: Rect; h: number; on: boolean; color: string; counter?: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    const m = ref.current;
    if (!m) return;
    m.scale.y = THREE.MathUtils.damp(m.scale.y, on ? 1 : 0.0001, 6, dt);
    m.visible = m.scale.y > 0.01;
  });
  return (
    <group ref={ref} position={[r.x, 0, r.z]} scale={[1, 0.0001, 1]}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[r.w, h, r.d]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      {counter && (
        <mesh position={[0, h + 0.025, 0]} castShadow>
          <boxGeometry args={[r.w + 0.12, 0.05, r.d + 0.12]} />
          <meshStandardMaterial color="#2f2a26" roughness={0.3} />
        </mesh>
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ labels */

type Tag = { at: [number, number, number]; text: string; tone: "chip" | "street"; hidden?: boolean; note?: string };

/** Everything worth naming in the room: cores, rooms, marks, neighbours, bars, the stage and (in overview) the streets. */
function tagsFor(shell: Shell, bar: boolean, stage: boolean, streets: boolean): Tag[] {
  const { solids, rooms = [], context = [], fixed = {}, streets: st, outdoor } = shell;
  const b = shellBounds(shell);
  const pad = outdoor ? 3 : 1.4;
  const chip = (r: Rect, y: number, hidden?: boolean): Tag => ({ at: [r.x, y, r.z], text: r.label!, tone: "chip", hidden, note: r.note });
  const street = (at: [number, number, number], text?: string): Tag[] => (text ? [{ at, text, tone: "street", hidden: !streets }] : []);
  return [
    ...[...solids, ...(fixed.marks ?? [])].filter((r) => r.label).map((r) => chip(r, 0.7)),
    // Rooms are named at their north wall so the label never sits on the furniture inside
    ...rooms.filter((r) => r.label).map((r) => chip({ ...r, z: r.z - r.d / 2 + 0.7 }, 1)),
    ...context.filter((r) => r.label).map((r) => chip(r, r.h + 0.5)),
    ...(fixed.bars ?? []).filter((r) => r.label).map((r) => chip(r, 1.4, !(r.always || bar))),
    ...(fixed.stage ? [chip({ ...fixed.stage, label: fixed.stage.label ?? "Stage" }, 1, !stage)] : []),
    ...street([b.cx, 0, b.z0 - pad], st?.n),
    ...street([b.cx, 0, b.z1 + pad], st?.s),
    ...street([b.x1 + pad, 0, b.cz], st?.e),
  ];
}

const _proj = new THREE.Vector3();

/**
 * Moves each DOM label to its anchor's screen position every frame. Plain DOM (not drei's Html) so
 * labels never mount their own React roots, as in the tower explorer. Labels far off in the distance
 * or behind the camera fade out.
 */
function TagTracker({ tags, els }: { tags: Tag[]; els: RefObject<(HTMLElement | null)[]> }) {
  useFrame(({ camera, size }) => {
    tags.forEach((t, i) => {
      const el = els.current[i];
      if (!el) return;
      _proj.set(...t.at).project(camera);
      const off = _proj.z > 1 || Math.abs(_proj.x) > 1.1 || Math.abs(_proj.y) > 1.1;
      el.style.transform = `translate3d(${((_proj.x + 1) / 2) * size.width}px, ${((1 - _proj.y) / 2) * size.height}px, 0) translate(-50%, -50%)`;
      el.style.opacity = t.hidden || off ? "0" : "1";
      el.style.pointerEvents = t.hidden || off || t.tone !== "chip" ? "none" : "auto";
    });
  });
  return null;
}

/* ------------------------------------------------------------------ camera */

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * The camera. It eases to each setup's framing (sweeping the short way round), fits the framed box to
 * the stage exactly, lets you drag it round and tilt it, and drifts gently on its own when left alone.
 */
function Rig({
  frame,
  view,
  onInteract,
  still,
  look,
  onLook,
}: {
  frame: ReturnType<typeof frameFor>;
  view: ViewRef;
  onInteract?: () => void;
  still?: boolean;
  /** Stand at a window looking out, blending away from the orbit; null walks back */
  look?: Lookout | null;
  /** Called once the camera is most of the way to the window, for the photo to take over */
  onLook?: () => void;
}) {
  const { camera, size } = useThree();
  const orbit = useOrbit({ onInteract });
  const cam = useRef({ yaw: frame.yaw, pitch: frame.pitch, radius: 0, box: { ...frame.box }, drift: 0, dir: 1 });
  const arrived = useRef(false);
  // How far toward the window the camera is (0 orbiting, 1 standing there), and the last window, for the walk back
  const at = useRef(0);
  const lastLook = useRef<Lookout | null>(null);
  const told = useRef(false);
  const _eye = useRef(new THREE.Vector3());
  const _tgt = useRef(new THREE.Vector3());

  // A new framing (another setup or view) clears what the user had dragged, so the move lands cleanly
  const key = `${frame.yaw.toFixed(3)}|${frame.pitch}|${frame.box.x0.toFixed(2)}|${frame.box.z0.toFixed(2)}|${frame.box.x1.toFixed(2)}|${frame.box.z1.toFixed(2)}`;
  const lastKey = useRef(key);

  useFrame((_, dt) => {
    const c = cam.current;
    const o = orbit;
    const now = performance.now();
    if (lastKey.current !== key) {
      lastKey.current = key;
      o.yaw.current = 0;
      o.pitch.current = 0;
      o.vel.current = 0;
      c.drift = 0;
      o.idleUntil.current = now + 2500;
    }

    if (!o.dragging.current) {
      o.yaw.current += o.vel.current * dt * 1000;
      o.vel.current = THREE.MathUtils.damp(o.vel.current, 0, 4, dt);
      // After a while alone, a slow ping-pong drift keeps the model feeling alive
      if (!still && !look && now > o.idleUntil.current) {
        c.drift += dt * 0.045 * c.dir;
        const lim = Math.min(0.32, frame.range);
        if (Math.abs(c.drift) > lim) c.dir = -Math.sign(c.drift);
        o.pitch.current = THREE.MathUtils.damp(o.pitch.current, 0, 0.8, dt);
      }
    }
    o.yaw.current = THREE.MathUtils.clamp(o.yaw.current, -frame.range, frame.range);
    const pitch = THREE.MathUtils.clamp(frame.pitch + o.pitch.current, 0.28, 1.45);
    o.pitch.current = pitch - frame.pitch;

    const aim = frame.yaw + o.yaw.current + c.drift;
    const k = arrived.current ? (o.dragging.current ? 12 : 2.4) : 60;
    c.yaw += wrap(aim - c.yaw) * (1 - Math.exp(-k * dt));
    c.pitch += (pitch - c.pitch) * (1 - Math.exp(-(arrived.current ? 3 : 60) * dt));
    for (const p of ["x0", "x1", "y0", "y1", "z0", "z1"] as const) c.box[p] = THREE.MathUtils.damp(c.box[p], frame.box[p], arrived.current ? 2.4 : 60, dt);
    const want = fitRadius(c.box, c.yaw, c.pitch, (FOV * Math.PI) / 180, size.width / Math.max(1, size.height));
    c.radius = arrived.current ? THREE.MathUtils.damp(c.radius, want, 2.4, dt) : want;
    arrived.current = true;

    const tx = (c.box.x0 + c.box.x1) / 2;
    const ty = (c.box.y0 + c.box.y1) / 2;
    const tz = (c.box.z0 + c.box.z1) / 2;
    const dx = Math.cos(c.yaw);
    const dz = Math.sin(c.yaw);
    camera.position.set(tx + Math.cos(c.pitch) * dx * c.radius, ty + Math.sin(c.pitch) * c.radius, tz + Math.cos(c.pitch) * dz * c.radius);
    const pc = camera as THREE.PerspectiveCamera;
    pc.far = c.radius * 4;
    pc.near = Math.max(0.1, c.radius / 200);

    // Walking to the window: ease from the orbit to eye level just inside the glass, looking out
    if (look) lastLook.current = look;
    at.current = THREE.MathUtils.damp(at.current, look ? 1 : 0, look ? 1.7 : 2.6, dt);
    const L = lastLook.current;
    if (L && at.current > 0.001) {
      const e = at.current * at.current * (3 - 2 * at.current);
      _eye.current.set(...L.eye);
      _tgt.current.set(tx + (L.at[0] - tx) * e, ty + (L.at[1] - ty) * e, tz + (L.at[2] - tz) * e);
      camera.position.lerp(_eye.current, e);
      camera.lookAt(_tgt.current);
      pc.near = THREE.MathUtils.lerp(pc.near, 0.05, e);
      pc.far = Math.max(pc.far, 80);
    } else camera.lookAt(tx, ty, tz);
    if (look && at.current > 0.55 && !told.current) {
      told.current = true;
      onLook?.();
    }
    if (!look) told.current = false;
    pc.updateProjectionMatrix();

    const v = view.current;
    v.tx = tx;
    v.tz = tz;
    v.dx = dx;
    v.dz = dz;
    v.pitch = c.pitch;
    v.box = c.box;
  });
  return null;
}

/* ------------------------------------------------------------------ scene */

/** Where guests arrive from: the elevators nearest the event, else check-in, else the zone's edge. */
function entryFor(shell: Shell, spec: SetupSpec): [number, number] {
  const zs = shell.zones[spec.zone] ?? [];
  const zx = zs.length ? zs.reduce((s, r) => s + r.x, 0) / zs.length : 0;
  const zz = zs.length ? zs.reduce((s, r) => s + r.z, 0) / zs.length : 0;
  const doors = [...shell.solids.filter((r) => /elevator/i.test(r.label ?? "")), ...(shell.fixed?.marks ?? []).filter((r) => /check-in/i.test(r.label ?? ""))];
  if (!doors.length) return [zx, zs[0] ? zs[0].z + zs[0].d / 2 : zz];
  const d = doors.reduce((a, b) => ((a.x - zx) ** 2 + (a.z - zz) ** 2 < (b.x - zx) ** 2 + (b.z - zz) ** 2 ? a : b));
  // Step just outside the core, toward the event
  const len = Math.hypot(zx - d.x, zz - d.z) || 1;
  const out = Math.max(d.w, d.d) / 2 + 0.8;
  return [d.x + ((zx - d.x) / len) * out, d.z + ((zz - d.z) / len) * out];
}

export default function SetupCanvas({
  shell,
  spec,
  setup,
  guests,
  preset = "close",
  active = true,
  labels = true,
  onReady,
  onInteract,
  look,
  onLook,
}: {
  shell: Shell;
  spec: SetupSpec;
  setup: Setup;
  guests: number;
  preset?: Preset;
  active?: boolean;
  labels?: boolean;
  onReady?: () => void;
  onInteract?: () => void;
  /** Stand at this window looking out; null returns to the orbit */
  look?: Lookout | null;
  /** The camera reached the window */
  onLook?: () => void;
}) {
  const layout = useMemo(() => makeLayout(setup, guests, shell, spec), [setup, guests, shell, spec]);

  // Frame the setup at its full size, so dragging the guest count re-fills the room without the camera moving
  const full = useMemo(() => makeLayout(setup, spec.max, shell, spec), [setup, shell, spec]);
  const framed = useMemo(() => frameFor(shell, spec, setup, full, preset), [shell, spec, setup, full, preset]);

  // A tapped label flies the camera to it. It belongs to the setup and view it was tapped in, so picking
  // another of either lets it go without an effect.
  const [picked, setPicked] = useState<{ i: number; setup: Setup; preset: Preset } | null>(null);
  const focus = picked && picked.setup === setup && picked.preset === preset ? picked.i : null;

  const geo = useMemo(
    () => ({
      chair: chairGeometry(),
      round: roundGeometry(),
      coffee: coffeeGeometry(),
      long: new THREE.BoxGeometry(1, 0.74, 0.9).translate(0, 0.37, 0),
      high: highGeometry(),
      person: personGeometry(),
      sofa: sofaGeometry(),
    }),
    [],
  );
  const rounds = useMemo(() => layout.rounds.filter((r) => !r[2]), [layout.rounds]);
  const coffee = useMemo(() => layout.rounds.filter((r) => r[2]), [layout.rounds]);
  const entry = useMemo(() => entryFor(shell, spec), [shell, spec]);

  const b = shellBounds(shell);
  const f = shell.fixed ?? {};
  const view = useRef<View>({ tx: b.cx, tz: b.cz, dx: 0.7, dz: 0.7, pitch: 0.8, box: framed.box });

  // Fit the shadow camera to the floor so small rooms get crisp shadows and big ones aren't clipped
  const reach = Math.max(b.w, b.d) * 0.62;
  // Crowds drawn one figure per several guests read better a little larger
  const figure = layout.per > 1 ? 1.25 : 1;

  const tags = useMemo(() => (labels ? tagsFor(shell, layout.bar, layout.stage, preset === "overview") : []), [labels, shell, layout.bar, layout.stage, preset]);
  const els = useRef<(HTMLElement | null)[]>([]);
  const focused = focus != null ? tags[focus] : undefined;
  const frame = useMemo(() => (focused ? focusFrame(shell, [focused.at[0], focused.at[2]]) : framed), [focused, shell, framed]);

  useEffect(() => {
    if (focus == null) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setPicked(null);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [focus]);

  return (
    <div className="relative h-full w-full cursor-grab touch-pan-y active:cursor-grabbing [&_canvas]:touch-pan-y">
      <Canvas shadows dpr={[1, 2]} frameloop={active ? "always" : "never"} gl={{ antialias: true, alpha: true }} onCreated={() => onReady?.()} aria-hidden>
        <PerspectiveCamera makeDefault fov={FOV} position={[b.cx + 30, 30, b.cz + 30]} />
        <Rig frame={frame} view={view} onInteract={onInteract} still={preset === "top" || focus != null} look={look} onLook={onLook} />
        {/* Soft, even studio light made from panels, so nothing loads from the network */}
        <Environment resolution={64} frames={1}>
          <Lightformer intensity={0.55} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[20, 20, 1]} />
          <Lightformer intensity={0.35} position={[-8, 3, 6]} rotation-y={Math.PI / 3} scale={[10, 4, 1]} color="#fff1df" />
          <Lightformer intensity={0.25} position={[8, 3, -6]} rotation-y={-Math.PI / 2} scale={[10, 4, 1]} color="#e6eef4" />
        </Environment>
        <hemisphereLight args={["#ffffff", "#cfc8bb", 0.55]} />
        <directionalLight
          position={[b.cx - 8, 16, b.cz + 10]}
          intensity={1.7}
          color="#fff4e6"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-reach}
          shadow-camera-right={reach}
          shadow-camera-top={reach}
          shadow-camera-bottom={-reach}
          shadow-camera-far={Math.max(60, reach * 4)}
          shadow-bias={-0.0004}
          shadow-normalBias={0.02}
        />
        <Room shell={shell} view={view} />
        <Pool items={layout.chairs} max={480} geometry={geo.chair} color={col.chair} />
        <Pool items={rounds} max={64} geometry={geo.round} color={col.cloth} />
        <Pool items={coffee} max={40} geometry={geo.coffee} color={col.wood} scaleFromRot="size" />
        <Pool items={layout.longs} max={60} geometry={geo.long} color={col.wood} scaleFromRot="length" />
        <Pool items={layout.highs} max={40} geometry={geo.high} color={col.cloth} />
        <Pool items={layout.people} max={240} geometry={geo.person} color="#fff" palette={guestColors} from={entry} rate={2.6} sway vary={figure} />
        <Pool items={layout.sofas} max={40} geometry={geo.sofa} color={col.sofa} />
        {f.stage && <Toggle r={f.stage} h={f.stage.always ? 0.6 : 0.24} on={layout.stage} color={col.stage} />}
        {(f.bars ?? []).map((r, i) => (
          <Toggle key={i} r={r} h={1} on={!!r.always || layout.bar} color={col.wood} counter />
        ))}
        <ContactShadows position={[b.cx, 0.005, b.cz]} opacity={0.35} scale={Math.max(b.w, b.d) * 1.4} blur={2.2} far={2.5} />
        <TagTracker tags={tags} els={els} />
      </Canvas>
      <div className={cn("pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-300", look && "opacity-0")}>
        {tags.map((t, i) =>
          t.tone === "chip" ? (
            <button
              key={`${t.text}${i}`}
              ref={(el) => {
                els.current[i] = el;
              }}
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setPicked(focus === i ? null : { i, setup, preset })}
              aria-pressed={focus === i}
              aria-label={focus === i ? `${t.text}: back to the room` : `Look closer at ${t.text}`}
              className={cn(
                "absolute left-0 top-0 max-w-[15rem] cursor-pointer rounded-[14px] text-left opacity-0 shadow-[var(--shadow-ring)] backdrop-blur-sm transition-[opacity,background-color,color] duration-500",
                focus === i ? "z-10 bg-ink px-3 py-2 text-paper" : "bg-paper/85 px-2 py-0.5 text-stone hover:bg-paper hover:text-ink",
              )}
            >
              <span className="block whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.06em]">{t.text}</span>
              {focus === i && t.note && <span className="mt-1 block text-[0.75rem] leading-snug text-paper/85">{t.note}</span>}
            </button>
          ) : (
            <span
              key={`${t.text}${i}`}
              ref={(el) => {
                els.current[i] = el;
              }}
              aria-hidden
              className="absolute left-0 top-0 whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.14em] text-stone-2 opacity-0 transition-opacity duration-500"
            >
              {t.text}
            </span>
          ),
        )}
      </div>
    </div>
  );
}
