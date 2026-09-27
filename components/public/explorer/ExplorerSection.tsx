"use client";

import { useTenant } from "@/lib/tenants/client";
import { Icon } from "@/components/ui/Icon";
import { BuildingExplorer } from "../BuildingExplorer";

/** Two arrows either side of a line: turn it. */
function Turn() {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 12h16M7 9l-3 3 3 3M17 9l3 3-3 3" />
    </svg>
  );
}

/** What there is to do here, so the scene reads as something to use, not a picture. */
const HOW = [
  { icon: <Turn />, label: "Drag to turn it" },
  { icon: <Icon name="grid" size={16} />, label: "Pick a floor" },
  { icon: <Icon name="view" size={16} />, label: "Look out the windows" },
];

/** "Explore the building": the 3D tower, its landmarks, and a panel for each venue. The stage runs edge to edge. */
export function ExplorerSection() {
  const { copy } = useTenant();
  const intro = copy.public.floorIntro;

  return (
    <section className="theme-night relative pb-4 pt-20 lg:pb-7 lg:pt-28" aria-labelledby="explore-h" id="explore">
      <div className="frame grid-12 items-end gap-y-6">
        <div className="col-span-12 lg:col-span-6">
          <p className="t-meta">Explore the building</p>
          <h2 id="explore-h" className="t-h1 mt-3">
            {intro.title}
          </h2>
        </div>
        <div className="col-span-12 lg:col-span-5 lg:col-start-8">
          <p className="t-lead max-w-[46ch] text-moon-2">{intro.body}</p>
          {/* Plain hints, not pills: the floor chips just below are the things to tap */}
          <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2" aria-label="How it works">
            {HOW.map((h) => (
              <li key={h.label} className="inline-flex items-center gap-2 text-[0.875rem] font-medium text-moon/90">
                <span className="text-accent-glow">{h.icon}</span>
                {h.label}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-10 lg:mt-14">
        <BuildingExplorer />
      </div>
    </section>
  );
}
