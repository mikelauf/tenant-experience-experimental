"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Decor as DecorSpec, Rect, Seg } from "@/lib/data/types";
import { chairGeometry, coffeeGeometry, sofaGeometry } from "./furniture";

/**
 * The room's own dressing: plants, rugs, a lounge corner, art, pendants over the bar, and in the park
 * paths, benches, lamps, the fountain and the food trucks. Kept in the model's quiet palette so it
 * brings the room to life without competing with the setup.
 */

const col = {
  pot: "#3b3f43",
  potLight: "#d9d2c5",
  leaf: ["#5d7152", "#6f8360", "#4f6347"],
  rug: "#c9bba4",
  rugBorder: "#a8987e",
  sofa: "#e7dfd1",
  wood: "#6f4a2f",
  darkWood: "#3a2a1f",
  chair: "#3b3f43",
  plinth: "#f4f1eb",
  bronze: "#7a5a3a",
  frame: "#2f2a26",
  panel: "#f7f5f0",
  brass: "#b08d57",
  glow: "#ffe2b0",
  cloth: "#f5f2ec",
  steel: "#a9adb0",
  path: "#ddd5c4",
  stone: "#cfc8bb",
  water: "#8fb1bb",
  truck: ["#e3dccd", "#9a3f25", "#4b5a66", "#c9b8a2"],
  art: ["#9a3f25", "#4b5a66", "#c9b8a2", "#62666a", "#b08d57"],
  bottle: ["#4b5a3a", "#8a5a2b", "#d9d2c5", "#2f3a44"],
};

/** Center, length and heading of a rect's long side: dressing that has a "front" turns to face across it. */
function along(r: Rect) {
  const long = r.w >= r.d;
  return { len: long ? r.w : r.d, depth: long ? r.d : r.w, rot: long ? 0 : Math.PI / 2 };
}

function segFrame([x0, z0, x1, z1]: Seg) {
  return { x: (x0 + x1) / 2, z: (z0 + z1) / 2, len: Math.hypot(x1 - x0, z1 - z0), rot: -Math.atan2(z1 - z0, x1 - x0) };
}

/* ------------------------------------------------------------------ indoor */

