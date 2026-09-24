import { cn } from "@/lib/cn";
import type { CommitmentStatus } from "@/lib/data/types";

type Tone = "neutral" | "ok" | "hold" | "accent" | "night" | "glass";

const tones: Record<Tone, string> = {
  neutral: "bg-fog text-ink-2",
  ok: "bg-ok-soft text-ok",
  hold: "bg-hold-soft text-hold",
  accent: "bg-redwood-soft text-redwood-deep",
  night: "bg-night-3 text-moon",
  glass: "bg-black/30 text-white backdrop-blur-md",
};

export function Pill({ tone = "neutral", dot, className, children }: { tone?: Tone; dot?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[0.8125rem] font-medium tracking-[-0.005em]", tones[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export const statusLabel: Record<CommitmentStatus, string> = {
  confirmed: "Confirmed",
  pending: "Awaiting approval",
  waitlist: "Waitlist",
  cancelled: "Cancelled",
};

export function StatusPill({ status, pos, className }: { status: CommitmentStatus; pos?: number; className?: string }) {
  const tone: Tone = status === "confirmed" ? "ok" : status === "pending" ? "hold" : status === "waitlist" ? "accent" : "neutral";
  return (
    <Pill tone={tone} dot className={className}>
      {statusLabel[status]}
      {status === "waitlist" && pos ? ` · #${pos}` : ""}
    </Pill>
  );
}
