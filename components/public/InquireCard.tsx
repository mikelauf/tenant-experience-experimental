"use client";

import { useState } from "react";
import type { Venue } from "@/lib/data/types";
import { guestsLabel, maxCap } from "@/lib/data/shared";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import { DatePicker } from "./DatePicker";
import { GuestStepper } from "./GuestStepper";
import { InquireLink } from "./InquiryModal";
import { HeartButton } from "./VenueCard";
import { useSharedGuests } from "@/lib/store";

/** Side card on desktop (the page's column keeps it in view); a bottom bar on phones. Hands its values to the inquiry, which opens over the page. */
export function InquireCard({ v }: { v: Venue }) {
  const cap = maxCap(v);
  // Starts at the count set elsewhere on the site, else a comfortable share of the room; edits here carry on too
  const [shared, setShared] = useSharedGuests();
  const [own, setOwn] = useState<string | null>(null);
  const guests = own ?? (shared || String(cap ? Math.max(10, Math.round((cap * 0.6) / 10) * 10) : 40));
  const setGuests = (x: string) => {
    setOwn(x);
    setShared(x);
  };
  const [date, setDate] = useState("");
  const count = Number(guests) || 0;
  const over = cap != null && count > cap;

  return (
    <>
      <aside className="card hidden p-6 shadow-[var(--shadow-soft)] lg:block" aria-label={`Inquire about ${v.name}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="t-h3">Inquire about {v.name}</p>
            <p className="t-meta mt-1">No account needed, and it doesn&apos;t reserve the space</p>
          </div>
          <HeartButton slug={v.slug} name={v.name} tone="plain" />
        </div>

        <div className="mt-6 rounded-2xl shadow-[inset_0_0_0_1px_var(--color-line-2)]">
          <div className="border-b hairline px-4 py-3">
            <span className="block text-[0.75rem] font-medium text-stone">Preferred date</span>
            <DatePicker value={date} onChange={setDate} compact placeholder="Add a date" />
          </div>
          <div className="px-4 py-3">
            <label htmlFor={`guests-${v.slug}`} className="block text-[0.75rem] font-medium text-stone">
              Guests
            </label>
            <GuestStepper id={`guests-${v.slug}`} value={guests} onChange={setGuests} compact />
          </div>
        </div>
        <p className={cn("t-small mt-3 transition-colors", over ? "text-accent" : "text-stone")} aria-live="polite">
          {cap == null
            ? `${v.name}: ${guestsLabel(v).toLowerCase()}. Share your headcount and the events team will advise.`
            : !count
              ? `${v.name} holds up to ${cap.toLocaleString("en-US")}.`
              : over
              ? `That's over ${v.name}'s ${cap.toLocaleString("en-US")}-guest capacity. The events team can suggest another space.`
              : `Within ${v.name}'s capacity of ${cap.toLocaleString("en-US")}.`}
        </p>

        <InquireLink
          initial={{ venue: v.slug, guests, date }}
          className="mt-5 flex h-13 w-full items-center justify-center gap-2 rounded-full bg-accent py-3.5 font-medium text-paper transition-colors hover:bg-accent-deep"
        >
          Continue inquiry
          <Icon name="arrow-right" size={18} />
        </InquireLink>
        <p className="t-meta mt-3 text-center">An inquiry starts a conversation with the events team.</p>
      </aside>

      {/* mb-0! because the sidebar's space-y margin would otherwise lift a fixed bar off the bottom */}
      <div className="fixed inset-x-0 bottom-0 z-40 mb-0! border-t hairline bg-paper/92 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between gap-4 pl-[52px] sm:pl-[88px]">
          <div className="min-w-0">
            <p className="truncate font-medium">{v.name}</p>
            <p className="t-meta">{guestsLabel(v)}</p>
          </div>
          <InquireLink initial={{ venue: v.slug }} className="flex h-12 shrink-0 items-center rounded-full bg-accent px-6 font-medium text-paper">
            Inquire
          </InquireLink>
        </div>
      </div>
    </>
  );
}