function Plant({ at: [x, z], i }: { at: [number, number]; i: number }) {
  const h = 0.9 + ((i * 37) % 7) / 10;
  const light = i % 3 === 1;
  return (
    <group position={[x, 0, z]} rotation={[0, i * 1.3, 0]}>
      <mesh position={[0, 0.24, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.26, 0.2, 0.48, 16]} />
        <meshStandardMaterial color={light ? col.potLight : col.pot} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.48 + h * 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.03, h * 0.6, 5]} />
        <meshStandardMaterial color={col.darkWood} roughness={1} />
      </mesh>
      {[
        [0, h, 0, 0.36],
        [0.16, h - 0.22, 0.06, 0.28],
        [-0.14, h - 0.16, -0.08, 0.26],
        [0.02, h + 0.24, -0.04, 0.22],
      ].map(([px, py, pz, s], k) => (
        <mesh key={k} position={[px, 0.48 + py * 0.75, pz]} castShadow>
          <icosahedronGeometry args={[s, 0]} />
          <meshStandardMaterial color={col.leaf[(i + k) % col.leaf.length]} roughness={0.9} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function Rug({ r, color = col.rug }: { r: Rect; color?: string }) {
  return (
    <group position={[r.x, 0, r.z]}>
      {/* Just above a flat mark's height, so a rug laid on a labeled area still shows */}
      <mesh position={[0, 0.036, 0]} receiveShadow>
        <boxGeometry args={[r.w, 0.012, r.d]} />
        <meshStandardMaterial color={col.rugBorder} roughness={1} />
      </mesh>
      <mesh position={[0, 0.038, 0]} receiveShadow>
        <boxGeometry args={[Math.max(0.1, r.w - 0.3), 0.013, Math.max(0.1, r.d - 0.3)]} />
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>
    </group>
  );
}

function Lounge({ r, sofa, coffee }: { r: Rect; sofa: THREE.BufferGeometry; coffee: THREE.BufferGeometry }) {
  const { len, depth, rot } = along(r);
  const n = Math.max(1, Math.floor((len - 0.4) / 2.1));
  const edge = depth / 2 - 0.5;
  return (
    <group position={[r.x, 0, r.z]} rotation={[0, rot, 0]}>
      <Rug r={{ x: 0, z: 0, w: len, d: depth }} color="#d8cbb4" />
      {Array.from({ length: n }, (_, k) => {
        const x = (k - (n - 1) / 2) * 2.1;
        return (
          <group key={k}>
            {/* Sofas face +z, so the back one faces in as it is and the front one turns round */}
            <mesh geometry={sofa} position={[x, 0, -edge]} castShadow receiveShadow>
              <meshStandardMaterial color={col.sofa} roughness={0.85} />
            </mesh>
            <mesh geometry={sofa} position={[x, 0, edge]} rotation={[0, Math.PI, 0]} castShadow receiveShadow>
              <meshStandardMaterial color={col.sofa} roughness={0.85} />
            </mesh>
            <mesh geometry={coffee} position={[x, 0, 0]} scale={[0.8, 1, 0.8]} castShadow receiveShadow>
              <meshStandardMaterial color={col.wood} roughness={0.6} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function Board({ r, chair }: { r: Rect; chair: THREE.BufferGeometry }) {
  const { len, depth, rot } = along(r);
  const tw = Math.min(1.3, Math.max(0.9, depth - 1.5));
  const tl = Math.max(1.2, len - 1.2);
  const n = Math.max(1, Math.floor(tl / 0.75));
  return (
    <group position={[r.x, 0, r.z]} rotation={[0, rot, 0]}>
      <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
        <boxGeometry args={[tl, 0.05, tw]} />
        <meshStandardMaterial color={col.wood} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[tl * 0.7, 0.7, 0.3]} />
        <meshStandardMaterial color={col.darkWood} roughness={0.7} />
      </mesh>
      {Array.from({ length: n }, (_, k) =>
        [-1, 1].map((side) => (
          <mesh
            key={`${k}${side}`}
            geometry={chair}
            position={[(k - (n - 1) / 2) * (tl / n), 0, side * (tw / 2 + 0.3)]}
            rotation={[0, side < 0 ? Math.PI : 0, 0]}
            castShadow
          >
            <meshStandardMaterial color={col.chair} roughness={0.75} />
          </mesh>
        )),
      )}
    </group>
  );
}

function Plinth({ r, i }: { r: Rect; i: number }) {
  const h = 0.95;
  const s = Math.min(r.w, r.d);
  return (
    <group position={[r.x, 0, r.z]}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[r.w, h, r.d]} />
        <meshStandardMaterial color={col.plinth} roughness={0.8} />
      </mesh>
      {i % 2 === 0 ? (
        <mesh position={[0, h + s * 0.32, 0]} castShadow>
          <icosahedronGeometry args={[s * 0.3, 1]} />
          <meshStandardMaterial color={col.bronze} roughness={0.35} metalness={0.6} flatShading />
        </mesh>
      ) : (
        // A glass case over a small piece
        <>
          <mesh position={[0, h + 0.08, 0]} castShadow>
            <boxGeometry args={[s * 0.35, 0.16, s * 0.35]} />
            <meshStandardMaterial color={col.frame} roughness={0.4} />
          </mesh>
          <mesh position={[0, h + 0.22, 0]}>
            <boxGeometry args={[r.w * 0.92, 0.44, r.d * 0.92]} />
            <meshStandardMaterial color="#dfeaee" transparent opacity={0.25} roughness={0.05} depthWrite={false} />
          </mesh>
        </>
      )}
    </group>
  );
}

/** A freestanding exhibit wall along the line, with framed pieces hung on both faces. */
function ArtWall({ seg, i }: { seg: Seg; i: number }) {
  const { x, z, len, rot } = segFrame(seg);
  const n = Math.max(1, Math.floor(len / 1.6));
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <mesh position={[0, 0.8, 0]} castShadow receiveShadow>
        <boxGeometry args={[len, 1.6, 0.12]} />
        <meshStandardMaterial color={col.panel} roughness={0.9} />
      </mesh>
      {Array.from({ length: n }, (_, k) =>
        [-1, 1].map((side) => {
          const w = 0.7 + ((i + k) % 3) * 0.15;
          const h = 0.55 + ((i + k + 1) % 2) * 0.25;
          return (
            <group key={`${k}${side}`} position={[(k - (n - 1) / 2) * (len / n), 0.95, side * 0.075]}>
              <mesh castShadow>
                <boxGeometry args={[w + 0.08, h + 0.08, 0.03]} />
                <meshStandardMaterial color={col.frame} roughness={0.5} />
              </mesh>
              <mesh position={[0, 0, side * 0.017]}>
                <boxGeometry args={[w, h, 0.005]} />
                <meshStandardMaterial color={col.art[(i * 3 + k + (side > 0 ? 2 : 0)) % col.art.length]} roughness={0.8} />
              </mesh>
            </group>
          );
        }),
      )}
    </group>
  );
}

/** Warm pendants on thin cords, hung over a bar or counter. */
function Pendants({ seg }: { seg: Seg }) {
  const { x, z, len, rot } = segFrame(seg);
  const n = Math.max(2, Math.round(len / 1.1) + 1);
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      {Array.from({ length: n }, (_, k) => {
        const px = (k / (n - 1) - 0.5) * len;
        return (
          <group key={k} position={[px, 0, 0]}>
            <mesh position={[0, 2.35, 0]}>
              <cylinderGeometry args={[0.006, 0.006, 0.7, 4]} />
              <meshStandardMaterial color={col.frame} />
            </mesh>
            <mesh position={[0, 1.95, 0]} castShadow>
              <cylinderGeometry args={[0.05, 0.17, 0.16, 18, 1, true]} />
              <meshStandardMaterial color={col.brass} roughness={0.35} metalness={0.7} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0, 1.9, 0]}>
              <sphereGeometry args={[0.06, 12, 8]} />
              <meshStandardMaterial color={col.glow} emissive={col.glow} emissiveIntensity={1.6} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** Back-bar: a cabinet with two shelves of bottles above it. */
function Shelves({ r }: { r: Rect }) {
  const { len, depth, rot } = along(r);
  const bottles = useMemo(() => {
    const out: { x: number; y: number; h: number; c: string }[] = [];
    for (const [row, y] of [0.98, 1.36].entries()) {
      for (let x = -len / 2 + 0.12, k = 0; x < len / 2 - 0.08; x += 0.13 + ((k * 7) % 5) / 100, k++) out.push({ x, y, h: 0.2 + ((k + row) % 3) * 0.05, c: col.bottle[(k * 3 + row) % col.bottle.length] });
    }
    return out;
  }, [len]);
  const geo = useMemo(() => {
    const parts = bottles.map((b) => new THREE.CylinderGeometry(0.035, 0.035, b.h, 6).translate(b.x, b.y + b.h / 2, 0));
    return parts.length ? mergeGeometries(parts) : null;
  }, [bottles]);
  return (
    <group position={[r.x, 0, r.z]} rotation={[0, rot, 0]}>
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[len, 0.9, depth]} />
        <meshStandardMaterial color={col.darkWood} roughness={0.6} />
      </mesh>
      {[0.97, 1.35, 1.73].map((y) => (
        <mesh key={y} position={[0, y, 0]} castShadow>
          <boxGeometry args={[len, 0.03, depth * 0.8]} />
          <meshStandardMaterial color={col.wood} roughness={0.5} />
        </mesh>
      ))}
      {geo && (
        <mesh geometry={geo} castShadow>
          <meshStandardMaterial color="#6a6f5a" roughness={0.2} metalness={0.1} />
        </mesh>
      )}
    </group>
  );
}

/** A serving counter under cloth, with chafing dishes along it. */
function Counter({ r }: { r: Rect }) {
  const { len, depth, rot } = along(r);
  const n = Math.max(1, Math.floor(len / 1.3));
  return (
    <group position={[r.x, 0, r.z]} rotation={[0, rot, 0]}>
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[len, 0.9, depth]} />
        <meshStandardMaterial color={col.cloth} roughness={0.9} />
      </mesh>
      {Array.from({ length: n }, (_, k) => (
        <mesh key={k} position={[(k - (n - 1) / 2) * (len / n), 0.97, 0]} castShadow>
          <boxGeometry args={[0.55, 0.14, Math.min(0.4, depth * 0.6)]} />
          <meshStandardMaterial color={col.steel} roughness={0.25} metalness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ outdoor */

function Path({ r }: { r: Rect }) {
  return (
    <mesh position={[r.x, 0.008, r.z]} receiveShadow>
      <boxGeometry args={[r.w, 0.016, r.d]} />
      <meshStandardMaterial color={col.path} roughness={1} />
    </mesh>
  );
}

function Bench({ r }: { r: Rect }) {
  const { len, rot } = along(r);
  return (
    <group position={[r.x, 0, r.z]} rotation={[0, rot, 0]}>
      {[-0.12, 0, 0.12].map((z) => (
        <mesh key={z} position={[0, 0.44, z]} castShadow receiveShadow>
          <boxGeometry args={[len, 0.04, 0.1]} />
          <meshStandardMaterial color={col.wood} roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, 0.7, -0.2]} rotation={[-0.2, 0, 0]} castShadow>
        <boxGeometry args={[len, 0.3, 0.04]} />
        <meshStandardMaterial color={col.wood} roughness={0.8} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (len / 2 - 0.1), 0.22, -0.02]} castShadow>
          <boxGeometry args={[0.06, 0.44, 0.44]} />
          <meshStandardMaterial color={col.frame} roughness={0.5} metalness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function Lamp({ at: [x, z] }: { at: [number, number] }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 1.7, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.07, 3.4, 8]} />
        <meshStandardMaterial color={col.frame} roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[0, 3.5, 0]}>
        <sphereGeometry args={[0.2, 14, 10]} />
        <meshStandardMaterial color={col.glow} emissive={col.glow} emissiveIntensity={1.2} />
      </mesh>
    </group>
  );
}

/** The fountain: a stone basin with water in it and a tiered center. */
function Fountain({ r }: { r: Rect }) {
  const rad = Math.min(r.w, r.d) / 2;
  return (
    <group position={[r.x, 0, r.z]}>
      <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[rad, rad + 0.1, 0.44, 40]} />
        <meshStandardMaterial color={col.stone} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <cylinderGeometry args={[rad * 0.85, rad * 0.85, 0.06, 40]} />
        <meshStandardMaterial color={col.water} roughness={0.08} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[rad * 0.1, rad * 0.18, 0.8, 16]} />
        <meshStandardMaterial color={col.stone} roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.22, 0]} castShadow>
        <cylinderGeometry args={[rad * 0.36, rad * 0.26, 0.12, 24]} />
        <meshStandardMaterial color={col.stone} roughness={0.9} />
      </mesh>
      {/* The bronze animals round the rim */}
      {[0, 1, 2, 3].map((k) => {
        const a = (k / 4) * Math.PI * 2 + 0.4;
        return (
          <mesh key={k} position={[Math.cos(a) * rad * 0.6, 0.6, Math.sin(a) * rad * 0.6]} rotation={[0, -a, 0]} castShadow>
            <boxGeometry args={[rad * 0.26, rad * 0.16, rad * 0.13]} />
            <meshStandardMaterial color={col.bronze} roughness={0.35} metalness={0.6} />
          </mesh>
        );
      })}
    </group>
  );
}

function Trucks({ r }: { r: Rect }) {
  const { len, rot } = along(r);
  const n = Math.max(1, Math.floor(len / 7));
  return (
    <group position={[r.x, 0, r.z]} rotation={[0, rot, 0]}>
      {Array.from({ length: n }, (_, k) => (
        <group key={k} position={[(k - (n - 1) / 2) * (len / n), 0, 0]}>
          <mesh position={[0.5, 1.55, 0]} castShadow receiveShadow>
            <boxGeometry args={[4.6, 2.4, 2.3]} />
            <meshStandardMaterial color={col.truck[k % col.truck.length]} roughness={0.7} />
          </mesh>
          <mesh position={[-2.55, 1.2, 0]} castShadow>
            <boxGeometry args={[1.5, 1.7, 2.2]} />
            <meshStandardMaterial color={col.truck[k % col.truck.length]} roughness={0.7} />
          </mesh>
          {/* Serving window and its awning, on the park side */}
          <mesh position={[0.6, 1.8, 1.16]}>
            <boxGeometry args={[2.6, 0.9, 0.02]} />
            <meshStandardMaterial color={col.frame} roughness={0.4} />
          </mesh>
          <mesh position={[0.6, 2.35, 1.4]} rotation={[0.35, 0, 0]} castShadow>
            <boxGeometry args={[2.8, 0.04, 0.6]} />
            <meshStandardMaterial color={col.cloth} roughness={0.9} />
          </mesh>
          {[-2.4, 1.8].map((x) =>
            [-1, 1].map((s) => (
              <mesh key={`${x}${s}`} position={[x, 0.35, s * 1.1]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.35, 0.35, 0.25, 14]} />
                <meshStandardMaterial color={col.frame} roughness={0.9} />
              </mesh>
            )),
          )}
        </group>
      ))}
    </group>
  );
}

/** A lighting truss over an outdoor stage: four posts and a frame across the top, with lights along the front. */
export function Canopy({ r }: { r: Rect }) {
  const h = 4;
  const beam = (w: number, d: number, x: number, z: number, k: string) => (
    <mesh key={k} position={[x, h, z]} castShadow>
      <boxGeometry args={[w, 0.16, d]} />
      <meshStandardMaterial color={col.frame} roughness={0.5} metalness={0.4} />
    </mesh>
  );
  return (
    <group position={[r.x, 0, r.z]}>
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx * (r.w / 2 - 0.2), h / 2, sz * (r.d / 2 - 0.2)]} castShadow>
            <boxGeometry args={[0.14, h, 0.14]} />
            <meshStandardMaterial color={col.frame} roughness={0.5} metalness={0.4} />
          </mesh>
        )),
      )}
      {[-1, 1].map((s) => beam(r.w - 0.3, 0.16, 0, s * (r.d / 2 - 0.2), `x${s}`))}
      {[-1, 1].map((s) => beam(0.16, r.d - 0.3, s * (r.w / 2 - 0.2), 0, `z${s}`))}
      {Array.from({ length: 6 }, (_, k) => (
        <mesh key={k} position={[(k / 5 - 0.5) * (r.w - 1.2), h - 0.2, r.d / 2 - 0.2]}>
          <sphereGeometry args={[0.1, 10, 8]} />
          <meshStandardMaterial color={col.glow} emissive={col.glow} emissiveIntensity={1.4} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ all of it */

export function Decor({ decor }: { decor?: DecorSpec }) {
  const geo = useMemo(() => ({ sofa: sofaGeometry(), coffee: coffeeGeometry(), chair: chairGeometry() }), []);
  if (!decor) return null;
  const d = decor;
  return (
    <group>
      {d.paths?.map((r, i) => <Path key={`pa${i}`} r={r} />)}
      {d.rugs?.map((r, i) => <Rug key={`ru${i}`} r={r} color={r.color} />)}
      {d.lounges?.map((r, i) => <Lounge key={`lo${i}`} r={r} sofa={geo.sofa} coffee={geo.coffee} />)}
      {d.boards?.map((r, i) => <Board key={`bo${i}`} r={r} chair={geo.chair} />)}
      {d.plants?.map((p, i) => <Plant key={`pl${i}`} at={p} i={i} />)}
      {d.plinths?.map((r, i) => <Plinth key={`pn${i}`} r={r} i={i} />)}
      {d.art?.map((s, i) => <ArtWall key={`ar${i}`} seg={s} i={i} />)}
      {d.pendants?.map((s, i) => <Pendants key={`pe${i}`} seg={s} />)}
      {d.shelves?.map((r, i) => <Shelves key={`sh${i}`} r={r} />)}
      {d.counters?.map((r, i) => <Counter key={`co${i}`} r={r} />)}
      {d.benches?.map((r, i) => <Bench key={`be${i}`} r={r} />)}
      {d.lamps?.map((p, i) => <Lamp key={`la${i}`} at={p} />)}
      {d.fountain && <Fountain r={d.fountain} />}
      {d.trucks && <Trucks r={d.trucks} />}
    </group>
  );
}
