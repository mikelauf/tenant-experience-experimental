"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { classSeats } from "@/lib/commit";
import type { ClassSession, Resource } from "@/lib/data/types";
import { actions, useDemo, useHydrated } from "@/lib/store";
import { useTenant } from "@/lib/tenants/client";
import { at, addMin, fmtDay, fmtTime, week } from "@/lib/time";
import { useNow } from "@/lib/useNow";
import { LineReveal, Reveal } from "@/components/motion/Reveal";
import Image from "@/components/ui/SmoothImage";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ClassAction } from "./ClassAction";
import { ClassSheet } from "./ClassSheet";
import { ResourceSheet } from "./ResourceSheet";
import { MemberBadges } from "../MemberBadges";
import { SignInStrip } from "../SignInStrip";
import { gateHref, gateLabel, isMember } from "@/lib/access";

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS = [1, 2, 3, 4, 5];

/** A headline over two lines, broken at the space nearest its middle */
function halves(s: string): string[] {
  const mid = s.length / 2;
  const at = [...s].reduce((best, c, i) => (c === " " && Math.abs(i - mid) < Math.abs(best - mid) ? i : best), -1);
  return at < 0 ? [s] : [s.slice(0, at), s.slice(at + 1)];
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
  // One page for everyone. Before building access each step is a sign-in away; members without the membership are
  // a membership away; members book straight from it.
  const member = hydrated && isMember(s.persona);
  const fitMember = member && s.fitnessMember;
  const myNext = member
    ? s.commitments
        .filter((c) => c.kind === "class" && c.status !== "cancelled" && new Date(c.startsAt).getTime() > now)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0]
    : undefined;
  const joinHref = (returnTo: string) => `/account/membership?returnTo=${encodeURIComponent(returnTo)}`;

  const requestIntro = (id: string) => {
    if (!isMember(s.persona)) return;
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
      <section data-nav-over className="theme-night relative flex min-h-[72svh] flex-col justify-end overflow-hidden">
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
        <div className="frame relative grid-12 items-end gap-y-8 pb-10 pt-40 lg:pb-12">
          <div className="col-span-12 lg:col-span-9">
            <p className="t-lead text-moon/80 animate-rise">
              {fit.name} · Level {fit.level}
            </p>
            <LineReveal as="h1" className="t-page mt-4" lines={halves(fit.pitch.title)} />
            <MemberBadges className="mt-8" />
            <ul className={cn("t-small flex flex-wrap gap-x-6 gap-y-1 text-moon/85", member ? "mt-5" : "mt-10 lg:mt-12")}>
              {[...(fitMember ? [] : [`${fit.membership.name}, ${fit.membership.price}`]), ...fit.membership.perks.slice(0, fitMember ? 3 : 2)].map((x) => (
                <li key={x} className="flex items-center gap-2">
                  <span className="keep-round size-1 rounded-full bg-accent-glow" aria-hidden />
                  {x}
                </li>
              ))}
            </ul>
          </div>
          <Reveal delay={0.3} className="col-span-12 flex flex-wrap items-end gap-3 lg:col-span-3 lg:justify-end">
            <ButtonLink href="/fitness/schedule" variant="light" size="lg" icon="arrow-right">
              See the schedule
            </ButtonLink>
          </Reveal>
        </div>
      </section>

      {/* Coming up: the next few classes as cards, each a sign-in away */}
      <section className="frame mt-14 lg:mt-20" aria-labelledby="next-h">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="next-h" className="t-h1">
              Coming up
            </h2>
            {member && (
              <p className="t-lead mt-3 max-w-[48ch] text-stone">
                {myNext ? (
                  <>
                    You&apos;re in {myNext.title}, {fmtDay(myNext.startsAt).replace(/^(Today|Tomorrow)$/, (d) => d.toLowerCase())} at {fmtTime(myNext.startsAt)}.{" "}
                    <Link href="/plans" className="font-medium text-ink underline decoration-ink/25 underline-offset-4 hover:decoration-ink">
                      See your plans
                    </Link>
                  </>
                ) : fitMember ? (
                  "Reserve a spot, or join the waitlist when one's full."
                ) : (
                  "Classes come with the membership. Pick one, and you'll land right back on it once you've joined."
                )}
              </p>
            )}
          </div>
          <Link href="/fitness/schedule" className="group flex shrink-0 items-center gap-1.5 font-medium">
            Full schedule <Icon name="arrow-right" size={17} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <ul className="no-scrollbar -mx-[var(--gutter)] mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-[var(--gutter)] px-[var(--gutter)] pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
          {upcoming.map((c) => {
            const t = classTemplates[c.kind];
            const seats = classSeats(tenant, s, c);
            return (
              <li key={c.id} className="w-[78vw] shrink-0 snap-start sm:w-auto">
                <div className="flex h-full flex-col bg-paper shadow-[var(--shadow-ring)]">
                  <button onClick={() => setOpen(c)} className="group text-left">
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <Image
                        src={t.image.src}
                        alt={t.image.alt}
                        fill
                        sizes="(min-width:1024px) 24vw, (min-width:640px) 45vw, 78vw"
                        className="object-cover transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-[1.04]"
                        style={{ objectPosition: t.image.pos }}
                      />
                    </div>
                    <div className="px-5 pt-5">
                      <p className="t-meta">{fmtDay(c.startsAt)}</p>
                      <p className="t-num mt-0.5 text-[1.5rem] font-medium leading-tight">{fmtTime(c.startsAt)}</p>
                      <p className="t-h3 mt-3">{t.name}</p>
                      <p className="t-meta mt-0.5">
                        {t.durationMin} min · {t.studio} · with {tenant.person(c.coachId).name.split(" ")[0]}
                      </p>
                    </div>
                  </button>
                  <div className="mt-auto flex items-center justify-between gap-3 px-5 pb-5 pt-5">
                    <span className={cn("t-small", seats.full ? "text-hold" : seats.left <= 3 ? "text-accent" : "text-stone")}>
                      {seats.full ? "Full · waitlist" : `${seats.left} ${seats.left === 1 ? "spot" : "spots"} left`}
                    </span>
                    {fitMember || seats.mine ? (
                      <ClassAction c={c} returnTo={`/fitness/schedule?class=${encodeURIComponent(c.id)}`} className="h-9 text-[0.8125rem]" />
                    ) : (
                      <Link
                        href={
                          member
                            ? joinHref(`/fitness/schedule?class=${encodeURIComponent(c.id)}`)
                            : gateHref(`/fitness/schedule?class=${encodeURIComponent(c.id)}`)
                        }
                        className="inline-flex h-9 items-center rounded-full bg-ink px-4 text-[0.8125rem] font-medium text-paper transition-colors hover:bg-accent"
                      >
                        {seats.full ? "Join waitlist" : "Reserve"}
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* The week: each class a row, the weekdays as columns, its times where it runs */}
      <section className="frame pt-24 lg:pt-32" aria-labelledby="types-h">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 id="types-h" className="t-h1">
            The week at a glance
          </h2>
          <p className="t-small text-stone">{Object.keys(classTemplates).length} classes, every weekday. Tap one to see its dates.</p>
        </div>
        <div className="mt-8 border-t-2 border-ink">
          <div className="hidden grid-cols-[minmax(0,4fr)_repeat(5,minmax(0,1fr))] gap-4 border-b hairline py-3 lg:grid">
            <span className="t-meta">Class</span>
            {WEEKDAYS.map((d) => (
              <span key={d} className="t-meta">
                {DAY[d]}
              </span>
            ))}
          </div>
          <ul>
            {Object.values(classTemplates).map((t) => (
              <li key={t.kind} className="border-b hairline">
                <Link
                  href={`/fitness/schedule?kind=${t.kind}`}
                  className="group grid gap-4 py-5 lg:grid-cols-[minmax(0,4fr)_repeat(5,minmax(0,1fr))] lg:items-center"
                >
                  <div className="flex items-center gap-4">
                    <span className="relative size-16 shrink-0 overflow-hidden lg:size-20">
                      <Image src={t.image.src} alt="" fill sizes="80px" className="object-cover" style={{ objectPosition: t.image.pos }} />
                    </span>
                    <span className="min-w-0">
                      <span className="t-h3 block transition-colors group-hover:text-accent">{t.name}</span>
                      <span className="t-meta block">
                        {t.durationMin} min · {t.studio}
                      </span>
                      <span className="t-small mt-1 block max-w-[46ch] text-stone">{t.summary}</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-2 lg:contents">
                    {WEEKDAYS.map((d) => {
                      const times = (fit.weekly[d] ?? []).filter(([k]) => k === t.kind).map(([, m]) => m);
                      return (
                        <div key={d} className="flex flex-col gap-1">
                          <span className="t-meta lg:hidden">{DAY[d]}</span>
                          {times.length ? (
                            times.map((m) => (
                              <span key={m} className="t-num bg-accent-soft px-2 py-1 text-center text-[0.8125rem] font-medium text-accent-deep lg:self-start">
                                {fmtTime(m)}
                              </span>
                            ))
                          ) : (
                            <span className="py-1 text-center text-[0.8125rem] text-stone-2 lg:text-left lg:pl-2">–</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* The membership, as one band */}
      <section className="frame pt-24 lg:pt-32" aria-labelledby="mem-h">
        <div className="grid-12 items-center gap-y-6 bg-[#e9e6df] p-6 sm:p-10">
          <div className="col-span-12 lg:col-span-4">
            <p className="t-meta flex items-center gap-2">
              {fitMember && <span className="keep-round size-2 rounded-full bg-ok" aria-hidden />}
              {fitMember ? "Your membership" : "Membership"}
            </p>
            <h2 id="mem-h" className="t-h2 mt-1.5">
              {fitMember ? "You're all set." : `${fit.membership.name}, ${fit.membership.price}`}
            </h2>
            <p className="t-meta mt-2">{fitMember ? `${fit.membership.name}, ${fit.membership.price}` : fit.membership.note}</p>
          </div>
          <ul className="col-span-12 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:col-span-5">
            {fit.membership.perks.map((x) => (
              <li key={x} className="t-small flex items-center gap-2">
                <Icon name="check" size={15} strokeWidth={2} className={cn("shrink-0", fitMember ? "text-ok" : "text-accent")} />
                {x}
              </li>
            ))}
          </ul>
          <div className="col-span-12 flex flex-wrap gap-3 lg:col-span-3 lg:flex-col lg:items-end">
            {fitMember ? (
              <>
                <ButtonLink href="/fitness/schedule" icon="arrow-right">
                  Book a class
                </ButtonLink>
                <Link href="/account" className="t-small font-medium underline decoration-ink/25 underline-offset-4 hover:decoration-ink">
                  Manage membership
                </Link>
              </>
            ) : member ? (
              <ButtonLink href={joinHref("/fitness")} icon="arrow-right">
                Start your membership
              </ButtonLink>
            ) : (
              <ButtonLink href={gateHref("/fitness")} icon="arrow-right">
                {s.persona === "signed-out" ? "Sign in to see your access" : gateLabel(s.persona, "see your access")}
              </ButtonLink>
            )}
          </div>
        </div>
      </section>
      <section className="frame pt-24 lg:pt-32" aria-labelledby="also-h">
        <h2 id="also-h" className="t-h2">
          Also in the {fit.name.replace(/^The /, "")}
        </h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-3">
          {resources.map((r) => (
            <li key={r.slug}>
              <button onClick={() => setRes(r)} className="group block w-full text-left">
                <div className="media relative aspect-[4/3]">
                  <Image
                    src={r.image.src}
                    alt={r.image.alt}
                    fill
                    sizes="(min-width:640px) 30vw, 100vw"
                    className="object-cover transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-[1.04]"
                  />
                </div>
                <p className="t-h3 mt-4">{r.name}</p>
                <p className="t-small mt-1 line-clamp-2 text-stone">{r.summary}</p>
                <span className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[0.8125rem] font-medium shadow-[inset_0_0_0_1px_var(--color-ink)] transition-colors group-hover:bg-ink group-hover:text-paper">
                  Book {r.slotMin} min <Icon name="arrow-right" size={14} />
                </span>
              </button>
            </li>
          ))}
          {coaches.length > 0 && (
            <li>
              {member ? (
                // Members ask a coach directly; the request waits in Plans until the coach picks a time
                <div className="flex h-full flex-col bg-[#e9e6df] p-6 lg:p-8">
                  <div className="flex -space-x-2">
                    {coaches.map((c) => (
                      <span
                        key={c.id}
                        className="keep-round grid size-12 place-items-center rounded-full bg-ink text-[0.875rem] font-semibold text-paper ring-2 ring-[#e9e6df]"
                      >
                        {c.initials}
                      </span>
                    ))}
                  </div>
                  <p className="t-h3 mt-6">One-on-one coaching</p>
                  <p className="t-small mt-2 text-stone">
                    Start with a free 30-minute intro with{" "}
                    {coaches
                      .map((c) => c.name.split(" ")[0])
                      .join(", ")
                      .replace(/, ([^,]*)$/, " or $1")}
                    . They look at how you move and what you want, then suggest a plan.
                  </p>
                  <ul className="mt-5 divide-y divide-ink/10 border-y border-ink/10">
                    {coaches.map((c) => (
                      <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                        <span className="t-small min-w-0">
                          <span className="font-medium">{c.name.split(" ")[0]}</span>{" "}
                          <span className="text-stone">· {c.role.replace(/, the wellness center$/, "")}</span>
                        </span>
                        <button
                          onClick={() => requestIntro(c.id)}
                          disabled={asked === c.id || trainingRequested}
                          className="inline-flex h-8 shrink-0 items-center rounded-full bg-ink px-3.5 text-[0.8125rem] font-medium text-paper transition-colors hover:bg-accent disabled:bg-transparent disabled:px-0 disabled:text-stone"
                        >
                          {asked === c.id ? "Requested" : trainingRequested ? "–" : "Ask for an intro"}
                        </button>
                      </li>
                    ))}
                  </ul>
                  {trainingRequested && (
                    <Link href="/plans" className="t-small mt-auto flex items-center gap-2 pt-5 font-medium text-hold">
                      <Icon name="clock" size={15} /> Intro requested. It&apos;s waiting in your plans.
                    </Link>
                  )}
                </div>
              ) : (
                <Link href={gateHref("/fitness")} className="group flex h-full flex-col bg-[#e9e6df] p-6 lg:p-8">
                  <div className="flex -space-x-2">
                    {coaches.map((c) => (
                      <span
                        key={c.id}
                        className="keep-round grid size-12 place-items-center rounded-full bg-ink text-[0.875rem] font-semibold text-paper ring-2 ring-[#e9e6df]"
                      >
                        {c.initials}
                      </span>
                    ))}
                  </div>
                  <p className="t-h3 mt-6">One-on-one coaching</p>
                  <p className="t-small mt-2 text-stone">
                    Start with a free 30-minute intro with{" "}
                    {coaches
                      .map((c) => c.name.split(" ")[0])
                      .join(", ")
                      .replace(/, ([^,]*)$/, " or $1")}
                    . They look at how you move and what you want, then suggest a plan.
                  </p>
                  <ul className="t-small mt-4 space-y-1 text-ink-2">
                    {coaches.map((c) => (
                      <li key={c.id}>
                        <span className="font-medium">{c.name.split(" ")[0]}</span> · {c.role.replace(/, the wellness center$/, "")}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto pt-6">
                    <span className="inline-flex h-9 items-center gap-1.5 self-start rounded-full bg-ink px-4 text-[0.8125rem] font-medium text-paper transition-colors group-hover:bg-accent">
                      {gateLabel(s.persona, "request an intro")} <Icon name="arrow-right" size={14} />
                    </span>
                  </div>
                </Link>
              )}
            </li>
          )}
        </ul>
      </section>

      <SignInStrip verb="reserve a class" returnTo="/fitness" className="mt-20" />

      <ClassSheet c={open} onClose={() => setOpen(null)} returnTo={open ? `/fitness/schedule?class=${encodeURIComponent(open.id)}` : "/fitness"} />
      <ResourceSheet r={res} onClose={() => setRes(null)} />
    </div>
  );
}
