"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { useHydrated } from "@/lib/store";
import { IconButton } from "./Button";

/**
 * Bottom sheet on phones, side panel on desktop (Mindtrip-style detail drawer).
 * Traps focus loosely, closes on Escape and backdrop.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  side = "right",
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  side?: "right" | "center";
  className?: string;
}) {
  const reduce = useReducedMotion();
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const hydrated = useHydrated();

  useEffect(() => {
    if (!open) return;
    lastFocus.current = document.activeElement as HTMLElement;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    window.__lenis?.stop();
    document.documentElement.style.overflow = "hidden";
    const t = setTimeout(() => panel.current?.focus(), 30);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      window.__lenis?.start();
      document.documentElement.style.overflow = "";
      lastFocus.current?.focus?.();
    };
  }, [open, onClose]);

  if (!hydrated) return null;

  const desktopPos =
    side === "right"
      ? "lg:inset-y-3 lg:right-3 lg:left-auto lg:bottom-3 lg:w-[min(520px,42vw)] lg:rounded-[26px]"
      : "lg:inset-auto lg:left-1/2 lg:top-1/2 lg:w-[min(560px,92vw)] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-[26px] lg:max-h-[86vh]";

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80]" role="presentation">
          <motion.div
            className="absolute inset-0 bg-night/45 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={id}
            tabIndex={-1}
            data-lenis-prevent
            className={cn(
              "absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-[26px] bg-quartz shadow-[var(--shadow-float)] outline-none",
              desktopPos,
              className,
            )}
            initial={reduce ? { opacity: 0 } : { y: "100%", opacity: 1 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { y: "100%", opacity: 1 }}
            transition={{ duration: reduce ? 0.01 : 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-ink/15 lg:hidden" aria-hidden />
            <div className="flex items-center justify-between gap-4 px-5 pb-2 pt-3 lg:px-7 lg:pt-6">
              <h2 id={id} className="t-h3">
                {title}
              </h2>
              <IconButton icon="close" label="Close" onClick={onClose} className="-mr-2" />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 lg:px-7">{children}</div>
            {footer && <div className="border-t hairline bg-paper/80 px-5 py-4 backdrop-blur lg:px-7">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
