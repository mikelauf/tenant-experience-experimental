"use client";

import { addMin, fmtDay, fmtTime } from "./time";
import { classTemplates } from "./data/fitness";
import { person } from "./data/building";
import type { BuildingEvent, ClassSession, Commitment, Resource, Room } from "./data/types";
import { actions, type DemoState } from "./store";

/** Seats taken including this person's own booking */
export function classSeats(s: DemoState, c: ClassSession) {
  const mine = s.commitments.find((x) => x.kind === "class" && x.refId === c.id && x.status !== "cancelled");
  const cap = classTemplates[c.kind].capacity;
  const taken = c.taken + (mine?.status === "confirmed" ? 1 : 0);
  return { cap, taken, left: Math.max(0, cap - taken), full: c.taken >= cap, mine };
}

export function reserveClass(c: ClassSession, waitlist: boolean) {
  const t = classTemplates[c.kind];
  actions.add(
    {
      kind: "class",
      refId: c.id,
      title: t.name,
      startsAt: c.startsAt,
      endsAt: addMin(c.startsAt, t.durationMin),
      place: `${t.studio} · L2`,
      status: waitlist ? "waitlist" : "confirmed",
      waitlistPos: waitlist ? c.waitlist + 1 : undefined,
      detail: `With ${person(c.coachId).name.split(" ")[0]}`,
      image: t.image,
    },
    {
      title: waitlist ? `You're #${c.waitlist + 1} on the waitlist` : `${t.name} is booked`,
      body: `${fmtDay(c.startsAt)} at ${fmtTime(c.startsAt)} · We'll ${waitlist ? "tell you if a spot opens" : "see you on L2"}`,
      href: "/plans",
    },
  );
}

export function rsvpEvent(e: BuildingEvent, waitlist: boolean) {
  actions.add(
    {
      kind: "event",
      refId: e.slug,
      title: e.name,
      startsAt: e.startsAt,
      endsAt: addMin(e.startsAt, e.durationMin),
      place: `${e.place}${e.level ? ` · L${e.level}` : ""}`,
      status: waitlist ? "waitlist" : "confirmed",
      waitlistPos: waitlist ? 3 : undefined,
      image: e.image,
    },
    {
      title: waitlist ? "You're on the waitlist" : "You're going",
      body: `${e.name} · ${fmtDay(e.startsAt)}`,
      href: "/plans",
    },
  );
}

export function bookRoom(r: Room, startsAt: string, minutes: number, detail: string) {
  const needsApproval = r.approval === "request";
  actions.add(
    {
      kind: "room",
      refId: r.slug,
      title: `${r.name} ${r.capacity > 14 ? "section" : "room"}`,
      startsAt,
      endsAt: addMin(startsAt, minutes),
      place: `Level ${r.level}`,
      status: needsApproval ? "pending" : "confirmed",
      detail,
      image: r.image,
    },
    {
      title: needsApproval ? "Request sent for approval" : `${r.name} is yours`,
      body: `${fmtDay(startsAt)} · ${fmtTime(startsAt)}–${fmtTime(addMin(startsAt, minutes))}`,
      href: "/plans",
    },
  );
}

export function bookResource(res: Resource, startsAt: string, unit: string) {
  actions.add(
    {
      kind: "resource",
      refId: `${res.slug}-${startsAt}`,
      title: res.name,
      startsAt,
      endsAt: addMin(startsAt, res.slotMin),
      place: `${unit} · L2`,
      status: "confirmed",
      image: res.image,
    },
    { title: `${res.kind === "ride" ? unit : res.name} is booked`, body: `${fmtDay(startsAt)} at ${fmtTime(startsAt)}`, href: "/plans" },
  );
}

export const kindLabel: Record<Commitment["kind"], string> = {
  class: "Class",
  room: "Room booking",
  event: "Event",
  resource: "Studio booking",
  training: "Personal training",
  inquiry: "Event inquiry",
};

/** Where to go to see the thing a commitment points at */
export function commitmentHref(c: Commitment) {
  if (c.kind === "class") return `/fitness/schedule?class=${encodeURIComponent(c.refId)}`;
  if (c.kind === "event") return `/programming/${c.refId}`;
  if (c.kind === "room") return `/spaces/${c.refId}`;
  if (c.kind === "inquiry") return "/spaces/plan-an-event";
  return "/fitness";
}
