"use client";

import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";

/** The inquiry's two building blocks: a labeled field with its error, and a row of one-tap choices. */

export function Field({
  id,
  label,
  optional,
  error,
  hint,
  children,
  className,
}: {
  id: string;
  label: string;
  optional?: boolean;
  error?: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 flex items-baseline justify-between text-[0.9375rem] font-medium">
        {label}
        {optional && <span className="t-meta font-normal">Optional</span>}
      </label>
      {children}
      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            id={`${id}-error`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="t-small flex items-start gap-1.5 overflow-hidden pt-2 text-accent"
          >
            <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>
      {hint && !error && <p className="t-meta pt-2">{hint}</p>}
    </div>
  );
}

export function Chips({
  name,
  options,
  value,
  onChange,
  invalid,
}: {
  name: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={name} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value === o;
        return (
          <button
            type="button"
            role="radio"
            aria-checked={on}
            key={o}
            onClick={() => onChange(on ? "" : o)}
            className={cn(
              "h-10 rounded-full px-4 text-[0.875rem] font-medium transition-[background-color,color,box-shadow] duration-200",
              on
                ? "bg-ink text-paper"
                : invalid
                  ? "bg-ink/[0.05] text-ink-2 shadow-[inset_0_0_0_1.5px_var(--color-accent)]"
                  : "bg-ink/[0.05] text-ink-2 hover:bg-ink/[0.1]",
            )}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}
