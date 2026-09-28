"use client";

import { classSeats } from "./commit";
import { useDemo } from "./store";
import { clock, eveningOf, nowIn } from "./sun";
import { useTenant } from "./tenants/client";
import type { DayScene } from "./tenants/types";
import { useLiveSky } from "./useLiveSky";
import { fmtTime } from "./time";

export type NowItem = { key: string; text: string; href?: string };

/**
 * The building's day as the member Home tells it: which part of the day it is where the building stands (from its
 * clock and the real sun), the photo for it, and a few true things about right now: the next class with room in it,
 * what's on later today, and when the sun sets. Nothing shows until the browser knows the time.
 */
export function useBuildingDay() {
  const t = useTenant();
  const s = useDemo();
  const sky = useLiveSky();
  const geo = t.tower.geo;

  let at: DayScene = "golden";
  const items: NowItem[] = [];
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

    const now = sky.ms;
    if (t.fitness) {
      const next = t
        .sessionsFor(new Date(now))
        .filter((c) => new Date(c.startsAt).getTime() > now)
        .map((c) => ({ c, seats: classSeats(t, s, c) }))
        .find((x) => !x.seats.full);
      if (next) {
        const name = t.template(next.c.kind).name;
        items.push({
          key: "class",
          text: `${name} at ${fmtTime(next.c.startsAt)} · ${next.seats.left} ${next.seats.left === 1 ? "spot" : "spots"} left`,
          href: `/fitness/schedule?class=${next.c.id}`,
        });
      }
    }
    if (t.building.services.programming) {
      // Today and after now, by the building's own calendar
      const today = t.events().find((e) => nowIn(geo.tz, new Date(e.startsAt)).date === sky.now!.date && new Date(e.startsAt).getTime() > now);
      if (today) {
        const evening = nowIn(geo.tz, new Date(today.startsAt)).minutes >= 17 * 60;
        items.push({ key: "event", text: `${evening ? "Tonight" : "Later"}: ${today.name}, ${fmtTime(today.startsAt)}`, href: `/programming/${today.slug}` });
      }
    }
    const eve = eveningOf(sky.now.date, geo);
    if (eve.sunset != null && sky.now.minutes < eve.sunset) items.push({ key: "sun", text: `Sunset ${clock(eve.sunset)}` });
    else if (eve.dark != null && sky.now.minutes < eve.dark) items.push({ key: "sun", text: `Dusk until ${clock(eve.dark)}` });
  }

  const scenes = t.copy.day ?? [];
  const scene = scenes.find((x) => x.at === at) ?? scenes.find((x) => x.at === "golden") ?? null;
  return { ready: sky.ready, sky, at, scene, items };
}
