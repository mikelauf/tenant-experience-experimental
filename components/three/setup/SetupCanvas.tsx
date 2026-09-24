"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, OrthographicCamera } from "@react-three/drei";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Setup, Venue } from "@/lib/data/types";
import { barFront, barLength, makeLayout, stageSize, type P } from "./layouts";

type Plate = Venue["plate"];

const col = {
  floor: "#ebe4d8",
  floorOut: "#cfd3c6",
  wall: "#faf9f6",
  glass: "#bcd3dd",
  chair: "#3b3f43",
  wood: "#6f4a2f",
  sofa: "#e7dfd1",
  stage: "#d8d1c4",
  tree: "#33443a",
};

const guestColors = ["#2a2d30", "#62666a", "#9a3f25", "#c9b8a2", "#4b5a66", "#8f9396"].map((c) => new THREE.Color(c));

function chairGeometry() {
  const seat = new THREE.BoxGeometry(0.44, 0.08, 0.42).translate(0, 0.44, 0);
  const back = new THREE.BoxGeometry(0.44, 0.42, 0.07).translate(0, 0.7, 0.19);
  const legs = new THREE.BoxGeometry(0.36, 0.4, 0.34).translate(0, 0.2, 0);
  return mergeGeometries([seat, back, legs]);
}

/**
 * An instanced pool whose members glide from their last position to the new one
 * with a small stagger, and shrink away when unused.
 */
