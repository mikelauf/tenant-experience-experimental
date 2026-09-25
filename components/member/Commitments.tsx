"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { commitmentHref, kindLabel } from "@/lib/commit";
import type { Commitment } from "@/lib/data/types";
import { actions } from "@/lib/store";
import { fmtDay, fmtLongDay, fmtRange, until } from "@/lib/time";
import Image from "@/components/ui/SmoothImage";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { StatusPill } from "@/components/ui/Pill";
import { Sheet } from "@/components/ui/Sheet";
import { useTenant } from "@/lib/tenants/client";

export { useNow } from "@/lib/useNow";

export const isUpcoming = (c: Commitment, now = Date.now()) => c.status !== "cancelled" && new Date(c.endsAt).getTime() > now;

function downloadIcs(c: Commitment, where: string) {
  const f = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Playbook prototype//EN",
    "BEGIN:VEVENT",
    `UID:${c.id}@playbook.example`,
    `DTSTAMP:${f(new Date().toISOString())}`,
    `DTSTART:${f(c.startsAt)}`,
    `DTEND:${f(c.endsAt)}`,
    `SUMMARY:${c.title}`,
    `LOCATION:${c.place}, ${where}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  a.download = `${c.title.replace(/\s+/g, "-").toLowerCase()}.ics`;
  a.click();
  URL.revokeObjectURL(a.href);
}

const cancelVerb = (c: Commitment) =>
  c.status === "waitlist"
    ? "Leave waitlist"
    : c.status === "pending"
      ? "Withdraw request"
      : c.kind === "event"
        ? "Cancel RSVP"
        : c.kind === "inquiry"
          ? "Withdraw inquiry"
          : "Cancel booking";

export function CommitmentSheet({ c, onClose }: { c: Commitment | null; onClose: () => void }) {
  return (
    <Sheet open={!!c} onClose={onClose} title={c ? kindLabel[c.kind] : ""}>
      {c && <SheetBody key={c.id} c={c} onClose={onClose} />}
    </Sheet>
  );
}

/** Keyed by commitment, so the confirm step resets whenever a different one opens. */
function SheetBody({ c, onClose }: { c: Commitment; onClose: () => void }) {
  const tenant = useTenant();
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <div>
      {c.image && (
        <div className="relative aspect-[16/9] overflow-hidden rounded-[var(--radius-card)] bg-fog">
          <Image src={c.image.src} alt={c.image.alt} fill sizes="520px" className="object-cover" />
        </div>
      )}
      <div className="mt-5 flex items-start justify-between gap-4">
        <h3 className="t-h2">{c.title}</h3>
        <StatusPill status={done ? "cancelled" : c.status} pos={c.waitlistPos} className="mt-1 shrink-0" />
      </div>
      <dl className="mt-6 divide-y divide-line rounded-[var(--radius-card)] bg-paper px-4 shadow-[var(--shadow-ring)]">
        {[
          { i: "calendar" as const, k: "When", v: `${fmtLongDay(c.startsAt)} · ${fmtRange(c.startsAt, c.endsAt)}` },
          { i: "pin" as const, k: "Where", v: c.place },
          ...(c.detail ? [{ i: "info" as const, k: "Details", v: c.detail }] : []),
        ].map((r) => (
          <div key={r.k} className="flex items-start gap-3 py-3.5">
            <Icon name={r.i} size={18} className="mt-0.5 text-stone" />
            <dt className="sr-only">{r.k}</dt>
            <dd className="t-small">{r.v}</dd>
          </div>
        ))}
      </dl>

      {c.status === "pending" && (
        <p className="t-small mt-4 rounded-2xl bg-hold-soft p-4 text-hold">
          {c.kind === "inquiry"
            ? `${tenant.lead.name.split(" ")[0]}'s team will reply within one business day (sample timing).`
            : "Our events team approves requests for this room, usually within a few hours (sample behavior)."}
        </p>
      )}
      {c.status === "waitlist" && (
        <p className="t-small mt-4 rounded-2xl bg-accent-soft p-4 text-accent-deep">
          You&apos;re #{c.waitlistPos} in line. If a spot opens, we&apos;ll book you automatically and send a note.
        </p>
      )}

      <AnimatePresence mode="wait" initial={false}>
        {done ? (
          <motion.div key="done" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-6 flex items-center gap-3 rounded-2xl bg-fog p-4">
            <Icon name="check" size={18} />
            <p className="t-small">Done. It&apos;s been removed from your upcoming plans.</p>
          </motion.div>
        ) : confirming ? (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-6 rounded-2xl bg-paper p-4 shadow-[var(--shadow-ring)]"
          >
            <p className="font-medium">{cancelVerb(c)}?</p>
            <p className="t-small mt-1 text-stone">
              {c.kind === "class" && c.status === "confirmed"
                ? "Cancelling more than 2 hours ahead is free (sample policy). Your spot goes to the waitlist."
                : "You can always book again if it's still available."}
            </p>
            <div className="mt-4 flex gap-2">
              <Button
                variant="accent"
                size="sm"
                onClick={() => {
                  actions.cancel(c.id);
                  setDone(true);
                }}
              >
                Yes, {cancelVerb(c).toLowerCase()}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                Keep it
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-6 grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              iconLeft="calendar"
              onClick={() => downloadIcs(c, `${tenant.building.address}, ${tenant.building.city}`)}
              disabled={c.status === "cancelled"}
            >
              Add to calendar
            </Button>
            <Link
              href={commitmentHref(c)}
              onClick={onClose}
              className="flex h-11 items-center justify-center gap-2 rounded-full text-[0.9375rem] font-medium shadow-[inset_0_0_0_1px_currentColor] hover:bg-ink/5"
            >
              View details
            </Link>
            {c.status !== "cancelled" && (
              <button
                onClick={() => setConfirming(true)}
                className="col-span-2 mt-2 h-11 rounded-full text-[0.9375rem] font-medium text-accent hover:bg-accent-soft"
              >
                {cancelVerb(c)}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Compact row used in lists (Plans, Home "later this week") */
export function CommitmentRow({ c, onOpen, now, className }: { c: Commitment; onOpen: (c: Commitment) => void; now: number; className?: string }) {
  const past = new Date(c.endsAt).getTime() < now;
  return (
    <button
      onClick={() => onOpen(c)}
      className={cn(
        "group flex w-full items-center gap-4 rounded-[var(--radius-card)] bg-paper p-2.5 pr-4 text-left shadow-[var(--shadow-ring)] transition-[box-shadow,transform] duration-300 hover:shadow-[var(--shadow-soft)] active:scale-[0.99]",
        (c.status === "cancelled" || past) && "opacity-60",
        className,
      )}
    >
      <span className="relative size-[72px] shrink-0 overflow-hidden rounded-xl bg-fog">
        {c.image && <Image src={c.image.src} alt="" fill sizes="72px" className="object-cover" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="t-meta block">
          {fmtDay(c.startsAt)} · {fmtRange(c.startsAt, c.endsAt)}
        </span>
        <span className={cn("mt-0.5 block truncate font-medium", c.status === "cancelled" && "line-through decoration-stone-2")}>{c.title}</span>
        <span className="t-meta block truncate">{c.place}</span>
      </span>
      <span className="hidden flex-col items-end gap-1.5 sm:flex">
        <StatusPill status={c.status} pos={c.waitlistPos} />
        {!past && c.status !== "cancelled" && <span className="t-meta tabular">{until(c.startsAt, now)}</span>}
      </span>
      <Icon name="chevron-right" size={18} className="shrink-0 text-stone-2 transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

/** Flighty/Delta-style "up next" with a live countdown */
export function UpNext({ c, now, onOpen }: { c: Commitment; now: number; onOpen: (c: Commitment) => void }) {
  const ms = new Date(c.startsAt).getTime() - now;
  const h = Math.max(0, Math.floor(ms / 3600000));
  const m = Math.max(0, Math.floor((ms % 3600000) / 60000));
  const d = Math.floor(h / 24);
  const live = ms <= 0;

  return (
    <article className="theme-night relative grid overflow-hidden rounded-[var(--radius-media)] sm:grid-cols-[1.1fr_1fr]">
      <div className="relative order-2 flex flex-col justify-between gap-8 p-6 sm:order-1 sm:p-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-accent-glow animate-live" />
            <span className="t-meta">Up next · {kindLabel[c.kind]}</span>
          </div>
          <h3 className="t-h1 mt-4">{c.title}</h3>
          <p className="t-body mt-2 text-moon-2">
            {fmtDay(c.startsAt)} · {fmtRange(c.startsAt, c.endsAt)} · {c.place}
          </p>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div aria-label={live ? "Happening now" : `Starts ${until(c.startsAt, now)}`}>
            <p className="t-meta">{live ? "Happening now" : "Starts in"}</p>
            {!live && (
              <p className="t-num mt-1 flex items-baseline gap-3 text-[clamp(2.75rem,2rem+2.5vw,4.25rem)] font-medium leading-none">
                {d > 0 ? (
                  <>
                    <span>
                      {d}
                      <span className="ml-1 text-[0.35em] font-normal tracking-normal text-moon-2">{d === 1 ? "day" : "days"}</span>
                    </span>
                    <span>
                      {h % 24}
                      <span className="ml-1 text-[0.35em] font-normal tracking-normal text-moon-2">h</span>
                    </span>
                  </>
                ) : (
                  <>
                    <span>
                      {h}
                      <span className="ml-1 text-[0.35em] font-normal tracking-normal text-moon-2">h</span>
                    </span>
                    <span>
                      {String(m).padStart(2, "0")}
                      <span className="ml-1 text-[0.35em] font-normal tracking-normal text-moon-2">m</span>
                    </span>
                  </>
                )}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <StatusPill status={c.status} pos={c.waitlistPos} />
            <button
              onClick={() => onOpen(c)}
              className="h-10 rounded-full bg-moon px-4 text-[0.875rem] font-medium text-night transition-colors hover:bg-white"
            >
              Manage
            </button>
          </div>
        </div>
      </div>
      <div className="relative order-1 aspect-[16/9] sm:order-2 sm:aspect-auto">
        {c.image && <Image src={c.image.src} alt={c.image.alt} fill sizes="(min-width:640px) 45vw, 100vw" className="object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-night/60 to-transparent sm:bg-gradient-to-r sm:from-night sm:via-night/10" />
      </div>
    </article>
  );
}
