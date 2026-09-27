"use client";

import type { Venue } from "@/lib/data/types";
import { useTenant } from "@/lib/tenants/client";
import { useSharedGuests } from "@/lib/store";
import { useInquire } from "./InquiryModal";
import { SetupVisualizer } from "./SetupVisualizer";

/**
 * "The space": the venue in one place, near the top of its page. The 3D room set for an event leads,
 * with its controls in one rail (setup, guests, inquiry). The building's floor plan rides under the
 * inquiry card, and the photos just above point out what's in them. "3D render" swaps the room for
 * the tower with this floor lit, so where it sits is answered here rather than on the explorer.
 */
export function VenueSpace({ v }: { v: Pick<Venue, "slug" | "name" | "sqft" | "layout" | "views" | "viewBearing" | "level"> }) {
  const { tower } = useTenant();
  const inquire = useInquire();
  const [guests] = useSharedGuests();
  if (!v.layout) return null;

  return (
    <section className="frame mt-14 lg:mt-20" aria-labelledby="space">
      <h2 id="space" className="t-h2">
        The space
      </h2>
      <p className="t-body mt-2 max-w-[62ch] text-stone">
        {v.name}, traced from the building&apos;s plan. Pick a setup, drag the guest count, turn the room, look out from the windows, or step back to see where it sits in the building.
      </p>

      <SetupVisualizer
        className="mt-8"
        variant="split"
        shell={v.layout.shell}
        setups={v.layout.setups}
        title={v.sqft ? `${v.name} · ${v.sqft.toLocaleString("en-US")} sq ft` : v.name}
        inquireHref={`/venues/inquire?venue=${v.slug}`}
        seedGuests={Number(guests) || undefined}
        onInquire={inquire ? ({ guests, setup }) => inquire({ venue: v.slug, guests: String(guests), setup }) : undefined}
        views={v.views}
        viewBearing={v.viewBearing}
        north={tower.north}
        shareable
        slug={v.slug}
        building={{ level: v.level, name: v.name.replace(/^Transamerica /, "") }}
        footnote={
          v.layout.illustrative
            ? "Illustrative. Traced from the building's plan; capacities are estimates until the events team confirms your plan."
            : "Traced from the building's plan. The events team confirms the final layout with you."
        }
      />
    </section>
  );
}
