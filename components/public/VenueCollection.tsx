"use client";

import { LayoutGroup, motion, useInView, useReducedMotion } from "motion/react";
import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { fits } from "@/lib/data/shared";
import { useSharedGuests } from "@/lib/store";
import { useTenant } from "@/lib/tenants/client";
import { Button } from "@/components/ui/Button";
import { GuestStepper } from "./GuestStepper";
import { VenueCard } from "./VenueCard";

/** How many venues show before "View all". Spencer: showcase the top four. */
const FIRST = 4;
/** Each card starts this long after the one before it, so they never flip in unison. */
const STEP_MS = 1000;
/** One-tap headcounts beside the field */
const PRESETS = [50, 100, 250, 500];

/**
 * Every venue in an even grid, like browsing products: same size, same facts, easy to compare.
 * A guest count, set here or anywhere else on the site, brings the rooms that hold it to the front.
 */
export function VenueCollection() {
  const { venues, copy } = useTenant();
  const [all, setAll] = useState(false);
  const [guests, setGuests] = useSharedGuests();
  const n = Number(guests) || 0;
  const reduce = useReducedMotion();
  // One clock for the whole grid: it starts when the first card comes into view and
  // pauses when the grid leaves it, so the one-second offsets between cards hold.
  const grid = useRef<HTMLDivElement>(null);
  const play = useInView(grid, { amount: 0.2 });

  // With a count, the rooms that hold it come first (in their usual order) and nothing hides behind "View all"
  const ordered = n ? [...venues].sort((a, b) => Number(fits(b, n) !== false) - Number(fits(a, n) !== false)) : venues;
  const shown = all || n ? ordered : ordered.slice(0, FIRST);
  const holding = n ? venues.filter((v) => fits(v, n) !== false).length : 0;

  return (
    <section id="collection" className="frame pb-24 pt-20 lg:pb-36 lg:pt-32">
      <div className="grid-12 items-end gap-y-6">
        <h2 className="t-h1 col-span-12 lg:col-span-8">
          {copy.public.collection[0]}
          <br />
          <span className="text-stone">{copy.public.collection[1]}</span>
        </h2>
        <p className="t-lead col-span-12 text-stone lg:col-span-4 lg:col-start-9">{copy.public.collectionLead}</p>
      </div>

      {/* How many: sets the count for the whole site */}
      <div className="mt-10 flex flex-col gap-4 border-y hairline py-5 sm:flex-row sm:items-center sm:justify-between lg:mt-14">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <label htmlFor="collection-guests" className="font-medium">
            Guests
          </label>
          <GuestStepper id="collection-guests" value={guests} onChange={setGuests} className="w-[200px]" />
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Common guest counts">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={n === p}
                onClick={() => setGuests(n === p ? "" : String(p))}
                className={cn(
                  "h-9 rounded-full px-3.5 text-[0.875rem] font-medium tabular-nums transition-colors",
                  n === p ? "bg-ink text-paper" : "text-ink-2 shadow-[inset_0_0_0_1px_var(--color-line-2)] hover:shadow-[inset_0_0_0_1px_var(--color-stone-2)]",
                )}
              >
                {p}
                {p === PRESETS.at(-1) ? "+" : ""}
              </button>
            ))}
          </div>
        </div>
        <p className="t-small flex items-center gap-3 text-stone" aria-live="polite">
          {n ? (
            <>
              <span>
                <span className="font-medium text-ink">{holding}</span> of {venues.length} hold {n.toLocaleString("en-US")}
              </span>
              <button type="button" onClick={() => setGuests("")} className="font-medium text-ink underline-offset-2 hover:underline">
                Clear
              </button>
            </>
          ) : (
            "Add a headcount to see which rooms fit."
          )}
        </p>
      </div>

      <LayoutGroup>
        <div ref={grid} className="mt-10 grid gap-x-[var(--col-gap)] gap-y-10 sm:grid-cols-2 lg:mt-12">
          {shown.map((v, i) => (
            <motion.div
              key={v.slug}
              layout={reduce ? false : "position"}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className={shown.length === 1 ? "sm:col-span-2" : undefined}
            >
              <VenueCard v={v} priority={i < 2} play={play} delay={i * STEP_MS} guests={n || undefined} />
            </motion.div>
          ))}
        </div>
      </LayoutGroup>

      {venues.length > FIRST && !n && (
        <div className="mt-10 flex justify-center">
          <Button variant="outline" onClick={() => setAll((a) => !a)} icon={all ? undefined : "chevron-down"}>
            {all ? "Show fewer" : `View all ${venues.length} venues`}
          </Button>
        </div>
      )}
    </section>
  );
}
