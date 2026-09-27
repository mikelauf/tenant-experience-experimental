"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { LANDMARK_REACH, levelY, type SceneLandmark, type TowerProfile } from "@/lib/tower";
import { landmarkTop } from "./landmarks";

/** What the scene points at: the floor marker and bands, arrival pins, landmark halos, and trackers that pin HTML labels to 3D points. */

/** Scratch vector for per-frame math */
const _dir = new THREE.Vector3();

/** Street-level places: a glowing dot and a short stem, so the label has something to stand on */
export function PoiMarkers({ p, color, active }: { p: TowerProfile; color: string; active?: string | null }) {
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
export function Marker({ p, level, color }: { p: TowerProfile; level: number | null; color: string }) {
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
    // Over the park it's a wash of colour, so the trees and paths still read through it; a park with a real outline traces that instead
    const park = level === 0 && p.park ? (p.park.outline ? 0 : 0.38) : 0.92;
    mat.current!.opacity = THREE.MathUtils.damp(mat.current!.opacity, level == null ? 0 : park, 4, dt);
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
export function Bands({ p, bands, accent }: { p: TowerProfile; bands: Band[]; accent: string }) {
  return bands.map((b) => <BandMesh key={`${b.level}-${b.tone}`} p={p} b={b} color={b.tone === "mine" ? accent : TONES[b.tone]} />);
}

export function BandMesh({ p, b, color }: { p: TowerProfile; b: Band; color: string }) {
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
export function PinTracker({ p, pins, els }: { p: TowerProfile; pins: Pin[]; els: RefObject<(HTMLElement | null)[]> }) {
  const anchors = useMemo(() => pins.map((pin) => pinAnchor(p, pin.level)), [p, pins]);
  return <AnchorTracker anchors={anchors} els={els} />;
}

/** Moves each DOM label to its anchor's screen position; hides labels behind the camera or off screen. */
export function AnchorTracker({ anchors, els, center }: { anchors: THREE.Vector3[]; els: RefObject<(HTMLElement | null)[]>; center?: boolean }) {
  useFrame(({ camera, size }) => {
    anchors.forEach((v, i) => {
      const el = els.current[i];
      if (!el) return;
      _proj.copy(v).project(camera);
      const hidden = _proj.z > 1 || Math.abs(_proj.x) > 1.05 || Math.abs(_proj.y) > 1.05;
      el.style.transform = `translate3d(${((_proj.x + 1) / 2) * size.width}px, ${((1 - _proj.y) / 2) * size.height}px, 0) ${center ? "translate(-50%, -100%)" : "translateY(-50%)"}`;
      el.style.opacity = hidden ? "0" : "1";
      el.style.pointerEvents = hidden ? "none" : "";
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
export function HotspotTracker({ p, levels, els }: { p: TowerProfile; levels: number[]; els: RefObject<(HTMLElement | null)[]> }) {
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
export function CompassTracker({ focus, el, north }: { focus: RefObject<THREE.Vector3>; el: RefObject<HTMLElement | null>; north: [number, number] }) {
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

/** A pulsing ring on the ground and a faint beam of light, marking a landmark that's in the photo on show. */
export function Halo({ l, color }: { l: SceneLandmark; color: string }) {
  const ring = useRef<THREE.Mesh>(null);
  const beam = useRef<THREE.MeshBasicMaterial>(null);
  const r = Math.max(LANDMARK_REACH[l.kind], 1.4) + 0.6;
  const top = landmarkTop(l).y;
  useFrame(({ clock }) => {
    const t = (clock.elapsedTime % 2.2) / 2.2;
    if (ring.current) {
      ring.current.scale.setScalar(0.7 + t * 0.6);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = 0.75 * (1 - t);
    }
    if (beam.current) beam.current.opacity = 0.16 + Math.sin(clock.elapsedTime * 2.4) * 0.05;
  });
  return (
    <group position={[l.x, 0, l.z]}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[r * 0.92, r, 64]} />
        <meshBasicMaterial color={color} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0, top / 2 + 0.2, 0]}>
        <cylinderGeometry args={[0.1, r * 0.35, top + 0.4, 24, 1, true]} />
        <meshBasicMaterial ref={beam} color={color} transparent depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}
