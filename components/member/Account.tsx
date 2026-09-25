"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { actions, useDemo, useHydrated } from "@/lib/store";
import { useTenant } from "@/lib/tenants/client";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon, type AnyIcon } from "@/components/ui/Icon";
import { Pill } from "@/components/ui/Pill";

function SignedOutNote({ returnTo }: { returnTo: string }) {
  return (
    <div className="frame flex min-h-[70svh] flex-col items-start justify-center pt-[var(--nav-h)]">
      <h1 className="t-h1">Sign in to see your account.</h1>
      <p className="t-lead mt-3 text-stone">Your access, memberships and plans live here.</p>
      <ButtonLink href={`/sign-in?returnTo=${encodeURIComponent(returnTo)}`} className="mt-8" icon="arrow-right">
        Sign in
      </ButtonLink>
    </div>
  );
}

export function Account() {
  const s = useDemo();
  const hydrated = useHydrated();
  const { member: currentMember, fitness, building, copy } = useTenant();
  if (!hydrated) return <div className="min-h-[80svh]" />;
  if (s.persona === "signed-out") return <SignedOutNote returnTo="/account" />;

  const access: { icon: AnyIcon; t: string; d: string; on: boolean; href?: string; cta?: string }[] = [
    { icon: "access", t: "Building access", d: `${currentMember.company} · ${currentMember.floor}. Rooms, events and the concierge.`, on: true },
    ...(fitness
      ? [
          {
            icon: "fitness" as const,
            t: fitness.membership.name,
            d: s.fitnessMember ? `${fitness.membership.price} · renews on the 1st (sample)` : "Classes, studio bookings and recovery.",
            on: s.fitnessMember,
            href: "/account/membership",
            cta: s.fitnessMember ? "Manage" : "Start membership",
          },
        ]
      : []),
    { icon: "star", t: "VIP list", d: "Invitations to chef's tables and previews. Ask the concierge.", on: false },
  ];

  return (
    <div className="frame pb-tab pt-[calc(var(--nav-h)+40px)] lg:pb-28 lg:pt-[calc(var(--nav-h)+64px)]">
      <div className="grid-12 gap-y-10">
        <div className="col-span-12 lg:col-span-4">
          <div className="lg:sticky lg:top-[calc(var(--nav-h)+32px)]">
            <span className="grid size-20 place-items-center rounded-full bg-ink text-[1.5rem] font-semibold text-paper">
              {currentMember.first[0]}
              {currentMember.last[0]}
            </span>
            <h1 className="t-h1 mt-6">
              {currentMember.first} {currentMember.last}
            </h1>
            <p className="t-body mt-2 text-stone">{currentMember.email}</p>
            <p className="t-body text-stone">
              {currentMember.company} · {currentMember.floor}
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              <ButtonLink href="/plans" iconLeft="plans">
                Your plans
              </ButtonLink>
              <Button variant="ghost" onClick={() => actions.signOut()}>
                Sign out
              </Button>
            </div>
          </div>
        </div>

        <div className="col-span-12 space-y-14 lg:col-span-7 lg:col-start-6">
          <section aria-labelledby="acc-access">
            <h2 id="acc-access" className="t-h2">
              Access & memberships
            </h2>
            <ul className="mt-6 divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-paper shadow-[var(--shadow-ring)]">
              {access.map((a) => (
                <li key={a.t} className="flex items-center gap-4 p-5">
                  <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl", a.on ? "bg-ok-soft text-ok" : "bg-fog text-stone")}>
                    <Icon name={a.icon} size={21} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{a.t}</p>
                      {a.on ? (
                        <Pill tone="ok" dot>
                          Active
                        </Pill>
                      ) : (
                        <Pill>Not active</Pill>
                      )}
                    </div>
                    <p className="t-small mt-0.5 text-stone">{a.d}</p>
                  </div>
                  {a.href && (
                    <Link href={a.href} className="shrink-0 text-[0.9375rem] font-medium underline decoration-ink/25 underline-offset-4 hover:decoration-ink">
                      {a.cta}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="acc-notify">
            <h2 id="acc-notify" className="t-h2">
              Notifications
            </h2>
            <ul className="mt-6 divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-paper shadow-[var(--shadow-ring)]">
              {(
                [
                  ["reminders", "Reminders", "An hour before classes and bookings"],
                  ["events", "New events", "When the building announces something"],
                  ["digest", "Weekly digest", "Monday morning, what's on this week"],
                ] as const
              ).map(([k, t, d]) => (
                <li key={k}>
                  <label className="flex cursor-pointer items-center justify-between gap-4 p-5">
                    <span>
                      <span className="block font-medium">{t}</span>
                      <span className="t-small block text-stone">{d}</span>
                    </span>
                    <input type="checkbox" className="peer sr-only" checked={s.notify[k]} onChange={(e) => actions.setNotify(k, e.target.checked)} />
                    <span className="relative h-7 w-12 shrink-0 rounded-full bg-line-2 transition-colors peer-checked:bg-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent after:absolute after:left-1 after:top-1 after:size-5 after:rounded-full after:bg-paper after:shadow after:transition-transform after:duration-300 peer-checked:after:translate-x-5" />
                  </label>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-[var(--radius-card)] bg-fog/70 p-5">
            <p className="t-small text-stone">
              Need help with access or billing? The concierge is on {copy.concierge}, {building.concierge.hours.toLowerCase()}, or at {building.concierge.phone}
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

export function MembershipFlow() {
  const s = useDemo();
  const hydrated = useHydrated();
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get("returnTo") ?? "/fitness";
  const returnTo = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/fitness";
  const [stage, setStage] = useState<"idle" | "working" | "done">("idle");
  const [billing, setBilling] = useState<"company" | "card">("company");
  const { member: currentMember, fitness } = useTenant();
  const membership = fitness!.membership;

  if (!hydrated) return <div className="min-h-[80svh]" />;
  if (s.persona === "signed-out") return <SignedOutNote returnTo={`/account/membership?returnTo=${encodeURIComponent(returnTo)}`} />;

  const start = async () => {
    setStage("working");
    await new Promise((r) => setTimeout(r, 1000));
    actions.setFitness(true);
    setStage("done");
  };

  return (
    <div className="frame pb-tab pt-[calc(var(--nav-h)+40px)] lg:pb-28 lg:pt-[calc(var(--nav-h)+64px)]">
      <Link href="/account" className="t-small inline-flex items-center gap-1.5 text-stone hover:text-ink">
        <Icon name="arrow-left" size={16} /> Account
      </Link>
      <div className="grid-12 mt-6 gap-y-10">
        <div className="col-span-12 lg:col-span-5">
          <h1 className="t-hero">{s.fitnessMember && stage !== "done" ? "Your membership" : membership.name}</h1>
          <p className="t-lead mt-4 text-stone">
            {s.fitnessMember ? `Active. Everything on L${fitness!.level} is open to you.` : `${membership.price}. Cancel any time.`}
          </p>
          <ul className="mt-8 space-y-3">
            {membership.perks.map((p) => (
              <li key={p} className="flex items-center gap-3">
                <span className="grid size-6 place-items-center rounded-full bg-ok-soft text-ok">
                  <Icon name="check" size={13} strokeWidth={2.2} />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>

        <div className="col-span-12 lg:col-span-6 lg:col-start-7">
          <div className="rounded-[var(--radius-media)] bg-paper p-6 shadow-[var(--shadow-soft)] sm:p-8">
            {stage === "done" ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <span className="grid size-14 place-items-center rounded-full bg-ok text-paper">
                  <Icon name="check" size={26} strokeWidth={2} />
                </span>
                <p className="t-h2 mt-6">You&apos;re a member.</p>
                <p className="t-body mt-2 text-stone">Nothing was charged. This is a prototype.</p>
                <Button className="mt-8 w-full" size="lg" icon="arrow-right" onClick={() => router.replace(returnTo)}>
                  {returnTo.includes("class=") ? "Back to your class" : "Continue"}
                </Button>
              </motion.div>
            ) : s.fitnessMember ? (
              <div>
                <p className="t-meta">Billing</p>
                <p className="t-h3 mt-2">Through {currentMember.company}</p>
                <p className="t-small mt-1 text-stone">Your company covers half; the rest is on payroll (sample arrangement).</p>
                <div className="mt-8 flex flex-col gap-2">
                  <Button
                    variant="outline"
                    iconLeft="external"
                    onClick={() => actions.toast({ title: "Billing portal (simulated)", body: "In the real product this opens the payment provider." })}
                  >
                    Open billing portal
                  </Button>
                  <Button variant="ghost" className="text-accent" onClick={() => actions.setFitness(false)}>
                    End membership
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <p className="font-medium">How would you like to pay?</p>
                <div role="radiogroup" className="mt-4 grid gap-2">
                  {(
                    [
                      ["company", `Through ${currentMember.company}`, "Your company covers half (sample)"],
                      ["card", "Personal card", `${membership.price}, billed monthly`],
                    ] as const
                  ).map(([k, t, d]) => (
                    <button
                      key={k}
                      role="radio"
                      aria-checked={billing === k}
                      onClick={() => setBilling(k)}
                      className={cn(
                        "flex items-center justify-between rounded-[var(--radius-card)] p-4 text-left transition-shadow",
                        billing === k ? "shadow-[inset_0_0_0_2px_var(--color-ink)]" : "shadow-[inset_0_0_0_1px_var(--color-line-2)]",
                      )}
                    >
                      <span>
                        <span className="block font-medium">{t}</span>
                        <span className="t-small block text-stone">{d}</span>
                      </span>
                      <span
                        className={cn("grid size-5 place-items-center rounded-full border", billing === k ? "border-ink bg-ink text-paper" : "border-line-2")}
                      >
                        {billing === k && <Icon name="check" size={12} strokeWidth={2.5} />}
                      </span>
                    </button>
                  ))}
                </div>
                <Button className="mt-6 w-full" size="lg" variant="accent" onClick={start} disabled={stage === "working"}>
                  {stage === "working" ? "Setting you up…" : "Start membership"}
                </Button>
                <p className="t-meta mt-3 text-center">Simulated. No payment is taken.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
