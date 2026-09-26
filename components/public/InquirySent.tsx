"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import Image from "@/components/ui/SmoothImage";
import { useSearchParams } from "next/navigation";
import { useTenant } from "@/lib/tenants/client";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

/**
 * After an accepted inquiry. The URL carries only Core's reference and the venue slug;
 * no contact details are kept in the browser or the address bar.
 */
export function InquirySent() {
  const q = useSearchParams();
  const ref = q.get("ref");
  const preview = q.get("preview") === "1";
  const reduce = useReducedMotion();
  const { venues, publicHost: host, copy } = useTenant();
  const picked = (q.get("venue") ?? "").split(",");
  const chosen = venues.filter((x) => picked.includes(x.slug));
  const v = chosen[0];
  const faq = copy.public.faq?.slice(0, 3) ?? [];

  if (!ref) {
    return (
      <div className="frame flex min-h-[70svh] flex-col items-start justify-center pt-[var(--nav-h)]">
        <h1 className="t-h1">Nothing to show here.</h1>
        <p className="t-lead mt-4 text-stone">This page confirms an inquiry after you send one.</p>
        <ButtonLink href="/venues/inquire" className="mt-8" icon="arrow-right">
          Start an inquiry
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="pb-24 pt-[calc(var(--nav-h)+24px)] lg:pb-36">
      {preview && (
        <div className="frame">
          <div className="flex items-start gap-3 rounded-[var(--radius-card)] bg-hold-soft px-5 py-4 text-hold" role="note">
            <Icon name="info" size={20} className="mt-0.5 shrink-0" />
            <p className="t-small">
              <span className="font-semibold">Preview only.</span> Your inquiry was checked but not sent, so no one on the events team has received it.
            </p>
          </div>
        </div>
      )}

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
          <h1 className="t-hero mt-8">{preview ? "Preview complete." : "Inquiry received."}</h1>
          <p className="t-lead mt-5 max-w-[42ch] text-stone">
            {preview
              ? "On the live site, the events team would now follow up by email."
              : `${host ? `${host.name.split(" ")[0]} and the events team` : "The events team"} will follow up by email. Keep this reference if you need to get in touch about it.`}
          </p>
          <p className="mt-6 inline-flex items-center gap-3 rounded-full bg-paper px-4 py-2 shadow-[var(--shadow-ring)]">
            <span className="t-meta">Reference</span>
            <span className="t-num font-medium">{ref}</span>
          </p>

          <ol className="mt-12 space-y-0">
            {[
              { t: "A reply", d: "The events team follows up at the email you gave." },
              { t: "A conversation", d: "Dates, setup, catering and services for your event." },
              {
                t: "A site visit, if you'd like one",
                d: chosen.length === 1 ? `Ask to see ${v.name} in person.` : "Ask to see the venues that fit best.",
              },
              { t: "Nothing reserved until you agree", d: "An inquiry doesn't reserve a venue or confirm availability." },
            ].map((x, i, all) => (
              <li key={x.t} className="relative flex gap-5 pb-8 last:pb-0">
                <span className="relative z-10 grid size-8 shrink-0 place-items-center rounded-full bg-paper text-[0.8125rem] font-semibold tabular-nums shadow-[var(--shadow-ring)]">
                  {i + 1}
                </span>
                {i < all.length - 1 && <span className="absolute left-4 top-8 h-full w-px bg-line" aria-hidden />}
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
            {v ? (
              <div className="relative aspect-[16/10]">
                <Image src={v.hero.src} alt={v.hero.alt} fill sizes="40vw" className="object-cover" style={{ objectPosition: v.hero.pos }} />
              </div>
            ) : null}
            <div className="p-6">
              <p className="t-meta">{chosen.length > 1 ? "Venues" : "Venue"}</p>
              <p className="t-h3 mt-1">{chosen.length ? chosen.map((x) => x.name).join(", ") : "Not sure yet"}</p>
              {chosen.length === 1 && <p className="t-small mt-1 text-stone">{v.levelLabel}</p>}
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            {chosen.length === 1 && (
              <ButtonLink href={`/venues/${v.slug}`} variant="outline">
                Back to {v.name}
              </ButtonLink>
            )}
            <ButtonLink href="/venues" variant="ghost">
              All venues
            </ButtonLink>
          </div>
        </div>
      </div>

      {faq.length > 0 && (
        <section className="frame mt-24 border-t hairline pt-14 lg:mt-32" aria-labelledby="wait-h">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="t-meta">While you wait</p>
              <h2 id="wait-h" className="t-h1 mt-2">
                Answers to common questions
              </h2>
            </div>
            <Link href="/venues/faq" className="group inline-flex items-center gap-2 border-b border-ink/25 pb-0.5 font-medium hover:border-ink">
              All questions
              <Icon name="arrow-right" size={17} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <ul className="mt-10 grid gap-8 md:grid-cols-3">
            {faq.map((f) => (
              <li key={f.q} className="border-t hairline pt-5">
                <p className="t-h3">{f.q}</p>
                <p className="t-body mt-2 text-stone">{f.a}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}