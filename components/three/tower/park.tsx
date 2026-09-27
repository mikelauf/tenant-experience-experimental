"use client";

import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { treesFor, type TowerProfile } from "@/lib/tower";
import type { Env } from "./env";

/** Street-level green: the grove, its places (stage, bar, fountain), string lights, and the outline and pins that point at it. */

/** A redwood's crown, one unit tall on a unit-wide base: two stacked tiers, narrowing to a point, over a bare trunk */
function redwoodCrown() {
  const low = new THREE.ConeGeometry(0.5, 0.52, 7).translate(0, 0.46, 0);
  const high = new THREE.ConeGeometry(0.34, 0.46, 7).translate(0, 0.77, 0);
  return mergeGeometries([low, high])!;
}
const TRUNK = new THREE.Color("#4a2f22");
const GROVE_GLOW = new THREE.Color("#3f5647");

/** `flat`: arriving, the grove settles to its footprint like the blocks around it, so the entrances and paths read */
export function Park({ p, env, flat, onPick }: { p: TowerProfile; env: Env; flat?: boolean; onPick?: () => void }) {
  const grove = useRef<THREE.Group>(null);
  const ref = useRef<THREE.InstancedMesh>(null);
  const trunks = useRef<THREE.InstancedMesh>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const trees = useMemo(() => treesFor(p), [p]);
  const round = p.park?.shape === "round";
  // Planted from a plan, the trees are redwoods: tall, slender, on bare trunks
  const redwoods = !!p.park?.plan;
  const crown = useMemo(() => (redwoods ? redwoodCrown() : null), [redwoods]);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    trees.forEach(([x, z, h], i) => {
      if (redwoods) {
        const w = 0.26 + (h - 1.1) * 0.12;
        m.compose(new THREE.Vector3(x, 0.02, z), q, new THREE.Vector3(w, h, w));
        ref.current!.setMatrixAt(i, m);
        m.compose(new THREE.Vector3(x, h * 0.13, z), q, new THREE.Vector3(1, h * 0.26, 1));
        trunks.current?.setMatrixAt(i, m);
      } else if (round) m.compose(new THREE.Vector3(x, h * 0.42 + 0.1, z), q, new THREE.Vector3(0.5 + h * 0.2, h * 0.62, 0.5 + h * 0.2));
      else m.compose(new THREE.Vector3(x, h / 2 + 0.1, z), q, new THREE.Vector3(0.42 + h * 0.08, h, 0.42 + h * 0.08));
      if (!redwoods) ref.current!.setMatrixAt(i, m);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingSphere();
    if (trunks.current) {
      trunks.current.instanceMatrix.needsUpdate = true;
      trunks.current.computeBoundingSphere();
    }
  }, [trees, round, redwoods]);
  useFrame((_, dt) => {
    if (grove.current) grove.current.scale.y = THREE.MathUtils.damp(grove.current.scale.y, flat ? 0.05 : 1, 3, dt);
    if (!mat.current) return;
    mat.current.color.copy(env.tree);
    // After dark the grove catches the string lights and the street, so it still stands out from the ground
    if (redwoods) mat.current.emissiveIntensity = (env.lit / 1.8) * 0.55;
  });
  if (!trees.length) return null;
  const pick = onPick
    ? (e: ThreeEvent<MouseEvent>) => {
        if (e.delta > 8) return;
        e.stopPropagation();
        onPick();
      }
    : undefined;
  return (
    <group ref={grove}>
      <instancedMesh ref={ref} args={[crown ?? undefined, undefined, trees.length]} castShadow onClick={pick}>
        {!crown && (round ? <icosahedronGeometry args={[0.5, 1]} /> : <coneGeometry args={[0.5, 1, 7]} />)}
        <meshStandardMaterial ref={mat} color={env.tree} roughness={0.95} flatShading={round || redwoods} emissive={GROVE_GLOW} emissiveIntensity={0} />
      </instancedMesh>
      {redwoods && (
        <instancedMesh ref={trunks} args={[undefined, undefined, trees.length]} castShadow onClick={pick}>
          <cylinderGeometry args={[0.022, 0.034, 1, 6]} />
          <meshStandardMaterial color={TRUNK} roughness={1} />
        </instancedMesh>
      )}
    </group>
  );
}

