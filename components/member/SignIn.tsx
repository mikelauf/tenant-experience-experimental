"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { isMember } from "@/lib/access";
import type { Account } from "@/lib/data/types";
import { actions, emailsFor, useDemo, useHydrated } from "@/lib/store";
import { useTenant } from "@/lib/tenants/client";
import Image from "@/components/ui/SmoothImage";
import { Icon } from "@/components/ui/Icon";
import { Mark } from "@/components/ui/Logo";

/**
 * Sign-in as Wayfinder #334 decided it: a verified email anchors the account (code, or Google / Apple / Microsoft),
 * then a one-time work-email check unlocks the building. The primary email can stay personal. Whatever someone
 * was doing when they were sent here, they go straight back to it.
 */

function describe(path: string) {
  if (path.startsWith("/fitness")) return "reserving your class";
  if (path.startsWith("/spaces")) return "booking your room";
  if (path.startsWith("/programming")) return "the event";
  if (path.startsWith("/plans")) return "your plans";
  if (path.startsWith("/account")) return "your account";
  return null;
}

const PERSONAL = /@(gmail|googlemail|icloud|me|mac|outlook|hotmail|live|yahoo|proton|protonmail|aol)\.[a-z.]+$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Step = "start" | "code" | "work" | "work-sent" | "pending" | "done";

