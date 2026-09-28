"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { gateHref, gateLabel, isMember } from "@/lib/access";
import { rsvpEvent } from "@/lib/commit";
import { cn } from "@/lib/cn";
import type { BuildingEvent } from "@/lib/data/types";
import { findActive, useDemo, useHydrated } from "@/lib/store";
import { useTenant } from "@/lib/tenants/client";
import { addMin, dayDiff, fmtLongDay, fmtRange } from "@/lib/time";
import { useNow } from "@/lib/useNow";
import Image from "@/components/ui/SmoothImage";
import { Icon } from "@/components/ui/Icon";
import { accessLabel } from "../EventCard";
import { SignInStrip } from "../SignInStrip";

/**
 * Events: what's on in the building. The next one leads, wide, with its story; the rest are an agenda grouped by day,
 * each row saying when, where, how full and who it's for, with its RSVP (a sign-in first, before building access).
 */
export function Programming() {
  const t = useTenant();
  const now = useNow(60000);
  const s = useDemo();
  const hydrated = useHydrated();
  const member = hydrated && isMember(s.persona);
  const all = useMemo(() => t.events().filter((e) => new Date(e.startsAt).getTime() > now), [now, t]);
  // Chips for the kinds of events this building actually runs, plus your company's own once we know who you are
  const filters = [
    { id: "all", label: "Everything" },
    { id: "week", label: "This week" },
    ...Object.entries(t.copy.kickers).map(([id, label]) => ({ id, label })),
    ...(member && t.events().some((e) => e.access.type === "company") ? [{ id: "company", label: `For ${t.member.company}` }] : []),
  ];
  const [picked, setF] = useState("all");
  // A filter that's gone (the company chip after switching who's signed in) falls back to everything
  const f = filters.some((x) => x.id === picked) ? picked : "all";
  const list = all.filter((e) =>
    f === "all" ? true : f === "week" ? dayDiff(e.startsAt) < 7 : f === "company" ? e.access.type === "company" : e.kicker === f,
  );
  const [lead, ...rest] = list;
  const days: { key: string; events: BuildingEvent[] }[] = [];
  for (const e of rest) {
    const key = fmtLongDay(e.startsAt);
    const d = days.at(-1);
    if (d?.key === key) d.events.push(e);
    else days.push({ key, events: [e] });
  }

  return (
    <div className="pb-tab lg:pb-28">
      <section className="bg-[#e9e6df]">
        <div className="frame pb-8 pt-[calc(var(--nav-h)+32px)] lg:pt-[calc(var(--nav-h)+48px)]">
          <div className="grid-12 items-end gap-y-5">
            <div className="col-span-12 lg:col-span-7">
              <p className="t-meta">Events</p>
              <h1 className="t-page mt-3">What&apos;s on at {t.copy.the}.</h1>
            </div>
            <p className="t-body col-span-12 text-stone lg:col-span-4 lg:col-start-9">
              {t.copy.programmingLead}, for everyone who works here. Some are just for one company. Planning your own?{" "}
              <Link href="/spaces/plan-an-event" className="font-medium text-ink underline decoration-ink/25 underline-offset-4 hover:decoration-ink">
                Plan an event
              </Link>
              .
            </p>
          </div>
          <div
            role="group"
            aria-label="Filter events"
            className="no-scrollbar -mx-[var(--gutter)] mt-8 flex gap-1.5 overflow-x-auto px-[var(--gutter)] sm:mx-0 sm:px-0"
          >
            {filters.map((x) => (
              <button
                key={x.id}
                aria-pressed={f === x.id}
                onClick={() => setF(x.id)}
                className={cn(
                  "h-9 shrink-0 rounded-full px-4 text-[0.875rem] font-medium transition-colors",
                  f === x.id ? "bg-ink text-paper" : "bg-paper/70 text-ink-2 hover:bg-paper",
                )}
              >
                {x.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <AnimatePresence mode="wait">
        <motion.div
          key={f}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          {!lead ? (
            <div className="frame mt-10">
              <div className="bg-paper p-10 text-center shadow-[var(--shadow-ring)]">
                <p className="t-h2">Nothing here right now.</p>
                <p className="t-body mt-2 text-stone">New events go up most weeks. Try everything, or check back Monday.</p>
                <button onClick={() => setF("all")} className="mt-6 h-11 rounded-full bg-ink px-5 font-medium text-paper">
                  Show everything
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Next up, wide */}
              <section className="frame mt-10 lg:mt-12" aria-label="Next up">
                <div className="grid-12 items-stretch gap-y-6 bg-paper shadow-[var(--shadow-ring)]">
                  <Link
                    href={`/programming/${lead.slug}`}
                    className="group relative col-span-12 block aspect-[16/10] overflow-hidden lg:col-span-7 lg:aspect-auto lg:min-h-[420px]"
                  >
                    <Image
                      src={lead.image.src}
                      alt={lead.image.alt}
                      fill
                      priority
                      sizes="(min-width:1024px) 58vw, 100vw"
                      className="object-cover transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-[1.03]"
                      style={{ objectPosition: lead.image.pos }}
                    />
                  </Link>
                  <div className="col-span-12 flex flex-col p-6 pt-0 lg:col-span-5 lg:p-10 lg:pl-4">
                    <p className="t-meta">
                      Next up · {lead.kicker}
                      {accessLabel(lead) && <span className="text-accent"> · {accessLabel(lead)}</span>}
                    </p>
                    <Link href={`/programming/${lead.slug}`} className="t-h1 mt-3 transition-colors hover:text-accent">
                      {lead.name}
                    </Link>
                    <p className="t-small mt-3 font-medium text-ink-2">
                      {fmtLongDay(lead.startsAt)} · {fmtRange(lead.startsAt, addMin(lead.startsAt, lead.durationMin))}
                    </p>
                    <p className="t-meta mt-0.5">
                      {lead.place}
                      {lead.level ? ` · Level ${lead.level}` : ""}
                    </p>
                    <p className="t-body mt-5 text-stone">{lead.summary}</p>
                    <div className="mt-auto pt-8">
                      <Status e={lead} />
                      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
                        <Rsvp e={lead} size="lg" />
                        <Link href={`/programming/${lead.slug}`} className="group inline-flex items-center gap-1.5 text-[0.9375rem] font-medium">
                          Details <Icon name="arrow-right" size={16} className="transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* The agenda */}
              {days.length > 0 && (
                <section className="frame mt-16 lg:mt-20" aria-labelledby="later-h">
                  <h2 id="later-h" className="t-h2">
                    After that
                  </h2>
                  <div className="mt-6 border-t-2 border-ink">
                    {days.map((d) => (
                      <div key={d.key} className="grid-12 gap-y-3 border-b hairline py-5 lg:py-6">
                        <p className="t-small col-span-12 font-medium lg:col-span-2 lg:pt-1">{d.key}</p>
                        <ul className="col-span-12 space-y-5 lg:col-span-10">
                          {d.events.map((e) => (
                            <li key={e.slug}>
                              <Row e={e} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>
      <SignInStrip verb="RSVP" returnTo="/programming" className="mt-20" />
    </div>
  );
}

/** One event in the agenda: a thumbnail, what and where, how full, and its RSVP */
function Row({ e }: { e: BuildingEvent }) {
  return (
    <div className="group flex items-center gap-4 sm:gap-6">
      <Link href={`/programming/${e.slug}`} className="relative aspect-[4/3] w-24 shrink-0 overflow-hidden sm:w-36">
        <Image
          src={e.image.src}
          alt=""
          fill
          sizes="144px"
          className="object-cover transition-transform duration-700 group-hover:scale-[1.05]"
          style={{ objectPosition: e.image.pos }}
        />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="t-meta">
          {e.kicker}
          {accessLabel(e) && <span className="text-accent"> · {accessLabel(e)}</span>}
        </p>
        <Link href={`/programming/${e.slug}`} className="t-h3 mt-0.5 block transition-colors hover:text-accent">
          {e.name}
        </Link>
        <p className="t-meta mt-0.5">
          {fmtRange(e.startsAt, addMin(e.startsAt, e.durationMin))} · {e.place}
        </p>
        <div className="mt-2 flex items-center justify-between gap-3 sm:hidden">
          <Status e={e} />
          <Rsvp e={e} />
        </div>
      </div>
      <div className="hidden w-44 shrink-0 text-right sm:block">
        <Status e={e} />
      </div>
      <div className="hidden w-32 shrink-0 justify-end sm:flex">
        <Rsvp e={e} />
      </div>
    </div>
  );
}

/** How full it is, in words */
function Status({ e }: { e: BuildingEvent }) {
  const left = e.capacity - e.going;
  return (
    <p className={cn("t-meta", left <= 0 ? "text-hold" : left <= 5 && "text-accent")}>
      {left <= 0 ? "Full · waitlist open" : `${e.going} going · ${left} ${left === 1 ? "spot" : "spots"} left`}
    </p>
  );
}

/** The RSVP: you're going, a sign-in first, invite only, or straight to the event to RSVP */
function Rsvp({ e, size }: { e: BuildingEvent; size?: "lg" }) {
  const s = useDemo();
  const { member } = useTenant();
  const hydrated = useHydrated();
  const mine = hydrated ? findActive(s, "event", e.slug) : undefined;
  const cls = cn(
    "inline-flex shrink-0 items-center rounded-full font-medium transition-colors",
    size === "lg" ? "h-11 px-5 text-[0.9375rem]" : "h-9 px-4 text-[0.8125rem]",
  );
  const quiet = cn(cls, "text-stone shadow-[inset_0_0_0_1px_var(--color-line-2)]");
  if (mine) return <span className={cn(cls, "bg-ok-soft text-ok")}>{mine.status === "waitlist" ? "Waitlisted" : "Going"}</span>;
  if (e.access.type === "vip") return <span className={quiet}>Invite only</span>;
  const verb = e.going >= e.capacity ? "Join waitlist" : "RSVP";
  const href = `/programming/${e.slug}`;
  if (e.access.type === "company" && (!hydrated || !isMember(s.persona) || e.access.company !== member.company))
    return <span className={quiet}>{e.access.company} only</span>;
  if (!hydrated || !isMember(s.persona))
    return (
      <Link href={gateHref(href)} className={cn(cls, "bg-ink text-paper hover:bg-accent")}>
        {hydrated ? gateLabel(s.persona, verb === "RSVP" ? "RSVP" : "join") : verb}
      </Link>
    );
  // Members RSVP right here; the event page has the details
  return (
    <button type="button" onClick={() => rsvpEvent(e, e.going >= e.capacity)} className={cn(cls, "bg-ink text-paper hover:bg-accent")}>
      {verb}
    </button>
  );
}
