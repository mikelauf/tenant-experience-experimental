"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Interior, InteriorPiece } from "@/lib/data/types";
import { levelY, type TowerProfile } from "@/lib/tower";

/** How far the floors above an opened floor rise, in floors */
export const LIFT_FLOORS = 7;
/** The opened slab thins to a plate this much of a floor tall */
export const PLATE = 0.12;
/** Interiors stand a little taller than true scale, so a floor reads from outside the building */
const TALL = 1.6;

const TONE: Record<InteriorPiece["tone"], { color: string; opacity?: number; rough?: number; metal?: number }> = {
  wall: { color: "#ebe6de", rough: 0.9 },
  glass: { color: "#cfe3ea", opacity: 0.3, rough: 0.1, metal: 0.1 },
  wood: { color: "#a9794b", rough: 0.7 },
  dark: { color: "#2a2c30", rough: 0.6, metal: 0.2 },
  metal: { color: "#8f959b", rough: 0.35, metal: 0.7 },
  soft: { color: "#d9cbb6", rough: 0.95 },
  green: { color: "#5e8b58", rough: 0.9 },
  mat: { color: "#8c4f3f", rough: 0.95 },
  warm: { color: "#c8a178", rough: 0.8 },
};
const FLOOR: Record<Interior["floor"], string> = { wood: "#b58c62", stone: "#dad5cc", rubber: "#3a3d42" };

/** Where a point on the plan sits in the scene: on top of the opened plate at that level */
export function interiorPoint(p: TowerProfile, level: number, x: number, z: number, h = 0) {
  const f = Math.min(level, p.floors - 1);
  return new THREE.Vector3(x * p.widthAt(f) * 0.94, levelY(p, level) + p.floorH * PLATE + h * p.floorH * TALL, z * p.depthAt(f) * 0.94);
}

/**
 * A floor's interior, standing on its opened plate: its finish, then every piece, grown up from the floor as the
 * floors above lift away. Pieces share a handful of materials, one per tone.
 */
export function FloorInterior({ p, level, interior }: { p: TowerProfile; level: number; interior: Interior }) {
  const group = useRef<THREE.Group>(null);
  const t = useRef(0);
  const f = Math.min(level, p.floors - 1);
  const w = p.widthAt(f) * 0.94;
  const d = p.depthAt(f) * 0.94;
  const base = levelY(p, level) + p.floorH * PLATE;
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
  const box = useMemo(() => new THREE.BoxGeometry(), []);
  const cyl = useMemo(() => new THREE.CylinderGeometry(0.5, 0.5, 1, 20), []);

  // Grow in once the floors above have mostly cleared
  useFrame((_, dt) => {
    t.current = Math.min(1, t.current + dt * 1.1);
    const k = THREE.MathUtils.smoothstep(t.current, 0.25, 1);
    if (group.current) group.current.scale.set(1, Math.max(0.001, k), 1);
  });

  return (
    <group ref={group} position={[0, base, 0]}>
      <mesh position={[0, 0.002, 0]} receiveShadow>
        <boxGeometry args={[w, 0.004, d]} />
        <meshStandardMaterial color={FLOOR[interior.floor]} roughness={0.85} />
      </mesh>
      {interior.pieces.map((x, i) => {
        const h = Math.max(0.004, x.h * p.floorH * TALL);
        return (
          <mesh
            key={i}
            geometry={x.round ? cyl : box}
            material={mats[x.tone]}
            position={[x.x * w, h / 2 + 0.004, x.z * d]}
            scale={[x.w * w, h, x.d * d]}
            castShadow={x.tone !== "glass"}
            receiveShadow
          />
        );
      })}
    </group>
  );
}
