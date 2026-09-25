"use client";

import type { ClassSession } from "@/lib/data/types";
import { actions } from "@/lib/store";
import { useTenant } from "@/lib/tenants/client";
import { addMin, fmtLongDay, fmtRange } from "@/lib/time";
import Image from "@/components/ui/SmoothImage";
import { Icon } from "@/components/ui/Icon";
import { Pill } from "@/components/ui/Pill";
import { Sheet } from "@/components/ui/Sheet";
import { ClassAction, useClassState } from "./ClassAction";

export function Intensity({ n }: { n: 1 | 2 | 3 }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Intensity ${n} of 3`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={`h-2.5 w-1 rounded-full ${i <= n ? "bg-ink" : "bg-line-2"}`} style={{ height: 6 + i * 3 }} />
      ))}
    </span>
  );
}

function Body({ c, resumed }: { c: ClassSession; resumed?: boolean }) {
  const tenant = useTenant();
  const t = tenant.template(c.kind);
  const coach = tenant.person(c.coachId);
  const fit = tenant.fitness!;
  const st = useClassState(c);
  const pct = Math.min(100, (st.taken / st.cap) * 100);

  return (
    <div>
      <div className="relative aspect-[16/10] overflow-hidden rounded-[var(--radius-card)] bg-fog">
        <Image src={t.image.src} alt={t.image.alt} fill sizes="520px" className="object-cover" style={{ objectPosition: t.image.pos }} />
      </div>

      {resumed && st.state !== "reserved" && (
        <p className="t-small mt-4 flex items-center gap-2 rounded-2xl bg-ok-soft px-4 py-3 text-ok">
          <Icon name="check" size={16} strokeWidth={2.2} />
          You&apos;re signed in. Here&apos;s the class you picked.
        </p>
      )}

      <div className="mt-5 flex items-start justify-between gap-4">
        <div>
          <p className="t-meta">
            {fmtLongDay(c.startsAt)} · {fmtRange(c.startsAt, addMin(c.startsAt, t.durationMin))}
          </p>
          <h3 className="t-h2 mt-1">{t.name}</h3>
        </div>
        <Intensity n={t.intensity} />
      </div>
      <p className="t-body mt-3 text-stone">{t.summary}</p>

      <div className="mt-6 rounded-[var(--radius-card)] bg-paper p-4 shadow-[var(--shadow-ring)]">
        <div className="flex items-baseline justify-between">
          <p className="font-medium">{st.left > 0 ? `${st.left} of ${st.cap} spots left` : "Class is full"}</p>
          {st.left === 0 && c.waitlist > 0 && <span className="t-meta">{c.waitlist} on the waitlist</span>}
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-fog">
          <div className={`h-full rounded-full transition-[width] duration-700 ${st.left === 0 ? "bg-accent" : "bg-ink"}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-4">
        <div>
          <dt className="t-meta">Coach</dt>
          <dd className="mt-1 flex items-center gap-2 font-medium">
            <span className="grid size-7 place-items-center rounded-full bg-ink text-[0.6875rem] font-semibold text-paper">{coach.initials}</span>
            {coach.name}
          </dd>
        </div>
        <div>
          <dt className="t-meta">Where</dt>
          <dd className="mt-1 font-medium">
            {t.studio} · L{fit.level}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="t-meta">Bring</dt>
          <dd className="mt-1">{t.bring.join(" · ")}</dd>
        </div>
      </dl>

      {st.state === "access" && (
        <div className="mt-6 rounded-[var(--radius-card)] bg-accent-soft p-4 text-accent-deep">
          <p className="font-medium">Classes are part of {fit.name}</p>
          <p className="t-small mt-1">Your building access covers rooms and events. Add a fitness membership to reserve classes, then come right back here.</p>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Pill tone="hold">Sample policy</Pill>
        <span className="t-meta">Free cancellation up to 2 hours before. Late cancels count as a visit.</span>
      </div>
      {st.state === "reserved" && st.commitmentId && (
        <button
          onClick={() => actions.cancel(st.commitmentId!)}
          className="mt-5 text-[0.9375rem] font-medium text-accent underline decoration-accent/30 underline-offset-4 hover:decoration-accent"
        >
          Cancel my spot
        </button>
      )}
      {st.state === "waitlisted" && st.commitmentId && (
        <button
          onClick={() => actions.cancel(st.commitmentId!)}
          className="mt-5 text-[0.9375rem] font-medium text-accent underline decoration-accent/30 underline-offset-4 hover:decoration-accent"
        >
          Leave the waitlist
        </button>
      )}
    </div>
  );
}

export function ClassSheet({ c, onClose, returnTo, resumed }: { c: ClassSession | null; onClose: () => void; returnTo: string; resumed?: boolean }) {
  return (
    <Sheet open={!!c} onClose={onClose} title="Class details" footer={c && <ClassAction c={c} size="lg" className="w-full" returnTo={returnTo} />}>
      {c && <Body c={c} resumed={resumed} />}
    </Sheet>
  );
}
