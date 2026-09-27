"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, PerformanceMonitor } from "@react-three/drei";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { sceneLandmarks, topOf, trueNorth, type TowerProfile } from "@/lib/tower";
import { makeEnv, type Env } from "./env";
import { Landmarks, landmarkTop } from "./landmarks";
import { Sky, SunDisc, type SunSky } from "./sky";
import { Park, ParkOutline, ParkPins, ParkPlaces, StringLights } from "./park";
import { City, Ground, RealCity, Water } from "./city";
import { AnchorTracker, BandMesh, Bands, CompassTracker, Halo, HotspotTracker, Marker, PinTracker, PoiMarkers, type Band, type Pin } from "./markers";
import { Rig } from "./rig";

/** Vertical window slits; the emissive twin lights some of them after dark. */
function useFacadeTextures(p: TowerProfile) {
  return useMemo(() => {
    const make = (lit: boolean) => {
      const c = document.createElement("canvas");
      c.width = 256;
      c.height = 16;
      const g = c.getContext("2d")!;
      g.fillStyle = lit ? "#000" : "#ffffff";
      g.fillRect(0, 0, 256, 16);
      const slot = 252 / p.facade.slits;
      let s = 3;
      for (let i = 0; i < p.facade.slits; i++) {
        const x = 4 + i * slot;
        if (lit) {
          s = (s * 16807) % 2147483647;
          const on = s % 5 < 2;
          g.fillStyle = on ? `rgba(255,${170 + (s % 50)},${90 + (s % 40)},${0.55 + (s % 40) / 100})` : "#000";
        } else {
          g.fillStyle = "#8a8f94";
        }
        g.fillRect(x, 3, slot * p.facade.width, 10);
      }
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      return t;
    };
    return { map: make(false), emissive: make(true) };
  }, [p]);
}

/** The pickable level a slab belongs to, if any: venue floors are thin, so a floor either side counts too. */
function snap(floor: number, pickable: number[] | undefined, p: TowerProfile): number | null {
  if (!pickable) return floor;
  let best: number | null = null;
  for (const l of pickable) {
    const slab = Math.min(l, p.floors - 1);
    if (Math.abs(slab - floor) <= 1 && (best == null || Math.abs(slab - floor) < Math.abs(Math.min(best, p.floors - 1) - floor))) best = l;
  }
  return best;
}