export function SignIn() {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get("returnTo") ?? "/home";
  const returnTo = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/home";
  const t = useTenant();
  const s = useDemo();
  const hydrated = useHydrated();
  const reduce = useReducedMotion();
  const { copy, member, building } = t;
  const mail = emailsFor(t);
  const resume = describe(returnTo);

  const [picked, setStep] = useState<Step | null>(null);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [work, setWork] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pickedAccount, setAccount] = useState<Account | null>(null);
  const account = pickedAccount ?? s.account ?? null;
  // Someone already signed in picks up where they are: a public customer adds a work email, a pending one waits
  const step: Step = picked ?? (s.persona === "public" ? "work" : s.persona === "verifying" ? "pending" : "start");

  // A member has nothing to do here
  useEffect(() => {
    if (hydrated && isMember(s.persona) && !picked) router.replace(returnTo);
  }, [hydrated, s.persona, picked, returnTo, router]);

  const finish = async (a: Account) => {
    setAccount(a);
    if (a.workStatus === "verified") {
      setStep("done");
      await wait(700);
      actions.signIn(a);
      router.replace(returnTo);
    } else if (a.workStatus === "pending") {
      actions.signIn(a);
      setStep("pending");
    } else {
      setStep("work");
    }
  };

  /** A primary email is in hand and verified: a matching work domain is the whole job, anything else asks for one */
  const primaryVerified = (primary: string, via: Account["via"]) => {
    const domain = primary.split("@")[1]!.toLowerCase();
    if (domain === mail.domain) return finish({ primary, via, work: primary, workStatus: "verified" });
    if (PERSONAL.test(primary)) return finish({ primary, via });
    // A company address we don't recognize for this building goes to review, not to an error
    return finish({ primary, via, work: primary, workStatus: "pending" });
  };

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL.test(email)) return setError("Enter your full email, like name@company.com.");
    setError("");
    setBusy("email");
    await wait(700);
    setBusy(null);
    setStep("code");
  };

  const checkCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) return setError("Enter the 6-digit code from the email.");
    setError("");
    setBusy("code");
    await wait(700);
    setBusy(null);
    await primaryVerified(email.trim(), "email");
  };

  const social = async (via: Exclude<Account["via"], "email">) => {
    setBusy(via);
    await wait(900);
    setBusy(null);
    // Microsoft is usually the work account; Google and Apple usually personal
    await primaryVerified(via === "microsoft" ? mail.work : mail.personal, via);
  };

  const sendWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL.test(work)) return setError("Enter your full work email.");
    if (PERSONAL.test(work)) return setError("That looks like a personal address. Use the one your company gave you.");
    setError("");
    setBusy("work");
    await wait(800);
    setBusy(null);
    setStep("work-sent");
  };

  const openWorkLink = async () => {
    setBusy("link");
    await wait(900);
    setBusy(null);
    const a = account!;
    const matched = work.split("@")[1]!.toLowerCase() === mail.domain;
    await finish({ ...a, work: work.trim(), workStatus: matched ? "verified" : "pending" });
  };

  const skipWork = () => {
    if (account && s.persona !== "public") actions.signIn(account);
    router.replace("/home");
  };

  const back = () => {
    setError("");
    setCode("");
    setStep("start");
  };

  const shown = !hydrated ? null : step;

  return (
    <div className="frame grid min-h-[100svh] gap-8 pb-tab pt-[calc(var(--nav-h)+16px)] lg:grid-cols-12 lg:pb-24">
      <div className="media relative hidden lg:col-span-6 lg:block">
        <Image src={copy.signInImg.src} alt={copy.signInImg.alt} fill sizes="50vw" className="object-cover" style={{ objectPosition: copy.signInImg.pos }} priority />
        <div className="absolute inset-0 bg-gradient-to-t from-night/75 via-night/10 to-transparent" />
        <div className="absolute inset-x-8 bottom-8 text-white">
          <p className="t-h2 max-w-[18ch]">Browse everything. Sign in when you want to book.</p>
          <p className="t-small mt-3 max-w-[40ch] text-white/75">
            One account for {building.name}. Use any email you like; confirm where you work once.
          </p>
        </div>
      </div>

      <div className="flex flex-col justify-center lg:col-span-5 lg:col-start-8">
        <Mark size={36} />
        {resume && step !== "done" && (
          <p className="t-small mt-8 flex items-center gap-2 rounded-2xl bg-fog px-4 py-3">
            <Icon name="arrow-right" size={16} />
            After this, you&apos;ll go straight back to {resume}.
          </p>
        )}

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={shown ?? "loading"}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.25, 1, 0.5, 1] }}
            className="mt-8"
          >
            {shown === null && <div className="h-80" />}

            {shown === "start" && (
              <>
                <h1 className="t-h1">Sign in to {copy.the}</h1>
                <p className="t-lead mt-4 text-stone">No password needed. We&apos;ll send a code, or use an account you already have.</p>
                <div className="mt-8 grid gap-2.5">
                  <SocialButton via="google" busy={busy} onClick={social} />
                  <SocialButton via="apple" busy={busy} onClick={social} />
                  <SocialButton via="microsoft" busy={busy} onClick={social} />
                </div>
                <div className="t-meta my-6 flex items-center gap-4">
                  <span className="h-px flex-1 bg-line" /> or with email <span className="h-px flex-1 bg-line" />
                </div>
                <form onSubmit={sendCode} noValidate>
                  <Field id="email" label="Email" value={email} onChange={setEmail} error={error} placeholder={mail.personal} autoComplete="email" type="email" />
                  <Submit busy={busy === "email"} label="Email me a code" busyLabel="Sending…" />
                </form>
              </>
            )}

            {shown === "code" && (
              <>
                <h1 className="t-h1">Check your email</h1>
                <p className="t-lead mt-4 text-stone">
                  We sent a 6-digit code to <span className="text-ink">{email}</span>. It works once, for 10 minutes.
                </p>
                <form onSubmit={checkCode} noValidate className="mt-8">
                  <label htmlFor="code" className="mb-2 block text-[0.9375rem] font-medium">
                    Code
                  </label>
                  <input
                    id="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    autoFocus
                    className="field t-num text-center text-[1.75rem] tracking-[0.5em]"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    aria-invalid={!!error}
                    aria-describedby={error ? "code-err" : "code-hint"}
                  />
                  {error ? (
                    <p id="code-err" className="t-small mt-2 text-accent">
                      {error}
                    </p>
                  ) : (
                    <p id="code-hint" className="t-meta mt-2">
                      Prototype: any six digits work.{" "}
                      <button type="button" onClick={() => setCode("428913")} className="underline underline-offset-4">
                        Fill one in
                      </button>
                    </p>
                  )}
                  <Submit busy={busy === "code"} label="Continue" busyLabel="Checking…" />
                </form>
                <button onClick={back} className="t-small mt-5 text-stone underline decoration-ink/20 underline-offset-4 hover:text-ink">
                  Use a different email
                </button>
              </>
            )}

            {shown === "work" && (
              <>
                <p className="t-meta">Signed in as {account?.primary}</p>
                <h1 className="t-h1 mt-3">Confirm you work at {copy.the}</h1>
                <p className="t-lead mt-4 text-stone">
                  Add your work email once. You&apos;ll keep signing in with the one you just used; this only unlocks what the building offers its
                  tenants.
                </p>
                <form onSubmit={sendWork} noValidate className="mt-8">
                  <Field id="work" label="Work email" value={work} onChange={setWork} error={error} placeholder={mail.work} autoComplete="work email" type="email" />
                  <Submit busy={busy === "work"} label="Send a confirmation link" busyLabel="Sending…" />
                </form>
                <button onClick={skipWork} className="t-small mt-5 text-stone underline decoration-ink/20 underline-offset-4 hover:text-ink">
                  Not now. Keep browsing without building access
                </button>
              </>
            )}

            {shown === "work-sent" && (
              <>
                <h1 className="t-h1">Open the link at work</h1>
                <p className="t-lead mt-4 text-stone">
                  We sent a link to <span className="text-ink">{work}</span>. Open it from that inbox and you&apos;re in; this page moves on by itself.
                </p>
                <button
                  onClick={openWorkLink}
                  disabled={!!busy}
                  className="mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-ink font-medium text-paper transition-colors hover:bg-ink-2"
                >
                  {busy === "link" ? <Spinner /> : <Icon name="check" size={18} />}
                  {busy === "link" ? `Checking with ${building.name}…` : "Prototype: open the link"}
                </button>
                <p className="t-meta mt-3">
                  {member.company} is on {copy.the}&apos;s tenant list at @{mail.domain}. Any other company address goes to the building team to confirm.
                </p>
              </>
            )}

            {shown === "pending" && (
              <>
                <span className="grid size-12 place-items-center rounded-full bg-accent-soft text-accent-deep">
                  <Icon name="clock" size={22} />
                </span>
                <h1 className="t-h1 mt-6">Your building access is being confirmed</h1>
                <p className="t-lead mt-4 text-stone">
                  {account?.work ? (
                    <>
                      We don&apos;t recognize <span className="text-ink">{account.work.split("@")[1]}</span> for {copy.the} yet, so
                      the building team is checking. It usually takes a working day, and we&apos;ll email you.
                    </>
                  ) : (
                    "The building team is checking. It usually takes a working day, and we'll email you."
                  )}
                </p>
                <p className="t-small mt-4 text-stone">Until then you can browse everything, and use anything that&apos;s open to the public.</p>
                <div className="mt-8 grid gap-2.5 sm:grid-cols-2">
                  <button onClick={() => router.replace("/home")} className="h-13 rounded-full bg-ink font-medium text-paper transition-colors hover:bg-ink-2">
                    Keep browsing
                  </button>
                  <button
                    onClick={() => {
                      actions.approveAccess();
                      router.replace(returnTo);
                    }}
                    className="h-13 rounded-full font-medium shadow-[inset_0_0_0_1px_var(--color-ink)] hover:bg-ink/5"
                  >
                    Prototype: approve it
                  </button>
                </div>
              </>
            )}

            {shown === "done" && (
              <div className="flex items-center gap-4">
                <span className="grid size-12 place-items-center rounded-full bg-ok-soft text-ok">
                  <Icon name="check" size={22} strokeWidth={2.2} />
                </span>
                <div>
                  <h1 className="t-h2">You&apos;re in, {member.first}.</h1>
                  <p className="t-small text-stone">{resume ? `Taking you back to ${resume}…` : "Taking you home…"}</p>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {step !== "done" && (
          <p className="t-meta mt-10 border-t hairline pt-6">
            Prototype: nothing is sent. Signing in as {member.first} {member.last}; any @{mail.domain} address is recognized as {member.company}.
          </p>
        )}
      </div>
    </div>
  );
}

