import type { Setup, SetupSpec } from "../data/types.ts";

/** Camera views a shared link can hold: the three presets, or standing at the window looking out. */
export const SPACE_VIEWS = ["overview", "close", "top", "window"] as const;
export type SpaceView = (typeof SPACE_VIEWS)[number];

export type SpaceState = { setup: Setup; guests: number; view: SpaceView };

/** The fewest guests a setup offers on its slider. */
export const minGuests = (spec: SetupSpec) => spec.min ?? Math.min(10, spec.max);

/**
 * A venue's "The space" state from a link (`?setup=banquet&guests=64&view=top`). Anything unknown or out
 * of range falls back: an unknown setup to the first, guests clamped to the setup's range, an unknown view
 * to the close-up. Framework-free, so the brief page and the tests share it.
 */
export function readSpace(q: URLSearchParams, setups: Partial<Record<Setup, SetupSpec>>, fallback?: Setup): SpaceState | null {
  const keys = Object.keys(setups) as Setup[];
  if (!keys.length) return null;
  const asked = q.get("setup") as Setup | null;
  const setup = asked && setups[asked] ? asked : fallback && setups[fallback] ? fallback : keys[0];
  const spec = setups[setup]!;
  const n = Number.parseInt(q.get("guests") ?? "", 10);
  const guests = Number.isFinite(n) ? Math.min(spec.max, Math.max(minGuests(spec), n)) : spec.max;
  const v = q.get("view") as SpaceView | null;
  const view = v && (SPACE_VIEWS as readonly string[]).includes(v) ? v : "close";
  return { setup, guests, view };
}

/** The query string for a space state; the close-up is the default and stays out of the link. */
export function spaceQuery(s: SpaceState) {
  const q = new URLSearchParams({ setup: s.setup, guests: String(s.guests) });
  if (s.view !== "close") q.set("view", s.view);
  return q.toString();
}
