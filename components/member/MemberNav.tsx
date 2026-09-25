"use client";

import { motion, useAnimationControls } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";
import { cn } from "@/lib/cn";
import { useDemo, useHydrated } from "@/lib/store";
import { useTenant } from "@/lib/tenants/client";
import { Icon, type AnyIcon } from "@/components/ui/Icon";
import { Mark } from "@/components/ui/Logo";
import { useNavOver } from "@/components/ui/useNavOver";

type Item = { href: string; label: string; icon: AnyIcon; on: boolean };

/** Primary sections, filtered to the services this building has */
function useMemberNav(): Item[] {
  const { building, fitness } = useTenant();
  const on = building.services;
  return [
    { href: "/", label: "Home", icon: "home" as const, on: true },
    { href: "/spaces", label: "Spaces", icon: "spaces" as const, on: on.spaces },
    { href: "/fitness", label: "Fitness", icon: "fitness" as const, on: on.fitness && !!fitness },
    { href: "/programming", label: "Events", icon: "programming" as const, on: on.programming },
  ].filter((i) => i.on);
}

const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));

function useUpcomingCount() {
  const s = useDemo();
  const hydrated = useHydrated();
  return useMemo(
    () => (hydrated ? s.commitments.filter((c) => c.status !== "cancelled" && new Date(c.endsAt) > new Date()).length : 0),
    [s.commitments, hydrated],
  );
}

/** The Plans entry bumps when a new commitment lands in it. */
function PlansBadge({ count, className }: { count: number; className?: string }) {
  const controls = useAnimationControls();
  useEffect(() => {
    const bump = () => controls.start({ scale: [1, 1.35, 0.92, 1], transition: { duration: 0.6, ease: [0.34, 1.4, 0.64, 1] } });
    window.addEventListener("plans:bump", bump);
    return () => window.removeEventListener("plans:bump", bump);
  }, [controls]);
  if (!count) return null;
  return (
    <motion.span
      animate={controls}
      className={cn(
        "grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[0.6875rem] font-semibold tabular-nums text-paper",
        className,
      )}
    >
      {count}
    </motion.span>
  );
}

export function MemberTopNav() {
  const path = usePathname();
  const s = useDemo();
  const hydrated = useHydrated();
  const { over, scrolled } = useNavOver();
  const count = useUpcomingCount();
  const signedIn = hydrated && s.persona !== "signed-out";
  const memberNav = useMemberNav();
  const { building, member } = useTenant();

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,color,box-shadow,backdrop-filter] duration-500",
        over ? "text-white" : "text-ink",
        !over && scrolled
          ? "bg-quartz/82 shadow-[0_1px_0_var(--color-line)] backdrop-blur-xl"
          : !over
            ? "bg-quartz"
            : scrolled
              ? "bg-night/35 backdrop-blur-xl"
              : "bg-transparent",
      )}
    >
      <div className="frame flex h-[var(--nav-h)] items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label={`${building.name}, member home`}>
          <Mark size={24} />
          <span className="flex flex-col leading-none">
            <span className="text-[1.0625rem] font-semibold tracking-[-0.03em] [font-stretch:88%]">{building.name}</span>
            <span className="mt-1 hidden text-[0.72rem] font-medium opacity-60 sm:block">Members · Experience by Playbook</span>
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className={cn("flex items-center gap-1 rounded-full p-1", over ? "bg-white/10 backdrop-blur-md" : "bg-ink/[0.04]")}>
            {memberNav.map((i) => {
              const on = isActive(path, i.href);
              return (
                <li key={i.href} className="relative">
                  {on && (
                    <motion.span
                      layoutId="nav-pill"
                      className={cn("absolute inset-0 rounded-full", over ? "bg-white" : "bg-paper shadow-[var(--shadow-ring)]")}
                      transition={{ type: "spring", stiffness: 420, damping: 36 }}
                    />
                  )}
                  <Link
                    href={i.href}
                    aria-current={on ? "page" : undefined}
                    className={cn(
                      "relative block rounded-full px-4 py-2 text-[0.9375rem] font-medium transition-colors",
                      on ? "text-ink" : over ? "text-white/80 hover:text-white" : "text-stone hover:text-ink",
                    )}
                  >
                    {i.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/plans"
            data-plans-target
            className={cn(
              "hidden h-10 items-center gap-2 rounded-full px-4 text-[0.9375rem] font-medium transition-colors lg:inline-flex",
              isActive(path, "/plans") ? (over ? "bg-white text-ink" : "bg-ink text-paper") : over ? "hover:bg-white/10" : "hover:bg-ink/5",
            )}
          >
            <Icon name="plans" size={18} />
            Plans
            <PlansBadge count={count} />
          </Link>
          {signedIn ? (
            <Link
              href="/account"
              aria-label="Your account"
              className={cn(
                "grid size-10 place-items-center rounded-full text-[0.8125rem] font-semibold",
                over ? "bg-white/15 text-white backdrop-blur-md" : "bg-ink text-paper",
              )}
            >
              {member.first[0]}
              {member.last[0]}
            </Link>
          ) : (
            <Link
              href={`/sign-in?returnTo=${encodeURIComponent(path)}`}
              className={cn("inline-flex h-10 items-center rounded-full px-4 text-[0.9375rem] font-medium", over ? "bg-white text-ink" : "bg-ink text-paper")}
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export function MemberTabBar() {
  const path = usePathname();
  const count = useUpcomingCount();
  const items: Item[] = [...useMemberNav(), { href: "/plans", label: "Plans", icon: "plans", on: true }];

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t hairline bg-paper/88 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      <ul className="grid h-[var(--tab-h)]" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((i) => {
          const on = isActive(path, i.href);
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                aria-current={on ? "page" : undefined}
                data-plans-target={i.href === "/plans" ? true : undefined}
                className={cn(
                  "relative flex h-full flex-col items-center justify-center gap-1 text-[0.72rem] font-medium transition-colors",
                  on ? "text-ink" : "text-stone-2",
                )}
              >
                <span className="relative">
                  {on && (
                    <motion.span
                      layoutId="tab-pill"
                      className="absolute -inset-x-3.5 -inset-y-1 rounded-full bg-fog"
                      transition={{ type: "spring", stiffness: 420, damping: 36 }}
                    />
                  )}
                  <Icon name={i.icon} size={22} className="relative" strokeWidth={on ? 1.8 : 1.5} />
                  {i.href === "/plans" && <PlansBadge count={count} className="absolute -right-2.5 -top-1.5" />}
                </span>
                {i.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
