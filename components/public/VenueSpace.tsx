"use client";

import type { Venue } from "@/lib/data/types";
import { SetupVisualizer } from "./SetupVisualizer";

/**
 * "The space": the venue in one place, near the top of its page. The 3D room set for an event leads,
 * with its controls in one rail (setup, guests, inquiry). The building's floor plan rides under the
 * inquiry card, and the photos at the bottom of the page point out what's in them.
 */
export function VenueSpace({ v }: { v: Pick<Venue, "slug" | "name" | "sqft" | "layout"> }) {
  if (!v.layout) return null;

  return (
    <section className="frame mt-14 lg:mt-20" aria-labelledby="space">
      <h2 id="space" className="t-h2">
        The space
      </h2>
      <p className="t-body mt-2 max-w-[62ch] text-stone">
        {v.name}, traced from the building&apos;s plan. Pick a setup, drag the guest count, and turn the room to look around.
      </p>

      <SetupVisualizer
        className="mt-8"
        variant="split"
        shell={v.layout.shell}
        setups={v.layout.setups}
        title={v.sqft ? `${v.name} · ${v.sqft.toLocaleString("en-US")} sq ft` : v.name}
        inquireHref={`/venues/inquire?venue=${v.slug}`}
        footnote={
          v.layout.illustrative
            ? "Illustrative. Traced from the building's plan; capacities are estimates until the events team confirms your plan."
            : "Traced from the building's plan. The events team confirms the final layout with you."
        }
      />
    </section>
  );
}
