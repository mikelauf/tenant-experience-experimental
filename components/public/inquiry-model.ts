/** The inquiry's shape: its fields, steps and checks. */

export type Values = {
  date: string;
  /** Start time, "HH:MM", optional; Core has no field for it, so it rides in the date text */
  time: string;
  flexible: boolean;
  guests: string;
  venues: string[];
  eventType: string;
  budget: string;
  message: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  phone: string;
  privacy: boolean;
  news: boolean;
};
export type Errors = Partial<Record<keyof Values, string>>;

/** One-tap headcounts under the stepper; "500+" fills in 500. */
export const GUEST_PRESETS = ["25", "50", "100", "200", "500+"];

export const STEPS = [
  { title: "When, and how many?", short: "When" },
  { title: "Where are you thinking?", short: "Where" },
  { title: "The event", short: "Event" },
  { title: "Your details", short: "You" },
] as const;

export function validateStep(step: number, v: Values): Errors {
  const e: Errors = {};
  if (step === 0) {
    if (!v.date) e.date = "Choose a date, even a rough one. Tick “My dates are flexible” if it can move.";
    if (!v.guests) e.guests = "Add an estimated guest count.";
    else if (Number(v.guests) < 1) e.guests = "Use a number, like 80.";
  }
  if (step === 1 && !v.venues.length) e.venues = "Pick one or more venues, or “Not sure yet”.";
  if (step === 2 && !v.budget) e.budget = "Pick a range, or “Not sure yet”.";
  if (step === 3) {
    if (!v.firstName.trim()) e.firstName = "Add your first name.";
    if (!v.lastName.trim()) e.lastName = "Add your last name.";
    if (!v.email.trim()) e.email = "Add an email so the team can reply.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) e.email = "That email doesn't look complete. Check for a missing @ or domain.";
    if (!v.privacy) e.privacy = "Please confirm you've read how your details are used.";
  }
  return e;
}

export const LEAD = "No account needed. The events team follows up, and nothing is reserved until you say so.";
