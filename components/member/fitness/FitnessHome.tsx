"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import type { ClassSession, Resource } from "@/lib/data/types";
import { actions, useDemo, useHydrated } from "@/lib/store";
import { useTenant } from "@/lib/tenants/client";
import { at, addMin, fmtDay, fmtTime, week } from "@/lib/time";
import { useNow } from "@/lib/useNow";
import { LineReveal, Reveal } from "@/components/motion/Reveal";
import Image from "@/components/ui/SmoothImage";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Pill } from "@/components/ui/Pill";
import { ClassAction } from "./ClassAction";
import { ClassSheet, Intensity } from "./ClassSheet";
import { ResourceSheet } from "./ResourceSheet";

function AccessCard() {
  const s = useDemo();
  const { membership } = useTenant().fitness!;
  const hydrated = useHydrated();
  if (!hydrated) return <div className="h-[260px] rounded-[var(--radius-media)] bg-paper/60" />;
  const member = s.persona !== "signed-out" && s.fitnessMember;

  return (
    <div className={cn("rounded-[var(--radius-media)] p-6 sm:p-8", member ? "bg-paper shadow-[var(--shadow-ring)]" : "theme-night")}>
      <div className="flex items-center justify-between gap-4">
        <p className="t-meta">Your access</p>
        {member ? (
          <Pill tone="ok" dot>
            Active member
          </Pill>
        ) : s.persona === "signed-out" ? (
          <Pill tone="night">Not signed in</Pill>
        ) : (
          <Pill tone="night">No membership yet</Pill>
        )}
      </div>
      <p className="t-h2 mt-5">{member ? "You're all set." : `${membership.name}, ${membership.price}`}</p>
      <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
        {membership.perks.map((p) => (
          <li key={p} className="t-small flex items-center gap-2.5">
            <Icon name="check" size={15} strokeWidth={2} className={member ? "text-ok" : "text-accent-glow"} />
            {p}
          </li>
        ))}
      </ul>
      <div className="mt-7 flex flex-wrap items-center gap-3">
        {member ? (
          <>
            <ButtonLink href="/fitness/schedule" icon="arrow-right">
              Book a class
            </ButtonLink>
            <ButtonLink href="/account" variant="ghost">
              Manage membership
            </ButtonLink>
          </>
        ) : s.persona === "signed-out" ? (
          <ButtonLink href="/sign-in?returnTo=%2Ffitness" variant="light" icon="arrow-right">
            Sign in to see your access
          </ButtonLink>
        ) : (
          <ButtonLink href="/account/membership?returnTo=%2Ffitness" variant="light" icon="arrow-right">
            Start membership
          </ButtonLink>
        )}
      </div>
      {!member && <p className="t-meta mt-4">{membership.note}</p>}
    </div>
  );
}

