import type { Plate, Rect, Seg, Setup, SetupSpec, Shell } from "../data/types.ts";

/**
 * Shells are traced straight off the booklet plan images: positions are written in the image's own
 * pixels and converted to meters here. The plans carry no scale bar, so `scale` (meters per pixel) is
 * chosen so the traced event area matches the booklet's square footage, and (ox, oy) is the pixel that
 * becomes the origin. Framework-free, so the tests can load it.
 */
export function tracer(scale: number, ox: number, oy: number) {
  const m = (v: number) => Math.round(v * scale * 100) / 100;
  const p = (x: number, y: number): [number, number] => [m(x - ox), m(y - oy)];
  const r = (x0: number, y0: number, x1: number, y1: number, label?: string): Rect => ({
    x: m((x0 + x1) / 2 - ox),
    z: m((y0 + y1) / 2 - oy),
    w: m(Math.abs(x1 - x0)),
    d: m(Math.abs(y1 - y0)),
    ...(label ? { label } : {}),
  });
  const seg = (x0: number, y0: number, x1: number, y1: number): Seg => [...p(x0, y0), ...p(x1, y1)];
  return { p, r, seg, m };
}

/** The outline's bounding box, in meters. */
export function shellBounds(s: Shell) {
  const xs = s.outline.map((p) => p[0]);
  const zs = s.outline.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const z0 = Math.min(...zs);
  const z1 = Math.max(...zs);
  return { x0, x1, z0, z1, w: x1 - x0, d: z1 - z0, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2 };
}

/**
 * A plain rectangular shell for rooms that have no traced plan yet (member meeting rooms):
 * glass on the window sides, a bar on the west wall and a stage on the north wall that appear when a setup needs them.
 */
export function shellFromPlate({ w, d, windows, outdoor }: Plate): Shell {
  const hw = w / 2;
  const hd = d / 2;
  const edges: Record<"north" | "east" | "south" | "west", Seg> = {
    north: [-hw, -hd, hw, -hd],
    east: [hw, -hd, hw, hd],
    south: [hw, hd, -hw, hd],
    west: [-hw, hd, -hw, -hd],
  };
  const sides = windows === "wrap" ? (["north", "east", "west"] as const) : windows === "north" ? (["north"] as const) : windows === "east" ? (["east"] as const) : [];
  const m = 0.8;
  const barLen = Math.min(d * 0.55, 6);
  const stageW = Math.min(w * 0.5, 7);
  const trees: [number, number][] = [];
  if (outdoor) {
    let s = 5;
    const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 22; i++) {
      const side = i % 4;
      const t = r() - 0.5;
      const x = side < 2 ? t * w : (side === 2 ? -1 : 1) * (hw + 0.2 - r() * 1.2);
      const z = side >= 2 ? t * d : (side === 0 ? -1 : 1) * (hd + 0.2 - r() * 1.2);
      trees.push([x, z]);
    }
  }
  return {
    outline: [
      [-hw, -hd],
      [hw, -hd],
      [hw, hd],
      [-hw, hd],
    ],
    glass: sides.map((s) => edges[s]),
    solids: [],
    zones: { room: [{ x: 0, z: 0, w: w - m * 2, d: d - m * 2 }] },
    fixed: {
      bars: [{ x: -hw + 0.7, z: 0, w: 0.7, d: barLen }],
      stage: { x: 0, z: -hd + 0.95, w: stageW, d: 1.3 },
      trees: outdoor ? trees : undefined,
    },
    outdoor,
  };
}

/** Setup specs for a shell made by `shellFromPlate`: every setup fills the whole room. */
export const specsFromCapacities = (caps: Partial<Record<Setup, number>>) =>
  Object.fromEntries(Object.entries(caps).map(([s, max]) => [s, { max: max!, zone: "room" }])) as Partial<Record<Setup, SetupSpec>>;

/** A venue layout for a room without a traced plan: a plain rectangle, every capacity an estimate. */
export const plateLayout = (plate: Plate, caps: Partial<Record<Setup, number>>) => ({
  shell: shellFromPlate(plate),
  setups: specsFromCapacities(caps),
  illustrative: true,
});
