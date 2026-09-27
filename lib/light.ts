/**
 * The scene's light as data: three keyframes, night → dusk → day, that the 3D city blends between by `sun`
 * (0 night, 0.5 dusk, 1 day). Kept free of three.js so the page's CSS sky can read the same palette.
 * A tower profile can override any of it (`TowerProfile.light`), so a new city gets its own light in data.
 */
export type LightKey = {
  /** The tower's floor slabs and its wings */
  slab: string;
  wing: string;
  tree: string;
  ground: string;
  /** The city's blocks, before each building's own tint */
  neighbor: string;
  water: string;
  /** Haze at distance; by day it's the sky's horizon */
  fog: string;
  /** Sky fill from above and bounce from below */
  sky: string;
  skyGround: string;
  sun: string;
  /** Unlit window glass: dark after dark, the sky reflected by day */
  glass: string;
  /** The backdrop gradient: overhead and at the horizon */
  zenith: string;
  horizon: string;
  hemi: number;
  sunI: number;
  /** How lit the windows are */
  lit: number;
  shadow: number;
  /** How much each building takes its own color (0 all alike, 1 full daylight variety) */
  vary: number;
  sunPos: [number, number, number];
};

export type LightName = "night" | "dusk" | "day";
export type LightKeys = Record<LightName, LightKey>;
export type LightOverrides = Partial<Record<LightName, Partial<LightKey>>>;

export const LIGHT_KEYS: LightKeys = {
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
    glass: "#0e1116",
    zenith: "#2a3a4c",
    horizon: "#10151b",
    hemi: 0.75,
    sunI: 0.5,
    lit: 1.8,
    shadow: 0.55,
    vary: 0,
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
    glass: "#1c232c",
    zenith: "#1f2a40",
    horizon: "#9a7486",
    hemi: 1.5,
    sunI: 1.15,
    lit: 1.5,
    shadow: 0.5,
    vary: 0.25,
    sunPos: [-10, 5, 6],
  },
  day: {
    slab: "#efece5",
    wing: "#e4e0d7",
    tree: "#4d7447",
    ground: "#e4dfd3",
    neighbor: "#ebe5d9",
    water: "#5a8ea6",
    fog: "#c6d8e4",
    sky: "#a9c6e4",
    skyGround: "#d9cdb6",
    sun: "#ffeed2",
    glass: "#6f8ca6",
    zenith: "#6d9fd0",
    horizon: "#c6d8e4",
    hemi: 0.85,
    sunI: 2.6,
    lit: 0,
    shadow: 0.35,
    vary: 1,
    sunPos: [8, 14, 6],
  },
};

/** The default keyframes with a profile's overrides laid over them */
export function withLight(over?: LightOverrides): LightKeys {
  if (!over) return LIGHT_KEYS;
  return {
    night: { ...LIGHT_KEYS.night, ...over.night },
    dusk: { ...LIGHT_KEYS.dusk, ...over.dusk },
    day: { ...LIGHT_KEYS.day, ...over.day },
  };
}

/** Which two keyframes a sun level falls between, and how far along */
export function lightSpan(sun: number, keys: LightKeys): [LightKey, LightKey, number] {
  return sun < 0.5 ? [keys.night, keys.dusk, sun / 0.5] : [keys.dusk, keys.day, (sun - 0.5) / 0.5];
}

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
function mixHex(a: string, b: string, t: number) {
  const [x, y] = [hex(a), hex(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(",")})`;
}

/** The sky behind the model at a sun level, from the same keyframes as the scene, so its horizon meets the haze */
export function lightBackdrop(sun: number, keys = LIGHT_KEYS) {
  const [a, b, t] = lightSpan(sun, keys);
  const zenith = mixHex(a.zenith, b.zenith, t);
  const horizon = mixHex(a.horizon, b.horizon, t);
  return `linear-gradient(180deg,${zenith} 0%,${horizon} 36%,${horizon} 100%)`;
}