function Pool({
  items,
  max,
  geometry,
  color,
  y = 0,
  scale = [1, 1, 1],
  palette,
  scaleFromRot,
}: {
  items: P[];
  max: number;
  geometry: THREE.BufferGeometry;
  color: string;
  y?: number;
  scale?: [number, number, number];
  palette?: THREE.Color[];
  /** use the third value as x-length (long tables) or size flag */
  scaleFromRot?: "length" | "size";
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const cur = useRef<Float32Array>(new Float32Array(max * 4)); // x, z, rot, s
  const t0 = useRef(0);
  const clock = useRef(0);

  useLayoutEffect(() => {
    t0.current = clock.current;
    if (palette && ref.current) {
      for (let i = 0; i < max; i++) ref.current.setColorAt(i, palette[i % palette.length]);
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
      const k = started ? 1 - Math.exp(-dt * 7) : 0;
      const o = i * 4;
      if (it) {
        if (c[o + 3] < 0.01) {
          c[o] = it[0];
          c[o + 1] = it[1];
          c[o + 2] = scaleFromRot ? 0 : it[2];
        }
        c[o] += (it[0] - c[o]) * k;
        c[o + 1] += (it[1] - c[o + 1]) * k;
        if (!scaleFromRot) c[o + 2] += (it[2] - c[o + 2]) * k;
        c[o + 3] += (1 - c[o + 3]) * k;
      } else {
        c[o + 3] += (0 - c[o + 3]) * (1 - Math.exp(-dt * 9));
      }
      const sc = c[o + 3];
      let sx = scale[0];
      let sz = scale[2];
      if (scaleFromRot === "length" && it) sx = it[2];
      if (scaleFromRot === "size" && it && it[2]) {
        sx *= it[2];
        sz *= it[2];
      }
      e.set(0, c[o + 2], 0);
      q.setFromEuler(e);
      v.set(c[o], y, c[o + 1]);
      s.set(sx * sc, scale[1] * sc, sz * sc);
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

function Room({ plate }: { plate: Plate }) {
  const { w, d, windows, outdoor } = plate;
  const trees = useMemo(() => {
    if (!outdoor) return [];
    const out: [number, number, number][] = [];
    let s = 5;
    const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 22; i++) {
      const side = i % 4;
      const t = r() - 0.5;
      const x = side < 2 ? t * w : (side === 2 ? -1 : 1) * (w / 2 + 0.2 - r() * 1.2);
      const z = side >= 2 ? t * d : (side === 0 ? -1 : 1) * (d / 2 + 0.2 - r() * 1.2);
      out.push([x, z, 1.8 + r() * 1.6]);
    }
    return out;
  }, [outdoor, w, d]);

  const glass = (side: "north" | "east" | "south" | "west") => {
    const horiz = side === "north" || side === "south";
    const len = horiz ? w : d;
    const pos: [number, number, number] =
      side === "north" ? [0, 0.7, -d / 2] : side === "south" ? [0, 0.7, d / 2] : side === "east" ? [w / 2, 0.7, 0] : [-w / 2, 0.7, 0];
    return (
      <mesh key={side} position={pos} rotation={[0, horiz ? 0 : Math.PI / 2, 0]}>
        <boxGeometry args={[len, 1.4, 0.05]} />
        <meshStandardMaterial color={col.glass} transparent opacity={0.35} roughness={0.1} metalness={0.2} />
      </mesh>
    );
  };
  const wall = (side: "north" | "east" | "south" | "west") => {
    const horiz = side === "north" || side === "south";
    const len = horiz ? w : d;
    const pos: [number, number, number] =
      side === "north" ? [0, 0.18, -d / 2] : side === "south" ? [0, 0.18, d / 2] : side === "east" ? [w / 2, 0.18, 0] : [-w / 2, 0.18, 0];
    return (
      <mesh key={side} position={pos} rotation={[0, horiz ? 0 : Math.PI / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[len + 0.16, 0.36, 0.16]} />
        <meshStandardMaterial color={col.wall} roughness={0.9} />
      </mesh>
    );
  };

  const glassSides: ("north" | "east" | "south" | "west")[] =
    windows === "wrap" ? ["north", "east", "west"] : windows === "north" ? ["north"] : windows === "east" ? ["east"] : [];

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color={outdoor ? col.floorOut : col.floor} roughness={0.95} />
      </mesh>
      {!outdoor && (["north", "east", "south", "west"] as const).filter((s) => !glassSides.includes(s)).map(wall)}
      {glassSides.map(glass)}
      {trees.map(([x, z, h], i) => (
        <mesh key={i} position={[x, h / 2, z]} castShadow>
          <coneGeometry args={[0.55, h, 7]} />
          <meshStandardMaterial color={col.tree} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function Fit({ plate }: { plate: Plate }) {
  const { size } = useThree();
  const span = Math.max(plate.w * 1.05, plate.d * 1.6);
  const zoom = Math.min(size.width / (span * 0.92), size.height / (span * 0.66));
  return (
    <OrthographicCamera
      makeDefault
      position={[plate.w * 0.9, plate.w * 0.95, plate.d * 1.6 + 6]}
      zoom={zoom}
      near={0.1}
      far={200}
      onUpdate={(c) => c.lookAt(0, 0, 0)}
    />
  );
}

export default function SetupCanvas({
  plate,
  setup,
  capacity,
  active = true,
  onReady,
}: {
  plate: Plate;
  setup: Setup;
  capacity: number;
  active?: boolean;
  onReady?: () => void;
}) {
  const layout = useMemo(() => makeLayout(setup, capacity, plate.w, plate.d), [setup, capacity, plate.w, plate.d]);
  const geo = useMemo(
    () => ({
      chair: chairGeometry(),
      round: new THREE.CylinderGeometry(0.62, 0.62, 0.74, 28).translate(0, 0.37, 0),
      long: new THREE.BoxGeometry(1, 0.74, 0.62).translate(0, 0.37, 0),
      high: new THREE.CylinderGeometry(0.3, 0.3, 1.08, 20).translate(0, 0.54, 0),
      person: new THREE.CapsuleGeometry(0.17, 0.95, 4, 10).translate(0, 0.65, 0),
      sofa: mergeGeometries([new THREE.BoxGeometry(1.9, 0.42, 0.8).translate(0, 0.21, 0), new THREE.BoxGeometry(1.9, 0.4, 0.2).translate(0, 0.62, -0.3)]),
    }),
    [],
  );

  // Fit the shadow camera to the plate so small rooms get crisp shadows and big ones aren't clipped
  const reach = Math.max(plate.w, plate.d) * 0.62;

  return (
    <Canvas shadows dpr={[1, 2]} frameloop={active ? "always" : "never"} gl={{ antialias: true, alpha: true }} onCreated={() => onReady?.()} aria-hidden>
      <Fit plate={plate} />
      <hemisphereLight args={["#ffffff", "#d9d4ca", 1.3]} />
      <directionalLight
        position={[-6, 12, 8]}
        intensity={1.9}
        color="#fff4e6"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-reach}
        shadow-camera-right={reach}
        shadow-camera-top={reach}
        shadow-camera-bottom={-reach}
        shadow-bias={-0.0004}
      />
      <Room plate={plate} />
      <Pool items={layout.chairs} max={240} geometry={geo.chair} color={col.chair} />
      <Pool items={layout.rounds} max={40} geometry={geo.round} color={col.wood} scaleFromRot="size" />
      <Pool items={layout.longs} max={60} geometry={geo.long} color={col.wood} scaleFromRot="length" />
      <Pool items={layout.highs} max={40} geometry={geo.high} color={col.wood} />
      <Pool items={layout.people} max={240} geometry={geo.person} color="#fff" palette={guestColors} />
      <Pool items={layout.sofas} max={40} geometry={geo.sofa} color={col.sofa} />
      <Toggle on={layout.stage} x={0} z={-plate.d / 2 + 0.95} size={[stageSize(plate.w), 0.24, 1.3]} color={col.stage} />
      <Toggle on={layout.bar} x={barFront(plate.w) - 0.35} z={0} size={[0.7, 1, barLength(plate.d)]} color={col.wood} />
      <ContactShadows position={[0, 0.005, 0]} opacity={0.3} scale={Math.max(plate.w, plate.d) * 1.4} blur={2} far={3} />
    </Canvas>
  );
}

/** Stage or bar that grows up out of the floor when the setup needs it. */
function Toggle({ on, x, z, size, color }: { on: boolean; x: number; z: number; size: [number, number, number]; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  const geo = useMemo(() => new THREE.BoxGeometry(...size).translate(0, size[1] / 2, 0), [size]);
  useFrame((_, dt) => {
    const m = ref.current;
    if (!m) return;
    m.scale.y = THREE.MathUtils.damp(m.scale.y, on ? 1 : 0.0001, 6, dt);
    m.visible = m.scale.y > 0.01;
  });
  return (
    <mesh ref={ref} geometry={geo} position={[x, 0, z]} scale={[1, 0.0001, 1]} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
  );
}