function Field(props: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error: string;
  placeholder: string;
  autoComplete: string;
  type: string;
}) {
  return (
    <>
      <label htmlFor={props.id} className="mb-2 block text-[0.9375rem] font-medium">
        {props.label}
      </label>
      <input
        id={props.id}
        type={props.type}
        autoComplete={props.autoComplete}
        className="field"
        placeholder={props.placeholder}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        aria-invalid={!!props.error}
        aria-describedby={props.error ? `${props.id}-err` : undefined}
      />
      {props.error && (
        <p id={`${props.id}-err`} className="t-small mt-2 text-accent">
          {props.error}
        </p>
      )}
    </>
  );
}

function Spinner() {
  return <span className="size-4 keep-round animate-spin rounded-full border-2 border-paper/30 border-t-paper" />;
}

function Submit({ busy, label, busyLabel }: { busy: boolean; label: string; busyLabel: string }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-ink font-medium text-paper transition-colors hover:bg-ink-2"
    >
      {busy ? (
        <>
          <Spinner /> {busyLabel}
        </>
      ) : (
        <>
          {label} <Icon name="arrow-right" size={18} />
        </>
      )}
    </button>
  );
}

const PROVIDERS = {
  google: {
    label: "Continue with Google",
    glyph: (
      <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden>
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09A6.6 6.6 0 0 1 5.49 12c0-.73.13-1.43.35-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.6 10.6 0 0 0 12 1 11 11 0 0 0 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
      </svg>
    ),
  },
  apple: {
    label: "Continue with Apple",
    glyph: (
      <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden fill="currentColor">
        <path d="M16.37 1.43c0 1.14-.42 2.2-1.12 2.99-.8.9-1.98 1.6-3.02 1.52-.13-1.1.43-2.27 1.13-3.03.79-.86 2.13-1.5 3.01-1.48zM20.5 17.3c-.55 1.28-.82 1.85-1.53 2.98-.99 1.58-2.39 3.55-4.12 3.56-1.54.02-1.93-1-4.02-.99-2.08.01-2.52 1.01-4.06.99-1.73-.02-3.05-1.79-4.05-3.37C-.07 16.07-.36 10.9 1.43 8.15c1.27-1.95 3.27-3.1 5.16-3.1 1.92 0 3.12 1.05 4.71 1.05 1.54 0 2.48-1.05 4.7-1.05 1.68 0 3.46.92 4.73 2.5-4.16 2.28-3.48 8.22.77 9.75z" />
      </svg>
    ),
  },
  microsoft: {
    label: "Continue with Microsoft",
    glyph: (
      <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden>
        <path fill="#F25022" d="M1 1h10.5v10.5H1z" />
        <path fill="#7FBA00" d="M12.5 1H23v10.5H12.5z" />
        <path fill="#00A4EF" d="M1 12.5h10.5V23H1z" />
        <path fill="#FFB900" d="M12.5 12.5H23V23H12.5z" />
      </svg>
    ),
  },
} as const;

function SocialButton({
  via,
  busy,
  onClick,
}: {
  via: keyof typeof PROVIDERS;
  busy: string | null;
  onClick: (via: keyof typeof PROVIDERS) => void;
}) {
  const p = PROVIDERS[via];
  return (
    <button
      type="button"
      onClick={() => onClick(via)}
      disabled={!!busy}
      className="flex h-13 w-full items-center justify-center gap-3 rounded-full bg-paper font-medium shadow-[inset_0_0_0_1px_var(--color-line-2)] transition-shadow hover:shadow-[inset_0_0_0_1px_var(--color-ink)] disabled:opacity-60"
    >
      {busy === via ? <span className="size-4 keep-round animate-spin rounded-full border-2 border-ink/20 border-t-ink" /> : p.glyph}
      {p.label}
    </button>
  );
}
