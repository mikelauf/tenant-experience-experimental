import type { Interior, InteriorPiece, PropKind } from "@/lib/data/types";

/**
 * Two floors, opened up in the tower. Neither is traced from a plan: they're laid out from the building's photos and
 * press descriptions, so each says "illustrative" wherever it's shown. When TAP sends plans, trace them here the way
 * the venue shells were (lib/tenants/pyramid/shells.ts).
 *
 * Units are fractions of the floor plate (x, z from −0.5 to 0.5) and of a floor's height.
 */

const T = 0.012; // wall thickness

/** Four walls around a rectangle, with a gap on one side for the door */
function room(x0: number, z0: number, x1: number, z1: number, tone: InteriorPiece["tone"], h = 0.9, door: "n" | "s" | "e" | "w" = "n"): InteriorPiece[] {
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const w = x1 - x0;
  const d = z1 - z0;
  const gap = 0.07;
  const side = (x: number, z: number, len: number, along: "x" | "z", opening: boolean): InteriorPiece[] => {
    if (!opening) return [along === "x" ? { x, z, w: len, d: T, h, tone } : { x, z, w: T, d: len, h, tone }];
    const half = (len - gap) / 2;
    const o = (len + gap) / 4 + gap / 4;
    return along === "x"
      ? [
          { x: x - o, z, w: half, d: T, h, tone },
          { x: x + o, z, w: half, d: T, h, tone },
        ]
      : [
          { x, z: z - o, w: T, d: half, h, tone },
          { x, z: z + o, w: T, d: half, h, tone },
        ];
  };
  return [
    ...side(cx, z0, w, "x", door === "n"),
    ...side(cx, z1, w, "x", door === "s"),
    ...side(x0, cz, d, "z", door === "w"),
    ...side(x1, cz, d, "z", door === "e"),
  ];
}

/** Rough sizes of the real things, in meters: footprint across (w) and deep (d) when facing north, and height */
const KIT: Record<PropKind, { w: number; d: number; h: number; tone: InteriorPiece["tone"] }> = {
  treadmill: { w: 0.85, d: 2, h: 1.4, tone: "dark" },
  bike: { w: 0.55, d: 1.2, h: 1.1, tone: "dark" },
  rower: { w: 0.6, d: 2.4, h: 0.5, tone: "dark" },
  rack: { w: 1.4, d: 1.4, h: 2.3, tone: "metal" },
  bench: { w: 0.45, d: 1.3, h: 0.45, tone: "dark" },
  dumbbells: { w: 2.2, d: 0.7, h: 0.85, tone: "metal" },
  mat: { w: 0.62, d: 1.85, h: 0.01, tone: "mat" },
  mirror: { w: 1, d: 0.06, h: 2, tone: "glass" },
  podium: { w: 2, d: 1.6, h: 0.4, tone: "warm" },
  sauna: { w: 1, d: 1.1, h: 0.9, tone: "wood" },
  steam: { w: 1, d: 0.55, h: 0.45, tone: "wall" },
  locker: { w: 1, d: 0.5, h: 2, tone: "warm" },
  counter: { w: 1, d: 0.75, h: 1.05, tone: "wood" },
  espresso: { w: 0.8, d: 0.55, h: 1.5, tone: "metal" },
  stool: { w: 0.4, d: 0.4, h: 0.75, tone: "dark" },
  banquette: { w: 1, d: 0.85, h: 0.9, tone: "soft" },
  armchair: { w: 0.85, d: 0.85, h: 0.8, tone: "soft" },
  "cafe-table": { w: 0.7, d: 0.7, h: 0.75, tone: "wood" },
  desk: { w: 1, d: 0.9, h: 0.74, tone: "wood" },
  chair: { w: 0.5, d: 0.5, h: 0.85, tone: "dark" },
  plant: { w: 0.6, d: 0.6, h: 1.6, tone: "green" },
};
const STOREY = 3.9;

