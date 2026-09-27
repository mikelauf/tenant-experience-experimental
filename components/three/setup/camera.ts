import type { Seg, Setup, SetupSpec, Shell } from "../../../lib/data/types.ts";
import { shellBounds } from "../../../lib/setup/shell.ts";
import { bearingDir } from "../../../lib/tower.ts";
import { inPoly, type Layout } from "./layouts.ts";

/** The camera views the stage offers. */
export type Preset = "overview" | "close" | "top";

/** A 3D box to keep in frame, in meters. */
export type Box = { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number };

/**
 * Where the camera wants to be: a box to fit, the orbit angle (yaw, radians; 0 looks from +x, π/2 from
 * +z, the Clay St side), how high it sits (pitch above the horizon), and how far a drag may swing it.
 */
export type Frame = { box: Box; yaw: number; pitch: number; range: number };

const TOP_PITCH = 1.42;

/** What an audience faces: the screen's middle, else the stage's. */
export function focusPoint(shell: Shell): [number, number] | null {
  const f = shell.fixed ?? {};
  if (f.screen) return [(f.screen[0] + f.screen[2]) / 2, (f.screen[1] + f.screen[3]) / 2];
  if (f.stage) return [f.stage.x, f.stage.z];
  return null;
}

/** Middle of a setup's zone, weighted by area. */
function zoneCenter(shell: Shell, spec: SetupSpec): [number, number] {
  const rs = shell.zones[spec.zone] ?? [];
  const a = rs.reduce((s, r) => s + r.w * r.d, 0) || 1;
  return [rs.reduce((s, r) => s + r.x * r.w * r.d, 0) / a, rs.reduce((s, r) => s + r.z * r.w * r.d, 0) / a];
}

/** The box around everything the setup put on the floor, plus a margin. Falls back to the zone. */
function itemsBox(shell: Shell, spec: SetupSpec, L: Layout, extra: [number, number][]): Box {
  const pts: [number, number][] = [...L.chairs, ...L.rounds, ...L.highs, ...L.people, ...L.sofas].map(([x, z]) => [x, z]);
  for (const [x, z, len] of L.longs) pts.push([x - len / 2, z], [x + len / 2, z]);
  if (!pts.length) for (const r of shell.zones[spec.zone] ?? []) pts.push([r.x - r.w / 2, r.z - r.d / 2], [r.x + r.w / 2, r.z + r.d / 2]);
  pts.push(...extra);
  const m = 1.2;
  const xs = pts.map((p) => p[0]);
  const zs = pts.map((p) => p[1]);
  return { x0: Math.min(...xs) - m, x1: Math.max(...xs) + m, y0: 0, y1: 1.8, z0: Math.min(...zs) - m, z1: Math.max(...zs) + m };
}

/**
 * How the stage frames a setup.
 *
 * - Overview: the whole floor, seen from the side the event is on, so the guests are in front of the
 *   cores rather than behind them.
 * - Close-up: the laid-out room. Theaters and concerts are seen from behind the audience toward the
 *   screen or stage; a boardroom looks down the table; everything else from the event's own side, lower.
 * - Top-down: nearly straight down, Washington St at the top, like the booklet's plan.
 */
export function frameFor(shell: Shell, spec: SetupSpec, setup: Setup, L: Layout, preset: Preset): Frame {
  const b = shellBounds(shell);
  const whole: Box = { x0: b.x0, x1: b.x1, y0: 0, y1: 1.5, z0: b.z0, z1: b.z1 };
  const [zx, zz] = zoneCenter(shell, spec);
  // The side of the building the event is on; the middle of the floor gets the default corner.
  const away = Math.hypot(zx - b.cx, zz - b.cz) > 1.5 ? Math.atan2(zz - b.cz, zx - b.cx) : Math.PI / 4;
  const quarter = 0.5; // turn off square-on for a three-quarter view

  if (preset === "top") return { box: whole, yaw: Math.PI / 2, pitch: TOP_PITCH, range: 0.18 };
  if (preset === "overview") return { box: whole, yaw: away + quarter, pitch: 0.8, range: Math.PI };

  const focus = focusPoint(shell);
  const facing = (setup === "theater" || setup === "classroom" || setup === "concert") && focus;
  const box = itemsBox(shell, spec, L, facing ? [focus] : []);
  const cx = (box.x0 + box.x1) / 2;
  const cz = (box.z0 + box.z1) / 2;

  if (facing) {
    // From behind the audience, looking over their heads toward what they face
    const ax = L.chairs.length ? L.chairs.reduce((s, c) => s + c[0], 0) / L.chairs.length : L.people.reduce((s, p) => s + p[0], 0) / (L.people.length || 1);
    const az = L.chairs.length ? L.chairs.reduce((s, c) => s + c[1], 0) / L.chairs.length : L.people.reduce((s, p) => s + p[1], 0) / (L.people.length || 1);
    return { box, yaw: Math.atan2(az - focus[1], ax - focus[0]) + 0.4, pitch: 0.52, range: 1.1 };
  }
  if (setup === "boardroom") return { box, yaw: 0.45, pitch: 0.55, range: 1.1 };

  const side = Math.hypot(cx - b.cx, cz - b.cz) > 1.5 ? Math.atan2(cz - b.cz, cx - b.cx) : away;
  return { box, yaw: side + quarter, pitch: 0.62, range: 1.2 };
}

