import * as THREE from "three";

/* ------------------------------------------------------------------ light */

/**
 * Three keyframes of light. `sun` runs 0 (night) → 0.5 (dusk) → 1 (day) and
 * everything in the scene blends between them, so a time scrubber can relight the city.
 */
type Key = {
  slab: string;
  wing: string;
  tree: string;
  ground: string;
  neighbor: string;
  water: string;
  fog: string;
  sky: string;
  skyGround: string;
  sun: string;
  hemi: number;
  sunI: number;
  lit: number;
  shadow: number;
  sunPos: [number, number, number];
};

const KEYS: Record<"night" | "dusk" | "day", Key> = {
  night: {
    slab: "#c3c6ca",
    wing: "#8d9296",
    tree: "#1b2a21",
    ground: "#0e1317",
    neighbor: "#1b222a",
    water: "#0b151d",
    fog: "#0a0e12",
    sky: "#40506a",
    skyGround: "#161c24",
    sun: "#b9c9ea",
    hemi: 0.75,
    sunI: 0.5,
    lit: 1.8,
    shadow: 0.55,
    sunPos: [-6, 10, -8],
  },
  dusk: {
    slab: "#e4e2dd",
    wing: "#c4c3c0",
    tree: "#1d2a22",
    ground: "#1b2126",
    neighbor: "#303a44",
    water: "#233444",
    fog: "#151b21",
    sky: "#7890ad",
    skyGround: "#3a4450",
    sun: "#f6d8c2",
    hemi: 1.5,
    sunI: 1.15,
    lit: 1.5,
    shadow: 0.5,
    sunPos: [-10, 5, 6],
  },
  day: {
    slab: "#efece5",
    wing: "#e4e0d7",
    tree: "#33443a",
    ground: "#e2e0d9",
    neighbor: "#d9d7d0",
    water: "#b7c7cd",
    fog: "#e9e8e3",
    sky: "#dfe7ea",
    skyGround: "#e2e0d9",
    sun: "#fff3e2",
    hemi: 1.1,
    sunI: 2.2,
    lit: 0,
    shadow: 0.35,
    sunPos: [8, 14, 6],
  },
};

const COLORS = ["slab", "wing", "tree", "ground", "neighbor", "water", "fog", "sky", "skyGround", "sun"] as const;
const NUMS = ["hemi", "sunI", "lit", "shadow"] as const;
export type Env = Record<(typeof COLORS)[number], THREE.Color> & Record<(typeof NUMS)[number], number> & { sunPos: THREE.Vector3; value: number };

const _a = new THREE.Color();
const _b = new THREE.Color();
const _v = new THREE.Vector3();
export function mixEnv(sun: number, out: Env) {
  const [a, b, t] = sun < 0.5 ? [KEYS.night, KEYS.dusk, sun / 0.5] : [KEYS.dusk, KEYS.day, (sun - 0.5) / 0.5];
  for (const k of COLORS) out[k].copy(_a.set(a[k])).lerp(_b.set(b[k]), t);
  for (const k of NUMS) out[k] = a[k] + (b[k] - a[k]) * t;
  out.sunPos.set(...a.sunPos).lerp(_v.set(...b.sunPos), t);
  out.value = sun;
  return out;
}
export const makeEnv = (sun: number): Env =>
  mixEnv(sun, {
    ...(Object.fromEntries(COLORS.map((k) => [k, new THREE.Color()])) as Record<(typeof COLORS)[number], THREE.Color>),
    ...(Object.fromEntries(NUMS.map((k) => [k, 0])) as Record<(typeof NUMS)[number], number>),
    sunPos: new THREE.Vector3(),
    value: sun,
  });
