"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { ViewTransition, useEffect, useState } from "react";
import type { Room } from "@/lib/data/types";
import { useTenant } from "@/lib/tenants/client";
import { Reveal } from "@/components/motion/Reveal";
import Image from "@/components/ui/SmoothImage";
import { Icon } from "@/components/ui/Icon";
import { SignInStrip } from "../SignInStrip";

const numbers = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight"];

/**
 * Spaces: why people come here, in order. Most want a meeting room, so the rooms lead, smallest first, each saying
 * what it's for, what's in it and how it books; times only appear inside a room. Then how booking works, then the
 * bigger thing, an event planned with the events team.
 */
export function SpacesHome() {
  const { rooms, copy, lead } = useTenant();
  const list = [...rooms].sort((a, b) => a.capacity - b.capacity);
  const caps = list.map((r) => r.capacity);
  const levels = [...new Set(list.map((r) => r.level))].sort((a, b) => a - b);
  const instant = list.filter((r) => r.approval === "instant").length;
  const first = lead.name.split(" ")[0];

  const count = numbers[list.length] ?? String(list.length);
  const asks = list.filter((r) => r.approval === "request").map((r) => r.name);
  const booking =
    instant === list.length
      ? "All of them book instantly"
      : instant === 0
        ? "Each needs a quick approval"
        : `${numbers[instant] ?? instant} of them book instantly; ${asks.join(" and ")} ${asks.length > 1 ? "need" : "needs"} a quick approval`;

  return (
    <div className="pb-tab lg:pb-28">
      {/* The header sits on a band a couple of shades darker than the page, so the rooms start on a clean edge below */}
      <section className="bg-[#e9e6df]">
        <div className="frame pb-10 pt-[calc(var(--nav-h)+32px)] lg:pb-12 lg:pt-[calc(var(--nav-h)+48px)]">
          <div className="grid-12 items-end gap-y-8">
            <div className="col-span-12 lg:col-span-7">
              <p className="t-meta">Spaces</p>
              <h1 className="t-page mt-3">
                Book a room for
                <RoomUse rooms={list} />
              </h1>
              <p className="t-lead mt-4 max-w-[46ch] text-stone">
                {count} rooms for {Math.min(...caps)} to {Math.max(...caps)} people on {levels.length > 1 ? "Levels" : "Level"} {levels.join(" and ")}.{" "}
                {booking}. Open one to see its free times.
              </p>
            </div>
            {/* The other reason people come here, beside the first */}
            <Link
              href="/spaces/plan-an-event"
              className="group col-span-12 flex items-center gap-4 bg-paper p-3 pr-5 shadow-[var(--shadow-ring)] transition-shadow hover:shadow-[var(--shadow-soft)] sm:col-span-8 lg:col-span-4 lg:col-start-9"
            >
              <span className="relative size-20 shrink-0 overflow-hidden">
                <Image src={copy.spaces.planImg.src} alt="" fill sizes="80px" className="object-cover" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="t-meta block">Bigger than a meeting?</span>
                <span className="mt-0.5 block font-medium">Plan an event with {first}&apos;s team</span>
              </span>
              <Icon name="arrow-right" size={18} className="shrink-0 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* The rooms, smallest first: what each is for and what's in it; times are inside */}
      <section id="rooms" className="frame scroll-mt-[calc(var(--nav-h)+24px)] pt-8 lg:pt-10" aria-label="Meeting rooms">
        <ul>
          {list.map((r, i) => (
            <li key={r.slug} id={`room-${r.slug}`} className="scroll-mt-[calc(var(--nav-h)+24px)] border-b hairline">
              <Reveal delay={Math.min(i, 3) * 0.04}>
                <Link href={`/spaces/${r.slug}`} className="group grid-12 items-center gap-y-5 py-6">
                  <div className="media relative col-span-12 aspect-[3/2] sm:col-span-4 lg:col-span-3 lg:aspect-[4/3]">
                    <ViewTransition name={`room-${r.slug}`} share="morph" default="none">
                      <div className="absolute inset-0">
                        <Image
                          src={r.image.src}
                          alt={r.image.alt}
                          fill
                          sizes="(min-width:1024px) 24vw, (min-width:640px) 34vw, 100vw"
                          className="object-cover transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-[1.05]"
                        />
                      </div>
                    </ViewTransition>
                  </div>

                  <div className="col-span-12 sm:col-span-8 lg:col-span-6 lg:col-start-4 lg:pl-6">
                    <div className="flex flex-wrap items-center gap-2">
                      {r.use && <span className="bg-accent-soft px-2 py-0.5 text-[0.75rem] font-medium text-accent-deep">For {r.use}</span>}
                      <span className="t-meta">Level {r.level}</span>
                    </div>
                    <p className="t-h2 mt-2 transition-colors group-hover:text-accent">{r.name}</p>
                    <p className="t-small mt-2 max-w-[52ch] text-stone">{r.summary}</p>
                    <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5">
                      {r.amenities.map((a) => (
                        <li key={a.label} className="t-small flex items-center gap-1.5 text-ink-2">
                          <Icon name={a.icon} size={15} className="text-stone" />
                          {a.label}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="col-span-12 flex items-end justify-between gap-4 lg:col-span-3 lg:flex-col lg:items-end lg:gap-4">
                    <Seats n={r.capacity} />
                    <div className="flex flex-col items-end gap-2">
                      <p className="t-meta flex items-center gap-1.5">
                        {r.approval === "instant" ? (
                          <>
                            <Icon name="bolt" size={13} className="text-ok" /> Books instantly
                          </>
                        ) : (
                          <>
                            <Icon name="clock" size={13} className="text-hold" /> Quick approval
                          </>
                        )}
                      </p>
                      <span className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-ink px-4 text-[0.875rem] font-medium text-paper transition-colors group-hover:bg-accent">
                        See times
                        <Icon name="arrow-right" size={15} className="transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      {/* How booking works, for anyone who hasn't booked here before */}
      <section className="frame pt-20 lg:pt-28" aria-labelledby="how-h">
        <h2 id="how-h" className="t-h2">
          How booking works
        </h2>
        <ol className="mt-8 grid gap-8 sm:grid-cols-3">
          {[
            ["Pick a room and a time", "Each room shows its free times for the next two weeks, from 30 minutes to 2 hours."],
            ["Sign in with your work email", "Once. After that you book in a tap, and you land right back where you were."],
            ["It's yours", "Most rooms confirm on the spot. The booking waits in your plans, with the floor and the room."],
          ].map(([t, d], i) => (
            <li key={t} className="border-t-2 border-ink pt-5">
              <p className="t-num text-[0.875rem] text-accent">0{i + 1}</p>
              <p className="t-h3 mt-2">{t}</p>
              <p className="t-small mt-2 max-w-[34ch] text-stone">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* The bigger thing */}
      <section className="frame pt-20 lg:pt-28" aria-labelledby="plan-h">
        <Link href="/spaces/plan-an-event" className="group relative block overflow-hidden rounded-[var(--radius-media)]">
          <div className="relative aspect-[4/5] sm:aspect-[16/9] lg:aspect-[21/9]">
            <Image
              src={copy.spaces.planImg.src}
              alt={copy.spaces.planImg.alt}
              fill
              sizes="100vw"
              className="object-cover transition-transform duration-[1.4s] ease-[var(--ease-out-expo)] group-hover:scale-[1.03]"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-end p-6 text-white sm:p-10 lg:justify-center lg:p-14">
            <p className="text-[0.875rem] font-medium text-white/75">Bigger than a meeting?</p>
            <h2 id="plan-h" className="t-h1 mt-3 max-w-[16ch]">
              Receptions, offsites and dinners, planned with you.
            </h2>
            <p className="t-body mt-4 max-w-[40ch] text-white/80">
              Tell {first}&apos;s team what you have in mind. They&apos;ll suggest a space in the building, sort catering and AV, and be there on the night.
            </p>
            <span className="mt-7 inline-flex h-12 items-center gap-2 self-start rounded-full bg-white px-6 font-medium text-ink transition-transform group-hover:-translate-y-0.5">
              Plan an event <Icon name="arrow-right" size={17} />
            </span>
          </div>
        </Link>
      </section>

      <SignInStrip verb="book a room" returnTo="/spaces" className="mt-20" />
    </div>
  );
}

/**
 * The headline's last words, cycling through what each room is for ("one-on-ones", "workshops"…). Plain text; it
 * holds while hovered, and without motion it stays on the first.
 */
function RoomUse({ rooms }: { rooms: Room[] }) {
  const uses = rooms.filter((r) => r.use);
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [held, setHeld] = useState(false);
  useEffect(() => {
    if (reduce || held || uses.length < 2) return;
    const t = setTimeout(() => setI((x) => (x + 1) % uses.length), 4500);
    return () => clearTimeout(t);
  }, [i, reduce, held, uses.length]);
  const r = uses[i];
  if (!r) return null;
  return (
    <span className="block overflow-hidden pb-[0.12em]" onPointerEnter={() => setHeld(true)} onPointerLeave={() => setHeld(false)}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={r.slug}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="block text-accent"
        >
          {r.use}.
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** How many it seats, drawn: one mark per person, ten to a row. They fill in on hover. */
function Seats({ n }: { n: number }) {
  return (
    <div className="flex flex-col items-start gap-2 lg:items-end">
      <div className="flex flex-wrap gap-[3px]" style={{ width: Math.min(n, 10) * 10 - 3 }} aria-hidden>
        {Array.from({ length: n }, (_, k) => (
          <span
            key={k}
            className="size-[7px] bg-stone-2/45 transition-colors duration-300 group-hover:bg-accent"
            style={{ transitionDelay: `${Math.min(k, 40) * 12}ms` }}
          />
        ))}
      </div>
      <p className="t-small font-medium">Up to {n} people</p>
    </div>
  );
}
