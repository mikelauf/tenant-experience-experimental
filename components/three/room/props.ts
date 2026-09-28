import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { PropKind } from "@/lib/data/types";
import { chairGeometry } from "../setup/furniture";

/**
 * The kit a floor is furnished with, in meters. Each stands on y = 0 and faces local −z (the north windows when
 * unturned). Parts carry their own colors, so a whole treadmill or banquette draws as one instanced mesh.
 * Kinds that come in runs (counters, banquettes, lockers…) are one meter long and stretched along x.
 */

const C = {
  frame: "#2b2e32",
  black: "#1c1d20",
  belt: "#3c3f44",
  steel: "#a3a8ad",
  screen: "#5d7383",
  pad: "#3a3431",
  plate: "#232427",
  mat: "#8c4f3f",
  mat2: "#5f6d63",
  mirror: "#c9d6dc",
  cedar: "#b9824f",
  cedarDark: "#95633a",
  tile: "#d9d6cf",
  oak: "#a9794b",
  stone: "#e8e3da",
  darkStone: "#3a3634",
  cloth: "#d9cbb6",
  clothDark: "#bfae95",
  leather: "#7a4a30",
  ceramic: "#e9e3d8",
  leaf: "#4f7a4a",
  leaf2: "#6a9160",
  warm: "#c8a178",
};

/** A box centered at (x, y, z) */
const box = (w: number, h: number, d: number, x: number, y: number, z: number) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
/** An upright cylinder centered at (x, y, z) */
const cyl = (r: number, h: number, x: number, y: number, z: number, seg = 16, r2 = r) => new THREE.CylinderGeometry(r, r2, h, seg).translate(x, y, z);
/** A wheel: a cylinder on its side, its axle along x */
const wheel = (r: number, t: number, x: number, y: number, z: number) => new THREE.CylinderGeometry(r, r, t, 20).rotateZ(Math.PI / 2).translate(x, y, z);

/** Paint a part one color, so parts can merge into one mesh */
function paint(geo: THREE.BufferGeometry, color: string) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const c = new THREE.Color(color);
  const n = g.getAttribute("position").count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
  g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  return g;
}

const build = (parts: [THREE.BufferGeometry, string][]) => mergeGeometries(parts.map(([g, c]) => paint(g, c)))!;

function bikeParts(y = 0): [THREE.BufferGeometry, string][] {
  return [
    [box(0.5, 0.05, 0.08, 0, y + 0.025, 0.45), C.frame],
    [box(0.5, 0.05, 0.08, 0, y + 0.025, -0.45), C.frame],
    [box(0.07, 0.07, 0.95, 0, y + 0.08, 0), C.frame],
    [wheel(0.24, 0.06, 0, y + 0.34, -0.3), C.steel],
    [box(0.06, 0.78, 0.06, 0, y + 0.45, 0.2), C.frame],
    [box(0.18, 0.06, 0.28, 0, y + 0.87, 0.24), C.black],
    [box(0.06, 0.85, 0.06, 0, y + 0.48, -0.36), C.frame],
    [box(0.46, 0.04, 0.18, 0, y + 0.92, -0.4), C.black],
    [box(0.16, 0.1, 0.02, 0, y + 1.0, -0.46), C.screen],
  ];
}

