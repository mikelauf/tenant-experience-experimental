"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, PerspectiveCamera } from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { cn } from "@/lib/cn";
import type { Interior, InteriorPiece, PropKind } from "@/lib/data/types";
import { TONE } from "../tower/interior";
import { fitRadius, type Box } from "../setup/camera";
import { finishTexture, type Finish } from "../setup/finish";
import { useOrbit } from "../useOrbit";
import { propGeometry, ROUGH, STRETCH } from "./props";

const FOV = 28;
/** A storey, in meters: piece heights are fractions of it */
const STOREY = 3.9;
/** Where the camera rests: from the south-east, looking in over the south windows */
const YAW = Math.PI / 2 - 0.55;
const PITCH = 0.78;

const FINISH: Record<Interior["floor"], Finish> = { wood: "oak", stone: "stone", rubber: "rubber" };
const PRECAST = "#e6e0d5";

type Plate = Interior["plate"];

/* ------------------------------------------------------------------ the shell */

/**
 * One face of the Pyramid at this floor: a precast sill, piers between the narrow windows, and a spandrel over
 * them, leaning in as the building does. The faces nearest the camera drop to their sills so you can see in.
 */
function Face({ len, pos, rot }: { len: number; pos: [number, number, number]; rot: number }) {
  const ref = useRef<THREE.Group>(null);
  const glass = useRef<THREE.MeshStandardMaterial>(null);
  const out = useMemo(() => new THREE.Vector2(-Math.sin(rot), -Math.cos(rot)), [rot]);
  const precast = useMemo(() => {
    // Piers and the spandrel over them, standing on the sill
    const parts = [new THREE.BoxGeometry(len, 0.4, 0.3).translate(0, 2.8, 0)];
    const n = Math.round(len / 1.9);
    for (let i = 0; i <= n; i++) parts.push(new THREE.BoxGeometry(0.5, 2.6, 0.3).translate(-len / 2 + (i * len) / n, 1.3, 0));
    return mergeGeometries(parts)!;
  }, [len]);
  useEffect(() => () => precast.dispose(), [precast]);

  useFrame(({ camera }, dt) => {
    const g = ref.current;
    if (!g) return;
    const v = new THREE.Vector2(camera.position.x, camera.position.z).normalize();
    const front = v.dot(out) > 0.3;
    // Only what stands on the sill shrinks away
    g.scale.y = THREE.MathUtils.damp(g.scale.y, front ? 0.001 : 1, 5, dt);
    g.visible = g.scale.y > 0.01;
    if (glass.current) glass.current.opacity = THREE.MathUtils.damp(glass.current.opacity, front ? 0 : 0.28, 5, dt);
  });

  return (
    <group position={pos} rotation={[0, rot, 0]}>
      <mesh position={[0, 0.225, 0]} castShadow receiveShadow>
        <boxGeometry args={[len, 0.45, 0.3]} />
        <meshStandardMaterial color={PRECAST} roughness={0.9} />
      </mesh>
      {/* The Pyramid's faces lean in about five degrees */}
      <group rotation={[0.09, 0, 0]}>
        <group ref={ref} position={[0, 0.45, 0]}>
          <mesh geometry={precast} castShadow receiveShadow>
            <meshStandardMaterial color={PRECAST} roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.3, 0.04]}>
            <boxGeometry args={[len, 2.6, 0.03]} />
            <meshStandardMaterial ref={glass} color="#bcd3dd" transparent opacity={0.28} roughness={0.08} metalness={0.2} depthWrite={false} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/** The floor, its finish, and a slab under it for a cut edge, like an architect's model */
function Floor({ plate, finish }: { plate: Plate; finish: Interior["floor"] }) {
  const { w, d } = plate;
  const geo = useMemo(
    () =>
      new THREE.ShapeGeometry(
        new THREE.Shape([new THREE.Vector2(-w / 2, -d / 2), new THREE.Vector2(w / 2, -d / 2), new THREE.Vector2(w / 2, d / 2), new THREE.Vector2(-w / 2, d / 2)]),
      ),
    [w, d],
  );
  const tex = useMemo(() => finishTexture(FINISH[finish]), [finish]);
  useEffect(
    () => () => {
      geo.dispose();
      tex.dispose();
    },
    [geo, tex],
  );
  return (
    <>
      <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <meshStandardMaterial map={tex} roughness={finish === "rubber" ? 0.95 : 0.7} />
      </mesh>
      <mesh position={[0, -0.26, 0]} receiveShadow>
        <boxGeometry args={[w + 0.6, 0.5, d + 0.6]} />
        <meshStandardMaterial color="#d9d3c8" roughness={0.95} />
      </mesh>
    </>
  );
}

