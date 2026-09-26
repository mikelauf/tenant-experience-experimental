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
    /** The park's real outline, when it isn't a plain rectangle: trees only grow inside it, clear of its edges */
    outline?: [x: number, z: number][];
    /** Camera arc when the park is the stop */
    yaw: [center: number, range: number];
  } | null;
  /** Procedural city ring: inner radius, how many blocks to try, how deep the ring is (default 6.5), and a height scale */
  city: { inner: number; count: number; spread?: number; height?: number };
  /**
   * The real neighborhood, from OpenStreetMap (see scripts/osm-city.mjs): a JSON file of buildings, streets and
   * parks in scene units, and the radius it covers. The procedural ring then only fills the outskirts beyond it.
   */
  realCity?: { src: string; radius: number };
  /** Radius of the land around the tower; water beyond (default 14.5) */
  ground?: number;
  /**
   * The true compass bearing of the scene's "north" (−z), in degrees. Scenes are drawn square to the street grid,
   * and a grid can sit off true north (downtown San Francisco's by about 9°); bearings are turned by this.
   */
  north?: number;
  /** Where landmarks sit: `start` units out, plus `perKm` for each real kilometre (default 9 + 3.1/km) */
  landmarkRing?: { start: number; perKm: number };
  /** Default level the marker rests at when nothing is selected */
  restLevel: number;
  seed: number;
  /** Real landmarks around the building, placed by compass bearing and distance. North is −z, east is +x. */
  landmarks?: Landmark[];
  /** Street-level places people need to find: entrances, check-in, service access. In scene units. */
  pois?: Poi[];
  /** Street names shown on the ground while arriving, each at a point along the street. In scene units. */
  streets?: { name: string; x: number; z: number }[];
};

export type Landmark = {
  name: string;
  kind: "coit" | "skyscraper" | "ferry" | "church" | "island" | "bay-bridge" | "golden-gate";
  /** Degrees clockwise from north, as seen from the building */
  bearing: number;
  /** Real distance in km; the scene compresses it (see `sceneLandmarks`) */
  km: number;
  /** For bridges: the deck's direction, degrees clockwise from north */
  heading?: number;
};

export type Poi = {
  id: string;
  label: string;
  detail: string;
  x: number;
  z: number;
  /** A Google Maps search that finds the real spot */
  maps?: string;
  /** Known to exist but not yet located on a plan */
  pending?: boolean;
};

/** Half the deck length of each bridge model, in scene units */
export const BRIDGE_HALF = { "bay-bridge": 11, "golden-gate": 8 } as const;

/** How much room each landmark model takes, as a radius, for keeping other things clear of it */
export const LANDMARK_REACH: Record<Landmark["kind"], number> = {
  coit: 2.6,
  skyscraper: 1.4,
  ferry: 1.8,
  church: 1.1,
  island: 2.2,
  "bay-bridge": 0,
  "golden-gate": 0,
};

/** A landmark as placed in the scene: bearings turned onto the street grid, and its position */
export type SceneLandmark = Landmark & { x: number; z: number };

const dirOf = (deg: number): [number, number] => [Math.sin((deg * Math.PI) / 180), -Math.cos((deg * Math.PI) / 180)];

/**
 * Where the landmarks sit. Near things keep roughly their true spacing; far things are pulled in onto a horizon so
 * the Golden Gate is still in frame from the top floors. A bridge is pushed out until its whole deck clears the land
 * the city stands on, so it never cuts through buildings.
 */
export function sceneLandmarks(p: TowerProfile): SceneLandmark[] {
  const { start, perKm } = p.landmarkRing ?? { start: 9, perKm: 3.1 };
  const turn = -(p.north ?? 0);
  const clear = (p.realCity?.radius ?? 0) + 2;
  return (p.landmarks ?? []).map((l) => {
    const bearing = l.bearing + turn;
    const heading = l.heading == null ? undefined : l.heading + turn;
    const [dx, dz] = dirOf(bearing);
    let r = start + Math.min(l.km, 8) * perKm;
    if ((l.kind === "bay-bridge" || l.kind === "golden-gate") && heading != null) {
      const [hx, hz] = dirOf(heading);
      const half = BRIDGE_HALF[l.kind];
      const nearest = (rr: number) => Math.min(Math.hypot(dx * rr + hx * half, dz * rr + hz * half), Math.hypot(dx * rr - hx * half, dz * rr - hz * half));
      while (nearest(r) < clear) r += 0.25;
    }
    return { ...l, bearing, heading, x: dx * r, z: dz * r };
  });
}

