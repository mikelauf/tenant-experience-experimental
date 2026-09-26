"use client";

import { useTenant } from "@/lib/tenants/client";
import { BuildingExplorer } from "../BuildingExplorer";

/** "Explore the building": the 3D tower, its landmarks, and a panel for each venue. */
export function ExplorerSection() {
  const { copy } = useTenant();

  return (
    <section className="theme-night relative py-20 lg:py-28" aria-labelledby="explore-h" id="explore">
      <div className="frame grid-12 items-end gap-y-6">
        <div className="col-span-12 lg:col-span-7">
          <p className="t-meta">Explore the building</p>
          <h2 id="explore-h" className="t-h1 mt-3">
            {copy.public.floorIntro.title}
          </h2>
        </div>
        <div className="col-span-12 lg:col-span-5 lg:col-start-8">
          <p className="t-lead text-moon-2">Pick a floor to see each venue, the building&apos;s own floor plan, and the view from its windows.</p>
        </div>
      </div>

      <div className="frame mt-10 lg:mt-14">
        <BuildingExplorer />
      </div>
    </section>
  );
}
