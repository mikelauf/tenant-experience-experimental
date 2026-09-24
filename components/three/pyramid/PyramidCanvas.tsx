"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { FLOOR, FLOORS, TOP, WING_FROM, WING_TO, levelY, neighbors, trees, widthAt } from "./model";

export type Mood = "day" | "dusk";

const palette = {
  day: { slab: "#efece5", wing: "#e4e0d7", tree: "#33443a", ground: "#e2e0d9", neighbor: "#d9d7d0", fog: "#e9e8e3", sky: "#dfe7ea", sun: "#fff3e2" },
  dusk: { slab: "#e4e2dd", wing: "#c4c3c0", tree: "#1d2a22", ground: "#1b2126", neighbor: "#232a30", fog: "#151b21", sky: "#7890ad", sun: "#f6d8c2" },
};

/** Vertical window slits; the emissive twin lights some of them for dusk. */
function useFacadeTextures() {
  return useMemo(() => {
    const make = (lit: boolean) => {
      const c = document.createElement("canvas");
      c.width = 256;
      c.height = 16;
      const g = c.getContext("2d")!;
      g.fillStyle = lit ? "#000" : "#ffffff";
      g.fillRect(0, 0, 256, 16);
      let s = 3;
      for (let i = 0; i < 28; i++) {
        const x = 4 + i * 9;
        if (lit) {
          s = (s * 16807) % 2147483647;
          const on = s % 5 < 2;
          g.fillStyle = on ? `rgba(255,${170 + (s % 50)},${90 + (s % 40)},${0.55 + (s % 40) / 100})` : "#000";
        } else {
          g.fillStyle = "#8a8f94";
        }
        g.fillRect(x, 3, 3.2, 10);
      }
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      return t;
    };
    return { map: make(false), emissive: make(true) };
  }, []);
}

function Tower({ mood }: { mood: Mood }) {
  const slabs = useRef<THREE.InstancedMesh>(null);
  const wings = useRef<THREE.InstancedMesh>(null);
  const tex = useFacadeTextures();
  const c = palette[mood];
  const wingCount = (WING_TO - WING_FROM) * 2;

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    for (let i = 0; i < FLOORS; i++) {
      const w = widthAt(i);
      m.compose(new THREE.Vector3(0, i * FLOOR + FLOOR / 2, 0), q, new THREE.Vector3(w, FLOOR * 0.94, w));
      slabs.current!.setMatrixAt(i, m);
    }
    slabs.current!.instanceMatrix.needsUpdate = true;

    let k = 0;
    for (let i = WING_FROM; i < WING_TO; i++) {
      const w = widthAt(Math.min(i, FLOORS + 2));
      const t = (i - WING_FROM) / (WING_TO - WING_FROM);
      const depth = 0.36 - t * 0.12;
      for (const side of [-1, 1]) {
        m.compose(new THREE.Vector3(side * (w / 2 + 0.09), i * FLOOR + FLOOR / 2, 0), q, new THREE.Vector3(0.2, FLOOR * 0.98, depth));
        wings.current!.setMatrixAt(k++, m);
      }
    }
    wings.current!.instanceMatrix.needsUpdate = true;
  }, []);

  return (
    <group>
      <instancedMesh ref={slabs} args={[undefined, undefined, FLOORS]} castShadow receiveShadow>
        <boxGeometry />
        <meshStandardMaterial
          color={c.slab}
          map={tex.map}
          emissive={mood === "dusk" ? "#ffffff" : "#000000"}
          emissiveMap={tex.emissive}
          emissiveIntensity={mood === "dusk" ? 1.5 : 0}
          roughness={0.82}
          metalness={0.05}
        />
      </instancedMesh>
      <instancedMesh ref={wings} args={[undefined, undefined, wingCount]} castShadow>
        <boxGeometry />
        <meshStandardMaterial color={c.wing} roughness={0.7} metalness={0.15} />
      </instancedMesh>
      {/* The spire */}
      <mesh position={[0, TOP + 2.05, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[0.5, 4.1, 4, 1]} />
        <meshStandardMaterial
          color={c.wing}
          roughness={0.45}
          metalness={0.35}
          emissive={mood === "dusk" ? "#ffd2a8" : "#000000"}
          emissiveIntensity={mood === "dusk" ? 0.35 : 0}
        />
      </mesh>
      {/* Base colonnade hint */}
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <boxGeometry args={[widthAt(0) + 0.5, 0.12, widthAt(0) + 0.5]} />
        <meshStandardMaterial color={c.wing} roughness={0.9} />
      </mesh>
    </group>
  );
}

function Park({ mood, glow }: { mood: Mood; glow: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const c = palette[mood];
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    trees.forEach(([x, z, h], i) => {
      m.compose(new THREE.Vector3(x, h / 2 + 0.1, z), q, new THREE.Vector3(0.42 + h * 0.08, h, 0.42 + h * 0.08));
      ref.current!.setMatrixAt(i, m);
    });
    ref.current!.instanceMatrix.needsUpdate = true;
  }, []);
  useFrame((_, dt) => {
    if (!mat.current) return;
    mat.current.emissiveIntensity = THREE.MathUtils.damp(mat.current.emissiveIntensity, glow, 4, dt);
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, trees.length]} castShadow>
      <coneGeometry args={[0.5, 1, 7]} />
      <meshStandardMaterial ref={mat} color={c.tree} roughness={0.95} emissive="#c9562f" emissiveIntensity={0} />
    </instancedMesh>
  );
}

