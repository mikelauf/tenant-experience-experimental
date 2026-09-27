"use client";

import { AnimatePresence, motion } from "motion/react";
import Image from "@/components/ui/SmoothImage";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { budgetOptions } from "@/lib/core/inquiry/budget";
import { MAX_VENUES, NOT_SURE, type InquiryInput } from "@/lib/core/inquiry/contract";
import { getPublicCampaign } from "@/lib/core/inquiry/campaign";
import { INQUIRY_CLIENT_TIMEOUT_MS } from "@/lib/core/inquiry/timeouts";
import { START_TIMES, dateText } from "@/lib/core/inquiry/when";
import { briefHref } from "@/lib/brief";
import { clock, minutesOf } from "@/lib/sun";
import { eventTypes, guestsShort, setupLabels } from "@/lib/data/shared";
import type { Setup } from "@/lib/data/types";
import { isDemo } from "@/lib/flags";
import { actions, useDemo, useHydrated } from "@/lib/store";
import { useTenant } from "@/lib/tenants/client";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { DatePicker, formatDate } from "./DatePicker";
import { GuestStepper } from "./GuestStepper";
import { LineReveal } from "@/components/motion/Reveal";

/**
 * The public inquiry, OpenTable-style: the event first, contact details last, no account
 * (inquiries stay profile-free per the Wayfinder decisions). Four steps on one page:
 * when → where → the event → your details. The summary card beside the form can jump back to any step.
 * Budget ranges below the chosen spaces' minimum aren't offered, so an inquiry can't go out below the floor.
 */

type Values = {
  date: string;
  /** Start time, "HH:MM", optional; Core has no field for it, so it rides in the date text */
  time: string;
  flexible: boolean;
  guests: string;
  venues: string[];
  eventType: string;
  budget: string;
  message: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  phone: string;
  privacy: boolean;
  news: boolean;
};
type Errors = Partial<Record<keyof Values, string>>;

/** One-tap headcounts under the stepper; "500+" fills in 500. */
const GUEST_PRESETS = ["25", "50", "100", "200", "500+"];

const STEPS = [
  { title: "When, and how many?", short: "When" },
  { title: "Where are you thinking?", short: "Where" },
  { title: "The event", short: "Event" },
  { title: "Your details", short: "You" },
] as const;

function validateStep(step: number, v: Values): Errors {
  const e: Errors = {};
  if (step === 0) {
    if (!v.date) e.date = "Choose a date, even a rough one. Tick “My dates are flexible” if it can move.";
    if (!v.guests) e.guests = "Add an estimated guest count.";
    else if (Number(v.guests) < 1) e.guests = "Use a number, like 80.";
  }
  if (step === 1 && !v.venues.length) e.venues = "Pick one or more venues, or “Not sure yet”.";
  if (step === 2 && !v.budget) e.budget = "Pick a range, or “Not sure yet”.";
  if (step === 3) {
    if (!v.firstName.trim()) e.firstName = "Add your first name.";
    if (!v.lastName.trim()) e.lastName = "Add your last name.";
    if (!v.email.trim()) e.email = "Add an email so the team can reply.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) e.email = "That email doesn't look complete. Check for a missing @ or domain.";
    if (!v.privacy) e.privacy = "Please confirm you've read how your details are used.";
  }
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
  hint?: React.ReactNode;
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
            className="t-small flex items-start gap-1.5 overflow-hidden pt-2 text-accent"
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

function Chips({ name, options, value, onChange, invalid }: { name: string; options: string[]; value: string; onChange: (v: string) => void; invalid?: boolean }) {
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
              on
                ? "bg-ink text-paper"
                : invalid
                  ? "bg-paper text-ink-2 shadow-[inset_0_0_0_1.5px_var(--color-accent)]"
                  : "bg-paper text-ink-2 shadow-[inset_0_0_0_1px_var(--color-line-2)] hover:shadow-[inset_0_0_0_1px_var(--color-stone-2)]",
            )}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

export type InquiryLayout = "split" | "focused" | "card" | "sentence";
const LAYOUTS: { key: InquiryLayout; label: string }[] = [
  { key: "split", label: "Split" },
  { key: "focused", label: "Focused" },
  { key: "card", label: "Card" },
  { key: "sentence", label: "Sentence" },
];
const isLayout = (x: string | undefined): x is InquiryLayout => LAYOUTS.some((l) => l.key === x);

const LEAD = "No account needed. The events team follows up, and nothing is reserved until you say so.";

/** Sentence layout: each blank in "I'm planning [a dinner] for [80] guests…" opens its own control. */
type Blank = "event" | "guests" | "date" | "venue" | "budget" | "note";
const BLANKS: Blank[] = ["event", "guests", "date", "venue", "budget"];
const BLANK_KEY: Record<Blank, keyof Values> = { event: "eventType", guests: "guests", date: "date", venue: "venues", budget: "budget", note: "message" };
const EVENT_PHRASE: Record<string, string> = {
  Reception: "a reception",
  Dinner: "a dinner",
  "Offsite or meeting": "an offsite",
  "Launch or press": "a launch",
  "Holiday party": "a holiday party",
  "Panel or talk": "a panel or talk",
  "Something else": "an event",
};

export type InquiryInitial = { venue?: string; guests?: string; date?: string; time?: string; layout?: string; setup?: string };

/**
 * `onClose` puts the form in a modal over a venue's page: the focused card without its page backdrop,
 * a close button in its header, and the confirmation shown in place instead of on its own page.
 */
