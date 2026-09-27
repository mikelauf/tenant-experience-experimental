import type { Rect, Setup, SetupSpec, Shell } from "../../../lib/data/types.ts";

/** x, z, rotationY. Units are meters, on the shell's own origin (−z is Washington Street). */
export type P = [number, number, number];

export type Layout = {
  chairs: P[];
  rounds: P[];
  longs: P[]; // rot used as length; long tables always run east–west
  highs: P[];
  people: P[];
  sofas: P[];
  /** Whether the setup brings out the shell's bars and stage (`always` ones show regardless) */
  bar: boolean;
  stage: boolean;
  /** Guests each standing figure stands for, so a 1,500-guest park stays drawable */
  per: number;
};

/** Most standing figures drawn, so the biggest crowd we sell reads one guest per figure; above this each stands for several. */
export const MAX_FIGURES = 1500;

type Box = { x0: number; x1: number; z0: number; z1: number };
type XZ = [number, number];

const box = (r: Rect): Box => ({ x0: r.x - r.w / 2, x1: r.x + r.w / 2, z0: r.z - r.d / 2, z1: r.z + r.d / 2 });
const areaOf = (b: Box) => (b.x1 - b.x0) * (b.z1 - b.z0);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

let seed = 1;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

/** Rotation that turns a chair (or person) at (x, z) to face (tx, tz). Chairs face local −z. */
const face = (x: number, z: number, tx: number, tz: number) => Math.atan2(x - tx, z - tz);

