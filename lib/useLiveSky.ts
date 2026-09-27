"use client";

import { useMemo, useSyncExternalStore } from "react";
import { withLight } from "./light";
import { lightAt, nowIn, sunLevel, sunPosition, type Light } from "./sun";
import { useTenant } from "./tenants/client";

const subscribe = (cb: () => void) => {
  const t = setInterval(cb, 30_000);
  return () => clearInterval(t);
};

/**
 * The building's sky right now, from the real sun where it stands. The clock is only known in the browser, so the
 * server (and the first paint) gets dusk, and the real sky takes over on arrival.
 */
export function useLiveSky() {
  const { tower } = useTenant();
  const minute = useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / 60_000),
    () => 0,
  );
  const keys = useMemo(() => withLight(tower.light), [tower.light]);
  const geo = tower.geo;
  if (!geo || !minute) return { ready: false, now: null, sunSky: null, sun: 0.55, light: "dusk" as Light, keys };
  const at = new Date(minute * 60_000);
  const sunSky = sunPosition(at, geo);
  return { ready: true, now: nowIn(geo.tz, at), sunSky, sun: sunLevel(sunSky.elevation), light: lightAt(sunSky.elevation), keys };
}
