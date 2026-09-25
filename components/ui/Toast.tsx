"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { actions, useDemo } from "@/lib/store";
import { Icon } from "./Icon";

/**
 * Confirmation that "flies" into the Plans tab when it leaves,
 * so people learn where their bookings live.
 */
export function Toast() {
  const { toast } = useDemo();
  const reduce = useReducedMotion();
  const [target, setTarget] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => {
      const el = [...document.querySelectorAll<HTMLElement>("[data-plans-target]")].find((e) => e.offsetParent !== null);
      const r = el?.getBoundingClientRect();
      if (r) {
        // Relative to the toast's resting point (bottom center of the screen)
        setTarget({ x: r.left + r.width / 2 - window.innerWidth / 2, y: r.top + r.height / 2 - (window.innerHeight - 110) });
      }
      // Let the new exit target render before the toast is removed
      t2 = setTimeout(() => {
        actions.clearToast();
        setTimeout(() => window.dispatchEvent(new CustomEvent("plans:bump")), 600);
      }, 40);
    }, 4200);
    let t2: ReturnType<typeof setTimeout>;
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [toast]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--tab-h)+env(safe-area-inset-bottom)+60px)] z-[75] flex justify-center px-3 lg:bottom-8">
      <AnimatePresence onExitComplete={() => setTarget(null)}>
        {toast && (
          <motion.div
            key={toast.id}
            role="status"
            aria-live="polite"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
            exit={
              reduce || !target
                ? { opacity: 0 }
                : { opacity: 0.2, x: target.x, y: target.y, scale: 0.08, transition: { duration: 0.7, ease: [0.65, 0, 0.35, 1] } }
            }
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="theme-night pointer-events-auto flex w-full max-w-[440px] items-center gap-3 rounded-[20px] py-3 pl-3 pr-4 shadow-[var(--shadow-float)]"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-glow/20 text-accent-glow">
              <Icon name="check" size={20} strokeWidth={2} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{toast.title}</span>
              {toast.body && <span className="t-small block truncate text-moon-2">{toast.body}</span>}
            </span>
            {toast.href && (
              <Link
                href={toast.href}
                onClick={() => actions.clearToast()}
                className="shrink-0 rounded-full bg-moon px-3.5 py-2 text-[0.8125rem] font-medium text-night"
              >
                View
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
