"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ACCESS_LABEL, offTower, onTower, standing } from "@/lib/amenities";
import { cn } from "@/lib/cn";
import type { Amenity } from "@/lib/data/types";
import { pinsFor } from "@/lib/live";
import { useDemo } from "@/lib/store";
import { clock, LIGHT_LABEL } from "@/lib/sun";
import { useTenant } from "@/lib/tenants/client";
import { useLiveSky } from "@/lib/useLiveSky";
import { LineReveal } from "@/components/motion/Reveal";
import { skyBackdrop } from "@/components/public/explorer/SkyControl";
import { FloorMarker } from "@/components/public/explorer/FloorMarker";
import { Tower, type Band } from "@/components/three/Tower";
import { Icon } from "@/components/ui/Icon";
import { Mark } from "@/components/ui/Logo";
import Image from "@/components/ui/SmoothImage";

const floorName = (n: number) => (n === 0 ? "St" : String(n));
const short = (name: string) => {
  const s = name.replace(/^(The|Transamerica) /, "");
  return s[0]!.toUpperCase() + s.slice(1);
};

/** Floors within a few levels of each other share one marker, so their labels don't sit on top of each other */
function clusters(list: Amenity[]) {
  const out: Amenity[][] = [];
  for (const a of list) {
    const last = out.at(-1);
    if (last && Math.abs(last[0]!.level! - a.level!) <= 3) last.push(a);
    else out.push([a]);
  }
  return out;
}

/** How far to pan the tower right on a wide screen, so it clears the words on the left */
function useShift() {
  const ref = useRef<HTMLElement>(null);
  const [x, setX] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setX(window.innerWidth >= 1024 ? -Math.round(e.contentRect.width * 0.2) : 0));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, [x, 0] as [number, number]] as const;
}

/**
 * The Building Home's front door: the tower, lit by the real sky over the building right now, is the menu.
 * Every floor with something on it is a row in the directory and a marker on the tower; hover one and the other
 * follows, pick one and the tower flies there while the row opens with what it is, who can use it and the next step.
 * Green floors are open to you today; amber ones need a step first (sign-in, verification, a membership).
 */
