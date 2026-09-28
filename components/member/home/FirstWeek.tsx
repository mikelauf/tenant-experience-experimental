"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useMemo } from "react";
import type { Commitment } from "@/lib/data/types";
import { actions, useDemo } from "@/lib/store";
import { useTenant } from "@/lib/tenants/client";
import { fmtDay, fmtTime } from "@/lib/time";
import { RevealItem } from "@/components/motion/Reveal";
import { Icon } from "@/components/ui/Icon";
import { isUpcoming, useNow } from "../Commitments";
import { UnlockCard, useUnlockItems, type Unlock } from "./SignInUnlocks";

type Step = {
  id: string;
  u: Pick<Unlock, "img" | "icon" | "title" | "detail">;
  /** The short name in the checklist */
  label: string;
  done: boolean;
  /** What they booked for this step, shown in the checklist */
  booked?: Commitment;
  cta: string;
  href?: string;
  dismiss?: string;
};

/**
 * A new member's first week (Wayfinder #307 counts a first action in 30 days), laid out like the signed-out unlocks:
 * the checklist pinned on the left, and real things to do today on the right. Each checks off as it's done, and
 * whatever got booked shows in the list.
 */
export function FirstWeek({ onOpen }: { onOpen: (c: Commitment) => void }) {
  const t = useTenant();
  const s = useDemo();
  const now = useNow();
  const items = useUnlockItems();

  const steps = useMemo<Step[]>(() => {
    const live = s.commitments.filter((c) => c.status !== "cancelled").sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    const booked = (k: Commitment["kind"]) => live.find((c) => c.kind === k && isUpcoming(c, now)) ?? live.find((c) => c.kind === k);
    const item = (k: Unlock["kind"]) => items.find((u) => u.kind === k);
    const out: Step[] = [];

    const room = item("room");
    if (room) {
      const b = booked("room");
      out.push({ id: "room", u: room, label: "Book a room", done: !!b, booked: b, cta: "Book a room", href: "/spaces" });
    }
    const cls = item("class");
    if (cls) {
      const b = booked("class");
      out.push({
        id: "class",
        u: cls,
        label: "Try a class",
        done: !!b || s.fitnessMember,
        booked: b,
        ...(s.fitnessMember ? { cta: "Save a spot", href: cls.returnTo } : { cta: "See the membership", href: "/fitness" }),
      });
    }
    const ev = item("event");
    if (ev) {
      const b = booked("event");
      out.push({ id: "event", u: ev, label: "Say yes to an event", done: !!b, booked: b, cta: "RSVP", href: ev.returnTo });
    }
    out.push({
      id: "concierge",
      u: {
        img: t.copy.firstWeek.concierge.img,
        icon: "people",
        title: "Meet the concierge",
        detail: `${t.copy.concierge}, ${t.building.concierge.hours.toLowerCase()}. Directions, deliveries, a dinner reservation: they can do almost anything.`,
      },
      label: "Meet the concierge",
      done: s.dismissed.includes("concierge"),
      cta: "Got it",
      dismiss: "concierge",
    });
    return out;
  }, [items, s, t, now]);

  const doneCount = steps.filter((x) => x.done).length;
  const allDone = doneCount === steps.length;

  return (
    <section id="first" className="scroll-mt-[var(--nav-h)] py-20 lg:py-28" aria-labelledby="first-h">
      <div className="frame grid-12 gap-y-10">
        <div className="col-span-12 lg:col-span-4">
          <div className="lg:sticky lg:top-[calc(var(--nav-h)+32px)]">
            <h2 id="first-h" className="t-h1">
              {allDone ? "You're all set." : "Your first week."}
            </h2>
            <p className="t-lead mt-4 max-w-[36ch] text-stone">
              {allDone ? (
                <>
                  That&apos;s the building. Everything you&apos;ve booked is in{" "}
                  <Link href="/plans" className="font-medium text-ink underline decoration-ink/25 underline-offset-4 hover:decoration-ink">
                    Plans
                  </Link>
                  .
                </>
              ) : (
                `${steps.length === 4 ? "Four" : steps.length} things worth doing in your first few days here.`
              )}
            </p>

            <div className="mt-8 flex items-center gap-3" aria-label={`${doneCount} of ${steps.length} done`}>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-fog">
                <motion.span
                  className="block h-full rounded-full bg-accent"
                  initial={false}
                  animate={{ width: `${(doneCount / steps.length) * 100}%` }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                />
              </span>
              <span className="t-meta tabular shrink-0">
                {doneCount} of {steps.length}
              </span>
            </div>

            <ol className="mt-6 space-y-3 border-t hairline pt-6">
              {steps.map((x, i) => (
                <li key={x.id} className="flex gap-3 text-[0.9375rem]">
                  <span className="t-num flex w-4 shrink-0 justify-center pt-0.5 text-accent">
                    {x.done ? <Icon name="check" size={16} strokeWidth={2.2} className="text-ok" /> : i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className={x.done ? "text-stone line-through decoration-stone-2 decoration-1" : "text-ink-2"}>{x.label}</span>
                    {x.booked && (
                      <button
                        onClick={() => onOpen(x.booked!)}
                        className="t-small mt-0.5 block text-left text-ink underline decoration-ink/20 underline-offset-4 hover:decoration-ink"
                      >
                        {x.booked.title} · {fmtDay(x.booked.startsAt)}, {fmtTime(x.booked.startsAt)}
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <ul className="col-span-12 grid gap-4 sm:grid-cols-2 lg:col-span-8 lg:col-start-5 lg:gap-5">
          {steps.map((x, i) => (
            <RevealItem key={x.id} delay={i * 0.06} className="h-full">
              {x.done ? (
                <UnlockCard u={x.u} done cta={x.booked ? "Booked · See it in Plans" : "Done"} href={x.booked ? "/plans" : x.href} />
              ) : (
                <UnlockCard u={x.u} cta={x.cta} href={x.href} onClick={x.dismiss ? () => actions.dismiss(x.dismiss!) : undefined} />
              )}
            </RevealItem>
          ))}
        </ul>
      </div>
    </section>
  );
}
