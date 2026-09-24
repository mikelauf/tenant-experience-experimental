"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/cn";
import { venues } from "@/lib/data/venues";
import { useDemo, useHydrated } from "@/lib/store";
import { Icon } from "@/components/ui/Icon";
import { Mark } from "@/components/ui/Logo";
import { useNavOver } from "@/components/ui/useNavOver";

export function PublicNav() {
  const path = usePathname();
  const { over, scrolled } = useNavOver();
  const s = useDemo();
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const shortlist = hydrated ? s.shortlist.length : 0;
  const light = over && !open;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,color,box-shadow] duration-500",
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
            <span className="text-[1.0625rem] font-semibold tracking-[-0.03em] [font-stretch:88%]">Transamerica Pyramid</span>
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
                path === `/venues/${v.slug}` ? (light ? "bg-white/15" : "bg-ink/6") : light ? "text-white/80 hover:text-white" : "text-stone hover:text-ink",
              )}
            >
              {v.name}
            </Link>
          ))}
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
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            <span className="relative block h-3 w-5">
              <span className={cn("absolute left-0 top-0 h-[1.5px] w-5 bg-current transition-transform duration-300", open && "translate-y-[5px] rotate-45")} />
              <span
                className={cn("absolute bottom-0 left-0 h-[1.5px] w-5 bg-current transition-transform duration-300", open && "-translate-y-[5.5px] -rotate-45")}
              />
            </span>
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav
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
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
