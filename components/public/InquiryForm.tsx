"use client";

import { images } from "@/lib/data/images";
import { AnimatePresence, motion } from "motion/react";
import Image from "@/components/ui/SmoothImage";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { person } from "@/lib/data/building";
import { budgets, eventTypes, maxCap, venues } from "@/lib/data/venues";
import { actions, useDemo, useHydrated } from "@/lib/store";
import { Icon } from "@/components/ui/Icon";

type Values = {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  phone: string;
  venue: string;
  date: string;
  flexible: boolean;
  guests: string;
  eventType: string;
  budget: string;
  message: string;
  privacy: boolean;
  news: boolean;
};

type Errors = Partial<Record<keyof Values, string>>;

const labels: Partial<Record<keyof Values, string>> = {
  firstName: "First name",
  lastName: "Last name",
  email: "Email",
  venue: "Venue preference",
  privacy: "Privacy acknowledgment",
  guests: "Guest count",
};

function validate(v: Values): Errors {
  const e: Errors = {};
  if (!v.firstName.trim()) e.firstName = "Add your first name.";
  if (!v.lastName.trim()) e.lastName = "Add your last name.";
  if (!v.email.trim()) e.email = "Add an email so we can reply.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) e.email = "That email doesn't look complete. Check for a missing @ or domain.";
  if (!v.venue) e.venue = "Pick a venue, or choose “Not sure yet”.";
  if (v.guests && (Number(v.guests) < 1 || !Number.isFinite(Number(v.guests)))) e.guests = "Use a number, like 80.";
  if (!v.privacy) e.privacy = "Please confirm you've read how we use your details.";
  return e;
}

