"use client";

import Link from "next/link";
import { ViewTransition, useMemo } from "react";
import { rsvpEvent } from "@/lib/commit";
import { actions, findActive, useDemo, useHydrated } from "@/lib/store";
import { useTenant } from "@/lib/tenants/client";
import { addMin, fmtLongDay, fmtRange } from "@/lib/time";
import Image from "@/components/ui/SmoothImage";
import { Icon } from "@/components/ui/Icon";
import { Pill } from "@/components/ui/Pill";
import { EventCard, accessLabel, canAttend } from "../EventCard";

export function EventDetail({ slug }: { slug: string }) {
  const t = useTenant();
  const e = useMemo(() => t.eventBySlug(slug)!, [slug, t]);
  const s = useDemo();
  const hydrated = useHydrated();
  const mine = hydrated ? findActive(s, "event", e.slug) : undefined;
  const going = e.going + (mine?.status === "confirmed" ? 1 : 0);
  const full = e.going >= e.capacity;
  const host = t.person(e.hostId);
  const tag = accessLabel(e);
  const others = useMemo(
    () =>
      t
        .events()
        .filter((x) => x.slug !== slug)
        .slice(0, 3),
    [slug, t],
  );

  const action = (() => {
    const cls = "flex h-14 w-full items-center justify-center gap-2 rounded-full font-medium transition-colors";
    if (!hydrated) return <span className={`${cls} bg-fog`} />;
    if (s.persona === "signed-out")
      return (
        <Link href={`/sign-in?returnTo=${encodeURIComponent(`/programming/${e.slug}`)}`} className={`${cls} bg-ink text-paper hover:bg-ink-2`}>
          Sign in to RSVP
        </Link>
      );
    if (mine)
      return (
        <div className="space-y-2">
          <span className={`${cls} ${mine.status === "waitlist" ? "bg-accent-soft text-accent-deep" : "bg-ok-soft text-ok"}`}>
            <Icon name="check" size={18} strokeWidth={2.2} />
            {mine.status === "waitlist" ? `On the waitlist · #${mine.waitlistPos}` : "You're going"}
          </span>
          <button onClick={() => actions.cancel(mine.id)} className="h-11 w-full rounded-full text-[0.9375rem] font-medium text-accent hover:bg-accent-soft">
            {mine.status === "waitlist" ? "Leave waitlist" : "Can't make it? Cancel RSVP"}
          </button>
        </div>
      );
    if (!canAttend(e, t.member))
      return (
        <div className="rounded-[var(--radius-card)] bg-fog p-4">
          <p className="flex items-center gap-2 font-medium">
            <Icon name={e.access.type === "vip" ? "star" : "lock"} size={17} />
            {e.access.type === "vip" ? "This one's by invitation" : `Just for ${e.access.type === "company" ? e.access.company : ""}`}
          </p>
          <p className="t-small mt-1 text-stone">
            {e.access.type === "vip" ? "The concierge can add you to the list for the next one." : "It's hosted for a single company in the building."}
          </p>
          {e.access.type === "vip" && (
            <button
              onClick={() => actions.toast({ title: "Request sent to the concierge", body: "Simulated. No message was sent." })}
              className="mt-4 h-10 rounded-full bg-ink px-4 text-[0.875rem] font-medium text-paper"
            >
              Ask the concierge
            </button>
          )}
        </div>
      );
    return (
      <button
        onClick={() => rsvpEvent(e, full)}
        className={`${cls} ${full ? "bg-paper shadow-[inset_0_0_0_1px_var(--color-ink)] hover:bg-ink/5" : "bg-accent text-paper hover:bg-accent-deep"}`}
      >
        {full ? "Join the waitlist" : "RSVP"}
      </button>
    );
  })();

  return (
    <div className="pb-tab lg:pb-28">
      {/* Split hero: the photo keeps its native proportions instead of being stretched full-bleed */}
      <section data-nav-over className="theme-night relative overflow-hidden">
        <div className="frame grid gap-8 pb-10 pt-[calc(var(--nav-h)+24px)] lg:grid-cols-12 lg:gap-[var(--col-gap)] lg:pb-14 lg:pt-[calc(var(--nav-h)+40px)]">
          <div className="flex flex-col justify-end lg:order-1 lg:col-span-6 lg:min-h-[72svh] lg:pb-4">
            <Link href="/programming" className="t-small inline-flex items-center gap-1.5 self-start text-moon/80 hover:text-moon">
              <Icon name="arrow-left" size={16} /> All events
            </Link>
            <div className="mt-8 flex flex-wrap gap-2 lg:mt-auto">
              <Pill tone="night">{e.kicker}</Pill>
              {tag && (
                <Pill tone="night">
                  <Icon name={e.access.type === "vip" ? "star" : "lock"} size={13} />
                  {tag}
                </Pill>
              )}
            </div>
            <h1 className="t-hero mt-5 max-w-[14ch]">{e.name}</h1>
            <dl className="mt-8 grid max-w-[520px] grid-cols-3 gap-px overflow-hidden rounded-[18px] bg-night-line">
              {[
                { k: "Date", v: new Date(e.startsAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) },
                { k: "Time", v: fmtRange(e.startsAt, addMin(e.startsAt, e.durationMin)) },
                { k: "Where", v: e.place },
              ].map((x) => (
                <div key={x.k} className="bg-night-2 p-4">
                  <dt className="t-meta">{x.k}</dt>
                  <dd className="mt-1 text-[0.9375rem] font-medium">{x.v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-media)] sm:aspect-[16/11] lg:order-2 lg:col-span-6 lg:aspect-auto lg:min-h-[72svh]">
            <ViewTransition name={`event-${e.slug}`} share="morph" default="none">
              <div className="absolute inset-0">
                <Image
                  src={e.image.src}
                  alt={e.image.alt}
                  fill
                  priority
                  quality={90}
                  sizes="(min-width:1024px) 50vw, 100vw"
                  className="object-cover"
                  style={{ objectPosition: e.image.pos }}
                />
              </div>
            </ViewTransition>
          </div>
        </div>
      </section>

      <div className="frame grid-12 mt-12 gap-y-12 lg:mt-20">
        <div className="col-span-12 lg:col-span-7">
          <p className="t-h2 max-w-[28ch]">{e.summary}</p>
          <div className="mt-8 space-y-5">
            {e.body.map((p) => (
              <p key={p.slice(0, 20)} className="t-body max-w-[62ch] text-ink-2">
                {p}
              </p>
            ))}
          </div>
          <div className="mt-12 flex items-center gap-4 border-t hairline pt-8">
            <span className="grid size-12 place-items-center rounded-full bg-ink text-[0.875rem] font-semibold text-paper">{host.initials}</span>
            <div>
              <p className="font-medium">Hosted by {host.name}</p>
              <p className="t-meta">{host.role}</p>
            </div>
          </div>
        </div>

        <aside className="col-span-12 lg:col-span-4 lg:col-start-9">
          <div className="card sticky top-[calc(var(--nav-h)+20px)] p-6 shadow-[var(--shadow-soft)]">
            <div className="flex items-baseline justify-between">
              <p className="font-medium">{full && !mine ? "Full" : `${Math.max(0, e.capacity - going)} spots left`}</p>
              <p className="t-meta tabular">
                {going} of {e.capacity} going
              </p>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-fog">
              <div
                className={`h-full rounded-full transition-[width] duration-700 ${full ? "bg-accent" : "bg-ink"}`}
                style={{ width: `${Math.min(100, (going / e.capacity) * 100)}%` }}
              />
            </div>
            <dl className="t-small mt-6 space-y-3">
              <div className="flex gap-3">
                <Icon name="calendar" size={18} className="text-stone" />
                <dd>{fmtLongDay(e.startsAt)}</dd>
              </div>
              <div className="flex gap-3">
                <Icon name="clock" size={18} className="text-stone" />
                <dd>{fmtRange(e.startsAt, addMin(e.startsAt, e.durationMin))}</dd>
              </div>
              <div className="flex gap-3">
                <Icon name="pin" size={18} className="text-stone" />
                <dd>
                  {e.place}
                  {e.level ? ` · Level ${e.level}` : ` · ${t.levels.find((l) => l.n === 0)?.label ?? "Street"} level`}
                </dd>
              </div>
            </dl>
            <div className="mt-6">{action}</div>
          </div>
        </aside>
      </div>

      {others.length > 0 && (
        <section className="frame mt-24 border-t hairline pt-12">
          <h2 className="t-h2">More at {t.copy.the}</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {others.map((o) => (
              <EventCard key={o.slug} e={o} className="[&_.media]:aspect-[4/3]" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
