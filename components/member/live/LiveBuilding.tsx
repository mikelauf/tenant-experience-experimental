"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { buildingAt, pinsFor, sunAt, type FloorItem, type FloorStatus } from "@/lib/live";
import { useDemo } from "@/lib/store";
import { useTenant } from "@/lib/tenants/client";
import { dayKey, fmtTime, week } from "@/lib/time";
import { useNow } from "@/lib/useNow";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { Tower, type Band } from "@/components/three/Tower";
import { ClassAction } from "../fitness/ClassAction";
import { TowerDiagram } from "./TowerDiagram";

const OPEN = 6 * 60;
const CLOSE = 22 * 60;
const clampMin = (m: number) => Math.min(CLOSE, Math.max(OPEN, Math.round(m / 15) * 15));

const TONE_DOT: Record<FloorItem["status"], string> = {
  mine: "bg-accent-glow",
  live: "bg-[#5fc08f] animate-breathe",
  soon: "bg-[#f0c77e]",
  open: "bg-[#5fc08f]",
  full: "bg-moon-2/50",
};

/** Sky behind the tower, from night through dusk to day */
function skyFor(sun: number) {
  const mix = (a: number[], b: number[], t: number) => `rgb(${a.map((x, i) => Math.round(x + (b[i] - x) * t)).join(" ")})`;
  const night = [
    [58, 74, 98],
    [11, 14, 18],
  ];
  const dusk = [
    [74, 98, 128],
    [21, 27, 33],
  ];
  const day = [
    [196, 212, 222],
    [120, 138, 150],
  ];
  const [a, b, t] = sun < 0.5 ? [night, dusk, sun / 0.5] : [dusk, day, (sun - 0.5) / 0.5];
  return `radial-gradient(120% 90% at 55% 0%, ${mix(a[0], b[0], t)} 0%, ${mix(a[1], b[1], t)} 70%)`;
}

/**
 * The building as the interface: the tower lights up where things are happening,
 * your plans are pinned to their floors, and you can scrub through the day.
 */
