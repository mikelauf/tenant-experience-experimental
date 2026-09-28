"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { clock, LIGHT_LABEL } from "@/lib/sun";
import { useTenant } from "@/lib/tenants/client";
import { useBuildingDay } from "@/lib/useBuildingDay";
import { LineReveal } from "@/components/motion/Reveal";
import { Icon } from "@/components/ui/Icon";
import Image from "@/components/ui/SmoothImage";

/**
 * The member Home's hero: the building at this hour. Morning is coffee in the lobby, midday the gym, golden hour the
 * lounge on 27, evening the bar at the top, a weekend day the park, picked by the building's own clock and the real
 * sun. The page paints with the default photo, then crossfades to the hour's once the browser knows the time.
 * Under it, a line of true things about right now. `aside` is the person's own card (what's next, a first step).
 */
export function DayHero({
  lines,
  lead,
  actions,
  aside,
}: {
  lines: string[];
  lead?: React.ReactNode;
  actions?: React.ReactNode;
  aside?: React.ReactNode;
}) {
  const t = useTenant();
  const day = useBuildingDay();
  const base = t.copy.memberHero.img;
  const shown = day.ready && day.scene && day.scene.img.src !== base.src ? day.scene.img : null;

  return (
    <section data-nav-over className="theme-night relative isolate flex min-h-[88svh] flex-col justify-end overflow-hidden lg:min-h-[92svh]">
      <Image src={base.src} alt={base.alt} fill priority sizes="100vw" className="-z-20 object-cover" style={{ objectPosition: base.pos }} />
      <AnimatePresence>
        {shown && (
          <motion.div
            key={shown.src}
            className="absolute inset-0 -z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: [0.25, 1, 0.5, 1] }}
          >
            <Image src={shown.src} alt={shown.alt} fill sizes="100vw" className="object-cover" style={{ objectPosition: shown.pos }} />
          </motion.div>
        )}
      </AnimatePresence>
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-night via-night/45 to-night/15" />
      <div className="absolute inset-y-0 left-0 -z-10 hidden w-2/3 bg-gradient-to-r from-night/60 to-transparent lg:block" />

      <div className="frame grid-12 items-end gap-y-10 pb-10 pt-40 lg:pb-12">
        <div className="col-span-12 lg:col-span-7">
          <p className={cn("t-small flex items-center gap-2 text-moon/80 transition-opacity duration-700", day.ready ? "opacity-100" : "opacity-0")}>
            <span className="keep-round size-1.5 shrink-0 animate-breathe rounded-full bg-[#5fc08f]" aria-hidden />
            <span className="truncate">
              {day.scene?.line ?? t.building.name}
              {day.sky.now && ` · ${clock(day.sky.now.minutes)} in ${t.building.city}, ${LIGHT_LABEL[day.sky.light].toLowerCase()}`}
            </span>
          </p>
          <LineReveal as="h1" className="t-hero mt-4 max-w-[14ch]" lines={lines} />
          {lead && <div className="t-lead mt-5 max-w-[44ch] text-moon/80">{lead}</div>}
          {actions && <div className="mt-8 flex flex-wrap items-center gap-3">{actions}</div>}
        </div>
        {aside && <div className="col-span-12 lg:col-span-5 lg:col-start-8 xl:col-span-4 xl:col-start-9">{aside}</div>}
      </div>

      <div className={cn("border-t border-white/10 bg-night/35 backdrop-blur-md transition-opacity duration-700", day.items.length ? "opacity-100" : "opacity-0")}>
        <div className="frame no-scrollbar flex min-h-12 items-center gap-6 overflow-x-auto py-3 text-[0.875rem]">
          <span className="t-meta shrink-0 text-moon-2">Right now</span>
          {day.items.map((x) =>
            x.href ? (
              <Link key={x.key} href={x.href} className="group flex shrink-0 items-center gap-1.5 text-moon/90 hover:text-moon">
                {x.text}
                <Icon name="arrow-right" size={14} className="text-moon-2 transition-transform group-hover:translate-x-0.5" />
              </Link>
            ) : (
              <span key={x.key} className="shrink-0 text-moon/90">
                {x.text}
              </span>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