/**
 * The distance at which a perspective camera looking at the box's middle from (yaw, pitch) sees every
 * corner, with a margin. Exact for a pinhole camera: a corner at lateral offset s and depth d toward the
 * camera needs distance ≥ s / tan(half-fov) + d.
 */
export function fitRadius(box: Box, yaw: number, pitch: number, fovY: number, aspect: number, margin = 1.08) {
  const cx = (box.x0 + box.x1) / 2;
  const cy = (box.y0 + box.y1) / 2;
  const cz = (box.z0 + box.z1) / 2;
  // Unit vector from the target toward the camera, and the screen's right and up
  const dir = [Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch), Math.cos(pitch) * Math.sin(yaw)];
  const right = [-Math.sin(yaw), 0, Math.cos(yaw)];
  const up = [dir[1] * right[2] - dir[2] * right[1], dir[2] * right[0] - dir[0] * right[2], dir[0] * right[1] - dir[1] * right[0]];
  const tv = Math.tan(fovY / 2);
  const th = tv * aspect;
  let r = 0;
  for (const x of [box.x0, box.x1])
    for (const y of [box.y0, box.y1])
      for (const z of [box.z0, box.z1]) {
        const c = [x - cx, y - cy, z - cz];
        const dot = (v: number[]) => c[0] * v[0] + c[1] * v[1] + c[2] * v[2];
        const d = dot(dir);
        r = Math.max(r, Math.abs(dot(right)) / th + d, Math.abs(dot(up)) / tv + d);
      }
  return r * margin;
}

/**
 * A close look at one labeled thing (a core, a room, the bar): a small box around it, seen from the
 * outside of the floor looking back in, so the walls behind it frame it rather than hide it.
 */
export function focusFrame(shell: Shell, at: [number, number], reach = 3.2): Frame {
  const b = shellBounds(shell);
  const off = Math.hypot(at[0] - b.cx, at[1] - b.cz) > 1 ? Math.atan2(at[1] - b.cz, at[0] - b.cx) : Math.PI / 4;
  return { box: { x0: at[0] - reach, x1: at[0] + reach, y0: 0, y1: 1.4, z0: at[1] - reach, z1: at[1] + reach }, yaw: off + 0.35, pitch: 0.62, range: 0.9 };
}

/** Outward unit normal of an outline edge. */
export function outward(s: Seg, outline: [number, number][]): [number, number] {
  const [x0, z0, x1, z1] = s;
  const len = Math.hypot(x1 - x0, z1 - z0) || 1;
  let n: [number, number] = [(z1 - z0) / len, -(x1 - x0) / len];
  if (inPoly((x0 + x1) / 2 + n[0] * 0.3, (z0 + z1) / 2 + n[1] * 0.3, outline)) n = [-n[0], -n[1]];
  return n;
}

/** Where to stand to look out along a bearing: just inside a window, at eye level, and which way to face. */
export type Lookout = { eye: [number, number, number]; at: [number, number, number]; dir: [number, number] };

/**
 * The window that best faces a true compass bearing (the grid turned by `north`), and a spot a couple
 * of meters inside it. The window is the glass run whose outward normal is closest to the bearing; the
 * camera stands behind its middle, looking out along the bearing itself. Null for rooms with no glass.
 */
export function windowFor(shell: Shell, bearing: number, north = 0): Lookout | null {
  if (!shell.glass.length) return null;
  const dir = bearingDir(bearing, north);
  let best: { s: Seg; n: [number, number]; score: number } | null = null;
  for (const s of shell.glass) {
    const n = outward(s, shell.outline);
    const score = n[0] * dir[0] + n[1] * dir[1];
    if (!best || score > best.score) best = { s, n, score };
  }
  if (!best || best.score <= 0) return null;
  const [x0, z0, x1, z1] = best.s;
  const mx = (x0 + x1) / 2;
  const mz = (z0 + z1) / 2;
  const back = 2.2;
  return {
    eye: [mx - best.n[0] * back, 1.35, mz - best.n[1] * back],
    at: [mx + dir[0] * 12, 1.15, mz + dir[1] * 12],
    dir,
  };
}
