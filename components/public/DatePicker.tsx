"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";

/** Local calendar dates as "YYYY-MM-DD", never through UTC, so the day never shifts. */
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parse = (s: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, Math.min(d.getDate(), 28));
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/** "Thu, Nov 12, 2026" for a "YYYY-MM-DD" value */
export const formatDate = (s: string) =>
  parse(s)?.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) ?? s;

/**
 * A date field with its own calendar: a popover on desktop, a sheet on phones. Past days are disabled.
 * Keyboard: arrows move by day or week, Page Up/Down by month, Home/End to the week's edges,
 * Enter or Space picks, Escape closes.
 */
export function DatePicker({
  id,
  value,
  onChange,
  invalid,
  describedBy,
  placeholder = "Choose a date",
  className,
  compact,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  describedBy?: string;
  placeholder?: string;
  className?: string;
  /** Borderless, for use inside a card field */
  compact?: boolean;
}) {
  const auto = useId();
  const fieldId = id ?? auto;
  const [open, setOpen] = useState(false);
  const today = useMemo(() => startOfDay(new Date()), []);
  const selected = parse(value);
  const [focus, setFocus] = useState<Date>(selected ?? today);
  const root = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  // Close on outside click; keep keyboard focus on the focused day while open.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);
  useEffect(() => {
    if (open) grid.current?.querySelector<HTMLButtonElement>(`[data-day="${iso(focus)}"]`)?.focus();
  }, [open, focus]);

  const openAt = () => {
    setFocus(selected ?? today);
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  const pick = (d: Date) => {
    if (d < today) return;
    onChange(iso(d));
    close();
  };

  const month = new Date(focus.getFullYear(), focus.getMonth(), 1);
  const lead = month.getDay();
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
  while (cells.length % 7) cells.push(null);
  const canGoBack = month > new Date(today.getFullYear(), today.getMonth(), 1);

  const onKey = (e: React.KeyboardEvent) => {
    const moves: Record<string, () => Date> = {
      ArrowLeft: () => addDays(focus, -1),
      ArrowRight: () => addDays(focus, 1),
      ArrowUp: () => addDays(focus, -7),
      ArrowDown: () => addDays(focus, 7),
      PageUp: () => addMonths(focus, -1),
      PageDown: () => addMonths(focus, 1),
      Home: () => addDays(focus, -focus.getDay()),
      End: () => addDays(focus, 6 - focus.getDay()),
    };
    if (moves[e.key]) {
      e.preventDefault();
      const next = moves[e.key]();
      setFocus(next < today ? today : next);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  const calendar = (
    <div onKeyDown={onKey}>
      <div className="flex items-center justify-between pb-3">
        <button
          type="button"
          onClick={() => setFocus(addMonths(focus, -1))}
          disabled={!canGoBack}
          aria-label="Previous month"
          className="grid size-9 place-items-center rounded-full hover:bg-fog disabled:opacity-30"
        >
          <Icon name="chevron-left" size={18} />
        </button>
        <p className="font-medium" aria-live="polite">
          {month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </p>
        <button type="button" onClick={() => setFocus(addMonths(focus, 1))} aria-label="Next month" className="grid size-9 place-items-center rounded-full hover:bg-fog">
          <Icon name="chevron-right" size={18} />
        </button>
      </div>
      <div role="grid" ref={grid} aria-label={month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}>
        <div role="row" className="grid grid-cols-7 pb-1">
          {WEEK.map((d) => (
            <span key={d} role="columnheader" className="t-meta grid h-8 place-items-center">
              {d}
            </span>
          ))}
        </div>
        {Array.from({ length: cells.length / 7 }, (_, r) => (
          <div role="row" key={r} className="grid grid-cols-7">
            {cells.slice(r * 7, r * 7 + 7).map((d, c) => {
              if (!d) return <span key={c} role="gridcell" />;
              const past = d < today;
              const on = !!selected && iso(d) === iso(selected);
              const isToday = iso(d) === iso(today);
              const focused = iso(d) === iso(focus);
              return (
                <span key={c} role="gridcell" aria-selected={on}>
                  <button
                    type="button"
                    data-day={iso(d)}
                    tabIndex={focused ? 0 : -1}
                    disabled={past}
                    onClick={() => pick(d)}
                    aria-label={d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                    className={cn(
                      "keep-round relative mx-auto grid size-10 place-items-center rounded-full text-[0.9375rem] tabular-nums transition-colors",
                      on ? "bg-ink font-medium text-paper" : past ? "text-stone-2/60" : "hover:bg-fog",
                      isToday && !on && "font-semibold text-accent",
                    )}
                  >
                    {d.getDate()}
                  </button>
                </span>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between border-t hairline pt-3">
        <button type="button" onClick={() => pick(today)} className="t-small font-medium underline-offset-2 hover:underline">
          Today
        </button>
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              close();
            }}
            className="t-small text-stone underline-offset-2 hover:underline"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div ref={root} className={cn("relative", className)}>
      <button
        ref={trigger}
        id={fieldId}
        type="button"
        onClick={() => (open ? close() : openAt())}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-describedby={describedBy}
        className={cn(
          "flex w-full items-center justify-between gap-3 text-left",
          compact ? "mt-0.5 bg-transparent text-[0.9375rem] outline-none" : "field",
          !value && "text-stone",
          invalid && !compact && "shadow-[inset_0_0_0_1.5px_var(--color-accent)]",
        )}
      >
        <span>{value ? formatDate(value) : placeholder}</span>
        <Icon name="calendar" size={18} className="shrink-0 text-stone" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            {/* Phones: a sheet from the bottom. Desktop: a popover under the field. */}
            <motion.div
              className="fixed inset-0 z-[80] bg-night/40 sm:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={close}
              aria-hidden
            />
            <motion.div
              role="dialog"
              aria-label="Choose a date"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "z-[81] bg-paper p-4 shadow-[var(--shadow-float)]",
                "fixed inset-x-0 bottom-0 rounded-t-[24px] pb-[calc(env(safe-area-inset-bottom)+16px)]",
                "sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:top-[calc(100%+8px)] sm:w-[320px] sm:rounded-[var(--radius-card)] sm:pb-4",
              )}
              data-lenis-prevent
            >
              {calendar}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
