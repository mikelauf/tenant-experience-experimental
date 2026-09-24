import type { Setup } from "@/lib/data/types";

/** x, z, rotationY */
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

export function makeLayout(setup: Setup, cap: number, w: number, d: number): Layout {
  seed = 7;
  const L = empty();
  const x0 = -w / 2 + 0.8;
  const x1 = w / 2 - 0.8;
  const z0 = -d / 2 + 0.8;
  const z1 = d / 2 - 0.8;

  if (setup === "theater") {
    L.stage = true;
    const aisle = w > 8 ? 1.2 : 0;
    let n = 0;
    for (let z = z0 + 2.2; z < z1 && n < cap; z += 0.95) {
      for (let x = x0 + 0.3; x < x1 && n < cap; x += 0.62) {
        if (aisle && Math.abs(x) < aisle / 2) continue;
        L.chairs.push([x, z, Math.PI]);
        n++;
      }
    }
  }

  if (setup === "classroom") {
    L.stage = true;
    let n = 0;
    for (let z = z0 + 2.4; z < z1 - 0.3 && n < cap; z += 1.7) {
      for (let x = x0 + 0.9; x < x1 - 0.5 && n < cap; x += 1.95) {
        L.longs.push([x, z, 1.6]);
        for (const dx of [-0.38, 0.38]) {
          if (n >= cap) break;
          L.chairs.push([x + dx, z + 0.62, Math.PI]);
          n++;
        }
      }
    }
  }

  if (setup === "banquet") {
    const tables = Math.ceil(cap / 8);
    let t = 0;
    const step = 3;
    const cols = Math.max(1, Math.floor((x1 - x0) / step));
    const rows = Math.max(1, Math.floor((z1 - z0) / step));
    const ox = -((cols - 1) * step) / 2;
    const oz = -((rows - 1) * step) / 2;
    let n = 0;
    for (let r = 0; r < rows && t < tables; r++) {
      for (let c = 0; c < cols && t < tables; c++) {
        const x = ox + c * step + (r % 2 ? 0.5 : 0) * (cols > 2 ? 1 : 0);
        const z = oz + r * step;
        L.rounds.push([x, z, 0]);
        for (let k = 0; k < 8 && n < cap; k++) {
          const a = (k / 8) * Math.PI * 2;
          L.chairs.push([x + Math.cos(a) * 1.05, z + Math.sin(a) * 1.05, -a + Math.PI / 2]);
          n++;
        }
        t++;
      }
    }
  }

  if (setup === "reception") {
    L.bar = true;
    const step = 3.1;
    const cols = Math.max(1, Math.floor((x1 - x0) / step));
    const rows = Math.max(1, Math.floor((z1 - z0 - 1) / step));
    const ox = -((cols - 1) * step) / 2;
    const oz = -((rows - 1) * step) / 2 + 0.5;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) L.highs.push([ox + c * step + (rnd() - 0.5) * 0.6, oz + r * step + (rnd() - 0.5) * 0.6, 0]);
    // Guests cluster around the high-tops and drift in between
    for (let i = 0; i < cap; i++) {
      const h = L.highs[i % L.highs.length];
      const a = rnd() * Math.PI * 2;
      const r = i < L.highs.length * 5 ? 0.55 + rnd() * 0.35 : 1.1 + rnd() * 0.9;
      const x = Math.max(x0, Math.min(x1, h[0] + Math.cos(a) * r));
      const z = Math.max(z0 + 0.8, Math.min(z1, h[1] + Math.sin(a) * r));
      L.people.push([x, z, 0]);
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
      if (n++ < seats) L.chairs.push([x, -0.72, 0]);
      if (n++ < seats) L.chairs.push([x, 0.72, Math.PI]);
    }
    if (seats > 4) {
      L.chairs.push([-len / 2 - 0.55, 0, Math.PI / 2]);
      L.chairs.push([len / 2 + 0.55, 0, -Math.PI / 2]);
    }
  }

  if (setup === "lounge") {
    L.bar = true;
    const groups = Math.ceil(cap / 6);
    const step = 3.6;
    const cols = Math.max(1, Math.floor((x1 - x0) / step));
    const ox = -((cols - 1) * step) / 2;
    for (let g = 0; g < groups; g++) {
      const c = g % cols;
      const r = Math.floor(g / cols);
      const x = ox + c * step;
      const z = -d / 2 + 2.8 + r * 3.2;
      if (z > z1) break;
      L.rounds.push([x, z, 0.5]);
      L.sofas.push([x, z - 1.05, 0]);
      L.sofas.push([x, z + 1.05, Math.PI]);
    }
  }

  // Round so server and browser math agree to the digit (avoids hydration drift)
  const r = (ps: P[]) => ps.map(([a, b, c]) => [Math.round(a * 1000) / 1000, Math.round(b * 1000) / 1000, Math.round(c * 1000) / 1000] as P);
  return { ...L, chairs: r(L.chairs), rounds: r(L.rounds), longs: r(L.longs), highs: r(L.highs), people: r(L.people), sofas: r(L.sofas) };
}
