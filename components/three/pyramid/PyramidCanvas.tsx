"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { FLOOR, FLOORS, TOP, WING_FROM, WING_TO, levelY, neighbors, trees, widthAt } from "./model";

export type Mood = "day" | "dusk";

const palette = {
  day: { slab: "#efece5", wing: "#e4e0d7", tree: "#33443a", ground: "#e2e0d9", neighbor: "#d9d7d0", fog: "#e9e8e3", sky: "#dfe7ea", sun: "#fff3e2" },
  dusk: { slab: "#e4e2dd", wing: "#c4c3c0", tree: "#1d2a22", ground: "#1b2126", neighbor: "#303a44", fog: "#151b21", sky: "#7890ad", sun: "#f6d8c2" },
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
      t.anisotropy = 8;
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

/**
 * Procedural windows in world space, so every block gets the same crisp,
 * floor-sized grid at any height or pixel density; dusk lights some of them.
 */
function useCityMaterial(mood: Mood) {
  return useMemo(() => {
    const c = palette[mood];
    const mat = new THREE.MeshStandardMaterial({ color: c.neighbor, roughness: 0.92 });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uLit = { value: mood === "dusk" ? 1.1 : 0 };
      sh.uniforms.uFloor = { value: FLOOR * 1.4 };
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
    return mat;
  }, [mood]);
}

const _ray = new THREE.Ray();
const _box = new THREE.Box3();
const _dir = new THREE.Vector3();
const _hit = new THREE.Vector3();
const _pos = new THREE.Vector3();
const _scale = new THREE.Vector3();

/** Financial District blocks. Any block standing between the camera and the focus sinks out of the way. */
function City({ mood, focus }: { mood: Mood; focus: RefObject<THREE.Vector3> }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const mat = useCityMaterial(mood);
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

/** Where the camera frames each stop. `yaw` limits keep the subject on the open side. */
type View = { target: THREE.Vector3; radius: number; lift: number; yaw?: [center: number, range: number] };

function viewFor(level: number | null, narrow: boolean): View {
  const r = narrow ? 1.3 : 1;
  if (level == null) return { target: new THREE.Vector3(0, TOP * 0.62 + 0.6, 0), radius: 30 * r, lift: 4 };
  // The park faces the camera from the east, with the tower rising behind it.
  if (level === 0) return { target: new THREE.Vector3(3.4, 0.4, 0), radius: 11 * r, lift: 6.5, yaw: [0.15, 0.85] };
  // Low floors look down over the rooftops; higher ones sit level with the band.
  const lift = level < 15 ? 4.2 : 2.4;
  return { target: new THREE.Vector3(0, levelY(level) + 0.3, 0), radius: 17 * r, lift };
}

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * Orbits the active stop. Drag to spin it (with a little inertia); it drifts
 * on its own again a few seconds after you let go.
 */
function Rig({ level, auto, focus, onInteract }: { level: number | null; auto: boolean; focus: RefObject<THREE.Vector3>; onInteract?: () => void }) {
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
    const v = viewFor(level, narrow);
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

export default function PyramidCanvas({
  level,
  mood = "day",
  active = true,
  auto = true,
  onReady,
  onInteract,
}: {
  level: number | null;
  mood?: Mood;
  active?: boolean;
  auto?: boolean;
  onReady?: () => void;
  onInteract?: () => void;
}) {
  const c = palette[mood];
  const focus = useRef(new THREE.Vector3(0, TOP * 0.62, 0));
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
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
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={14}
        shadow-camera-bottom={-4}
      />
      <Rig level={level} auto={auto} focus={focus} onInteract={onInteract} />
      <Tower mood={mood} />
      <Park mood={mood} glow={level === 0 ? 0.5 : 0} />
      <City mood={mood} focus={focus} />
      <Marker level={level} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[18, 48]} />
        <meshStandardMaterial color={c.ground} roughness={1} />
      </mesh>
      <ContactShadows position={[0, 0.01, 0]} opacity={mood === "dusk" ? 0.5 : 0.35} scale={14} blur={2.4} far={6} />
    </Canvas>
  );
}
