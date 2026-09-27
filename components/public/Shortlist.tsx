"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "@/components/ui/SmoothImage";
import { BRIEF_MAX, briefHref } from "@/lib/brief";
import { cn } from "@/lib/cn";
import { guestsShort, setupLabels } from "@/lib/data/shared";
import type { Setup, Venue } from "@/lib/data/types";
import { useDemo, useHydrated } from "@/lib/store";
import { useTenant } from "@/lib/tenants/client";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useNavOver } from "@/components/ui/useNavOver";
import { GuestStepper } from "./GuestStepper";
import { HeartButton } from "./VenueCard";

/**
 * The venues someone has saved (the hearts), gathered in a tray at the bottom of the screen once they
 * scroll past the hero. Two or more open side by side, and from there one inquiry or one brief covers them all.
 */
export function Shortlist() {
  const { venues } = useTenant();
  const s = useDemo();
  const hydrated = useHydrated();
  const path = usePathname();
  const { over } = useNavOver();
  const [open, setOpen] = useState(false);
  const saved = hydrated ? venues.filter((v) => s.shortlist.includes(v.slug)).slice(0, BRIEF_MAX) : [];
  // The inquiry and the brief already show the venues picked; the hero has its own buttons
  const own = path.startsWith("/venues/inquire") || path.startsWith("/venues/brief");
  const show = saved.length > 0 && !own && !over;
  // Venue pages keep an inquiry bar at the bottom on phones; the tray rides above it
  // Taking venues out until one is left closes the comparison for good, not just until the next heart
  if (open && hydrated && saved.length < 2) setOpen(false);
  const venuePage = /^\/venues\/(?!faq$)[^/]+$/.test(path);

  return (
    <>
      <AnimatePresence>
        {show && (
          <motion.div
            data-noprint
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className={cn(
              "theme-night fixed left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full bg-night p-1.5 pl-2 shadow-[var(--shadow-float)]",
              venuePage ? "bottom-[calc(env(safe-area-inset-bottom)+84px)] lg:bottom-6" : "bottom-[calc(env(safe-area-inset-bottom)+16px)] lg:bottom-6",
            )}
          >
            <span className="flex -space-x-2.5">
              {saved.map((v) => (
                <span key={v.slug} className="relative size-9 overflow-hidden rounded-full ring-2 ring-night">
                  <Image src={v.hero.src} alt="" fill sizes="36px" className="object-cover" style={{ objectPosition: v.hero.pos }} />
                </span>
              ))}
            </span>
            <span className="whitespace-nowrap text-[0.875rem] text-moon-2">
              <span className="font-medium text-moon">{saved.length}</span> saved
            </span>
            {saved.length > 1 ? (
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex h-10 items-center gap-2 whitespace-nowrap rounded-full bg-moon px-4 text-[0.9375rem] font-medium text-night transition-colors hover:bg-white"
              >
                <Icon name="grid" size={16} />
                Compare
              </button>
            ) : (
              <Link
                href="/venues/inquire"
                className="flex h-10 items-center gap-2 whitespace-nowrap rounded-full bg-moon px-4 text-[0.9375rem] font-medium text-night transition-colors hover:bg-white"
              >
                Inquire
                <Icon name="arrow-right" size={16} />
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <Compare open={open} onClose={() => setOpen(false)} saved={saved} />
    </>
  );
}

/** Every setup any of these venues offers, in the product's usual order */
const setupsOf = (list: Venue[]) => (Object.keys(setupLabels) as Setup[]).filter((k) => list.some((v) => v.layout?.setups[k]));
const viewsOf = (v: Venue) => v.facts.find((f) => f.label === "Views")?.value;

function Compare({ open, onClose, saved }: { open: boolean; onClose: () => void; saved: Venue[] }) {
  const reduce = useReducedMotion();
  const hydrated = useHydrated();
  const panel = useRef<HTMLDivElement>(null);
  const [guests, setGuests] = useState("");
  const n = Number(guests) || 0;

  useEffect(() => {
    if (!open) return;
    const last = document.activeElement as HTMLElement | null;
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
      last?.focus?.();
    };
  }, [open, onClose]);

  if (!hydrated) return null;
  const setups = setupsOf(saved);
  const fits = (max?: number) => !n || max == null || max >= n;
  const cols = { gridTemplateColumns: `clamp(84px,14vw,160px) repeat(${saved.length}, minmax(168px,1fr))` };

  const row = (label: string, cells: React.ReactNode[]) => (
    <div key={label} className="grid border-t hairline" style={cols}>
      <div className="sticky left-0 z-[1] bg-paper py-4 pr-4">
        <span className="t-meta">{label}</span>
      </div>
      {cells.map((c, i) => (
        <div key={saved[i].slug} className="py-4 pr-5">
          {c}
        </div>
      ))}
    </div>
  );

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
            aria-labelledby="compare-title"
            tabIndex={-1}
            data-lenis-prevent
            className="relative flex max-h-[calc(100dvh-max(env(safe-area-inset-top),20px))] w-full flex-col overflow-hidden rounded-t-[28px] bg-paper shadow-[var(--shadow-float)] outline-none lg:max-h-[calc(100dvh-48px)] lg:w-[min(1180px,100%)] lg:rounded-[28px]"
            initial={reduce ? { opacity: 0 } : { y: 48, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { y: 32, opacity: 0 }}
            transition={{ duration: reduce ? 0.01 : 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 px-5 pb-5 pt-6 sm:px-8">
              <div className="pr-14 sm:pr-0">
                <h2 id="compare-title" className="t-h2">
                  Side by side
                </h2>
                <p className="t-small mt-1 text-stone">Your {saved.length} saved venues. Add a guest count to see which rooms fit.</p>
              </div>
              <div className="flex items-end gap-3">
                <div className="w-[220px]">
                  <label htmlFor="compare-guests" className="t-meta mb-1.5 block">
                    Guests
                  </label>
                  <GuestStepper id="compare-guests" value={guests} onChange={setGuests} />
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="absolute right-4 top-4 grid size-11 shrink-0 place-items-center rounded-full bg-quartz shadow-[var(--shadow-ring)] transition-colors hover:bg-fog sm:static"
                >
                  <Icon name="close" size={18} />
                </button>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-auto overscroll-contain px-5 sm:px-8">
              {/* Narrow screens: each venue keeps a readable column and the next one peeks in, so it reads as scrollable */}
              <div style={{ minWidth: `calc(clamp(84px,14vw,160px) + ${saved.length} * 184px)` }}>
                {/* The venues across the top: photo, name, and a heart to take one out */}
                <div className="grid pb-5" style={cols}>
                  <div className="sticky left-0 z-[1] bg-paper" />
                  {saved.map((v) => (
                    <div key={v.slug} className="pr-5">
                      <div className="media relative aspect-[4/3]">
                        <Image src={v.hero.src} alt="" fill sizes="240px" className="object-cover" style={{ objectPosition: v.hero.pos }} />
                        <HeartButton slug={v.slug} name={v.name} className="absolute right-2 top-2 size-9" />
                      </div>
                      <Link href={`/venues/${v.slug}`} onClick={onClose} className="group mt-3 flex items-center gap-1.5 font-medium">
                        {v.name}
                        <Icon name="arrow-right" size={15} className="transition-transform group-hover:translate-x-0.5" />
                      </Link>
                      <p className="t-meta first-letter:uppercase">{v.levelLabel}</p>
                    </div>
                  ))}
                </div>

                {row(
                  "Guests",
                  saved.map((v) => (
                    <span key={v.slug} className={cn("block", !fits(v.capacity) && "text-stone-2")}>
                      <span className="block font-medium first-letter:uppercase">{guestsShort(v)}</span>
                      {n > 0 && v.capacity != null && (
                        <span className={cn("t-meta mt-1 block", fits(v.capacity) ? "!text-accent" : "")}>
                          {fits(v.capacity) ? `Fits ${n.toLocaleString("en-US")}` : `Too small for ${n.toLocaleString("en-US")}`}
                        </span>
                      )}
                    </span>
                  )),
                )}
                {row("Setting", saved.map((v) => v.kind))}
                {row("Area", saved.map((v) => (v.sqft ? `${v.sqft.toLocaleString("en-US")} sq ft` : "—")))}
                {setups.map((k) =>
                  row(
                    setupLabels[k],
                    saved.map((v) => {
                      const spec = v.layout?.setups[k];
                      if (!spec)
                        return (
                          <span key={v.slug} className="text-stone-2">
                            —
                          </span>
                        );
                      return <span key={v.slug} className={cn(!fits(spec.max) && "text-stone-2 line-through decoration-stone-2/60")}>Up to {spec.max.toLocaleString("en-US")}</span>;
                    }),
                  ),
                )}
                {saved.some(viewsOf) && row("Views", saved.map((v) => viewsOf(v) ?? "—"))}
              </div>
            </div>

            <footer className="flex flex-col-reverse gap-3 border-t hairline bg-paper px-5 py-4 pb-[calc(env(safe-area-inset-bottom)+16px)] sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <p className="t-meta">Setup capacities are estimates until the events team confirms your plan.</p>
              <div className="flex flex-wrap gap-2">
                <ButtonLink href={briefHref({ venues: saved.map((v) => v.slug), guests: n || undefined })} variant="outline" icon="share">
                  Make a brief
                </ButtonLink>
                <ButtonLink href={`/venues/inquire${n ? `?guests=${n}` : ""}`} variant="accent" icon="arrow-right">
                  Inquire about {saved.length === 2 ? "both" : `all ${saved.length}`}
                </ButtonLink>
              </div>
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
