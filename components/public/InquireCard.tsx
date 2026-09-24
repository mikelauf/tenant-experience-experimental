"use client";

import Link from "next/link";
import { useState } from "react";
import type { Venue } from "@/lib/data/types";
import { maxCap } from "@/lib/data/venues";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import { HeartButton } from "./VenueCard";

function href(v: Venue, guests: number, date: string) {
  const q = new URLSearchParams({ venue: v.slug });
  if (guests) q.set("guests", String(guests));
  if (date) q.set("date", date);
  return `/venues/inquire?${q}`;
}

/** Sticky side card on desktop; a bottom bar on phones. Hands its values to the inquiry form. */
export function InquireCard({ v }: { v: Venue }) {
  const cap = maxCap(v);
  const [guests, setGuests] = useState(Math.round((cap * 0.6) / 10) * 10);
  const [date, setDate] = useState("");
  const over = guests > cap;

  return (
    <>
      <aside className="card sticky top-[calc(var(--nav-h)+20px)] hidden p-6 shadow-[var(--shadow-soft)] lg:block" aria-label={`Inquire about ${v.name}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="t-h3">Inquire about {v.name}</p>
            <p className="t-meta mt-1">Free, no account, no commitment</p>
          </div>
          <HeartButton slug={v.slug} name={v.name} tone="plain" />
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl shadow-[inset_0_0_0_1px_var(--color-line-2)]">
          <label className="block border-b hairline px-4 py-3">
            <span className="block text-[0.75rem] font-medium text-stone">Preferred date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-0.5 w-full bg-transparent text-[0.9375rem] outline-none" />
          </label>
          <div className="flex items-center justify-between px-4 py-3">
            <span>
              <span className="block text-[0.75rem] font-medium text-stone">Guests</span>
              <span className="t-num text-[1.125rem] font-medium">{guests}</span>
            </span>
            <span className="flex items-center gap-2">
              {[-10, 10].map((d) => (
                <button
                  key={d}
                  onClick={() => setGuests((g) => Math.max(10, g + d))}
                  aria-label={d < 0 ? "Fewer guests" : "More guests"}
                  className="grid size-9 place-items-center rounded-full shadow-[inset_0_0_0_1px_var(--color-line-2)] hover:bg-fog"
                >
                  <Icon name={d < 0 ? "minus" : "plus"} size={16} />
                </button>
              ))}
            </span>
          </div>
        </div>
        <p className={cn("t-small mt-3 transition-colors", over ? "text-redwood" : "text-stone")} aria-live="polite">
          {over
            ? `That's over ${v.name}'s ${cap}-guest capacity. We'll suggest another space, or a combination.`
            : `Fits comfortably. ${v.name} holds up to ${cap}.`}
        </p>

        <Link
          href={href(v, guests, date)}
          className="mt-5 flex h-13 w-full items-center justify-center gap-2 rounded-full bg-redwood py-3.5 font-medium text-paper transition-colors hover:bg-redwood-deep"
        >
          Continue inquiry
          <Icon name="arrow-right" size={18} />
        </Link>
        <p className="t-meta mt-3 text-center">An inquiry doesn&apos;t reserve the space. We reply within one business day.</p>
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t hairline bg-paper/92 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between gap-4 pl-[52px] sm:pl-[88px]">
          <div className="min-w-0">
            <p className="truncate font-medium">{v.name}</p>
            <p className="t-meta">Up to {cap} guests</p>
          </div>
          <Link href={href(v, 0, "")} className="flex h-12 shrink-0 items-center rounded-full bg-redwood px-6 font-medium text-paper">
            Inquire
          </Link>
        </div>
      </div>
    </>
  );
}