/* ------------------------------------------------------------------ the pieces */

/** How far into the grow-in a piece at (x, z) is: pieces rise from the middle of the floor outward */
function grown(t: number, x: number, z: number, reach: number) {
  const delay = 0.1 + (Math.hypot(x, z) / reach) * 0.7;
  return THREE.MathUtils.smoothstep(t - delay, 0, 0.55);
}

/** Every piece of one kind, as one instanced mesh, growing up out of the floor */
function Kit({ kind, pieces, plate, clock }: { kind: PropKind; pieces: InteriorPiece[]; plate: Plate; clock: RefObject<number> }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => propGeometry(kind), [kind]);
  useEffect(() => () => geo.dispose(), [geo]);
  const reach = Math.hypot(plate.w, plate.d) / 2;
  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const v = useMemo(() => new THREE.Vector3(), []);
  const s = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const mesh = ref.current;
    if (!mesh || clock.current > 2.5) return;
    pieces.forEach((p, i) => {
      const x = p.x * plate.w;
      const z = p.z * plate.d;
      const k = grown(clock.current, x, z, reach);
      q.setFromAxisAngle(up, p.rot ?? 0);
      v.set(x, 0, z);
      s.set(STRETCH.has(kind) ? (p.len ?? 1) : 1, Math.max(0.001, k), 1);
      m.compose(v, q, s);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[geo, undefined, pieces.length]} castShadow receiveShadow frustumCulled={false}>
      <meshStandardMaterial vertexColors roughness={ROUGH[kind] ?? 0.75} metalness={kind === "espresso" || kind === "dumbbells" ? 0.4 : 0} />
    </instancedMesh>
  );
}

/**
 * Pieces with no kind (studio walls, rugs, the back bar) stay blocks. Walls are cut down to waist height, like
 * an architect's section, and glass partitions a little taller, so the room reads from above.
 */
function Blocks({ pieces, plate, clock }: { pieces: InteriorPiece[]; plate: Plate; clock: RefObject<number> }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const mats = useMemo(() => {
    const out = {} as Record<InteriorPiece["tone"], THREE.MeshStandardMaterial>;
    for (const [k, v] of Object.entries(TONE) as [InteriorPiece["tone"], (typeof TONE)[InteriorPiece["tone"]]][])
      out[k] = new THREE.MeshStandardMaterial({
        color: v.color,
        roughness: v.rough ?? 0.8,
        metalness: v.metal ?? 0,
        transparent: v.opacity != null,
        opacity: v.opacity ?? 1,
        depthWrite: v.opacity == null,
      });
    return out;
  }, []);
  const boxG = useMemo(() => new THREE.BoxGeometry().translate(0, 0.5, 0), []);
  const cylG = useMemo(() => new THREE.CylinderGeometry(0.5, 0.5, 1, 24).translate(0, 0.5, 0), []);
  useEffect(
    () => () => {
      boxG.dispose();
      cylG.dispose();
      Object.values(mats).forEach((x) => x.dispose());
    },
    [boxG, cylG, mats],
  );
  const reach = Math.hypot(plate.w, plate.d) / 2;
  const sized = pieces.map((p) => {
    const w = p.w * plate.w;
    const d = p.d * plate.d;
    let h = Math.max(0.01, p.h * STOREY);
    if (Math.min(w, d) < 0.4) h = Math.min(h, p.tone === "glass" ? 2.4 : 1.2);
    return { p, w, d, h, x: p.x * plate.w, z: p.z * plate.d };
  });

  useFrame(() => {
    if (clock.current > 2.5) return;
    sized.forEach((b, i) => {
      const mesh = refs.current[i];
      if (mesh) mesh.scale.y = Math.max(0.001, grown(clock.current, b.x, b.z, reach) * b.h);
    });
  });

  return (
    <>
      {sized.map((b, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          geometry={b.p.round ? cylG : boxG}
          material={mats[b.p.tone]}
          position={[b.x, 0.004, b.z]}
          scale={[b.w, 0.001, b.d]}
          castShadow={b.p.tone !== "glass" && b.h > 0.1}
          receiveShadow
        />
      ))}
    </>
  );
}

