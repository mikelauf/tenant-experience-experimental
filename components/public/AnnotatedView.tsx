"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import Image from "@/components/ui/SmoothImage";
import { cn } from "@/lib/cn";
import type { ViewPhoto } from "@/lib/data/types";
import { Icon } from "@/components/ui/Icon";

const POINTS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
export const compass = (deg: number) => POINTS[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];

/**
 * A real photo looking out from a venue, with the landmarks in it tagged where they actually are,
 * and which way it faces. Replaces rendering the view: the photographs are the truth.
 * The frame keeps each photo's own proportions so tag positions stay exact.
 */
export function AnnotatedView({ views, className, tone = "night" }: { views: ViewPhoto[]; className?: string; tone?: "night" | "day" }) {
  const [i, setI] = useState(0);
  const [tags, setTags] = useState(true);
  if (!views.length) return null;
  const v = views[Math.min(i, views.length - 1)];
  const go = (d: number) => setI((k) => (k + d + views.length) % views.length);

  return (
    <figure className={cn("overflow-hidden rounded-[var(--radius-card)]", tone === "night" ? "bg-night-2" : "bg-paper shadow-[var(--shadow-ring)]", className)}>
      <div className="relative mx-auto max-h-[70svh]" style={{ aspectRatio: v.ratio, maxWidth: `calc(70svh * ${v.ratio})` }}>
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div key={v.src} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <Image src={v.src} alt={v.alt} fill sizes="(min-width:1024px) 40vw, 100vw" className="object-cover" />
          </motion.div>
        </AnimatePresence>
        {tags &&
          v.tags?.map((t, k) => (
            <motion.span
              key={`${v.src}-${t.label}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + k * 0.08, duration: 0.4 }}
              className="pointer-events-none absolute flex -translate-x-1/2 flex-col items-center"
              style={{ left: `${t.x}%`, bottom: `${100 - t.y}%` }}
            >
              <span className="whitespace-nowrap rounded-full bg-night/80 px-2.5 py-1 text-[0.75rem] font-medium text-moon shadow-[var(--shadow-float)] backdrop-blur-sm">
                {t.label}
              </span>
              <span className="h-5 w-px bg-moon/80" />
              <span className="keep-round size-2 rounded-full border-2 border-night bg-moon" />
            </motion.span>
          ))}
        {views.length > 1 && (
          <>
            <button
              onClick={() => go(-1)}
              aria-label="Previous view"
              className="absolute left-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-night/60 text-moon backdrop-blur-md hover:bg-night/80"
            >
              <Icon name="chevron-left" size={18} />
            </button>
            <button
              onClick={() => go(1)}
              aria-label="Next view"
              className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-night/60 text-moon backdrop-blur-md hover:bg-night/80"
            >
              <Icon name="chevron-right" size={18} />
            </button>
          </>
        )}
      </div>
      <figcaption className={cn("flex items-center justify-between gap-3 px-4 py-3", tone === "night" ? "text-moon" : "text-ink")}>
        <span className="min-w-0">
          <span className="block truncate text-[0.875rem] font-medium">{v.caption}</span>
          {v.bearing != null && (
            <span className={cn("t-meta flex items-center gap-1.5", tone === "night" && "!text-moon-2")}>
              <span className="keep-round inline-block size-3 rounded-full border border-current" style={{ transform: `rotate(${v.bearing}deg)` }} aria-hidden>
                <span className="mx-auto mt-px block h-1.5 w-px bg-current" />
              </span>
              Facing {compass(v.bearing)} · {views.length > 1 ? `${i + 1} of ${views.length}` : "1 photo"}
            </span>
          )}
        </span>
        {v.tags?.length ? (
          <button
            onClick={() => setTags((x) => !x)}
            aria-pressed={tags}
            className={cn("t-small shrink-0 underline-offset-2 hover:underline", tone === "night" ? "text-moon-2" : "text-stone")}
          >
            {tags ? "Hide labels" : "Show labels"}
          </button>
        ) : null}
      </figcaption>
    </figure>
  );
}
