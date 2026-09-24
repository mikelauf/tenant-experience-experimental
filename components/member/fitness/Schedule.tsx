"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { person } from "@/lib/data/building";
import { classTemplates, sessionsFor } from "@/lib/data/fitness";
import type { ClassKind, ClassSession } from "@/lib/data/types";
import { useDemo, useHydrated } from "@/lib/store";
import { dayKey, week } from "@/lib/time";
import { Icon } from "@/components/ui/Icon";
import { DateStrip } from "../DateStrip";
import { ClassAction, useClassState } from "./ClassAction";
import { ClassSheet, Intensity } from "./ClassSheet";

const kinds: { id: ClassKind | "all"; label: string }[] = [
  { id: "all", label: "All classes" },
  { id: "strength", label: "Strength" },
  { id: "ride", label: "Ride" },
  { id: "pilates", label: "Pilates" },
  { id: "mobility", label: "Mobility" },
  { id: "run", label: "Run club" },
];

function Row({ c, onOpen, i }: { c: ClassSession; onOpen: () => void; i: number }) {
  const t = classTemplates[c.kind];
  const st = useClassState(c);
  const d = new Date(c.startsAt);
  const [hm, ap] = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).split(" ");
  const pct = Math.min(100, (st.taken / st.cap) * 100);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen())}
        className={cn(
          "group grid cursor-pointer grid-cols-[64px_1fr] items-center gap-x-4 gap-y-3 rounded-[var(--radius-card)] bg-paper p-4 shadow-[var(--shadow-ring)] transition-shadow hover:shadow-[var(--shadow-soft)] sm:grid-cols-[88px_1fr_auto] sm:p-5",
          st.state === "past" && "opacity-55",
          st.state === "reserved" && "shadow-[inset_3px_0_0_var(--color-ok),var(--shadow-ring)]",
        )}
      >
        <div className="self-start">
          <p className="t-num text-[1.625rem] font-medium leading-none">{hm}</p>
          <p className="t-meta mt-1">{ap.toLowerCase()}</p>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <p className="t-h3 truncate">{t.name}</p>
            <Intensity n={t.intensity} />
          </div>
          <p className="t-small mt-1 text-stone">
            {person(c.coachId).name.split(" ")[0]} · {t.studio} · {t.durationMin} min
          </p>
          <div className="mt-3 flex items-center gap-3">
            <span className="h-1 w-24 overflow-hidden rounded-full bg-fog">
              <span className={cn("block h-full rounded-full", st.left === 0 ? "bg-redwood" : "bg-ink/70")} style={{ width: `${pct}%` }} />
            </span>
            <span className={cn("t-meta tabular", st.left === 0 && "text-redwood")}>
              {st.left === 0 ? `Full · ${c.waitlist} waiting` : st.left <= 3 ? `${st.left} left` : `${st.left} spots`}
            </span>
          </div>
        </div>
        <div className="col-span-2 flex justify-end sm:col-span-1">
          <ClassAction c={c} returnTo={`/fitness/schedule?class=${encodeURIComponent(c.id)}`} />
        </div>
      </div>
    </motion.li>
  );
}

