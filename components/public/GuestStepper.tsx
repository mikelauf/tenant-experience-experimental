"use client";

import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";

const MAX = 100_000;
const STEP = 10;

/**
 * A guest count you can type, or nudge by ten. Whole numbers from 1 to 100,000; empty is allowed
 * while typing so people can clear and retype.
 */
export function GuestStepper({
  id,
  value,
  onChange,
  invalid,
  describedBy,
  className,
  compact,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  describedBy?: string;
  className?: string;
  /** Borderless number, for use inside a card field */
  compact?: boolean;
}) {
  const n = Number(value) || 0;
  // Buttons snap to the next ten: 73 goes up to 80 and down to 70.
  const nudge = (d: number) => {
    const next = d > 0 ? Math.floor(n / STEP) * STEP + STEP : Math.ceil(n / STEP) * STEP - STEP;
    onChange(String(Math.min(MAX, Math.max(1, next))));
  };

  return (
    <div className={cn("flex items-center gap-3", !compact && "field py-0 pr-1.5", className)}>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        placeholder="e.g. 80"
        value={value}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^\d]/g, "").slice(0, 6);
          onChange(digits === "" ? "" : String(Math.min(MAX, Number(digits))));
        }}
        className={cn(
          "t-num min-w-0 flex-1 bg-transparent outline-none placeholder:font-normal placeholder:tracking-normal placeholder:text-stone-2",
          compact ? "text-[1.125rem] font-medium" : "h-12 text-[1.0625rem]",
        )}
      />
      <span className="flex shrink-0 items-center gap-2">
        {[-STEP, STEP].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => nudge(d)}
            disabled={d < 0 && n <= 1}
            aria-label={d < 0 ? `${STEP} fewer guests` : `${STEP} more guests`}
            className="grid size-9 place-items-center rounded-full shadow-[inset_0_0_0_1px_var(--color-line-2)] hover:bg-fog disabled:opacity-40"
          >
            <Icon name={d < 0 ? "minus" : "plus"} size={16} />
          </button>
        ))}
      </span>
    </div>
  );
}
