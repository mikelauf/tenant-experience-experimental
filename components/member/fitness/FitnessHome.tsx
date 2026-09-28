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
import { Pill } from "@/components/ui/Pill";
import { ClassAction } from "./ClassAction";
import { ClassSheet } from "./ClassSheet";
import { ResourceSheet } from "./ResourceSheet";
import { SignInStrip } from "../SignInStrip";
import { gateHref, gateLabel, isMember } from "@/lib/access";

function AccessCard() {
  const s = useDemo();
  const { membership } = useTenant().fitness!;
  const hydrated = useHydrated();
  if (!hydrated) return <div className="h-[260px] rounded-[var(--radius-media)] bg-paper/60" />;
  const member = isMember(s.persona) && s.fitnessMember;

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
        ) : !isMember(s.persona) ? (
          <Pill tone="night">{s.persona === "verifying" ? "Access being verified" : "Work email not verified"}</Pill>
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
        ) : !isMember(s.persona) ? (
          <ButtonLink href={gateHref("/fitness")} variant="light" icon="arrow-right">
            {s.persona === "signed-out" ? "Sign in to see your access" : gateLabel(s.persona, "")}
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

/** Before building access, the membership as a few plain lines beside the classes, not a card of its own */
function AccessLine() {
  const s = useDemo();
  const { membership } = useTenant().fitness!;
  return (
    <div className="border-t hairline pt-5">
      <p className="t-meta">Membership</p>
      <p className="t-h3 mt-1.5">
        {membership.name}, {membership.price}
      </p>
      <p className="t-small mt-2 text-stone">{membership.perks.join(" · ")}</p>
      <Link href={gateHref("/fitness")} className="group mt-4 inline-flex items-center gap-1.5 text-[0.9375rem] font-medium">
        {s.persona === "signed-out" ? "Sign in to see your access" : gateLabel(s.persona, "see your access")}
        <Icon name="arrow-right" size={16} className="transition-transform group-hover:translate-x-0.5" />
      </Link>
      <p className="t-meta mt-3">{membership.note}</p>
    </div>
  );
}

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS = [1, 2, 3, 4, 5];

/** When a class runs each week, one line per time: ["Mon & Wed 7am", "Thu 12:15pm"] */
function when(weekly: Record<number, [string, number, string][]>, kind: string) {
  const byTime = new Map<number, number[]>();
  for (const [d, list] of Object.entries(weekly)) for (const [k, m] of list) if (k === kind) byTime.set(m, [...(byTime.get(m) ?? []), Number(d)]);
  return [...byTime]
    .sort((a, b) => Math.min(...a[1]) - Math.min(...b[1]))
    .map(([m, days]) => {
      const names = days.sort().map((d) => DAY[d]);
      const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} & ${names.at(-1)}` : names[0];
      return `${list} ${fmtTime(m)}`;
    });
}

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
  // Before building access, a lighter page: what's here and when, each step a sign-in away
  const browsing = !hydrated || !isMember(s.persona);

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
            <LineReveal as="h1" className="t-mega mt-4" lines={halves(fit.pitch.title)} />
            <ul className="t-small mt-10 flex flex-wrap gap-x-6 gap-y-1 text-moon/85 lg:mt-12">
              {[`${fit.membership.name}, ${fit.membership.price}`, ...fit.membership.perks.slice(0, 2)].map((x) => (
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

      {browsing ? (
        <>
          {/* Coming up: the next few classes as cards, each a sign-in away */}
          <section className="frame mt-14 lg:mt-20" aria-labelledby="next-h">
            <div className="flex items-end justify-between gap-4">
              <h2 id="next-h" className="t-h1">
                Coming up
              </h2>
              <Link href="/fitness/schedule" className="group flex items-center gap-1.5 font-medium">
                Full schedule <Icon name="arrow-right" size={17} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            <ul className="no-scrollbar -mx-[var(--gutter)] mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-[var(--gutter)] pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
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
                        <Link
                          href={gateHref(`/fitness/schedule?class=${encodeURIComponent(c.id)}`)}
                          className="inline-flex h-9 items-center rounded-full bg-ink px-4 text-[0.8125rem] font-medium text-paper transition-colors hover:bg-accent"
                        >
                          {seats.full ? "Join waitlist" : "Reserve"}
                        </Link>
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
                                  <span
                                    key={m}
                                    className="t-num bg-accent-soft px-2 py-1 text-center text-[0.8125rem] font-medium text-accent-deep lg:self-start"
                                  >
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
                <p className="t-meta">Membership</p>
                <h2 id="mem-h" className="t-h2 mt-1.5">
                  {fit.membership.name}, {fit.membership.price}
                </h2>
                <p className="t-meta mt-2">{fit.membership.note}</p>
              </div>
              <ul className="col-span-12 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:col-span-5">
                {fit.membership.perks.map((x) => (
                  <li key={x} className="t-small flex items-center gap-2">
                    <Icon name="check" size={15} strokeWidth={2} className="shrink-0 text-accent" />
                    {x}
                  </li>
                ))}
              </ul>
              <div className="col-span-12 lg:col-span-3 lg:text-right">
                <ButtonLink href={gateHref("/fitness")} icon="arrow-right">
                  {s.persona === "signed-out" ? "Sign in to see your access" : gateLabel(s.persona, "see your access")}
                </ButtonLink>
              </div>
            </div>
          </section>
        </>
      ) : (
        <>
          {/* Access + next classes */}
          <section className="frame grid-12 mt-12 gap-y-10 lg:mt-20">
            <div className="col-span-12 lg:col-span-5">
              {browsing ? (
                <>
                  <h2 className="t-h1">Coming up</h2>
                  <p className="t-lead mt-3 max-w-[34ch] text-stone">Classes every weekday. Reserve a spot once you&apos;ve signed in.</p>
                  <div className="mt-8">
                    <AccessLine />
                  </div>
                </>
              ) : (
                <AccessCard />
              )}
            </div>
            <div className="col-span-12 lg:col-span-6 lg:col-start-7">
              <div className={cn("flex items-end", browsing ? "justify-end" : "justify-between")}>
                {!browsing && <h2 className="t-h2">Coming up</h2>}
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
                            {browsing && ` · with ${tenant.person(c.coachId).name.split(" ")[0]}`}
                          </p>
                        </div>
                        {browsing ? (
                          <div className="flex shrink-0 items-center gap-4">
                            {(() => {
                              const seats = classSeats(tenant, s, c);
                              return (
                                <span className={cn("t-meta hidden sm:inline", seats.full ? "text-hold" : seats.left <= 3 && "text-accent")}>
                                  {seats.full ? "Full · waitlist" : `${seats.left} ${seats.left === 1 ? "spot" : "spots"} left`}
                                </span>
                              );
                            })()}
                            <Link
                              href={gateHref(`/fitness/schedule?class=${encodeURIComponent(c.id)}`)}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex h-9 items-center rounded-full px-4 text-[0.8125rem] font-medium shadow-[inset_0_0_0_1px_var(--color-ink)] transition-colors hover:bg-ink hover:text-paper"
                            >
                              Reserve
                            </Link>
                          </div>
                        ) : (
                          <ClassAction c={c} returnTo={`/fitness/schedule?class=${encodeURIComponent(c.id)}`} />
                        )}
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
            <div className="frame mt-10 grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-4 lg:grid-cols-5">
              {Object.values(classTemplates).map((t) => (
                <Link key={t.kind} href={`/fitness/schedule?kind=${t.kind}`} className="group block">
                  <div className="media relative aspect-[4/5]">
                    <Image
                      src={t.image.src}
                      alt={t.image.alt}
                      fill
                      sizes="(min-width:1024px) 19vw, (min-width:640px) 45vw, 100vw"
                      className="object-cover transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-[1.04]"
                      style={{ objectPosition: t.image.pos }}
                    />
                  </div>
                  <p className="t-h3 mt-4 transition-colors group-hover:text-accent">{t.name}</p>
                  <p className="t-meta mt-0.5">
                    {t.durationMin} min · {t.studio}
                  </p>
                  <p className="t-small mt-2 text-stone">{t.summary}</p>
                  <div className="t-small mt-3 flex items-start gap-1.5 font-medium">
                    <Icon name="calendar" size={15} className="mt-0.5 shrink-0 text-stone" />
                    <ul>
                      {when(fit.weekly, t.kind).map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}

      {browsing ? (
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
              </li>
            )}
          </ul>
        </section>
      ) : (
        <>
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
                      {hydrated && !isMember(s.persona) ? (
                        <Link href={gateHref("/fitness")} className="mt-5 text-[0.875rem] font-medium underline decoration-ink/25 underline-offset-4">
                          {gateLabel(s.persona, "request")}
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
        </>
      )}

      <SignInStrip verb="reserve a class" returnTo="/fitness" className="mt-20" />

      <ClassSheet c={open} onClose={() => setOpen(null)} returnTo={open ? `/fitness/schedule?class=${encodeURIComponent(open.id)}` : "/fitness"} />
      <ResourceSheet r={res} onClose={() => setRes(null)} />
    </div>
  );
}