function City({ mood }: { mood: Mood }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const c = palette[mood];
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    neighbors.forEach(([x, z, w, d, h], i) => {
      m.compose(new THREE.Vector3(x, h / 2, z), q, new THREE.Vector3(w, h, d));
      ref.current!.setMatrixAt(i, m);
    });
    ref.current!.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, neighbors.length]} receiveShadow castShadow>
      <boxGeometry />
      <meshStandardMaterial color={c.neighbor} roughness={1} />
    </instancedMesh>
  );
}

/** The glowing band that slides to the active level, like an elevator readout. */
function Marker({ level }: { level: number | null }) {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((_, dt) => {
    const m = ref.current!;
    const park = level === 0;
    const tx = park ? 3.6 : 0;
    const ty = level == null ? levelY(27) + FLOOR / 2 : park ? 0.08 : levelY(level) + FLOOR / 2;
    const w = park ? 3.2 : widthAt(level ?? 27) + 0.08;
    const h = park ? 0.06 : FLOOR * 1.05;
    const d = park ? 4.2 : w;
    m.position.x = THREE.MathUtils.damp(m.position.x, tx, 5, dt);
    m.position.y = THREE.MathUtils.damp(m.position.y, ty, 5, dt);
    m.scale.x = THREE.MathUtils.damp(m.scale.x, w, 5, dt);
    m.scale.y = THREE.MathUtils.damp(m.scale.y, h, 5, dt);
    m.scale.z = THREE.MathUtils.damp(m.scale.z, d, 5, dt);
    mat.current!.opacity = THREE.MathUtils.damp(mat.current!.opacity, level == null ? 0 : 0.92, 4, dt);
  });
  return (
    <mesh ref={ref} position={[0, levelY(27), 0]}>
      <boxGeometry />
      <meshStandardMaterial ref={mat} color="#d4653f" emissive="#d4653f" emissiveIntensity={1.4} transparent opacity={0} toneMapped={false} />
    </mesh>
  );
}

function Rig({ level, auto }: { level: number | null; auto: boolean }) {
  const { camera, size } = useThree();
  const look = useRef(new THREE.Vector3(0, 5, 0));
  const angle = useRef(0.7);
  const narrow = size.width < 640;

  useFrame((state, dt) => {
    if (auto) angle.current += dt * 0.05;
    const px = state.pointer.x * 0.25;
    const park = level === 0;
    const focusY = level == null ? TOP * 0.62 : park ? 0.6 : levelY(level);
    const radius = (level == null ? 30 : park ? 13 : 17) * (narrow ? 1.3 : 1);
    const a = angle.current + px + (park ? 0.5 : 0);
    const tx = Math.cos(a) * radius;
    const tz = Math.sin(a) * radius;
    const ty = focusY + (level == null ? 4 : 2.4);
    camera.position.x = THREE.MathUtils.damp(camera.position.x, tx, 2.2, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, ty + state.pointer.y * 0.6, 2.2, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, tz, 2.2, dt);
    look.current.x = THREE.MathUtils.damp(look.current.x, park ? 2.4 : 0, 2.6, dt);
    look.current.y = THREE.MathUtils.damp(look.current.y, focusY + (level == null ? 0.6 : 0.3), 2.6, dt);
    camera.lookAt(look.current);
  });
  return null;
}

export default function PyramidCanvas({
  level,
  mood = "day",
  active = true,
  auto = true,
  onReady,
}: {
  level: number | null;
  mood?: Mood;
  active?: boolean;
  auto?: boolean;
  onReady?: () => void;
}) {
  const c = palette[mood];
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      frameloop={active ? "always" : "never"}
      camera={{ position: [20, 12, 20], fov: 32, near: 0.5, far: 120 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={() => onReady?.()}
      aria-hidden
    >
      <fog attach="fog" args={[c.fog, 26, 64]} />
      <hemisphereLight args={[c.sky, mood === "dusk" ? "#3a4450" : c.ground, mood === "dusk" ? 1.5 : 1.1]} />
      <directionalLight
        position={mood === "dusk" ? [-10, 5, 6] : [8, 14, 6]}
        intensity={mood === "dusk" ? 1.15 : 2.2}
        color={c.sun}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={14}
        shadow-camera-bottom={-4}
      />
      <Rig level={level} auto={auto} />
      <Tower mood={mood} />
      <Park mood={mood} glow={level === 0 ? 0.5 : 0} />
      <City mood={mood} />
      <Marker level={level} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[18, 48]} />
        <meshStandardMaterial color={c.ground} roughness={1} />
      </mesh>
      <ContactShadows position={[0, 0.01, 0]} opacity={mood === "dusk" ? 0.5 : 0.35} scale={14} blur={2.4} far={6} />
    </Canvas>
  );
}
