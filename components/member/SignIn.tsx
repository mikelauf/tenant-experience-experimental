"use client";

import { images } from "@/lib/data/images";
import { AnimatePresence, motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { actions, currentMember } from "@/lib/store";
import Image from "@/components/ui/SmoothImage";
import { Icon } from "@/components/ui/Icon";
import { Mark } from "@/components/ui/Logo";

function describe(path: string) {
  if (path.startsWith("/fitness")) return "reserving your class";
  if (path.startsWith("/spaces")) return "booking your room";
  if (path.startsWith("/programming")) return "your RSVP";
  if (path.startsWith("/plans")) return "your plans";
  return null;
}

export function SignIn() {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get("returnTo") ?? "/";
  // Only allow same-site paths
  const returnTo = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
  const [email, setEmail] = useState(currentMember.email);
  const [stage, setStage] = useState<"idle" | "checking" | "done">("idle");
  const [error, setError] = useState("");
  const resume = describe(returnTo);

  const go = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Use your full work email, like name@company.com.");
      return;
    }
    setError("");
    setStage("checking");
    await new Promise((r) => setTimeout(r, 1100));
    setStage("done");
    actions.signIn();
    await new Promise((r) => setTimeout(r, 450));
    router.replace(returnTo);
  };

  return (
    <div className="frame grid min-h-[100svh] gap-8 pb-tab pt-[calc(var(--nav-h)+16px)] lg:grid-cols-12 lg:pb-24">
      <div className="media relative hidden lg:col-span-6 lg:block">
        <Image src={images.lobbyCoffee.src} alt={images.lobbyCoffee.alt} fill sizes="50vw" className="object-cover" style={{ objectPosition: images.lobbyCoffee.pos }} priority />
        <div className="absolute inset-0 bg-gradient-to-t from-night/70 to-transparent" />
        <p className="t-h2 absolute bottom-8 left-8 max-w-[16ch] text-white">Your building, one sign-in away.</p>
      </div>

      <div className="flex flex-col justify-center lg:col-span-5 lg:col-start-8">
        <Mark size={36} />
        <h1 className="t-h1 mt-8">Sign in to the Pyramid</h1>
        <p className="t-lead mt-4 text-stone">Use your work email. We&apos;ll confirm it with your company&apos;s sign-in.</p>
        {resume && (
          <p className="t-small mt-6 flex items-center gap-2 rounded-2xl bg-fog px-4 py-3">
            <Icon name="arrow-right" size={16} />
            After signing in, you&apos;ll go straight back to {resume}.
          </p>
        )}

        <form onSubmit={go} className="mt-8" noValidate>
          <label htmlFor="email" className="mb-2 block text-[0.9375rem] font-medium">
            Work email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? "email-err" : undefined}
          />
          {error && (
            <p id="email-err" className="t-small mt-2 text-redwood">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={stage !== "idle"}
            className="relative mt-5 flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-ink font-medium text-paper transition-colors hover:bg-ink-2"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={stage}
                initial={{ y: 14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -14, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-2"
              >
                {stage === "idle" && (
                  <>
                    Continue <Icon name="arrow-right" size={18} />
                  </>
                )}
                {stage === "checking" && (
                  <>
                    <span className="size-4 keep-round animate-spin rounded-full border-2 border-paper/30 border-t-paper" />
                    Checking with {currentMember.company}…
                  </>
                )}
                {stage === "done" && (
                  <>
                    <Icon name="check" size={18} strokeWidth={2.2} /> Signed in
                  </>
                )}
              </motion.span>
            </AnimatePresence>
          </button>
        </form>

        <div className="mt-10 space-y-3 border-t hairline pt-6">
          <p className="t-small flex gap-2.5 text-stone">
            <Icon name="info" size={17} className="mt-0.5 shrink-0" />
            Signing in confirms you work in the building. Some services, like Pyramid Fitness, are separate memberships.
          </p>
          <p className="t-meta">
            Prototype: no real authentication. Any email signs you in as {currentMember.first} {currentMember.last}, a new member.
          </p>
        </div>
      </div>
    </div>
  );
}
