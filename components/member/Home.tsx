"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { kindLabel } from "@/lib/commit";
import type { Commitment } from "@/lib/data/types";
import { actions, useDemo, useHydrated } from "@/lib/store";
import { useTenant } from "@/lib/tenants/client";

import { fmtDay, fmtRange, until } from "@/lib/time";
import { useNow as useClock } from "@/lib/useNow";
import Image from "@/components/ui/SmoothImage";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { CommitmentRow, CommitmentSheet, isUpcoming, useNow } from "./Commitments";
import { EventCard } from "./EventCard";
import { ActivityCenter } from "./home/ActivityCenter";
import { DayHero } from "./home/DayHero";
import { InsideTheBuilding } from "./home/InsideTheBuilding";
import { WhatYouCanUse } from "./home/WhatYouCanUse";

function greeting(now: number) {
  const h = new Date(now).getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}


function EventsRail({ title }: { title?: string }) {
  const t = useTenant();
  const now = useClock(60000);
  const list = useMemo(
    () =>
      t
        .events()
        .filter((e) => new Date(e.startsAt).getTime() > now)
        .slice(0, 4),
    [now, t],
  );
  if (!t.building.services.programming || !list.length) return null; // no invented programming
  return (
    <section className="py-20 lg:py-28" aria-labelledby="ev-h">
      <div className="frame flex items-end justify-between gap-6">
        <h2 id="ev-h" className="t-h1">
          {title ?? `This week at ${t.copy.the}`}
        </h2>
        <Link href="/programming" className="group hidden items-center gap-1.5 font-medium sm:flex">
          All events <Icon name="arrow-right" size={18} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
      <div className="no-scrollbar mt-10 flex snap-x snap-mandatory scroll-px-[var(--gutter)] gap-4 overflow-x-auto px-[var(--gutter)] lg:grid lg:grid-cols-4 lg:gap-[var(--col-gap)] lg:overflow-visible">
        {list.map((e) => (
          <EventCard key={e.slug} e={e} className="w-[72vw] shrink-0 snap-start sm:w-[44vw] lg:w-auto" />
        ))}
      </div>
    </section>
  );
}

/* ---------------- Before building access: signed out, a public account, or verifying ---------------- */

function SignedOut() {
  const { copy } = useTenant();
  return (
    <>
      <DayHero
        lines={copy.memberHero.lines}
        lead="Browse everything first. Sign in when you want to book, and confirm where you work once."
        actions={
          <>
            <ButtonLink href="/sign-in?returnTo=%2Fhome" variant="light" size="lg" icon="arrow-right">
              Sign in
            </ButtonLink>
            <ButtonLink href="#inside" variant="glass" size="lg">
              Look inside
            </ButtonLink>
          </>
        }
      />
      <WhatYouCanUse />
      <InsideTheBuilding />
      <EventsRail />
    </>
  );
}

function PublicAccount() {
  const s = useDemo();
  const { member, copy } = useTenant();
  return (
    <>
      <DayHero
        lines={["Welcome back,", `${member.first}.`]}
        lead={
          <>
            You&apos;re signed in as {s.account?.primary}. Work at {copy.the}? Confirm your work email once to use what the building offers its
            tenants.
          </>
        }
        actions={
          <>
            <ButtonLink href="/sign-in?returnTo=%2Fhome" variant="light" size="lg" icon="arrow-right">
              Verify your work email
            </ButtonLink>
            <ButtonLink href="/venues/inquire" variant="glass" size="lg">
              Plan another event
            </ButtonLink>
          </>
        }
        aside={<ActivityCenter />}
      />
      <WhatYouCanUse lead="Some of this is open to everyone. The rest opens up once you confirm where you work." />
      <InsideTheBuilding />
      <EventsRail title={`What's on at ${copy.the}`} />
    </>
  );
}

