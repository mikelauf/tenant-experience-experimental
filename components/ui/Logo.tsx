import { cn } from "@/lib/cn";

/** The building's mark: a tapered pyramid with its two wings. */
export function Mark({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg width={size * 0.62} height={size} viewBox="0 0 20 32" fill="none" className={className} aria-hidden>
      <path d="M10 0 L10.9 7 L16.5 31 H3.5 L9.1 7 Z" fill="currentColor" />
      <path d="M8.3 12.5 L6.2 21.5 L8 21.5 Z M11.7 12.5 L13.8 21.5 L12 21.5 Z" fill="currentColor" opacity="0.55" />
    </svg>
  );
}

export function Logo({ className, sub }: { className?: string; sub?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Mark size={24} />
      <span className="flex flex-col leading-none">
        <span className="text-[1.0625rem] font-semibold tracking-[-0.03em] [font-stretch:88%]">Transamerica Pyramid</span>
        {sub && <span className="mt-1 text-[0.72rem] font-medium tracking-[-0.005em] opacity-60">{sub}</span>}
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
