import { clock, minutesOf } from "../../sun.ts";

/** Start times the inquiry offers: every half hour from 7 am to 11 pm, as "HH:MM". */
export const START_TIMES = Array.from({ length: 33 }, (_, i) => {
  const m = 7 * 60 + i * 30;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
});

/**
 * The date as Core's free-text `requested_date_text` gets it: "2026-10-12, from 7:00 pm (flexible)". Core has no
 * time field, so the start time rides along in the text for the events team to read. A time that isn't one of
 * the offered slots is dropped rather than sent.
 */
export function dateText(date: string, time: string | undefined, flexible: boolean) {
  const m = time && START_TIMES.includes(time) ? minutesOf(time) : null;
  return `${date}${m != null ? `, from ${clock(m)}` : ""}${flexible ? " (flexible)" : ""}`;
}