export function inPoly(x: number, z: number, poly: [number, number][]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * Spreads `n` items evenly over a box: picks the grid whose cells are closest to
 * square with the fewest empty slots, centers a short last row, and caps the pitch
 * at `max` so big plates cluster toward the middle instead of scattering.
 */
function spread(n: number, b: Box, max: number): XZ[] {
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
  const out: XZ[] = [];
  for (let r = 0; r < rows; r++) {
    const inRow = Math.min(cols, n - r * cols);
    for (let c = 0; c < inRow; c++) out.push([cx + (c - (inRow - 1) / 2) * sx, cz + (r - (rows - 1) / 2) * sz]);
  }
  return out;
}

/** Shares `n` between boxes by area (largest remainder), then spreads each share. */
function spreadAll(n: number, boxes: Box[], max: number): XZ[] {
  const total = boxes.reduce((a, b) => a + areaOf(b), 0);
  const raw = boxes.map((b) => (n * areaOf(b)) / total);
  const k = raw.map(Math.floor);
  const order = raw.map((r, i) => [r - Math.floor(r), i]).sort((a, b) => b[0] - a[0]);
  for (let i = 0; i < n - k.reduce((a, b) => a + b, 0); i++) k[order[i][1]]++;
  return boxes.flatMap((b, i) => spread(k[i], b, max));
}

/**
 * `n` evenly spread spots that stay clear of anything in the room. Spreads a few extra when some
 * land on a core or a tree, then keeps an even subset so the pattern stays balanced.
 */
function place(n: number, boxes: Box[], max: number, r: number, blocked: (x: number, z: number, r: number) => boolean): XZ[] {
  if (n <= 0) return [];
  let got: XZ[] = [];
  for (let extra = 0; extra <= n * 2 + 8; extra += Math.max(1, Math.ceil(n / 8))) {
    got = spreadAll(n + extra, boxes, max).filter(([x, z]) => !blocked(x, z, r));
    if (got.length >= n) return Array.from({ length: n }, (_, i) => got[Math.floor((i * got.length) / n)]);
  }
  return got;
}

/** Guests per standing figure for a crowd of `n`. */
export const perFigure = (n: number) => (n > MAX_FIGURES ? Math.ceil(n / MAX_FIGURES) : 1);

export function makeLayout(setup: Setup, guests: number, shell: Shell, spec: SetupSpec): Layout {
  seed = 7;
  const L: Layout = { chairs: [], rounds: [], longs: [], highs: [], people: [], sofas: [], bar: false, stage: false, per: 1 };
  const zones = (shell.zones[spec.zone] ?? []).map(box);
  if (!zones.length || guests <= 0) return L;
  const f = shell.fixed ?? {};

  L.bar = setup === "reception" || setup === "lounge";
  L.stage = !!f.stage && (!!f.stage.always || setup === "theater" || setup === "classroom" || setup === "concert");
  const bars = (f.bars ?? []).filter((b) => b.always || L.bar).map(box);

  const obstacles: Box[] = [
    ...shell.solids,
    ...(shell.rooms ?? []).filter((r) => !zones.some((z) => inBox(r.x, r.z, z))),
    ...(shell.context ?? []),
    ...(f.marks ?? []),
    ...(L.stage && f.stage ? [f.stage] : []),
  ].map(box);
  obstacles.push(...bars);
  const trees = f.trees ?? [];

  /** True where nothing can go: outside the floor, on a core, a bar, a mark, or a tree trunk. */
  const blocked = (x: number, z: number, r: number) =>
    !inPoly(x, z, shell.outline) ||
    obstacles.some((b) => x > b.x0 - r && x < b.x1 + r && z > b.z0 - r && z < b.z1 + r) ||
    trees.some(([tx, tz]) => (tx - x) ** 2 + (tz - z) ** 2 < (0.7 + r) ** 2);

  if (setup === "theater" || setup === "classroom") rows(setup, guests, zones[0], shell, L);
  if (setup === "banquet") banquet(guests, zones, blocked, L);
  if (setup === "reception") reception(guests, zones, bars, blocked, L);
  if (setup === "concert") concert(guests, zones[0], shell, blocked, L);
  if (setup === "boardroom") boardroom(guests, zones[0], L);
  if (setup === "lounge") lounge(guests, zones, blocked, L);

  // Round so server and browser math agree to the digit (avoids hydration drift)
  const r = (ps: P[]) => ps.map(([a, b, c]) => [Math.round(a * 1000) / 1000, Math.round(b * 1000) / 1000, Math.round(c * 1000) / 1000] as P);
  return { ...L, chairs: r(L.chairs), rounds: r(L.rounds), longs: r(L.longs), highs: r(L.highs), people: r(L.people), sofas: r(L.sofas) };
}

function inBox(x: number, z: number, b: Box) {
  return x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1;
}

/**
 * What an audience faces: the screen or LED wall if there is one, else the stage. Returns its center,
 * its width, and the box trimmed so the front row keeps a clear gap in front of it.
 */
function focusOf(shell: Shell, b: Box) {
  const f = shell.fixed ?? {};
  const cx = (b.x0 + b.x1) / 2;
  const cz = (b.z0 + b.z1) / 2;
  let fx: number, fz: number, len: number, near: Box, gap: number;
  if (f.screen) {
    const [x0, z0, x1, z1] = f.screen;
    [fx, fz, len] = [(x0 + x1) / 2, (z0 + z1) / 2, Math.hypot(x1 - x0, z1 - z0)];
    near = { x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1) };
    gap = 1.2;
  } else if (f.stage) {
    near = box(f.stage);
    [fx, fz, len] = [f.stage.x, f.stage.z, Math.max(f.stage.w, f.stage.d)];
    gap = 1.6;
  } else {
    // Nothing to face: face the north wall.
    [fx, fz, len, near, gap] = [cx, b.z0 - 1, b.x1 - b.x0, { x0: b.x0, x1: b.x1, z0: b.z0 - 1, z1: b.z0 - 1 }, 0];
  }
  const dir = Math.abs(fz - cz) >= Math.abs(fx - cx) ? (fz < cz ? "n" : "s") : fx < cx ? "w" : "e";
  const t = { ...b };
  if (dir === "n") t.z0 = Math.max(t.z0, near.z1 + gap);
  if (dir === "s") t.z1 = Math.min(t.z1, near.z0 - gap);
  if (dir === "w") t.x0 = Math.max(t.x0, near.x1 + gap);
  if (dir === "e") t.x1 = Math.min(t.x1, near.x0 - gap);
  return { fx, fz, len, dir, b: t };
}

