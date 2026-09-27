import type { Setup, SetupSpec } from "./data/types.ts";
import { minutesOf } from "./sun.ts";

/** The most venues one brief compares, the same as one inquiry. */
export const BRIEF_MAX = 5;

type VenueLike = { slug: string; layout?: { setups: Partial<Record<Setup, SetupSpec>> } };

/** One venue in a brief: its setup and guest count, fitted to what that venue offers. */
export type BriefVenue = { slug: string; setup?: Setup; guests?: number };

export type Brief = { venues: BriefVenue[]; guests?: number; date?: string; time?: string };

/**
 * An event brief from its link: `?v=sky-bar,bay-lounge&setup=banquet&guests=60&date=2026-10-12&time=19:00`.
 * Venue content only, never contact details. Unknown venues, dates and times are dropped. The setup applies to
 * each venue that offers it, and the guest count is clamped to what each venue's setup holds, so one link can
 * compare rooms honestly. Framework-free, so the page, its link card and the tests share it.
 */
export function readBrief(q: URLSearchParams, all: VenueLike[]): Brief {
  const slugs = [...new Set((q.get("v") ?? "").split(",").map((s) => s.trim()))].filter((s) => all.some((x) => x.slug === s)).slice(0, BRIEF_MAX);
  const n = Number.parseInt(q.get("guests") ?? "", 10);
  const guests = Number.isFinite(n) && n > 0 ? Math.min(n, 100_000) : undefined;
  const asked = q.get("setup") as Setup | null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(q.get("date") ?? "") && !Number.isNaN(Date.parse(q.get("date")!)) ? q.get("date")! : undefined;
  const t = q.get("time") ?? "";
  const time = minutesOf(t) != null ? t : undefined;

  const venues = slugs.map((slug): BriefVenue => {
    const setups = all.find((x) => x.slug === slug)!.layout?.setups ?? {};
    const keys = Object.keys(setups) as Setup[];
    if (!keys.length) return { slug, guests };
    // The asked-for setup where the venue has it; otherwise the venue's own setup that fits the crowd best
    const fits = (s: Setup) => guests == null || setups[s]!.max >= guests;
    const setup = asked && setups[asked] ? asked : (keys.find(fits) ?? keys.reduce((a, b) => (setups[b]!.max > setups[a]!.max ? b : a)));
    const spec = setups[setup]!;
    const lo = spec.min ?? Math.min(10, spec.max);
    return { slug, setup, guests: guests == null ? undefined : Math.max(lo, Math.min(spec.max, guests)) };
  });
  return { venues, guests, date, time };
}

/** The link for a brief. */
export function briefHref(b: { venues: string[]; setup?: Setup; guests?: number; date?: string; time?: string }) {
  const q = new URLSearchParams({ v: b.venues.join(",") });
  if (b.setup) q.set("setup", b.setup);
  if (b.guests) q.set("guests", String(b.guests));
  if (b.date) q.set("date", b.date);
  if (b.time) q.set("time", b.time);
  // Commas and colons read fine in a link, and keep it tidy when pasted
  return `/venues/brief?${q.toString().replace(/%2C/g, ",").replace(/%3A/g, ":")}`;
}
