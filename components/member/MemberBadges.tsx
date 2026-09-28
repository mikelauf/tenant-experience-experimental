"use client";

import { isMember } from "@/lib/access";
import { cn } from "@/lib/cn";
import { useDemo, useHydrated } from "@/lib/store";
import { useTenant } from "@/lib/tenants/client";
import { Icon, type AnyIcon } from "@/components/ui/Icon";

/**
 * What a member can do here, as small tags: building access for everyone verified, plus the fitness membership when
 * they have it. Quiet on purpose: a hint that booking is open to them, not a banner.
 */
export function MemberBadges({ tone = "night", className }: { tone?: "night" | "day"; className?: string }) {
  const s = useDemo();
  const hydrated = useHydrated();
  const t = useTenant();
  if (!hydrated || !isMember(s.persona)) return null;

  const list: { icon: AnyIcon; label: string; dot: string }[] = [
    { icon: "shield", label: `Member · ${t.member.company}`, dot: "text-[#5fc08f]" },
    ...(t.fitness && s.fitnessMember ? [{ icon: "fitness" as AnyIcon, label: "Fitness member", dot: "text-accent-glow" }] : []),
  ];

  return (
    <ul className={cn("flex flex-wrap gap-2", className)} aria-label="Your access">
      {list.map((b) => (
        <li
          key={b.label}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-full pl-2 pr-3 text-[0.8125rem] font-medium",
            tone === "night"
              ? "bg-white/10 text-moon shadow-[inset_0_0_0_1px_rgb(255_255_255/0.16)] backdrop-blur-md"
              : "bg-paper text-ink shadow-[var(--shadow-ring)]",
          )}
        >
          <Icon name={b.icon} size={15} strokeWidth={1.8} className={b.dot} />
          {b.label}
        </li>
      ))}
    </ul>
  );
}