function Verifying() {
  const s = useDemo();
  const { member, copy } = useTenant();
  const domain = s.account?.work?.split("@")[1];
  return (
    <>
      <DayHero
        lines={["Almost there,", `${member.first}.`]}
        lead="Until then, browse everything. Anything open to the public is yours already."
        aside={
          <HeroCard>
            <span className="grid size-10 place-items-center rounded-full bg-[#f0c77e]/20 text-[#f0c77e]">
              <Icon name="clock" size={20} />
            </span>
            <p className="mt-4 font-medium">Your building access is being confirmed</p>
            <p className="t-small mt-1.5 text-moon/75">
              The building team is checking {domain ? <span className="text-moon">{domain}</span> : "your work email"} for {copy.the}. It usually takes a
              working day, and we&apos;ll email you.
            </p>
            <Link href="/sign-in?returnTo=%2Fhome" className="group/l mt-4 inline-flex items-center gap-1.5 text-[0.9375rem] font-medium">
              See the status <Icon name="arrow-right" size={16} className="transition-transform group-hover/l:translate-x-0.5" />
            </Link>
          </HeroCard>
        }
      />
      <WhatYouCanUse />
      <InsideTheBuilding />
      <EventsRail />
    </>
  );
}

/* ---------------- New member ---------------- */

function NewMember({ onOpen }: { onOpen: (c: Commitment) => void }) {
  const s = useDemo();
  const { copy, fitness, member, building } = useTenant();
  const now = useNow();
  const reduce = useReducedMotion();
  const upcoming = s.commitments.filter((c) => isUpcoming(c, now)).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const has = (k: Commitment["kind"]) => s.commitments.some((c) => c.kind === k && c.status !== "cancelled");

  const fw = copy.firstWeek;
  const steps: { done: boolean; t: string; d: string; href?: string; img: string; cta: string; dismiss?: string }[] = [
    ...(building.services.spaces ? [{ done: has("room"), t: "Book a room", d: fw.room.d, href: "/spaces", img: fw.room.img.src, cta: "Find a room" }] : []),
    ...(building.services.programming
      ? [{ done: has("event"), t: "Say yes to something", d: fw.event.d, href: "/programming", img: fw.event.img.src, cta: "See events" }]
      : []),
    ...(fitness
      ? [
          {
            done: has("class") || s.fitnessMember,
            t: `Try ${fitness.name}`,
            d: s.fitnessMember ? "You're a member. Book your first class." : "Classes need a membership. See what's included first.",
            href: "/fitness",
            img: fitness.templates.strength.image.src,
            cta: "Take a look",
          },
        ]
      : []),
    {
      done: s.dismissed.includes("concierge"),
      t: "Meet the concierge",
      d: `${copy.concierge}. They can do almost anything.`,
      img: fw.concierge.img.src,
      cta: "Got it",
      dismiss: "concierge",
    },
  ];
  const doneCount = steps.filter((x) => x.done).length;
  const first = steps.find((x) => !x.done);

  return (
    <>
      <DayHero
        lines={[`Welcome to ${copy.the},`, `${member.first}.`]}
        lead={
          <>
            You&apos;re set up with {member.company} on {member.floor}.
          </>
        }
        aside={
          first && (
            <HeroCard>
              <p className="t-meta text-moon-2">
                A good first step · {doneCount + 1} of {steps.length}
              </p>
              <div className="mt-3 flex gap-4">
                <span className="media relative size-16 shrink-0 overflow-hidden">
                  <Image src={first.img} alt="" fill sizes="64px" className="object-cover" />
                </span>
                <span className="min-w-0">
                  <span className="block font-medium">{first.t}</span>
                  <span className="t-small mt-1 block text-moon/75">{first.d}</span>
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                {first.href ? (
                  <Link href={first.href} className="group/l inline-flex items-center gap-1.5 text-[0.9375rem] font-medium">
                    {first.cta} <Icon name="arrow-right" size={16} className="transition-transform group-hover/l:translate-x-0.5" />
                  </Link>
                ) : (
                  <button onClick={() => actions.dismiss(first.dismiss!)} className="text-[0.9375rem] font-medium underline decoration-moon/30 underline-offset-4">
                    {first.cta}
                  </button>
                )}
                <a href="#first-h" className="t-small text-moon-2 hover:text-moon">
                  Your first week
                </a>
              </div>
            </HeroCard>
          )
        }
      />

      <section className="scroll-mt-[calc(var(--nav-h)+24px)] pt-20 lg:pt-28" aria-labelledby="first-h" id="first">
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
                className="block h-full rounded-full bg-accent"
                animate={{ width: `${(doneCount / steps.length) * 100}%` }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              />
            </span>
          </div>
        </div>
        <ol
          className="no-scrollbar mt-6 flex snap-x snap-mandatory scroll-px-[var(--gutter)] gap-3 overflow-x-auto px-[var(--gutter)] pb-2 lg:grid lg:gap-[var(--col-gap)] lg:overflow-visible"
          style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
        >
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
                      <Link href={x.href!} className="group/l mt-5 inline-flex items-center gap-1.5 self-start text-[0.9375rem] font-medium">
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

      <InsideTheBuilding personal />
      <EventsRail />
      <WhatYouCanUse heading="Everything that's here" />
    </>
  );
}

/* ---------------- Returning member ---------------- */

function Returning({ onOpen }: { onOpen: (c: Commitment) => void }) {
  const s = useDemo();
  const { copy, member, fitness } = useTenant();
  const now = useNow();
  const upcoming = s.commitments.filter((c) => isUpcoming(c, now)).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const [next, ...later] = upcoming;

  const again = copy.usuals.filter((x) => s.history.includes(x.id));

  return (
    <>
      <DayHero
        lines={[`${greeting(now)},`, `${member.first}.`]}
        aside={
          next ? (
            <HeroNext c={next} now={now} onOpen={onOpen} />
          ) : (
            <HeroCard>
              <p className="t-meta text-moon-2">Up next</p>
              <p className="t-h3 mt-2">Nothing on the books.</p>
              <p className="t-small mt-1.5 text-moon/75">Your calendar&apos;s clear. Book one of your usuals, or see what&apos;s on this week.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <ButtonLink href={fitness ? "/fitness/schedule" : "/spaces"} variant="light" size="sm" icon="arrow-right">
                  {fitness ? "Class schedule" : "Find a room"}
                </ButtonLink>
                <ButtonLink href="/programming" variant="glass" size="sm">
                  Events
                </ButtonLink>
              </div>
            </HeroCard>
          )
        }
      />

      <section className="frame grid gap-3 pt-12 lg:grid-cols-12" aria-label="Your plans">
        <div className="flex flex-col gap-3 lg:col-span-7">
          <div className="flex items-center justify-between">
            <h2 className="t-h3">Later this week</h2>
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

      <div className="pt-20 lg:pt-28">
        <InsideTheBuilding personal />
      </div>
      <EventsRail title="Happening this week" />
      <WhatYouCanUse heading="Explore the building" />
    </>
  );
}

/** A glass card that sits on the hero photo */
function HeroCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] bg-night/55 p-5 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12)] backdrop-blur-xl sm:p-6">{children}</div>
  );
}

