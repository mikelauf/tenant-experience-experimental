"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "@/components/ui/SmoothImage";
import { BRIEF_MAX, briefHref } from "@/lib/brief";
import { cn } from "@/lib/cn";
import { guestsShort } from "@/lib/data/shared";
import { useDemo, useHydrated } from "@/lib/store";
import { useTenant } from "@/lib/tenants/client";
import { Icon } from "@/components/ui/Icon";
import { GuestStepper } from "../GuestStepper";

/**
 * A brief with no venues yet: pick them right here. Saved venues (the hearts) start ticked,
 * and a guest count, if given, sets each room up for that crowd.
 */
export function BriefPicker() {
  const { venues } = useTenant();
  const s = useDemo();
  const hydrated = useHydrated();
  const router = useRouter();
  const [picked, setPicked] = useState<string[] | null>(null);
  const [guests, setGuests] = useState("");
  // Until someone ticks a card themselves, their saved venues stand in
  const saved = hydrated ? s.shortlist.filter((x) => venues.some((v) => v.slug === x)).slice(0, BRIEF_MAX) : [];
  const chosen = picked ?? saved;
  const full = chosen.length >= BRIEF_MAX;

  const toggle = (slug: string) =>
    setPicked((p) => {
      const cur = p ?? saved;
      return cur.includes(slug) ? cur.filter((x) => x !== slug) : cur.length >= BRIEF_MAX ? cur : [...cur, slug];
    });
  const make = () => chosen.length && router.push(briefHref({ venues: chosen, guests: Number(guests) || undefined }));

  return (
    <div className="mt-12">
      <div role="group" aria-label="Venues for the brief" className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5 lg:gap-[var(--col-gap)]">
        {venues.map((v) => {
          const on = chosen.includes(v.slug);
          return (
            <button
              key={v.slug}
              type="button"
              role="checkbox"
              aria-checked={on}
              disabled={!on && full}
              onClick={() => toggle(v.slug)}
              className="group text-left disabled:opacity-50"
            >
              <span
                className={cn(
                  "media relative block aspect-[4/5] transition-[box-shadow] duration-300",
                  on ? "shadow-[0_0_0_2px_var(--color-quartz),0_0_0_4px_var(--color-ink)]" : "",
                )}
              >
                <Image
                  src={v.hero.src}
                  alt=""
                  fill
                  sizes="(min-width:1024px) 20vw, (min-width:768px) 33vw, 50vw"
                  className="object-cover transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-[1.03]"
                  style={{ objectPosition: v.hero.pos }}
                />
                <span
                  className={cn(
                    "absolute right-3 top-3 grid size-7 place-items-center rounded-full backdrop-blur-md transition-colors",
                    on ? "bg-ink text-paper" : "bg-white/70 text-transparent",
                  )}
                >
                  <Icon name="check" size={15} strokeWidth={2.5} />
                </span>
              </span>
              <span className="mt-3 block font-medium">{v.name}</span>
              <span className="t-meta block first-letter:uppercase">
                {v.levelLabel} · {guestsShort(v)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-10 flex flex-col gap-6 border-t hairline pt-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full max-w-[320px]">
          <label htmlFor="brief-guests" className="mb-2 flex items-baseline justify-between text-[0.9375rem] font-medium">
            Guests
            <span className="t-meta font-normal">Optional</span>
          </label>
          <GuestStepper id="brief-guests" value={guests} onChange={setGuests} />
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <button
            type="button"
            onClick={make}
            disabled={!chosen.length}
            className="group flex h-12 items-center justify-center gap-2 rounded-full bg-accent px-7 font-medium text-paper transition-colors hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-40"
          >
            {chosen.length > 1 ? `Compare ${chosen.length} venues` : "Make the brief"}
            <Icon name="arrow-right" size={18} className="transition-transform group-hover:translate-x-0.5" />
          </button>
          <p className="t-meta">{full ? `Up to ${BRIEF_MAX} venues in one brief.` : chosen.length ? "Share it or print it next." : "Pick one or more venues."}</p>
        </div>
      </div>
    </div>
  );
}
