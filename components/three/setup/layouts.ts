import type { Setup } from "@/lib/data/types";

/** x, z, rotationY. Units are meters; the plate is centered on the origin, stage on the north (−z) wall. */
export type P = [number, number, number];

export type Layout = {
  chairs: P[];
  rounds: P[];
  longs: P[]; // rot used as length
  highs: P[];
  people: P[];
  sofas: P[];
  stage: boolean;
  bar: boolean;
};

const empty = (): Layout => ({ chairs: [], rounds: [], longs: [], highs: [], people: [], sofas: [], stage: false, bar: false });

let seed = 1;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Rotation that turns a chair (or person) at (x, z) to face (tx, tz). Chairs face local −z. */
const face = (x: number, z: number, tx: number, tz: number) => Math.atan2(x - tx, z - tz);

/** Stage and bar footprints, shared with the canvas and the SVG plan. */
export const stageSize = (w: number) => Math.min(w * 0.5, 7);
export const stageFront = (d: number) => -d / 2 + 1.6;
export const barLength = (d: number) => Math.min(d * 0.55, 6);
export const barFront = (w: number) => -w / 2 + 1.05;

type Box = { x0: number; x1: number; z0: number; z1: number };

/**
 * Spreads `n` items evenly over a box: picks the grid whose cells are closest to
 * square with the fewest empty slots, centers a short last row, and caps the pitch
 * at `max` so big plates cluster toward the middle instead of scattering.
 */
function spread(n: number, b: Box, max: number): [number, number][] {
  if (n <= 0) return [];
  const aw = b.x1 - b.x0;
  const ah = b.z1 - b.z0;
  let best = { cols: 1, rows: n, score: Infinity };
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const score = Math.abs(Math.log(aw / cols / (ah / rows))) + (0.35 * (cols * rows - n)) / cols;
    if (score < best.score) best = { cols, rows, score };
  }
  const { cols, rows } = best;
  const sx = Math.min(aw / cols, max);
  const sz = Math.min(ah / rows, max);
  const cx = (b.x0 + b.x1) / 2;
  const cz = (b.z0 + b.z1) / 2;
  const out: [number, number][] = [];
  for (let r = 0; r < rows; r++) {
    const inRow = Math.min(cols, n - r * cols);
    for (let c = 0; c < inRow; c++) out.push([cx + (c - (inRow - 1) / 2) * sx, cz + (r - (rows - 1) / 2) * sz]);
  }
  return out;
}

