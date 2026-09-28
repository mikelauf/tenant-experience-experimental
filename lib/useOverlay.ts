"use client";

import { useEffect, useRef } from "react";

/** Open overlays, innermost last. Only the top one answers Escape and keeps focus; the page unlocks when the last closes. */
const stack: symbol[] = [];

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Everything a modal overlay (sheet, dialog, gallery) needs while it's open: the page stops scrolling (Lenis too),
 * Escape closes it, Tab stays inside `panel`, and focus goes to `panel` on open and back where it was on close.
 *
 * Overlays nest: a sheet over a dialog closes on its own Escape, and the page stays locked until both are gone.
 * A control that handles Escape itself (a date picker's calendar) calls `preventDefault()`, and the overlay leaves it be.
 * `onClose` may be a new function every render; it's read from a ref, so re-renders never re-run the setup.
 */
export function useOverlay(open: boolean, onClose: () => void, panel?: React.RefObject<HTMLElement | null>) {
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const me = Symbol();
    const last = document.activeElement as HTMLElement | null;
    stack.push(me);
    if (stack.length === 1) {
      window.__lenis?.stop();
      document.documentElement.style.overflow = "hidden";
    }
    const onKey = (e: KeyboardEvent) => {
      if (stack.at(-1) !== me || e.defaultPrevented) return;
      if (e.key === "Escape") {
        e.preventDefault();
        close.current();
        return;
      }
      const root = panel?.current;
      if (e.key !== "Tab" || !root) return;
      const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement);
      const first = items[0];
      const end = items.at(-1);
      if (!first || !end) return;
      const inside = root.contains(document.activeElement);
      if (e.shiftKey && (document.activeElement === first || document.activeElement === root || !inside)) {
        e.preventDefault();
        end.focus();
      } else if (!e.shiftKey && (document.activeElement === end || !inside)) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => panel?.current?.focus({ preventScroll: true }), 30);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      stack.splice(stack.indexOf(me), 1);
      if (!stack.length) {
        window.__lenis?.start();
        document.documentElement.style.overflow = "";
      }
      last?.focus?.({ preventScroll: true });
    };
  }, [open, panel]);
}
