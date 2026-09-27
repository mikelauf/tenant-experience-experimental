"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { levelY, topOf, yawForBearing, type TowerProfile } from "@/lib/tower";

/** The camera: where each stop frames the building from, and the rig that flies between them. */

/** Where the camera frames each stop. `yaw` limits keep the subject on the open side. */
type View = { target: THREE.Vector3; radius: number; lift: number; yaw?: [center: number, range: number] };

function viewFor(p: TowerProfile, level: number | null, narrow: boolean, zoom = 1, parkSpot?: [number, number] | null, whole?: boolean, peek?: boolean): View {
  const r = (narrow ? 1.3 : 1) * (level == null ? 1 : zoom);
  const top = topOf(p);
  // An opened floor: close and high, looking down into it under the lifted floors
  if (peek && level != null) {
    const f = Math.min(level, p.floors - 1);
    const span = Math.max(p.widthAt(f), p.depthAt(f));
    return { target: new THREE.Vector3(0, levelY(p, level) + p.floorH * 0.3, 0), radius: (narrow ? 2.9 : 5) * span, lift: (narrow ? 2.6 : 3.9) * span };
  }
  if (level == null) return { target: new THREE.Vector3(0, top * 0.62 + 0.6, 0), radius: 30 * r, lift: 7 };
  // The whole building with a high floor lit in it: where the floor sits, not the floor up close. Low floors keep
  // their own view below, since from this far the rooftops around the base hide them.
  if (whole && level >= 15) return { target: new THREE.Vector3(0, top * 0.62 + 0.6, 0), radius: 30 * r, lift: 7 };
  // The park faces the camera, with the tower rising behind it; a place in it (the one in the photo on show) draws the camera in
  if (level === 0 && p.park) {
    if (parkSpot) return { target: new THREE.Vector3(parkSpot[0] * 0.8, 0.9, parkSpot[1] * 0.8), radius: 9.5 * r, lift: 4.4, yaw: p.park.yaw };
    return { target: new THREE.Vector3(p.park.x * 0.944, 0.6, p.park.z * 0.944), radius: 11 * r, lift: 5.6, yaw: p.park.yaw };
  }
  // Low floors look down over the rooftops; higher ones sit level with the band.
  const lift = level < 15 ? 4.2 : 2.4;
  return { target: new THREE.Vector3(0, levelY(p, level) + 0.3, 0), radius: 17 * r, lift };
}

/** The middle of the street scene: halfway between the tower and its park */
const streetCenter = (p: TowerProfile): [number, number] => (p.park ? [p.park.x / 2, p.park.z / 2] : [0, 0]);

/** Arriving: a high oblique over the whole block, or close on one spot */
function streetView(p: TowerProfile, spot: [number, number] | null, narrow: boolean): View {
  const r = narrow ? 1.3 : 1;
  if (spot) return { target: new THREE.Vector3(spot[0], 0.3, spot[1]), radius: 8 * r, lift: 7 };
  const [cx, cz] = streetCenter(p);
  return { target: new THREE.Vector3(cx, 0.3, cz), radius: 12 * r, lift: 15 };
}

/** The camera yaw that looks at a spot from outside the block, so the tower stands behind it rather than in front */
function outsideYaw(p: TowerProfile, spot: [number, number] | null) {
  if (!spot) return Math.PI / 2; // from the south: the lobby on the left, the park on the right
  const [cx, cz] = streetCenter(p);
  return Math.atan2(spot[1] - cz, spot[0] - cx);
}

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * Orbits the active stop. Drag to spin it (with a little inertia); it drifts
 * on its own again a few seconds after you let go.
 */
export function Rig({
  p,
  level,
  auto,
  focus,
  onInteract,
  shift,
  zoom,
  street,
  spot,
  parkSpot,
  look,
  whole,
  peek,
}: {
  p: TowerProfile;
  level: number | null;
  auto: boolean;
  focus: RefObject<THREE.Vector3>;
  onInteract?: () => void;
  shift?: [x: number, y: number];
  zoom?: number;
  street?: boolean;
  spot?: [number, number] | null;
  /** At street level: the park place to draw in on */
  parkSpot?: [number, number] | null;
  /** Look out along this true bearing: the camera swings round behind the floor, facing that way */
  look?: number | null;
  /** Keep the whole building in frame when a high floor is selected */
  whole?: boolean;
  /** Look down into an opened floor */
  peek?: boolean;
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
  const off = useRef<[number, number]>([0, 0]);

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

  // Arriving, and each time a spot is picked, swing round to face it from the street
  const sx = spot?.[0];
  const sz = spot?.[1];
  useEffect(() => {
    if (!street) return;
    const target = outsideYaw(p, sx == null || sz == null ? null : [sx, sz]);
    aim.current = yaw.current + wrap(target - yaw.current);
    vel.current = 0;
    idleUntil.current = performance.now() + 6000;
  }, [street, sx, sz, p]);

  // Looking out: swing round behind the floor to face the bearing, a touch off-axis so the tower doesn't hide the view,
  // and hold there (no drift) until the view changes or someone drags
  useEffect(() => {
    // Done looking: let the drift pick back up shortly
    if (look == null) {
      idleUntil.current = Math.min(idleUntil.current, performance.now() + 1500);
      return;
    }
    const target = yawForBearing(look, p.north) - 0.2;
    aim.current = yaw.current + wrap(target - yaw.current);
    vel.current = 0;
    idleUntil.current = performance.now() + 60_000;
  }, [look, p]);

  useFrame((_, dt) => {
    const v = street ? streetView(p, spot ?? null, narrow) : viewFor(p, level, narrow, zoom, parkSpot, whole, peek);
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

    // Slide the subject out from under an overlay (a side panel, a bottom sheet) by shifting the
    // projection window: a pure screen-space pan, so the orbit, drag and perspective are untouched.
    const [tx, ty] = shift ?? [0, 0];
    const o = off.current;
    o[0] = THREE.MathUtils.damp(o[0], tx, 3, dt);
    o[1] = THREE.MathUtils.damp(o[1], ty, 3, dt);
    const cam = camera as THREE.PerspectiveCamera;
    if (Math.abs(o[0]) > 0.5 || Math.abs(o[1]) > 0.5) cam.setViewOffset(size.width, size.height, o[0], o[1], size.width, size.height);
    else if (cam.view?.enabled) cam.clearViewOffset();
  });
  return null;
}

/* ------------------------------------------------------------------ scene */
