"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { BRIDGE_HALF } from "@/lib/tower";
import type { Env } from "./env";
import { CONE, type Item, Lamps, type LandmarkMats, Many, type V3, hillGeometry, hillTrees, tube, useGlow } from "./landmark-kit";

/** The Bay Bridge and the Golden Gate: towers, catenary cables and hangers, lit at night. */

const GG_RED = "#b5432f";

/** A cable hanging between two points (in a bridge's local y/z plane), sagging `dip` below the straight line at mid-span */
function hang(z0: number, y0: number, z1: number, y1: number, dip: number, x: number, n = 18) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    return new THREE.Vector3(x, y0 + (y1 - y0) * t - 4 * dip * t * (1 - t), z0 + (z1 - z0) * t);
  });
}
const cableY = (z0: number, y0: number, z1: number, y1: number, dip: number, z: number) => {
  const t = (z - z0) / (z1 - z0);
  return y0 + (y1 - y0) * t - 4 * dip * t * (1 - t);
};
/** A span of a suspension bridge: tower top to tower top (or anchor), with vertical hangers down to the deck */
type Span = { z0: number; y0: number; z1: number; y1: number; dip: number };
function spanCables(spans: Span[], xs: number[], r: number) {
  return xs.flatMap((x) => spans.map((s) => tube(hang(s.z0, s.y0, s.z1, s.y1, s.dip, x), r)));
}
export function hangers(spans: Span[], x: number, deck: number, step: number, w = 0.014): Item[] {
  return spans.flatMap((s) => {
    const out: Item[] = [];
    const [a, b] = s.z0 < s.z1 ? [s.z0, s.z1] : [s.z1, s.z0];
    for (let z = a + step; z < b - step / 2; z += step) {
      const top = cableY(s.z0, s.y0, s.z1, s.y1, s.dip, z);
      if (top - deck < 0.08) continue;
      out.push({ p: [x, (top + deck) / 2, z], s: [w, top - deck, w] });
    }
    return out;
  });
}

const BB_TOWERS = [8.2, 2.6, -2.6, -8.2];
const SAS_BEACONS: Item[] = [-1, 1].map((x) => ({ p: [x * 0.07, 5.25, -19], s: [0.05, 0.05, 0.05] }));