/** The scene direction of true north, as an x/z unit vector */
export const trueNorth = (p: TowerProfile): [number, number] => dirOf(-(p.north ?? 0));

export const topOf = (p: TowerProfile) => p.floors * p.floorH;
export const levelY = (p: TowerProfile, level: number) => level * p.floorH;

const rng = (seed: number) => {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
};

/** Trees scattered inside the park rectangle */
export function treesFor(p: TowerProfile): [number, number, number][] {
  if (!p.park) return [];
  const { x, z, w, d, trees, outline } = p.park;
  const rnd = rng(p.seed + 11);
  const out: [number, number, number][] = [];
  // With a real outline, keep a canopy's width from every edge so no tree leans into the buildings around it
  const fits = (tx: number, tz: number) => {
    if (!outline) return true;
    let inside = false;
    let edge = Infinity;
    for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
      const [xi, zi] = outline[i];
      const [xj, zj] = outline[j];
      if (zi > tz !== zj > tz && tx < ((xj - xi) * (tz - zi)) / (zj - zi) + xi) inside = !inside;
      edge = Math.min(edge, toSegment(tx, tz, xi, zi, xj, zj));
    }
    return inside && edge > 0.3;
  };
  for (let tries = 0; out.length < trees && tries < trees * 20; tries++) {
    const tx = x - w / 2 + rnd() * w;
    const tz = z - d / 2 + rnd() * d;
    const h = 1.1 + rnd() * 0.9;
    if (fits(tx, tz)) out.push([tx, tz, h]);
  }
  return out;
}

/** Distance from a point to a segment */
function toSegment(x: number, z: number, ax: number, az: number, bx: number, bz: number) {
  const vx = bx - ax;
  const vz = bz - az;
  const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz)));
  return Math.hypot(x - (ax + vx * t), z - (az + vz * t));
}

/** Low-rise context blocks in a ring, kept clear of the tower, the park and the landmarks */
export function neighborsFor(p: TowerProfile): [number, number, number, number, number][] {
  const out: [number, number, number, number, number][] = [];
  const rnd = rng(p.seed + 29);
  const marks = sceneLandmarks(p);
  const ground = p.ground ?? 14.5;
  for (let i = 0; i < p.city.count; i++) {
    const a = rnd() * Math.PI * 2;
    const r = p.city.inner + rnd() * (p.city.spread ?? 6.5);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (p.park) {
      const { x: px, z: pz, w: pw, d: pd, pad } = p.park;
      if (Math.abs(x - px) < pw / 2 + pad[0] && Math.abs(z - pz) < pd / 2 + pad[1]) continue;
    }
    const w = 0.9 + rnd() * 1.4;
    const d = 0.9 + rnd() * 1.4;
    const h = (0.6 + rnd() * rnd() * 5.2) * (p.city.height ?? 1);
    if (Math.hypot(x, z) + Math.max(w, d) / 2 > ground - 0.3) continue;
    const blocked = marks.some((m) => {
      if (m.kind === "bay-bridge" || m.kind === "golden-gate") {
        if (m.heading == null) return false;
        const [hx, hz] = dirOf(m.heading);
        const half = BRIDGE_HALF[m.kind];
        return toSegment(x, z, m.x - hx * half, m.z - hz * half, m.x + hx * half, m.z + hz * half) < 1.4;
      }
      return Math.hypot(x - m.x, z - m.z) < LANDMARK_REACH[m.kind] + 1.2;
    });
    if (blocked) continue;
    out.push([x, z, w, d, h]);
  }
  return out;
}
