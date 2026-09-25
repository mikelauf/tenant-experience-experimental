"use client";

import { useSyncExternalStore } from "react";
import { at, addMin } from "./time";
import type { Commitment, Inquiry, Persona } from "./data/types";
import { tenantById, type Tenant } from "./tenants";
import { activeTenantId } from "./tenants/client";
import { week } from "./time";

export type DemoState = {
  persona: Persona;
  fitnessMember: boolean;
  commitments: Commitment[];
  shortlist: string[];
  inquiries: Inquiry[];
  /** Services a returning member has used, for "book again" */
  history: string[];
  dismissed: string[];
  /** Account notification preferences */
  notify: { reminders: boolean; events: boolean; digest: boolean };
  /** Flash message after an action */
  toast?: { id: string; title: string; body?: string; href?: string };
};

/** Each building keeps its own demo state, like separate accounts at separate properties. */
const key = () => `pyramid-demo-v1:${activeTenantId()}`;

/** A returning member's calendar, built from whatever this building offers. */
function returningSeed(t: Tenant): Commitment[] {
  const days = week();
  const now = new Date().toISOString();
  const out: Commitment[] = [];
  if (t.fitness) {
    // First class tomorrow-ish that isn't full
    const tmr = t.sessionsFor(days[1]).find((s) => s.taken < t.template(s.kind).capacity) ?? t.sessionsFor(days[3])[0];
    if (tmr) {
      const c = t.template(tmr.kind);
      out.push({
        id: `c-${tmr.id}`,
        kind: "class",
        refId: tmr.id,
        title: c.name,
        startsAt: tmr.startsAt,
        endsAt: addMin(tmr.startsAt, c.durationMin),
        place: `${c.studio} · L${t.fitness.level}`,
        status: "confirmed",
        image: c.image,
        createdAt: now,
      });
    }
  }
  // Their usual room, later this week
  const r = t.room(t.copy.seed.room) ?? t.rooms[0];
  out.push({
    id: `r-seed-${r.slug}`,
    kind: "room",
    refId: r.slug,
    title: `${r.name} boardroom`,
    startsAt: at(4, 10 * 60),
    endsAt: at(4, 11 * 60 + 30),
    place: `Level ${r.level}`,
    status: "confirmed",
    detail: `Boardroom · ${Math.min(r.capacity, 10)} people · Quarterly review`,
    image: r.image,
    createdAt: now,
  });
  // An event they've said yes to
  const e = t.eventBySlug(t.copy.seed.event);
  if (e)
    out.push({
      id: `e-seed-${e.slug}`,
      kind: "event",
      refId: e.slug,
      title: e.name,
      startsAt: e.startsAt,
      endsAt: addMin(e.startsAt, e.durationMin),
      place: `${e.place}${e.level ? ` · L${e.level}` : ""}`,
      status: "confirmed",
      image: e.image,
      createdAt: now,
    });
  return out;
}

export function seed(persona: Persona, t: Tenant = tenantById(activeTenantId())): DemoState {
  const returning = persona === "returning";
  return {
    persona,
    fitnessMember: returning && !!t.fitness,
    commitments: returning ? returningSeed(t) : [],
    shortlist: [],
    inquiries: [],
    history: returning ? t.copy.usuals.slice(0, 3).map((u) => u.id) : [],
    dismissed: [],
    notify: { reminders: true, events: true, digest: false },
  };
}

let state: DemoState | null = null;
const listeners = new Set<() => void>();
const serverState = seed("signed-out", tenantById(undefined));

function load(): DemoState {
  if (state) return state;
  try {
    const raw = localStorage.getItem(key());
    if (raw) state = { ...seed("signed-out"), ...JSON.parse(raw), toast: undefined };
  } catch {}
  state ??= seed("signed-out");
  return state;
}

function save() {
  try {
    const { toast: _t, ...rest } = state!;
    void _t;
    localStorage.setItem(key(), JSON.stringify(rest));
  } catch {}
}

export function setState(fn: (s: DemoState) => DemoState) {
  state = fn(load());
  save();
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === key()) {
      state = null;
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

/** The whole demo state. The reference only changes on writes, so derive with useMemo. */
export function useDemo(): DemoState {
  return useSyncExternalStore(subscribe, load, () => serverState);
}

/** true once the client store has loaded (avoids flashing signed-out UI) */
export function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/* ---------------- actions ---------------- */

const uid = () => Math.random().toString(36).slice(2, 9);

export const actions = {
  setPersona(p: Persona) {
    setState((s) => ({ ...seed(p), shortlist: s.shortlist, inquiries: s.inquiries }));
  },
  signIn() {
    setState((s) => (s.persona === "signed-out" ? { ...s, persona: "new" } : s));
  },
  signOut() {
    setState((s) => ({ ...s, persona: "signed-out" }));
  },
  setFitness(on: boolean) {
    setState((s) => ({ ...s, fitnessMember: on }));
  },
  reset() {
    try {
      localStorage.removeItem(key());
    } catch {}
    state = seed("signed-out");
    listeners.forEach((l) => l());
  },
  add(c: Omit<Commitment, "id" | "createdAt">, toast?: Omit<NonNullable<DemoState["toast"]>, "id">) {
    const id = `${c.kind}-${uid()}`;
    setState((s) => ({
      ...s,
      commitments: [...s.commitments.filter((x) => !(x.refId === c.refId && x.kind === c.kind)), { ...c, id, createdAt: new Date().toISOString() }],
      history: s.history.includes(c.refId) ? s.history : [...s.history, c.refId],
      toast: toast ? { ...toast, id: uid() } : s.toast,
    }));
    return id;
  },
  cancel(id: string) {
    setState((s) => ({ ...s, commitments: s.commitments.map((c) => (c.id === id ? { ...c, status: "cancelled" as const } : c)) }));
  },
  remove(id: string) {
    setState((s) => ({ ...s, commitments: s.commitments.filter((c) => c.id !== id) }));
  },
  toast(t: Omit<NonNullable<DemoState["toast"]>, "id">) {
    setState((s) => ({ ...s, toast: { ...t, id: uid() } }));
  },
  clearToast() {
    setState((s) => ({ ...s, toast: undefined }));
  },
  toggleShortlist(slug: string) {
    setState((s) => ({ ...s, shortlist: s.shortlist.includes(slug) ? s.shortlist.filter((x) => x !== slug) : [...s.shortlist, slug] }));
  },
  addInquiry(i: Omit<Inquiry, "id" | "createdAt">) {
    const id = `inq-${uid()}`;
    setState((s) => ({ ...s, inquiries: [...s.inquiries, { ...i, id, createdAt: new Date().toISOString() }] }));
    return id;
  },
  dismiss(k: string) {
    setState((s) => ({ ...s, dismissed: [...s.dismissed, k] }));
  },
  setNotify(k: keyof DemoState["notify"], on: boolean) {
    setState((s) => ({ ...s, notify: { ...s.notify, [k]: on } }));
  },
};

/** Active (not cancelled) commitment for a ref, if any */
export const findActive = (s: DemoState, kind: Commitment["kind"], refId: string) =>
  s.commitments.find((c) => c.kind === kind && c.refId === refId && c.status !== "cancelled");