function Tower({
  p,
  env,
  glow,
  onPick,
  onHover,
  pickable,
}: {
  p: TowerProfile;
  env: Env;
  glow: string;
  onPick?: (floor: number) => void;
  onHover?: (floor: number | null) => void;
  pickable?: number[];
}) {
  const slabs = useRef<THREE.InstancedMesh>(null);
  const wings = useRef<THREE.InstancedMesh>(null);
  const slabMat = useRef<THREE.MeshStandardMaterial>(null);
  const wingMat = useRef<THREE.MeshStandardMaterial>(null);
  const crownMat = useRef<THREE.MeshStandardMaterial>(null);
  const tex = useFacadeTextures(p);
  const top = topOf(p);
  const { gl } = useThree();
  const hoverTo = (raw: number | null) => {
    const f = raw == null ? null : snap(raw, pickable, p);
    gl.domElement.style.cursor = f == null ? "grab" : "pointer";
    onHover?.(f);
  };
  const wingCount = p.wings ? (p.wings.to - p.wings.from) * 2 : 0;

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    for (let i = 0; i < p.floors; i++) {
      m.compose(new THREE.Vector3(0, i * p.floorH + p.floorH / 2, 0), q, new THREE.Vector3(p.widthAt(i), p.floorH * 0.94, p.depthAt(i)));
      slabs.current!.setMatrixAt(i, m);
    }
    slabs.current!.instanceMatrix.needsUpdate = true;
    slabs.current!.computeBoundingSphere();

    if (p.wings && wings.current) {
      let k = 0;
      const { from, to } = p.wings;
      for (let i = from; i < to; i++) {
        const w = p.widthAt(Math.min(i, p.floors + 2));
        const t = (i - from) / (to - from);
        const depth = 0.36 - t * 0.12;
        for (const side of [-1, 1]) {
          m.compose(new THREE.Vector3(side * (w / 2 + 0.09), i * p.floorH + p.floorH / 2, 0), q, new THREE.Vector3(0.2, p.floorH * 0.98, depth));
          wings.current.setMatrixAt(k++, m);
        }
      }
      wings.current.instanceMatrix.needsUpdate = true;
    }
  }, [p]);

  useFrame(() => {
    const e = env;
    if (slabMat.current) {
      slabMat.current.color.copy(e.slab);
      slabMat.current.emissiveIntensity = e.lit;
    }
    wingMat.current?.color.copy(e.wing);
    if (crownMat.current) {
      crownMat.current.color.copy(e.wing);
      // The spire catches the last light; a lantern glows the building's color
      crownMat.current.emissiveIntensity = p.crown.kind === "lantern" ? 0.2 + e.lit * 0.9 : (e.lit / 1.5) * 0.35;
    }
  });

  const pick = (e: ThreeEvent<MouseEvent>) => {
    if (!onPick || e.instanceId == null || e.delta > 8) return;
    const f = snap(e.instanceId, pickable, p);
    if (f == null) return;
    e.stopPropagation();
    onPick(f);
  };

  const e0 = env;
  return (
    <group>
      <instancedMesh
        ref={slabs}
        args={[undefined, undefined, p.floors]}
        castShadow
        receiveShadow
        onClick={onPick ? pick : undefined}
        onPointerMove={
          onHover
            ? (e) => {
                e.stopPropagation();
                hoverTo(e.instanceId ?? null);
              }
            : undefined
        }
        onPointerOut={onHover ? () => hoverTo(null) : undefined}
      >
        <boxGeometry />
        <meshStandardMaterial
          ref={slabMat}
          color={e0.slab}
          map={tex.map}
          emissive="#ffffff"
          emissiveMap={tex.emissive}
          emissiveIntensity={e0.lit}
          roughness={0.82}
          metalness={0.05}
        />
      </instancedMesh>
      {p.wings && (
        <instancedMesh ref={wings} args={[undefined, undefined, wingCount]} castShadow>
          <boxGeometry />
          <meshStandardMaterial ref={wingMat} color={e0.wing} roughness={0.7} metalness={0.15} />
        </instancedMesh>
      )}
      {p.crown.kind === "spire" ? (
        <mesh position={[0, top + p.crown.height / 2, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[p.crown.radius, p.crown.height, 4, 1]} />
          <meshStandardMaterial ref={crownMat} color={e0.wing} roughness={0.45} metalness={0.35} emissive="#ffd2a8" emissiveIntensity={0} />
        </mesh>
      ) : (
        <group position={[0, top, 0]}>
          <mesh position={[0, p.crown.height / 2, 0]} rotation={[0, Math.PI / 8, 0]} castShadow>
            <cylinderGeometry args={[p.crown.radius * 0.82, p.crown.radius, p.crown.height, 8, 1]} />
            <meshStandardMaterial ref={crownMat} color={e0.wing} roughness={0.4} metalness={0.3} emissive={glow} emissiveIntensity={0.2} toneMapped={false} />
          </mesh>
          <mesh position={[0, p.crown.height + p.crown.mast / 2, 0]} castShadow>
            <coneGeometry args={[0.09, p.crown.mast, 8, 1]} />
            <meshStandardMaterial color="#9aa0a6" roughness={0.35} metalness={0.6} />
          </mesh>
        </group>
      )}
      {/* Base plinth */}
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <boxGeometry args={[p.widthAt(0) + 0.5, 0.12, p.depthAt(0) + 0.5]} />
        <meshStandardMaterial color={e0.wing} roughness={0.9} />
      </mesh>
    </group>
  );
}

