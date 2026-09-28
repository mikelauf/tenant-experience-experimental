"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { useTenant } from "@/lib/tenants/client";
import { useBuildingDay } from "@/lib/useBuildingDay";
import { LineReveal } from "@/components/motion/Reveal";
import Image from "@/components/ui/SmoothImage";
import { MemberBadges } from "../MemberBadges";

/** How long each place holds before the next, in ms */
const HOLD = 7000;

/**
 * The member Home's hero: a day in the building. It opens on the hour's place (coffee in the lobby in the morning,
 * the gym at midday, the lounge on 27 at golden hour, the bar at the top at night, the park on a weekend), then
 * moves through the rest, each photo drifting slowly while it holds. The page paints with the default photo first.
 * The line under the places says which one you're looking at, and picks one. Without motion, it stays on the hour's.
 * `aside` is the person's own card (what's next, a first step).
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
  const reduce = useReducedMotion();
  const base = t.copy.memberHero.img;
  const slides = t.copy.day ?? [];
  // Short names for the places: "Redwood Park", "Wellness center"
  const names = Object.fromEntries(
    t.amenities.map((a) => {
      const n = a.name.replace(/^(Transamerica|The) /, "");
      return [a.id, n[0]!.toUpperCase() + n.slice(1)];
    }),
  );

  // Starts on the hour's place once the browser knows the time; `null` until then (the default photo shows)
  const [picked, setPicked] = useState<{ i: number; at: number } | null>(null);
  const start = day.ready && day.scene ? Math.max(0, slides.indexOf(day.scene)) : null;
  const i = picked?.i ?? start;
  const cur = i != null ? slides[i] : undefined;
  const next = i != null && slides.length > 1 ? slides[(i + 1) % slides.length] : undefined;

  useEffect(() => {
    if (i == null || reduce || slides.length < 2) return;
    const id = setTimeout(() => setPicked({ i: (i + 1) % slides.length, at: Date.now() }), HOLD);
    return () => clearTimeout(id);
  }, [i, picked?.at, reduce, slides.length]);

  return (
    <section data-nav-over className="theme-night relative isolate flex min-h-[88svh] flex-col justify-end overflow-hidden lg:min-h-[92svh]">
      <Image src={base.src} alt={base.alt} fill priority sizes="100vw" className="-z-20 object-cover" style={{ objectPosition: base.pos }} />
      <AnimatePresence initial={false}>
        {cur && (
          <motion.div
            key={cur.img.src}
            className="absolute inset-0 -z-10 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.6, ease: [0.25, 1, 0.5, 1] }}
          >
            <motion.div
              className="absolute inset-0"
              initial={{ scale: reduce ? 1 : 1.08 }}
              animate={{ scale: 1 }}
              transition={{ duration: (HOLD + 1600) / 1000, ease: "linear" }}
            >
              <Image src={cur.img.src} alt={cur.img.alt} fill sizes="100vw" className="object-cover" style={{ objectPosition: cur.img.pos }} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* The next place, loading unseen so its crossfade starts from a finished photo */}
      {next && !reduce && (
        <div className="pointer-events-none absolute inset-0 -z-30 opacity-0" aria-hidden>
          <Image src={next.img.src} alt="" fill sizes="100vw" className="object-cover" />
        </div>
      )}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-night via-night/45 to-night/15" />
      <div className="absolute inset-y-0 left-0 -z-10 hidden w-2/3 bg-gradient-to-r from-night/60 to-transparent lg:block" />

      <div className="frame grid-12 items-end gap-y-10 pb-8 pt-40 lg:pb-10">
        <div className="col-span-12 lg:col-span-7">
          <div className="h-5 overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={cur?.line ?? "base"}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="t-small flex items-center gap-2 text-moon/80"
              >
                <span className="keep-round size-1.5 shrink-0 animate-breathe rounded-full bg-[#5fc08f]" aria-hidden />
                <span className="truncate">{cur?.line ?? t.building.name}</span>
              </motion.p>
            </AnimatePresence>
          </div>
          <LineReveal as="h1" className="t-page mt-4 max-w-[14ch]" lines={lines} />
          {lead && <div className="t-lead mt-5 max-w-[44ch] text-moon/80">{lead}</div>}
          <MemberBadges className="mt-6" />
          {actions && <div className="mt-8 flex flex-wrap items-center gap-3">{actions}</div>}
        </div>
        {aside && <div className="col-span-12 lg:col-span-5 lg:col-start-8 xl:col-span-4 xl:col-start-9">{aside}</div>}

        {slides.length > 1 && (
          <div className="col-span-12 grid gap-3 pt-4" style={{ gridTemplateColumns: `repeat(${slides.length}, minmax(0, 1fr))` }} role="tablist" aria-label="Places in the building">
            {slides.map((sl, k) => {
              const on = k === i;
              return (
                <button key={sl.img.src} role="tab" aria-selected={on} onClick={() => setPicked({ i: k, at: Date.now() })} className="group py-2 text-left">
                  <span className="relative block h-0.5 overflow-hidden rounded-full bg-white/20">
                    {on && (
                      <motion.span
                        key={`${k}-${picked?.at ?? 0}`}
                        className="absolute inset-y-0 left-0 bg-moon"
                        initial={{ width: reduce ? "100%" : "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: reduce ? 0 : HOLD / 1000, ease: "linear" }}
                      />
                    )}
                  </span>
                  <span className={cn("mt-2.5 hidden truncate text-[0.8125rem] transition-colors sm:block", on ? "text-moon" : "text-moon/55 group-hover:text-moon/85")}>
                    {(sl.amenity && names[sl.amenity]) || sl.line}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