const KITS: Record<PropKind, () => THREE.BufferGeometry> = {
  treadmill: () =>
    build([
      [box(0.82, 0.18, 1.95, 0, 0.09, 0.05), C.frame],
      [box(0.56, 0.02, 1.6, 0, 0.19, 0.1), C.belt],
      [box(0.05, 1.12, 0.08, -0.36, 0.74, -0.8), C.frame],
      [box(0.05, 1.12, 0.08, 0.36, 0.74, -0.8), C.frame],
      [box(0.05, 0.05, 0.55, -0.36, 1.05, -0.55), C.steel],
      [box(0.05, 0.05, 0.55, 0.36, 1.05, -0.55), C.steel],
      [box(0.78, 0.08, 0.32, 0, 1.3, -0.84).rotateX(0), C.black],
      [box(0.4, 0.26, 0.03, 0, 1.44, -0.92), C.screen],
    ]),
  bike: () => build(bikeParts()),
  rower: () =>
    build([
      [box(0.12, 0.1, 2.3, 0, 0.3, 0.1), C.steel],
      [box(0.5, 0.05, 0.08, 0, 0.025, 1.15), C.frame],
      [box(0.08, 0.3, 0.08, 0, 0.15, 1.15), C.frame],
      [wheel(0.3, 0.2, 0, 0.36, -0.95), C.black],
      [box(0.46, 0.18, 0.12, 0, 0.3, -0.7), C.frame],
      [box(0.3, 0.07, 0.36, 0, 0.4, 0.35), C.black],
      [box(0.06, 0.4, 0.04, 0, 0.62, -0.9), C.frame],
      [box(0.14, 0.1, 0.02, 0, 0.84, -0.9), C.screen],
    ]),
  rack: () =>
    build([
      ...[-0.6, 0.6].flatMap((x) =>
        [-0.6, 0.6].map((z) => [box(0.08, 2.3, 0.08, x, 1.15, z), C.frame] as [THREE.BufferGeometry, string]),
      ),
      [box(1.28, 0.08, 0.08, 0, 2.26, -0.6), C.frame],
      [box(1.28, 0.08, 0.08, 0, 2.26, 0.6), C.frame],
      [box(0.08, 0.08, 1.28, -0.6, 2.26, 0), C.frame],
      [box(0.08, 0.08, 1.28, 0.6, 2.26, 0), C.frame],
      [box(1.5, 0.02, 1.5, 0, 0.01, 0), C.oak],
      [wheel(0.025, 2.2, 0, 1.4, -0.5).rotateZ(0), C.steel],
      [wheel(0.22, 0.06, -0.85, 1.4, -0.5), C.plate],
      [wheel(0.22, 0.06, 0.85, 1.4, -0.5), C.plate],
      [wheel(0.18, 0.05, -0.93, 1.4, -0.5), C.plate],
      [wheel(0.18, 0.05, 0.93, 1.4, -0.5), C.plate],
    ]),
  bench: () =>
    build([
      [box(0.3, 0.09, 1.2, 0, 0.45, 0), C.pad],
      [box(0.08, 0.4, 0.08, 0, 0.2, 0.45), C.frame],
      [box(0.08, 0.4, 0.08, 0, 0.2, -0.45), C.frame],
      [box(0.4, 0.04, 0.08, 0, 0.02, 0.45), C.frame],
      [box(0.4, 0.04, 0.08, 0, 0.02, -0.45), C.frame],
    ]),
  dumbbells: () => {
    const bells: [THREE.BufferGeometry, string][] = [];
    for (const [y, z] of [
      [0.58, 0.12],
      [0.84, -0.1],
    ] as const)
      for (let i = 0; i < 9; i++) {
        const x = -0.96 + i * 0.24;
        const r = 0.05 + i * 0.006;
        bells.push([wheel(r, 0.05, x - 0.08, y + r, z), C.black], [wheel(r, 0.05, x + 0.08, y + r, z), C.black], [wheel(0.015, 0.14, x, y + r, z), C.steel]);
      }
    return build([
      [box(2.2, 0.05, 0.32, 0, 0.55, 0.12), C.frame],
      [box(2.2, 0.05, 0.32, 0, 0.81, -0.1), C.frame],
      [box(0.06, 0.8, 0.5, -1.07, 0.4, 0), C.frame],
      [box(0.06, 0.8, 0.5, 1.07, 0.4, 0), C.frame],
      ...bells,
    ]);
  },
  // Mats lie on the studio's wood floor, which stands a couple of centimeters proud of the rubber
  mat: () => build([[box(0.62, 0.012, 1.85, 0, 0.028, 0), C.mat]]),
  mirror: () =>
    build([
      [box(1, 2.1, 0.03, 0, 1.15, 0), C.mirror],
      [box(1, 0.08, 0.05, 0, 0.06, 0), C.frame],
    ]),
  podium: () => build([[box(2, 0.4, 1.6, 0, 0.2, 0), C.warm], ...bikeParts(0.4)]),
  sauna: () =>
    build([
      [box(1, 0.45, 0.5, 0, 0.225, -0.3), C.cedar],
      [box(1, 0.9, 0.55, 0, 0.45, 0.25), C.cedar],
      [box(1, 0.04, 0.5, 0, 0.47, -0.3), C.cedarDark],
      [box(1, 0.04, 0.55, 0, 0.92, 0.25), C.cedarDark],
      [box(1, 0.35, 0.05, 0, 1.15, 0.5), C.cedarDark],
    ]),
  steam: () =>
    build([
      [box(1, 0.45, 0.5, 0, 0.225, 0), C.tile],
      [box(1, 0.4, 0.06, 0, 0.65, 0.24), C.stone],
    ]),
  locker: () =>
    build([
      [box(1, 1.95, 0.5, 0, 0.975, 0), C.warm],
      ...[-0.33, 0, 0.33].map((x) => [box(0.01, 1.85, 0.02, x, 1, -0.255), C.cedarDark] as [THREE.BufferGeometry, string]),
      [box(1, 0.02, 0.02, 0, 1.0, -0.255), C.cedarDark],
    ]),
  counter: () =>
    build([
      [box(1, 1.0, 0.7, 0, 0.5, 0), C.oak],
      [box(1.02, 0.05, 0.8, 0, 1.03, -0.02), C.stone],
      [box(1, 0.06, 0.06, 0, 0.25, -0.38), C.steel],
    ]),
  espresso: () =>
    build([
      [box(0.75, 0.4, 0.5, 0, 1.26, 0.05), C.steel],
      [box(0.75, 0.04, 0.5, 0, 1.48, 0.05), C.black],
      [box(0.7, 0.04, 0.2, 0, 1.08, -0.15), C.black],
      [cyl(0.03, 0.08, -0.18, 1.12, -0.18), C.black],
      [cyl(0.03, 0.08, 0.18, 1.12, -0.18), C.black],
      [cyl(0.07, 0.22, 0.46, 1.17, 0.05), C.black],
    ]),
  stool: () =>
    build([
      [cyl(0.19, 0.06, 0, 0.74, 0), C.leather],
      [cyl(0.025, 0.7, 0, 0.36, 0, 8), C.steel],
      [cyl(0.18, 0.02, 0, 0.01, 0), C.steel],
      [new THREE.TorusGeometry(0.16, 0.012, 6, 20).rotateX(Math.PI / 2).translate(0, 0.3, 0), C.steel],
    ]),
  banquette: () =>
    build([
      [box(1, 0.4, 0.8, 0, 0.2, 0.02), C.clothDark],
      [box(1, 0.1, 0.62, 0, 0.45, -0.04), C.cloth],
      [box(1, 0.55, 0.22, 0, 0.62, 0.32), C.cloth],
    ]),
  armchair: () =>
    build([
      [box(0.78, 0.38, 0.78, 0, 0.19, 0), C.clothDark],
      [box(0.6, 0.1, 0.6, 0, 0.43, -0.04), C.cloth],
      [box(0.78, 0.42, 0.14, 0, 0.59, 0.32), C.cloth],
      [box(0.12, 0.24, 0.7, -0.33, 0.5, 0), C.cloth],
      [box(0.12, 0.24, 0.7, 0.33, 0.5, 0), C.cloth],
    ]),
  "cafe-table": () =>
    build([
      [cyl(0.36, 0.03, 0, 0.74, 0, 28), C.stone],
      [cyl(0.03, 0.72, 0, 0.36, 0, 8), C.black],
      [cyl(0.22, 0.02, 0, 0.01, 0, 20), C.black],
    ]),
  desk: () =>
    build([
      [box(1, 0.04, 0.9, 0, 0.72, 0), C.oak],
      [box(0.9, 0.7, 0.05, 0, 0.35, 0), C.black],
      [box(0.04, 0.12, 0.3, -0.25, 0.8, 0), C.black],
      [box(0.04, 0.12, 0.3, 0.25, 0.8, 0), C.black],
    ]),
  chair: () => build([[chairGeometry(), C.frame]]),
  plant: () =>
    build([
      [cyl(0.2, 0.45, 0, 0.225, 0, 16, 0.16), C.ceramic],
      [new THREE.IcosahedronGeometry(0.34, 0).translate(0, 0.8, 0), C.leaf],
      [new THREE.IcosahedronGeometry(0.28, 0).translate(0.12, 1.12, 0.06), C.leaf2],
      [new THREE.IcosahedronGeometry(0.22, 0).translate(-0.1, 1.38, -0.05), C.leaf],
    ]),
};

/** Kinds that are one meter long and stretched to the piece's `len` */
export const STRETCH = new Set<PropKind>(["mirror", "sauna", "steam", "locker", "counter", "banquette", "desk"]);

/** Surfaces that should shine a little (the mirror wall, stone and steel) get less roughness */
export const ROUGH: Partial<Record<PropKind, number>> = { mirror: 0.15, espresso: 0.3, "cafe-table": 0.4, dumbbells: 0.45 };

export function propGeometry(kind: PropKind) {
  return KITS[kind]();
}