export function LiveBuilding({ title, lead, personal = true }: { title: string; lead: string; personal?: boolean }) {
  const t = useTenant();
  const s = useDemo();
  const reduce = useReducedMotion();
  const clock = useNow(60000);
  const days = useMemo(() => week(), []);
  const nowMin = clampMin(new Date(clock).getHours() * 60 + new Date(clock).getMinutes());

  const [dayK, setDayK] = useState(dayKey(days[0]));
  // null = follow the clock
  const [picked, setPicked] = useState<number | null>(null);
  const [focus, setFocus] = useState<number | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  const day = days.find((d) => dayKey(d) === dayK) ?? days[0];
  const isToday = dayK === dayKey(days[0]);
  const minute = picked ?? (isToday ? nowMin : 9 * 60);
  const following = picked == null && isToday;

  const floors = useMemo(() => buildingAt(t, personal ? s : { ...s, commitments: [] }, day, minute), [t, s, personal, day, minute]);
  const pins = useMemo(() => (personal ? pinsFor(t, s, day) : []), [t, s, day, personal]);
  const sun = sunAt(minute);

  const bands: Band[] = floors.filter((f) => f.tone !== "quiet").map((f) => ({ level: f.level, tone: f.tone as Band["tone"], live: f.live }));
  const openFloor = open == null ? null : (floors.find((f) => f.level === open) ?? emptyFloor(open));

  function emptyFloor(level: number): FloorStatus {
    const l = t.levels.find((x) => x.n === level);
    return { level, label: l?.label ?? `L${level}`, place: l?.place ?? `Level ${level}`, items: [], tone: "quiet", live: false };
  }

  // Tapping the tower: the nearest floor with something on it, else the nearest named level
  const pick = (floor: number) => {
    const near = (xs: number[]) => xs.reduce((a, b) => (Math.abs(b - floor) < Math.abs(a - floor) ? b : a), xs[0]);
    const busy = floors.map((f) => f.level);
    const hit = busy.length && Math.abs(near(busy) - floor) <= 3 ? near(busy) : near(t.levels.map((l) => l.n));
    setOpen(hit);
  };

  const summary = (() => {
    const free = floors.flatMap((f) => f.items).filter((i) => i.kind === "room" && i.status === "open").length;
    const ev = floors.flatMap((f) => f.items.filter((i) => i.kind === "event").map((i) => `${i.title} on ${f.label}`))[0];
    const cls = floors.flatMap((f) => f.items).find((i) => i.kind === "class");
    const yours = floors.flatMap((f) => f.items.filter((i) => i.kind === "yours").map((i) => `You: ${i.title} on ${f.label}`))[0];
    const parts = [yours, free && `${free} room${free > 1 ? "s" : ""} free`, cls && `${cls.title} ${cls.status === "live" ? "on now" : "coming up"}`, ev].filter(
      Boolean,
    );
    return parts.length ? parts.join(" · ") : "A quiet hour in the building";
  })();

  const pct = (m: number) => ((m - OPEN) / (CLOSE - OPEN)) * 100;
  const selected = focus ?? open;

  return (
    <section className="theme-night relative overflow-hidden" aria-labelledby="live-h">
      <div className="frame pb-8 pt-16 lg:pb-10 lg:pt-24">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="t-meta flex items-center gap-2">
              <span className={cn("size-2 rounded-full", following ? "bg-accent-glow animate-live" : "bg-moon-2")} />
              {following ? "Live" : `${isToday ? "Today" : day.toLocaleDateString("en-US", { weekday: "long" })} at ${fmtTime(minute)}`}
            </p>
            <h2 id="live-h" className="t-h1 mt-3 max-w-[18ch]">
              {title}
            </h2>
            <p className="t-lead mt-3 max-w-[48ch] text-moon-2">{lead}</p>
          </div>
          <p className="t-small max-w-[36ch] text-moon" aria-live="polite">
            <span className="t-meta block">At {fmtTime(minute)}</span>
            {summary}
          </p>
        </div>
      </div>

      <div className="lg:grid-12 lg:frame gap-y-6 pb-16 lg:pb-24">
        {/* The tower */}
        <div className="px-2 lg:col-span-7 lg:px-0">
          <div className="flex h-[70svh] min-h-[520px] flex-col overflow-hidden rounded-[26px] bg-night-2 lg:h-[82svh]">
            <div className="relative flex-1 transition-[background] duration-700" style={{ background: skyFor(sun) }}>
              <Tower
                level={selected}
                sun={sun}
                auto={selected == null}
                bands={bands}
                pins={pins.map(({ level, label }) => ({ level, label }))}
                onPick={pick}
                className="absolute inset-0"
                poster={<TowerDiagram floors={floors} selected={selected} onPick={setOpen} />}
              />
            </div>

            {/* Time: day chips and a scrubber that relights the tower */}
            <div className="shrink-0 p-3 sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <div role="tablist" aria-label="Day" className="no-scrollbar -my-1 flex gap-1 overflow-x-auto py-1">
                  {days.map((d, i) => {
                    const k = dayKey(d);
                    const on = k === dayK;
                    const hasMine = personal && s.commitments.some((c) => c.status !== "cancelled" && dayKey(c.startsAt) === k);
                    return (
                      <button
                        key={k}
                        role="tab"
                        aria-selected={on}
                        onClick={() => {
                          setDayK(k);
                          if (i === 0) setPicked(null);
                        }}
                        className={cn(
                          "relative h-8 shrink-0 rounded-full px-3 text-[0.8125rem] font-medium transition-colors",
                          on ? "bg-moon text-night" : "text-moon-2 hover:text-moon",
                        )}
                      >
                        {i === 0 ? "Today" : d.toLocaleDateString("en-US", { weekday: "short" })}
                        {hasMine && <span className="absolute right-1.5 top-1 size-1.5 rounded-full bg-accent-glow" aria-label="You have plans" />}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => {
                    setDayK(dayKey(days[0]));
                    setPicked(null);
                  }}
                  disabled={following}
                  className="h-8 shrink-0 rounded-full px-3 text-[0.8125rem] font-medium text-moon shadow-[inset_0_0_0_1px_rgb(255_255_255/0.25)] transition-opacity disabled:opacity-0"
                >
                  Now
                </button>
              </div>

              <div className="mt-3 flex items-center gap-4">
                <span className="t-num w-[4.5ch] shrink-0 text-[1.5rem] font-medium leading-none">{fmtTime(minute).replace(/ ?[ap]m$/, "")}</span>
                <div className="relative flex-1">
                  {/* Ticks where your plans sit */}
                  {pins.map((p) => (
                    <span
                      key={`${p.level}-${p.at}`}
                      aria-hidden
                      className="pointer-events-none absolute -top-1.5 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-accent-glow"
                      style={{ left: `${pct(Math.min(CLOSE, Math.max(OPEN, p.at)))}%` }}
                    />
                  ))}
                  <input
                    type="range"
                    min={OPEN}
                    max={CLOSE}
                    step={15}
                    value={minute}
                    onChange={(e) => setPicked(Number(e.target.value))}
                    aria-label="Time of day"
                    aria-valuetext={fmtTime(minute)}
                    className="scrub w-full"
                    style={{ ["--p" as string]: `${pct(minute)}%` }}
                  />
                  <div className="t-meta mt-1 flex justify-between text-[0.6875rem]" aria-hidden>
                    <span>6am</span>
                    <span>Noon</span>
                    <span>6pm</span>
                    <span>10pm</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* The directory: the same information, readable and keyboard-first */}
        <div className="frame mt-6 lg:col-span-5 lg:mt-0 lg:px-0 lg:pl-6">
          <p className="t-meta mb-3 flex items-center justify-between">
            <span>Floor directory</span>
            <span className="hidden lg:inline">Tap a floor, or the tower</span>
          </p>
          {floors.length === 0 ? (
            <div className="rounded-[var(--radius-card)] bg-night-2 p-6">
              <p className="font-medium">Nothing on at {fmtTime(minute)}.</p>
              <p className="t-small mt-1 text-moon-2">The building&apos;s quiet. Try another time, or another day.</p>
            </div>
          ) : (
            <ul className="space-y-2" onMouseLeave={() => setFocus(null)}>
              <AnimatePresence initial={false}>
                {floors.map((f) => {
                  const top = f.items[0];
                  return (
                    <motion.li
                      key={f.level}
                      layout={!reduce}
                      initial={reduce ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <button
                        onClick={() => setOpen(f.level)}
                        onMouseEnter={() => setFocus(f.level)}
                        onFocus={() => setFocus(f.level)}
                        onBlur={() => setFocus(null)}
                        className={cn(
                          "group flex w-full items-center gap-4 rounded-[18px] p-3 pr-4 text-left transition-colors",
                          selected === f.level ? "bg-night-3" : "bg-night-2 hover:bg-night-3",
                        )}
                      >
                        <span
                          className={cn(
                            "t-num grid h-12 w-14 shrink-0 place-items-center rounded-xl text-[1.125rem] font-medium",
                            f.tone === "mine" ? "bg-accent text-paper" : "bg-night text-moon",
                          )}
                        >
                          {f.level === 0 ? "G" : f.level}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate font-medium">{f.place}</span>
                            {f.items.length > 1 && <span className="t-meta shrink-0">+{f.items.length - 1}</span>}
                          </span>
                          <span className="t-small flex items-center gap-2 text-moon-2">
                            <span className={cn("size-1.5 shrink-0 rounded-full", TONE_DOT[top.status])} />
                            <span className="truncate">
                              {top.title} · {top.detail}
                            </span>
                          </span>
                        </span>
                        <Icon name="chevron-right" size={18} className="shrink-0 text-moon-2 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          )}
          <p className="t-meta mt-5 flex flex-wrap gap-x-4 gap-y-1">
            <Legend dot="bg-accent-glow" label="Your plans" />
            <Legend dot="bg-[#5fc08f]" label="Open or on now" />
            <Legend dot="bg-[#f0c77e]" label="Coming up" />
            <Legend dot="bg-moon-2/50" label="Full or in use" />
          </p>
        </div>
      </div>

      <Sheet open={!!openFloor} onClose={() => setOpen(null)} title={openFloor ? `${openFloor.label} · ${openFloor.place}` : ""}>
        {openFloor && <FloorSheet f={openFloor} minute={minute} />}
      </Sheet>
    </section>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-1.5 rounded-full", dot)} />
      {label}
    </span>
  );
}

function FloorSheet({ f, minute }: { f: FloorStatus; minute: number }) {
  const t = useTenant();
  const level = t.levels.find((l) => l.n === f.level);
  return (
    <div>
      <p className="t-meta">At {fmtTime(minute)}</p>
      {f.items.length === 0 ? (
        <div className="mt-4 rounded-[var(--radius-card)] bg-fog p-5">
          <p className="font-medium">Nothing on right now.</p>
          <p className="t-small mt-1 text-stone">Scrub the time to see this floor later in the day.</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {f.items.map((i) => (
            <li key={i.key} className="rounded-[var(--radius-card)] bg-paper p-4 shadow-[var(--shadow-ring)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{i.title}</p>
                  <p className="t-small text-stone">{i.detail}</p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-[0.75rem] font-medium",
                    i.status === "mine"
                      ? "bg-accent-soft text-accent-deep"
                      : i.status === "full"
                        ? "bg-fog text-stone"
                        : i.status === "soon"
                          ? "bg-hold-soft text-hold"
                          : "bg-ok-soft text-ok",
                  )}
                >
                  {{ mine: "Yours", live: "On now", soon: "Soon", open: "Open", full: i.kind === "room" ? "In use" : "Full" }[i.status]}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {i.session && <ClassAction c={i.session} returnTo={`/fitness/schedule?class=${encodeURIComponent(i.session.id)}`} />}
                <Link href={i.href} className="group inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-[0.875rem] font-medium hover:bg-ink/5">
                  {i.kind === "room" ? (i.status === "open" ? "Book it" : "See the day") : i.kind === "yours" ? "Your plans" : "Details"}
                  <Icon name="arrow-right" size={16} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
      {level?.href && (
        <Link href={level.href} className="group mt-6 inline-flex items-center gap-2 border-b border-ink/25 pb-0.5 font-medium hover:border-ink">
          Everything at {level.place}
          <Icon name="arrow-right" size={17} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
