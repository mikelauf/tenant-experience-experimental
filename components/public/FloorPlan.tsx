"use client";

import { AnimatePresence, motion } from "motion/react";
import NextImage from "next/image";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import type { Venue } from "@/lib/data/types";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/Button";

type Plans = NonNullable<Venue["floorPlans"]>;

/**
 * The building's own floor plans. One tab per documented setup; tap the plan to open it
 * full screen, where it can be zoomed and panned. Plans are drawn with Washington Street at the top.
 */
export function FloorPlan({ plans, venue }: { plans: Plans; venue: string }) {
  const [i, setI] = useState(0);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const plan = plans[i];

  return (
    <div className="overflow-hidden rounded-[var(--radius-media)] bg-[#fdf7f4] shadow-[var(--shadow-ring)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/8 px-5 py-4 sm:px-6">
        {plans.length > 1 ? (
          <div role="tablist" aria-label="Setup" className="flex gap-1 rounded-full bg-ink/6 p-1">
            {plans.map((p, k) => (
              <button
                key={p.src}
                role="tab"
                aria-selected={k === i}
                onClick={() => setI(k)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-[0.875rem] font-medium transition-colors",
                  k === i ? "bg-paper shadow-[var(--shadow-soft)]" : "text-stone hover:text-ink",
                )}
              >
                {p.label}
                {p.guests ? <span className="t-num ml-1.5 text-stone">{p.guests}</span> : null}
              </button>
            ))}
          </div>
        ) : (
          <p className="font-medium">
            {plan.label}
            {plan.guests ? <span className="t-meta ml-2">up to {plan.guests.toLocaleString("en-US")} guests</span> : null}
          </p>
        )}
        <p className="t-meta flex items-center gap-1.5">
          <Icon name="pin" size={14} />
          Washington St at the top · Redwood Park to the east
        </p>
      </div>
      <button onClick={() => setOpen(true)} className="group relative block aspect-[4/3] w-full" aria-label={`Open the ${venue} floor plan full screen`}>
        <AnimatePresence initial={false} mode="wait">
          <motion.div key={plan.src} className="absolute inset-4 sm:inset-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <NextImage src={plan.src} alt={plan.alt} fill sizes="(min-width:1024px) 55vw, 100vw" className="object-contain mix-blend-multiply" />
          </motion.div>
        </AnimatePresence>
        <span className="absolute bottom-4 right-4 inline-flex h-9 items-center gap-2 rounded-full bg-ink px-3.5 text-[0.8125rem] font-medium text-paper opacity-90 transition-opacity group-hover:opacity-100">
          <Icon name="expand" size={14} />
          Enlarge
        </span>
      </button>
      <PlanViewer plan={open ? plan : null} title={`${venue} · ${plan.label}`} onClose={close} />
    </div>
  );
}

/** Full-screen plan: fits the screen, tap to zoom to 2.5×, then drag (or scroll) to look around. */
export function PlanViewer({ plan, title, onClose }: { plan: Plans[number] | null; title: string; onClose: () => void }) {
  const [zoom, setZoom] = useState(false);
  // Every close resets the zoom, so the plan always reopens fitted to the screen.
  const close = useCallback(() => {
    setZoom(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!plan) return;
    window.__lenis?.stop();
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      window.__lenis?.start();
      document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [plan, close]);

  return (
    <AnimatePresence>
      {plan && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex flex-col bg-[#fdf7f4]"
          data-lenis-prevent
        >
          <div className="flex items-center justify-between gap-4 border-b border-ink/10 px-4 py-3 lg:px-8">
            <p className="font-medium">{title}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setZoom((z) => !z)} className="h-10 rounded-full px-4 text-[0.875rem] font-medium shadow-[inset_0_0_0_1px_var(--color-line-2)]">
                {zoom ? "Fit to screen" : "Zoom in"}
              </button>
              <IconButton icon="close" label="Close floor plan" onClick={close} autoFocus />
            </div>
          </div>
          <div className={cn("relative flex-1", zoom ? "overflow-auto" : "overflow-hidden")}>
            <button
              onClick={() => setZoom((z) => !z)}
              className={cn("relative block", zoom ? "h-[250%] w-[250%] cursor-zoom-out" : "h-full w-full cursor-zoom-in")}
              aria-label={zoom ? "Zoom out" : "Zoom in"}
            >
              <NextImage src={plan.src} alt={plan.alt} fill sizes="250vw" quality={90} className="object-contain p-4 mix-blend-multiply lg:p-10" />
            </button>
          </div>
          <p className="t-meta border-t border-ink/10 px-4 py-3 lg:px-8">{plan.alt} From the building&apos;s venue booklet.</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
