"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { bookResource } from "@/lib/commit";
import { resourceSlots } from "@/lib/data/fitness";
import type { Resource } from "@/lib/data/types";
import { useDemo, useHydrated } from "@/lib/store";
import { dayKey, fmtTime, week } from "@/lib/time";
import { useNow } from "@/lib/useNow";
import Image from "@/components/ui/SmoothImage";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { DateStrip } from "../DateStrip";

/** Slot picker for a bookable studio resource (bike, recovery suite). */
export function ResourceSheet({ r, onClose }: { r: Resource | null; onClose: () => void }) {
  const s = useDemo();
  const hydrated = useHydrated();
  const days = useMemo(() => week(), []);
  const [day, setDay] = useState(dayKey(days[0]));
  const [slot, setSlot] = useState<number | null>(null);
  const [unit, setUnit] = useState(0);
  const [done, setDone] = useState(false);

  const d = days.find((x) => dayKey(x) === day)!;
  const offset = days.indexOf(d);
  const now = useNow();
  const slots = r ? resourceSlots(r) : [];
  const iso = (m: number) => {
    const x = new Date(d);
    x.setMinutes(m);
    return x.toISOString();
  };
  // A few slots are taken, deterministically
  const taken = (m: number) => (m / 30 + offset * 3 + (r?.slug.length ?? 0)) % 4 === 0;

  const state = !hydrated || s.persona === "signed-out" ? "signin" : !s.fitnessMember ? "access" : "ok";

  const close = () => {
    setSlot(null);
    setDone(false);
    onClose();
  };

  return (
    <Sheet
      open={!!r}
      onClose={close}
      title={r?.name ?? ""}
      footer={
        r &&
        (done ? (
          <Link href="/plans" onClick={close} className="flex h-13 w-full items-center justify-center gap-2 rounded-full bg-ink py-3.5 font-medium text-paper">
            See it in your plans <Icon name="arrow-right" size={18} />
          </Link>
        ) : state === "signin" ? (
          <Link
            href={`/sign-in?returnTo=${encodeURIComponent("/fitness")}`}
            className="flex h-13 w-full items-center justify-center rounded-full bg-ink py-3.5 font-medium text-paper"
          >
            Sign in to book
          </Link>
        ) : state === "access" ? (
          <Link
            href={`/account/membership?returnTo=${encodeURIComponent("/fitness")}`}
            className="flex h-13 w-full items-center justify-center gap-2 rounded-full py-3.5 font-medium shadow-[inset_0_0_0_1px_var(--color-ink)]"
          >
            <Icon name="lock" size={16} /> Get fitness access to book
          </Link>
        ) : (
          <button
            disabled={slot == null}
            onClick={() => {
              if (slot == null) return;
              bookResource(r, iso(slot), r.units[unit]);
              setDone(true);
            }}
            className="flex h-13 w-full items-center justify-center rounded-full bg-redwood py-3.5 font-medium text-paper transition-colors hover:bg-redwood-deep disabled:bg-fog disabled:text-stone-2"
          >
            {slot == null ? "Choose a time" : `Book ${fmtTime(iso(slot))} · ${r.slotMin} min`}
          </button>
        ))
      }
    >
      {r && (
        <div>
          <div className="relative aspect-[16/9] overflow-hidden rounded-[var(--radius-card)] bg-fog">
            <Image src={r.image.src} alt={r.image.alt} fill sizes="520px" className="object-cover" />
          </div>
          <p className="t-body mt-5 text-stone">{r.summary}</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {r.features.map((f) => (
              <li key={f.label} className="flex h-9 items-center gap-2 rounded-full bg-paper px-3 text-[0.8125rem] font-medium shadow-[var(--shadow-ring)]">
                <Icon name={f.icon} size={16} />
                {f.label}
              </li>
            ))}
          </ul>

          <div className="mt-8">
            <p className="mb-3 font-medium">Day</p>
            <DateStrip id="res" days={days} value={day} onChange={(k) => (setDay(k), setSlot(null))} />
          </div>
          <div className="mt-6">
            <p className="mb-3 font-medium">Time</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((m) => {
                const past = new Date(iso(m)).getTime() < now;
                const busy = taken(m);
                const on = slot === m;
                return (
                  <button
                    key={m}
                    disabled={past || busy || done}
                    onClick={() => setSlot(m)}
                    aria-pressed={on}
                    className={cn(
                      "h-11 rounded-xl text-[0.875rem] font-medium tabular-nums transition-colors",
                      on ? "bg-ink text-paper" : "bg-paper shadow-[inset_0_0_0_1px_var(--color-line-2)] hover:shadow-[inset_0_0_0_1px_var(--color-ink)]",
                      (past || busy) && "bg-transparent text-stone-2 line-through shadow-none",
                    )}
                  >
                    {fmtTime(iso(m))}
                  </button>
                );
              })}
            </div>
          </div>
          {r.units.length > 1 && (
            <div className="mt-6">
              <p className="mb-3 font-medium">{r.kind === "ride" ? "Bike" : "Suite"}</p>
              <div className="flex flex-wrap gap-2">
                {r.units.map((u, i) => (
                  <button
                    key={u}
                    onClick={() => setUnit(i)}
                    aria-pressed={unit === i}
                    className={cn(
                      "h-10 rounded-full px-4 text-[0.875rem] font-medium",
                      unit === i ? "bg-ink text-paper" : "bg-paper shadow-[inset_0_0_0_1px_var(--color-line-2)]",
                    )}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          )}
          {done && (
            <p className="t-small mt-6 flex items-center gap-2 rounded-2xl bg-ok-soft p-4 text-ok">
              <Icon name="check" size={16} strokeWidth={2.2} /> Booked. It&apos;s in your plans.
            </p>
          )}
        </div>
      )}
    </Sheet>
  );
}
