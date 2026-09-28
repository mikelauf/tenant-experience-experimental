import type { Persona } from "./data/types";

/**
 * Who can take a member action (Wayfinder #308, #310). Browsing is open to everyone. Reserving, booking and RSVPing
 * need confirmed building access: a sign-in, then a verified work email. Anyone else is sent to /sign-in, which
 * picks up wherever they are and brings them back to the task.
 */
export const isMember = (p: Persona) => p === "new" || p === "returning";

/** The words on a member action that someone can't take yet, e.g. `gateLabel(p, "reserve")` */
export function gateLabel(p: Persona, verb: string) {
  if (p === "public") return "Verify your work email";
  if (p === "verifying") return "Access being verified";
  return `Sign in to ${verb}`;
}

/** Where that action goes: sign-in, which returns to `returnTo` once access is confirmed */
export const gateHref = (returnTo: string) => `/sign-in?returnTo=${encodeURIComponent(returnTo)}`;

/** A `returnTo` from the URL, kept only if it's a path on this site (never another origin) */
export const safeReturn = (raw: string | null | undefined, fallback: string) => (raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : fallback);
