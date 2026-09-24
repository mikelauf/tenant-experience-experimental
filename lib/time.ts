/** All demo dates are relative to "today", so the prototype always looks current. */

export function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function at(dayOffset: number, minutes: number) {
  const d = startOfDay();
  d.setDate(d.getDate() + dayOffset);
  d.setMinutes(minutes);
  return d.toISOString();
}

export const addMin = (iso: string, m: number) => new Date(new Date(iso).getTime() + m * 60000).toISOString();

export const dayKey = (d: Date | string) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

export const dayDiff = (iso: string) => Math.round((startOfDay(new Date(iso)).getTime() - startOfDay().getTime()) / 86400000);

export function fmtTime(iso: string | number) {
  const d = typeof iso === "number" ? minToDate(iso) : new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(":00", "").replace(" ", " ").toLowerCase();
}

export const fmtRange = (a: string, b: string) => `${fmtTime(a)}–${fmtTime(b)}`;

export function fmtDay(iso: string, opts: { relative?: boolean } = { relative: true }) {
  const diff = dayDiff(iso);
  if (opts.relative && diff === 0) return "Today";
  if (opts.relative && diff === 1) return "Tomorrow";
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export const fmtLongDay = (iso: string) => new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

export const fmtMonth = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric" });

function minToDate(m: number) {
  const d = startOfDay();
  d.setMinutes(m);
  return d;
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

/** Next 7 days, starting today */
export const week = () =>
  Array.from({ length: 7 }, (_, i) => {
    const d = startOfDay();
    d.setDate(d.getDate() + i);
    return d;
  });
