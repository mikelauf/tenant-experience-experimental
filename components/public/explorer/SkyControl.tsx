"use client";

import Link from "next/link";
import { useRef } from "react";
import { cn } from "@/lib/cn";
import { briefHref } from "@/lib/brief";
import { LIGHT_LABEL, clock, type Light } from "@/lib/sun";
import { Icon } from "@/components/ui/Icon";

/** The slider's range: the whole day, in quarter hours, so "now" always has a place on it. */
export const SKY_FROM = 0;
export const SKY_TO = 23 * 60 + 45;

/** Local "YYYY-MM-DD", never through UTC. */
export const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const DOT: Record<Light, string> = { day: "bg-[#f3e2b8]", golden: "bg-[#f0a45e]", dusk: "bg-[#8f7fb4]", night: "bg-[#41557a]" };

/**
 * "Your event's sky": a date and a time scrubber that relight the building for that moment, with the real sun.
 * The readout says what the light will be like, when the sun sets, and whether it sets in the open venue's view.
 */
export function SkyControl({
  date,
  today,
  minutes,
  live,
  onNow,
  onDate,
  onMinutes,
  light,
  evening,
  inView,
  inquireHref,
  slug,
  className,
}: {
  date: string;
  /** The building's today, in its own time zone */
  today: string;
  minutes: number;
  /** Following the clock, rather than a picked moment */
  live: boolean;
  onNow: () => void;
  onDate: (d: string) => void;
  onMinutes: (m: number) => void;
  light: Light;
  evening: { golden: number | null; sunset: number | null; dark: number | null };
  /** The open venue's name, when the sun sets inside its view */
  inView?: string;
  inquireHref: string;
  /** The open venue, for a brief of this evening */
  slug?: string;
  className?: string;
}) {
  const picker = useRef<HTMLInputElement>(null);
  // A day either side, for stepping through dates without the calendar
  const shift = (d: number) => {
    const [y, m, day] = date.split("-").map(Number);
    const next = isoDay(new Date(y, m - 1, day + d));
    if (next >= today) onDate(next);
  };
  // The native calendar only opens from its own (hidden) icon, so open it from the button instead
  const openPicker = () => {
    const el = picker.current;
    if (!el) return;
    try {
      el.showPicker();
    } catch {
      el.focus();
      el.click();
    }
  };
  const pct = ((minutes - SKY_FROM) / (SKY_TO - SKY_FROM)) * 100;
  // Where sunset sits on the track, as a tick
  const sunsetAt = evening.sunset != null ? ((evening.sunset - SKY_FROM) / (SKY_TO - SKY_FROM)) * 100 : null;
  const hh = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

  return (
    <div className={cn("relative rounded-[20px] bg-night/65 p-3 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08),0_24px_48px_-20px_rgb(0_0_0/0.65)] backdrop-blur-xl", className)}>
      <div className="flex items-center justify-between gap-3">
        {live ? (
          <p className="t-meta whitespace-nowrap">Now in San Francisco</p>
        ) : (
          <button onClick={onNow} className="t-meta flex items-center gap-1 whitespace-nowrap !text-moon-2 hover:!text-moon">
            <Icon name="refresh" size={12} />
            Back to now
          </button>
        )}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => shift(-1)}
            disabled={date <= today}
            aria-label="Day before"
            className="grid size-7 place-items-center rounded-full text-moon-2 hover:bg-white/10 hover:text-moon disabled:opacity-30"
          >
            <Icon name="chevron-left" size={14} />
          </button>
          <button onClick={openPicker} className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white/10 px-2.5 py-1 text-[0.75rem] font-medium text-moon hover:bg-white/15">
            <Icon name="calendar" size={14} />
            {date === today ? "Today" : new Date(`${date}T12:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </button>
          <button onClick={() => shift(1)} aria-label="Day after" className="grid size-7 place-items-center rounded-full text-moon-2 hover:bg-white/10 hover:text-moon">
            <Icon name="chevron-right" size={14} />
          </button>
          <input
            ref={picker}
            type="date"
            value={date}
            min={today}
            onChange={(e) => e.target.value && onDate(e.target.value)}
            aria-label="Event date"
            tabIndex={-1}
            className="pointer-events-none absolute right-3 top-3 h-0 w-0 opacity-0 [color-scheme:dark]"
          />
        </div>
      </div>
      <p className="t-small mt-1.5 text-moon-2">
        {live ? "The building as it looks right now. Pick your event's date and time to see its light." : "The building lit by the real sun at that moment."}
      </p>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="t-num text-[1.625rem] font-medium leading-none">{clock(minutes)}</span>
        <span className="flex items-center gap-1.5 text-[0.8125rem] text-moon-2">
          <span className={cn("keep-round size-2 rounded-full transition-colors duration-500", DOT[light])} aria-hidden />
          {LIGHT_LABEL[light]}
        </span>
      </div>

      <div className="relative mt-2.5">
        <input
          type="range"
          min={SKY_FROM}
          max={SKY_TO}
          step={15}
          value={minutes}
          onChange={(e) => onMinutes(Number(e.target.value))}
          aria-label="Event time"
          aria-valuetext={`${clock(minutes)}, ${LIGHT_LABEL[light].toLowerCase()}`}
          className="scrub w-full"
          style={{ "--p": `${pct}%` } as React.CSSProperties}
        />
        {sunsetAt != null && sunsetAt > 0 && sunsetAt < 100 && (
          <span className="pointer-events-none absolute -bottom-1 h-1.5 w-px bg-[#f0a45e]" style={{ left: `${sunsetAt}%` }} aria-hidden />
        )}
      </div>

      <p className="t-meta mt-2 !text-moon-2">
        {evening.sunset != null ? `Sunset ${clock(evening.sunset)}` : "No sunset"}
        {evening.golden != null ? ` · golden hour from ${clock(evening.golden)}` : ""}
        {inView ? ` · it sets in ${inView}'s view` : ""}
      </p>

      <Link
        href={`${inquireHref}${inquireHref.includes("?") ? "&" : "?"}date=${date}&time=${hh}`}
        className="mt-2.5 flex h-9 items-center justify-center gap-1.5 rounded-full bg-moon text-[0.8125rem] font-medium text-night transition-colors hover:bg-white"
      >
        Inquire for this date and time
        <Icon name="arrow-right" size={14} />
      </Link>
      {slug && (
        <Link href={briefHref({ venues: [slug], date, time: hh })} className="t-meta mt-2 flex items-center justify-center gap-1.5 !text-moon-2 hover:!text-moon">
          <Icon name="print" size={13} />
          Save it as a one-page brief to share
        </Link>
      )}
    </div>
  );
}

/** The stage's backdrop for a light level, so the sky behind the model matches the light on it. */
export function skyBackdrop(level: number, light: Light) {
  if (light === "golden") return "linear-gradient(180deg,#3b4f6c 0%,#8a7a8c 55%,#e8a877 100%)";
  if (light === "dusk") return "linear-gradient(180deg,#1f2a40 0%,#4a4a6a 60%,#9a7486 100%)";
  if (light === "day" && level > 0.8) return "linear-gradient(180deg,#9fb8cc 0%,#d8e2e6 70%,#eceee9 100%)";
  if (light === "day") return "linear-gradient(180deg,#56708e 0%,#a8b8c4 70%,#e0c3a4 100%)";
  return "radial-gradient(120% 80% at 50% 0%,#2a3a4c 0%,#10151b 62%)";
}
