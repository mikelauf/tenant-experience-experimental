"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { VenueTag } from "@/lib/data/types";
import { venueTags, venues } from "@/lib/data/venues";
import { Icon, type AnyIcon } from "@/components/ui/Icon";
import { VenueCard } from "./VenueCard";

const tagIcons: Record<VenueTag, AnyIcon> = {
  views: "view",
  outdoor: "tree",
  evening: "moon",
  daylight: "sun",
  catering: "glass",
  av: "mic",
  private: "lock",
};

const sizes = [
  { id: "any", label: "Any size", min: 0 },
  { id: "50", label: "50+", min: 50 },
  { id: "120", label: "120+", min: 120 },
  { id: "200", label: "200+", min: 200 },
];

export function VenueCollection() {
  const [tag, setTag] = useState<VenueTag | null>(null);
  const [size, setSize] = useState("any");
  const min = sizes.find((s) => s.id === size)!.min;
  const match = (v: (typeof venues)[number]) => (!tag || v.tags.includes(tag)) && Math.max(...Object.values(v.capacities).map((n) => n ?? 0)) >= min;
  const count = venues.filter(match).length;

  return (
    <section id="collection" className="frame pb-24 pt-20 lg:pb-36 lg:pt-32">
      <div className="grid-12 items-end gap-y-6">
        <h2 className="t-h1 col-span-12 lg:col-span-7">
          Three places to gather,
          <br />
          <span className="text-stone">from the grove to the 27th floor.</span>
        </h2>
        <p className="t-lead col-span-12 text-stone lg:col-span-4 lg:col-start-9">
          Every venue comes with our events team, trusted caterers and a single point of contact from first call to last guest.
        </p>
      </div>

      {/* Category chips (travel-app style) */}
      <div className="sticky top-[var(--nav-h)] z-20 -mx-[var(--gutter)] mt-12 bg-quartz/85 px-[var(--gutter)] py-3 backdrop-blur-xl">
        <div className="flex items-center gap-6">
          <div role="group" aria-label="Filter by feature" className="no-scrollbar mask-fade-r -my-1 flex flex-1 gap-1 overflow-x-auto py-1 lg:mask-none">
            {venueTags.map((t) => {
              const on = tag === t.id;
              return (
                <button
                  key={t.id}
                  aria-pressed={on}
                  onClick={() => setTag(on ? null : t.id)}
                  className={cn(
                    "group/chip flex shrink-0 flex-col items-center gap-1.5 rounded-2xl px-4 pb-2 pt-2.5 text-[0.8125rem] font-medium transition-colors",
                    on ? "text-ink" : "text-stone hover:text-ink",
                  )}
                >
                  <Icon name={tagIcons[t.id]} size={22} className="transition-transform duration-300 group-hover/chip:-translate-y-0.5" />
                  <span className="relative whitespace-nowrap">
                    {t.label}
                    <span
                      className={cn(
                        "absolute -bottom-2 left-0 right-0 h-[2px] rounded-full bg-ink transition-transform duration-300",
                        on ? "scale-x-100" : "scale-x-0",
                      )}
                    />
                  </span>
                </button>
              );
            })}
          </div>
          <div className="hidden shrink-0 items-center gap-1 rounded-full bg-fog p-1 md:flex" role="group" aria-label="Guest count">
            {sizes.map((s) => (
              <button
                key={s.id}
                aria-pressed={size === s.id}
                onClick={() => setSize(s.id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[0.8125rem] font-medium",
                  size === s.id ? "bg-paper shadow-[var(--shadow-ring)]" : "text-stone hover:text-ink",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="t-meta mt-4" aria-live="polite">
        {count === venues.length ? `${count} venues` : count === 0 ? "No venue matches both filters. Try fewer." : `${count} of ${venues.length} venues match`}
      </p>

      {/* Editorial mosaic on desktop, swipe rail on phones */}
      <div className="no-scrollbar -mx-[var(--gutter)] mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-[var(--gutter)] lg:mx-0 lg:grid lg:grid-cols-12 lg:gap-[var(--col-gap)] lg:overflow-visible lg:px-0">
        <VenueCard v={venues[0]} size="lg" dim={!match(venues[0])} priority className="w-[84vw] shrink-0 snap-start lg:col-span-7 lg:row-span-2 lg:w-auto" />
        <VenueCard v={venues[1]} dim={!match(venues[1])} className="w-[84vw] shrink-0 snap-start lg:col-span-5 lg:w-auto" />
        <VenueCard v={venues[2]} dim={!match(venues[2])} className="w-[84vw] shrink-0 snap-start lg:col-span-5 lg:w-auto" />
      </div>
    </section>
  );
}