/**
 * A piece of kit at (x, z) on a plate this many meters across. It carries its real kind for the room view, and a
 * block of about the right size for the tower's cutaway, which only draws blocks.
 */
function kit(plate: Interior["plate"]) {
  return (kind: PropKind, x: number, z: number, o: { rot?: number; len?: number } = {}): InteriorPiece => {
    const k = KIT[kind];
    const across = o.len ?? k.w;
    const side = Math.abs(Math.sin(o.rot ?? 0)) > 0.7;
    return {
      kind,
      x,
      z,
      rot: o.rot,
      len: o.len,
      w: (side ? k.d : across) / plate.w,
      d: (side ? across : k.d) / plate.d,
      h: k.h / STOREY,
      tone: k.tone,
      round: kind === "plant" || kind === "cafe-table" || kind === "stool",
    };
  };
}

/** A row of the same kit between two points */
function row(put: ReturnType<typeof kit>, kind: PropKind, x0: number, z0: number, x1: number, z1: number, n: number, o?: { rot?: number; len?: number }) {
  return Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    return put(kind, x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, o);
  });
}

const S = Math.PI;
const W = Math.PI / 2;
const E = -Math.PI / 2;

const L26 = { w: 32, d: 32 };
const g = kit(L26);

/** Level 26: the gym faces the windows, studios behind glass, heat and changing rooms by the core. */
export const wellnessFloor: Interior = {
  floor: "rubber",
  plate: L26,
  note: "Illustrative layout, from the building's photos. Not a floor plan.",
  pieces: [
    // Cardio along the north windows, facing out, and rowers behind
    ...row(g, "treadmill", -0.4, -0.42, -0.04, -0.42, 6),
    ...row(g, "bike", 0.04, -0.43, 0.4, -0.43, 6),
    ...row(g, "rower", -0.36, -0.3, -0.06, -0.3, 5),
    // Strength floor: racks with a bench in each, dumbbells along the side, a turf lane
    ...row(g, "rack", -0.26, -0.15, 0.02, -0.15, 3),
    ...row(g, "bench", -0.26, -0.15, 0.02, -0.15, 3),
    g("dumbbells", 0.14, -0.12, { rot: W }),
    g("mirror", 0.19, -0.12, { rot: W, len: 7 }),
    { x: 0.1, z: -0.3, w: 0.14, d: 0.06, h: 0.004, tone: "green" },
    // Ride studio, behind glass: bikes in rows facing the instructor
    ...room(-0.46, 0.06, -0.04, 0.46, "glass", 0.9, "e"),
    ...[0.18, 0.27, 0.36, 0.43].flatMap((z) => row(g, "bike", -0.38, z, -0.12, z, 5)),
    g("podium", -0.25, 0.1, { rot: S }),
    // Yoga studio: wood floor, a mirror wall and mats laid out
    ...room(0.04, 0.06, 0.46, 0.46, "glass", 0.9, "w"),
    { x: 0.25, z: 0.26, w: 0.4, d: 0.38, h: 0.004, tone: "wood" },
    g("mirror", 0.25, 0.075, { rot: S, len: 12 }),
    ...[0.17, 0.26, 0.35, 0.43].flatMap((z) => row(g, "mat", 0.1, z, 0.4, z, 6)),
    // Sauna in cedar and steam in stone, changing rooms across the way
    ...room(0.24, -0.26, 0.46, -0.15, "wood", 0.95, "w"),
    g("sauna", 0.36, -0.235, { rot: S, len: 5.4 }),
    ...room(0.24, -0.15, 0.46, -0.04, "wall", 0.95, "w"),
    g("steam", 0.36, -0.06, { len: 5.4 }),
    g("steam", 0.44, -0.095, { rot: W, len: 2.4 }),
    ...room(-0.46, -0.26, -0.32, -0.04, "wall", 0.95, "e"),
    g("locker", -0.445, -0.15, { rot: E, len: 6 }),
    g("bench", -0.39, -0.15, { rot: W }),
    // Plants by the doors
    g("plant", 0.2, -0.03),
    g("plant", 0.44, 0.02),
    g("plant", -0.46, -0.46),
  ],
  labels: [
    { x: -0.2, z: -0.42, text: "Cardio", note: "Treadmills and bikes facing the slanted windows, rowers behind." },
    { x: -0.12, z: -0.15, text: "Strength", note: "Racks, benches and a full dumbbell run." },
    { x: -0.25, z: 0.28, text: "Ride studio", note: "Bikes in rows, taught from the front." },
    { x: 0.25, z: 0.28, text: "Yoga studio", note: "Mats laid out for classes, open for stretching between them." },
    { x: 0.35, z: -0.15, text: "Steam & sauna", note: "Cedar sauna and a stone steam room." },
    { x: -0.39, z: -0.15, text: "Changing rooms" },
  ],
};

