"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";

export type Orbit = {
  /** Yaw the user has dragged, radians; the rig adds its own drift */
  yaw: { current: number };
  /** Pitch the user has dragged, radians */
  pitch: { current: number };
  /** Fling speed, radians per ms, left over from the last drag */
  vel: { current: number };
  dragging: { current: boolean };
  /** performance.now() until which the rig should hold still before drifting again */
  idleUntil: { current: number };
};

/**
 * Drag-to-spin for a canvas, as on the homepage tower: horizontal drags turn, vertical drags tilt, a
 * quick release flings. Vertical swipes on touch still scroll the page (`touch-pan-y` on the container), and
 * there's no wheel zoom, so the page never gets stuck. The rig reads the refs every frame.
 */
export function useOrbit({ onInteract, idleMs = 4000 }: { onInteract?: () => void; idleMs?: number } = {}): Orbit {
  const el = useThree((s) => s.gl.domElement);
  const yaw = useRef(0);
  const pitch = useRef(0);
  const vel = useRef(0);
  const dragging = useRef(false);
  const idleUntil = useRef(0);
  const last = useRef<{ x: number; y: number; t: number } | null>(null);
  const interact = useRef(onInteract);
  useEffect(() => {
    interact.current = onInteract;
  }, [onInteract]);

  // Cursor and touch-action come from the canvas's container: `cursor-grab active:cursor-grabbing` and `touch-pan-y`
  useEffect(() => {
    const down = (e: PointerEvent) => {
      last.current = { x: e.clientX, y: e.clientY, t: performance.now() };
      dragging.current = true;
      vel.current = 0;
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      interact.current?.();
    };
    const move = (e: PointerEvent) => {
      const d = last.current;
      if (!d) return;
      const now = performance.now();
      const step = -(e.clientX - d.x) * 0.0065; // same feel as the tower: drag right, the model turns right
      yaw.current += step;
      vel.current = step / Math.max(1, now - d.t);
      pitch.current += (e.clientY - d.y) * 0.004;
      last.current = { x: e.clientX, y: e.clientY, t: now };
    };
    const up = (e: PointerEvent) => {
      if (!last.current) return;
      last.current = null;
      dragging.current = false;
      idleUntil.current = performance.now() + idleMs;
      const t = e.currentTarget as Element;
      if (t.hasPointerCapture(e.pointerId)) t.releasePointerCapture(e.pointerId);
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
  }, [el, idleMs]);

  return { yaw, pitch, vel, dragging, idleUntil };
}