/** The floor opened up: its shell, then its pieces rising in */
function Scene({ interior }: { interior: Interior }) {
  const { plate } = interior;
  const clock = useRef(0);
  useFrame((_, dt) => {
    clock.current += Math.min(dt, 0.05);
  });
  const byKind = useMemo(() => {
    const out = new Map<PropKind, InteriorPiece[]>();
    for (const p of interior.pieces) if (p.kind) out.set(p.kind, [...(out.get(p.kind) ?? []), p]);
    return [...out];
  }, [interior.pieces]);
  const blocks = useMemo(() => interior.pieces.filter((p) => !p.kind), [interior.pieces]);
  const { w, d } = plate;

  return (
    <group>
      <Floor plate={plate} finish={interior.floor} />
      <Face len={w} pos={[0, 0, -d / 2]} rot={0} />
      <Face len={w} pos={[0, 0, d / 2]} rot={Math.PI} />
      <Face len={d} pos={[w / 2, 0, 0]} rot={-Math.PI / 2} />
      <Face len={d} pos={[-w / 2, 0, 0]} rot={Math.PI / 2} />
      <Blocks pieces={blocks} plate={plate} clock={clock} />
      {byKind.map(([kind, list]) => (
        <Kit key={kind} kind={kind} pieces={list} plate={plate} clock={clock} />
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ labels */

type Tag = { at: [number, number, number]; text: string; note?: string };
const _proj = new THREE.Vector3();

/** Moves each DOM label to its anchor on screen every frame, as the setup visualizer's labels do */
function TagTracker({ tags, els }: { tags: Tag[]; els: RefObject<(HTMLElement | null)[]> }) {
  useFrame(({ camera, size }) => {
    tags.forEach((t, i) => {
      const el = els.current[i];
      if (!el) return;
      _proj.set(...t.at).project(camera);
      const off = _proj.z > 1 || Math.abs(_proj.x) > 1.05 || Math.abs(_proj.y) > 1.05;
      el.style.transform = `translate3d(${((_proj.x + 1) / 2) * size.width}px, ${((1 - _proj.y) / 2) * size.height}px, 0) translate(-50%, -50%)`;
      el.style.opacity = off ? "0" : "1";
      el.style.pointerEvents = off ? "none" : "auto";
    });
  });
  return null;
}

/* ------------------------------------------------------------------ camera */

/**
 * Looks down into the room from the south-east. Drag to walk round it (all the way, it's a square room) and tilt;
 * left alone it drifts a little. A picked label draws the camera in to that corner of the floor.
 */
function Rig({ plate, focus }: { plate: Plate; focus: [number, number] | null }) {
  const { camera, size } = useThree();
  const orbit = useOrbit();
  const c = useRef({ yaw: YAW, pitch: PITCH, radius: 0, tx: 0, tz: 0, span: 0, drift: 0, dir: 1, first: true });

  useFrame((_, dt) => {
    const s = c.current;
    const o = orbit;
    const now = performance.now();
    if (!o.dragging.current) {
      o.yaw.current += o.vel.current * dt * 1000;
      o.vel.current = THREE.MathUtils.damp(o.vel.current, 0, 4, dt);
      if (now > o.idleUntil.current) {
        s.drift += dt * 0.03 * s.dir;
        if (Math.abs(s.drift) > 0.22) s.dir = -Math.sign(s.drift);
      }
    }
    const pitch = THREE.MathUtils.clamp(PITCH + o.pitch.current, 0.42, 1.38);
    o.pitch.current = pitch - PITCH;

    const tx = focus ? focus[0] : 0;
    const tz = focus ? focus[1] : 0;
    const span = focus ? 7 : 0;
    const box: Box = focus
      ? { x0: tx - span, x1: tx + span, y0: 0, y1: 2, z0: tz - span, z1: tz + span }
      : { x0: -plate.w / 2, x1: plate.w / 2, y0: 0, y1: 2.4, z0: -plate.d / 2, z1: plate.d / 2 };
    const yaw = YAW + o.yaw.current + s.drift;
    const want = fitRadius(box, yaw, pitch, (FOV * Math.PI) / 180, size.width / Math.max(1, size.height), focus ? 1.02 : 1.1);

    const k = s.first ? 1 : 1 - Math.exp(-(o.dragging.current ? 12 : 2.6) * dt);
    s.yaw += (yaw - s.yaw) * k;
    s.pitch += (pitch - s.pitch) * k;
    const e = s.first ? 1 : 1 - Math.exp(-2.2 * dt);
    s.radius += (want - s.radius) * e;
    s.tx += (tx - s.tx) * e;
    s.tz += (tz - s.tz) * e;
    s.first = false;

    camera.position.set(s.tx + Math.cos(s.pitch) * Math.cos(s.yaw) * s.radius, 0.6 + Math.sin(s.pitch) * s.radius, s.tz + Math.cos(s.pitch) * Math.sin(s.yaw) * s.radius);
    camera.lookAt(s.tx, 0.6, s.tz);
    const pc = camera as THREE.PerspectiveCamera;
    pc.near = Math.max(0.1, s.radius / 200);
    pc.far = s.radius * 4;
    pc.updateProjectionMatrix();
  });
  return null;
}

/* ------------------------------------------------------------------ the canvas */

/**
 * A floor on its own, as a room: no city, no tower around it. The Pyramid's leaning facade frames it, the kit is
 * the real kind of thing (treadmills, racks, banquettes), and the places worth naming are labels you can tap.
 * Pass a new `interior` and the room is rebuilt, its pieces rising in from the middle out.
 */
export default function RoomCanvas({
  id,
  interior,
  active = true,
  onReady,
}: {
  /** Which floor this is; a new one rebuilds the room */
  id: string;
  interior: Interior;
  active?: boolean;
  onReady?: () => void;
}) {
  const { plate } = interior;
  const [picked, setPicked] = useState<{ id: string; i: number } | null>(null);
  const focus = picked && picked.id === id ? picked.i : null;
  const tags = useMemo<Tag[]>(() => interior.labels.map((l) => ({ at: [l.x * plate.w, 1.7, l.z * plate.d], text: l.text, note: l.note })), [interior.labels, plate]);
  const els = useRef<(HTMLElement | null)[]>([]);
  const f = focus != null ? tags[focus] : undefined;
  const reach = Math.max(plate.w, plate.d) * 0.62;

  useLayoutEffect(() => {
    els.current.length = tags.length;
  }, [tags.length]);

  useEffect(() => {
    if (focus == null) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setPicked(null);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [focus]);

  return (
    <div className="relative h-full w-full cursor-grab touch-pan-y active:cursor-grabbing [&_canvas]:touch-pan-y">
      <Canvas
        shadows
        dpr={[1, 2]}
        // Off screen it still draws its first frame (and on changes), so shaders and light are ready before it's seen
        frameloop={active ? "always" : "demand"}
        gl={{ antialias: true, alpha: true }}
        // Layout size, not the transformed box (Lazy3D scales scenes in from 97%)
        resize={{ offsetSize: true }}
        onCreated={() => onReady?.()}
        aria-hidden
      >
        <PerspectiveCamera makeDefault fov={FOV} position={[40, 40, 40]} />
        <Rig plate={plate} focus={f ? [f.at[0], f.at[2]] : null} />
        {/* Soft studio light from panels, so nothing loads from the network */}
        <Environment resolution={64} frames={1}>
          <Lightformer intensity={0.55} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[20, 20, 1]} />
          <Lightformer intensity={0.35} position={[-8, 3, 6]} rotation-y={Math.PI / 3} scale={[10, 4, 1]} color="#fff1df" />
          <Lightformer intensity={0.25} position={[8, 3, -6]} rotation-y={-Math.PI / 2} scale={[10, 4, 1]} color="#e6eef4" />
        </Environment>
        <hemisphereLight args={["#ffffff", "#cfc8bb", 0.6]} />
        {/* Daylight through the north-west glass */}
        <directionalLight
          position={[-14, 22, -12]}
          intensity={1.7}
          color="#fff4e6"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-reach}
          shadow-camera-right={reach}
          shadow-camera-top={reach}
          shadow-camera-bottom={-reach}
          shadow-camera-far={90}
          shadow-bias={-0.0004}
          shadow-normalBias={0.02}
        />
        <Scene key={id} interior={interior} />
        <ContactShadows position={[0, 0.006, 0]} opacity={0.3} scale={Math.max(plate.w, plate.d) * 1.1} blur={2} far={2.5} />
        <TagTracker tags={tags} els={els} />
      </Canvas>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {tags.map((t, i) => (
          <button
            key={`${id}${t.text}`}
            ref={(el) => {
              els.current[i] = el;
            }}
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setPicked(focus === i ? null : { id, i })}
            aria-pressed={focus === i}
            aria-label={focus === i ? `${t.text}: back to the whole floor` : `Look closer at ${t.text}`}
            className={cn(
              "absolute left-0 top-0 max-w-[15rem] cursor-pointer rounded-[14px] text-left opacity-0 shadow-[var(--shadow-ring)] backdrop-blur-sm transition-[opacity,background-color,color] duration-500",
              focus === i ? "z-10 bg-ink px-3 py-2 text-paper" : "bg-paper/85 px-2 py-0.5 text-stone hover:bg-paper hover:text-ink",
            )}
          >
            <span className="block whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.06em]">{t.text}</span>
            {focus === i && t.note && <span className="mt-1 block text-[0.75rem] leading-snug text-paper/85">{t.note}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
