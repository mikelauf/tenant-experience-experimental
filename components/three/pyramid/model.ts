/** Shared geometry for the procedural Pyramid. Units are arbitrary; 1 floor = FLOOR. */

export const FLOORS = 48;
export const FLOOR = 0.2;
export const TOP = FLOORS * FLOOR;
export const BASE_W = 2.9;
export const TOP_W = 0.74;

/** Face width at a floor (continues tapering above the top for the wings) */
export const widthAt = (floor: number) => BASE_W + (TOP_W - BASE_W) * (floor / (FLOORS - 1));

export const levelY = (level: number) => level * FLOOR;

/** Wings: elevator (east) and stair (west) towers from floor 29 to just above the roof */
export const WING_FROM = 29;
export const WING_TO = 52;

/** Redwood Park sits on the east side of the tower */
export const trees: [number, number, number][] = (() => {
  const out: [number, number, number][] = [];
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 26; i++) {
    const x = 2.3 + rnd() * 2.6;
    const z = -1.9 + rnd() * 3.8;
    const h = 1.1 + rnd() * 0.9;
    out.push([x, z, h]);
  }
  return out;
})();

/** Low-rise Financial District context, kept away from the park */
export const neighbors: [number, number, number, number, number][] = (() => {
  const out: [number, number, number, number, number][] = [];
  let seed = 29;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 34; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 3.4 + rnd() * 6.5;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (x > 1.8 && x < 5.4 && Math.abs(z) < 2.6) continue; // the park
    const w = 0.9 + rnd() * 1.4;
    const d = 0.9 + rnd() * 1.4;
    const h = 0.6 + rnd() * rnd() * 5.2;
    out.push([x, z, w, d, h]);
  }
  return out;
})();
