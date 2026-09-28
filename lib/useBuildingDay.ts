"use client";

import { useTenant } from "./tenants/client";
import type { DayScene } from "./tenants/types";
import { useLiveSky } from "./useLiveSky";

/**
 * The building's day as the member Home tells it: which part of the day it is where the building stands (from its
 * clock and the real sun), and the photo for it. Nothing shows until the browser knows the time.
 */
export function useBuildingDay() {
  const t = useTenant();
  const sky = useLiveSky();
  const geo = t.tower.geo;

  let at: DayScene = "golden";
  if (sky.ready && sky.now && geo) {
    const weekday = new Date(`${sky.now.date}T12:00:00`).getDay();
    const weekend = weekday === 0 || weekday === 6;
    at =
      weekend && sky.light === "day"
        ? "weekend"
        : sky.light === "night"
          ? "night"
          : sky.light === "golden" || sky.light === "dusk"
            ? "golden"
            : sky.now.minutes < 11 * 60
              ? "morning"
              : "midday";
  }

  const scenes = t.copy.day ?? [];
  const scene = scenes.find((x) => x.at === at) ?? scenes.find((x) => x.at === "golden") ?? null;
  return { ready: sky.ready, sky, at, scene };
}
