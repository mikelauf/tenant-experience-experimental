"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

const navTop = () => (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 68) + 16;
/** How much scrolling each stop gets, as a share of the window's height */
const STEP = 0.5;

function scrollBy(delta: number, smooth: boolean) {
  const lenis = window.__lenis;
  if (lenis) lenis.scrollTo(lenis.animatedScroll + delta, smooth ? { duration: 0.7 } : { immediate: true, force: true });
  else window.scrollTo({ top: window.scrollY + delta, behavior: smooth ? "smooth" : "instant" });
}

/**
 * The scroll tour: the stage pins under the nav and the page's own scroll rides it through every stop, once.
 * Scrolling stays native (no wheel hijacking); stops settle gently when you pause between them. Any choice the
 * visitor makes, skipping, or scrolling past the end retires the tour, and the page is re-measured so nothing
 * on screen moves when the extra scroll room goes away.
 * `enabled` means the layout suits a tour (measured, desktop, motion allowed); it runs while enabled, until retired.
 */
export function useTour({
  enabled,
  count,
  stageRef,
  onStop,
}: {
  enabled: boolean;
  count: number;
  stageRef: RefObject<HTMLDivElement | null>;
  onStop: (i: number) => void;
}) {
  const runwayRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const [retired, setRetired] = useState(false);
  const touring = enabled && !retired;
  const [vh, setVh] = useState(800);
  const last = useRef(-1);
  const pending = useRef<{ before: number; skip: boolean } | null>(null);
  const stopRef = useRef(onStop);
  useEffect(() => {
    stopRef.current = onStop;
  }, [onStop]);

  const extra = (count - 1) * Math.round(vh * STEP);

  const end = useCallback(
    (skip = false) => {
      if (!touring) return;
      pending.current = { before: stageRef.current?.getBoundingClientRect().top ?? 0, skip };
      setRetired(true);
    },
    [touring, stageRef],
  );

  useEffect(() => {
    const on = () => setVh(window.innerHeight);
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  // The runway just collapsed: put the stage back exactly where it was on screen, then skip on if asked
  useLayoutEffect(() => {
    const p = pending.current;
    const el = stageRef.current;
    if (touring || !p || !el) return;
    pending.current = null;
    scrollBy(el.getBoundingClientRect().top - p.before, false);
    if (p.skip) requestAnimationFrame(() => scrollBy(el.getBoundingClientRect().bottom - navTop() + 24, true));
  }, [touring, stageRef]);

  // Scroll → stop. Settles on the nearest stop a moment after the visitor stops scrolling.
  useEffect(() => {
    if (!touring) return;
    let settle = 0;
    const read = () => {
      const r = runwayRef.current?.getBoundingClientRect();
      if (!r) return null;
      const d = navTop() - r.top;
      return { d, p: Math.min(1, Math.max(0, d / extra)) };
    };
    const onScroll = () => {
      const s = read();
      if (!s) return;
      if (barRef.current) barRef.current.style.transform = `scaleY(${s.p})`;
      const i = Math.round(s.p * (count - 1));
      if (i !== last.current) {
        last.current = i;
        stopRef.current(i);
      }
      if (s.d > extra + 40) return end();
      clearTimeout(settle);
      settle = window.setTimeout(() => {
        const n = read();
        if (!n || n.d <= 0 || n.d >= extra) return;
        const target = (Math.round(n.p * (count - 1)) / (count - 1)) * extra;
        if (Math.abs(target - n.d) > 4) scrollBy(target - n.d, true);
      }, 220);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(settle);
    };
  }, [touring, extra, count, end]);

  return { runwayRef, barRef, touring, extra, end };
}
