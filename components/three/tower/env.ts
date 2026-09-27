import * as THREE from "three";
import { LIGHT_KEYS, lightSpan, type LightKeys } from "@/lib/light";

/* ------------------------------------------------------------------ light */

/**
 * The keyframes of light (lib/light.ts) as live three.js values. `sun` runs 0 (night) → 0.5 (dusk) → 1 (day) and
 * everything in the scene blends between them, so a time scrubber can relight the city.
 */
const COLORS = ["slab", "wing", "tree", "ground", "neighbor", "water", "fog", "sky", "skyGround", "sun", "glass"] as const;
const NUMS = ["hemi", "sunI", "lit", "shadow", "vary"] as const;
export type Env = Record<(typeof COLORS)[number], THREE.Color> &
  Record<(typeof NUMS)[number], number> & { sunPos: THREE.Vector3; value: number; keys: LightKeys };

const _a = new THREE.Color();
const _b = new THREE.Color();
const _v = new THREE.Vector3();
export function mixEnv(sun: number, out: Env) {
  const [a, b, t] = lightSpan(sun, out.keys);
  for (const k of COLORS) out[k].copy(_a.set(a[k])).lerp(_b.set(b[k]), t);
  for (const k of NUMS) out[k] = a[k] + (b[k] - a[k]) * t;
  out.sunPos.set(...a.sunPos).lerp(_v.set(...b.sunPos), t);
  out.value = sun;
  return out;
}
export const makeEnv = (sun: number, keys: LightKeys = LIGHT_KEYS): Env =>
  mixEnv(sun, {
    ...(Object.fromEntries(COLORS.map((k) => [k, new THREE.Color()])) as Record<(typeof COLORS)[number], THREE.Color>),
    ...(Object.fromEntries(NUMS.map((k) => [k, 0])) as Record<(typeof NUMS)[number], number>),
    sunPos: new THREE.Vector3(),
    value: sun,
    keys,
  });
