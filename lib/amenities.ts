import type { Amenity, AmenityAccess, AmenityGroup, Persona } from "./data/types";
import { isMember } from "./access";

export const ACCESS_LABEL: Record<AmenityAccess, string> = {
  included: "With building access",
  membership: "Membership",
  request: "On request",
  public: "Open to everyone",
};

export const GROUPS: { id: AmenityGroup; label: string; line: string }[] = [
  { id: "move", label: "Move", line: "Train, stretch, sweat it out" },
  { id: "work", label: "Work", line: "Somewhere other than your desk" },
  { id: "meet", label: "Meet", line: "From one-on-ones to the whole company" },
  { id: "gather", label: "Gather", line: "Evenings, art and the park" },
  { id: "eat", label: "Eat", line: "Coffee to dinner, on the block" },
];

/** Whether this person can use it today, as a short status for the card */
export function standing(a: Pick<Amenity, "access">, persona: Persona, fitnessMember: boolean): { ok: boolean; note: string } {
  if (a.access === "public") return { ok: true, note: "Open to you" };
  if (!isMember(persona)) {
    if (persona === "verifying") return { ok: false, note: "Once your access is confirmed" };
    return { ok: false, note: persona === "signed-out" ? "Sign in to use" : "Verify your work email to use" };
  }
  if (a.access === "membership") return fitnessMember ? { ok: true, note: "You're a member" } : { ok: false, note: "Needs a membership" };
  if (a.access === "request") return { ok: true, note: "Ask the team" };
  return { ok: true, note: "Included for you" };
}

/** The tower's floors that have something on them, top down; things elsewhere on the block sit at street level */
export const onTower = (list: Amenity[]) => list.filter((a) => a.level != null).sort((a, b) => b.level! - a.level!);
export const offTower = (list: Amenity[]) => list.filter((a) => a.level == null);
