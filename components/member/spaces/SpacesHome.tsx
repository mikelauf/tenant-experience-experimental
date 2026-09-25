"use client";

import Link from "next/link";
import { ViewTransition, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { useTenant } from "@/lib/tenants/client";
import type { RoomTag } from "@/lib/data/types";
import { useDemo, useHydrated } from "@/lib/store";
import { dayKey, week } from "@/lib/time";
import { LineReveal, Reveal } from "@/components/motion/Reveal";
import Image from "@/components/ui/SmoothImage";
import { Icon } from "@/components/ui/Icon";
import { Pill } from "@/components/ui/Pill";
import { DateStrip } from "../DateStrip";
import { AvailabilityBar, Legend } from "./Availability";

export function SpacesHome() {
  const days = useMemo(() => week(), []);
  const [day, setDay] = useState(dayKey(days[0]));
  const [tag, setTag] = useState<RoomTag | null>(null);
  const s = useDemo();
  const hydrated = useHydrated();
  const offset = days.findIndex((d) => dayKey(d) === day);
  const { rooms, roomTags, copy, lead } = useTenant();
  const list = rooms.filter((r) => !tag || r.tags.includes(tag));
  const caps = rooms.map((r) => r.capacity);
  const levels = [...new Set(rooms.map((r) => r.level))].sort((a, b) => a - b);
  const count = ["", "One room", "Two rooms", "Three rooms", "Four rooms", "Five rooms", "Six rooms"][rooms.length] ?? `${rooms.length} rooms`;

  const mineFor = (slug: string): [number, number] | null => {
    if (!hydrated) return null;
    const c = s.commitments.find((x) => x.kind === "room" && x.refId === slug && x.status !== "cancelled" && dayKey(x.startsAt) === day);
    if (!c) return null;
    const a = new Date(c.startsAt);
    const b = new Date(c.endsAt);
    return [a.getHours() * 60 + a.getMinutes(), b.getHours() * 60 + b.getMinutes()];
  };

  return (
    <div className="pb-tab lg:pb-28">
      <section className="frame pt-[calc(var(--nav-h)+40px)] lg:pt-[calc(var(--nav-h)+64px)]">
        <p className="t-lead text-stone">Meetings & events</p>
        <LineReveal as="h1" className="t-hero mt-2" lines={["A room for the meeting.", "A team for the moment."]} />
      </section>

      {/* Two intents */}
      <section className="frame mt-10 grid gap-3 lg:mt-14 lg:grid-cols-12" aria-label="What are you planning?">
        {[
          {
            href: "#rooms",
            k: "Book a room",
            t: `${count} for ${Math.min(...caps)} to ${Math.max(...caps)}, on ${levels.length > 1 ? "Levels" : "Level"} ${levels.join(" and ")}.`,
            d: "Most book instantly. Pick a time, confirm, done.",
            img: copy.spaces.roomsImg,
            span: "lg:col-span-7",
          },
          {
            href: "/spaces/plan-an-event",
            k: "Plan an event",
            t: "Receptions, offsites and dinners, planned with you.",
            d: `Tell ${lead.name.split(" ")[0]}'s team what you have in mind.`,
            img: copy.spaces.planImg,
            span: "lg:col-span-5",
          },
        ].map((x, i) => (
          <Reveal key={x.k} delay={i * 0.08} className={x.span}>
            <Link
              href={x.href}
              className="group relative block aspect-[4/5] overflow-hidden rounded-[var(--radius-media)] sm:aspect-[16/10] lg:aspect-auto lg:h-[520px]"
            >
              <Image
                src={x.img.src}
                alt={x.img.alt}
                fill
                sizes="(min-width:1024px) 58vw, 100vw"
                priority={i === 0}
                className="object-cover transition-transform duration-[1.4s] ease-[var(--ease-out-expo)] group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-6 p-6 text-white sm:p-8">
                <div>
                  <p className="text-[0.875rem] font-medium text-white/75">{x.k}</p>
                  <p className="t-h2 mt-2 max-w-[20ch]">{x.t}</p>
                  <p className="t-small mt-2 text-white/75">{x.d}</p>
                </div>
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-ink transition-transform duration-300 group-hover:translate-x-1">
                  <Icon name={i === 0 ? "chevron-down" : "arrow-right"} size={20} />
                </span>
              </div>
            </Link>
          </Reveal>
        ))}
      </section>

      {/* Rooms */}
      <section id="rooms" className="pt-24 lg:pt-32" aria-labelledby="rooms-h">
        <div className="frame flex flex-wrap items-end justify-between gap-4">
          <h2 id="rooms-h" className="t-h1">
            Meeting rooms
          </h2>
          <Legend />
        </div>
        <div className="sticky top-[var(--nav-h)] z-30 mt-6 border-b hairline bg-quartz/88 backdrop-blur-xl">
          <div className="frame flex flex-col gap-3 py-3 lg:flex-row lg:items-center lg:justify-between">
            <DateStrip id="rooms" days={days} value={day} onChange={setDay} marks={(d) => d.getDay() !== 0 && d.getDay() !== 6} />
            <div
              role="group"
              aria-label="Filter rooms"
              className="no-scrollbar -mx-[var(--gutter)] flex gap-1.5 overflow-x-auto px-[var(--gutter)] lg:mx-0 lg:px-0"
            >
              {roomTags.map((t) => (
                <button
                  key={t.id}
                  aria-pressed={tag === t.id}
                  onClick={() => setTag(tag === t.id ? null : t.id)}
                  className={cn(
                    "h-9 shrink-0 rounded-full px-3.5 text-[0.8125rem] font-medium transition-colors",
                    tag === t.id
                      ? "bg-ink text-paper"
                      : "bg-paper text-ink-2 shadow-[inset_0_0_0_1px_var(--color-line-2)] hover:shadow-[inset_0_0_0_1px_var(--color-stone-2)]",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <ul className="frame mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {list.map((r) => (
            <li key={r.slug}>
              <Link href={`/spaces/${r.slug}?day=${day}`} className="group block">
                <div className="media relative aspect-[4/3]">
                  <ViewTransition name={`room-${r.slug}`} share="morph" default="none">
                    <div className="absolute inset-0">
                      <Image
                        src={r.image.src}
                        alt={r.image.alt}
                        fill
                        sizes="(min-width:1280px) 25vw, (min-width:640px) 50vw, 100vw"
                        className="object-cover transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-[1.04]"
                      />
                    </div>
                  </ViewTransition>
                  <div className="absolute left-3 top-3">
                    {r.approval === "instant" ? (
                      <Pill className="bg-paper/95">
                        <Icon name="bolt" size={13} /> Instant
                      </Pill>
                    ) : (
                      <Pill tone="hold" className="bg-hold-soft/95">
                        Needs approval
                      </Pill>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="t-h3">{r.name}</p>
                    <p className="t-meta mt-0.5">
                      Up to {r.capacity} · Level {r.level}
                    </p>
                  </div>
                  <div className="flex gap-1.5 text-stone">
                    {r.amenities.slice(0, 3).map((a) => (
                      <Icon key={a.label} name={a.icon} size={18} />
                    ))}
                  </div>
                </div>
                <AvailabilityBar slug={r.slug} dayOffset={offset} selection={mineFor(r.slug)} className="mt-4" showLabels />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
