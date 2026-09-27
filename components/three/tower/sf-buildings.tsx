"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Env } from "./env";
import {
  CONE,
  CYL,
  type Item,
  LEAD,
  Lamps,
  type LandmarkMats,
  METAL,
  Many,
  ROUGH,
  type V3,
  deg,
  flat,
  hillGeometry,
  hillTrees,
  prism,
  sector,
  useGlow,
} from "./landmark-kit";

/** San Francisco's landmark buildings around the Pyramid, each built from primitives in the tower's language. */

export const SF = { top: 14.5, crown: 2.7, half: 1.35, corner: 0.42, straight: 0.43, narrow: 0.72, crownNarrow: 0.62 };

function roundedSquare(half: number, r: number, hole?: number) {
  const outline = (h: number, c: number, path: THREE.Shape | THREE.Path) => {
    path.moveTo(-h + c, -h);
    path.lineTo(h - c, -h);
    path.quadraticCurveTo(h, -h, h, -h + c);
    path.lineTo(h, h - c);
    path.quadraticCurveTo(h, h, h - c, h);
    path.lineTo(-h + c, h);
    path.quadraticCurveTo(-h, h, -h, h - c);
    path.lineTo(-h, -h + c);
    path.quadraticCurveTo(-h, -h, -h + c, -h);
    return path;
  };
  const s = outline(half, r, new THREE.Shape()) as THREE.Shape;
  if (hole) s.holes.push(outline(hole, r * (hole / half), new THREE.Path()) as THREE.Path);
  return s;
}

/** An upright rounded-square prism whose faces run straight to `from` (share of its height), then curve in to `narrow` */
function taperedPrism(half: number, corner: number, h: number, from: number, narrow: number, steps: number) {
  const g = new THREE.ExtrudeGeometry(roundedSquare(half, corner), { depth: h, steps, bevelEnabled: false, curveSegments: 5 });
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = p.getY(i) / h;
    const k = t <= from ? 1 : 1 - (1 - narrow) * ((t - from) / (1 - from)) ** 1.5;
    p.setX(i, p.getX(i) * k);
    p.setZ(i, p.getZ(i) * k);
  }
  g.computeVertexNormals();
  return g;
}

/** Pale metal fins and glass by day; a scatter of lit floors after dark. One tile is one scene unit, about four floors. */
function useSalesforceSkin() {
  return useMemo(() => {
    const make = (lit: boolean) => {
      const c = document.createElement("canvas");
      c.width = c.height = 64;
      const g = c.getContext("2d")!;
      g.fillStyle = lit ? "#000" : "#b7bdc2";
      g.fillRect(0, 0, 64, 64);
      let s = 7;
      for (let row = 0; row < 4; row++)
        for (let col = 0; col < 8; col++) {
          const x = col * 8 + 2;
          const y = row * 16 + 3;
          if (lit) {
            s = (s * 16807) % 2147483647;
            if (s % 10 < 3) {
              g.fillStyle = `rgba(255,${200 + (s % 40)},${150 + (s % 50)},0.85)`;
              g.fillRect(x, y, 6, 11);
            }
          } else {
            g.fillStyle = "#7d868d";
            g.fillRect(x, y, 6, 11);
          }
        }
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      return t;
    };
    return { map: make(false), emissive: make(true) };
  }, []);
}

