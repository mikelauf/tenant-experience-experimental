"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { eventTypes, maxCap } from "@/lib/data/shared";
import { actions, useDemo, useHydrated } from "@/lib/store";
import { useTenant } from "@/lib/tenants/client";
import { Avatar } from "@/components/ui/Avatar";
import { at, addMin } from "@/lib/time";
import { LineReveal, Reveal } from "@/components/motion/Reveal";
import Image from "@/components/ui/SmoothImage";
import { ButtonLink } from "@/components/ui/Button";
import { Icon, type AnyIcon } from "@/components/ui/Icon";

const support: { icon: AnyIcon; t: string; d: string }[] = [
  { icon: "glass", t: "Food & drink", d: "Four partner caterers, from breakfast spreads to seated dinners, plus bar service." },
  { icon: "mic", t: "AV & production", d: "Mics, screens, streaming and a tech on site for the whole event." },
  { icon: "people", t: "Setup & staffing", d: "Furniture, signage, a check-in desk and hosts who know the building." },
];

export function PlanEvent() {
  const s = useDemo();
  const hydrated = useHydrated();
  const { lead: host, venues, copy, member: currentMember } = useTenant();
  const [v, setV] = useState({ venue: "unsure", date: "", guests: "", type: "", note: "" });
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);
  const signedOut = hydrated && s.persona === "signed-out";

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.note.trim() && !v.type) {
      setErr("Pick a type of event or add a line about it, so the team knows where to start.");
      return;
    }
    setErr("");
    const venueName = venues.find((x) => x.slug === v.venue)?.name ?? "Venue to be suggested";
    const start = v.date ? new Date(`${v.date}T17:00`).toISOString() : at(21, 17 * 60);
    actions.add(
      {
        kind: "inquiry",
        refId: `inq-${Date.now()}`,
        title: `${v.type || "Event"} inquiry · ${venueName}`,
        startsAt: start,
        endsAt: addMin(start, 180),
        place: venueName,
        status: "pending",
        detail: [v.guests && `${v.guests} guests`, v.date ? "Preferred date" : "Date flexible", v.note].filter(Boolean).join(" · "),
        image: venues.find((x) => x.slug === v.venue)?.hero ?? copy.spaces.planImg,
      },
      { title: "Inquiry saved to your plans", body: "Simulated. Nothing was sent to the team.", href: "/plans" },
    );
    setSent(true);
  };

  return (
    <div className="pb-tab lg:pb-28">
      <section data-nav-over className="theme-night relative flex min-h-[80svh] flex-col justify-end overflow-hidden">
        <Image
          src={copy.spaces.planHero.src}
          alt={copy.spaces.planHero.alt}
          fill
          priority
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition: "50% 40%" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-night via-night/40 to-night/20" />
        <div className="frame relative pb-12 pt-40 lg:pb-16">
          <Link href="/spaces" className="t-small inline-flex items-center gap-1.5 text-moon/80 hover:text-moon">
            <Icon name="arrow-left" size={16} /> Spaces
          </Link>
          <LineReveal as="h1" className="t-mega mt-6 max-w-[12ch]" lines={["Bigger than", "a meeting?"]} />
          <Reveal delay={0.3}>
            <p className="t-lead mt-6 max-w-[46ch] text-moon/85">
              For receptions, offsites and team dinners, you tell us the shape of it and our events team plans the rest with you. There&apos;s no booking widget
              for this, and that&apos;s on purpose.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="frame mt-16 grid gap-3 sm:grid-cols-3 lg:mt-24">
        {support.map((x, i) => (
          <Reveal key={x.t} delay={i * 0.06}>
            <div className="card h-full p-6">
              <span className="grid size-11 place-items-center rounded-2xl bg-fog">
                <Icon name={x.icon} size={21} />
              </span>
              <p className="t-h3 mt-8">{x.t}</p>
              <p className="t-small mt-2 text-stone">{x.d}</p>
            </div>
          </Reveal>
        ))}
      </section>

      <section className="frame mt-24 grid-12 gap-y-10 lg:mt-32">
        <div className="col-span-12 lg:col-span-5">
          <h2 className="t-h1">Where it could happen</h2>
          <ul className="mt-8 space-y-3">
            {venues.map((x) => (
              <li key={x.slug}>
                <Link href={`/venues/${x.slug}`} className="card group flex items-center gap-4 p-3 pr-5 hover:shadow-[var(--shadow-soft)]">
                  <span className="relative size-20 shrink-0 overflow-hidden rounded-xl">
                    <Image src={x.hero.src} alt="" fill sizes="80px" className="object-cover" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{x.name}</span>
                    <span className="t-meta block">
                      {x.levelLabel} · up to {maxCap(x)}
                    </span>
                  </span>
                  <Icon
                    name="arrow-up-right"
                    size={18}
                    className="text-stone-2 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex items-center gap-4">
            <Avatar p={host} size={56} />
            <p className="t-small text-stone">
              <span className="font-medium text-ink">{host.name}</span> leads events at {copy.the}. Members get the same team and partners as outside
              organizers, with building rates (sample).
            </p>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-6 lg:col-start-7">
          <div className="rounded-[var(--radius-media)] bg-paper p-6 shadow-[var(--shadow-soft)] sm:p-8">
            {sent ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <span className="grid size-14 place-items-center rounded-full bg-hold text-paper">
                  <Icon name="clock" size={24} />
                </span>
                <p className="t-h2 mt-6">It&apos;s with the events team.</p>
                <p className="t-body mt-2 text-stone">
                  In the real product, {host.name.split(" ")[0]} would reply within a business day. Here, it&apos;s saved to your plans as &ldquo;Awaiting
                  approval&rdquo; so you can see how it&apos;s tracked. Nothing was sent.
                </p>
                <div className="mt-8 flex flex-wrap gap-2">
                  <ButtonLink href="/plans" icon="arrow-right">
                    See it in your plans
                  </ButtonLink>
                  <button onClick={() => setSent(false)} className="h-11 rounded-full px-5 font-medium hover:bg-ink/5">
                    Start another
                  </button>
                </div>
              </motion.div>
            ) : signedOut ? (
              <div>
                <p className="t-h2">Sign in to start planning</p>
                <p className="t-body mt-2 text-stone">We&apos;ll fill in your company and contact details for you.</p>
                <ButtonLink href="/sign-in?returnTo=%2Fspaces%2Fplan-an-event" className="mt-6" icon="arrow-right">
                  Sign in
                </ButtonLink>
                <p className="t-small mt-6 text-stone">
                  Not in the building?{" "}
                  <Link href="/venues/inquire" className="underline underline-offset-4">
                    Use the public inquiry form
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <form onSubmit={send} noValidate>
                <p className="t-h2">Tell us about it</p>
                <p className="t-small mt-1 text-stone">
                  From {currentMember.first} {currentMember.last} · {currentMember.company}
                </p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="mb-2 block text-[0.9375rem] font-medium">Venue</span>
                    <select className="field" value={v.venue} onChange={(e) => setV({ ...v, venue: e.target.value })}>
                      <option value="unsure">Not sure yet, suggest one</option>
                      {venues.map((x) => (
                        <option key={x.slug} value={x.slug}>
                          {x.name} (up to {maxCap(x)})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-[0.9375rem] font-medium">Date</span>
                    <input type="date" className="field" value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-[0.9375rem] font-medium">Guests</span>
                    <input
                      inputMode="numeric"
                      className="field tabular"
                      placeholder="e.g. 60"
                      value={v.guests}
                      onChange={(e) => setV({ ...v, guests: e.target.value.replace(/\D/g, "") })}
                    />
                  </label>
                </div>
                <p className="mb-3 mt-6 text-[0.9375rem] font-medium">Type of event</p>
                <div className="flex flex-wrap gap-2">
                  {eventTypes.map((t) => (
                    <button
                      type="button"
                      key={t}
                      aria-pressed={v.type === t}
                      onClick={() => setV({ ...v, type: v.type === t ? "" : t })}
                      className={cn(
                        "h-10 rounded-full px-4 text-[0.875rem] font-medium transition-colors",
                        v.type === t ? "bg-ink text-paper" : "bg-quartz text-ink-2 hover:bg-fog",
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <label className="mt-6 block">
                  <span className="mb-2 block text-[0.9375rem] font-medium">The short version</span>
                  <textarea
                    rows={4}
                    className="field resize-y"
                    placeholder="What's the occasion, and what would make it great?"
                    value={v.note}
                    onChange={(e) => setV({ ...v, note: e.target.value })}
                    aria-invalid={!!err}
                    aria-describedby={err ? "plan-err" : undefined}
                  />
                </label>
                {err && (
                  <p id="plan-err" role="alert" className="t-small mt-2 flex items-center gap-1.5 text-accent">
                    <Icon name="alert" size={16} />
                    {err}
                  </p>
                )}
                <button
                  type="submit"
                  className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-accent font-medium text-paper transition-colors hover:bg-accent-deep"
                >
                  Send to the events team <Icon name="arrow-right" size={18} />
                </button>
                <p className="t-meta mt-3 text-center">Simulated. This saves to your plans; nothing is sent.</p>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
