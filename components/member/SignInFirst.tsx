"use client";

import { gateHref, gateLabel } from "@/lib/access";
import { useDemo } from "@/lib/store";
import { ButtonLink } from "@/components/ui/Button";

/**
 * A page that needs building access, for someone who doesn't have it yet: what it's for, and the one step to take.
 * The button fits who's looking: sign in, verify a work email, or check on the verification. It returns to `returnTo`.
 */
export function SignInFirst({
  title,
  lead,
  returnTo,
  verb,
  children,
}: {
  title: string;
  lead?: string;
  returnTo: string;
  verb: string;
  children?: React.ReactNode;
}) {
  const { persona } = useDemo();
  const heading = persona === "verifying" ? "Your building access is being verified." : persona === "public" ? "Add your work email to continue." : title;
  const body =
    persona === "verifying"
      ? "It usually takes a few minutes. Once it's confirmed, this is yours."
      : persona === "public"
        ? "This is for people who work in the building. Verify your work email once, and you're in."
        : lead;
  return (
    <div className="frame flex min-h-[70svh] flex-col items-start justify-center pb-16 pt-[var(--nav-h)]">
      <h1 className="t-h1 max-w-[22ch]">{heading}</h1>
      {body && <p className="t-lead mt-3 max-w-[44ch] text-stone">{body}</p>}
      <ButtonLink href={gateHref(returnTo)} className="mt-8" icon="arrow-right">
        {persona === "signed-out" ? "Sign in" : persona === "verifying" ? "See the status" : gateLabel(persona, verb)}
      </ButtonLink>
      {children}
    </div>
  );
}
