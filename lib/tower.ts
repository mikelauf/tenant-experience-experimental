/**
 * A building's silhouette as data. The 3D tower, its park and its city are all
 * generated from one of these, so a new property is a new profile, not new code.
 * Units are arbitrary scene units; one floor is `floorH` tall.
 */
export type TowerProfile = {
  floors: number;
  floorH: number;
  /** Face widths (x, z) at a floor. Called for floors a little past the top too, for crowns and wings. */
  widthAt: (floor: number) => number;
  depthAt: (floor: number) => number;
  /** How the top ends */
  crown: { kind: "spire"; height: number; radius: number } | { kind: "lantern"; height: number; radius: number; mast: number };
  /** Paired side towers (the Pyramid's elevator and stair wings) */
  wings?: { from: number; to: number };
  /** Vertical window slits per face: how many and how wide (fraction of the slot) */
  facade: { slits: number; width: number };
  /** Street-level green: where it sits, how the camera frames it, and how the trees look */
  park: {
    /** The grove the trees fill */
    x: number;
    z: number;
    w: number;
    d: number;
    /** Extra clearance around it that city blocks keep */
    pad: [x: number, z: number];
    trees: number;
    shape: "cone" | "round";
    /** Camera arc when the park is the stop */
    yaw: [center: number, range: number];
  } | null;
  /** City ring: inner radius and how many blocks to try */
  city: { inner: number; count: number };
  /** Default level the marker rests at when nothing is selected */
  restLevel: number;
  seed: number;
};

export const topOf = (p: TowerProfile) => p.floors * p.floorH;
export const levelY = (p: TowerProfile, level: number) => level * p.floorH;

const rng = (seed: number) => {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
};

/** Trees scattered inside the park rectangle */
export function treesFor(p: TowerProfile): [number, number, number][] {
  if (!p.park) return [];
  const { x, z, w, d, trees } = p.park;
  const rnd = rng(p.seed + 11);
  return Array.from({ length: trees }, () => [x - w / 2 + rnd() * w, z - d / 2 + rnd() * d, 1.1 + rnd() * 0.9]);
}

/** Low-rise context blocks in a ring, kept clear of the tower and the park */
export function neighborsFor(p: TowerProfile): [number, number, number, number, number][] {
  const out: [number, number, number, number, number][] = [];
  const rnd = rng(p.seed + 29);
  for (let i = 0; i < p.city.count; i++) {
    const a = rnd() * Math.PI * 2;
    const r = p.city.inner + rnd() * 6.5;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (p.park) {
      const { x: px, z: pz, w: pw, d: pd, pad } = p.park;
      if (Math.abs(x - px) < pw / 2 + pad[0] && Math.abs(z - pz) < pd / 2 + pad[1]) continue;
    }
    const w = 0.9 + rnd() * 1.4;
    const d = 0.9 + rnd() * 1.4;
    const h = 0.6 + rnd() * rnd() * 5.2;
    out.push([x, z, w, d, h]);
  }
  return out;
}
