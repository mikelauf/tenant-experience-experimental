import { classSeats } from "./commit";
import { busyFor } from "./data/shared";
import type { ClassSession, Commitment } from "./data/types";
import type { DemoState } from "./store";
import type { Tenant } from "./tenants";
import { addMin, dayKey, fmtTime } from "./time";

/**
 * What's happening on every floor of a building at a given moment: the model behind
 * Live Building. Pure and deterministic, so scrubbing through a day is just calling it again.
 */

export type ItemStatus = "mine" | "live" | "soon" | "open" | "full";

export type FloorItem = {
  key: string;
  kind: "class" | "room" | "event" | "gym" | "yours";
  title: string;
  detail: string;
  status: ItemStatus;
  href: string;
  /** For classes, so the floor sheet can reserve inline */
  session?: ClassSession;
};

export type FloorStatus = {
  level: number;
  label: string;
  place: string;
  items: FloorItem[];
  /** The floor's headline state, for its band of light */
  tone: "mine" | "event" | "open" | "full" | "quiet";
  live: boolean;
};

const minOf = (iso: string) => {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
};
const sameDay = (iso: string, day: Date) => new Date(iso).toDateString() === day.toDateString();

/** Minutes after `at` that still count as "coming up" */
const SOON = 150;

/** Where a commitment happens, by level: from its source when known, else parsed from "· L27" / "Level 6" */
export function commitmentLevel(t: Tenant, c: Commitment): number | null {
  if (c.kind === "class" || c.kind === "resource" || c.kind === "training") return t.fitness?.level ?? null;
  if (c.kind === "room") return t.room(c.refId)?.level ?? null;
  if (c.kind === "event") return t.eventBySlug(c.refId)?.level ?? null;
  const m = c.place.match(/(?:L|Level )(\d+)/);
  return m ? Number(m[1]) : null;
}

