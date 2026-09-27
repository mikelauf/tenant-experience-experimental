"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { LIGHT_LABEL, clock, lightAt, nowIn, sunPosition } from "@/lib/sun";
import { useTenant } from "@/lib/tenants/client";
import { Icon } from "@/components/ui/Icon";

const subscribe = (cb: () => void) => {
  const t = setInterval(cb, 30_000);
  return () => clearInterval(t);
};
/** A long, eased glide down to the tower (Lenis when it's running), not a jump */
function glideTo(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lenis = window.__lenis;
  if (lenis) lenis.scrollTo(el, reduce ? { immediate: true } : { duration: 1.8, easing: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2) });
  else el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  history.replaceState(null, "", `#${id}`);
}

/**
 * The building right now: the time where it stands and what the light is doing, from the real sun. It glides to the
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

  return (
    <a
      href="#explore"
      onClick={(e) => {
        e.preventDefault();
        glideTo("explore");
      }}
      className="group flex min-h-11 items-center justify-between gap-3 bg-night/30 px-4 py-3 text-[0.8125rem] transition-colors hover:bg-night/45">
      <span className={cn("flex min-w-0 items-center transition-opacity duration-700", now ? "opacity-100" : "opacity-0")}>
        <span className="truncate text-moon/90">
          <span className="font-medium text-moon">{now ? clock(now.minutes) : "—"}</span> in {building.city}
          {light && <span className="text-moon-2"> · {LIGHT_LABEL[light]}</span>}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1 font-medium text-moon/90 group-hover:text-moon">
        See it live
        <Icon name="chevron-down" size={14} className="transition-transform group-hover:translate-y-0.5" />
      </span>
    </a>
  );
}
