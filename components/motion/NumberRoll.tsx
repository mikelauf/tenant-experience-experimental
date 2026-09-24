"use client";

import { animate, useInView, useMotionValue, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

type Props = {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  /** Start from 0 when first scrolled into view. */
  fromZero?: boolean;
  duration?: number;
  className?: string;
  format?: (n: number) => string;
};

/** Eases between numbers. Tabular figures keep the width steady while it moves. */
export function NumberRoll({ value, decimals = 0, prefix = "", suffix = "", fromZero, duration = 0.9, className, format }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = useReducedMotion();
  const mv = useMotionValue(fromZero ? 0 : value);

  const fmt = (n: number) =>
    format ? format(n) : prefix + n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const unsub = mv.on("change", (v) => (el.textContent = fmt(v)));
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mv, decimals, prefix, suffix, format]);

  useEffect(() => {
    if (fromZero && !inView) return;
    if (reduce) {
      mv.set(value);
      return;
    }
    const c = animate(mv, value, { duration, ease: [0.16, 1, 0.3, 1] });
    return () => c.stop();
  }, [value, inView, fromZero, reduce, duration, mv]);

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {fmt(fromZero ? 0 : value)}
    </span>
  );
}
