"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "@/components/ui/SmoothImage";
import Link from "next/link";
import { ViewTransition, useState } from "react";
import { cn } from "@/lib/cn";
import type { Venue } from "@/lib/data/types";
import { fits, guestsLabel } from "@/lib/data/shared";
import { actions, useDemo, useHydrated } from "@/lib/store";
import { Icon } from "@/components/ui/Icon";

export function HeartButton({ slug, name, className, tone = "glass" }: { slug: string; name: string; className?: string; tone?: "glass" | "plain" }) {
  const s = useDemo();
  const hydrated = useHydrated();
  const on = hydrated && s.shortlist.includes(slug);
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        actions.toggleShortlist(slug);
      }}
      aria-pressed={on}
      aria-label={on ? `Remove ${name} from shortlist` : `Save ${name} to shortlist`}
      className={cn(
        "grid size-10 place-items-center rounded-full transition-transform active:scale-90",
        tone === "glass" ? "bg-black/25 text-white backdrop-blur-md hover:bg-black/35" : "bg-paper text-ink shadow-[var(--shadow-ring)] hover:bg-white",
        className,
      )}
    >
      <motion.span key={String(on)} initial={on ? { scale: 0.4 } : false} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 14 }}>
        <Icon name={on ? "heart-fill" : "heart"} size={19} className={on ? "text-accent-glow" : ""} />
      </motion.span>
    </button>
  );
}

/** How long each photo holds before the card advances. */
const SLIDE_MS = 4500;

/**
 * A venue in the collection grid: the photos autoplay on the grid's shared clock, each
 * progress bar filling before the next. Hover only zooms; it never touches the timeline.
 * Setting and capacity sit under the photo, so every card reads the same way.
 * The lead photo morphs into the venue page's hero on click.
 */
export function VenueCard({
  v,
  className,
  priority,
  play,
  delay = 0,
  guests,
}: {
  v: Venue;
  className?: string;
  priority?: boolean;
  /** The grid's shared clock: every card runs and pauses together, so their offsets hold */
  play: boolean;
  /** ms after the grid starts before this card's first photo begins to advance */
  delay?: number;
  /** The headcount being planned for: the card says whether it fits, and steps back when it doesn't */
  guests?: number;
}) {
  const [i, setI] = useState(0);
  const [started, setStarted] = useState(false);
  const reduced = useReducedMotion();
  const pics = v.gallery.slice(0, 5);
  const autoplay = pics.length > 1 && !reduced;
  const running = autoplay && play;
  const next = () => {
    setStarted(true);
    setI((k) => (k + 1) % pics.length);
  };

  const fit = guests ? fits(v, guests) : undefined;
  const count = guests?.toLocaleString("en-US");

  return (
    <article className={cn("group relative flex flex-col transition-[opacity,filter] duration-500", fit === false && "opacity-45 saturate-[0.35]", className)}>
      <div className="relative">
        <Link href={`/venues/${v.slug}`} className="relative block outline-none" aria-label={`${v.name}, ${v.levelLabel}, ${guestsLabel(v).toLowerCase()}`}>
          <div className="media relative aspect-[5/4] sm:aspect-[1.6]">
            <ViewTransition name={`venue-${v.slug}`} share="morph" default="none">
              <div className="absolute inset-0">
                <AnimatePresence initial={false}>
                  <motion.div
                    key={i}
                    className="absolute inset-0"
                    initial={{ opacity: 0, scale: 1.04 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Image
                      src={pics[i].src}
                      alt={i === 0 ? pics[i].alt : ""}
                      fill
                      priority={priority && i === 0}
                      sizes="(min-width: 640px) 48vw, 100vw"
                      className="object-cover transition-transform duration-[1.4s] ease-[var(--ease-out-expo)] group-hover:scale-[1.03]"
                      style={{ objectPosition: pics[i].pos }}
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
            </ViewTransition>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-black/15" />

            <div className="absolute left-4 top-4">
              <span className="inline-flex h-8 items-center rounded-full bg-black/25 px-3 text-[0.8125rem] font-medium text-white backdrop-blur-md">
                <span className="tabular">{v.levelLabel}</span>
              </span>
            </div>

            <div className="absolute inset-x-0 bottom-0 p-5 text-white lg:p-7">
              <div className="mb-4 flex gap-1.5" aria-hidden>
                {pics.map((_, k) => (
                  <span
                    key={k}
                    className={cn(
                      "relative h-[3px] overflow-hidden rounded-full transition-[width,background-color] duration-700 ease-[var(--ease-out-expo)]",
                      k === i ? "w-10 bg-white/35" : "w-3 bg-white/40",
                    )}
                  >
                    {k === i && (
                      <span
                        key={i}
                        className="absolute inset-0 origin-left rounded-full bg-white"
                        style={
                          autoplay
                            ? {
                                // Longhands only: React warns when a shorthand and one of its parts change together
                                animationName: "progress-fill",
                                animationDuration: `${SLIDE_MS}ms`,
                                animationTimingFunction: "linear",
                                animationDelay: `${started ? 0 : delay}ms`,
                                animationFillMode: "both",
                                animationPlayState: running ? "running" : "paused",
                              }
                            : undefined
                        }
                        onAnimationEnd={next}
                      />
                    )}
                  </span>
                ))}
              </div>
              <div className="flex items-end justify-between gap-4">
                <h3 className="t-h1">{v.name}</h3>
                <Icon name="arrow-up-right" size={26} className="mb-1 shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </div>
            </div>
          </div>
        </Link>
        <HeartButton slug={v.slug} name={v.name} className="absolute right-4 top-4" />
      </div>
      <dl className="grid grid-cols-2 gap-5 border-b hairline pb-5 pt-4">
        <div>
          <dt className="t-meta">Setting</dt>
          <dd className="mt-1 text-[0.9375rem]">{v.kind}</dd>
        </div>
        <div>
          <dt className="t-meta">Capacity</dt>
          <dd className="mt-1 text-[0.9375rem]">{guestsLabel(v)}</dd>
          {guests != null && (
            <dd className={cn("t-meta mt-0.5", fit ? "!text-accent" : "")}>
              {fit ? `Fits ${count}` : fit === false ? `Too small for ${count}` : `Ask about ${count}`}
            </dd>
          )}
        </div>
      </dl>
    </article>
  );
}
