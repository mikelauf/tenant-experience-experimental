"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { bearingDir } from "@/lib/tower";
import { mixEnv, type Env } from "./env";

/** The sky behind the tower: its gradient and fog by the hour, and the sun where it really stands. */

/** The real sun: how high it stands and where (degrees clockwise from true north). */
export type SunSky = { elevation: number; azimuth: number };

const _sunDir = new THREE.Vector3();
const GOLD = new THREE.Color("#ffab66");
const GOLD_FOG = new THREE.Color("#5a4a52");

/** Scene direction toward the sun, on the street grid turned by `north`. */
function sunDirection(sky: SunSky, north = 0, out = _sunDir) {
  const [dx, dz] = bearingDir(sky.azimuth, north);
  const el = sky.elevation * THREE.MathUtils.DEG2RAD;
  return out.set(dx * Math.cos(el), Math.sin(el), dz * Math.cos(el)).normalize();
}

/**
 * Eases the light toward the requested sun and applies it to the fog and lights. With a real `sky`, the key
 * light comes from where the sun actually is (fading back to the keyframe's once it's well down), and the
 * shadow box widens as the sun lowers so long evening shadows aren't cut off.
 */
export function Sky({ sun, env, sky, north }: { sun: number; env: Env; sky?: SunSky | null; north?: number }) {
  const { scene } = useThree();
  const hemi = useRef<THREE.HemisphereLight>(null);
  const dir = useRef<THREE.DirectionalLight>(null);
  const real = useRef(new THREE.Vector3());
  const k = useRef(0);
  const g = useRef(0);
  useFrame((_, dt) => {
    const v = THREE.MathUtils.damp(env.value, sun, 3, dt);
    mixEnv(Math.abs(v - sun) < 0.001 ? sun : v, env);
    const e = env;
    // Golden hour: the sun low and warm, raking across the city, with a little warmth in the haze
    const gold = sky ? THREE.MathUtils.clamp(1 - Math.abs(sky.elevation - 2) / 8, 0, 1) : 0;
    g.current = THREE.MathUtils.damp(g.current, gold, 3, dt);
    if (g.current > 0.001) {
      e.sun.lerp(GOLD, g.current * 0.8);
      e.sunI += g.current * 0.9;
      e.fog.lerp(GOLD_FOG, g.current * 0.35);
    }
    if (scene.fog instanceof THREE.Fog) scene.fog.color.copy(e.fog);
    if (hemi.current) {
      hemi.current.color.copy(e.sky);
      hemi.current.groundColor.copy(e.skyGround);
      hemi.current.intensity = e.hemi;
    }
    const d = dir.current;
    if (d) {
      d.color.copy(e.sun);
      d.intensity = e.sunI;
      // How much the real sun leads: fully while it's up, fading out through dusk
      const want = sky ? THREE.MathUtils.clamp((sky.elevation + 6) / 8, 0, 1) : 0;
      k.current = THREE.MathUtils.damp(k.current, want, 3, dt);
      if (sky) {
        const s = sunDirection(sky, north);
        // Keep the light a little above the horizon, so a setting sun still rakes across the city instead of under it
        real.current.set(s.x * 18, Math.max(s.y * 18, 1.6), s.z * 18);
      }
      d.position.copy(e.sunPos).lerp(real.current, k.current);
      const low = sky && sky.elevation < 25 ? 1 - Math.max(0, sky.elevation) / 25 : 0;
      const cam = d.shadow.camera;
      const w = 8 + low * 8 * k.current;
      if (Math.abs(cam.right - w) > 0.05) {
        cam.left = -w;
        cam.right = w;
        cam.top = 14 + low * 4;
        cam.bottom = -4 - low * 6;
        cam.far = 80;
        cam.updateProjectionMatrix();
      }
    }
  });
  const e = env;
  return (
    <>
      <fog attach="fog" args={[e.fog, 30, 80]} />
      <hemisphereLight ref={hemi} args={[e.sky, e.skyGround, e.hemi]} />
      <directionalLight
        ref={dir}
        position={e.sunPos}
        intensity={e.sunI}
        color={e.sun}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={14}
        shadow-camera-bottom={-4}
      />
    </>
  );
}

/** A soft sun on the horizon, where the real one is, while it's low: the golden-hour glow behind the city. */
export function SunDisc({ sky, north }: { sky: SunSky; north?: number }) {
  const ref = useRef<THREE.Sprite>(null);
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, "rgba(255,244,214,1)");
    r.addColorStop(0.12, "rgba(255,214,150,0.95)");
    r.addColorStop(0.35, "rgba(255,160,90,0.35)");
    r.addColorStop(1, "rgba(255,120,60,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  const pos = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dt) => {
    const sp = ref.current;
    if (!sp) return;
    const s = sunDirection(sky, north, pos);
    sp.position.set(s.x * 70, Math.max(-2, s.y * 70) + 1, s.z * 70);
    // Brightest just above the horizon; gone once it's high or well down
    const want = sky.elevation > 18 || sky.elevation < -3 ? 0 : 1 - Math.abs(sky.elevation - 3) / 15;
    const m = sp.material;
    m.opacity = THREE.MathUtils.damp(m.opacity, Math.max(0, want), 3, dt);
    sp.visible = m.opacity > 0.01;
  });
  return (
    <sprite ref={ref} scale={[22, 22, 1]}>
      <spriteMaterial map={tex} transparent opacity={0} depthWrite={false} fog={false} blending={THREE.AdditiveBlending} />
    </sprite>
  );
}

/* ------------------------------------------------------------------ tower */