export type TowerCanvasProps = {
  profile: TowerProfile;
  /** Highlighted level (null = the whole building) */
  level: number | null;
  /** 0 night · 0.5 dusk · 1 day */
  sun?: number;
  /** The building's accent glow, for the marker, park and your own plans */
  accent: string;
  active?: boolean;
  auto?: boolean;
  onReady?: () => void;
  onInteract?: () => void;
  /** Live mode: status bands, your pins, and floor picking */
  bands?: Band[];
  pins?: Pin[];
  onPick?: (floor: number) => void;
  /** Only these levels can be hovered and picked (venue floors) */
  pickable?: number[];
  /** DOM markers pinned to these levels' silhouette edge; `renderHotspot` draws each one */
  hotspots?: { id: string; level: number }[];
  renderHotspot?: (id: string) => React.ReactNode;
  /** Pickable floor under the pointer, and a floor to highlight from outside (a list row) */
  onHover?: (floor: number | null) => void;
  hoverLevel?: number | null;
  /** Screen-space pan of the subject in px, to clear an overlay; eased */
  shift?: [x: number, y: number];
  /** Camera distance multiplier while a level is selected */
  zoom?: number;
  /** Show the profile's landmarks and their labels */
  landmarks?: boolean;
  /** Arriving: street-level places, street names and a compass; `activePoi` is enlarged */
  pois?: boolean;
  activePoi?: string | null;
  /** The place the camera flies to while arriving */
  focusPoi?: string | null;
  onPoi?: (id: string) => void;
  onPoiHover?: (id: string | null) => void;
  /** Where the compass sits, as classes; no compass without it */
  compass?: string;
  /** Face this true compass bearing from the selected floor (a view photo's direction) */
  lookBearing?: number | null;
  /** Landmarks to point out (the ones in the photo on show), by name */
  activeLandmarks?: string[];
  /** Landmark labels become buttons */
  onLandmark?: (name: string) => void;
  /** The real sun, for an event's date and time: the key light comes from it and it glows on the horizon when low */
  sunSky?: SunSky | null;
  /** At street level, the park place in the photo on show (a `ParkSpot` id): it lights and the camera draws in */
  parkSpot?: string | null;
  /** Park place pins become buttons */
  onParkSpot?: (id: string) => void;
};

/** Ready means the first frame has actually been drawn, not just that the context exists. */
function FirstFrame({ onReady }: { onReady?: () => void }) {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    requestAnimationFrame(() => onReady?.());
  });
  return null;
}

