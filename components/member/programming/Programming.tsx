"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { useTenant } from "@/lib/tenants/client";
import { dayDiff, fmtLongDay } from "@/lib/time";
import { useNow } from "@/lib/useNow";
import Link from "next/link";
import { LineReveal } from "@/components/motion/Reveal";
import { EventCard } from "../EventCard";

export function Programming() {
  const t = useTenant();
  const now = useNow(60000);
  const all = useMemo(() => t.events().filter((e) => new Date(e.startsAt).getTime() > now), [now, t]);
  // Chips for the kinds of events this building actually runs, plus your company's own
  const filters = [
    { id: "all", label: "Everything" },
    { id: "week", label: "This week" },
    ...Object.entries(t.copy.kickers).map(([id, label]) => ({ id, label })),
    ...(t.events().some((e) => e.access.type === "company") ? [{ id: "company", label: `For ${t.member.company}` }] : []),
  ];
  const [f, setF] = useState("all");
  const list = all.filter((e) =>
    f === "all" ? true : f === "week" ? dayDiff(e.startsAt) < 7 : f === "company" ? e.access.type === "company" : e.kicker === f,
  );
  const [lead, ...rest] = list;

  return (
    <div className="pb-tab lg:pb-28">
      <section className="frame pt-[calc(var(--nav-h)+40px)] lg:pt-[calc(var(--nav-h)+64px)]">
        <div className="grid-12 gap-y-6">
          <div className="col-span-12 lg:col-span-8">
            <p className="t-lead text-stone">Hosted by the building</p>
            <LineReveal as="h1" className="t-hero mt-2" lines={["Things worth leaving", "your desk for."]} />
          </div>
          <p className="t-body col-span-12 self-end text-stone lg:col-span-4">
            {t.copy.programmingLead}, for everyone who works at {t.copy.the}. Planning your own gathering? That&apos;s in{" "}
            <Link href="/spaces/plan-an-event" className="underline underline-offset-4">
              Spaces
            </Link>
            .
          </p>
        </div>
      </section>

      <div className="sticky top-[var(--nav-h)] z-30 mt-10 bg-quartz/88 backdrop-blur-xl">
        <div role="group" aria-label="Filter events" className="frame no-scrollbar flex gap-1.5 overflow-x-auto py-3">
          {filters.map((x) => (
            <button
              key={x.id}
              aria-pressed={f === x.id}
              onClick={() => setF(x.id)}
              className={cn(
                "h-10 shrink-0 rounded-full px-4 text-[0.875rem] font-medium transition-colors",
                f === x.id
                  ? "bg-ink text-paper"
                  : "bg-paper text-ink-2 shadow-[inset_0_0_0_1px_var(--color-line-2)] hover:shadow-[inset_0_0_0_1px_var(--color-stone-2)]",
              )}
            >
              {x.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={f}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          {list.length === 0 ? (
            <div className="frame mt-10">
              <div className="rounded-[var(--radius-media)] bg-paper p-10 text-center shadow-[var(--shadow-ring)]">
                <p className="t-h2">Nothing here right now.</p>
                <p className="t-body mt-2 text-stone">New events go up most weeks. Try everything, or check back Monday.</p>
                <button onClick={() => setF("all")} className="mt-6 h-11 rounded-full bg-ink px-5 font-medium text-paper">
                  Show everything
                </button>
              </div>
            </div>
          ) : (
            <div className="frame mt-8 grid gap-x-[var(--col-gap)] gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {lead && (
                <div className="sm:col-span-2 lg:row-span-2">
                  <p className="t-meta mb-3">Next up · {fmtLongDay(lead.startsAt)}</p>
                  <EventCard e={lead} size="lg" />
                </div>
              )}
              {rest.map((e) => (
                <div key={e.slug}>
                  <p className="t-meta mb-3">{fmtLongDay(e.startsAt)}</p>
                  <EventCard e={e} />
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