export function makeLayout(setup: Setup, cap: number, w: number, d: number): Layout {
  seed = 7;
  const L = empty();
  const m = 0.8;
  const room: Box = { x0: -w / 2 + m, x1: w / 2 - m, z0: -d / 2 + m, z1: d / 2 - m };
  // Standing and lounge setups keep a service lane clear in front of the bar
  const offBar: Box = { ...room, x0: barFront(w) + 1.6 };
  const stageZ = -d / 2 + 0.95;

  if (setup === "theater" || setup === "classroom") {
    L.stage = true;
    const z0 = stageFront(d) + 1.6;
    const depth = room.z1 - z0;
    const blockW = Math.min(room.x1 - room.x0, stageSize(w) * 2.6);
    const aisle = 1.4;

    // Theater: one chair per slot. Classroom: a 1.6 m table seating two per slot.
    const seatsPer = setup === "theater" ? 1 : 2;
    const slots = Math.ceil(cap / seatsPer);
    const [minX, maxX, minZ, maxZ, ratio] = setup === "theater" ? [0.58, 0.95, 0.92, 1.4, 1.35] : [1.85, 2.5, 1.5, 2.3, 0.9];
    let best = { per: 1, sx: minX, sz: minZ, score: Infinity };
    for (let per = 2; per <= slots; per++) {
      const rows = Math.ceil(slots / per);
      const sx = (blockW - (per >= 6 ? aisle : 0)) / per;
      const sz = depth / rows;
      if (sx < minX || sz < minZ) continue;
      const cx = Math.min(sx, maxX);
      const cz = Math.min(sz, maxZ);
      const score = Math.abs(Math.log(cz / cx / ratio)) + (0.2 * (per * rows - slots)) / per;
      if (score < best.score) best = { per, sx: cx, sz: cz, score };
    }
    const { per, sx, sz } = best;
    const gap = per >= 6 ? aisle : 0;
    const half = Math.ceil(per / 2);
    const bw = per * sx + gap;
    const bow = setup === "theater" ? 0.9 / (bw / 2) ** 2 : 0; // rows curve gently toward the stage
    let n = 0;
    for (let r = 0; n < cap; r++) {
      const inRow = Math.min(per, slots - r * per);
      const z = z0 + sz / 2 + r * sz;
      for (let c = 0; c < inRow && n < cap; c++) {
        const col = c + (per - inRow) / 2; // center a short back row
        const x = -bw / 2 + sx / 2 + col * sx + (col >= half - 0.01 && gap ? gap : 0);
        if (setup === "theater") {
          const zz = z + bow * x * x;
          L.chairs.push([x, zz, face(x, zz, 0, stageZ)]);
          n++;
        } else {
          L.longs.push([x, z, 1.6]);
          for (const dx of [-0.4, 0.4]) {
            if (n >= cap) break;
            L.chairs.push([x + dx, z + 0.6, 0]);
            n++;
          }
        }
      }
    }
  }

  if (setup === "banquet") {
    const tables = Math.ceil(cap / 8);
    let n = 0;
    for (const [x, z] of spread(tables, room, 4.8)) {
      L.rounds.push([x, z, 0]);
      const seats = Math.min(8, cap - n);
      for (let k = 0; k < seats; k++) {
        const a = (k / 8) * Math.PI * 2 + (x + z) * 0.37; // each table turned a little differently
        const cx = x + Math.cos(a) * 1.05;
        const cz = z + Math.sin(a) * 1.05;
        L.chairs.push([cx, cz, face(cx, cz, x, z)]);
        n++;
      }
    }
  }

  if (setup === "reception") {
    L.bar = true;
    const placed: [number, number][] = [];
    const clear = (x: number, z: number, r: number) =>
      x > room.x0 && x < room.x1 && z > room.z0 && z < room.z1 && placed.every(([px, pz]) => (px - x) ** 2 + (pz - z) ** 2 > r * r);
    const add = (x: number, z: number, tx: number, tz: number) => {
      placed.push([x, z]);
      L.people.push([x, z, face(x, z, tx, tz)]);
    };

    const highs = spread(clamp(Math.round(cap / 11), 3, 28), offBar, 4.2).map(
      ([x, z]) => [x + (rnd() - 0.5) * 0.8, z + (rnd() - 0.5) * 0.8] as [number, number],
    );
    highs.forEach(([x, z]) => L.highs.push([x, z, 0]));
    const nearHigh = (x: number, z: number) => highs.some(([hx, hz]) => (hx - x) ** 2 + (hz - z) ** 2 < 0.7 ** 2);

    // A loose line at the bar
    const bx = barFront(w) + 0.55;
    const atBar = Math.min(Math.round(cap * 0.08), Math.floor(barLength(d) / 0.7));
    for (let i = 0; i < atBar; i++) {
      const z = -barLength(d) / 2 + 0.35 + i * 0.7 + (rnd() - 0.5) * 0.15;
      add(bx + rnd() * 0.25, z, bx - 1, z);
    }
    // Three or four around each high-top
    for (const [hx, hz] of highs) {
      const k = 3 + Math.round(rnd());
      const a0 = rnd() * Math.PI * 2;
      for (let j = 0; j < k && L.people.length < cap; j++) {
        const a = a0 + (j / k) * Math.PI * 2 + (rnd() - 0.5) * 0.4;
        const x = hx + Math.cos(a) * 0.62;
        const z = hz + Math.sin(a) * 0.62;
        if (clear(x, z, 0.46)) add(x, z, hx, hz);
      }
    }
    // Everyone else mingles in small circles across the open floor
    for (let tries = 0; L.people.length < cap && tries < 4000; tries++) {
      const gx = offBar.x0 + rnd() * (offBar.x1 - offBar.x0);
      const gz = room.z0 + rnd() * (room.z1 - room.z0);
      if (!clear(gx, gz, 1.05) || nearHigh(gx, gz)) continue;
      const k = Math.min(2 + Math.floor(rnd() * 3), cap - L.people.length);
      const a0 = rnd() * Math.PI * 2;
      for (let j = 0; j < k; j++) {
        const a = a0 + (j / k) * Math.PI * 2;
        const x = gx + Math.cos(a) * 0.42;
        const z = gz + Math.sin(a) * 0.42;
        if (clear(x, z, 0.46)) add(x, z, gx, gz);
      }
    }
  }

  if (setup === "boardroom") {
    const seats = Math.min(cap, 24);
    const perSide = Math.ceil((seats - 2) / 2);
    const len = Math.max(1.4, perSide * 0.78);
    L.longs.push([0, 0, len]);
    let n = 0;
    for (let i = 0; i < perSide; i++) {
      const x = -len / 2 + 0.39 + i * 0.78;
      if (n++ < seats) L.chairs.push([x, -0.72, Math.PI]);
      if (n++ < seats) L.chairs.push([x, 0.72, 0]);
    }
    if (seats > 4) {
      L.chairs.push([-len / 2 - 0.55, 0, -Math.PI / 2]);
      L.chairs.push([len / 2 + 0.55, 0, Math.PI / 2]);
    }
  }

  if (setup === "lounge") {
    L.bar = true;
    // Two three-seat sofas facing over a coffee table; neighbours alternate orientation.
    const groups = spread(Math.ceil(cap / 6), offBar, 5);
    groups.forEach(([x, z], g) => {
      const t = (g + Math.round((z - room.z0) / 3)) % 2 ? Math.PI / 2 : 0;
      L.rounds.push([x, z, 0.55]);
      for (const s of [-1, 1]) {
        const ox = s * 1.05 * Math.sin(t);
        const oz = s * 1.05 * Math.cos(t);
        L.sofas.push([x + ox, z + oz, s < 0 ? t : t + Math.PI]);
      }
    });
  }

  // Round so server and browser math agree to the digit (avoids hydration drift)
  const r = (ps: P[]) => ps.map(([a, b, c]) => [Math.round(a * 1000) / 1000, Math.round(b * 1000) / 1000, Math.round(c * 1000) / 1000] as P);
  return { ...L, chairs: r(L.chairs), rounds: r(L.rounds), longs: r(L.longs), highs: r(L.highs), people: r(L.people), sofas: r(L.sofas) };
}
