"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import type { Commitment } from "@/lib/data/types";
import { actions, useDemo, useHydrated } from "@/lib/store";
import { useTenant } from "@/lib/tenants/client";

import { useNow as useClock } from "@/lib/useNow";
import Image from "@/components/ui/SmoothImage";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { CommitmentRow, CommitmentSheet, UpNext, isUpcoming, useNow } from "./Commitments";
import { EventCard } from "./EventCard";
import { ActivityCenter } from "./home/ActivityCenter";
import { BuildingDoor } from "./home/BuildingDoor";
import { WhatYouCanUse } from "./home/WhatYouCanUse";

function greeting(now: number) {
  const h = new Date(now).getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

const today = (now: number) => new Date(now).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

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
      <BuildingDoor
        lines={copy.memberHero.lines}
        lead="Browse everything first. Sign in when you want to book, and confirm where you work once."
        actions={
          <>
            <ButtonLink href="/sign-in?returnTo=%2Fhome" variant="light" size="lg" icon="arrow-right">
              Sign in
            </ButtonLink>
            <ButtonLink href="#use-h" variant="glass" size="lg">
              What you can use
            </ButtonLink>
          </>
        }
      />
      <WhatYouCanUse />
      <EventsRail />
    </>
  );
}

function PublicAccount() {
  const s = useDemo();
  const { member, copy } = useTenant();
  return (
    <>
      <BuildingDoor
        kicker="Your account"
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
      >
        <ActivityCenter />
      </BuildingDoor>
      <WhatYouCanUse lead="Some of this is open to everyone. The rest opens up once you confirm where you work." />
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
      <BuildingDoor
        lines={["Almost there,", `${member.first}.`]}
        lead={
          <>
            The building team is confirming {domain ? <span className="text-moon">{domain}</span> : "your work email"} for {copy.the}. It usually takes a
            working day. Until then, browse everything; the green floors are already yours.
          </>
        }
        actions={
          <ButtonLink href="/sign-in?returnTo=%2Fhome" variant="glass" size="lg" iconLeft="clock">
            Access being verified
          </ButtonLink>
        }
      />
      <WhatYouCanUse />
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

  return (
    <>
      <BuildingDoor
        personal
        kicker={today(now)}
        lines={[`Welcome to ${copy.the},`, `${member.first}.`]}
        lead={
          <>
            You&apos;re set up with {member.company} on {member.floor}. Everything green is yours today; pick a floor to see what&apos;s there.
          </>
        }
        actions={
          <ButtonLink href="#first-h" variant="light" size="lg" icon="arrow-right">
            Your first week
          </ButtonLink>
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
      <section className="frame pt-[calc(var(--nav-h)+40px)] lg:pt-[calc(var(--nav-h)+64px)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="t-lead text-stone">{today(now)}</p>
            <h1 className="t-hero mt-2">
              {greeting(now)}, {member.first}.
            </h1>
          </div>
          <p className="t-small flex items-center gap-2 text-stone">
            <Icon name="sun" size={18} />
            {copy.weather}
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
                {fitness ? (
                  <ButtonLink href="/fitness/schedule" icon="arrow-right">
                    Class schedule
                  </ButtonLink>
                ) : (
                  <ButtonLink href="/spaces" icon="arrow-right">
                    Find a room
                  </ButtonLink>
                )}
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

      <div className="pt-16 lg:pt-20">
        <BuildingDoor
          personal
          kicker="Right now"
          lines={["Your building,", "floor by floor."]}
          lead="Today's plans are pinned where they happen. Pick a floor to see what's there."
        />
      </div>
      <EventsRail title="Happening this week" />
      <WhatYouCanUse heading="Explore the building" />
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
