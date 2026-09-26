"use client";

import { useInView } from "motion/react";
import { useRef, useState } from "react";
import { useTenant } from "@/lib/tenants/client";
import { Button } from "@/components/ui/Button";
import { VenueCard } from "./VenueCard";

/** How many venues show before "View all". Spencer: showcase the top four. */
const FIRST = 4;
/** Each card starts this long after the one before it, so they never flip in unison. */
const STEP_MS = 1000;

/** Every venue in an even grid, like browsing products: same size, same facts, easy to compare. */
export function VenueCollection() {
  const { venues, copy } = useTenant();
  const [all, setAll] = useState(false);
  // One clock for the whole grid: it starts when the first card comes into view and
  // pauses when the grid leaves it, so the one-second offsets between cards hold.
  const grid = useRef<HTMLDivElement>(null);
  const play = useInView(grid, { amount: 0.2 });
  const shown = all ? venues : venues.slice(0, FIRST);

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

      <div ref={grid} className="mt-12 grid gap-x-[var(--col-gap)] gap-y-10 sm:grid-cols-2 lg:mt-16">
        {shown.map((v, i) => (
          <VenueCard key={v.slug} v={v} priority={i < 2} play={play} delay={i * STEP_MS} className={shown.length === 1 ? "sm:col-span-2" : undefined} />
        ))}
      </div>

      {venues.length > FIRST && (
        <div className="mt-10 flex justify-center">
          <Button variant="outline" onClick={() => setAll((a) => !a)} icon={all ? undefined : "chevron-down"}>
            {all ? "Show fewer" : `View all ${venues.length} venues`}
          </Button>
        </div>
      )}
    </section>
  );
}
