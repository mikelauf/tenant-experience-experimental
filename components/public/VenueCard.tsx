"use client";

import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import Image from "@/components/ui/SmoothImage";
import Link from "next/link";
import { ViewTransition, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { Venue } from "@/lib/data/types";
import { maxCap } from "@/lib/data/venues";
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
        <Icon name={on ? "heart-fill" : "heart"} size={19} className={on ? "text-redwood-glow" : ""} />
      </motion.span>
    </button>
  );
}

/** How long each photo holds before the gallery advances. */
const SLIDE_MS = 7000;

/**
 * Airbnb-style card: the gallery autoplays while in view, each progress bar
 * filling before the next photo. Hover only zooms the image; it never touches the timeline.
 * The lead image morphs into the detail hero on click.
 */
export function VenueCard({
  v,
  size = "md",
  dim,
  className,
  priority,
  stagger = 0,
}: {
  v: Venue;
  size?: "lg" | "md";
  dim?: boolean;
  className?: string;
  priority?: boolean;
  /** ms to hold the first photo before this card's autoplay starts, so sibling cards don't flip in unison */
  stagger?: number;
}) {
  const [i, setI] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { amount: 0.4 });
  const reduced = useReducedMotion();
  const pics = v.gallery.slice(0, 4);
  const autoplay = pics.length > 1 && !reduced;
  const running = autoplay && inView && !dim;
  const next = () => {
    setStarted(true);
    setI((k) => (k + 1) % pics.length);
  };

  return (
    <motion.article
      ref={ref}
      layout
      animate={{ opacity: dim ? 0.35 : 1, scale: dim ? 0.985 : 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn("group relative flex flex-col", className)}
    >
      <Link href={`/venues/${v.slug}`} className="relative block flex-1 outline-none" aria-label={`${v.name}, ${v.levelLabel}, up to ${maxCap(v)} guests`}>
        <div className={cn("media relative h-full", size === "lg" ? "min-h-[440px] lg:min-h-[640px]" : "min-h-[340px] lg:min-h-[300px]")}>
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
                    sizes={size === "lg" ? "(min-width: 1024px) 58vw, 100vw" : "(min-width: 1024px) 40vw, 100vw"}
                    className="object-cover transition-transform duration-[1.4s] ease-[var(--ease-out-expo)] group-hover:scale-[1.03]"
                    style={{ objectPosition: pics[i].pos }}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </ViewTransition>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
            <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-black/25 px-3 text-[0.8125rem] font-medium text-white backdrop-blur-md">
              <span className="tabular">{v.level === 0 ? "Street level" : `Level ${v.level}`}</span>
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
                              animation: `progress-fill ${SLIDE_MS}ms linear ${started ? 0 : stagger}ms both`,
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
            <p className="text-[0.875rem] text-white/75">
              {v.kind} · Up to {maxCap(v)} guests
            </p>
            <h3 className={cn("mt-1", size === "lg" ? "t-h1" : "t-h2")}>{v.name}</h3>
            {size === "lg" && <p className="t-lead mt-3 max-w-[38ch] text-white/85">{v.tagline}</p>}
          </div>
        </div>
      </Link>
      <HeartButton slug={v.slug} name={v.name} className="absolute right-4 top-4" />
    </motion.article>
  );
}