export function BayBridge({ m, env }: { m: LandmarkMats; env: Env }) {
  const H = 4.6;
  const deck = 1.2;
  const half = BRIDGE_HALF["bay-bridge"];
  const steel = useMemo(() => new THREE.MeshStandardMaterial({ color: "#a3acb3", roughness: 0.55, metalness: 0.35 }), []);
  const white = useGlow("#e8e8e4", "#ffffff", 0.18, env);
  const spans: Span[] = useMemo(
    () => [
      { z0: half, y0: 1.7, z1: 8.2, y1: H - 0.05, dip: 0.2 },
      { z0: 8.2, y0: H - 0.05, z1: 2.6, y1: H - 0.05, dip: H - 0.05 - (deck + 0.25) },
      { z0: 2.6, y0: H - 0.05, z1: 0, y1: 2.2, dip: 0.2 },
      { z0: 0, y0: 2.2, z1: -2.6, y1: H - 0.05, dip: 0.2 },
      { z0: -2.6, y0: H - 0.05, z1: -8.2, y1: H - 0.05, dip: H - 0.05 - (deck + 0.25) },
      { z0: -8.2, y0: H - 0.05, z1: -half, y1: 1.7, dip: 0.2 },
    ],
    [half],
  );
  const cables = useMemo(() => spanCables(spans, [-0.3, 0.3], 0.03), [spans]);
  const plainHangers = useMemo(() => hangers(spans, -0.3, deck, 0.22), [spans]);
  // The Bay Lights hang on the north side: here, the one facing the city's waterfront
  const lightHangers = useMemo(() => hangers(spans, 0.3, deck, 0.22, 0.02), [spans]);
  const frames = useMemo<Item[]>(() => {
    const out: Item[] = [];
    const levels = [deck + 0.05, 2.3, 3.4, H - 0.05];
    for (const tz of BB_TOWERS) {
      for (const x of [-0.3, 0.3]) out.push({ p: [x, H / 2, tz], s: [0.1, H, 0.14] });
      for (const y of levels) out.push({ p: [0, y, tz], s: [0.6, 0.08, 0.1] });
      for (let i = 0; i < levels.length - 1; i++) {
        const h = levels[i + 1] - levels[i];
        const len = Math.hypot(0.6, h);
        const a = Math.atan2(h, 0.6);
        const y = (levels[i] + levels[i + 1]) / 2;
        out.push({ p: [0, y, tz], s: [len, 0.035, 0.05], r: [0, 0, a] }, { p: [0, y, tz], s: [len, 0.035, 0.05], r: [0, 0, -a] });
      }
    }
    return out;
  }, []);
  const lamps = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (let z = -half; z <= half; z += 0.45) for (const x of [-0.26, 0.26]) out.push({ p: [x, deck + 0.13, z], s: [0.03, 0.03, 0.03] });
    return out;
  }, [half]);
  const island = useMemo(() => hillGeometry(23), []);
  const islandTrees = useMemo(() => hillTrees(5, 34, 3.1, 1.3, 2.3, 0.15), []);
  // The eastern span: one white tower, cables fanning down to either side of the deck
  const sas = useMemo(() => {
    const top = new THREE.Vector3(0, 5.2, -19);
    return [-1, 1].flatMap((side) =>
      [0.9, 1.6, 2.3, 3].map((d) =>
        tube([top.clone().setY(4.8 - d * 0.35), new THREE.Vector3(side * 0.28, deck + 0.05, -19 + d * (side > 0 ? 1 : -1) * 1.1)], 0.018),
      ),
    );
  }, []);
  return (
    <group>
      {/* Double deck: the upper roadway over a truss */}
      <mesh position={[0, deck, 0]} scale={[0.62, 0.12, half * 2]} material={steel} castShadow receiveShadow>
        <boxGeometry />
      </mesh>
      <mesh position={[0, deck - 0.2, 0]} scale={[0.54, 0.22, half * 2]} material={steel}>
        <boxGeometry />
      </mesh>
      <Many material={steel} items={frames} shadow />
      {cables.map((g, i) => (
        <mesh key={i} geometry={g} material={steel} />
      ))}
      <Many material={steel} items={plainHangers} />
      <Lamps items={lightHangers} env={env} color="#f4f7ff" day="#a3acb3" twinkle={1} />
      <Lamps items={lamps} env={env} />
      {/* Anchorages: the city end and the great concrete block mid-bay */}
      <mesh position={[0, 1, half]} scale={[0.9, 2, 1]} material={m.lit} castShadow>
        <boxGeometry />
      </mesh>
      <mesh position={[0, 1.2, 0]} scale={[0.9, 2.4, 1.1]} material={m.lit} castShadow>
        <boxGeometry />
      </mesh>
      {/* Yerba Buena Island, and the tunnel the deck runs into */}
      <group position={[0, 0, -half - 2.6]}>
        <mesh geometry={island} scale={[3.1, 1.3, 2.3]} material={m.tree} castShadow receiveShadow />
        <Many material={m.tree} geometry={CONE} items={islandTrees} shadow />
      </group>
      <mesh position={[0, 0.95, -half - 0.4]} scale={[0.8, 0.9, 0.8]} material={m.stone}>
        <boxGeometry />
      </mesh>
      {/* The eastern span */}
      <mesh position={[0, deck, -19]} scale={[0.66, 0.12, 7.2]} material={white} castShadow>
        <boxGeometry />
      </mesh>
      <mesh position={[0, 2.6, -19]} scale={[0.22, 5.2, 0.3]} material={white} castShadow>
        <boxGeometry />
      </mesh>
      {sas.map((g, i) => (
        <mesh key={i} geometry={g} material={white} />
      ))}
      <Lamps items={SAS_BEACONS} env={env} color="#ff3b30" day="#8a3a33" />
    </group>
  );
}

