"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useHydrated } from "@/lib/store";
import { useOverlay } from "@/lib/useOverlay";
import type { InquiryInitial } from "./InquiryForm";

// The form is most of a venue page's script and only needed once someone opens it; hovering an Inquire button fetches it early
const loadForm = () => import("./InquiryForm");
const InquiryForm = dynamic(() => loadForm().then((m) => m.InquiryForm), {
  ssr: false,
  loading: () => <div className="grid h-[420px] place-items-center" aria-busy="true" aria-label="Loading the inquiry" />,
});

/**
 * The inquiry, opened over a venue's page instead of sending people to another one: what they've
 * already picked there (guests, setup, a date) comes along, and the form starts at the first step
 * still to answer. A bottom sheet on phones, a centered card on wide screens.
 */

type Open = (initial: InquiryInitial) => void;
const Ctx = createContext<Open | null>(null);

/** Opens the page's inquiry modal, or null outside an `InquiryHost` (then link to the inquiry page). */
export const useInquire = () => useContext(Ctx);

export const inquireHref = (i: InquiryInitial) => {
  const q = new URLSearchParams(Object.entries(i).filter((e): e is [string, string] => !!e[1]));
  return `/venues/inquire${q.size ? `?${q}` : ""}`;
};

export function InquiryHost({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ initial: InquiryInitial; n: number; open: boolean }>({ initial: {}, n: 0, open: false });
  const open = useCallback<Open>((initial) => setState((s) => ({ initial, n: s.n + 1, open: true })), []);
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), []);
  return (
    <Ctx.Provider value={open}>
      {children}
      <InquiryModal open={state.open} onClose={close}>
        <InquiryForm key={state.n} initial={state.initial} onClose={close} />
      </InquiryModal>
    </Ctx.Provider>
  );
}

/** A link to the inquiry page that opens the modal instead when the page has one. */
export function InquireLink({ initial, className, children }: { initial: InquiryInitial; className?: string; children: React.ReactNode }) {
  const open = useInquire();
  if (!open)
    return (
      <Link href={inquireHref(initial)} className={className}>
        {children}
      </Link>
    );
  return (
    <button type="button" onClick={() => open(initial)} onPointerEnter={loadForm} onFocus={loadForm} className={className}>
      {children}
    </button>
  );
}

function InquiryModal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const hydrated = useHydrated();
  const panel = useRef<HTMLDivElement>(null);
  useOverlay(open, onClose, panel);

  if (!hydrated) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center lg:items-center lg:p-6" role="presentation">
          <motion.div
            className="absolute inset-0 bg-night/50 backdrop-blur-[3px]"
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
            aria-label="Event inquiry"
            tabIndex={-1}
            data-lenis-prevent
            className="relative max-h-[calc(100dvh-max(env(safe-area-inset-top),20px))] w-full overflow-y-auto overscroll-contain rounded-t-[28px] bg-paper shadow-[var(--shadow-float)] outline-none lg:max-h-[calc(100dvh-48px)] lg:w-[min(680px,100%)] lg:rounded-[28px]"
            initial={reduce ? { opacity: 0 } : { y: 48, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { y: 32, opacity: 0 }}
            transition={{ duration: reduce ? 0.01 : 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