/** What's next, on the hero: what, when, where and how long until */
function HeroNext({ c, now, onOpen }: { c: Commitment; now: number; onOpen: (c: Commitment) => void }) {
  const live = new Date(c.startsAt).getTime() <= now;
  return (
    <HeroCard>
      <div className="flex items-center gap-2">
        <span className="keep-round size-2 animate-live rounded-full bg-accent-glow" />
        <span className="t-meta text-moon-2">Up next · {kindLabel[c.kind]}</span>
      </div>
      <div className="mt-3 flex gap-4">
        {c.image && (
          <span className="media relative size-16 shrink-0 overflow-hidden">
            <Image src={c.image.src} alt="" fill sizes="64px" className="object-cover" />
          </span>
        )}
        <span className="min-w-0">
          <span className="t-h3 block">{c.title}</span>
          <span className="t-small mt-1 block text-moon/75">
            {fmtDay(c.startsAt)} · {fmtRange(c.startsAt, c.endsAt)} · {c.place}
          </span>
        </span>
      </div>
      <div className="mt-5 flex items-end justify-between gap-4">
        <p className="t-num text-[2rem] font-medium leading-none">{live ? "Now" : until(c.startsAt, now)}</p>
        <button onClick={() => onOpen(c)} className="inline-flex items-center gap-1.5 text-[0.9375rem] font-medium">
          Details <Icon name="arrow-right" size={16} />
        </button>
      </div>
    </HeroCard>
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
      {s.persona === "signed-out" ? (
        <SignedOut />
      ) : s.persona === "public" ? (
        <PublicAccount />
      ) : s.persona === "verifying" ? (
        <Verifying />
      ) : s.persona === "new" ? (
        <NewMember onOpen={setOpen} />
      ) : (
        <Returning onOpen={setOpen} />
      )}
      <CommitmentSheet c={live} onClose={() => setOpen(null)} />
    </div>
  );
}