/* ------------------------------------------------------------------ Golden Gate Bridge */

/* International Orange. Art Deco towers whose legs step in as they rise, tied by portal struts; the main cables sag
   almost to the deck at mid-span and hangers drop every few metres. At night the towers are uplit and red aircraft
   lights sit on top. Local +z runs toward San Francisco. */
export function GoldenGate({ env }: { env: Env }) {
  const H = 6.2;
  const deck = 1.4;
  const half = BRIDGE_HALF["golden-gate"];
  const red = useGlow(GG_RED, GG_RED, 0.22, env);
  const tz = 4.2;
  const spans: Span[] = useMemo(
    () => [
      { z0: half, y0: deck + 0.15, z1: tz, y1: H - 0.1, dip: 0.3 },
      { z0: tz, y0: H - 0.1, z1: -tz, y1: H - 0.1, dip: H - 0.1 - (deck + 0.2) },
      { z0: -tz, y0: H - 0.1, z1: -half, y1: deck + 0.15, dip: 0.3 },
    ],
    [half],
  );
  const cables = useMemo(() => spanCables(spans, [-0.27, 0.27], 0.035), [spans]);
  const drops = useMemo(() => [...hangers(spans, -0.27, deck, 0.2, 0.012), ...hangers(spans, 0.27, deck, 0.2, 0.012)], [spans]);
  const frames = useMemo<Item[]>(() => {
    const out: Item[] = [];
    const steps: [number, number, number][] = [
      [0, 2.7, 0.18],
      [2.7, 4.5, 0.155],
      [4.5, H, 0.13],
    ];
    for (const z of [tz, -tz]) {
      for (const x of [-0.27, 0.27]) for (const [a, b, w] of steps) out.push({ p: [x, (a + b) / 2, z], s: [w, b - a, w * 1.3] });
      for (const y of [0.9, 2.55, 3.55, 4.45, 5.3, H - 0.05]) out.push({ p: [0, y, z], s: [0.54, 0.1, 0.13] });
    }
    return out;
  }, []);
  const lamps = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (let z = -half; z <= half; z += 0.5) for (const x of [-0.24, 0.24]) out.push({ p: [x, deck + 0.12, z], s: [0.03, 0.03, 0.03] });
    return out;
  }, [half]);
  const beacons = useMemo<Item[]>(() => [tz, -tz].flatMap((z) => [-0.27, 0.27].map((x) => ({ p: [x, H + 0.06, z] as V3, s: [0.06, 0.06, 0.06] as V3 }))), []);
  return (
    <group>
      <mesh position={[0, deck, 0]} scale={[0.5, 0.16, half * 2]} material={red} castShadow receiveShadow>
        <boxGeometry />
      </mesh>
      <Many material={red} items={frames} shadow />
      {cables.map((g, i) => (
        <mesh key={i} geometry={g} material={red} />
      ))}
      <Many material={red} items={drops} />
      <Lamps items={lamps} env={env} />
      <Lamps items={beacons} env={env} color="#ff3b30" day="#b5432f" />
      {/* Anchorage blocks where the cables come down at either end */}
      {[half, -half].map((z) => (
        <mesh key={z} position={[0, 0.8, z]} scale={[0.8, 1.6, 0.9]} material={red} castShadow>
          <boxGeometry />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ Oracle Park */

/* The Giants' ballpark on the waterfront: a brick seating bowl wrapped around home plate, open to the bay past right
   field, light towers on the rim, the clock tower over the Willie Mays Gate, and the giant Coke bottle and glove in
   left field. After dark the field glows under the lights. Local −z points to center field. */
