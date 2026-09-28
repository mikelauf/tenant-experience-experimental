"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/cn";
import { useDemo, useHydrated } from "@/lib/store";
import { useTenant } from "@/lib/tenants/client";
import { Icon } from "@/components/ui/Icon";
import { Mark } from "@/components/ui/Logo";
import { useNavOver } from "@/components/ui/useNavOver";

/**
 * True once the visitor is scrolling down the page, false again as soon as they head back up.
 * Direction only flips after 10px of travel so trackpad jitter doesn't flicker it, and nothing hides
 * in the first 50px or while something marked [data-nav-pin] (the explorer's tour stage) is pinned under it.
 */
/** Something marked [data-nav-pin] is stuck right under the nav at the moment (not merely on the page) */
function pinned() {
  const el = document.querySelector<HTMLElement>("[data-nav-pin]");
  if (!el) return false;
  const nav = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 68;
  return Math.abs(el.getBoundingClientRect().top - nav) <= 1;
}

function useHideOnScroll(path: string) {
  // Keyed to the route, so a new page always arrives with the nav showing
  const [hiddenOn, setHiddenOn] = useState<string | null>(null);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y <= 50 || pinned()) {
        last = y;
        return setHiddenOn(null);
      }
      if (Math.abs(y - last) < 10) return;
      setHiddenOn(y > last ? path : null);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [path]);

  return hiddenOn === path;
}

export function PublicNav() {
  const path = usePathname();
  const { over, scrolled } = useNavOver();
  const s = useDemo();
  const hydrated = useHydrated();
  // The menu belongs to the page it was opened on, so any way of leaving (Inquire, the logo, back) closes it
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === path;
  const setOpen = (v: boolean | ((o: boolean) => boolean)) => setOpenOn((typeof v === "function" ? v(open) : v) ? path : null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenOn(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  const hidden = useHideOnScroll(path) && !open;
  const { building, venues, copy } = useTenant();
  const hasFaq = !!copy.public.faq?.length;
  // "Transamerica Redwood Park" reads as "Redwood Park" in the nav; the building name is already beside it.
  const navName = (name: string) => name.replace(/^Transamerica /, "");
  const shortlist = hydrated ? s.shortlist.length : 0;
  const light = over && !open;

  return (
    <>
      <header
        data-noprint
        className={cn(
          "fixed inset-x-0 top-0 z-50 [view-transition-name:public-nav] transition-[background-color,color,box-shadow,translate] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
          // Slides away while scrolling down, back as soon as you scroll up (or tab into it)
          hidden && "-translate-y-[calc(100%+2px)] focus-within:translate-y-0",
          light ? "text-white" : "text-ink",
          open
            ? "bg-quartz"
            : !over && scrolled
              ? "bg-quartz/82 shadow-[0_1px_0_var(--color-line)] backdrop-blur-xl"
              : !over
                ? "bg-quartz"
                : scrolled
                  ? "bg-night/35 backdrop-blur-xl"
                  : "bg-transparent",
        )}
      >
        <div className="frame flex h-[var(--nav-h)] items-center justify-between gap-6">
          <Link href="/venues" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
            <Mark size={24} />
            <span className="flex flex-col leading-none">
              <span className="text-[1.0625rem] font-semibold tracking-[-0.03em] [font-stretch:88%]">{building.name}</span>
              <span className="mt-1 text-[0.72rem] font-medium opacity-60">Venues & events</span>
            </span>
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            {venues.map((v) => (
              <Link
                key={v.slug}
                href={`/venues/${v.slug}`}
                className={cn(
                  "rounded-full px-3.5 py-2 text-[0.9375rem] font-medium transition-colors",
                  path === `/venues/${v.slug}`
                    ? light
                      ? "bg-white/15 text-white"
                      : "bg-ink/6 text-ink"
                    : light
                      ? "text-white/80 hover:text-white"
                      : "text-stone hover:text-ink",
                )}
              >
                {navName(v.name)}
              </Link>
            ))}
            {hasFaq && (
              <Link
                href="/venues/faq"
                className={cn(
                  "ml-2 rounded-full px-3.5 py-2 text-[0.9375rem] font-medium transition-colors",
                  path === "/venues/faq"
                    ? light
                      ? "bg-white/15 text-white"
                      : "bg-ink/6 text-ink"
                    : light
                      ? "text-white/80 hover:text-white"
                      : "text-stone hover:text-ink",
                )}
              >
                FAQ
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/venues/inquire"
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-full px-4 text-[0.9375rem] font-medium transition-colors",
                light ? "bg-white text-ink hover:bg-paper" : "bg-ink text-paper hover:bg-ink-2",
              )}
            >
              Inquire
              {shortlist > 0 && (
                <span className="flex items-center gap-0.5 text-[0.8125rem] opacity-80">
                  <Icon name="heart-fill" size={13} />
                  {shortlist}
                </span>
              )}
            </Link>
            <button
              className="grid size-10 place-items-center rounded-full md:hidden"
              aria-expanded={open}
              aria-controls="venues-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((o) => !o)}
            >
              <span className="relative block h-3 w-5">
                <span
                  className={cn("absolute left-0 top-0 h-[1.5px] w-5 bg-current transition-transform duration-300", open && "translate-y-[5px] rotate-45")}
                />
                <span
                  className={cn(
                    "absolute bottom-0 left-0 h-[1.5px] w-5 bg-current transition-transform duration-300",
                    open && "-translate-y-[5.5px] -rotate-45",
                  )}
                />
              </span>
            </button>
          </div>
        </div>
        <AnimatePresence>
          {open && (
            <motion.nav
              id="venues-menu"
              aria-label="Venues"
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden bg-quartz md:hidden"
            >
              <ul className="frame pb-8 pt-2">
                {venues.map((v, i) => (
                  <motion.li key={v.slug} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.05 }}>
                    <Link href={`/venues/${v.slug}`} onClick={() => setOpen(false)} className="flex items-baseline justify-between border-b hairline py-4">
                      <span className="t-h2">{v.name}</span>
                      <span className="t-meta tabular">{v.level === 0 ? "Street" : `L${v.level}`}</span>
                    </Link>
                  </motion.li>
                ))}
                {hasFaq && (
                  <li>
                    <Link href="/venues/faq" onClick={() => setOpen(false)} className="flex items-baseline justify-between border-b hairline py-4">
                      <span className="t-h2">Questions & answers</span>
                      <span className="t-meta">FAQ</span>
                    </Link>
                  </li>
                )}
              </ul>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>
      {/* Mobile menu backdrop: dims the page under the open menu, tap to close */}
      <AnimatePresence>
        {open && (
          <motion.div
            aria-hidden
            data-noprint
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-night/30 backdrop-blur-[2px] md:hidden"
          />
        )}
      </AnimatePresence>
    </>
  );
}