/** Maps a spot in the audience's own frame (u across, v back from the front row) into the room. */
function frame(dir: string, b: Box) {
  const cx = (b.x0 + b.x1) / 2;
  const cz = (b.z0 + b.z1) / 2;
  const ns = dir === "n" || dir === "s";
  const across = ns ? b.x1 - b.x0 : b.z1 - b.z0;
  const depth = ns ? b.z1 - b.z0 : b.x1 - b.x0;
  const at = (u: number, v: number): XZ =>
    dir === "n" ? [cx + u, b.z0 + v] : dir === "s" ? [cx - u, b.z1 - v] : dir === "e" ? [b.x1 - v, cz + u] : [b.x0 + v, cz - u];
  return { across, depth, at };
}

/** Theater (a chair per slot, rows curving toward the front) or classroom (a 1.6 m table seating two per slot). */
function rows(setup: "theater" | "classroom", cap: number, zone: Box, shell: Shell, L: Layout) {
  const { fx, fz, len, dir, b } = focusOf(shell, zone);
  const { across, depth: full, at } = frame(dir, b);
  const bowRoom = setup === "theater" ? 0.9 : 0;
  const depth = full - bowRoom;
  const blockW = Math.min(across, Math.max(len, 3) * 2.6);
  const aisle = 1.4;

  const seatsPer = setup === "theater" ? 1 : 2;
  const slots = Math.ceil(cap / seatsPer);
  const [minX, maxX, minZ, maxZ, ratio] = setup === "theater" ? [0.58, 0.95, 0.92, 1.4, 1.35] : [1.85, 2.5, 1.5, 2.3, 0.9];
  let best = { per: Math.min(slots, Math.max(1, Math.floor(blockW / minX))), sx: minX, sz: minZ, score: Infinity };
  for (let per = 2; per <= slots; per++) {
    const nRows = Math.ceil(slots / per);
    const sx = (blockW - (per >= 6 ? aisle : 0)) / per;
    const sz = depth / nRows;
    if (sx < minX || sz < minZ) continue;
    const cx = Math.min(sx, maxX);
    const cz = Math.min(sz, maxZ);
    const score = Math.abs(Math.log(cz / cx / ratio)) + (0.2 * (per * nRows - slots)) / per;
    if (score < best.score) best = { per, sx: cx, sz: cz, score };
  }
  const { per, sx, sz } = best;
  const gap = per >= 6 ? aisle : 0;
  const half = Math.ceil(per / 2);
  const bw = per * sx + gap;
  const bow = setup === "theater" ? bowRoom / (bw / 2) ** 2 : 0;
  let n = 0;
  for (let r = 0; n < cap; r++) {
    const inRow = Math.min(per, slots - r * per);
    const v = sz / 2 + r * sz;
    for (let c = 0; c < inRow && n < cap; c++) {
      const col = c + (per - inRow) / 2; // center a short back row
      const u = -bw / 2 + sx / 2 + col * sx + (col >= half - 0.01 && gap ? gap : 0);
      if (setup === "theater") {
        const [x, z] = at(u, v + bow * u * u);
        L.chairs.push([x, z, face(x, z, fx, fz)]);
        n++;
      } else {
        const [x, z] = at(u, v);
        L.longs.push([x, z, 1.6]);
        for (const du of [-0.4, 0.4]) {
          if (n >= cap) break;
          const [cx, cz] = at(u + du, v + 0.6);
          L.chairs.push([cx, cz, face(cx, cz, fx, fz)]);
          n++;
        }
      }
    }
  }
}