/** The park's own places, drawn low: the redwood stage, the kiosk bar and the fountain's pool */
export function ParkPlaces({ p, env, active, color }: { p: TowerProfile; env: Env; active: string | null; color: string }) {
  const spots = p.park?.plan?.spots ?? [];
  const water = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(() => water.current?.color.copy(env.water).lerp(env.sky, 0.25));
  return (
    <>
      {spots.map((s) => {
        const on = s.id === active;
        if (s.kind === "fountain")
          return (
            <group key={s.id} position={[s.x, 0, s.z]}>
              <mesh position={[0, 0.025, 0]} receiveShadow>
                <boxGeometry args={[s.w + 0.04, 0.05, s.d + 0.04]} />
                <meshStandardMaterial color="#b9b4aa" roughness={0.9} />
              </mesh>
              <mesh position={[0, 0.052, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[s.w - 0.02, s.d - 0.02]} />
                <meshStandardMaterial ref={water} color={env.water} roughness={0.15} metalness={0.3} emissive={color} emissiveIntensity={on ? 0.5 : 0} />
              </mesh>
            </group>
          );
        // The stage is a round redwood deck; the bar a timber kiosk under its roof
        return s.kind === "stage" ? (
          <mesh key={s.id} position={[s.x, 0.035, s.z]} castShadow receiveShadow>
            <cylinderGeometry args={[Math.max(s.w, s.d) / 2, Math.max(s.w, s.d) / 2, 0.07, 24]} />
            <meshStandardMaterial color="#8a4a2c" roughness={0.7} emissive={color} emissiveIntensity={on ? 0.45 : 0} />
          </mesh>
        ) : (
          <group key={s.id} position={[s.x, 0, s.z]}>
            <mesh position={[0, 0.05, 0]} castShadow>
              <boxGeometry args={[s.w, 0.1, s.d]} />
              <meshStandardMaterial color="#a0623c" roughness={0.7} emissive={color} emissiveIntensity={on ? 0.45 : 0} />
            </mesh>
            <mesh position={[0, 0.16, 0]} castShadow>
              <boxGeometry args={[s.w * 1.5, 0.02, s.d * 1.9]} />
              <meshStandardMaterial color="#3a332e" roughness={0.8} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

/** Evening string lights strung between the redwoods: warm points under the canopy that come up as the sky darkens */
export function StringLights({ p, env, off }: { p: TowerProfile; env: Env; off?: boolean }) {
  const mat = useRef<THREE.PointsMaterial>(null);
  const geo = useMemo(() => {
    const trees = p.park?.plan?.trees ?? [];
    const pts: number[] = [];
    // Sag a strand from each tree to its two nearest neighbours
    trees.forEach(([x, z], i) => {
      const near = trees
        .map(([ox, oz], j) => [j, (ox - x) ** 2 + (oz - z) ** 2] as const)
        .filter(([j, d]) => j > i && d < 0.55 ** 2)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 2);
      for (const [j] of near) {
        const [bx, bz] = trees[j];
        for (let k = 1; k < 8; k++) {
          const t = k / 8;
          pts.push(x + (bx - x) * t, 0.34 - Math.sin(t * Math.PI) * 0.07, z + (bz - z) * t);
        }
      }
    });
    return new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  }, [p]);
  useFrame((_, dt) => {
    if (mat.current) mat.current.opacity = THREE.MathUtils.damp(mat.current.opacity, off ? 0 : Math.min(1, env.lit / 1.5), 4, dt);
  });
  return (
    <points geometry={geo}>
      <pointsMaterial
        ref={mat}
        color="#ffc98a"
        size={3.5}
        sizeAttenuation={false}
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

/** Selected at street level: the park's real edge, traced in the accent colour, with a faint wash inside */
export function ParkOutline({ p, on, color }: { p: TowerProfile; on: boolean; color: string }) {
  const edge = useRef<THREE.MeshBasicMaterial>(null);
  const wash = useRef<THREE.MeshBasicMaterial>(null);
  const outline = p.park?.outline;
  const { strip, fill } = useMemo(() => {
    if (!outline) return { strip: null, fill: null };
    // A flat ribbon along each edge; shape space is (x, −z) so it lies flat once turned onto the ground
    const pieces = outline.map(([ax, az], i) => {
      const [bx, bz] = outline[(i + 1) % outline.length];
      const len = Math.hypot(bx - ax, bz - az);
      return new THREE.PlaneGeometry(len + 0.05, 0.05).rotateZ(Math.atan2(-(bz - az), bx - ax)).translate((ax + bx) / 2, -(az + bz) / 2, 0);
    });
    const shape = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z)));
    return { strip: mergeGeometries(pieces), fill: new THREE.ShapeGeometry(shape) };
  }, [outline]);
  useFrame((_, dt) => {
    if (edge.current) edge.current.opacity = THREE.MathUtils.damp(edge.current.opacity, on ? 0.95 : 0, 4, dt);
    if (wash.current) wash.current.opacity = THREE.MathUtils.damp(wash.current.opacity, on ? 0.06 : 0, 4, dt);
  });
  if (!strip || !fill) return null;
  return (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
      <mesh geometry={fill}>
        <meshBasicMaterial ref={wash} color={color} transparent opacity={0} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={strip} position={[0, 0, 0.004]}>
        <meshBasicMaterial ref={edge} color={color} transparent opacity={0} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Pins for the park's places while it's open: a dot and a short stem, like the arrival places */
export function ParkPins({ p, color, active }: { p: TowerProfile; color: string; active: string | null }) {
  return (
    <>
      {p.park?.plan?.spots.map((s) => (
        <group key={s.id} position={[s.x, 0, s.z]}>
          <mesh position={[0, 0.25, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.5, 6]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.52, 0]}>
            <sphereGeometry args={[s.id === active ? 0.06 : 0.04, 12, 8]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ city */
