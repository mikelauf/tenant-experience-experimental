import type { Room, Setup, Venue } from "./types";

/** Product-wide vocabulary and rules, the same at every building. */

export const setupLabels: Record<Setup, string> = {
  reception: "Reception",
  theater: "Theater",
  banquet: "Banquet",
  boardroom: "Boardroom",
  classroom: "Classroom",
  lounge: "Lounge",
};

export const maxCap = (v: Venue) => Math.max(...Object.values(v.capacities).map((n) => n ?? 0));

export const eventTypes = ["Reception", "Dinner", "Offsite or meeting", "Launch or press", "Holiday party", "Panel or talk", "Something else"];
export const budgets = ["Under $10k", "$10k–$25k", "$25k–$50k", "$50k+", "Not sure yet"];

/** Rough seat count for a setup in a member room. */
export const roomCapacity = (r: Room, s: Setup) => {
  const f: Record<Setup, number> = { boardroom: 1, theater: 1, classroom: 0.6, reception: 1.4, banquet: 0.8, lounge: 0.8 };
  return s === "boardroom" && r.capacity > 14 ? 24 : Math.round(r.capacity * f[s]);
};

/** Bookable member hours, 8am–7pm, in 30 minute steps */
export const roomHours = Array.from({ length: 23 }, (_, i) => 8 * 60 + i * 30);

/** Deterministic "busy" blocks so the time grid looks real. */
export function busyFor(slug: string, day: number): [number, number][] {
  const seed = [...slug].reduce((a, c) => a + c.charCodeAt(0), 0) + day * 7;
  const blocks: [number, number][] = [];
  const starts = [9 * 60, 10.5 * 60, 13 * 60, 14.5 * 60, 16 * 60];
  starts.forEach((s, i) => {
    if ((seed + i * 3) % 3 === 0) blocks.push([s, s + ((seed + i) % 2 ? 60 : 90)]);
  });
  return blocks;
}

/** Minutes from midnight for bookable fitness resource slots */
export const resourceSlots = (kind: "ride" | "recovery") =>
  Array.from({ length: kind === "ride" ? 8 : 12 }, (_, i) => 7 * 60 + i * (kind === "ride" ? 90 : 60)).filter((m) => m < 19 * 60);
