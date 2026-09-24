"use client";

import { images } from "@/lib/data/images";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { building } from "@/lib/data/building";
import Image from "@/components/ui/SmoothImage";
import { Icon } from "@/components/ui/Icon";
import { EventsArt, FitnessArt, SpacesArt } from "./ServiceIcons";

type Tab = {
  id: "spaces" | "fitness" | "events";
  label: string;
  art: React.ComponentType<{ size?: number }>;
  title: string;
  body: string;
  points: string[];
  href: string;
  cta: string;
  img: { src: string; alt: string; pos?: string };
  access: string;
};

const tabs: Tab[] = [
  {
    id: "spaces",
    label: "Spaces",
    art: SpacesArt,
    title: "A room when you need one. A team when it's bigger.",
    body: "Book one of four meeting rooms in seconds, or hand a reception, offsite or dinner to our events team.",
    points: ["Four rooms for 4 to 40", "Instant booking for most", "Event planning with Inés"],
    href: "/spaces",
    cta: "Explore spaces",
    img: images.boardroomReal,
    access: "Included with your building access",
  },
  {
    id: "fitness",
    label: "Fitness",
    art: FitnessArt,
    title: "Two floors down from your desk.",
    body: "Coached classes, a Ride studio you can book between meetings, and a recovery lounge with a sauna and cold plunge.",
    points: ["Classes every weekday", "Ride studio & recovery bookings", "Personal training intros"],
    href: "/fitness",
    cta: "See Pyramid Fitness",
    img: images.ride,
    access: "Pyramid Fitness membership",
  },
  {
    id: "events",
    label: "Events",
    art: EventsArt,
    title: "Things worth leaving your desk for.",
    body: "Tastings, talks and evenings in the grove, hosted by the building for everyone who works here.",
    points: ["Something most weeks", "RSVP in one tap", "Some just for your company"],
    href: "/programming",
    cta: "See what's on",
    img: images.cupping,
    access: "Included with your building access",
  },
].filter((t) => (t.id === "events" ? building.services.programming : building.services[t.id as "spaces" | "fitness"])) as Tab[];

export function ServiceTabs({ className, heading = "What's here for you" }: { className?: string; heading?: string }) {
  const [active, setActive] = useState<Tab["id"]>("spaces");
  const reduce = useReducedMotion();
  const t = tabs.find((x) => x.id === active)!;

  return (
    <section className={cn("frame", className)} aria-labelledby="svc-h">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <h2 id="svc-h" className="t-h1 max-w-[14ch]">
          {heading}
        </h2>
        <div role="tablist" aria-label="Services" className="flex gap-2 sm:gap-4">
          {tabs.map((x) => {
            const on = x.id === active;
            const Art = x.art;
            return (
              <button
                key={x.id}
                role="tab"
                id={`tab-${x.id}`}
                aria-selected={on}
                aria-controls="svc-panel"
                onClick={() => setActive(x.id)}
                className="group relative flex flex-col items-center gap-1 px-3 pb-3 pt-1 sm:px-5"
              >
                <motion.span
                  animate={on && !reduce ? { y: [0, -7, 0], rotate: [0, -6, 0], scale: [1, 1.12, 1] } : { y: 0, rotate: 0, scale: 1 }}
                  transition={{ duration: 0.55, ease: [0.34, 1.4, 0.64, 1] }}
                  className={cn(
                    "transition-[filter,opacity] duration-300",
                    on ? "" : "opacity-70 grayscale-[0.4] group-hover:opacity-100 group-hover:grayscale-0",
                  )}
                >
                  <Art size={52} />
                </motion.span>
                <span className={cn("text-[0.9375rem] font-medium transition-colors", on ? "text-ink" : "text-stone group-hover:text-ink")}>{x.label}</span>
                {on && (
                  <motion.span
                    layoutId="svc-underline"
                    className="absolute inset-x-3 bottom-0 h-[2.5px] rounded-full bg-ink"
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div
        id="svc-panel"
        role="tabpanel"
        aria-labelledby={`tab-${active}`}
        className="mt-10 overflow-hidden rounded-[var(--radius-media)] bg-paper shadow-[var(--shadow-ring)]"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={t.id}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="grid lg:grid-cols-12"
          >
            <div className="relative aspect-[4/3] lg:col-span-7 lg:aspect-auto lg:min-h-[480px]">
              <Image src={t.img.src} alt={t.img.alt} fill sizes="(min-width:1024px) 58vw, 100vw" className="object-cover" style={{ objectPosition: t.img.pos }} />
            </div>
            <div className="flex flex-col justify-between gap-10 p-6 sm:p-10 lg:col-span-5">
              <div>
                <p className="t-meta flex items-center gap-2">
                  <Icon name="access" size={16} />
                  {t.access}
                </p>
                <h3 className="t-h2 mt-4">{t.title}</h3>
                <p className="t-body mt-4 text-stone">{t.body}</p>
                <ul className="mt-8 space-y-3">
                  {t.points.map((p) => (
                    <li key={p} className="flex items-center gap-3">
                      <span className="grid size-6 place-items-center rounded-full bg-fog">
                        <Icon name="check" size={13} strokeWidth={2.2} />
                      </span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href={t.href}
                className="group inline-flex items-center gap-2 self-start rounded-full bg-ink px-5 py-3 font-medium text-paper transition-colors hover:bg-ink-2"
              >
                {t.cta}
                <Icon name="arrow-right" size={18} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
