"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { dayKey } from "@/lib/time";

/** Airbnb-style day picker. `marks` shows a dot (e.g. has classes); `mine` a redwood dot (you're booked). */
export function DateStrip({
  days,
  value,
  onChange,
  marks,
  mine,
  id = "ds",
}: {
  days: Date[];
  value: string;
  onChange: (key: string) => void;
  marks?: (d: Date) => boolean;
  mine?: (d: Date) => boolean;
  id?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label="Choose a day"
      className="no-scrollbar -mx-[var(--gutter)] flex gap-1.5 overflow-x-auto px-[var(--gutter)] py-1 sm:mx-0 sm:px-0"
    >
      {days.map((d, i) => {
        const k = dayKey(d);
        const on = k === value;
        const has = marks ? marks(d) : true;
        return (
          <button
            key={k}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(k)}
            className={cn(
              "relative flex h-[76px] w-[58px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-[18px] transition-colors sm:w-[64px]",
              on ? "text-paper" : has ? "text-ink hover:bg-ink/5" : "text-stone-2 hover:bg-ink/5",
            )}
          >
            {on && (
              <motion.span
                layoutId={`${id}-pill`}
                className="absolute inset-0 rounded-[18px] bg-ink"
                transition={{ type: "spring", stiffness: 480, damping: 38 }}
              />
            )}
            <span className={cn("relative text-[0.75rem] font-medium", on ? "text-paper/70" : "text-stone")}>
              {i === 0 ? "Today" : d.toLocaleDateString("en-US", { weekday: "short" })}
            </span>
            <span className="t-num relative text-[1.375rem] font-medium leading-none">{d.getDate()}</span>
            <span className="relative mt-1 flex h-1.5 gap-1">
              {has && <span className={cn("size-1.5 rounded-full", on ? "bg-paper/50" : "bg-stone-2")} />}
              {mine?.(d) && <span className="size-1.5 rounded-full bg-redwood-glow" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