export function FitnessHome() {
  const s = useDemo();
  const tenant = useTenant();
  const fit = tenant.fitness!;
  const { templates: classTemplates, resources } = fit;
  const { sessionsFor } = tenant;
  const hydrated = useHydrated();
  const [open, setOpen] = useState<ClassSession | null>(null);
  const [res, setRes] = useState<Resource | null>(null);
  const [asked, setAsked] = useState<string | null>(null);

  const now = useNow(60000);
  const upcoming = useMemo(() => {
    return week()
      .flatMap(sessionsFor)
      .filter((c) => new Date(c.startsAt).getTime() > now)
      .slice(0, 4);
  }, [now, sessionsFor]);

  // Everyone who coaches a class here
  const coaches = tenant.people.filter((p) => Object.values(fit.weekly).some((day) => day.some(([, , coach]) => coach === p.id)));
  const trainingRequested = hydrated && s.commitments.some((c) => c.kind === "training" && c.status !== "cancelled");

  const requestIntro = (id: string) => {
    if (s.persona === "signed-out") return;
    const coach = coaches.find((c) => c.id === id)!;
    const start = at(3, 8 * 60);
    actions.add(
      {
        kind: "training",
        refId: id,
        title: `Intro session with ${coach.name.split(" ")[0]}`,
        startsAt: start,
        endsAt: addMin(start, 30),
        place: `${classTemplates.strength.studio} · L${fit.level}`,
        status: "pending",
        detail: "Your coach will confirm a time that works",
      },
      { title: "Intro requested", body: `${coach.name.split(" ")[0]} will confirm a time`, href: "/plans" },
    );
    setAsked(id);
  };

  return (
    <div className="pb-tab lg:pb-28">
      {/* Hero */}
      <section data-nav-over className="theme-night relative flex min-h-[88svh] flex-col justify-end overflow-hidden">
        <Image
          src={fit.hero.src}
          alt={fit.hero.alt}
          fill
          priority
          quality={90}
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition: fit.hero.pos }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-night via-night/35 to-night/20" />
        <div className="frame relative grid-12 gap-y-8 pb-12 pt-40 lg:pb-16">
          <div className="col-span-12 lg:col-span-9">
            <p className="t-lead text-moon/80 animate-rise">
              {fit.name} · Level {fit.level}
            </p>
            <LineReveal as="h1" className="t-mega mt-4" lines={["Two floors down", "from your desk."]} />
          </div>
          <Reveal delay={0.3} className="col-span-12 flex flex-wrap items-end gap-3 lg:col-span-3 lg:justify-end">
            <ButtonLink href="/fitness/schedule" variant="light" size="lg" icon="arrow-right">
              See the schedule
            </ButtonLink>
          </Reveal>
        </div>
      </section>

      {/* Access + next classes */}
      <section className="frame grid-12 mt-12 gap-y-10 lg:mt-20">
        <div className="col-span-12 lg:col-span-5">
          <AccessCard />
        </div>
        <div className="col-span-12 lg:col-span-6 lg:col-start-7">
          <div className="flex items-end justify-between">
            <h2 className="t-h2">Coming up</h2>
            <Link href="/fitness/schedule" className="group flex items-center gap-1.5 font-medium">
              Full schedule <Icon name="arrow-right" size={17} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <ul className="mt-6 divide-y divide-line border-y hairline">
            {upcoming.map((c) => {
              const t = classTemplates[c.kind];
              return (
                <li key={c.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setOpen(c)}
                    onKeyDown={(e) => e.key === "Enter" && setOpen(c)}
                    className="group flex cursor-pointer items-center gap-4 py-4"
                  >
                    <div className="w-20 shrink-0">
                      <p className="t-meta">{fmtDay(c.startsAt)}</p>
                      <p className="t-num text-[1.25rem] font-medium">{fmtTime(c.startsAt)}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium group-hover:underline group-hover:decoration-ink/25 group-hover:underline-offset-4">{t.name}</p>
                      <p className="t-meta">
                        {t.durationMin} min · {t.studio}
                      </p>
                    </div>
                    <ClassAction c={c} returnTo={`/fitness/schedule?class=${encodeURIComponent(c.id)}`} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Class types */}
      <section className="pt-24 lg:pt-32" aria-labelledby="types-h">
        <div className="frame">
          <h2 id="types-h" className="t-h1 max-w-[16ch]">
            Five ways to move, every weekday.
          </h2>
        </div>
        <div className="no-scrollbar mt-10 flex snap-x snap-mandatory scroll-px-[var(--gutter)] gap-3 overflow-x-auto px-[var(--gutter)] pb-2 lg:gap-5">
          {Object.values(classTemplates).map((t) => (
            <Link key={t.kind} href={`/fitness/schedule?kind=${t.kind}`} className="group w-[70vw] shrink-0 snap-start sm:w-[40vw] lg:w-[23vw]">
              <div className="media relative aspect-[3/4]">
                <Image
                  src={t.image.src}
                  alt={t.image.alt}
                  fill
                  sizes="(min-width:1024px) 23vw, 70vw"
                  className="object-cover transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-[1.04]"
                  style={{ objectPosition: t.image.pos }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-5 text-white">
                  <div>
                    <p className="t-h3">{t.name}</p>
                    <p className="text-[0.8125rem] text-white/75">
                      {t.durationMin} min · {t.studio}
                    </p>
                  </div>
                  <span className="text-white [&_span]:!bg-white/80 [&_span.bg-line-2]:!bg-white/25">
                    <Intensity n={t.intensity} />
                  </span>
                </div>
              </div>
              <p className="t-small mt-3 line-clamp-2 text-stone">{t.summary}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Studios */}
      <section className="frame pt-24 lg:pt-32" aria-labelledby="studio-h">
        <div className="grid-12 gap-y-6">
          <h2 id="studio-h" className="t-h1 col-span-12 lg:col-span-5">
            Book the room, not the class.
          </h2>
          <p className="t-lead col-span-12 self-end text-stone lg:col-span-5 lg:col-start-8">
            Ride on your own schedule, or take thirty quiet minutes in the recovery lounge.
          </p>
        </div>
        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          {resources.map((r, i) => (
            <button key={r.slug} onClick={() => setRes(r)} className="group relative overflow-hidden rounded-[var(--radius-media)] text-left">
              <div className={cn("relative", i === 0 ? "aspect-[4/3]" : "aspect-[4/3]")}>
                <Image
                  src={r.image.src}
                  alt={r.image.alt}
                  fill
                  sizes="(min-width:1024px) 50vw, 100vw"
                  className="object-cover transition-transform duration-[1.4s] ease-[var(--ease-out-expo)] group-hover:scale-[1.03]"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6 text-white sm:p-8">
                <div>
                  <p className="t-h2">{r.name}</p>
                  <p className="t-small mt-1 max-w-[40ch] text-white/80">{r.summary}</p>
                </div>
                <span className="flex h-11 shrink-0 items-center gap-2 rounded-full bg-white px-4 text-[0.875rem] font-medium text-ink transition-transform group-hover:-translate-y-0.5">
                  Book · {r.slotMin} min
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Personal training */}
      <section className="frame pt-24 lg:pt-32" aria-labelledby="pt-h">
        <div className="rounded-[var(--radius-media)] bg-paper p-6 shadow-[var(--shadow-ring)] sm:p-10">
          <div className="grid-12 gap-y-8">
            <div className="col-span-12 lg:col-span-5">
              <h2 id="pt-h" className="t-h1">
                One-on-one, when you want more.
              </h2>
              <p className="t-body mt-4 text-stone">
                Start with a free 30-minute intro. Your coach looks at how you move and what you want, then suggests a plan. Sessions after that are booked
                directly with them (sample terms).
              </p>
              {trainingRequested && (
                <p className="t-small mt-5 flex items-center gap-2 rounded-2xl bg-hold-soft px-4 py-3 text-hold">
                  <Icon name="clock" size={16} /> Intro requested. It&apos;s waiting in your plans.
                </p>
              )}
            </div>
            <ul className="col-span-12 grid gap-3 sm:grid-cols-3 lg:col-span-6 lg:col-start-7">
              {coaches.map((c) => (
                <li key={c.id} className="flex flex-col rounded-[var(--radius-card)] bg-quartz p-5">
                  <span className="grid size-14 place-items-center rounded-full bg-ink text-[1rem] font-semibold text-paper">{c.initials}</span>
                  <p className="mt-5 font-medium">{c.name}</p>
                  <p className="t-meta">{c.role}</p>
                  <p className="t-small mt-3 flex-1 text-stone">{c.bio}</p>
                  {hydrated && s.persona === "signed-out" ? (
                    <Link href="/sign-in?returnTo=%2Ffitness" className="mt-5 text-[0.875rem] font-medium underline decoration-ink/25 underline-offset-4">
                      Sign in to request
                    </Link>
                  ) : (
                    <button
                      disabled={asked === c.id}
                      onClick={() => requestIntro(c.id)}
                      className="mt-5 h-10 rounded-full bg-ink text-[0.875rem] font-medium text-paper transition-colors hover:bg-ink-2 disabled:bg-ok-soft disabled:text-ok"
                    >
                      {asked === c.id ? "Requested" : "Request an intro"}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <ClassSheet c={open} onClose={() => setOpen(null)} returnTo={open ? `/fitness/schedule?class=${encodeURIComponent(open.id)}` : "/fitness"} />
      <ResourceSheet r={res} onClose={() => setRes(null)} />
    </div>
  );
}
