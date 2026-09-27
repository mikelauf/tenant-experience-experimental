"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { LIGHT_LABEL, clock, eveningOf, lightAt, nowIn, sunPosition, type Light } from "@/lib/sun";
import { useTenant } from "@/lib/tenants/client";
import { Icon } from "@/components/ui/Icon";

const subscribe = (cb: () => void) => {
  const t = setInterval(cb, 30_000);
  return () => clearInterval(t);
};
const DOT: Record<Light, string> = { day: "bg-[#f3c969]", golden: "bg-accent-glow", dusk: "bg-[#9d8cf0]", night: "bg-moon" };

/**
 * The building right now: the time where it stands and what the light is doing, from the real sun. It leads to the
 * 3D tower below, which is lit the same way. The clock is only known in the browser, so the row holds its height
 * and fades its words in once it is.
 */
export function LiveNow() {
  const { tower, building } = useTenant();
  const geo = tower.geo;
  const minute = useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / 60_000),
    () => 0,
  );
  if (!geo) return null;

  const now = minute ? nowIn(geo.tz, new Date(minute * 60_000)) : null;
  const light = now ? lightAt(sunPosition(new Date(minute * 60_000), geo).elevation) : null;
  const eve = now ? eveningOf(now.date, geo) : null;
  const m = now?.minutes ?? 0;
  // What's worth saying about the light, by where the day is
  const note =
    !eve || light == null
      ? ""
      : light === "golden" && eve.sunset
        ? `sunset ${clock(eve.sunset)}`
        : light === "day" && eve.golden && m < eve.golden && m >= 12 * 60
          ? `golden hour from ${clock(eve.golden)}`
          : light === "day" && eve.sunset
            ? `sunset ${clock(eve.sunset)}`
            : "";

  return (
    <a href="#explore" className="group flex min-h-11 items-center justify-between gap-3 bg-night/30 px-4 py-3 text-[0.8125rem] transition-colors hover:bg-night/45">
      <span className={cn("flex min-w-0 items-center gap-2.5 transition-opacity duration-700", now ? "opacity-100" : "opacity-0")}>
        <span className="relative flex size-2 shrink-0">
          {light && <span className={cn("absolute inset-0 rounded-full opacity-60 motion-safe:animate-ping", DOT[light])} />}
          <span className={cn("relative size-2 rounded-full", light ? DOT[light] : "bg-moon/40")} />
        </span>
        <span className="truncate text-moon/90">
          {/* The hero already names the city; with a sunset to mention, the row keeps to the time */}
          <span className="font-medium text-moon">{now ? clock(now.minutes) : "—"}</span>
          {!note && ` in ${building.city}`}
          {light && ` · ${LIGHT_LABEL[light]}`}
          {note && <span className="text-moon-2"> · {note}</span>}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1 font-medium text-moon/90 group-hover:text-moon">
        See it live
        <Icon name="chevron-down" size={14} className="transition-transform group-hover:translate-y-0.5" />
      </span>
    </a>
  );
}
