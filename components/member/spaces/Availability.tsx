"use client";

import { cn } from "@/lib/cn";
import { busyFor } from "@/lib/data/rooms";

const OPEN = 8 * 60;
const CLOSE = 19 * 60;

/** A day's availability as a thin bar: busy blocks, your selection, and a "now" tick. */
export function AvailabilityBar({
  slug,
  dayOffset,
  selection,
  className,
  showLabels,
}: {
  slug: string;
  dayOffset: number;
  selection?: [number, number] | null;
  className?: string;
  showLabels?: boolean;
}) {
  const busy = busyFor(slug, dayOffset);
  const pct = (m: number) => ((m - OPEN) / (CLOSE - OPEN)) * 100;
  const d = new Date();
  const nowMin = d.getHours() * 60 + d.getMinutes();
  const free = CLOSE - OPEN - busy.reduce((a, [s, e]) => a + (e - s), 0);

  return (
    <div className={className}>
      <div className="relative h-2 overflow-hidden rounded-full bg-ok-soft" role="img" aria-label={`${Math.round(free / 60)} hours free between 8am and 7pm`}>
        {dayOffset === 0 && nowMin > OPEN && <span className="absolute inset-y-0 left-0 bg-fog-2/80" style={{ width: `${Math.min(100, pct(nowMin))}%` }} />}
        {busy.map(([s, e]) => (
          <span key={s} className="absolute inset-y-0 bg-stone-2/70" style={{ left: `${pct(s)}%`, width: `${pct(e) - pct(s)}%` }} />
        ))}
        {selection && (
          <span
            className="absolute inset-y-0 rounded-full bg-redwood transition-[left,width] duration-300"
            style={{ left: `${pct(selection[0])}%`, width: `${pct(selection[1]) - pct(selection[0])}%` }}
          />
        )}
      </div>
      {showLabels && (
        <div className="t-meta mt-1.5 flex justify-between tabular">
          <span>8am</span>
          <span>12pm</span>
          <span>4pm</span>
          <span>7pm</span>
        </div>
      )}
    </div>
  );
}

export const isBusy = (slug: string, dayOffset: number, start: number, end: number) => busyFor(slug, dayOffset).some(([s, e]) => start < e && end > s);

export { OPEN, CLOSE };

export function Legend({ className }: { className?: string }) {
  return (
    <div className={cn("t-meta flex flex-wrap items-center gap-4", className)}>
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-4 rounded-full bg-ok-soft" /> Free
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-4 rounded-full bg-stone-2/70" /> Booked
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-4 rounded-full bg-redwood" /> Yours
      </span>
    </div>
  );
}