function Field({
  id,
  label,
  optional,
  error,
  hint,
  children,
  className,
}: {
  id: string;
  label: string;
  optional?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 flex items-baseline justify-between text-[0.9375rem] font-medium">
        {label}
        {optional && <span className="t-meta font-normal">Optional</span>}
      </label>
      {children}
      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            id={`${id}-error`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="t-small flex items-start gap-1.5 overflow-hidden pt-2 text-redwood"
          >
            <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>
      {hint && !error && <p className="t-meta pt-2">{hint}</p>}
    </div>
  );
}

function Chips({ name, options, value, onChange }: { name: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div role="radiogroup" aria-label={name} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value === o;
        return (
          <button
            type="button"
            role="radio"
            aria-checked={on}
            key={o}
            onClick={() => onChange(on ? "" : o)}
            className={cn(
              "h-10 rounded-full px-4 text-[0.875rem] font-medium transition-[background-color,color,box-shadow] duration-200",
              on ? "bg-ink text-paper" : "bg-paper text-ink-2 shadow-[inset_0_0_0_1px_var(--color-line-2)] hover:shadow-[inset_0_0_0_1px_var(--color-stone-2)]",
            )}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

export function InquiryForm({ initial }: { initial: { venue?: string; guests?: string; date?: string } }) {
  const router = useRouter();
  const s = useDemo();
  const hydrated = useHydrated();
  const uid = useId();
  const summaryRef = useRef<HTMLDivElement>(null);
  const [v, setV] = useState<Values>({
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    phone: "",
    venue: initial.venue && (venues.some((x) => x.slug === initial.venue) || initial.venue === "unsure") ? initial.venue : "",
    date: initial.date ?? "",
    flexible: false,
    guests: initial.guests ?? "",
    eventType: "",
    budget: "",
    message: "",
    privacy: false,
    news: false,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [tried, setTried] = useState(false);
  const [sending, setSending] = useState(false);
  const [netError, setNetError] = useState(false);
  const [simulateFail, setSimulateFail] = useState(false);

  // No venue passed in? Fall back to the first one on the shortlist.
  const shortlist = hydrated ? s.shortlist : [];
  const venue = v.venue || shortlist[0] || "";

  const set = <K extends keyof Values>(k: K, val: Values[K]) => {
    setV((x) => {
      const next = { ...x, [k]: val };
      if (tried) setErrors(validate({ ...next, venue: next.venue || shortlist[0] || "" }));
      return next;
    });
  };

  const chosen = venues.find((x) => x.slug === venue);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    setNetError(false);
    const errs = validate({ ...v, venue });
    setErrors(errs);
    if (Object.keys(errs).length) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setSending(true);
    await new Promise((r) => setTimeout(r, 1100));
    if (simulateFail) {
      setSending(false);
      setNetError(true);
      setSimulateFail(false);
      return;
    }
    const id = actions.addInquiry({
      venue,
      firstName: v.firstName.trim(),
      lastName: v.lastName.trim(),
      email: v.email.trim(),
      guests: v.guests || undefined,
      date: v.date ? `${v.date}${v.flexible ? " (flexible)" : ""}` : v.flexible ? "Flexible" : undefined,
      eventType: v.eventType || undefined,
    });
    router.push(`/venues/inquire/sent?id=${id}`);
  };

  const id = (k: string) => `${uid}-${k}`;
  const invalid = (k: keyof Values) => (errors[k] ? { "aria-invalid": true as const, "aria-describedby": `${id(k)}-error` } : {});
  const errorList = Object.entries(errors) as [keyof Values, string][];
  const host = person("ines");

  return (
    <div className="grid-12 gap-y-10">
      {/* Summary: follows the venue you pick */}
      <aside className="col-span-12 lg:col-span-5">
        <div className="theme-night sticky top-[calc(var(--nav-h)+16px)] overflow-hidden rounded-[var(--radius-media)]">
          <div className="relative aspect-[5/4] lg:aspect-[4/3.4]">
            <AnimatePresence initial={false}>
              <motion.div
                key={chosen?.slug ?? "none"}
                className="absolute inset-0"
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              >
                <Image
                  src={chosen?.hero.src ?? images.aerialGolden.src}
                  alt=""
                  fill
                  sizes="(min-width:1024px) 40vw, 100vw"
                  className="object-cover"
                  style={{ objectPosition: chosen?.hero.pos ?? images.aerialGolden.pos }}
                />
              </motion.div>
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-night via-night/30 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6">
              <p className="t-meta">{chosen ? `${chosen.levelLabel} · up to ${maxCap(chosen)} guests` : "Any of our three venues"}</p>
              <p className="t-h2 mt-1">{chosen ? chosen.name : venue === "unsure" ? "We'll suggest the right room" : "Choose a venue"}</p>
            </div>
          </div>
          <div className="p-6">
            <p className="font-medium">What happens next</p>
            <ol className="mt-4 space-y-4">
              {[
                "A person on our events team reads your note.",
                "We reply within one business day with options and a call time.",
                "If it's a fit, we hold your date while you decide.",
              ].map((t, i) => (
                <li key={t} className="flex gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-night-3 text-[0.75rem] font-semibold tabular-nums text-moon">
                    {i + 1}
                  </span>
                  <span className="t-small text-moon-2">{t}</span>
                </li>
              ))}
            </ol>
            <div className="mt-6 flex items-center gap-3 border-t hairline pt-5">
              <span className="relative size-10 overflow-hidden rounded-full">
                <Image src={host.image!.src} alt="" fill sizes="40px" className="object-cover" style={{ objectPosition: "50% 25%" }} />
              </span>
              <p className="t-small text-moon-2">
                <span className="text-moon">{host.name}</span> and team usually reply by the next morning.
              </p>
            </div>
          </div>
        </div>
      </aside>

      <form
        noValidate
        onSubmit={submit}
        className="col-span-12 lg:col-span-6 lg:col-start-7"
        aria-describedby={errorList.length ? `${uid}-summary` : undefined}
      >
        <AnimatePresence>
          {errorList.length > 0 && (
            <motion.div
              ref={summaryRef}
              tabIndex={-1}
              id={`${uid}-summary`}
              role="alert"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-10 rounded-[var(--radius-card)] bg-redwood-soft p-5 text-redwood-deep outline-none focus-visible:outline-2"
            >
              <p className="font-medium">A few things need a look. Everything you entered is still here.</p>
              <ul className="t-small mt-2 space-y-1">
                {errorList.map(([k]) => (
                  <li key={k}>
                    <a href={`#${id(k)}`} className="underline underline-offset-2">
                      {labels[k] ?? k}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        <fieldset>
          <legend className="t-h2">About you</legend>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <Field id={id("firstName")} label="First name" error={errors.firstName}>
              <input
                id={id("firstName")}
                className="field"
                autoComplete="given-name"
                value={v.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                {...invalid("firstName")}
              />
            </Field>
            <Field id={id("lastName")} label="Last name" error={errors.lastName}>
              <input
                id={id("lastName")}
                className="field"
                autoComplete="family-name"
                value={v.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                {...invalid("lastName")}
              />
            </Field>
            <Field id={id("email")} label="Email" error={errors.email} className="sm:col-span-2">
              <input
                id={id("email")}
                type="email"
                inputMode="email"
                className="field"
                autoComplete="email"
                value={v.email}
                onChange={(e) => set("email", e.target.value)}
                {...invalid("email")}
              />
            </Field>
            <Field id={id("company")} label="Company" optional>
              <input id={id("company")} className="field" autoComplete="organization" value={v.company} onChange={(e) => set("company", e.target.value)} />
            </Field>
            <Field id={id("phone")} label="Phone" optional>
              <input id={id("phone")} type="tel" className="field" autoComplete="tel" value={v.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
          </div>
        </fieldset>

        <fieldset className="mt-14" aria-describedby={errors.venue ? `${id("venue")}-error` : undefined}>
          <legend className="t-h2" id={id("venue")} tabIndex={-1}>
            Where are you thinking?
          </legend>
          <div role="radiogroup" aria-label="Venue preference" className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              ...venues.map((x) => ({ slug: x.slug, name: x.name, meta: `${x.levelLabel} · up to ${maxCap(x)}`, img: x.hero })),
              { slug: "unsure", name: "Not sure yet", meta: "We'll recommend one", img: null },
            ].map((o) => {
              const on = venue === o.slug;
              const saved = shortlist.includes(o.slug);
              return (
                <button
                  type="button"
                  role="radio"
                  aria-checked={on}
                  key={o.slug}
                  onClick={() => set("venue", o.slug)}
                  className={cn(
                    "relative flex items-center gap-4 rounded-[var(--radius-card)] bg-paper p-2.5 pr-4 text-left transition-[box-shadow] duration-200",
                    on
                      ? "shadow-[inset_0_0_0_2px_var(--color-ink)]"
                      : errors.venue
                        ? "shadow-[inset_0_0_0_1.5px_var(--color-redwood)]"
                        : "shadow-[inset_0_0_0_1px_var(--color-line-2)] hover:shadow-[inset_0_0_0_1px_var(--color-stone-2)]",
                  )}
                >
                  <span className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-fog">
                    {o.img ? (
                      <Image src={o.img.src} alt="" fill sizes="64px" className="object-cover" />
                    ) : (
                      <Icon name="sliders" size={22} className="text-stone" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{o.name}</span>
                    <span className="t-meta block">{o.meta}</span>
                  </span>
                  {saved && <Icon name="heart-fill" size={16} className="text-redwood" />}
                  <span
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-full border transition-colors",
                      on ? "border-ink bg-ink text-paper" : "border-line-2",
                    )}
                  >
                    {on && <Icon name="check" size={12} strokeWidth={2.5} />}
                  </span>
                </button>
              );
            })}
          </div>
          <AnimatePresence>
            {errors.venue && (
              <motion.p
                id={`${id("venue")}-error`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="t-small flex items-center gap-1.5 pt-3 text-redwood"
              >
                <Icon name="alert" size={16} />
                {errors.venue}
              </motion.p>
            )}
          </AnimatePresence>
          {shortlist.length > 1 && (
            <p className="t-meta mt-3">Your shortlist is marked with a heart. Mention the others in your message and we&apos;ll compare them for you.</p>
          )}
        </fieldset>

        <fieldset className="mt-14">
          <legend className="t-h2">The event</legend>
          <p className="t-small mt-1 text-stone">All optional, but it helps us come back with something useful.</p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <Field id={id("date")} label="Preferred date" optional>
              <input id={id("date")} type="date" className="field" value={v.date} onChange={(e) => set("date", e.target.value)} />
              <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-[0.9375rem]">
                <input
                  type="checkbox"
                  checked={v.flexible}
                  onChange={(e) => set("flexible", e.target.checked)}
                  className="size-[18px] accent-[var(--color-ink)]"
                />
                My dates are flexible
              </label>
            </Field>
            <Field
              id={id("guests")}
              label="Estimated guests"
              optional
              error={errors.guests}
              hint={chosen && Number(v.guests) > maxCap(chosen) ? `More than ${chosen.name} holds (${maxCap(chosen)}). We'll suggest options.` : undefined}
            >
              <input
                id={id("guests")}
                inputMode="numeric"
                className="field tabular"
                placeholder="e.g. 80"
                value={v.guests}
                onChange={(e) => set("guests", e.target.value.replace(/[^\d]/g, ""))}
                {...invalid("guests")}
              />
            </Field>
          </div>
          <div className="mt-7">
            <p className="mb-3 text-[0.9375rem] font-medium">Type of event</p>
            <Chips name="Type of event" options={eventTypes} value={v.eventType} onChange={(x) => set("eventType", x)} />
          </div>
          <div className="mt-7">
            <p className="mb-3 text-[0.9375rem] font-medium">Budget range</p>
            <Chips name="Budget range" options={budgets} value={v.budget} onChange={(x) => set("budget", x)} />
          </div>
          <Field id={id("message")} label="Anything else?" optional className="mt-7">
            <textarea
              id={id("message")}
              rows={5}
              className="field resize-y"
              placeholder="The occasion, the feeling you're after, catering or AV needs…"
              value={v.message}
              onChange={(e) => set("message", e.target.value)}
            />
          </Field>
        </fieldset>

        <div className="mt-12 space-y-4 border-t hairline pt-8">
          <label className={cn("flex cursor-pointer items-start gap-3 rounded-2xl p-3 -m-3", errors.privacy && "bg-redwood-soft/60")}>
            <input
              id={id("privacy")}
              type="checkbox"
              checked={v.privacy}
              onChange={(e) => set("privacy", e.target.checked)}
              className="mt-0.5 size-[18px] shrink-0 accent-[var(--color-ink)]"
              {...invalid("privacy")}
            />
            <span className="t-small">
              I understand the Pyramid events team will use these details to reply to my inquiry, as described in the privacy notice.{" "}
              <span className="text-stone">(Required)</span>
            </span>
          </label>
          {errors.privacy && (
            <p id={`${id("privacy")}-error`} className="t-small flex items-center gap-1.5 text-redwood">
              <Icon name="alert" size={16} />
              {errors.privacy}
            </p>
          )}
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={v.news}
              onChange={(e) => set("news", e.target.checked)}
              className="mt-0.5 size-[18px] shrink-0 accent-[var(--color-ink)]"
            />
            <span className="t-small text-stone">Send me the occasional note about new spaces and open dates.</span>
          </label>
        </div>

        <AnimatePresence>
          {netError && (
            <motion.div
              role="alert"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-8 flex items-start gap-3 rounded-[var(--radius-card)] bg-hold-soft p-5 text-hold"
            >
              <Icon name="refresh" size={20} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">We couldn&apos;t send that just now.</p>
                <p className="t-small mt-1">Your details are all still here. Check your connection and try again.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="submit"
            disabled={sending}
            className="flex h-14 items-center justify-center gap-2 rounded-full bg-redwood px-8 font-medium text-paper transition-colors hover:bg-redwood-deep disabled:opacity-70"
          >
            {sending ? (
              <>
                <span className="size-4 keep-round animate-spin rounded-full border-2 border-paper/30 border-t-paper" />
                Sending…
              </>
            ) : netError ? (
              "Try again"
            ) : (
              <>
                Send inquiry
                <Icon name="arrow-right" size={18} />
              </>
            )}
          </button>
          <label className="t-meta flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={simulateFail} onChange={(e) => setSimulateFail(e.target.checked)} className="accent-[var(--color-stone)]" />
            Demo: simulate a connection error
          </label>
        </div>
      </form>
    </div>
  );
}
