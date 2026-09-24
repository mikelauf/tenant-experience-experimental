"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ViewTransition, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { room, roomCapacity, roomHours, rooms, setupLabels } from "@/lib/data/rooms";
import type { Setup } from "@/lib/data/types";
import { useDemo, useHydrated } from "@/lib/store";
import { dayKey, fmtTime, week } from "@/lib/time";
import Image from "@/components/ui/SmoothImage";
import { Icon } from "@/components/ui/Icon";
import { Pill } from "@/components/ui/Pill";
import { SetupVisualizer } from "@/components/public/SetupVisualizer";
import { DateStrip } from "../DateStrip";
import { AvailabilityBar, CLOSE, isBusy } from "./Availability";

const durations = [30, 60, 90, 120];

export function RoomDetail({ slug }: { slug: string }) {
  const r = room(slug)!;
  const router = useRouter();
  const params = useSearchParams();
  const s = useDemo();
  const hydrated = useHydrated();
  const days = useMemo(() => week(), []);
  const [day, setDay] = useState(params.get("day") ?? dayKey(days[0]));
  const [start, setStart] = useState<number | null>(params.get("start") ? Number(params.get("start")) : null);
  const [dur, setDur] = useState(Number(params.get("dur") ?? 60));
  const [setup, setSetup] = useState<Setup>((params.get("setup") as Setup) ?? r.setups[0]);
  const [people, setPeople] = useState(Number(params.get("people") ?? Math.min(r.capacity, 4)));
  const [title, setTitle] = useState(params.get("title") ?? "");

  const offset = Math.max(
    0,
    days.findIndex((d) => dayKey(d) === day),
  );
  const d = days[offset];
  const weekend = d.getDay() === 0 || d.getDay() === 6;
  const now = new Date();
  const nowMin = offset === 0 ? now.getHours() * 60 + now.getMinutes() : 0;
  const cap = roomCapacity(r, setup);
  const valid = start != null && !isBusy(r.slug, offset, start, start + dur) && start + dur <= CLOSE && people <= cap && !weekend;

  const q = new URLSearchParams({ day, start: String(start ?? ""), dur: String(dur), setup, people: String(people), title });
  const next = `/spaces/${r.slug}/book?${q}`;
  const signedOut = hydrated && s.persona === "signed-out";

  const capacities = Object.fromEntries(r.setups.map((x) => [x, roomCapacity(r, x)])) as Partial<Record<Setup, number>>;

  return (
    <div className="pb-[calc(var(--tab-h)+env(safe-area-inset-bottom)+96px)] lg:pb-28">
      <div className="frame pt-[calc(var(--nav-h)+24px)]">
        <Link href="/spaces#rooms" className="t-small inline-flex items-center gap-1.5 text-stone hover:text-ink">
          <Icon name="arrow-left" size={16} /> All rooms
        </Link>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="t-hero">{r.name}</h1>
            <p className="t-lead mt-2 text-stone">
              Level {r.level} · Up to {r.capacity} · Named for {r.namesake}
            </p>
          </div>
          {r.approval === "instant" ? (
            <Pill>
              <Icon name="bolt" size={13} /> Books instantly
            </Pill>
          ) : (
            <Pill tone="hold">Requests need approval</Pill>
          )}
        </div>
      </div>

      <div className="frame grid-12 mt-8 gap-y-10">
        <div className="col-span-12 lg:col-span-7">
          <div className="media relative aspect-[4/3] sm:aspect-[16/10]">
            <ViewTransition name={`room-${r.slug}`} share="morph" default="none">
              <div className="absolute inset-0">
                <Image src={r.image.src} alt={r.image.alt} fill priority sizes="(min-width:1024px) 58vw, 100vw" className="object-cover" />
              </div>
            </ViewTransition>
          </div>
          <p className="t-h2 mt-10 max-w-[30ch]">{r.summary}</p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {r.amenities.map((a) => (
              <li key={a.label} className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-paper shadow-[var(--shadow-ring)]">
                  <Icon name={a.icon} size={19} />
                </span>
                <span>
                  <span className="block font-medium">{a.label}</span>
                  {a.detail && <span className="t-small block text-stone">{a.detail}</span>}
                </span>
              </li>
            ))}
          </ul>
          {r.setups.length > 1 && (
            <div className="mt-14">
              <h2 className="t-h2">How it sets</h2>
              <SetupVisualizer
                className="mt-6"
                plate={r.plate}
                capacities={capacities}
                value={setup}
                onChange={setSetup}
                title={`${r.name} · Level ${r.level}`}
              />
            </div>
          )}
          <div className="mt-14 border-t hairline pt-8">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="t-h3">Good to know</h2>
              <Pill tone="hold">Sample policy</Pill>
            </div>
            <ul className="t-small mt-4 grid gap-3 text-stone sm:grid-cols-2">
              <li>Book up to 7 days ahead, 30 minutes to 2 hours.</li>
              <li>Cancel any time before the start. No-shows release after 15 minutes.</li>
              <li>Coffee service can be added through the concierge.</li>
              <li>
                {r.approval === "request"
                  ? "The events team confirms requests, usually within a few hours."
                  : "Instant rooms are confirmed the moment you book."}
              </li>
            </ul>
          </div>
        </div>

        {/* Booking panel */}
        <aside className="col-span-12 lg:col-span-5 lg:col-start-8" id="book" aria-label={`Book ${r.name}`}>
          <div className="card sticky top-[calc(var(--nav-h)+16px)] p-5 shadow-[var(--shadow-soft)] sm:p-6">
            <p className="t-h3">Book {r.name}</p>
            <div className="mt-5">
              <DateStrip id="room" days={days} value={day} onChange={(k) => (setDay(k), setStart(null))} marks={(x) => x.getDay() !== 0 && x.getDay() !== 6} />
            </div>
            <AvailabilityBar slug={r.slug} dayOffset={offset} selection={start != null ? [start, start + dur] : null} className="mt-5" showLabels />

            {weekend ? (
              <p className="t-small mt-5 rounded-2xl bg-fog p-4">Meeting rooms are closed on weekends. Pick a weekday.</p>
            ) : (
              <>
                <p className="mt-6 text-[0.9375rem] font-medium">Start time</p>
                <div className="no-scrollbar -mx-1 mt-3 grid max-h-[176px] grid-cols-4 gap-1.5 overflow-y-auto px-1 py-0.5" data-lenis-prevent>
                  {roomHours.slice(0, -1).map((m) => {
                    const busy = isBusy(r.slug, offset, m, m + 30) || m < nowMin;
                    const on = start === m;
                    return (
                      <button
                        key={m}
                        disabled={busy}
                        aria-pressed={on}
                        onClick={() => setStart(m)}
                        className={cn(
                          "h-10 rounded-xl text-[0.8125rem] font-medium tabular-nums transition-colors",
                          on ? "bg-ink text-paper" : "bg-quartz hover:bg-fog",
                          busy && "bg-transparent text-stone-2 line-through",
                        )}
                      >
                        {fmtTime(m)}
                      </button>
                    );
                  })}
                </div>

                <p className="mt-5 text-[0.9375rem] font-medium">For</p>
                <div className="mt-3 grid grid-cols-4 gap-1.5 rounded-full bg-quartz p-1">
                  {durations.map((x) => (
                    <button
                      key={x}
                      aria-pressed={dur === x}
                      onClick={() => setDur(x)}
                      className={cn(
                        "h-9 rounded-full text-[0.8125rem] font-medium",
                        dur === x ? "bg-paper shadow-[var(--shadow-soft)]" : "text-stone hover:text-ink",
                      )}
                    >
                      {x < 60 ? `${x}m` : `${x / 60}h`}
                    </button>
                  ))}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1.5 block text-[0.875rem] font-medium">Setup</span>
                    <select className="field py-3" value={setup} onChange={(e) => setSetup(e.target.value as Setup)}>
                      {r.setups.map((x) => (
                        <option key={x} value={x}>
                          {setupLabels[x]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[0.875rem] font-medium">People</span>
                    <input
                      type="number"
                      min={1}
                      max={cap}
                      className="field py-3 tabular"
                      value={people}
                      onChange={(e) => setPeople(Math.max(1, Number(e.target.value) || 1))}
                      aria-invalid={people > cap}
                    />
                  </label>
                </div>
                {people > cap && (
                  <p className="t-small mt-2 text-redwood">
                    {setupLabels[setup]} fits {cap}. Try another setup or a larger room.
                  </p>
                )}
                <label className="mt-4 block">
                  <span className="mb-1.5 flex justify-between text-[0.875rem] font-medium">
                    Meeting name <span className="t-meta font-normal">Optional</span>
                  </span>
                  <input className="field py-3" placeholder="e.g. Quarterly review" value={title} onChange={(e) => setTitle(e.target.value)} />
                </label>
                {start != null && isBusy(r.slug, offset, start, start + dur) && (
                  <p className="t-small mt-3 text-redwood">That runs into another booking. Try a shorter time or a different start.</p>
                )}
              </>
            )}

            {signedOut ? (
              <Link
                href={`/sign-in?returnTo=${encodeURIComponent(`/spaces/${r.slug}?${q}`)}`}
                className="mt-6 flex h-13 items-center justify-center rounded-full bg-ink py-3.5 font-medium text-paper"
              >
                Sign in to book
              </Link>
            ) : (
              <button
                disabled={!valid}
                onClick={() => router.push(next)}
                className="mt-6 flex h-13 w-full items-center justify-center gap-2 rounded-full bg-redwood py-3.5 font-medium text-paper transition-colors hover:bg-redwood-deep disabled:bg-fog disabled:text-stone-2"
              >
                {start == null ? "Pick a start time" : `Review · ${fmtTime(start)}–${fmtTime(start + dur)}`}
                {valid && <Icon name="arrow-right" size={18} />}
              </button>
            )}
          </div>
        </aside>
      </div>

      {/* Phones: the booking panel is far down, so keep a way to reach it */}
      <div className="fixed inset-x-0 bottom-[calc(var(--tab-h)+env(safe-area-inset-bottom))] z-40 border-t hairline bg-paper/92 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between gap-4 pl-[52px]">
          <div className="min-w-0">
            <p className="truncate font-medium">{start != null ? `${fmtTime(start)}–${fmtTime(start + dur)}` : r.name}</p>
            <p className="t-meta">Up to {r.capacity} · Level {r.level}</p>
          </div>
          <a href="#book" className="flex h-11 shrink-0 items-center rounded-full bg-redwood px-5 font-medium text-paper">
            {start != null ? "Review" : "Book a time"}
          </a>
        </div>
      </div>

      <section className="frame mt-24 border-t hairline pt-12">
        <h2 className="t-h2">Other rooms</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {rooms
            .filter((x) => x.slug !== r.slug)
            .map((x) => (
              <Link
                key={x.slug}
                href={`/spaces/${x.slug}?day=${day}`}
                className="card group flex items-center gap-4 p-3 pr-5 hover:shadow-[var(--shadow-soft)]"
              >
                <span className="relative size-20 shrink-0 overflow-hidden rounded-xl">
                  <Image src={x.image.src} alt="" fill sizes="80px" className="object-cover" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{x.name}</span>
                  <span className="t-meta block">
                    Up to {x.capacity} · L{x.level}
                  </span>
                </span>
                <Icon name="arrow-right" size={18} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
        </div>
      </section>
    </div>
  );
}