export function InquiryForm({ initial, onClose }: { initial: InquiryInitial; onClose?: () => void }) {
  const modal = !!onClose;
  const tenant = useTenant();
  const { venues: all, publicHost: host, building, copy } = tenant;
  const router = useRouter();
  const s = useDemo();
  const hydrated = useHydrated();
  const uid = useId();
  const top = useRef<HTMLFormElement>(null);

  const initialVenue = initial.venue && (all.some((x) => x.slug === initial.venue) || initial.venue === NOT_SURE) ? [initial.venue] : [];
  // Coming from a venue's 3D space with a setup picked: start the note with it, for them to keep or edit
  const fromSetup = all.find((x) => x.slug === initial.venue)?.layout?.setups[initial.setup as Setup] ? (initial.setup as Setup) : undefined;
  const [v, setV] = useState<Values>({
    date: /^\d{4}-\d{2}-\d{2}$/.test(initial.date ?? "") ? initial.date! : "",
    time: START_TIMES.includes(initial.time ?? "") ? initial.time! : "",
    flexible: false,
    guests: /^\d{1,6}$/.test(initial.guests ?? "") ? initial.guests! : "",
    venues: initialVenue,
    eventType: "",
    budget: "",
    message: fromSetup ? `We're picturing a ${setupLabels[fromSetup].toLowerCase()} setup.` : "",
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    phone: "",
    privacy: false,
    news: false,
  });
  // Focused is the inquiry; ?layout= still opens the other explorations.
  const layout: InquiryLayout = modal ? "focused" : isLayout(initial.layout) ? initial.layout : "focused";
  // A date and a headcount already chosen on the venue's page count as the first step answered
  const start = layout !== "sentence" && v.date && v.guests ? 1 : 0;
  const [step, setStep] = useState(start);
  const [reached, setReached] = useState(start);
  const [sent, setSent] = useState<{ ref: string; preview: boolean } | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [netError, setNetError] = useState(false);
  const [serverMessage, setServerMessage] = useState("");
  const [simulateFail, setSimulateFail] = useState(false);
  const [website, setWebsite] = useState("");
  const [touchedVenues, setTouchedVenues] = useState(initialVenue.length > 0);
  const [blank, setBlank] = useState<Blank | null>("event");
  const startedAt = useRef("");
  // An unchanged retry reuses its key, so Core never files the same inquiry twice.
  const attempt = useRef<{ payload: string; key: string } | null>(null);
  useEffect(() => {
    startedAt.current = new Date().toISOString();
  }, []);

  // Until someone picks venues themselves, their shortlist hearts stand in as the selection.
  const shortlist = hydrated ? s.shortlist.filter((x) => all.some((a) => a.slug === x)) : [];
  const venues = touchedVenues ? v.venues : v.venues.length ? v.venues : shortlist.slice(0, MAX_VENUES);
  const chosen = all.filter((x) => venues.includes(x.slug));
  // Only ranges that can work for these spaces are offered; a pick that no longer fits (the venues changed) clears.
  const budgets = budgetOptions((chosen.length ? chosen : all).map((x) => x.minBudget)).map((b) => b.label);
  const budget = budgets.includes(v.budget) ? v.budget : "";
  const values = { ...v, venues, budget };
  const largest = chosen.reduce<(typeof chosen)[number] | undefined>((a, x) => ((x.capacity ?? 0) > (a?.capacity ?? 0) ? x : a), undefined);

  // The sentence layout folds the first three steps into one sentence: its steps are 0 (the event) and 3 (you).
  const sentence = layout === "sentence" && step < 3;
  const filled: Record<Blank, boolean> = {
    event: !!v.eventType,
    guests: !!v.guests,
    date: !!v.date,
    venue: venues.length > 0,
    budget: !!budget,
    note: !!v.message.trim(),
  };
  /** The next blank after this one that still needs an answer, or none. */
  const after = (b: Blank) => BLANKS.slice(BLANKS.indexOf(b) + 1).find((x) => !filled[x]) ?? null;
  const advance = (b: Blank) => layout === "sentence" && setBlank(after(b));

  // A headcount set elsewhere on the site fills in here when the link didn't bring one (read once the browser's store is up)
  const [seeded, setSeeded] = useState(false);
  if (hydrated && !seeded) {
    setSeeded(true);
    if (!v.guests && s.guests) setV((x) => ({ ...x, guests: String(s.guests) }));
  }

  const set = <K extends keyof Values>(k: K, val: Values[K]) => {
    setV((x) => ({ ...x, [k]: val }));
    if (k === "guests") actions.setGuests(Number(val) || undefined);
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const toggleVenue = (slug: string) => {
    setTouchedVenues(true);
    const cur = venues;
    const next =
      slug === NOT_SURE
        ? cur.includes(NOT_SURE)
          ? []
          : [NOT_SURE]
        : cur.includes(slug)
          ? cur.filter((x) => x !== slug)
          : [...cur.filter((x) => x !== NOT_SURE), slug].slice(0, MAX_VENUES);
    setV((x) => ({ ...x, venues: next }));
    if (errors.venues) setErrors((e) => ({ ...e, venues: undefined }));
  };

  const go = (to: number) => {
    setStep(to);
    setErrors({});
    requestAnimationFrame(() => top.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const next = () => {
    const checks = sentence ? [0, 1, 2] : [step];
    const e: Errors = Object.assign({}, ...checks.map((k) => validateStep(k, values)));
    setErrors(e);
    if (Object.keys(e).length) {
      const first = Object.keys(e)[0] as keyof Values;
      if (sentence) setBlank(BLANKS.find((b) => BLANK_KEY[b] === first) ?? null);
      requestAnimationFrame(() => document.getElementById(`${uid}-${first}`)?.focus());
      return;
    }
    const to = sentence ? 3 : step + 1;
    setReached((r) => Math.max(r, to));
    go(to);
  };
  const back = () => go(layout === "sentence" && step === 3 ? 0 : step - 1);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) return next();
    if (sending) return;
    setNetError(false);
    setServerMessage("");
    const errs = validateStep(3, values);
    setErrors(errs);
    if (Object.keys(errs).length) {
      requestAnimationFrame(() => document.getElementById(`${uid}-${Object.keys(errs)[0]}`)?.focus());
      return;
    }
    const body: InquiryInput & { privacyVersion?: string } = {
      firstName: v.firstName.trim(),
      lastName: v.lastName.trim(),
      email: v.email.trim(),
      venues,
      venue: venues[0],
      company: v.company.trim(),
      phone: v.phone.trim(),
      date: dateText(v.date, v.time, v.flexible),
      guests: v.guests,
      eventType: v.eventType,
      budget,
      details: v.message.trim(),
      privacy: v.privacy,
      marketing: v.news,
      campaign: getPublicCampaign(),
      website,
      startedAt: startedAt.current,
      privacyVersion: tenant.inquiry?.privacyVersion,
    };
    const payload = JSON.stringify(body);
    if (attempt.current?.payload !== payload) attempt.current = { payload, key: crypto.randomUUID() };
    setSending(true);
    try {
      if (isDemo && simulateFail) {
        setSimulateFail(false);
        throw new Error("simulated");
      }
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": attempt.current.key },
        body: payload,
        signal: AbortSignal.timeout(INQUIRY_CLIENT_TIMEOUT_MS),
      });
      const result = (await res.json().catch(() => ({}))) as {
        accepted?: boolean;
        inquiry_reference?: string;
        preview?: boolean;
        message?: string;
        errors?: Partial<Record<keyof InquiryInput, string>>;
      };
      if (res.status === 202 && result.accepted && result.inquiry_reference) {
        // The demo keeps a copy in this browser for the member app's Plans; production keeps nothing.
        if (isDemo)
          actions.addInquiry({
            venue: venues[0],
            firstName: body.firstName,
            lastName: body.lastName,
            email: body.email,
            guests: body.guests,
            date: body.date,
            eventType: body.eventType || undefined,
          });
        if (modal) {
          setSent({ ref: result.inquiry_reference, preview: !!result.preview });
          setSending(false);
          return;
        }
        const q = new URLSearchParams({ ref: result.inquiry_reference, venue: venues.join(",") });
        if (result.preview) q.set("preview", "1");
        router.push(`/venues/inquire/sent?${q}`);
        return;
      }
      if (result.errors) {
        // Server fields use the Core contract's names; map them back to this form's, and to their step.
        const names: Partial<Record<keyof InquiryInput, keyof Values>> = { details: "message", marketing: "news", venue: "venues" };
        const mapped: Errors = {};
        for (const [k, msg] of Object.entries(result.errors)) mapped[names[k as keyof InquiryInput] ?? (k as keyof Values)] = msg;
        setErrors(mapped);
        const stepOf = (k: string) => (["date", "guests"].includes(k) ? 0 : k === "venues" ? 1 : ["budget", "eventType", "message"].includes(k) ? 2 : 3);
        const earliest = Math.min(...Object.keys(mapped).map(stepOf));
        if (earliest < 3) setStep(layout === "sentence" ? 0 : earliest);
      }
      setServerMessage(result.message ?? "Please check your details and try again.");
    } catch {
      setNetError(true);
    }
    setSending(false);
  };

  const id = (k: string) => `${uid}-${k}`;
  const invalid = (k: keyof Values) => (errors[k] ? { "aria-invalid": true as const, "aria-describedby": `${id(k)}-error` } : {});
  const hero = chosen[0]?.hero ?? building.hero;
  const title = chosen.length > 1 ? `${chosen.length} venues` : (chosen[0]?.name ?? (venues.includes(NOT_SURE) ? "The right space for you" : building.name));
  const rows = [
    { k: "When", s: 0, val: v.date ? `${formatDate(v.date)}${v.time ? ` · ${clock(minutesOf(v.time)!)}` : ""}${v.flexible ? " · flexible" : ""}` : "" },
    { k: "Guests", s: 0, val: v.guests ? `${Number(v.guests).toLocaleString("en-US")} guests` : "" },
    { k: "Where", s: 1, val: venues.includes(NOT_SURE) ? "Not sure yet" : chosen.map((x) => x.name).join(", ") },
    { k: "Budget", s: 2, val: budget },
  ];

  /* ---------- Shared pieces: every layout arranges the same controls ---------- */

  const progressSteps = layout === "sentence" ? [{ i: 0, short: "Your event" }, { i: 3, short: "Your details" }] : STEPS.map((st, i) => ({ i, short: st.short }));
  const progress = (
    <ol className="flex gap-2" aria-label="Inquiry steps">
      {progressSteps.map((st, k) => (
        <li key={st.short} className="flex-1">
          <button
            type="button"
            onClick={() => st.i <= reached && go(st.i)}
            disabled={st.i > reached}
            aria-current={st.i === (sentence ? 0 : step) ? "step" : undefined}
            className="group w-full text-left disabled:cursor-default"
          >
            <span className={cn("block h-[3px] rounded-full transition-colors duration-500", st.i <= step ? "bg-ink" : st.i <= reached ? "bg-ink/35" : "bg-line-2")} />
            <span className={cn("t-meta mt-2 block", st.i === (sentence ? 0 : step) && "font-medium text-ink")}>
              {k + 1}. {st.short}
            </span>
          </button>
        </li>
      ))}
    </ol>
  );

  const dateControl = (
    <Field id={id("date")} label="Preferred date" error={errors.date}>
      <DatePicker
        id={id("date")}
        value={v.date}
        onChange={(x) => {
          set("date", x);
          if (x) advance("date");
        }}
        invalid={!!errors.date}
        describedBy={errors.date ? `${id("date")}-error` : undefined}
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <label className="flex cursor-pointer items-center gap-2.5 text-[0.9375rem]">
          <input type="checkbox" checked={v.flexible} onChange={(e) => set("flexible", e.target.checked)} className="size-[18px] accent-[var(--color-ink)]" />
          My dates are flexible
        </label>
        <label className="flex items-center gap-2 text-[0.9375rem]">
          <span className="text-stone">Starting</span>
          <select value={v.time} onChange={(e) => set("time", e.target.value)} aria-label="Start time (optional)" className="field !h-10 !w-auto !py-0 pr-8">
            <option value="">Any time</option>
            {START_TIMES.map((t) => (
              <option key={t} value={t}>
                {clock(minutesOf(t)!)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </Field>
  );

  const guestsControl = (
    <Field id={id("guests")} label="Estimated guests" error={errors.guests}>
      <GuestStepper
        id={id("guests")}
        value={v.guests}
        onChange={(x) => set("guests", x)}
        invalid={!!errors.guests}
        describedBy={errors.guests ? `${id("guests")}-error` : undefined}
      />
      <div className="mt-3">
        <Chips
          name="Common guest counts"
          options={GUEST_PRESETS}
          value={GUEST_PRESETS.find((p) => parseInt(p) === Number(v.guests)) ?? ""}
          onChange={(x) => {
            set("guests", x ? String(parseInt(x)) : "");
            if (x) advance("guests");
          }}
        />
      </div>
    </Field>
  );

  const venuePicker = (
    <>
      <p className="t-small text-stone">Choose every venue you&apos;re weighing up. The team can compare them for you.</p>
      <div role="group" aria-label="Venues" aria-describedby={errors.venues ? `${id("venues")}-error` : undefined} className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          ...all.map((x) => ({ slug: x.slug, name: x.name, meta: `${x.levelLabel} · ${guestsShort(x)}`, img: x.hero })),
          { slug: NOT_SURE, name: "Not sure yet", meta: "The events team can recommend one", img: null },
        ].map((o, k) => {
          const on = venues.includes(o.slug);
          const saved = shortlist.includes(o.slug);
          return (
            <button
              type="button"
              role="checkbox"
              aria-checked={on}
              id={k === 0 ? id("venues") : undefined}
              key={o.slug}
              onClick={() => toggleVenue(o.slug)}
              className={cn(
                "relative flex items-center gap-4 rounded-[var(--radius-card)] bg-paper p-2.5 pr-4 text-left transition-[box-shadow] duration-200",
                on
                  ? "shadow-[inset_0_0_0_2px_var(--color-ink)]"
                  : errors.venues
                    ? "shadow-[inset_0_0_0_1.5px_var(--color-accent)]"
                    : "shadow-[inset_0_0_0_1px_var(--color-line-2)] hover:shadow-[inset_0_0_0_1px_var(--color-stone-2)]",
              )}
            >
              <span className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-fog">
                {o.img ? <Image src={o.img.src} alt="" fill sizes="64px" className="object-cover" /> : <Icon name="sliders" size={22} className="text-stone" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{o.name}</span>
                <span className="t-meta block first-letter:uppercase">{o.meta}</span>
              </span>
              {saved && <Icon name="heart-fill" size={16} className="text-accent" />}
              <span className={cn("grid size-5 shrink-0 place-items-center rounded-md border transition-colors", on ? "border-ink bg-ink text-paper" : "border-line-2")}>
                {on && <Icon name="check" size={12} strokeWidth={2.5} />}
              </span>
            </button>
          );
        })}
      </div>
      {errors.venues && (
        <p id={`${id("venues")}-error`} className="t-small flex items-center gap-1.5 pt-3 text-accent">
          <Icon name="alert" size={16} />
          {errors.venues}
        </p>
      )}
      {largest?.capacity && Number(v.guests) > largest.capacity ? (
        <p className="t-small mt-4 rounded-[var(--radius-card)] bg-hold-soft px-4 py-3 text-hold">
          {Number(v.guests).toLocaleString("en-US")} guests is more than {chosen.length > 1 ? "any of these holds" : `${largest.name} holds`} (up to{" "}
          {largest.capacity.toLocaleString("en-US")}). You can still send it; the team can suggest options.
        </p>
      ) : null}
    </>
  );

  const budgetControl = (
    <div>
      <p className="mb-1 text-[0.9375rem] font-medium outline-none" id={id("budget")} tabIndex={-1}>
        Budget range
      </p>
      <p className="t-small mb-3 text-stone">Your all-in event budget: the space, furniture and rentals, and catering and drinks together.</p>
      <Chips
        name="Budget range"
        options={budgets}
        value={budget}
        onChange={(x) => {
          set("budget", x);
          if (x) advance("budget");
        }}
        invalid={!!errors.budget}
      />
      {errors.budget && (
        <p className="t-small flex items-center gap-1.5 pt-3 text-accent">
          <Icon name="alert" size={16} />
          {errors.budget}
        </p>
      )}
    </div>
  );

  const eventControl = (
    <div>
      <p className="mb-3 text-[0.9375rem] font-medium">
        Type of event <span className="t-meta font-normal">· optional</span>
      </p>
      <Chips
        name="Type of event"
        options={eventTypes}
        value={v.eventType}
        onChange={(x) => {
          set("eventType", x);
          if (x) advance("event");
        }}
      />
    </div>
  );

  const messageControl = (
    <Field id={id("message")} label="Anything else?" optional>
      <textarea
        id={id("message")}
        rows={5}
        className="field resize-y"
        placeholder="The occasion, the setup, catering or AV needs, a site visit…"
        value={v.message}
        onChange={(e) => set("message", e.target.value)}
      />
    </Field>
  );

  const detailsStep = (
    <div className="mt-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id={id("firstName")} label="First name" error={errors.firstName}>
          <input id={id("firstName")} className="field" autoComplete="given-name" value={v.firstName} onChange={(e) => set("firstName", e.target.value)} {...invalid("firstName")} />
        </Field>
        <Field id={id("lastName")} label="Last name" error={errors.lastName}>
          <input id={id("lastName")} className="field" autoComplete="family-name" value={v.lastName} onChange={(e) => set("lastName", e.target.value)} {...invalid("lastName")} />
        </Field>
        <Field id={id("email")} label="Email" error={errors.email} className="sm:col-span-2" hint="Any email works; it doesn't need to be a work address.">
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
        <Field id={id("phone")} label="Phone" optional>
          <input id={id("phone")} type="tel" className="field" autoComplete="tel" value={v.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field id={id("company")} label="Company" optional>
          <input id={id("company")} className="field" autoComplete="organization" value={v.company} onChange={(e) => set("company", e.target.value)} />
        </Field>
      </div>

      <div className="mt-10 space-y-4 border-t hairline pt-8">
        <label className={cn("-m-3 flex cursor-pointer items-start gap-3 rounded-2xl p-3", errors.privacy && "bg-accent-soft/60")}>
          <input
            id={id("privacy")}
            type="checkbox"
            checked={v.privacy}
            onChange={(e) => set("privacy", e.target.checked)}
            className="mt-0.5 size-[18px] shrink-0 accent-[var(--color-ink)]"
            {...invalid("privacy")}
          />
          <span className="t-small">
            I understand the {copy.the.replace(/^the /, "")} events team will use these details to reply to my inquiry, as described in the{" "}
            {copy.public.privacyUrl ? (
              <a href={copy.public.privacyUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                privacy policy
              </a>
            ) : (
              "privacy policy"
            )}
            . <span className="text-stone">(Required)</span>
          </span>
        </label>
        {errors.privacy && (
          <p id={`${id("privacy")}-error`} className="t-small flex items-center gap-1.5 text-accent">
            <Icon name="alert" size={16} />
            {errors.privacy}
          </p>
        )}
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" checked={v.news} onChange={(e) => set("news", e.target.checked)} className="mt-0.5 size-[18px] shrink-0 accent-[var(--color-ink)]" />
          <span className="t-small text-stone">Send me the occasional note about new spaces and open dates.</span>
        </label>
      </div>

      {/* A field people can't see: only bots fill it in. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
      </div>

      <AnimatePresence>
        {serverMessage && !netError && (
          <motion.p role="alert" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="t-small mt-8 flex items-start gap-2 text-accent">
            <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
            {serverMessage}
          </motion.p>
        )}
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
              <p className="font-medium">We couldn&apos;t confirm that it was sent.</p>
              <p className="t-small mt-1">Your details are all still here. Try again; it won&apos;t send twice.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  /* ---------- The sentence ---------- */

  const blankText: Record<Blank, string> = {
    event: v.eventType ? (EVENT_PHRASE[v.eventType] ?? `a ${v.eventType.toLowerCase()}`) : "an event",
    guests: v.guests ? Number(v.guests).toLocaleString("en-US") : "how many",
    date: v.date ? `${formatDate(v.date)}${v.flexible ? " (or so)" : ""}` : "which date",
    venue: venues.includes(NOT_SURE)
      ? "whichever space fits"
      : chosen.length
        ? new Intl.ListFormat("en", { type: "disjunction" }).format(chosen.map((x) => x.name))
        : "which venue",
    budget: budget === "Not sure yet" ? "TBD" : budget || "how much",
    note: "",
  };
  const B = (b: Blank) => {
    const on = blank === b;
    const err = !!errors[BLANK_KEY[b]];
    return (
      <button
        type="button"
        onClick={() => setBlank(on ? null : b)}
        aria-expanded={on}
        className={cn(
          "rounded-[0.25em] px-[0.1em] underline decoration-[0.06em] underline-offset-[0.14em] transition-colors duration-200",
          filled[b] ? "text-ink decoration-line-2 hover:decoration-ink" : "text-stone-2 decoration-stone-2 decoration-dashed hover:text-stone",
          err && "text-accent decoration-accent",
          on && "bg-accent-soft text-accent-deep decoration-accent",
        )}
      >
        {blankText[b]}
      </button>
    );
  };
  const blankPanel: Record<Blank, React.ReactNode> = {
    event: eventControl,
    guests: guestsControl,
    date: dateControl,
    venue: venuePicker,
    budget: budgetControl,
    note: messageControl,
  };
  const sentenceStep = (
    <div className="mt-2">
      <p className="t-h1 !leading-[1.22] text-stone">
        I&apos;m planning {B("event")} for {B("guests")} guests on {B("date")}, at {B("venue")}, with a budget of {B("budget")}.
      </p>
      {!blank && (
        <button type="button" onClick={() => setBlank("note")} className="t-small mt-6 inline-flex items-center gap-1.5 font-medium text-stone hover:text-ink">
          <Icon name={filled.note ? "check" : "plus"} size={16} />
          {filled.note ? "Note added for the team" : "Add a note for the team"}
        </button>
      )}
      <AnimatePresence mode="wait" initial={false}>
        {blank && (
          <motion.div
            key={blank}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 rounded-[var(--radius-card)] bg-paper p-5 shadow-[var(--shadow-soft)] sm:p-6"
          >
            {blankPanel[blank]}
            <div className="mt-5 flex justify-end">
              <button type="button" onClick={() => setBlank(after(blank))} className="t-small font-medium text-stone hover:text-ink">
                {blank === "event" && !filled.event ? "Skip" : "Done"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  /* ---------- Steps, and the buttons that move between them ---------- */

  const stacked = layout !== "split";
  const legendClass = { split: "t-h1", focused: "t-h2", card: "t-h2", sentence: "t-h1" }[layout];
  const fieldset = (
    <AnimatePresence mode="wait" initial={false}>
      <motion.fieldset
        key={sentence ? "sentence" : step}
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -16 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <legend className={sentence ? "sr-only" : legendClass}>{sentence ? "Your event" : STEPS[step].title}</legend>
        {layout === "focused" && step === 0 && <p className="t-small mt-2 max-w-[48ch] text-stone">{LEAD}</p>}

        {sentence ? (
          sentenceStep
        ) : (
          <>
            {step === 0 && (
              <div className={cn("mt-8 grid gap-6", !stacked && "sm:grid-cols-2")}>
                {dateControl}
                {guestsControl}
              </div>
            )}
            {step === 1 && <div className="mt-8">{venuePicker}</div>}
            {step === 2 && (
              <div className="mt-8 space-y-8">
                {budgetControl}
                {eventControl}
                {messageControl}
              </div>
            )}
            {step === 3 && detailsStep}
          </>
        )}
      </motion.fieldset>
    </AnimatePresence>
  );

  const backButton =
    step > 0 ? (
      <button type="button" onClick={back} className="inline-flex items-center gap-2 font-medium text-stone hover:text-ink">
        <Icon name="arrow-left" size={18} />
        Back
      </button>
    ) : (
      <span />
    );
  const submitButton = (
    <div className="flex flex-col items-stretch gap-3 sm:items-end">
      <button
        type="submit"
        disabled={sending}
        className="flex h-14 items-center justify-center gap-2 rounded-full bg-accent px-8 font-medium text-paper transition-colors hover:bg-accent-deep disabled:opacity-60"
      >
        {sending ? (
          <>
            <span className="keep-round size-4 animate-spin rounded-full border-2 border-paper/30 border-t-paper" />
            Sending…
          </>
        ) : step < 3 ? (
          <>
            Continue
            <Icon name="arrow-right" size={18} />
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
      {isDemo && step === 3 && (
        <label className="t-meta flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={simulateFail} onChange={(e) => setSimulateFail(e.target.checked)} className="accent-[var(--color-stone)]" />
          Demo: simulate a connection error
        </label>
      )}
    </div>
  );
  const navRow = (
    <div className="mt-10 flex flex-col-reverse gap-4 border-t hairline pt-8 sm:flex-row sm:items-center sm:justify-between">
      {backButton}
      {submitButton}
    </div>
  );
  const formProps = { ref: top, noValidate: true, onSubmit: submit };

  /* ---------- Layouts ---------- */

  if (layout === "focused") {
    const answered = rows.filter((r) => r.val && r.s !== step);
    /** The chosen space, crossfading as the venues change */
    const scene = (sizes: string) => (
      <AnimatePresence initial={false}>
        <motion.div
          key={hero.src}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <Image src={hero.src} alt="" fill sizes={sizes} className="object-cover" style={{ objectPosition: hero.pos }} />
        </motion.div>
      </AnimatePresence>
    );
    const titleText = (className: string) => (
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={title}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className={className}
        >
          {title}
        </motion.p>
      </AnimatePresence>
    );
    const pills = (list: typeof rows) =>
      list.map((r) => (
        <button
          key={r.k}
          type="button"
          onClick={() => r.s <= reached && go(r.s)}
          disabled={!!sent || r.s > reached}
          title={sent ? undefined : `Edit ${r.k.toLowerCase()}`}
          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white/15 px-3 text-[0.8125rem] font-medium text-moon backdrop-blur-md transition-colors hover:bg-white/25 disabled:hover:bg-white/15"
        >
          {r.val}
        </button>
      ));
    /* Stepper: the current step fills in the accent; done steps stay ink and can be revisited */
    const stepper = (
      <ol className="grid grid-cols-4 gap-2" aria-label="Inquiry steps">
        {STEPS.map((st, k) => (
          <li key={st.short}>
            <button
              type="button"
              onClick={() => k <= reached && go(k)}
              disabled={k > reached}
              aria-current={k === step ? "step" : undefined}
              className="group w-full text-left disabled:cursor-default"
            >
              <span className="relative block h-1 overflow-hidden rounded-full bg-fog">
                <motion.span
                  className={cn("absolute inset-0 origin-left rounded-full", k === step ? "bg-accent" : "bg-ink")}
                  initial={false}
                  animate={{ scaleX: k <= step ? 1 : k <= reached ? 0.35 : 0 }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                />
              </span>
              <span
                className={cn(
                  "mt-2 block text-[0.8125rem] font-medium transition-colors",
                  k === step ? "text-accent" : k <= reached ? "text-ink-2 group-hover:text-ink" : "text-stone-2",
                )}
              >
                {st.short}
              </span>
            </button>
          </li>
        ))}
      </ol>
    );
    const sendButton = (
      <button
        type="submit"
        disabled={sending}
        className="group flex h-12 items-center justify-center gap-2 rounded-full bg-accent px-7 font-medium text-paper shadow-[0_8px_24px_-8px_var(--color-accent)] transition-[background-color,transform] hover:bg-accent-deep active:scale-[0.98] disabled:opacity-60"
      >
        {sending ? (
          <>
            <span className="keep-round size-4 animate-spin rounded-full border-2 border-paper/30 border-t-paper" />
            Sending…
          </>
        ) : (
          <>
            {step < 3 ? "Continue" : netError ? "Try again" : "Send inquiry"}
            <Icon name="arrow-right" size={18} className="transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </button>
    );
    const simulate = isDemo && step === 3 && (
      <label className="t-meta mt-6 flex cursor-pointer items-center gap-2">
        <input type="checkbox" checked={simulateFail} onChange={(e) => setSimulateFail(e.target.checked)} className="accent-[var(--color-stone)]" />
        Demo: simulate a connection error
      </label>
    );

    if (!modal) {
      const one = chosen.length === 1 ? chosen[0] : undefined;
      return (
        <div className="lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,6fr)]">
          {/* The space, as large as the screen allows: it follows the venues picked, and the answers gather on it */}
          <div className="theme-night relative mt-[var(--nav-h)] h-[300px] overflow-hidden bg-night sm:h-[380px] lg:sticky lg:top-0 lg:mt-0 lg:h-[100svh]">
            {scene("(min-width:1024px) 55vw, 100vw")}
            <div className="absolute inset-0 bg-gradient-to-t from-night via-night/30 to-night/5" />
            <div className="frame absolute inset-x-0 bottom-0 pb-6 lg:pb-12">
              <h1 className="t-meta !text-moon/80">Event inquiry</h1>
              {titleText("t-hero mt-2 max-w-[14ch] text-moon")}
              <p className="t-small mt-3 min-h-5 text-moon/75">
                {one
                  ? `${one.levelLabel.replace(/^./, (c) => c.toUpperCase())} · ${guestsShort(one)} guests`
                  : chosen.length > 1
                    ? chosen.map((x) => x.name).join(" · ")
                    : "Four quick steps. No account, nothing reserved."}
              </p>
              {rows.some((r) => r.val) && <div className="mt-5 flex flex-wrap gap-1.5">{pills(rows.filter((r) => r.val))}</div>}
            </div>
          </div>

          <form {...formProps} className="relative flex min-h-[calc(100svh-var(--nav-h))] scroll-mt-[var(--nav-h)] flex-col lg:min-h-[100svh]">
            <div className="frame flex-1 pb-10 pt-8 lg:px-[clamp(40px,5vw,96px)] lg:pt-[calc(var(--nav-h)+56px)]">
              <div className="max-w-[600px]">
                {stepper}
                <div className="mt-10">{fieldset}</div>
                {simulate}
              </div>
            </div>
            {/* Actions stick to the bottom of the screen on long steps */}
            <div className="sticky bottom-0 z-10 border-t hairline bg-quartz/95 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4 backdrop-blur-xl sm:pb-5">
              <div className="frame flex max-w-[calc(600px+2*var(--gutter))] items-center justify-between gap-4 lg:max-w-[calc(600px+2*clamp(40px,5vw,96px))] lg:px-[clamp(40px,5vw,96px)]">
                {backButton}
                {sendButton}
              </div>
            </div>
          </form>
        </div>
      );
    }

    return (
      <form {...formProps} className="relative rounded-t-[28px] bg-paper lg:rounded-[28px]">
        {/* Photo header: where it's happening, and the answers so far as pills that jump back */}
        <div className="theme-night relative h-[184px] overflow-hidden rounded-t-[28px] bg-night sm:h-[208px]">
          {scene("(min-width:1024px) 720px, 580px")}
          <div className="absolute inset-0 bg-gradient-to-t from-night/90 via-night/35 to-night/10" />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-5 sm:px-8">
            <h2 id={id("title")} className="t-meta !text-moon/85">
              Event inquiry
            </h2>
            <span className="flex items-center gap-2">
              <span className="t-meta rounded-full bg-white/15 px-2.5 py-1 font-medium !text-moon tabular-nums backdrop-blur-md">
                {sent ? "Sent" : `${step + 1} / ${STEPS.length}`}
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-mr-1.5 grid size-9 place-items-center rounded-full bg-white/15 text-moon backdrop-blur-md transition-colors hover:bg-white/25"
              >
                <Icon name="close" size={18} />
              </button>
            </span>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-5 sm:px-8 sm:pb-6">
            {titleText("t-h2 text-moon")}
            <div className="mt-3 flex min-h-8 flex-wrap gap-1.5">
              {pills(answered)}
              {!answered.length && <p className="t-small self-center text-moon/75">Four quick steps. No account, nothing reserved.</p>}
            </div>
          </div>
        </div>

        {sent ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="px-5 pb-8 pt-8 sm:px-8"
            role="status"
          >
            <motion.span
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}
              className="grid size-14 place-items-center rounded-full bg-accent text-paper"
            >
              <Icon name="check" size={26} strokeWidth={2} />
            </motion.span>
            <p className="t-h2 mt-6">{sent.preview ? "Preview complete." : "Inquiry received."}</p>
            <p className="t-body mt-3 max-w-[46ch] text-stone">
              {sent.preview
                ? "It was checked but not sent, so no one on the events team has received it. On the live site, they'd now follow up by email."
                : `${host ? `${host.name.split(" ")[0]} and the events team` : "The events team"} will follow up at ${v.email.trim()}. Nothing is reserved until you say so.`}
            </p>
            <p className="mt-5 inline-flex items-center gap-3 rounded-full bg-quartz px-4 py-2 shadow-[var(--shadow-ring)]">
              <span className="t-meta">Reference</span>
              <span className="t-num font-medium">{sent.ref}</span>
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button onClick={onClose}>Done</Button>
              {chosen.length > 0 && (
                <ButtonLink
                  href={briefHref({ venues: chosen.map((x) => x.slug), guests: Number(v.guests) || undefined, date: v.date || undefined, time: v.time || undefined })}
                  variant="outline"
                  icon="share"
                >
                  Share a brief with your team
                </ButtonLink>
              )}
            </div>
          </motion.div>
        ) : (
          <>
            <div className="px-5 pt-6 sm:px-8">{stepper}</div>

            <div className="px-5 pb-8 pt-7 sm:px-8">
              {fieldset}
              {simulate}
            </div>

            {/* Actions live in the card; on long steps they stick to the bottom of the screen */}
            <div className="sticky bottom-0 z-10 flex items-center justify-between gap-4 border-t hairline bg-paper/95 px-5 py-4 pb-[calc(env(safe-area-inset-bottom)+16px)] backdrop-blur-xl sm:px-8 sm:pb-5 lg:rounded-b-[28px]">
              {backButton}
              {sendButton}
            </div>
          </>
        )}
      </form>
    );
  }

  if (layout === "card")
    return (
      <>
        <div className="relative grid min-h-[calc(100svh-var(--nav-h)-48px)] place-items-center overflow-hidden rounded-[var(--radius-media)] bg-night px-3 py-12 sm:px-8 lg:py-20">
          <AnimatePresence initial={false}>
            <motion.div
              key={hero.src}
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            >
              <Image src={hero.src} alt="" fill sizes="100vw" className="object-cover" style={{ objectPosition: hero.pos }} />
            </motion.div>
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-b from-night/60 via-night/35 to-night/70" />
          <div className="relative w-full max-w-[680px]">
            <div className="mb-8 text-center text-moon">
              <h1 className="t-h1">Tell us about your event.</h1>
              <p className="t-small mx-auto mt-3 max-w-[44ch] text-moon/75">{LEAD}</p>
            </div>
            <form {...formProps} className="scroll-mt-[calc(var(--nav-h)+16px)] rounded-[28px] bg-paper p-6 shadow-[var(--shadow-float)] sm:p-10">
              <div className="mb-8">{progress}</div>
              {fieldset}
              {navRow}
            </form>
            <p className="t-small mt-5 text-center text-moon/75">
              {[title, ...rows.map((r) => r.val).filter(Boolean)].join(" · ")}
            </p>
          </div>
        </div>
      </>
    );

  if (layout === "sentence")
    return (
      <>
        <form {...formProps} className="mx-auto max-w-[920px] scroll-mt-[calc(var(--nav-h)+16px)]">
          <div className="mb-10 flex items-end justify-between gap-6">
            <h1 className="t-meta">Tell us about your event</h1>
            <div className="w-full max-w-[280px]">{progress}</div>
          </div>
          {sentence ? fieldset : <div className="mx-auto max-w-[640px]">{fieldset}</div>}
          <div className={cn(!sentence && "mx-auto max-w-[640px]")}>{navRow}</div>
          {sentence && <p className="t-meta mt-6 text-center">{LEAD}</p>}
        </form>
      </>
    );

  return (
    <>
      {/* Phones: the headline leads. Wide screens: it moves into the sticky panel beside the form. */}
      <div className="mb-12 lg:hidden">
        <LineReveal as="h1" className="t-hero" lines={["Tell us about", "your event."]} />
        <p className="t-lead mt-4 max-w-[40ch] text-stone">{LEAD}</p>
      </div>
      <div className="grid-12 gap-y-10">
        {/* Summary: follows the answers, and every answer can be edited from here */}
        <aside className="order-2 col-span-12 lg:sticky lg:top-[calc(var(--nav-h)+24px)] lg:order-none lg:col-span-5 lg:flex lg:h-[calc(100svh-var(--nav-h)-48px)] lg:flex-col lg:gap-8 lg:self-start">
          <div className="hidden shrink-0 lg:block">
            <LineReveal as="h1" className="t-hero" lines={["Tell us about", "your event."]} />
            <p className="t-lead mt-4 max-w-[40ch] text-stone">{LEAD}</p>
          </div>
          <div className="theme-night overflow-hidden rounded-[var(--radius-media)] lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
            {/* The photo is for wide screens and takes whatever height the panel has left; on phones the answers alone keep the form close to the top */}
            <div className="relative hidden min-h-[220px] flex-1 lg:block">
              <AnimatePresence initial={false}>
                <motion.div
                  key={hero.src}
                  className="absolute inset-0"
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Image src={hero.src} alt="" fill sizes="(min-width:1024px) 40vw, 100vw" className="object-cover" style={{ objectPosition: hero.pos }} />
                </motion.div>
              </AnimatePresence>
              <div className="absolute inset-0 bg-gradient-to-t from-night via-night/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <p className="t-meta">Your inquiry</p>
                <p className="t-h2 mt-1">{title}</p>
              </div>
            </div>
            <p className="t-meta px-6 pt-5 lg:hidden">Your inquiry</p>
            <dl className="shrink-0 divide-y divide-night-line px-6">
              {rows.map((row) => (
                <div key={row.k} className="flex items-baseline justify-between gap-4 py-3.5">
                  <dt className="t-meta w-16 shrink-0">{row.k}</dt>
                  <dd className={cn("min-w-0 flex-1 text-[0.9375rem]", !row.val && "text-moon-2")}>{row.val || "Not yet"}</dd>
                  {reached >= row.s && step !== row.s && (
                    <button type="button" onClick={() => go(row.s)} className="t-small shrink-0 font-medium text-moon underline-offset-2 hover:underline">
                      Edit
                    </button>
                  )}
                </div>
              ))}
            </dl>
            {chosen.length > 0 && (
              <div className="shrink-0 border-t border-night-line px-6 py-4">
                <Link
                  href={briefHref({ venues: chosen.map((x) => x.slug), guests: Number(v.guests) || undefined, date: v.date || undefined, time: v.time || undefined })}
                  className="t-small inline-flex items-center gap-1.5 font-medium text-moon underline-offset-2 hover:underline"
                >
                  <Icon name="share" size={15} />
                  {chosen.length > 1 ? "Compare these as a brief to share" : "Make a brief to share"}
                </Link>
              </div>
            )}
            <div className="hidden shrink-0 border-t border-night-line px-6 py-5 lg:block">
              <p className="t-small text-moon-2">
                {host ? `${host.name.split(" ")[0]} and the events team` : "The events team"} follow up by email. An inquiry doesn&apos;t reserve anything.
              </p>
            </div>
          </div>
        </aside>

        <form {...formProps} className="col-span-12 scroll-mt-[calc(var(--nav-h)+16px)] lg:col-span-6 lg:col-start-7">
          <div className="mb-10">{progress}</div>
          {fieldset}
          {navRow}
        </form>
      </div>
    </>
  );
}
