"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import { classSeats, reserveClass } from "@/lib/commit";
import type { ClassSession } from "@/lib/data/types";
import { useDemo, useHydrated } from "@/lib/store";
import { useNow } from "@/lib/useNow";
import { Icon } from "@/components/ui/Icon";

export type ClassState = "signin" | "access" | "reserved" | "waitlisted" | "waitlist" | "reserve" | "past";

export function useClassState(c: ClassSession): { state: ClassState; left: number; cap: number; taken: number; pos?: number; commitmentId?: string } {
  const s = useDemo();
  const hydrated = useHydrated();
  const now = useNow(60000);
  const { cap, taken, left, full, mine } = classSeats(s, c);
  const base = { left, cap, taken, pos: mine?.waitlistPos, commitmentId: mine?.id };
  if (hydrated && new Date(c.startsAt).getTime() < now) return { state: "past", ...base };
  if (!hydrated || s.persona === "signed-out") return { state: "signin", ...base };
  if (mine?.status === "confirmed") return { state: "reserved", ...base };
  if (mine?.status === "waitlist") return { state: "waitlisted", ...base };
  if (!s.fitnessMember) return { state: "access", ...base };
  return { state: full ? "waitlist" : "reserve", ...base };
}

/** One button that always shows the next action that can actually work. */
export function ClassAction({ c, size = "md", className, returnTo }: { c: ClassSession; size?: "md" | "lg"; className?: string; returnTo: string }) {
  const { state, pos } = useClassState(c);
  const h = size === "lg" ? "h-13 px-6 text-base" : "h-10 px-4 text-[0.875rem]";
  const base = cn(
    "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full font-medium transition-[background-color,color,transform] duration-200 active:scale-[0.97]",
    h,
    className,
  );

  if (state === "past") return <span className={cn(base, "bg-fog text-stone-2")}>Ended</span>;
  if (state === "signin")
    return (
      <Link
        href={`/sign-in?returnTo=${encodeURIComponent(returnTo)}`}
        className={cn(base, "bg-ink text-paper hover:bg-ink-2")}
        onClick={(e) => e.stopPropagation()}
      >
        Sign in to reserve
      </Link>
    );
  if (state === "access")
    return (
      <Link
        href={`/account/membership?returnTo=${encodeURIComponent(returnTo)}`}
        className={cn(base, "shadow-[inset_0_0_0_1px_var(--color-ink)] hover:bg-ink/5")}
        onClick={(e) => e.stopPropagation()}
      >
        <Icon name="lock" size={15} />
        Get fitness access
      </Link>
    );
  if (state === "reserved")
    return (
      <span className={cn(base, "bg-ok-soft text-ok")}>
        <Icon name="check" size={16} strokeWidth={2.2} />
        Reserved
      </span>
    );
  if (state === "waitlisted") return <span className={cn(base, "bg-redwood-soft text-redwood-deep")}>Waitlist #{pos}</span>;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        reserveClass(c, state === "waitlist");
      }}
      className={cn(
        base,
        state === "waitlist"
          ? "bg-paper text-ink shadow-[inset_0_0_0_1px_var(--color-line-2)] hover:shadow-[inset_0_0_0_1px_var(--color-ink)]"
          : "bg-redwood text-paper hover:bg-redwood-deep",
      )}
    >
      {state === "waitlist" ? "Join waitlist" : "Reserve"}
    </button>
  );
}