export default function TowerCanvas({
  profile: p,
  level,
  sun = 1,
  accent,
  active = true,
  auto = true,
  onReady,
  onInteract,
  bands,
  pins,
  onPick,
  pickable,
  hotspots,
  renderHotspot,
  onHover,
  hoverLevel,
  shift,
  zoom,
  landmarks,
  pois,
  activePoi,
  focusPoi,
  onPoi,
  onPoiHover,
  compass,
  lookBearing,
  activeLandmarks,
  onLandmark,
  sunSky,
  parkSpot,
  onParkSpot,
}: TowerCanvasProps) {
  // One mutable light state per canvas; useFrame blends it every frame
  const [env] = useState(() => makeEnv(sun));
  const focus = useRef(new THREE.Vector3(0, topOf(p) * 0.62, 0));
  const [hover, setHoverState] = useState<number | null>(null);
  const [dpr, setDpr] = useState(2);
  const hoverOut = useRef(onHover);
  useEffect(() => {
    hoverOut.current = onHover;
  }, [onHover]);
  const setHover = useCallback((f: number | null) => {
    setHoverState(f);
    hoverOut.current?.(f);
  }, []);
  const lit = hoverLevel ?? hover;
  const pinEls = useRef<(HTMLElement | null)[]>([]);
  const landmarkEls = useRef<(HTMLElement | null)[]>([]);
  const poiEls = useRef<(HTMLElement | null)[]>([]);
  const shownLandmarks = useMemo(() => (landmarks ? sceneLandmarks(p) : []), [landmarks, p]);
  const north = useMemo(() => trueNorth(p), [p]);
  const shownPois = useMemo(() => (pois ? (p.pois ?? []).filter((x) => !x.pending) : []), [pois, p]);
  const landmarkAnchors = useMemo(() => shownLandmarks.map(landmarkTop), [shownLandmarks]);
  const poiAnchors = useMemo(() => shownPois.map((x) => new THREE.Vector3(x.x, 1.05, x.z)), [shownPois]);
  const streetEls = useRef<(HTMLElement | null)[]>([]);
  const shownStreets = useMemo(() => (pois ? (p.streets ?? []) : []), [pois, p]);
  const streetAnchors = useMemo(() => shownStreets.map((x) => new THREE.Vector3(x.x, 0.05, x.z)), [shownStreets]);
  const compassEl = useRef<HTMLSpanElement>(null);
  const spotPoi = shownPois.find((x) => x.id === focusPoi);
  const spot = useMemo<[number, number] | null>(() => (spotPoi ? [spotPoi.x, spotPoi.z] : null), [spotPoi]);
  const hotspotEls = useRef<(HTMLElement | null)[]>([]);
  const hotspotLevels = useMemo(() => (hotspots ?? []).map((h) => h.level), [hotspots]);
  // The park's places, pinned while the park is the stop
  const inPark = level === 0 && !pois;
  const parkSpots = useMemo(() => (inPark ? (p.park?.plan?.spots ?? []) : []), [inPark, p]);
  const parkEls = useRef<(HTMLElement | null)[]>([]);
  const parkAnchors = useMemo(() => parkSpots.map((s) => new THREE.Vector3(s.x, 0.6, s.z)), [parkSpots]);
  const shownSpot = parkSpots.find((s) => s.id === parkSpot);
  const parkFocus = useMemo<[number, number] | null>(() => (shownSpot ? [shownSpot.x, shownSpot.z] : null), [shownSpot]);

  return (
    <div className="relative h-full w-full">
      <Canvas
        shadows
        dpr={[1, dpr]}
        // Off-screen scenes still draw on demand, so a scene mounted early is compiled and painted before it's seen
        frameloop={active ? "always" : "demand"}
        camera={{ position: [20, 12, 20], fov: 32, near: 0.5, far: 120 }}
        gl={{ antialias: true, alpha: true }}
        onPointerMissed={() => setHover(null)}
        aria-hidden
      >
        {/* Weak GPUs step down to a lighter pixel ratio instead of dropping frames */}
        <PerformanceMonitor onDecline={() => setDpr(1.25)} />
        <FirstFrame onReady={onReady} />
        <Sky sun={sun} env={env} sky={sunSky} north={p.north} />
        {sunSky && <SunDisc sky={sunSky} north={p.north} />}
        <Rig
          p={p}
          level={level}
          auto={auto}
          focus={focus}
          onInteract={onInteract}
          shift={shift}
          zoom={zoom}
          street={pois}
          spot={spot}
          parkSpot={parkFocus}
          look={lookBearing}
        />
        <Tower p={p} env={env} glow={accent} onPick={onPick} onHover={onPick ? setHover : undefined} pickable={pickable} />
        <Park p={p} env={env} flat={pois} onPick={onPick ? () => onPick(0) : undefined} />
        {p.park?.plan && <ParkPlaces p={p} env={env} active={inPark ? (parkSpot ?? null) : null} color={accent} />}
        {p.park?.plan && <StringLights p={p} env={env} off={pois} />}
        <ParkOutline p={p} on={level === 0} color={accent} />
        {inPark && <ParkPins p={p} color={accent} active={parkSpot ?? null} />}
        {inPark && <AnchorTracker anchors={parkAnchors} els={parkEls} center />}
        <City p={p} env={env} focus={focus} />
        {p.realCity && <RealCity p={p} env={env} focus={focus} flat={pois} clearPark={level === 0} />}
        <Marker p={p} level={level} color={accent} />
        {bands && <Bands p={p} bands={bands} accent={accent} />}
        {pins && <PinTracker p={p} pins={pins} els={pinEls} />}
        {lit != null && lit !== level && <BandMesh key={lit} p={p} b={{ level: lit, tone: "full" }} color="#ffffff" />}
        <Ground env={env} radius={p.ground} />
        <Water env={env} hills={!!p.landmarks?.length} turn={-(p.north ?? 0)} />
        {landmarks && <Landmarks p={p} env={env} focus={focus} />}
        {landmarks && shownLandmarks.filter((l) => activeLandmarks?.includes(l.name)).map((l) => <Halo key={l.name} l={l} color={accent} />)}
        {hotspots && <HotspotTracker p={p} levels={hotspotLevels} els={hotspotEls} />}
        {landmarks && <AnchorTracker anchors={landmarkAnchors} els={landmarkEls} center />}
        {pois && <PoiMarkers p={p} color={accent} active={activePoi} />}
        {pois && <AnchorTracker anchors={poiAnchors} els={poiEls} center />}
        {pois && <AnchorTracker anchors={streetAnchors} els={streetEls} center />}
        {pois && compass && <CompassTracker focus={focus} el={compassEl} north={north} />}
        <ContactShadows position={[0, 0.01, 0]} opacity={env.shadow} scale={14} blur={2.4} far={6} />
      </Canvas>
      {shownLandmarks.map((l, i) => {
        const on = !!activeLandmarks?.includes(l.name);
        return (
          <button
            key={l.name}
            ref={(el) => {
              landmarkEls.current[i] = el;
            }}
            type="button"
            tabIndex={onLandmark ? 0 : -1}
            onClick={() => onLandmark?.(l.name)}
            aria-label={onLandmark ? `${l.name}: find it in a view` : l.name}
            className={`absolute left-0 top-0 whitespace-nowrap rounded-full font-medium opacity-0 backdrop-blur-sm transition-[opacity,background-color,color,padding,font-size] duration-300 ${
              onLandmark ? "cursor-pointer" : "pointer-events-none"
            } ${on ? "z-10 bg-accent px-2.5 py-1 text-[0.75rem] text-paper shadow-[var(--shadow-float)]" : "bg-black/30 px-2 py-0.5 text-[0.625rem] tracking-[0.01em] text-white/65 hover:bg-black/55 hover:text-white"}`}
          >
            {l.name}
          </button>
        );
      })}
      {shownStreets.map((x, i) => (
        <span
          key={x.name}
          ref={(el) => {
            streetEls.current[i] = el;
          }}
          className="pointer-events-none absolute left-0 top-0 whitespace-nowrap text-[0.6875rem] font-medium tracking-[0.02em] text-white/60 opacity-0 transition-opacity duration-300 [text-shadow:0_1px_6px_rgb(0_0_0/0.9)]"
        >
          {x.name}
        </span>
      ))}
      {shownPois.map((x, i) => {
        const on = x.id === activePoi;
        return (
          <button
            key={x.id}
            ref={(el) => {
              poiEls.current[i] = el;
            }}
            onClick={() => onPoi?.(x.id)}
            onPointerEnter={() => onPoiHover?.(x.id)}
            onPointerLeave={() => onPoiHover?.(null)}
            aria-label={`${i + 1}. ${x.label}`}
            aria-pressed={on}
            className={`absolute left-0 top-0 flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full pl-1 pr-2.5 text-[0.75rem] font-medium opacity-0 shadow-[var(--shadow-float)] transition-[opacity,background-color,color] duration-300 ${on ? "z-10 bg-accent text-paper" : "bg-paper text-ink hover:bg-white"}`}
          >
            <span
              className={`keep-round t-num grid size-5 place-items-center rounded-full text-[0.6875rem] ${on ? "bg-paper text-accent" : "bg-accent text-paper"}`}
            >
              {i + 1}
            </span>
            {x.label}
          </button>
        );
      })}
      {parkSpots.map((s, i) => {
        const on = s.id === parkSpot;
        return (
          <button
            key={s.id}
            ref={(el) => {
              parkEls.current[i] = el;
            }}
            type="button"
            onClick={() => onParkSpot?.(s.id)}
            aria-label={`${s.label}: see it in the photos`}
            aria-pressed={on}
            className={`absolute left-0 top-0 flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[0.75rem] font-medium opacity-0 shadow-[var(--shadow-float)] transition-[opacity,background-color,color] duration-300 ${on ? "z-10 bg-accent text-paper" : "bg-paper/90 text-ink hover:bg-white max-sm:p-1.5"}`}
          >
            {/* On phones the places not on show shrink to a dot, so close ones don't pile up */}
            {!on && <span className="keep-round size-2 rounded-full bg-accent sm:hidden" />}
            <span className={on ? undefined : "max-sm:hidden"}>{s.label}</span>
          </button>
        );
      })}
      {pois && compass && (
        <span className={`pointer-events-none absolute grid size-11 place-items-center rounded-full bg-black/40 backdrop-blur-md ${compass}`} aria-hidden>
          <span ref={compassEl} className="relative block h-7 w-7">
            <span className="absolute left-1/2 top-0 -translate-x-1/2 text-[0.625rem] font-semibold leading-none text-accent-glow">N</span>
            <span className="absolute bottom-1 left-1/2 h-3.5 w-px -translate-x-1/2 bg-moon/70" />
          </span>
        </span>
      )}
      {hotspots?.map((h, i) => (
        <div
          key={h.id}
          ref={(el) => {
            hotspotEls.current[i] = el;
          }}
          className="absolute left-0 top-0"
          style={{ visibility: "hidden" }}
        >
          {renderHotspot?.(h.id)}
        </div>
      ))}
      {pins?.map((pin, i) => (
        <span
          key={`${pin.level}-${pin.label}`}
          ref={(el) => {
            pinEls.current[i] = el;
          }}
          className="pointer-events-none absolute left-0 top-0 flex items-center gap-1.5 whitespace-nowrap rounded-full bg-accent px-2.5 py-1 text-[0.75rem] font-medium text-paper opacity-0 shadow-[var(--shadow-float)] transition-opacity duration-300"
        >
          <span className="size-1.5 rounded-full bg-paper" />
          {pin.label}
        </span>
      ))}
    </div>
  );
}
