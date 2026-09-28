/**
 * All demo dates are relative to "today", so the prototype always looks current.
 *
 * "Today", days and clock times are the building's own (San Francisco), never the machine's: the server
 * (UTC on Vercel) and a browser anywhere else then build the same schedule and print the same times, so pages
 * hydrate cleanly and a 7am class reads 7am for everyone, the way the building's own calendar would show it.
 */
import { nowIn, zonedTime } from "./sun.ts";

/** The building's time zone (the Pyramid's `geo.tz`; the demo's other building borrows it) */
export const ZONE = "America/Los_Angeles";

const pad = (n: number) => String(n).padStart(2, "0");
const parts = (d: Date) => {
  const [y, m, day] = nowIn(ZONE, d).date.split("-").map(Number);
  return { y, m, day };
};
/** The building's wall-clock date `y-m-d` (any overflow rolls over) at `minutes` after midnight, as an instant */
const wall = (y: number, m: number, day: number, minutes = 0) => {
  const n = new Date(Date.UTC(y, m - 1, day));
  return zonedTime(`${n.getUTCFullYear()}-${pad(n.getUTCMonth() + 1)}-${pad(n.getUTCDate())}`, `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`, ZONE);
};

/** Date parts as the building sees them: weekday (0 = Sunday), day of the month, hour, minutes after midnight */
export function zoned(d: Date | string | number) {
  const x = new Date(d);
  const { y, m, day } = parts(x);
  const minutes = nowIn(ZONE, x).minutes;
  return { year: y, month: m, day, weekday: new Date(Date.UTC(y, m - 1, day)).getUTCDay(), hour: Math.floor(minutes / 60), minutes };
}

/** `toLocaleDateString`/`toLocaleTimeString` in the building's zone */
export const fmtDate = (d: Date | string | number, opts: Intl.DateTimeFormatOptions) => new Date(d).toLocaleString("en-US", { ...opts, timeZone: ZONE });

export function startOfDay(d: Date | string | number = new Date()) {
  const { y, m, day } = parts(new Date(d));
  return wall(y, m, day);
}

export function at(dayOffset: number, minutes: number) {
  const { y, m, day } = parts(new Date());
  return wall(y, m, day + dayOffset, minutes).toISOString();
}

/** `minutes` after the building's midnight on the day `d` falls on, as an ISO instant */
export function onDay(d: Date | string, minutes: number) {
  const { y, m, day } = parts(new Date(d));
  return wall(y, m, day, minutes).toISOString();
}

export const addMin = (iso: string, m: number) => new Date(new Date(iso).getTime() + m * 60000).toISOString();

export const dayKey = (d: Date | string) => nowIn(ZONE, new Date(d)).date;

const dayNumber = (d: Date | string | number) => {
  const { y, m, day } = parts(new Date(d));
  return Date.UTC(y, m - 1, day) / 86400000;
};
export const dayDiff = (iso: string) => dayNumber(iso) - dayNumber(Date.now());

export function fmtTime(iso: string | number) {
  const d = typeof iso === "number" ? minToDate(iso) : new Date(iso);
  return fmtDate(d, { hour: "numeric", minute: "2-digit" }).replace(":00", "").replace(" ", " ").toLowerCase();
}

export const fmtRange = (a: string, b: string) => `${fmtTime(a)}–${fmtTime(b)}`;

export function fmtDay(iso: string, opts: { relative?: boolean } = { relative: true }) {
  const diff = dayDiff(iso);
  if (opts.relative && diff === 0) return "Today";
  if (opts.relative && diff === 1) return "Tomorrow";
  return fmtDate(iso, { weekday: "short", month: "short", day: "numeric" });
}

export const fmtLongDay = (iso: string) => fmtDate(iso, { weekday: "long", month: "long", day: "numeric" });

export const fmtMonth = (iso: string) => fmtDate(iso, { month: "long", year: "numeric" });

function minToDate(m: number) {
  const { y, m: mo, day } = parts(new Date());
  return wall(y, mo, day, m);
}

/** "in 2h 10m", "in 3 days", "now" */
export function until(iso: string, now = Date.now()) {
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return "now";
  const m = Math.round(ms / 60000);
  if (m < 60) return `in ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `in ${h}h${m % 60 ? ` ${m % 60}m` : ""}`;
  const d = Math.round(h / 24);
  return `in ${d} day${d > 1 ? "s" : ""}`;
}

/** The next `n` days from today (a week unless asked), each at the building's midnight */
export const week = (n = 7) => {
  const { y, m, day } = parts(new Date());
  return Array.from({ length: n }, (_, i) => wall(y, m, day + i));
};
