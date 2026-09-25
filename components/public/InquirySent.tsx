"use client";

import { motion, useReducedMotion } from "motion/react";
import Image from "@/components/ui/SmoothImage";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDemo, useHydrated } from "@/lib/store";
import { useTenant } from "@/lib/tenants/client";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export function InquirySent() {
  const id = useSearchParams().get("id");
  const s = useDemo();
  const hydrated = useHydrated();
  const reduce = useReducedMotion();
  const inq = hydrated ? s.inquiries.find((i) => i.id === id) : undefined;
  const { venues, lead: host } = useTenant();
  const v = venues.find((x) => x.slug === inq?.venue);

  if (hydrated && !inq) {
    return (
      <div className="frame flex min-h-[70svh] flex-col items-start justify-center pt-[var(--nav-h)]">
        <h1 className="t-h1">We couldn&apos;t find that inquiry.</h1>
        <p className="t-lead mt-4 text-stone">It may have been cleared by a demo reset.</p>
        <ButtonLink href="/venues/inquire" className="mt-8" icon="arrow-right">
          Start a new inquiry
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="pb-24 pt-[calc(var(--nav-h)+24px)] lg:pb-36">
      <div className="frame">
        <div className="flex items-start gap-3 rounded-[var(--radius-card)] bg-hold-soft px-5 py-4 text-hold" role="note">
          <Icon name="info" size={20} className="mt-0.5 shrink-0" />
          <p className="t-small">
            <span className="font-semibold">This is a prototype.</span> Your inquiry was saved in this browser only. No message was sent and no one on the
            events team has received it.
          </p>
        </div>
      </div>

      <div className="frame grid-12 mt-14 gap-y-12 lg:mt-20">
        <div className="col-span-12 lg:col-span-6">
          <motion.span
            initial={reduce ? false : { scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
            className="grid size-16 place-items-center rounded-full bg-accent text-paper"
          >
            <Icon name="check" size={30} strokeWidth={2} />
          </motion.span>
          <h1 className="t-hero mt-8">Thank you{inq ? `, ${inq.firstName}` : ""}.</h1>
          <p className="t-lead mt-5 max-w-[42ch] text-stone">
            In the real product, this is where {host.name.split(" ")[0]} and the events team would pick it up. Here&apos;s what would happen next.
          </p>

          <ol className="mt-10 space-y-0">
            {[
              { t: "Within one business day", d: `A reply to ${inq?.email ?? "your email"} with options and a few times to talk.` },
              { t: "A short call", d: "Fifteen minutes on the shape of the evening, catering and budget." },
              { t: "Walk the space", d: v ? `A visit to ${v.name} at the hour your event would happen.` : "A visit to the spaces that fit best." },
              { t: "A hold, if it fits", d: "We hold your date for 7 days while you decide. Nothing is reserved until then." },
            ].map((x, i) => (
              <li key={x.t} className="relative flex gap-5 pb-8 last:pb-0">
                <span className="relative z-10 grid size-8 shrink-0 place-items-center rounded-full bg-paper text-[0.8125rem] font-semibold tabular-nums shadow-[var(--shadow-ring)]">
                  {i + 1}
                </span>
                {i < 3 && <span className="absolute left-4 top-8 h-full w-px bg-line" aria-hidden />}
                <div className="pt-1">
                  <p className="font-medium">{x.t}</p>
                  <p className="t-small mt-1 text-stone">{x.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="col-span-12 lg:col-span-5 lg:col-start-8">
          <div className="card overflow-hidden">
            {v && (
              <div className="relative aspect-[16/10]">
                <Image src={v.hero.src} alt={v.hero.alt} fill sizes="40vw" className="object-cover" style={{ objectPosition: v.hero.pos }} />
              </div>
            )}
            <dl className="divide-y divide-line p-6">
              {[
                ["Venue", v?.name ?? "Not sure yet"],
                ["Name", inq ? `${inq.firstName} ${inq.lastName}` : ""],
                ["Email", inq?.email ?? ""],
                ["Date", inq?.date ?? "Not specified"],
                ["Guests", inq?.guests ?? "Not specified"],
                ["Event type", inq?.eventType ?? "Not specified"],
              ].map(([k, val]) => (
                <div key={k} className="flex justify-between gap-6 py-3 first:pt-0 last:pb-0">
                  <dt className="t-small text-stone">{k}</dt>
                  <dd className="t-small text-right font-medium">{val}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            {v && (
              <ButtonLink href={`/venues/${v.slug}`} variant="outline">
                Back to {v.name}
              </ButtonLink>
            )}
            <ButtonLink href="/venues" variant="ghost">
              All venues
            </ButtonLink>
          </div>
          <p className="t-meta mt-6">
            Questions in the meantime?{" "}
            <Link href="/venues" className="underline underline-offset-2">
              Call the concierge
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