/** Rounds of eight, spread across the zone and clear of cores, bars and trees. */
function banquet(cap: number, zones: Box[], blocked: (x: number, z: number, r: number) => boolean, L: Layout) {
  let n = 0;
  for (const [x, z] of place(Math.ceil(cap / 8), zones, 4.8, 1.55, blocked)) {
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

/** High-tops with a few guests each, a loose line at every bar, and small circles mingling everywhere else. */
function reception(guests: number, zones: Box[], bars: Box[], blocked: (x: number, z: number, r: number) => boolean, L: Layout) {
  L.per = perFigure(guests);
  const cap = Math.ceil(guests / L.per);
  const placed: XZ[] = [];
  const inZone = (x: number, z: number) => zones.some((b) => inBox(x, z, b));
  const nearBar = (x: number, z: number, r: number) => bars.some((b) => x > b.x0 - r && x < b.x1 + r && z > b.z0 - r && z < b.z1 + r);
  const clear = (x: number, z: number, r: number) =>
    inZone(x, z) && !blocked(x, z, 0.25) && !nearBar(x, z, 1.4) && placed.every(([px, pz]) => (px - x) ** 2 + (pz - z) ** 2 > r * r);
  const add = (x: number, z: number, tx: number, tz: number) => {
    placed.push([x, z]);
    L.people.push([x, z, face(x, z, tx, tz)]);
  };

  const highs = place(clamp(Math.round(cap / 11), 3, 28), zones, 4.2, 1.3, blocked).map(
    ([x, z]) => [x + (rnd() - 0.5) * 0.6, z + (rnd() - 0.5) * 0.6] as XZ,
  );
  highs.forEach(([x, z]) => L.highs.push([x, z, 0]));
  const nearHigh = (x: number, z: number) => highs.some(([hx, hz]) => (hx - x) ** 2 + (hz - z) ** 2 < 0.7 ** 2);

  // A loose line along the long side of each bar that faces the room
  const perBar = bars.length ? Math.round((cap * 0.08) / bars.length) : 0;
  for (const b of bars) {
    const long = b.x1 - b.x0 >= b.z1 - b.z0;
    const len = long ? b.x1 - b.x0 : b.z1 - b.z0;
    const cx = (b.x0 + b.x1) / 2;
    const cz = (b.z0 + b.z1) / 2;
    const k = Math.min(perBar, Math.floor(len / 0.7));
    for (let i = 0; i < k && L.people.length < cap; i++) {
      const t = -len / 2 + 0.35 + i * 0.7 + (rnd() - 0.5) * 0.15;
      const [x, z] = long ? [cx + t, cz <= 0 ? b.z1 + 0.5 : b.z0 - 0.5] : [cx <= 0 ? b.x1 + 0.5 : b.x0 - 0.5, cz + t];
      if (blocked(x, z, 0.15)) continue;
      add(x, z, long ? x : cx, long ? cz : z);
    }
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
  // Everyone else mingles in small circles; a tight room loosens the spacing until everyone fits
  const total = zones.reduce((a, b) => a + areaOf(b), 0);
  const pick = () => {
    let t = rnd() * total;
    for (const b of zones) if ((t -= areaOf(b)) <= 0) return b;
    return zones[zones.length - 1];
  };
  for (const [gap, ring, own] of [
    [1.05, 0.42, 0.46],
    [0.8, 0.38, 0.4],
    [0.4, 0, 0.36],
  ]) {
    for (let tries = 0; L.people.length < cap && tries < 3000; tries++) {
      const b = pick();
      const gx = b.x0 + rnd() * (b.x1 - b.x0);
      const gz = b.z0 + rnd() * (b.z1 - b.z0);
      if (!clear(gx, gz, gap) || nearHigh(gx, gz)) continue;
      const k = ring ? Math.min(2 + Math.floor(rnd() * 3), cap - L.people.length) : 1;
      const a0 = rnd() * Math.PI * 2;
      for (let j = 0; j < k; j++) {
        const a = a0 + (j / k) * Math.PI * 2;
        const x = gx + Math.cos(a) * ring;
        const z = gz + Math.sin(a) * ring;
        if (clear(x, z, own)) add(x, z, ring ? gx : x + Math.cos(a0), ring ? gz : z + Math.sin(a0));
      }
    }
  }
}

/** A standing crowd facing the stage, loosely packed. */
function concert(guests: number, zone: Box, shell: Shell, blocked: (x: number, z: number, r: number) => boolean, L: Layout) {
  L.per = perFigure(guests);
  const cap = Math.ceil(guests / L.per);
  const { fx, fz, b } = focusOf(shell, zone);
  for (const [x0, z0] of place(cap, [b], 1.6, 0.2, blocked)) {
    const x = x0 + (rnd() - 0.5) * 0.35;
    const z = z0 + (rnd() - 0.5) * 0.35;
    L.people.push([x, z, face(x, z, fx, fz)]);
  }
}

/**
 * One long table, as long as the room allows, with a chair at each end. Guests past what the table
 * seats take a row along the back wall, as the building's own boardroom plans show.
 */
function boardroom(cap: number, b: Box, L: Layout) {
  const bw = b.x1 - b.x0;
  const maxPer = Math.max(2, Math.floor((bw - 1.9) / 0.78));
  const atTable = Math.min(cap, maxPer * 2 + 2);
  const ends = atTable > 4;
  const perSide = Math.ceil((atTable - (ends ? 2 : 0)) / 2);
  const len = Math.max(1.4, perSide * 0.78);
  const extra = cap - atTable;
  const cz = (b.z0 + b.z1) / 2 - (extra > 0 ? 0.6 : 0);
  L.longs.push([(b.x0 + b.x1) / 2, cz, len]);
  const cx = (b.x0 + b.x1) / 2;
  let n = 0;
  for (let i = 0; i < perSide; i++) {
    const x = cx - len / 2 + 0.39 + i * 0.78;
    if (n++ < atTable - (ends ? 2 : 0)) L.chairs.push([x, cz - 0.72, Math.PI]);
    if (n++ < atTable - (ends ? 2 : 0)) L.chairs.push([x, cz + 0.72, 0]);
  }
  if (ends) {
    L.chairs.push([cx - len / 2 - 0.55, cz, -Math.PI / 2]);
    L.chairs.push([cx + len / 2 + 0.55, cz, Math.PI / 2]);
  }
  // The rest line the back wall facing the table, then the front wall
  const perRow = Math.max(1, Math.floor((bw - 0.4) / 0.6));
  for (let k = 0; k < extra; k++) {
    const row = Math.floor(k / perRow);
    const inRow = Math.min(perRow, extra - row * perRow);
    const col = k % perRow;
    const x = cx + (col - (inRow - 1) / 2) * 0.6;
    L.chairs.push(row % 2 === 0 ? [x, b.z1 - 0.35 - Math.floor(row / 2) * 0.6, 0] : [x, b.z0 + 0.35 + Math.floor(row / 2) * 0.6, Math.PI]);
  }
}

/** Two three-seat sofas facing over a coffee table; neighbours alternate orientation. */
function lounge(cap: number, zones: Box[], blocked: (x: number, z: number, r: number) => boolean, L: Layout) {
  const z0 = Math.min(...zones.map((b) => b.z0));
  place(Math.ceil(cap / 6), zones, 5, 1.45, blocked).forEach(([x, z], g) => {
    const t = (g + Math.round((z - z0) / 3)) % 2 ? Math.PI / 2 : 0;
    L.rounds.push([x, z, 0.55]);
    for (const s of [-1, 1]) {
      const ox = s * 1.05 * Math.sin(t);
      const oz = s * 1.05 * Math.cos(t);
      L.sofas.push([x + ox, z + oz, s < 0 ? t : t + Math.PI]);
    }
  });
}
