"use client";

import { images } from "@/lib/data/images";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { building } from "@/lib/data/building";
import { events } from "@/lib/data/events";
import { classTemplates, sessionsFor } from "@/lib/data/fitness";
import { busyFor, rooms } from "@/lib/data/rooms";
import type { Commitment } from "@/lib/data/types";
import { actions, currentMember, useDemo, useHydrated } from "@/lib/store";
import { fmtTime, week } from "@/lib/time";
import { useNow as useClock } from "@/lib/useNow";
import { LineReveal, Reveal } from "@/components/motion/Reveal";
import Image from "@/components/ui/SmoothImage";
import { ButtonLink } from "@/components/ui/Button";
import { Icon, type AnyIcon } from "@/components/ui/Icon";
import { CommitmentRow, CommitmentSheet, UpNext, isUpcoming, useNow } from "./Commitments";
import { EventCard } from "./EventCard";
import { ServiceTabs } from "./ServiceTabs";

function greeting(now: number) {
  const h = new Date(now).getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

const today = (now: number) => new Date(now).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

function EventsRail({ title = "This week at the Pyramid" }: { title?: string }) {
  const now = useClock(60000);
  const list = useMemo(
    () =>
      events()
        .filter((e) => new Date(e.startsAt).getTime() > now)
        .slice(0, 4),
    [now],
  );
  if (!list.length) return null; // no invented programming
  return (
    <section className="py-20 lg:py-28" aria-labelledby="ev-h">
      <div className="frame flex items-end justify-between gap-6">
        <h2 id="ev-h" className="t-h1">
          {title}
        </h2>
        <Link href="/programming" className="group hidden items-center gap-1.5 font-medium sm:flex">
          All events <Icon name="arrow-right" size={18} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
      <div className="no-scrollbar mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-[var(--gutter)] lg:grid lg:grid-cols-4 lg:gap-[var(--col-gap)] lg:overflow-visible">
        {list.map((e) => (
          <EventCard key={e.slug} e={e} className="w-[72vw] shrink-0 snap-start sm:w-[44vw] lg:w-auto" />
        ))}
      </div>
    </section>
  );
}

/* ---------------- Signed out ---------------- */

function SignedOut() {
  const access: { icon: AnyIcon; t: string; d: string; tag: string }[] = [
    { icon: "access", t: "Your building access", d: "Meeting rooms, building events and the concierge. Sign in with your work email.", tag: "Included" },
    { icon: "fitness", t: "Pyramid Fitness", d: "Classes, the Ride studio and the recovery lounge. A separate monthly membership.", tag: "Membership" },
    { icon: "people", t: "The events team", d: "Receptions, offsites and dinners, planned with you. Start with a short inquiry.", tag: "On request" },
  ];
  return (
    <>
      <section data-nav-over className="theme-night relative flex min-h-[92svh] flex-col justify-end overflow-hidden">
        <Image
          src={images.bayDusk.src}
          alt={images.bayDusk.alt}
          fill
          priority
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition: "50% 55%" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-night via-night/40 to-night/10" />
        <div className="frame relative pb-12 pt-40 lg:pb-16">
          <p className="t-lead text-moon/80 animate-rise">{building.name} · Members</p>
          <LineReveal as="h1" className="t-mega mt-4 max-w-[12ch]" lines={["Everything the", "Pyramid has,", "in one place."]} />
          <Reveal delay={0.35} className="mt-8 flex flex-wrap items-center gap-3">
            <ButtonLink href="/sign-in?returnTo=%2F" variant="light" size="lg" icon="arrow-right">
              Sign in with your work email
            </ButtonLink>
            <ButtonLink href="#explore" variant="glass" size="lg">
              Look around first
            </ButtonLink>
          </Reveal>
        </div>
      </section>

      <div id="explore" className="pt-20 lg:pt-28">
        <ServiceTabs heading="What's here for you" />
      </div>

      <section className="frame pt-24 lg:pt-32" aria-labelledby="acc-h">
        <div className="grid-12 gap-y-8">
          <div className="col-span-12 lg:col-span-4">
            <h2 id="acc-h" className="t-h1">
              What you can use
            </h2>
            <p className="t-lead mt-4 text-stone">Working here gets you in the door. A couple of things are memberships, and we&apos;ll always say which.</p>
          </div>
          <ul className="col-span-12 grid gap-3 sm:grid-cols-3 lg:col-span-8">
            {access.map((a, i) => (
              <Reveal key={a.t} delay={i * 0.06}>
                <li className="card flex h-full flex-col p-6">
                  <div className="flex items-center justify-between">
                    <span className="grid size-11 place-items-center rounded-2xl bg-fog">
                      <Icon name={a.icon} size={22} />
                    </span>
                    <span
                      className={cn("rounded-full px-2.5 py-1 text-[0.75rem] font-medium", i === 1 ? "bg-redwood-soft text-redwood-deep" : "bg-fog text-ink-2")}
                    >
                      {a.tag}
                    </span>
                  </div>
                  <p className="t-h3 mt-10">{a.t}</p>
                  <p className="t-small mt-2 text-stone">{a.d}</p>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <EventsRail />
    </>
  );
}

/* ---------------- New member ---------------- */

function NewMember({ onOpen }: { onOpen: (c: Commitment) => void }) {
  const s = useDemo();
  const now = useNow();
  const reduce = useReducedMotion();
  const upcoming = s.commitments.filter((c) => isUpcoming(c, now)).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const has = (k: Commitment["kind"]) => s.commitments.some((c) => c.kind === k && c.status !== "cancelled");

  const steps = [
    {
      done: has("room"),
      t: "Book a room",
      d: "Four rooms, instant for most. Try Clay for a quiet one-on-one.",
      href: "/spaces",
      img: images.huddle.src,
      cta: "Find a room",
    },
    {
      done: has("event"),
      t: "Say yes to something",
      d: "The Pyramid at 54 is a great first one.",
      href: "/programming",
      img: images.historyGallery.src,
      cta: "See events",
    },
    {
      done: has("class") || s.fitnessMember,
      t: "Try Pyramid Fitness",
      d: s.fitnessMember ? "You're a member. Book your first class." : "Classes need a membership. See what's included first.",
      href: "/fitness",
      img: images.strength.src,
      cta: "Take a look",
    },
    {
      done: s.dismissed.includes("concierge"),
      t: "Meet the concierge",
      d: "L1, by the Montgomery doors. They can do almost anything.",
      href: "#",
      img: images.lobbyDesk.src,
      cta: "Got it",
      dismiss: "concierge",
    },
  ];
  const doneCount = steps.filter((x) => x.done).length;

  return (
    <>
      <section className="frame pb-4 pt-[calc(var(--nav-h)+48px)] lg:pt-[calc(var(--nav-h)+72px)]">
        <p className="t-lead text-stone">{today(now)}</p>
        <LineReveal as="h1" className="t-hero mt-3" lines={[`Welcome to the Pyramid,`, `${currentMember.first}.`]} />
        <p className="t-lead mt-5 max-w-[48ch] text-stone">
          You&apos;re set up with {currentMember.company} on {currentMember.floor}. Here are four good first steps; do them in any order.
        </p>
      </section>

      <section className="pt-10" aria-labelledby="first-h">
        <div className="frame flex items-center justify-between gap-4">
          <h2 id="first-h" className="t-h3">
            Your first week
          </h2>
          <div className="flex items-center gap-3" aria-label={`${doneCount} of ${steps.length} done`}>
            <span className="t-meta tabular">
              {doneCount} of {steps.length}
            </span>
            <span className="h-1.5 w-28 overflow-hidden rounded-full bg-fog">
              <motion.span
                className="block h-full rounded-full bg-redwood"
                animate={{ width: `${(doneCount / steps.length) * 100}%` }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              />
            </span>
          </div>
        </div>
        <ol className="no-scrollbar mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-[var(--gutter)] pb-2 lg:grid lg:grid-cols-4 lg:gap-[var(--col-gap)] lg:overflow-visible">
          {steps.map((x, i) => (
            <motion.li
              key={x.t}
              initial={reduce ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.07, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="w-[78vw] shrink-0 snap-start sm:w-[46vw] lg:w-auto"
            >
              <div className={cn("card group flex h-full flex-col overflow-hidden transition-opacity", x.done && "opacity-70")}>
                <div className="relative aspect-[16/10]">
                  <Image src={x.img} alt="" fill sizes="(min-width:1024px) 25vw, 78vw" className="object-cover" style={{ objectPosition: "50% 35%" }} />
                  <span
                    className={cn(
                      "absolute left-3 top-3 grid size-8 place-items-center rounded-full text-[0.8125rem] font-semibold backdrop-blur",
                      x.done ? "bg-ok text-paper" : "bg-paper/90 text-ink",
                    )}
                  >
                    {x.done ? <Icon name="check" size={16} strokeWidth={2.2} /> : i + 1}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <p className={cn("t-h3", x.done && "line-through decoration-stone-2 decoration-1")}>{x.t}</p>
                  <p className="t-small mt-2 flex-1 text-stone">{x.d}</p>
                  {!x.done &&
                    (x.dismiss ? (
                      <button
                        onClick={() => actions.dismiss(x.dismiss!)}
                        className="mt-5 self-start text-[0.9375rem] font-medium underline decoration-ink/25 underline-offset-4 hover:decoration-ink"
                      >
                        {x.cta}
                      </button>
                    ) : (
                      <Link href={x.href} className="group/l mt-5 inline-flex items-center gap-1.5 self-start text-[0.9375rem] font-medium">
                        {x.cta}
                        <Icon name="arrow-right" size={17} className="transition-transform group-hover/l:translate-x-0.5" />
                      </Link>
                    ))}
                </div>
              </div>
            </motion.li>
          ))}
        </ol>
      </section>

      {upcoming.length > 0 && (
        <section className="frame pt-16" aria-labelledby="new-up">
          <h2 id="new-up" className="t-h3">
            Coming up
          </h2>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {upcoming.map((c) => (
              <CommitmentRow key={c.id} c={c} onOpen={onOpen} now={now} />
            ))}
          </div>
        </section>
      )}

      <div className="pt-24 lg:pt-32">
        <ServiceTabs heading="Everything that's here" />
      </div>
      <EventsRail />
    </>
  );
}

/* ---------------- Returning member ---------------- */

function RightNow() {
  const now = useNow();
  const minutes = new Date(now).getHours() * 60 + new Date(now).getMinutes();
  const freeRooms = rooms.filter((r) => r.approval === "instant" && !busyFor(r.slug, 0).some(([a, b]) => minutes >= a && minutes < b)).slice(0, 2);
  const nextClass = week()
    .slice(0, 2)
    .flatMap(sessionsFor)
    .find((c) => new Date(c.startsAt).getTime() > now && c.taken < classTemplates[c.kind].capacity);

  const tiles: { href: string; icon: AnyIcon; k: string; t: string; d: string }[] = [
    ...freeRooms.map((r) => ({
      href: `/spaces/${r.slug}`,
      icon: "spaces" as const,
      k: "Free now",
      t: `${r.name} · up to ${r.capacity}`,
      d: `Level ${r.level}. Book it for the next hour.`,
    })),
    ...(nextClass
      ? [
          {
            href: `/fitness/schedule?class=${encodeURIComponent(nextClass.id)}`,
            icon: "fitness" as const,
            k: "Spots open",
            t: `${classTemplates[nextClass.kind].name} · ${fmtTime(nextClass.startsAt)}`,
            d: `${classTemplates[nextClass.kind].capacity - nextClass.taken} spots left on L2.`,
          },
        ]
      : []),
  ];
  if (!tiles.length) return null;

  return (
    <section className="frame pt-16 lg:pt-20" aria-labelledby="now-h">
      <h2 id="now-h" className="t-h3">
        Right now in the building
      </h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {tiles.map((x) => (
          <Link key={x.href} href={x.href} className="card group flex items-start gap-4 p-5 transition-shadow hover:shadow-[var(--shadow-soft)]">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-fog">
              <Icon name={x.icon} size={21} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-ok">
                <span className="size-1.5 rounded-full bg-ok" />
                {x.k}
              </span>
              <span className="mt-1 block font-medium">{x.t}</span>
              <span className="t-small block text-stone">{x.d}</span>
            </span>
            <Icon
              name="arrow-up-right"
              size={18}
              className="shrink-0 text-stone-2 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </Link>
        ))}
      </div>
    </section>
  );
}

function Returning({ onOpen }: { onOpen: (c: Commitment) => void }) {
  const s = useDemo();
  const now = useNow();
  const upcoming = s.commitments.filter((c) => isUpcoming(c, now)).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const [next, ...later] = upcoming;

  const usuals: { id: string; label: string; icon: AnyIcon; href: string }[] = [
    { id: "ride", label: "Ride", icon: "bike", href: "/fitness/schedule?kind=ride" },
    { id: "strength", label: "Strength 45", icon: "fitness", href: "/fitness/schedule?kind=strength" },
    { id: "washington", label: "Washington boardroom", icon: "spaces", href: "/spaces/washington" },
    { id: "clay", label: "Clay room", icon: "spaces", href: "/spaces/clay" },
  ];
  const again = usuals.filter((x) => s.history.includes(x.id));

  return (
    <>
      <section className="frame pt-[calc(var(--nav-h)+40px)] lg:pt-[calc(var(--nav-h)+64px)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="t-lead text-stone">{today(now)}</p>
            <h1 className="t-hero mt-2">
              {greeting(now)}, {currentMember.first}.
            </h1>
          </div>
          <p className="t-small flex items-center gap-2 text-stone">
            <Icon name="sun" size={18} />
            Fog clearing by noon · 64°F
          </p>
        </div>
      </section>

      <section className="frame mt-10 grid gap-3 lg:grid-cols-12" aria-label="Your plans">
        <div className="lg:col-span-8">
          {next ? (
            <UpNext c={next} now={now} onOpen={onOpen} />
          ) : (
            <div className="flex h-full flex-col justify-between gap-8 rounded-[var(--radius-media)] bg-paper p-8 shadow-[var(--shadow-ring)]">
              <div>
                <p className="t-meta">Up next</p>
                <p className="t-h1 mt-3">Nothing on the books.</p>
                <p className="t-body mt-3 max-w-[44ch] text-stone">
                  Your calendar&apos;s clear. Book one of your usuals below, or see what&apos;s on this week.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <ButtonLink href="/fitness/schedule" icon="arrow-right">
                  Class schedule
                </ButtonLink>
                <ButtonLink href="/programming" variant="outline">
                  Events
                </ButtonLink>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3 lg:col-span-4">
          <div className="flex items-center justify-between">
            <h2 className="t-h3">Later</h2>
            <Link href="/plans" className="t-small font-medium text-stone hover:text-ink">
              All plans
            </Link>
          </div>
          {later.length ? (
            later.slice(0, 3).map((c) => <CommitmentRow key={c.id} c={c} onOpen={onOpen} now={now} />)
          ) : (
            <p className="t-small rounded-[var(--radius-card)] bg-fog/70 p-5 text-stone">Nothing else this week.</p>
          )}
        </div>
      </section>

      {again.length > 0 && (
        <section className="frame pt-12" aria-labelledby="again-h">
          <h2 id="again-h" className="t-h3">
            Book again
          </h2>
          <div className="no-scrollbar -mx-[var(--gutter)] mt-4 flex gap-2 overflow-x-auto px-[var(--gutter)]">
            {again.map((a) => (
              <Link
                key={a.id}
                href={a.href}
                className="flex h-12 shrink-0 items-center gap-2.5 rounded-full bg-paper pl-2 pr-5 font-medium shadow-[var(--shadow-ring)] transition-shadow hover:shadow-[var(--shadow-soft)]"
              >
                <span className="grid size-8 place-items-center rounded-full bg-fog">
                  <Icon name={a.icon} size={17} />
                </span>
                {a.label}
              </Link>
            ))}
          </div>
        </section>
      )}

      <RightNow />
      <EventsRail title="Happening this week" />
      <ServiceTabs heading="Explore the building" className="pb-8" />
    </>
  );
}

export function Home() {
  const s = useDemo();
  const hydrated = useHydrated();
  const [open, setOpen] = useState<Commitment | null>(null);
  const live = open ? (s.commitments.find((c) => c.id === open.id) ?? null) : null;

  if (!hydrated) return <div className="min-h-[100svh]" aria-busy="true" />;

  return (
    <div className="pb-tab lg:pb-24">
      {s.persona === "signed-out" ? <SignedOut /> : s.persona === "new" ? <NewMember onOpen={setOpen} /> : <Returning onOpen={setOpen} />}
      <CommitmentSheet c={live} onClose={() => setOpen(null)} />
    </div>
  );
}