export function BuildingDoor({
  kicker,
  lines,
  lead,
  actions,
  personal,
  children,
}: {
  kicker?: string;
  lines: string[];
  lead?: React.ReactNode;
  actions?: React.ReactNode;
  /** Pin today's plans to their floors */
  personal?: boolean;
  /** Anything that belongs under the headline, above the directory (a banner, an up-next card) */
  children?: React.ReactNode;
}) {
  const t = useTenant();
  const s = useDemo();
  const sky = useLiveSky();
  const reduce = useReducedMotion();
  const [openId, setOpenId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [sectionRef, shift] = useShift();

  const tower = useMemo(() => onTower(t.amenities), [t.amenities]);
  const block = useMemo(() => offTower(t.amenities), [t.amenities]);
  const marks = useMemo(() => clusters(tower), [tower]);
  const byId = (id: string | null) => t.amenities.find((a) => a.id === id);
  const open = byId(openId);
  const hover = byId(hoverId);
  const level = open ? (open.level ?? 0) : null;

  const bands: Band[] = tower.map((a) => ({ level: a.level!, tone: standing(a, s.persona, s.fitnessMember).ok ? "open" : "event" }));
  const pins = useMemo(() => (personal ? pinsFor(t, s, new Date()) : []), [personal, t, s]);

  const toggle = (id: string) => setOpenId((x) => (x === id ? null : id));

  return (
    <section ref={sectionRef} data-nav-over className="theme-night relative isolate overflow-hidden bg-night lg:min-h-[100svh]" aria-label={`${t.building.name}, floor by floor`}>
      {/* The sky and the tower: a band on top on phones, the whole right of the stage on desktop */}
      <div className="relative h-[58svh] lg:absolute lg:inset-0 lg:h-auto">
        <div className="absolute inset-0 transition-[background] duration-1000" style={{ background: skyBackdrop(sky.sun, sky.light, sky.keys) }} />
        <Tower
          className="absolute inset-0"
          eager
          shift={shift}
          level={level}
          zoom={open ? 1.3 : 1}
          landmarks
          sun={sky.sun}
          sunSky={sky.sunSky}
          bands={bands}
          pins={pins}
          pickable={tower.map((a) => a.level!)}
          onPick={(floor) => {
            const a = tower.find((x) => x.level === floor);
            if (a) toggle(a.id);
          }}
          onHover={(floor) => setHoverId(floor == null ? null : (tower.find((x) => x.level === floor)?.id ?? null))}
          hoverLevel={hover?.level ?? null}
          // On phones the directory below does the naming; labels on a narrow tower only collide
          hotspots={shift[0] ? marks.map((g) => ({ id: g[0]!.id, level: g[0]!.level! })) : undefined}
          renderHotspot={(id) => {
            const g = marks.find((x) => x[0]!.id === id)!;
            const levels = g.map((a) => a.level!);
            const lo = Math.min(...levels);
            const hi = Math.max(...levels);
            const lit = g.find((a) => a.id === openId);
            return (
              <FloorMarker
                num={lo === hi ? floorName(lo) : `${lo}–${hi}`}
                name={g.map((a) => short(a.name)).join(" · ")}
                photo={g[0]!.img}
                facts={ACCESS_LABEL[g[0]!.access]}
                active={!!lit}
                dim={!!open}
                peek={false}
                arming={false}
                onEnter={() => setHoverId(g[0]!.id)}
                onLeave={() => setHoverId(null)}
                onOpen={() => toggle(lit ? lit.id : g[0]!.id)}
              />
            );
          }}
          poster={
            <div className="grid h-full place-items-center">
              <Mark size={200} className="text-moon/15" />
            </div>
          }
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-night to-transparent lg:hidden" />
        <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[58%] bg-gradient-to-r from-night via-night/85 to-transparent lg:block" />
      </div>

      <div className="frame relative grid-12 pb-14 lg:pointer-events-none lg:min-h-[100svh] lg:content-end lg:pb-16 lg:pt-[calc(var(--nav-h)+48px)]">
        <div className="col-span-12 -mt-16 lg:pointer-events-auto lg:col-span-5 lg:mt-0 xl:col-span-4">
          <p className={cn("t-small flex items-center gap-2 text-moon-2 transition-opacity duration-700", sky.ready ? "opacity-100" : "opacity-0")}>
            <span className="keep-round size-1.5 shrink-0 animate-breathe rounded-full bg-[#5fc08f]" aria-hidden />
            <span className="truncate">
              <span className="hidden sm:inline">{kicker ?? t.building.name} · </span>
              {sky.now && `${clock(sky.now.minutes)} in ${t.building.city}, ${LIGHT_LABEL[sky.light].toLowerCase()}`}
            </span>
          </p>
          <LineReveal as="h1" className="t-h1 mt-4 text-moon" lines={lines} />
          {lead && <div className="t-lead mt-5 max-w-[42ch] text-moon/75">{lead}</div>}
          {actions && <div className="mt-7 flex flex-wrap items-center gap-3">{actions}</div>}
          {children}

          <div className="mt-10">
            <div className="flex items-center justify-between gap-4">
              <h2 className="t-meta text-moon-2">Floor by floor</h2>
              <p className="t-meta flex items-center gap-3 text-moon-2" aria-hidden>
                <span className="flex items-center gap-1.5">
                  <span className="keep-round size-1.5 rounded-full bg-[#5fc08f]" /> Open to you
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="keep-round size-1.5 rounded-full bg-[#f0c77e]" /> A step first
                </span>
              </p>
            </div>
            <ul className="mt-3 border-t border-white/10">
              {[...tower, ...block].map((a, i) => (
                <Row
                  key={a.id}
                  a={a}
                  first={i === tower.length && block.length > 0}
                  open={openId === a.id}
                  hot={hoverId === a.id}
                  onToggle={() => toggle(a.id)}
                  onHover={(on) => setHoverId(on ? a.id : null)}
                  reduce={!!reduce}
                />
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({
  a,
  first,
  open,
  hot,
  onToggle,
  onHover,
  reduce,
}: {
  a: Amenity;
  first: boolean;
  open: boolean;
  hot: boolean;
  onToggle: () => void;
  onHover: (on: boolean) => void;
  reduce: boolean;
}) {
  const s = useDemo();
  const st = standing(a, s.persona, s.fitnessMember);
  const id = `amenity-${a.id}`;
  return (
    <li className={cn("border-b border-white/10", first && "mt-6 border-t")}>
      {first && <p className="t-meta -mt-7 mb-2 text-moon-2">On the block</p>}
      <button
        onClick={onToggle}
        onPointerEnter={() => onHover(true)}
        onPointerLeave={() => onHover(false)}
        onFocus={() => onHover(true)}
        onBlur={() => onHover(false)}
        aria-expanded={open}
        aria-controls={id}
        className={cn("group flex w-full items-center gap-4 py-3 text-left transition-colors", hot || open ? "text-moon" : "text-moon/85")}
      >
        <span className={cn("t-num w-8 shrink-0 text-[0.8125rem]", open ? "text-accent-glow" : "text-moon-2")}>
          {a.level == null ? "" : a.level === 0 ? "St" : `L${a.level}`}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{a.name}</span>
        </span>
        <span className="hidden shrink-0 items-center gap-1.5 text-[0.8125rem] text-moon-2 sm:flex">
          <span className={cn("keep-round size-1.5 rounded-full", st.ok ? "bg-[#5fc08f]" : "bg-[#f0c77e]")} aria-hidden />
          {ACCESS_LABEL[a.access]}
        </span>
        <Icon name="chevron-down" size={16} className={cn("shrink-0 text-moon-2 transition-transform duration-300", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="flex gap-4 pb-5 pl-12">
              {a.img && (
                <div className="media relative hidden aspect-[4/5] w-28 shrink-0 overflow-hidden sm:block">
                  <Image src={a.img.src} alt={a.img.alt} fill sizes="112px" className="object-cover" style={{ objectPosition: a.img.pos }} />
                </div>
              )}
              <div className="min-w-0">
                <p className="t-meta text-moon-2">
                  {a.where}
                  {a.hours && ` · ${a.hours}`}
                </p>
                <p className="t-small mt-2 text-moon/80">{a.blurb}</p>
                <p className="t-small mt-3 flex items-center gap-1.5 text-moon">
                  <span className={cn("keep-round size-1.5 rounded-full", st.ok ? "bg-[#5fc08f]" : "bg-[#f0c77e]")} aria-hidden />
                  {ACCESS_LABEL[a.access]} · {st.note}
                </p>
                {a.href && (
                  <Link href={a.href} className="group/l mt-4 inline-flex items-center gap-1.5 text-[0.9375rem] font-medium text-moon">
                    {a.cta ?? "Take a look"}
                    <Icon name="arrow-right" size={16} className="transition-transform group-hover/l:translate-x-0.5" />
                  </Link>
                )}
                {!a.confirmed && <p className="t-meta mt-3 text-moon-2/80">Details from public sources; not yet confirmed by the building.</p>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}
