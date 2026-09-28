import { topOf, type TowerProfile } from "./tower";

/**
 * A tower drawn in elevation, from its profile: the body stepped floor by floor, the wings, and the crown, in an SVG's
 * own units. `cx` is the tower's centre line, `ground` the street, and the whole building (crown included) fits
 * between the street and `top` px from the top of the drawing.
 */
export function elevation(p: TowerProfile, { cx, ground, top: margin = 12 }: { cx: number; ground: number; top?: number }) {
  const top = topOf(p);
  const crownH = p.crown.kind === "spire" ? p.crown.height : p.crown.height + p.crown.mast;
  const s = (ground - margin) / (top + crownH);
  const y = (u: number) => ground - u * s;
  const half = (floor: number) => (p.widthAt(Math.max(0, Math.min(floor, p.floors - 1))) / 2) * s;
  const inWings = (floor: number) => !!p.wings && floor >= p.wings.from && floor < p.wings.to;
  const wingOut = 0.29 * s;

  // The body, stepped floor by floor (a straight taper reads as a smooth line at this size; setbacks stay crisp)
  const left: string[] = [];
  const right: string[] = [];
  for (let i = 0; i < p.floors; i++) {
    const w = half(i);
    left.push(`${cx - w},${y(i * p.floorH)}`, `${cx - w},${y((i + 1) * p.floorH)}`);
    right.unshift(`${cx + w},${y((i + 1) * p.floorH)}`, `${cx + w},${y(i * p.floorH)}`);
  }
  const body = [...left, ...right].join(" ");

  // Each wing one outline: stepped with the body on its inner edge, a fixed depth out
  const wing = (side: -1 | 1) => {
    if (!p.wings) return "";
    const pts: string[] = [];
    const rows = Array.from({ length: p.wings.to - p.wings.from }, (_, k) => p.wings!.from + k);
    for (const i of rows) pts.push(`${cx + side * (half(i) + wingOut)},${y(i * p.floorH)}`, `${cx + side * (half(i) + wingOut)},${y((i + 1) * p.floorH)}`);
    for (const i of [...rows].reverse()) pts.push(`${cx + side * half(i)},${y((i + 1) * p.floorH)}`, `${cx + side * half(i)},${y(i * p.floorH)}`);
    return pts.join(" ");
  };

  const crown =
    p.crown.kind === "spire"
      ? { kind: "spire" as const, points: `${cx - p.crown.radius * s},${y(top)} ${cx + p.crown.radius * s},${y(top)} ${cx},${y(top + p.crown.height)}` }
      : {
          kind: "lantern" as const,
          points: `${cx - p.crown.radius * s},${y(top)} ${cx + p.crown.radius * s},${y(top)} ${cx + p.crown.radius * 0.82 * s},${y(top + p.crown.height)} ${cx - p.crown.radius * 0.82 * s},${y(top + p.crown.height)}`,
          mast: [y(top + p.crown.height), y(top + crownH)] as const,
        };

  /** A floor's slab as a rectangle; floor n is the storey above the n-th slab line (level 1 is the ground floor) */
  const slab = (floor: number) => ({ x: cx - half(floor), y: y((floor + 1) * p.floorH), w: half(floor) * 2, h: p.floorH * s });

  return { s, y, half, inWings, wingOut, body, wing, crown, slab };
}
