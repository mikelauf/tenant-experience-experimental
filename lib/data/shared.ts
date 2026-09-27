import type { Room, Setup, Venue } from "./types";

/** Product-wide vocabulary and rules, the same at every building. */

export const setupLabels: Record<Setup, string> = {
  reception: "Reception",
  theater: "Theater",
  banquet: "Banquet",
  boardroom: "Boardroom",
  classroom: "Classroom",
  lounge: "Lounge",
  concert: "Concert",
};

/** What each setup looks like, in a line */
export const setupNotes: Record<Setup, string> = {
  reception: "Standing, with high-tops and a bar",
  theater: "Rows facing the stage or screen",
  banquet: "Rounds of eight for a seated meal",
  boardroom: "One long table",
  classroom: "Tables in rows, facing forward",
  lounge: "Sofa groups for conversation",
  concert: "A standing crowd facing the stage",
};

/** The most guests a venue holds, or undefined while it isn't confirmed. */
export const maxCap = (v: Venue): number | undefined => v.capacity;

/** The venue's qualified wording when it has one, else "Up to 1,000 guests". */
export const guestsLabel = (v: Venue) => v.capacityNote ?? (v.capacity ? `Up to ${v.capacity.toLocaleString("en-US")} guests` : "Capacity on request");

/** The compact form, for meta lines: "up to 130", or "varies by setup". */
export const guestsShort = (v: Venue) => (v.capacity ? `up to ${v.capacity.toLocaleString("en-US")}` : (v.capacityNote ?? "capacity on request").toLowerCase());

export const eventTypes = ["Reception", "Dinner", "Offsite or meeting", "Launch or press", "Holiday party", "Panel or talk", "Something else"];
export const budgets = ["Under $10k", "$10k–$25k", "$25k–$50k", "$50k+", "Not sure yet"];

/** Rough seat count for a setup in a member room. */
export const roomCapacity = (r: Room, s: Setup) => {
  const f: Record<Setup, number> = { boardroom: 1, theater: 1, classroom: 0.6, reception: 1.4, banquet: 0.8, lounge: 0.8, concert: 1.6 };
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
