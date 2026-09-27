import type { Interior, InteriorPiece } from "@/lib/data/types";

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

/** A grid of identical pieces filling a rectangle */
function grid(x0: number, z0: number, x1: number, z1: number, cols: number, rows: number, piece: Omit<InteriorPiece, "x" | "z">): InteriorPiece[] {
  const out: InteriorPiece[] = [];
  for (let c = 0; c < cols; c++)
    for (let r = 0; r < rows; r++)
      out.push({ ...piece, x: x0 + ((c + 0.5) / cols) * (x1 - x0), z: z0 + ((r + 0.5) / rows) * (z1 - z0) });
  return out;
}

/** Level 26: the gym faces the windows, studios behind glass, heat and changing rooms by the core. */
export const wellnessFloor: Interior = {
  floor: "rubber",
  note: "Illustrative layout, from the building's photos. Not a floor plan.",
  pieces: [
    // Cardio along the north windows, facing out
    ...grid(-0.4, -0.44, 0.4, -0.34, 8, 1, { w: 0.05, d: 0.1, h: 0.32, tone: "dark" }),
    // Strength floor: racks and benches
    ...grid(-0.28, -0.24, 0.12, -0.08, 3, 1, { w: 0.07, d: 0.035, h: 0.75, tone: "metal" }),
    ...grid(-0.28, -0.13, 0.12, -0.02, 3, 1, { w: 0.03, d: 0.08, h: 0.16, tone: "dark" }),
    { x: -0.08, z: -0.17, w: 0.16, d: 0.05, h: 0.02, tone: "warm" },
    // Ride studio, behind glass: bikes in rows facing the instructor
    ...room(-0.46, 0.06, -0.04, 0.46, "glass", 0.9, "n"),
    ...grid(-0.4, 0.16, -0.1, 0.42, 4, 3, { w: 0.035, d: 0.07, h: 0.26, tone: "dark" }),
    { x: -0.25, z: 0.1, w: 0.06, d: 0.05, h: 0.3, tone: "warm" },
    // Yoga studio: wood floor and mats
    ...room(0.04, 0.06, 0.46, 0.46, "glass", 0.9, "n"),
    { x: 0.25, z: 0.26, w: 0.4, d: 0.38, h: 0.01, tone: "wood" },
    ...grid(0.1, 0.12, 0.4, 0.42, 3, 3, { w: 0.05, d: 0.11, h: 0.012, tone: "mat" }),
    // Steam and sauna in cedar, changing rooms beside them
    ...room(0.24, -0.26, 0.46, -0.04, "wood", 0.95, "w"),
    { x: 0.35, z: -0.15, w: 0.2, d: 0.2, h: 0.5, tone: "wood" },
    ...room(-0.46, -0.26, -0.32, -0.04, "wall", 0.95, "e"),
    // A plant by the door
    { x: 0.18, z: -0.05, w: 0.035, d: 0.035, h: 0.4, tone: "green", round: true },
  ],
  labels: [
    { x: 0, z: -0.39, text: "Cardio, facing the windows" },
    { x: -0.08, z: -0.15, text: "Strength floor" },
    { x: -0.25, z: 0.28, text: "Ride studio" },
    { x: 0.25, z: 0.28, text: "Yoga studio" },
    { x: 0.35, z: -0.15, text: "Steam & sauna" },
    { x: -0.39, z: -0.15, text: "Changing rooms" },
  ],
};

/** Level 27: long sofas along the windows, a round island in the middle, the espresso bar by the elevators. */
export const loungeFloor: Interior = {
  floor: "wood",
  note: "Illustrative layout, from the building's photos. Not a floor plan.",
  pieces: [
    // Curved banquettes along the north and west windows (as runs of seat)
    ...grid(-0.38, -0.44, 0.38, -0.4, 5, 1, { w: 0.14, d: 0.06, h: 0.18, tone: "soft" }),
    ...grid(-0.44, -0.3, -0.4, 0.3, 1, 4, { w: 0.06, d: 0.13, h: 0.18, tone: "soft" }),
    // Tables in front of them
    ...grid(-0.3, -0.33, 0.3, -0.3, 4, 1, { w: 0.06, d: 0.06, h: 0.2, tone: "wood", round: true }),
    // The round island
    { x: 0, z: 0, w: 0.3, d: 0.3, h: 0.01, tone: "warm", round: true },
    { x: 0, z: 0, w: 0.22, d: 0.22, h: 0.16, tone: "soft", round: true },
    // Espresso bar by the east side
    { x: 0.36, z: 0.05, w: 0.07, d: 0.34, h: 0.4, tone: "wood" },
    { x: 0.43, z: 0.05, w: 0.03, d: 0.34, h: 0.85, tone: "dark" },
    // Work tables to the south
    ...grid(-0.25, 0.26, 0.2, 0.4, 3, 1, { w: 0.12, d: 0.06, h: 0.22, tone: "wood" }),
    ...grid(-0.25, 0.2, 0.2, 0.46, 3, 2, { w: 0.03, d: 0.03, h: 0.15, tone: "dark" }),
    // Plants
    { x: -0.4, z: -0.4, w: 0.04, d: 0.04, h: 0.45, tone: "green", round: true },
    { x: 0.4, z: 0.4, w: 0.04, d: 0.04, h: 0.45, tone: "green", round: true },
    { x: 0.2, z: -0.18, w: 0.035, d: 0.035, h: 0.4, tone: "green", round: true },
  ],
  labels: [
    { x: 0, z: -0.42, text: "Sofas along the windows" },
    { x: 0, z: 0, text: "The round island" },
    { x: 0.38, z: 0.05, text: "Espresso bar" },
    { x: -0.02, z: 0.33, text: "Work tables" },
  ],
};
