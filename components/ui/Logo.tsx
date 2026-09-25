"use client";

import { cn } from "@/lib/cn";
import { useTenant } from "@/lib/tenants/client";

/** The building's mark: its silhouette, from the tenant's own paths. */
export function Mark({ size = 22, className }: { size?: number; className?: string }) {
  const { mark } = useTenant();
  return (
    <svg width={size * 0.62} height={size} viewBox="0 0 20 32" fill="none" className={className} aria-hidden>
      {mark.paths.map((p) => (
        <path key={p.d} d={p.d} fill="currentColor" opacity={p.opacity} />
      ))}
    </svg>
  );
}

/** Mark plus the building's name, with an optional line under it */
export function Logo({ className, sub, subClassName }: { className?: string; sub?: string; subClassName?: string }) {
  const { building } = useTenant();
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Mark size={24} />
      <span className="flex flex-col leading-none">
        <span className="text-[1.0625rem] font-semibold tracking-[-0.03em] [font-stretch:88%]">{building.name}</span>
        {sub && <span className={cn("mt-1 text-[0.72rem] font-medium tracking-[-0.005em] opacity-60", subClassName)}>{sub}</span>}
      </span>
    </span>
  );
}

export function PoweredBy({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[0.8125rem] opacity-70", className)}>
      Experience by
      <span className="font-semibold tracking-[-0.02em]">Playbook</span>
    </span>
  );
}
