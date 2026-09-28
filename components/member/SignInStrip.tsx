"use client";

import { gateHref, gateLabel, isMember } from "@/lib/access";
import { useDemo, useHydrated } from "@/lib/store";
import { useTenant } from "@/lib/tenants/client";
import { ButtonLink } from "@/components/ui/Button";

/**
 * The foot of a service page before building access: one line on what signing in does here, and the button. It
 * comes back to this page. Members never see it; someone being verified is told they're nearly there.
 */
export function SignInStrip({ verb, returnTo, className }: { verb: string; returnTo: string; className?: string }) {
  const s = useDemo();
  const hydrated = useHydrated();
  const { copy } = useTenant();
  if (!hydrated || isMember(s.persona)) return null;
  const waiting = s.persona === "verifying";

  return (
    <section className={className} aria-label="Sign in">
      <div className="frame">
        <div className="flex flex-col gap-5 border-y hairline py-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="t-h3">{waiting ? "Your access is being verified." : `Work at ${copy.the}? Sign in to ${verb}.`}</p>
            <p className="t-small mt-1 text-stone">
              {waiting ? "You can book as soon as it's confirmed." : "An email code or Google, Apple or Microsoft, then confirm your work email once."}
            </p>
          </div>
          {!waiting && (
            <ButtonLink href={gateHref(returnTo)} icon="arrow-right" className="shrink-0">
              {s.persona === "signed-out" ? "Sign in" : gateLabel(s.persona, verb)}
            </ButtonLink>
          )}
        </div>
      </div>
    </section>
  );
}