export function SalesforceTower({ env }: { env: Env }) {
  const skin = useSalesforceSkin();
  const body = useMemo(() => taperedPrism(SF.half, SF.corner, SF.top, SF.straight, SF.narrow, 24), []);
  const crownHalf = SF.half * SF.narrow;
  const crown = useMemo(() => taperedPrism(crownHalf, SF.corner * SF.narrow, SF.crown, 0, SF.crownNarrow / SF.narrow, 6), [crownHalf]);
  // The lattice: open rings stepping up the crown, each a little narrower
  const rings = useMemo(
    () =>
      [0, 0.25, 0.5, 0.75, 1].map((t) => {
        const k = 1 - (1 - SF.crownNarrow / SF.narrow) * t ** 1.5;
        const h = crownHalf * k;
        const g = new THREE.ExtrudeGeometry(roundedSquare(h + 0.04, SF.corner * SF.narrow * k, h - 0.05), {
          depth: 0.07,
          bevelEnabled: false,
          curveSegments: 5,
        });
        g.rotateX(-Math.PI / 2);
        return { g, y: SF.top + t * SF.crown - 0.035 };
      }),
    [crownHalf],
  );
  const bodyMat = useRef<THREE.MeshStandardMaterial>(null);
  const glowMat = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(() => {
    if (bodyMat.current) bodyMat.current.emissiveIntensity = env.lit * 0.55;
    if (glowMat.current) glowMat.current.emissiveIntensity = 0.15 + env.lit * 0.5;
  });
  return (
    // Square to the South of Market grid, which runs about 45° off the Financial District's (and the Pyramid's)
    <group rotation={[0, Math.PI / 4, 0]}>
      <mesh geometry={body} castShadow receiveShadow>
        <meshStandardMaterial
          ref={bodyMat}
          color="#d9dde0"
          map={skin.map}
          emissive="#ffffff"
          emissiveMap={skin.emissive}
          emissiveIntensity={0}
          roughness={0.4}
          metalness={0.35}
        />
      </mesh>
      {/* The crown: see-through, with a soft glow from the light sculpture inside it */}
      <mesh geometry={crown} position={[0, SF.top, 0]}>
        <meshStandardMaterial
          ref={glowMat}
          color="#c9d1d6"
          emissive="#dfe8f0"
          emissiveIntensity={0.2}
          transparent
          opacity={0.22}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {rings.map(({ g, y }) => (
        <mesh key={y} geometry={g} position={[0, y, 0]} castShadow>
          <meshStandardMaterial color="#d5dadd" roughness={0.45} metalness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ Coit Tower */

/* Telegraph Hill, wooded, with Pioneer Park on top and the 210 ft fluted column: an arcade of arched windows
   under a scalloped cornice. Floodlit warm white at night. */
export function CoitTower({ m }: { m: LandmarkMats }) {
  const hill = useMemo(() => hillGeometry(3), []);
  const trees = useMemo(() => hillTrees(7, 46, 2.7, 1.5, 2.7), []);
  const column = useMemo(() => {
    // Sixteen shallow flutes, pressed into a slightly tapering shaft
    const g = new THREE.CylinderGeometry(0.29, 0.32, 3, 64, 1, true);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const a = Math.atan2(p.getZ(i), p.getX(i));
      const k = 1 - 0.07 * Math.max(0, Math.cos(a * 16)) ** 0.6;
      p.setX(i, p.getX(i) * k);
      p.setZ(i, p.getZ(i) * k);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const arches = useMemo<Item[]>(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return { p: [Math.cos(a) * 0.335, 4.63, Math.sin(a) * 0.335], s: [0.075, 0.26, 0.05], r: [0, -a + Math.PI / 2, 0] };
      }),
    [],
  );
  return (
    <group>
      <mesh geometry={hill} scale={[2.7, 1.5, 2.7]} material={m.tree} castShadow receiveShadow />
      <Many material={m.tree} geometry={CONE} items={trees} shadow />
      {/* Pioneer Park's lawn and the lobby at the column's foot */}
      <mesh position={[0, 1.47, 0]} scale={[0.9, 0.06, 0.9]} geometry={CYL} material={m.stone} receiveShadow />
      <mesh position={[0, 1.62, 0]} scale={[0.95, 0.28, 0.95]} material={m.lit} castShadow>
        <boxGeometry />
      </mesh>
      <mesh geometry={column} position={[0, 1.5 + 1.5, 0]} material={m.lit} castShadow />
      {/* The observation gallery: a band of arches, then the cornice and a crenellated crown */}
      <mesh position={[0, 4.63, 0]} scale={[0.34, 0.36, 0.34]} geometry={CYL} material={m.lit} castShadow />
      <Many material={m.window} items={arches} />
      <mesh position={[0, 4.86, 0]} scale={[0.38, 0.08, 0.38]} geometry={CYL} material={m.lit} />
      <mesh position={[0, 4.97, 0]} scale={[0.33, 0.14, 0.33]} geometry={CYL} material={m.lit} />
    </group>
  );
}

/* ------------------------------------------------------------------ Ferry Building */

/* A long two-storey shed along the Embarcadero, arcaded, under a low roof, and its 245 ft clock tower (after
   Seville's Giralda): a plain shaft, an arcaded belfry, four clock faces that glow at night, stepped stages and a cupola. */
export function FerryBuilding({ m, env }: { m: LandmarkMats; env: Env }) {
  const clock = useGlow("#e9e4d8", "#fff4dc", 1.1, env);
  const len = 6;
  const arcade = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (let i = 0; i < 26; i++) {
      const z = -len / 2 + 0.2 + (i * (len - 0.4)) / 25;
      if (Math.abs(z) < 0.35) continue;
      for (const x of [-0.56, 0.56]) out.push({ p: [x, 0.3, z], s: [0.02, 0.26, 0.12] }, { p: [x, 0.62, z], s: [0.02, 0.14, 0.1] });
    }
    return out;
  }, []);
  const belfry = useMemo<Item[]>(
    () =>
      [0, 1, 2, 3].flatMap((f) =>
        [-0.14, 0, 0.14].map((u) => {
          const a = (f * Math.PI) / 2;
          return {
            p: [Math.sin(a) * 0.28 + Math.cos(a) * u, 2.88, Math.cos(a) * 0.28 - Math.sin(a) * u] as V3,
            s: [0.08, 0.24, 0.02] as V3,
            r: [0, a, 0] as V3,
          };
        }),
      ),
    [],
  );
  const faces = useMemo<Item[]>(
    () =>
      [0, 1, 2, 3].map((f) => {
        const a = (f * Math.PI) / 2;
        // A disc stood up to face out: about x for the front and back, about z for the sides
        return { p: [Math.sin(a) * 0.235, 3.26, Math.cos(a) * 0.235], s: [0.16, 0.03, 0.16], r: f % 2 ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0] };
      }),
    [],
  );
  return (
    <group>
      <mesh position={[0, 0.4, 0]} scale={[1.1, 0.8, len]} material={m.lit} castShadow receiveShadow>
        <boxGeometry />
      </mesh>
      <mesh position={[0, 0.86, 0]} scale={[0.96, 0.12, len - 0.1]} material={m.stone} castShadow>
        <boxGeometry />
      </mesh>
      <Many material={m.window} items={arcade} />
      {/* The clock tower */}
      <mesh position={[0, 1.7, 0]} scale={[0.5, 2, 0.5]} material={m.lit} castShadow>
        <boxGeometry />
      </mesh>
      <mesh position={[0, 2.88, 0]} scale={[0.56, 0.36, 0.56]} material={m.lit} castShadow>
        <boxGeometry />
      </mesh>
      <Many material={m.window} items={belfry} />
      <mesh position={[0, 3.26, 0]} scale={[0.46, 0.4, 0.46]} material={m.lit} castShadow>
        <boxGeometry />
      </mesh>
      <Many material={clock} geometry={CYL} items={faces} />
      <mesh position={[0, 3.6, 0]} scale={[0.36, 0.28, 0.36]} material={m.lit} castShadow>
        <boxGeometry />
      </mesh>
      <mesh position={[0, 3.87, 0]} scale={[0.17, 0.26, 0.17]} material={m.lit} castShadow>
        <cylinderGeometry args={[1, 1, 1, 8]} />
      </mesh>
      <mesh position={[0, 4.0, 0]} scale={0.16} material={m.lit}>
        <sphereGeometry args={[1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh position={[0, 4.35, 0]} scale={[0.012, 0.5, 0.012]} geometry={CYL} material={m.stone} />
    </group>
  );
}

/* ------------------------------------------------------------------ Saints Peter and Paul */

/* The white Romanesque church on Washington Square: a nave behind a tall facade, a rose window, and twin spires
   in stages (tower, arcaded belfry, octagonal lantern, spire). Floodlit at night. */
export function Church({ m, env }: { m: LandmarkMats; env: Env }) {
  const rose = useGlow("#3a3f45", "#ffcf8f", 1, env);
  const roof = useMemo(() => prism(1.04, 0.38, 1.9), []);
  const belfries = useMemo<Item[]>(
    () =>
      [-0.42, 0.42].flatMap((dx) =>
        [0, 1, 2, 3].map((f) => {
          const a = (f * Math.PI) / 2;
          return { p: [dx + Math.sin(a) * 0.17, 2.28, 0.72 + Math.cos(a) * 0.17] as V3, s: [0.12, 0.3, 0.02] as V3, r: [0, a, 0] as V3 };
        }),
      ),
    [],
  );
  return (
    <group>
      <mesh position={[0, 0.6, -0.2]} scale={[1, 1.2, 1.9]} material={m.lit} castShadow receiveShadow>
        <boxGeometry />
      </mesh>
      {/* The pitched nave roof */}
      <mesh position={[0, 1.2, -0.2]} geometry={roof} material={m.stone} castShadow />
      <mesh position={[0, 1.05, 0.78]} scale={[0.62, 1.4, 0.16]} material={m.lit} castShadow>
        <boxGeometry />
      </mesh>
      <mesh position={[0, 1.2, 0.865]} rotation={[Math.PI / 2, 0, 0]} scale={[0.17, 0.02, 0.17]} geometry={CYL} material={rose} />
      {[-0.42, 0.42].map((dx) => (
        <group key={dx} position={[dx, 0, 0.72]}>
          <mesh position={[0, 1.02, 0]} scale={[0.36, 2.04, 0.36]} material={m.lit} castShadow>
            <boxGeometry />
          </mesh>
          <mesh position={[0, 2.28, 0]} scale={[0.33, 0.48, 0.33]} material={m.lit} castShadow>
            <boxGeometry />
          </mesh>
          <mesh position={[0, 2.64, 0]} scale={[0.15, 0.26, 0.15]} material={m.lit} castShadow>
            <cylinderGeometry args={[1, 1, 1, 8]} />
          </mesh>
          <mesh position={[0, 3.1, 0]} scale={[0.15, 0.68, 0.15]} geometry={CONE} material={m.lit} castShadow />
        </group>
      ))}
      <Many material={m.window} items={belfries} />
    </group>
  );
}

/* ------------------------------------------------------------------ Alcatraz */

/* The Rock: the cellhouse along its spine, the lighthouse beside it (its lamp lit after dark), and the water
   tower on its stilts at the north end. */
export function Alcatraz({ m, env }: { m: LandmarkMats; env: Env }) {
  const rock = useMemo(() => hillGeometry(11), []);
  const lamp = useGlow("#d9d4c6", "#fff2cc", 2.2, env);
  const cells = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (let i = 0; i < 9; i++) for (const z of [-0.26, 0.26]) out.push({ p: [-0.6 + i * 0.15, 0.95, z], s: [0.07, 0.12, 0.02] });
    return out;
  }, []);
  const legs = useMemo<Item[]>(() => [-1, 1].flatMap((a) => [-1, 1].map((b) => ({ p: [1.2 + a * 0.1, 0.95, b * 0.1] as V3, s: [0.02, 0.5, 0.02] as V3 }))), []);
  return (
    <group>
      <mesh geometry={rock} scale={[2.2, 0.72, 1.15]} material={m.tree} receiveShadow castShadow />
      <mesh position={[0, 0.9, 0]} scale={[1.45, 0.34, 0.5]} material={m.lit} castShadow>
        <boxGeometry />
      </mesh>
      <mesh position={[0, 1.1, 0]} scale={[1.35, 0.06, 0.42]} material={m.stone} />
      <Many material={m.window} items={cells} />
      {/* Lighthouse */}
      <group position={[-0.95, 0.62, 0.3]}>
        <mesh position={[0, 0.42, 0]} material={m.lit} castShadow>
          <cylinderGeometry args={[0.055, 0.085, 0.84, 8]} />
        </mesh>
        <mesh position={[0, 0.9, 0]} scale={[0.07, 0.1, 0.07]} geometry={CYL} material={lamp} />
      </group>
      {/* Water tower */}
      <Many material={m.stone} items={legs} />
      <mesh position={[1.2, 1.3, 0]} scale={[0.17, 0.2, 0.17]} geometry={CYL} material={m.stone} castShadow />
    </group>
  );
}

/* ------------------------------------------------------------------ Bay Bridge */

/* The western span as it stands: two suspension bridges end to end, meeting at a concrete anchorage mid-bay, with
   X-braced silver towers. Then Yerba Buena Island, and past it the white single-tower eastern span. After dark the
   western span's hangers carry the Bay Lights, 25,000 LEDs in a slow shimmer. Local +z runs toward San Francisco. */
export function Ballpark({ m, env }: { m: LandmarkMats; env: Env }) {
  const brick = useGlow("#a65a40", "#ffb48a", 0.08, env, ROUGH);
  const seats = useMemo(() => new THREE.MeshStandardMaterial({ color: "#5d7282", roughness: 0.8 }), []);
  const grass = useGlow("#3f6b3c", "#7fbf6a", 0.35, env);
  const dirt = useGlow("#8a6a4c", "#c79a6c", 0.25, env);
  const coke = useMemo(() => new THREE.MeshStandardMaterial({ color: "#6d2a26", roughness: 0.5 }), []);
  const glove = useMemo(() => new THREE.MeshStandardMaterial({ color: "#7a5230", roughness: 0.8 }), []);
  const g = useMemo(
    () => ({
      field: flat(sector(0, 2.05, deg(45), deg(135)), 0.03),
      foul: flat(sector(0, 1.2, deg(135), deg(405)), 0.03),
      lower: flat(sector(1.2, 1.62, deg(140), deg(400)), 0.34),
      upper: flat(sector(1.55, 2.0, deg(165), deg(375)), 0.78),
      wall: flat(sector(2.05, 2.12, deg(45), deg(140)), 0.16),
    }),
    [],
  );
  const poles = useMemo(() => [155, 205, 250, 290, 335, 25].map((a) => [Math.cos(deg(a)) * 2.05, -Math.sin(deg(a)) * 2.05, deg(a)] as const), []);
  const heads = useMemo<Item[]>(() => poles.map(([x, z, a]) => ({ p: [x, 1.72, z], s: [0.22, 0.1, 0.03], r: [0, a + Math.PI / 2, 0] })), [poles]);
  return (
    <group position={[0, 0, 0.9]}>
      <mesh geometry={g.foul} material={grass} receiveShadow />
      <mesh geometry={g.field} material={grass} receiveShadow />
      <mesh position={[0, 0.035, -0.4]} rotation={[-Math.PI / 2, 0, Math.PI / 4]} material={dirt}>
        <planeGeometry args={[0.52, 0.52]} />
      </mesh>
      <mesh position={[0, 0.04, -0.4]} rotation={[-Math.PI / 2, 0, Math.PI / 4]} material={grass}>
        <planeGeometry args={[0.36, 0.36]} />
      </mesh>
      <mesh geometry={g.lower} material={[seats, brick]} castShadow receiveShadow />
      <mesh geometry={g.upper} material={[seats, brick]} castShadow receiveShadow />
      <mesh geometry={g.wall} material={seats} />
      {poles.map(([x, z]) => (
        <mesh key={x} position={[x, 0.86, z]} scale={[0.025, 1.72, 0.025]} geometry={CYL} material={m.stone} />
      ))}
      <Lamps items={heads} env={env} color="#f6f8ff" day="#b9bec2" />
      {/* The clock tower over the gate behind home plate */}
      <group position={[0, 0, 2.18]}>
        <mesh position={[0, 0.7, 0]} scale={[0.3, 1.4, 0.3]} material={brick} castShadow>
          <boxGeometry />
        </mesh>
        <mesh position={[0, 1.18, 0.155]} rotation={[Math.PI / 2, 0, 0]} scale={[0.1, 0.02, 0.1]} geometry={CYL} material={m.window} />
        <mesh position={[0, 1.55, 0]} rotation={[0, Math.PI / 4, 0]} scale={[0.24, 0.3, 0.24]} material={m.stone}>
          <coneGeometry args={[1, 1, 4]} />
        </mesh>
      </group>
      {/* The Coke bottle and the old-time glove, beyond the left-field bleachers */}
      <group position={[Math.cos(deg(122)) * 2.4, 0, -Math.sin(deg(122)) * 2.4]} scale={0.55}>
        <mesh position={[0, 0.35, 0]} scale={[0.13, 0.7, 0.13]} geometry={CYL} material={coke} castShadow />
        <mesh position={[0, 0.85, 0]} material={coke} castShadow>
          <cylinderGeometry args={[0.04, 0.13, 0.32, 12]} />
        </mesh>
        <mesh position={[0.34, 0.2, 0.12]} scale={[0.2, 0.24, 0.1]} rotation={[0, 0.6, 0.2]} material={glove} castShadow>
          <sphereGeometry args={[1, 12, 10]} />
        </mesh>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ City Hall */

/* Beaux-Arts City Hall on Civic Center Plaza: a long colonnaded front between end pavilions, and the dome, taller
   than the Capitol's, on a colonnaded drum, capped by a gilded lantern. Local +z is the front, facing the plaza. */
export function CityHall({ m, env }: { m: LandmarkMats; env: Env }) {
  const dome = useGlow("#76847f", "#c9d6cf", 0.12, env, LEAD);
  const gold = useGlow("#c8a04c", "#ffd27a", 0.5, env, METAL);
  const pediment = useMemo(() => prism(1, 0.22, 0.32), []);
  const front = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (let i = 0; i < 16; i++) {
      const x = -1.05 + (i * 2.1) / 15;
      if (Math.abs(x) < 0.4) continue;
      out.push({ p: [x, 0.52, 0.8], s: [0.035, 0.62, 0.035] });
    }
    for (let i = 0; i < 6; i++) out.push({ p: [-0.32 + i * 0.128, 0.56, 0.98], s: [0.04, 0.7, 0.04] });
    return out;
  }, []);
  const drum = useMemo<Item[]>(
    () =>
      Array.from({ length: 20 }, (_, i) => {
        const a = (i / 20) * Math.PI * 2;
        return { p: [Math.cos(a) * 0.56, 1.42, Math.sin(a) * 0.56], s: [0.03, 0.52, 0.03] };
      }),
    [],
  );
  const windows = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (let i = 0; i < 13; i++) {
      const x = -1.1 + (i * 2.2) / 12;
      if (Math.abs(x) < 0.45) continue;
      out.push({ p: [x, 0.55, 0.755], s: [0.07, 0.36, 0.02] });
    }
    return out;
  }, []);
  return (
    <group>
      <mesh position={[0, 0.08, 0.1]} scale={[3.1, 0.16, 1.9]} material={m.stone} receiveShadow>
        <boxGeometry />
      </mesh>
      <mesh position={[0, 0.5, 0]} scale={[2.8, 0.84, 1.5]} material={m.lit} castShadow receiveShadow>
        <boxGeometry />
      </mesh>
      <Many material={m.window} items={windows} />
      {[-1.25, 1.25].map((x) => (
        <mesh key={x} position={[x, 0.56, 0.05]} scale={[0.5, 0.96, 1.6]} material={m.lit} castShadow>
          <boxGeometry />
        </mesh>
      ))}
      {/* The central portico and its pediment */}
      <mesh position={[0, 0.2, 0.95]} scale={[0.95, 0.08, 0.35]} material={m.stone}>
        <boxGeometry />
      </mesh>
      <mesh position={[0, 0.95, 0.95]} scale={[0.95, 0.12, 0.35]} material={m.lit} castShadow>
        <boxGeometry />
      </mesh>
      <mesh position={[0, 1.01, 0.95]} geometry={pediment} material={m.lit} castShadow />
      <Many material={m.lit} geometry={CYL} items={front} shadow />
      {/* The drum, its colonnade, the dome and the lantern */}
      <mesh position={[0, 1.1, 0]} scale={[0.62, 0.22, 0.62]} geometry={CYL} material={m.lit} castShadow />
      <mesh position={[0, 1.42, 0]} scale={[0.5, 0.52, 0.5]} geometry={CYL} material={m.lit} castShadow />
      <Many material={m.lit} geometry={CYL} items={drum} />
      <mesh position={[0, 1.71, 0]} scale={[0.62, 0.07, 0.62]} geometry={CYL} material={m.lit} />
      <mesh position={[0, 1.83, 0]} scale={[0.5, 0.18, 0.5]} geometry={CYL} material={m.lit} />
      <mesh position={[0, 1.92, 0]} scale={[0.5, 0.68, 0.5]} material={dome} castShadow>
        <sphereGeometry args={[1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh position={[0, 2.72, 0]} scale={[0.11, 0.3, 0.11]} geometry={CYL} material={gold} />
      <mesh position={[0, 2.9, 0]} scale={0.1} material={gold}>
        <sphereGeometry args={[1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh position={[0, 3.08, 0]} scale={[0.03, 0.3, 0.03]} geometry={CONE} material={gold} />
    </group>
  );
}

/* ------------------------------------------------------------------ placement */
