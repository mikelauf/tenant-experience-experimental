"use client";

import { useSyncExternalStore } from "react";
import { at, addMin } from "./time";
import type { Commitment, Inquiry, Persona } from "./data/types";
import { classTemplates, sessionsFor } from "./data/fitness";
import { images } from "./data/images";
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
  /** Flash message after an action */
  toast?: { id: string; title: string; body?: string; href?: string };
};

const KEY = "pyramid-demo-v1";

const member = { first: "Jordan", last: "Ellis", email: "jordan.ellis@northline.example", company: "Northline Capital", floor: "Level 31" };
export const currentMember = member;

function returningSeed(): Commitment[] {
  const days = week();
  // First Ride or Strength session tomorrow-ish that isn't full
  const tmr = sessionsFor(days[1]).find((s) => s.taken < classTemplates[s.kind].capacity) ?? sessionsFor(days[3])[0];
  const out: Commitment[] = [];
  if (tmr) {
    const t = classTemplates[tmr.kind];
    out.push({
      id: `c-${tmr.id}`,
      kind: "class",
      refId: tmr.id,
      title: t.name,
      startsAt: tmr.startsAt,
      endsAt: addMin(tmr.startsAt, t.durationMin),
      place: `${t.studio} · L2`,
      status: "confirmed",
      image: t.image,
      createdAt: new Date().toISOString(),
    });
  }
  out.push({
    id: "r-seed-washington",
    kind: "room",
    refId: "washington",
    title: "Washington boardroom",
    startsAt: at(4, 10 * 60),
    endsAt: at(4, 11 * 60 + 30),
    place: "Level 6",
    status: "confirmed",
    detail: "Boardroom · 10 people · Quarterly review",
    image: images.boardroomReal,
    createdAt: new Date().toISOString(),
  });
  out.push({
    id: "e-seed-talk",
    kind: "event",
    refId: "the-pyramid-at-54",
    title: "The Pyramid at 54",
    startsAt: at(6, 17 * 60 + 30),
    endsAt: at(6, 18 * 60 + 45),
    place: "Bay Lounge · L27",
    status: "confirmed",
    image: images.historyGallery,
    createdAt: new Date().toISOString(),
  });
  return out;
}

export function seed(persona: Persona): DemoState {
  return {
    persona,
    fitnessMember: persona === "returning",
    commitments: persona === "returning" ? returningSeed() : [],
    shortlist: [],
    inquiries: [],
    history: persona === "returning" ? ["ride", "washington", "strength"] : [],
    dismissed: [],
  };
}

let state: DemoState | null = null;
const listeners = new Set<() => void>();
const serverState = seed("signed-out");

function load(): DemoState {
  if (state) return state;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...seed("signed-out"), ...JSON.parse(raw), toast: undefined };
  } catch {}
  state ??= seed("signed-out");
  return state;
}

function save() {
  try {
    const { toast: _t, ...rest } = state!;
    void _t;
    localStorage.setItem(KEY, JSON.stringify(rest));
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
    if (e.key === KEY) {
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
      localStorage.removeItem(KEY);
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
  dismiss(key: string) {
    setState((s) => ({ ...s, dismissed: [...s.dismissed, key] }));
  },
};

/** Active (not cancelled) commitment for a ref, if any */
export const findActive = (s: DemoState, kind: Commitment["kind"], refId: string) =>
  s.commitments.find((c) => c.kind === kind && c.refId === refId && c.status !== "cancelled");
