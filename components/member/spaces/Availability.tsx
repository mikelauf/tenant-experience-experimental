import { busyFor, roomHours } from "@/lib/data/shared";
import { dayKey, zoned } from "@/lib/time";

const OPEN = 8 * 60;
const CLOSE = 19 * 60;

export const isBusy = (slug: string, dayOffset: number, start: number, end: number) => busyFor(slug, dayOffset).some(([s, e]) => start < e && end > s);

/** How far ahead rooms can be booked, in calendar days: two working weeks */
export const BOOK_AHEAD = 14;

const isWeekend = (d: Date) => zoned(d).weekday === 0 || zoned(d).weekday === 6;

/**
 * The days rooms can be booked: the weekdays among them (rooms are closed at weekends), each with its offset from today,
 * which is what the booking data is keyed by.
 */
export function bookableDays(days: Date[]) {
  return days.map((d, offset) => ({ d, offset, key: dayKey(d) })).filter((x) => !isWeekend(x.d));
}

/** Every start time with `dur` free minutes after it, from opening (or from now, today) to closing */
export function freeStarts(slug: string, offset: number, dur = 60, now = new Date()) {
  const from = offset === 0 ? zoned(now).minutes : 0;
  return roomHours.filter((m) => m >= from && m + dur <= CLOSE && !isBusy(slug, offset, m, m + dur));
}

export { OPEN, CLOSE };