export function Schedule() {
  const router = useRouter();
  const params = useSearchParams();
  const s = useDemo();
  const hydrated = useHydrated();
  const days = useMemo(() => week(), []);
  const deepClass = params.get("class");
  const deepSession = useMemo(() => (deepClass ? days.flatMap(sessionsFor).find((x) => x.id === deepClass) : undefined), [deepClass, days]);
  const [day, setDay] = useState(() => (deepSession ? dayKey(deepSession.startsAt) : dayKey(days[0])));
  const [kind, setKind] = useState<ClassKind | "all">((params.get("kind") as ClassKind) ?? "all");
  const [openId, setOpenId] = useState<string | null>(deepClass);
  const [resumed] = useState(() => !!deepClass);

  const current = days.find((d) => dayKey(d) === day)!;
  const all = sessionsFor(current);
  const list = all.filter((c) => kind === "all" || c.kind === kind);
  const open = openId ? (days.flatMap(sessionsFor).find((x) => x.id === openId) ?? null) : null;

  const myDays = new Set(hydrated ? s.commitments.filter((c) => c.kind === "class" && c.status !== "cancelled").map((c) => dayKey(c.startsAt)) : []);

  const close = () => {
    setOpenId(null);
    if (deepClass) router.replace("/fitness/schedule", { scroll: false });
  };

  const nextDayWithClasses = days.find((d) => d > current && sessionsFor(d).length);

  return (
    <div className="pb-tab lg:pb-28">
      <div className="frame pt-[calc(var(--nav-h)+32px)] lg:pt-[calc(var(--nav-h)+56px)]">
        <p className="t-lead text-stone">Pyramid Fitness · L2</p>
        <h1 className="t-hero mt-2">Class schedule</h1>
      </div>

      <div className="sticky top-[var(--nav-h)] z-30 mt-8 border-b hairline bg-quartz/88 backdrop-blur-xl">
        <div className="frame flex flex-col gap-3 py-3 lg:flex-row lg:items-center lg:justify-between">
          <DateStrip days={days} value={day} onChange={setDay} marks={(d) => sessionsFor(d).length > 0} mine={(d) => myDays.has(dayKey(d))} />
          <div
            role="group"
            aria-label="Class type"
            className="no-scrollbar -mx-[var(--gutter)] flex gap-1.5 overflow-x-auto px-[var(--gutter)] lg:mx-0 lg:px-0"
          >
            {kinds.map((k) => (
              <button
                key={k.id}
                aria-pressed={kind === k.id}
                onClick={() => setKind(k.id)}
                className={cn(
                  "h-9 shrink-0 rounded-full px-3.5 text-[0.8125rem] font-medium transition-colors",
                  kind === k.id
                    ? "bg-ink text-paper"
                    : "bg-paper text-ink-2 shadow-[inset_0_0_0_1px_var(--color-line-2)] hover:shadow-[inset_0_0_0_1px_var(--color-stone-2)]",
                )}
              >
                {k.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="frame mt-8 lg:grid lg:grid-cols-12 lg:gap-[var(--col-gap)]">
        <div className="lg:col-span-8">
          <p className="t-meta mb-4" aria-live="polite">
            {current.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · {list.length} {list.length === 1 ? "class" : "classes"}
          </p>
          <AnimatePresence mode="popLayout" initial={false}>
            {list.length ? (
              <motion.ul key={day + kind} className="space-y-3">
                {list.map((c, i) => (
                  <Row key={c.id} c={c} i={i} onOpen={() => setOpenId(c.id)} />
                ))}
              </motion.ul>
            ) : (
              <motion.div
                key={`empty-${day}-${kind}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-[var(--radius-media)] bg-paper p-8 text-center shadow-[var(--shadow-ring)] sm:p-14"
              >
                <span className="mx-auto grid size-14 place-items-center rounded-full bg-fog">
                  <Icon name={all.length ? "sliders" : "leaf"} size={24} />
                </span>
                <p className="t-h2 mt-5">{all.length ? "No classes of that type today" : "Open gym only today"}</p>
                <p className="t-body mx-auto mt-2 max-w-[38ch] text-stone">
                  {all.length
                    ? "Try another type, or see everything on the schedule."
                    : "The strength floor and Ride studio are open 8am–4pm. Classes return on the next weekday."}
                </p>
                <div className="mt-6 flex justify-center gap-2">
                  {all.length ? (
                    <button onClick={() => setKind("all")} className="h-11 rounded-full bg-ink px-5 font-medium text-paper">
                      Show all classes
                    </button>
                  ) : (
                    nextDayWithClasses && (
                      <button onClick={() => setDay(dayKey(nextDayWithClasses))} className="h-11 rounded-full bg-ink px-5 font-medium text-paper">
                        See {nextDayWithClasses.toLocaleDateString("en-US", { weekday: "long" })}
                      </button>
                    )
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <aside className="mt-10 lg:col-span-4 lg:mt-9">
          <div className="sticky top-[calc(var(--nav-h)+120px)] space-y-3">
            <div className="card p-5">
              <p className="font-medium">How reservations work</p>
              <ul className="t-small mt-3 space-y-2.5 text-stone">
                <li className="flex gap-2.5">
                  <Icon name="calendar" size={17} className="mt-0.5 shrink-0" />
                  Book up to 7 days ahead.
                </li>
                <li className="flex gap-2.5">
                  <Icon name="people" size={17} className="mt-0.5 shrink-0" />
                  Full? Join the waitlist. We&apos;ll book you if a spot opens.
                </li>
                <li className="flex gap-2.5">
                  <Icon name="clock" size={17} className="mt-0.5 shrink-0" />
                  Cancel free up to 2 hours before (sample policy).
                </li>
              </ul>
            </div>
            {hydrated && s.persona !== "signed-out" && !s.fitnessMember && (
              <div className="rounded-[var(--radius-card)] bg-redwood-soft p-5 text-redwood-deep">
                <p className="font-medium">You can look, but not book yet</p>
                <p className="t-small mt-1">Classes need a Pyramid Fitness membership. It takes a minute.</p>
                <a
                  href="/account/membership?returnTo=%2Ffitness%2Fschedule"
                  className="mt-4 inline-flex h-10 items-center rounded-full bg-redwood px-4 text-[0.875rem] font-medium text-paper"
                >
                  Get fitness access
                </a>
              </div>
            )}
          </div>
        </aside>
      </div>

      <ClassSheet
        c={open}
        onClose={close}
        returnTo={open ? `/fitness/schedule?class=${encodeURIComponent(open.id)}` : "/fitness/schedule"}
        resumed={resumed && hydrated && s.persona !== "signed-out" && openId === deepClass}
      />
    </div>
  );
}