const L27 = { w: 31, d: 31 };
const l = kit(L27);

/** Level 27: banquettes along the windows, a round island in the middle, the espresso bar on the east side. */
export const loungeFloor: Interior = {
  floor: "wood",
  plate: L27,
  note: "Illustrative layout, from the building's photos. Not a floor plan.",
  pieces: [
    // Banquettes facing the north windows (Coit Tower), tables between them and the glass, chairs by the window
    ...row(l, "banquette", -0.3, -0.35, 0.3, -0.35, 3, { len: 5 }),
    ...[-0.36, -0.24, -0.06, 0.06, 0.24, 0.36].flatMap((x) => [l("cafe-table", x, -0.4), l("chair", x, -0.44, { rot: S })]),
    // And along the west windows
    ...row(l, "banquette", -0.35, -0.16, -0.35, 0.16, 2, { rot: W, len: 5 }),
    ...[-0.22, -0.1, 0.1, 0.22].flatMap((z) => [l("cafe-table", -0.4, z), l("chair", -0.44, z, { rot: E })]),
    // The round island, armchairs around it
    { x: 0, z: 0, w: 0.3, d: 0.3, h: 0.004, tone: "warm", round: true },
    { x: 0, z: 0, w: 0.16, d: 0.16, h: 0.12, tone: "soft", round: true },
    ...[0, 1, 2, 3].map((k) => {
      const a = Math.PI / 4 + (k * Math.PI) / 2;
      return l("armchair", Math.sin(a) * 0.12, -Math.cos(a) * 0.12, { rot: -a + Math.PI });
    }),
    // Espresso bar on the east side, stools along it, the back bar behind
    l("counter", 0.36, 0.05, { rot: W, len: 9 }),
    l("espresso", 0.37, -0.02, { rot: W }),
    l("espresso", 0.37, 0.12, { rot: W }),
    ...row(l, "stool", 0.325, -0.06, 0.325, 0.16, 5, { rot: W }),
    { x: 0.44, z: 0.05, w: 0.025, d: 0.34, h: 0.55, tone: "dark" },
    // Work tables to the south
    ...[-0.25, -0.02, 0.21].flatMap((x) => [
      l("desk", x, 0.34, { len: 3.6 }),
      ...[-0.035, 0.035].flatMap((dx) => [l("chair", x + dx, 0.315, { rot: S }), l("chair", x + dx, 0.365)]),
    ]),
    // Plants
    l("plant", -0.44, -0.44),
    l("plant", 0.44, 0.44),
    l("plant", 0.44, -0.44),
    l("plant", -0.44, 0.44),
    l("plant", 0.2, -0.18),
  ],
  labels: [
    { x: 0, z: -0.37, text: "Window banquettes", note: "Facing Coit Tower and the bay. Bring a laptop, stay for the view." },
    { x: -0.37, z: 0, text: "West windows" },
    { x: 0, z: 0, text: "The round island" },
    { x: 0.36, z: 0.05, text: "Espresso bar" },
    { x: -0.02, z: 0.34, text: "Work tables", note: "Big tables for heads-down work." },
  ],
};
