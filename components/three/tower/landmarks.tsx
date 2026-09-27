"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { LANDMARK_REACH, sceneLandmarks, type SceneLandmark, type TowerProfile } from "@/lib/tower";
import type { Env } from "./env";
import { type LandmarkMats, useLandmarkMats } from "./landmark-kit";
import { Alcatraz, Ballpark, Church, CityHall, CoitTower, FerryBuilding, SF, SalesforceTower } from "./sf-buildings";
import { BayBridge, GoldenGate } from "./bridges";

/*
 * The landmarks around the building, each built from primitives in the same language as the tower: pale stone by
 * day, floodlit after dark. At the scene's scale one unit is about 62 ft, but landmarks are drawn a little larger
 * than life and pulled in toward the horizon (see `sceneLandmarks`) so they read as places, not specks.
 */

const _ray = new THREE.Ray();
const _box = new THREE.Box3();
const _dir = new THREE.Vector3();
const _hit = new THREE.Vector3();
const BIG = { ballpark: 1.35, "city-hall": 1.5 };

/** One landmark, placed and turned. `heading` is the model's long axis (bridges, the Ferry Building) or its front. */
export function LandmarkModel({ l, m, env }: { l: SceneLandmark; m: LandmarkMats; env: Env }) {
  const h = ((l.heading ?? 0) * Math.PI) / 180;
  // Models run along local +z: turning by −h lays that axis on the compass heading
  const along = [0, -h, 0] as const;
  // Models face local +z: turning by π−h faces them along the heading
  const facing = [0, Math.PI - h, 0] as const;
  const at = [l.x, 0, l.z] as const;
  switch (l.kind) {
    case "coit":
      return (
        <group position={at}>
          <CoitTower m={m} />
        </group>
      );
    case "skyscraper":
      return (
        <group position={at}>
          <SalesforceTower env={env} />
        </group>
      );
    case "ferry":
      return (
        <group position={at} rotation={along}>
          <FerryBuilding m={m} env={env} />
        </group>
      );
    case "church":
      return (
        <group position={at} rotation={facing}>
          <Church m={m} env={env} />
        </group>
      );
    case "island":
      return (
        <group position={at} rotation={[0, 0.5, 0]}>
          <Alcatraz m={m} env={env} />
        </group>
      );
    case "bay-bridge":
      return (
        <group position={at} rotation={along}>
          <BayBridge m={m} env={env} />
        </group>
      );
    case "golden-gate":
      return (
        <group position={at} rotation={along}>
          <GoldenGate env={env} />
        </group>
      );
    // These two stand low among the city blocks; drawn larger than life, like the rest, so they clear the rooftops
    case "ballpark":
      return (
        <group position={at} rotation={facing} scale={BIG.ballpark}>
          <Ballpark m={m} env={env} />
        </group>
      );
    case "city-hall":
      return (
        <group position={at} rotation={facing} scale={BIG["city-hall"]}>
          <CityHall m={m} env={env} />
        </group>
      );
  }
}

/** Where a landmark's label floats: just above its highest point */
export function landmarkTop(l: SceneLandmark) {
  const h = {
    coit: 5.05,
    skyscraper: SF.top + SF.crown,
    ferry: 4.6,
    church: 3.45,
    island: 1.7,
    "bay-bridge": 5,
    "golden-gate": 6.4,
    ballpark: 1.9 * BIG.ballpark,
    "city-hall": 3.2 * BIG["city-hall"],
  }[l.kind];
  return new THREE.Vector3(l.x, h + 0.35, l.z);
}

/** The landmarks. Like the city blocks, one standing between the camera and the focus sinks out of the way. */
export function Landmarks({ p, env, focus, sink = true }: { p: TowerProfile; env: Env; focus: RefObject<THREE.Vector3>; sink?: boolean }) {
  const m = useLandmarkMats(env);
  const list = useMemo(() => sceneLandmarks(p), [p]);
  const groups = useRef<(THREE.Group | null)[]>([]);
  const k = useRef(list.map(() => 1));
  useFrame(({ camera }, dt) => {
    const f = focus.current;
    const dist = camera.position.distanceTo(f);
    _ray.set(camera.position, _dir.subVectors(f, camera.position).normalize());
    list.forEach((l, i) => {
      const g = groups.current[i];
      const reach = LANDMARK_REACH[l.kind];
      if (!g || !reach) return;
      const { x, z } = l;
      _box.min.set(x - reach, 0, z - reach);
      _box.max.set(x + reach, landmarkTop(l).y, z + reach);
      const hit = _ray.intersectBox(_box, _hit);
      // When looking out from a floor, the landmarks in front of you are the point: never sink them.
      const blocking = sink && !!hit && camera.position.distanceTo(hit) < dist;
      k.current[i] = THREE.MathUtils.damp(k.current[i], blocking ? 0.03 : 1, blocking ? 5 : 2.5, dt);
      g.scale.y = k.current[i];
    });
  });
  return (
    <>
      {list.map((l, i) => (
        <group
          key={l.name}
          ref={(el) => {
            groups.current[i] = el;
          }}
        >
          <LandmarkModel l={l} m={m} env={env} />
        </group>
      ))}
    </>
  );
}
