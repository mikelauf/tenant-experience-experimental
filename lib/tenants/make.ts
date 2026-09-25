import { at, dayKey, week } from "@/lib/time";
import type { ClassSession } from "@/lib/data/types";
import type { Tenant, TenantData } from "./types";

const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

/** Adds the lookups every screen needs to a building's raw content. */
export function makeTenant(d: TenantData): Tenant {
  const f = d.fitness;

  const sessionsFor = (day: Date): ClassSession[] => {
    if (!f) return [];
    const slots = f.weekly[day.getDay()] ?? [];
    const offset = Math.round((day.getTime() - week()[0].getTime()) / 86400000);
    return slots.map(([kind, min, coachId]) => {
      const id = `${dayKey(day)}-${kind}-${min}`;
      const cap = f.templates[kind].capacity;
      const h = hash(id);
      const full = kind === f.full[0] && min === f.full[1];
      const taken = full ? cap : Math.min(cap - 1, Math.floor(cap * 0.35) + (h % Math.ceil(cap * 0.6)));
      return { id, kind, coachId, startsAt: at(offset, min), taken, waitlist: full ? 2 + (h % 3) : 0 };
    });
  };

  const person = (id: string) => d.people.find((p) => p.id === id) ?? d.people[0];

  return {
    ...d,
    person,
    lead: person(d.leadId),
    venue: (slug) => d.venues.find((v) => v.slug === slug),
    room: (slug) => d.rooms.find((r) => r.slug === slug),
    eventBySlug: (slug) => d.events().find((e) => e.slug === slug),
    sessionsFor,
    template: (kind) => f!.templates[kind],
  };
}