export function buildingAt(t: Tenant, s: DemoState, day: Date, at: number): FloorStatus[] {
  const weekend = day.getDay() === 0 || day.getDay() === 6;
  const offset = Math.round((day.getTime() - new Date(new Date().toDateString()).getTime()) / 86400000);
  const floors = new Map<number, FloorStatus>();
  const floor = (level: number) => {
    let f = floors.get(level);
    if (!f) {
      const l = t.levels.find((x) => x.n === level);
      f = { level, label: l?.label ?? `L${level}`, place: l?.place ?? `Level ${level}`, items: [], tone: "quiet", live: false };
      floors.set(level, f);
    }
    return f;
  };

  // Your own plans that day, while they're on or within the hour before
  const mine = s.commitments.filter((c) => c.status !== "cancelled" && sameDay(c.startsAt, day));
  for (const c of mine) {
    const lvl = commitmentLevel(t, c);
    if (lvl == null) continue;
    const a = minOf(c.startsAt);
    const b = minOf(c.endsAt);
    if (at < a - 60 || at >= b) continue;
    floor(lvl).items.push({
      key: `mine-${c.id}`,
      kind: "yours",
      title: c.title,
      detail: at >= a ? `You're here now · until ${fmtTime(c.endsAt)}` : `You · ${fmtTime(c.startsAt)}${c.status === "waitlist" ? " · waitlist" : ""}`,
      status: "mine",
      href: "/plans",
    });
  }

  // Fitness: the class on now or next, and open gym otherwise
  if (t.fitness) {
    const f = t.fitness;
    const sessions = t.sessionsFor(day);
    const now = sessions.find((c) => at >= minOf(c.startsAt) && at < minOf(c.startsAt) + t.template(c.kind).durationMin);
    const next = sessions.find((c) => minOf(c.startsAt) > at && minOf(c.startsAt) - at <= SOON);
    for (const c of [now, next]) {
      if (!c || mine.some((m) => m.refId === c.id)) continue;
      const tpl = t.template(c.kind);
      const seats = classSeats(t, s, c);
      floor(f.level).items.push({
        key: c.id,
        kind: "class",
        title: tpl.name,
        detail:
          c === now
            ? `On now · ends ${fmtTime(addMin(c.startsAt, tpl.durationMin))}`
            : `${fmtTime(c.startsAt)} · ${seats.full ? "full, waitlist open" : `${seats.left} spots left`}`,
        status: c === now ? "live" : seats.full ? "full" : "soon",
        href: `/fitness/schedule?class=${encodeURIComponent(c.id)}`,
        session: c,
      });
    }
    if (at >= 6 * 60 && at < 21 * 60 && !now)
      floor(f.level).items.push({ key: "gym", kind: "gym", title: "Open gym", detail: "Until 9pm · members", status: "open", href: "/fitness" });
  }

  // Meeting rooms: free right now, and until when
  if (t.building.services.spaces && !weekend && at >= 8 * 60 && at < 19 * 60) {
    for (const r of t.rooms) {
      if (mine.some((m) => m.kind === "room" && m.refId === r.slug && at >= minOf(m.startsAt) - 60 && at < minOf(m.endsAt))) continue;
      const busy = busyFor(r.slug, offset);
      const now = busy.find(([a, b]) => at >= a && at < b);
      const nextBusy = busy.filter(([a]) => a > at).sort((x, y) => x[0] - y[0])[0];
      const slot = Math.ceil(at / 30) * 30;
      const q = new URLSearchParams({ day: dayKey(day), start: String(slot) });
      floor(r.level).items.push({
        key: r.slug,
        kind: "room",
        title: `${r.name} · up to ${r.capacity}`,
        detail: now
          ? `In use until ${fmtTime(new Date(day.getTime() + now[1] * 60000).toISOString())}`
          : nextBusy
            ? `Free until ${fmtTime(new Date(day.getTime() + nextBusy[0] * 60000).toISOString())}`
            : "Free the rest of the day",
        status: now ? "full" : "open",
        href: `/spaces/${r.slug}?${q}`,
      });
    }
  }

  // Building events: on now, or coming up soon
  if (t.building.services.programming) {
    for (const e of t.events()) {
      if (!sameDay(e.startsAt, day) || mine.some((m) => m.kind === "event" && m.refId === e.slug)) continue;
      const a = minOf(e.startsAt);
      const b = a + e.durationMin;
      if (at >= b || a - at > SOON * 2) continue;
      const full = e.going >= e.capacity;
      floor(e.level).items.push({
        key: e.slug,
        kind: "event",
        title: e.name,
        detail:
          at >= a
            ? `On now · until ${fmtTime(addMin(e.startsAt, e.durationMin))}`
            : `${fmtTime(e.startsAt)} · ${full ? "full, waitlist open" : `${e.capacity - e.going} spots`}`,
        status: at >= a ? "live" : full ? "full" : "soon",
        href: `/programming/${e.slug}`,
      });
    }
  }

  // Each floor's headline, in order of what matters to you
  for (const f of floors.values()) {
    const has = (st: ItemStatus, kind?: FloorItem["kind"]) => f.items.some((i) => i.status === st && (!kind || i.kind === kind));
    f.live = has("live") || f.items.some((i) => i.status === "mine" && i.detail.startsWith("You're here"));
    f.tone = has("mine")
      ? "mine"
      : has("live", "event") || has("soon", "event")
        ? "event"
        : f.items.some((i) => i.status === "open" || i.status === "soon" || i.status === "live")
          ? "open"
          : f.items.length
            ? "full"
            : "quiet";
    const order: Record<ItemStatus, number> = { mine: 0, live: 1, soon: 2, open: 3, full: 4 };
    f.items.sort((a, b) => order[a.status] - order[b.status]);
  }

  // Top of the building first, like an elevator directory
  return [...floors.values()].filter((f) => f.items.length).sort((a, b) => b.level - a.level);
}

/** Pins for the tower: everything you have booked that day, with its time */
export function pinsFor(t: Tenant, s: DemoState, day: Date) {
  return s.commitments
    .filter((c) => c.status !== "cancelled" && sameDay(c.startsAt, day))
    .map((c) => ({ level: commitmentLevel(t, c), label: `You · ${fmtTime(c.startsAt)} ${c.title.split(" · ")[0]}`, at: minOf(c.startsAt) }))
    .filter((p): p is { level: number; label: string; at: number } => p.level != null);
}

/** Daylight for a minute of the day: 0 night · 0.5 dusk · 1 day */
export function sunAt(m: number) {
  const ramp = (x: number, a: number, b: number) => Math.min(1, Math.max(0, (x - a) / (b - a)));
  if (m < 12 * 60) return 0.1 + 0.9 * ramp(m, 5.5 * 60, 7.5 * 60);
  if (m < 19 * 60 + 30) return 1 - 0.5 * ramp(m, 17.5 * 60, 19.5 * 60);
  return 0.5 - 0.4 * ramp(m, 19.5 * 60, 21 * 60);
}
