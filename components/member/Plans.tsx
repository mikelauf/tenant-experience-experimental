"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import type { Commitment } from "@/lib/data/types";
import { useTenant } from "@/lib/tenants/client";
import { useDemo, useHydrated } from "@/lib/store";
import { fmtLongDay, fmtMonth } from "@/lib/time";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { CommitmentRow, CommitmentSheet, UpNext, isUpcoming, useNow } from "./Commitments";

type Group = { month: string; days: { day: string; items: Commitment[] }[] };

function group(list: Commitment[]): Group[] {
  const out: Group[] = [];
  for (const c of list) {
    const m = fmtMonth(c.startsAt);
    const d = fmtLongDay(c.startsAt);
    let g = out.find((x) => x.month === m);
    if (!g) out.push((g = { month: m, days: [] }));
    let day = g.days.find((x) => x.day === d);
    if (!day) g.days.push((day = { day: d, items: [] }));
    day.items.push(c);
  }
  return out;
}

export function Plans() {
  const s = useDemo();
  const t = useTenant();
  const hydrated = useHydrated();
  const now = useNow();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [open, setOpen] = useState<string | null>(null);

  const { upcoming, past } = useMemo(() => {
    const sorted = [...s.commitments].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    return { upcoming: sorted.filter((c) => isUpcoming(c, now)), past: sorted.filter((c) => !isUpcoming(c, now)).reverse() };
  }, [s.commitments, now]);

  const live = open ? (s.commitments.find((c) => c.id === open) ?? null) : null;
  if (!hydrated) return <div className="min-h-[80svh]" />;

  if (s.persona === "signed-out")
    return (
      <div className="frame flex min-h-[70svh] flex-col items-start justify-center pt-[var(--nav-h)]">
        <h1 className="t-h1">Sign in to see your plans.</h1>
        <p className="t-lead mt-3 text-stone">Rooms, classes and RSVPs all land here.</p>
        <ButtonLink href="/sign-in?returnTo=%2Fplans" className="mt-8" icon="arrow-right">
          Sign in
        </ButtonLink>
      </div>
    );

  const list = tab === "upcoming" ? upcoming : past;
  const [first, ...rest] = upcoming;
  const counts = {
    confirmed: upcoming.filter((c) => c.status === "confirmed").length,
    pending: upcoming.filter((c) => c.status === "pending").length,
    waitlist: upcoming.filter((c) => c.status === "waitlist").length,
  };

  return (
    <div className="frame pb-tab pt-[calc(var(--nav-h)+40px)] lg:pb-28 lg:pt-[calc(var(--nav-h)+64px)]">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="t-hero">Your plans</h1>
          <p className="t-lead mt-3 text-stone">
            {upcoming.length
              ? [
                  counts.confirmed && `${counts.confirmed} confirmed`,
                  counts.pending && `${counts.pending} awaiting approval`,
                  counts.waitlist && `${counts.waitlist} on a waitlist`,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : "Nothing coming up."}
          </p>
        </div>
        <div role="tablist" className="flex rounded-full bg-fog p-1">
          {(["upcoming", "past"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className="relative h-10 rounded-full px-5 text-[0.9375rem] font-medium"
            >
              {tab === t && (
                <motion.span
                  layoutId="plans-tab"
                  className="absolute inset-0 rounded-full bg-paper shadow-[var(--shadow-soft)]"
                  transition={{ type: "spring", stiffness: 420, damping: 36 }}
                />
              )}
              <span className={cn("relative", tab !== t && "text-stone")}>
                {t === "upcoming" ? `Upcoming${upcoming.length ? ` · ${upcoming.length}` : ""}` : "Past & cancelled"}
              </span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10"
        >
          {!list.length ? (
            <div className="grid gap-3 lg:grid-cols-12">
              <div className="rounded-[var(--radius-media)] bg-paper p-8 shadow-[var(--shadow-ring)] sm:p-12 lg:col-span-7">
                <Icon name="plans" size={32} className="text-stone" />
                <p className="t-h1 mt-6">{tab === "upcoming" ? "A clear calendar." : "Nothing here yet."}</p>
                <p className="t-body mt-3 max-w-[44ch] text-stone">
                  {tab === "upcoming"
                    ? "When you book a room, reserve a class or RSVP to an event, it shows up here with its status."
                    : "Finished and cancelled plans will collect here."}
                </p>
              </div>
              {tab === "upcoming" && (
                <div className="grid gap-3 lg:col-span-5">
                  {[
                    t.building.services.spaces && { href: "/spaces", icon: "spaces" as const, t: "Book a room", d: `${t.rooms.length} rooms, most instant` },
                    t.fitness && { href: "/fitness/schedule", icon: "fitness" as const, t: "Find a class", d: `Every weekday on L${t.fitness.level}` },
                    t.building.services.programming && { href: "/programming", icon: "programming" as const, t: "See events", d: "Hosted by the building" },
                  ]
                    .filter((x) => !!x)
                    .map((x) => (
                      <Link key={x.href} href={x.href} className="card group flex items-center gap-4 p-5 hover:shadow-[var(--shadow-soft)]">
                        <span className="grid size-11 place-items-center rounded-2xl bg-fog">
                          <Icon name={x.icon} size={21} />
                        </span>
                        <span className="flex-1">
                          <span className="block font-medium">{x.t}</span>
                          <span className="t-small block text-stone">{x.d}</span>
                        </span>
                        <Icon name="arrow-right" size={18} className="transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {tab === "upcoming" && first && (
                <div className="mb-12">
                  <UpNext c={first} now={now} onOpen={(c) => setOpen(c.id)} />
                </div>
              )}
              <div className="space-y-12">
                {group(tab === "upcoming" ? rest : list).map((g) => (
                  <section key={g.month} aria-label={g.month}>
                    <h2 className="t-h2 sticky top-[var(--nav-h)] z-10 -mx-2 bg-quartz/90 px-2 py-3 backdrop-blur">{g.month}</h2>
                    <div className="mt-3 space-y-8">
                      {g.days.map((d) => (
                        <div key={d.day} className="grid gap-3 lg:grid-cols-12">
                          <p className="t-small pt-2 font-medium lg:col-span-3">{d.day}</p>
                          <motion.ul layout className="space-y-2 lg:col-span-9">
                            {d.items.map((c) => (
                              <motion.li key={c.id} layout>
                                <CommitmentRow c={c} now={now} onOpen={(x) => setOpen(x.id)} />
                              </motion.li>
                            ))}
                          </motion.ul>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <CommitmentSheet c={live} onClose={() => setOpen(null)} />
    </div>
  );
}
