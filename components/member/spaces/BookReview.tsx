"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { bookRoom } from "@/lib/commit";
import { setupLabels } from "@/lib/data/shared";
import type { Setup } from "@/lib/data/types";
import { useDemo, useHydrated } from "@/lib/store";
import { useTenant } from "@/lib/tenants/client";
import { dayKey, fmtLongDay, fmtTime, week } from "@/lib/time";
import Image from "@/components/ui/SmoothImage";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Pill } from "@/components/ui/Pill";
import { isBusy } from "./Availability";

/** Airbnb "Review and continue", then an in-place confirmation. */
export function BookReview({ slug }: { slug: string }) {
  const { room, member: currentMember } = useTenant();
  const r = room(slug)!;
  const params = useSearchParams();
  const s = useDemo();
  const hydrated = useHydrated();
  const reduce = useReducedMotion();
  const days = useMemo(() => week(), []);
  const day = params.get("day") ?? dayKey(days[0]);
  const start = Number(params.get("start"));
  const dur = Number(params.get("dur") ?? 60);
  const setup = (params.get("setup") as Setup) ?? r.setups[0];
  const people = Number(params.get("people") ?? 2);
  const title = params.get("title") ?? "";
  const offset = days.findIndex((d) => dayKey(d) === day);
  const [stage, setStage] = useState<"review" | "working" | "done">("review");

  const d = days[offset] ?? days[0];
  const at = new Date(d);
  at.setMinutes(start);
  const iso = at.toISOString();
  const back = `/spaces/${r.slug}?${params.toString()}`;
  const invalid = !params.get("start") || offset < 0 || isBusy(r.slug, offset, start, start + dur);
  const request = r.approval === "request";

  if (hydrated && s.persona === "signed-out")
    return (
      <div className="frame flex min-h-[70svh] flex-col items-start justify-center pt-[var(--nav-h)]">
        <h1 className="t-h1">Sign in to finish booking.</h1>
        <ButtonLink href={`/sign-in?returnTo=${encodeURIComponent(`/spaces/${r.slug}/book?${params}`)}`} className="mt-6" icon="arrow-right">
          Sign in
        </ButtonLink>
      </div>
    );

  const confirm = async () => {
    setStage("working");
    await new Promise((res) => setTimeout(res, 900));
    bookRoom(r, iso, dur, `${setupLabels[setup]} · ${people} ${people === 1 ? "person" : "people"}${title ? ` · ${title}` : ""}`);
    setStage("done");
  };

  if (stage === "done")
    return (
      <div className="frame grid min-h-[80svh] items-center pb-tab pt-[calc(var(--nav-h)+24px)] lg:grid-cols-12 lg:gap-[var(--col-gap)]">
        <div className="lg:col-span-6">
          <motion.span
            initial={reduce ? false : { scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 17 }}
            className={`grid size-16 place-items-center rounded-full ${request ? "bg-hold text-paper" : "bg-ok text-paper"}`}
          >
            <Icon name={request ? "clock" : "check"} size={28} strokeWidth={2} />
          </motion.span>
          <h1 className="t-hero mt-8">{request ? "Request sent." : `${r.name} is yours.`}</h1>
          <p className="t-lead mt-4 max-w-[40ch] text-stone">
            {fmtLongDay(iso)}, {fmtTime(iso)}–{fmtTime(start + dur)}.{" "}
            {request
              ? "The events team will confirm, usually within a few hours (sample behavior)."
              : "It's in your plans, and your guests can find it on Level " + r.level + "."}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/plans" icon="arrow-right">
              View in your plans
            </ButtonLink>
            <ButtonLink href="/spaces" variant="ghost">
              Back to spaces
            </ButtonLink>
          </div>
        </div>
        <div className="media relative mt-12 hidden aspect-[4/3] lg:col-span-5 lg:col-start-8 lg:mt-0 lg:block">
          <Image src={r.image.src} alt={r.image.alt} fill sizes="40vw" className="object-cover" />
        </div>
      </div>
    );

  return (
    <div className="frame pb-tab pt-[calc(var(--nav-h)+32px)] lg:pb-28 lg:pt-[calc(var(--nav-h)+56px)]">
      <Link href={back} className="t-small inline-flex items-center gap-1.5 text-stone hover:text-ink">
        <Icon name="arrow-left" size={16} /> Back to {r.name}
      </Link>
      <div className="grid-12 mt-6 gap-y-10">
        <div className="col-span-12 lg:col-span-6">
          <h1 className="t-hero">{request ? "Review your request" : "Review and book"}</h1>
          <p className="t-lead mt-4 text-stone">
            Booking as {currentMember.first} {currentMember.last}, {currentMember.company}.
          </p>
          {request && (
            <p className="t-small mt-6 flex gap-2.5 rounded-2xl bg-hold-soft p-4 text-hold">
              <Icon name="info" size={18} className="shrink-0" />
              {r.name} is shared with the events team, so bookings are a request. You&apos;ll see it as &ldquo;Awaiting approval&rdquo; in your plans (sample
              behavior).
            </p>
          )}
          {invalid && (
            <p role="alert" className="t-small mt-6 flex gap-2.5 rounded-2xl bg-accent-soft p-4 text-accent-deep">
              <Icon name="alert" size={18} className="shrink-0" />
              That time isn&apos;t available anymore. Go back and choose another.
            </p>
          )}
        </div>

        <div className="col-span-12 lg:col-span-5 lg:col-start-8">
          <div className="card overflow-hidden shadow-[var(--shadow-soft)]">
            <div className="flex items-center gap-4 border-b hairline p-4">
              <span className="relative size-20 overflow-hidden rounded-xl">
                <Image src={r.image.src} alt="" fill sizes="80px" className="object-cover" />
              </span>
              <div>
                <p className="t-h3">{r.name}</p>
                <p className="t-meta">
                  Level {r.level} · Up to {r.capacity}
                </p>
                {!request && (
                  <Pill className="mt-2">
                    <Icon name="bolt" size={13} /> Confirms instantly
                  </Pill>
                )}
              </div>
            </div>
            <dl className="divide-y divide-line px-5">
              {[
                ["When", `${fmtLongDay(iso)}`, `${fmtTime(iso)}–${fmtTime(start + dur)}`],
                ["Setup", `${setupLabels[setup]} · ${people} ${people === 1 ? "person" : "people"}`, ""],
                ["Meeting", title || "Untitled", ""],
                ["Cost", "Included with your building access", "Sample terms"],
              ].map(([k, v, sub]) => (
                <div key={k} className="flex items-start justify-between gap-4 py-4">
                  <div>
                    <dt className="t-meta">{k}</dt>
                    <dd className="mt-0.5 font-medium">{v}</dd>
                    {sub && <dd className="t-small text-stone">{sub}</dd>}
                  </div>
                  {k !== "Cost" && (
                    <Link href={back} className="shrink-0 rounded-full bg-fog px-3 py-1.5 text-[0.8125rem] font-medium hover:bg-fog-2">
                      Change
                    </Link>
                  )}
                </div>
              ))}
            </dl>
            <div className="p-5 pt-2">
              <button
                onClick={confirm}
                disabled={invalid || stage === "working"}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-accent font-medium text-paper transition-colors hover:bg-accent-deep disabled:opacity-60"
              >
                {stage === "working" ? (
                  <>
                    <span className="size-4 keep-round animate-spin rounded-full border-2 border-paper/30 border-t-paper" /> {request ? "Sending…" : "Booking…"}
                  </>
                ) : request ? (
                  "Send request"
                ) : (
                  "Confirm booking"
                )}
              </button>
              <p className="t-meta mt-3 text-center">Cancel any time before the start from your plans.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
