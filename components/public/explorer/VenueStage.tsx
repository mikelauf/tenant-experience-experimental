"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import NextImage from "next/image";
import Link from "next/link";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import Image from "@/components/ui/SmoothImage";
import { cn } from "@/lib/cn";
import type { Img, Venue, ViewPhoto } from "@/lib/data/types";
import type { Poi } from "@/lib/tower";
import { Icon } from "@/components/ui/Icon";
import { compass } from "@/lib/format";
import { PlanViewer } from "../FloorPlan";

/** The main photo's `sizes`; the explorer preloads the hero with the same value while you hover. */
export const STAGE_PHOTO_SIZES = "(min-width: 1536px) 660px, (min-width: 1280px) 600px, (min-width: 1024px) 500px, 100vw";

const shortName = (n: string) => n.replace(/^Transamerica /, "");
const directionsHref = (q: string) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The glass panel that opens inside the 3D stage: a column beside the tower on desktop, a bottom sheet
 * on phones. It is sized to the stage and never scrolls; the media frame takes whatever height is left.
 */
export const StagePanel = forwardRef<HTMLElement, { label: string; children: React.ReactNode; onKeyDown?: React.KeyboardEventHandler }>(function StagePanel(
  { label, children, onKeyDown },
  ref,
) {
  return (
    <motion.section
      ref={ref}
      tabIndex={-1}
      aria-label={label}
      onKeyDown={onKeyDown}
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.98 }}
      transition={{ duration: 0.55, ease: EASE }}
      className="theme-night relative mt-3 flex scroll-mt-24 flex-col overflow-hidden rounded-[var(--radius-card)] bg-night-2 text-moon shadow-[inset_0_0_0_1px_rgb(255_255_255/0.09)] outline-none lg:absolute lg:bottom-4 lg:right-4 lg:top-4 lg:z-20 lg:mt-0 lg:bg-night/72 lg:shadow-[0_40px_80px_-24px_rgb(0_0_0/0.7),inset_0_0_0_1px_rgb(255_255_255/0.09)] lg:backdrop-blur-2xl lg:w-[500px] xl:w-[600px] 2xl:w-[660px]"
    >
      {children}
    </motion.section>
  );
});

/** The floors either side of this one, for the elevator buttons; `go` rides one floor up (−1) or down (1). */
export type Ride = { up?: { num: string; label: string }; down?: { num: string; label: string }; go: (d: -1 | 1) => void };

function Header({ meta, title, tagline, ride, onClose }: { meta: string; title: string; tagline?: string; ride: Ride; onClose: () => void }) {
  return (
    <div className="shrink-0 px-5 pt-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="t-meta truncate">{meta}</p>
          <h3 className="mt-1 text-[1.75rem] font-[540] leading-[1.02] tracking-[-0.03em] lg:text-[2.4rem]">{title}</h3>
          {tagline && <p className="t-small mt-1 truncate text-moon-2">{tagline}</p>}
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="-mr-1.5 grid size-8 shrink-0 place-items-center rounded-full text-moon-2 transition-colors hover:bg-white/10 hover:text-moon"
        >
          <Icon name="close" size={16} />
        </button>
      </div>

      {/* The elevator: says exactly where each button goes */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {([-1, 1] as const).map((d) => {
          const to = d < 0 ? ride.up : ride.down;
          return (
            <button
              key={d}
              onClick={() => ride.go(d)}
              disabled={!to}
              aria-label={to ? `${d < 0 ? "Up" : "Down"} to ${to.label}` : undefined}
              className="group flex min-w-0 items-center gap-2.5 rounded-xl bg-white/[0.05] px-2.5 py-2 text-left transition-colors hover:bg-white/[0.09] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-white/[0.05]"
            >
              <span className="keep-round grid size-7 shrink-0 place-items-center rounded-full bg-white/10 transition-colors group-enabled:group-hover:bg-accent group-enabled:group-hover:text-paper">
                <Icon name="chevron-down" size={14} className={d < 0 ? "rotate-180" : undefined} />
              </span>
              <span className="min-w-0">
                <span className="t-meta block leading-tight">{d < 0 ? "Up to" : "Down to"}</span>
                <span className="block truncate text-[0.875rem] font-medium leading-snug">
                  {to ? (
                    <>
                      <span className="t-num text-accent-glow">{to.num}</span> {to.label}
                    </>
                  ) : d < 0 ? (
                    "Top floor"
                  ) : (
                    "Street level"
                  )}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export type Tab = "photos" | "plan" | "view";
const TAB_LABEL: Record<Tab, string> = { photos: "Photos", plan: "Floor plan", view: "The view" };

/** The media tabs a venue has something for. */
const mediaTabs = (v: Venue) => (["photos", "plan", "view"] as const).filter((t) => (t === "photos" ? v.gallery.length : t === "plan" ? v.floorPlans?.length : v.views?.length));

/** Guests, area and floor, as [value, label]. */
function venueFacts(v: Venue): [string, string][] {
  return [
    [v.capacity ? v.capacity.toLocaleString("en-US") : "—", v.capacity ? "Guests, up to" : (v.capacityNote ?? "Guests on request")],
    [v.sqft ? v.sqft.toLocaleString("en-US") : "—", "Square feet"],
    [v.level === 0 ? "G" : String(v.level), v.level === 0 ? "Street level" : "Floor"],
  ];
}

/**
 * A venue: the media runs edge to edge across the top of the panel with the name set over it (photos, the floor
 * plan, the tagged view), and underneath sit the numbers, the floors either side, and the way in.
 */
export function VenueStage({
  v,
  ride,
  onClose,
  tab,
  onTab,
  viewIndex,
  onViewIndex,
  photoIndex,
  onPhotoIndex,
}: {
  v: Venue;
  ride: Ride;
  onClose: () => void;
  /** The media tab and the view photo on show are the explorer's, since the 3D turns to face the view */
  tab: Tab;
  onTab: (t: Tab) => void;
  viewIndex: number;
  onViewIndex: (i: number) => void;
  /** The photo on show, when the explorer wants to follow it (the park's places answer to it) */
  photoIndex?: number;
  onPhotoIndex?: (i: number) => void;
}) {
  const tabs = mediaTabs(v);
  const facts = venueFacts(v);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* The media, full bleed, with its tabs and the close button floating over it */}
      <div className="relative flex min-h-0 flex-col lg:flex-1">
        {tab === "photos" && <Photos gallery={v.gallery} i={photoIndex} onI={onPhotoIndex} overlay={<Title v={v} />} />}
        {tab !== "photos" && (
          <div className="flex min-h-0 flex-1 flex-col gap-4 bg-night/40 px-5 pb-5 pt-16">
            {tab === "plan" && v.floorPlans?.[0] && <Plan plan={v.floorPlans[0]} title={v.name} />}
            {tab === "view" && v.views && <Views views={v.views} i={Math.min(viewIndex, v.views.length - 1)} onI={onViewIndex} />}
            <Title v={v} className="mb-0 shrink-0 px-1" />
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 bg-gradient-to-b from-black/45 to-transparent p-4 pb-10">
          {tabs.length > 1 ? (
            <div role="tablist" aria-label={`${v.name} media`} className="pointer-events-auto flex gap-0.5 rounded-full bg-black/35 p-1 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)] backdrop-blur-md">
              {tabs.map((t) => (
                <button
                  key={t}
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => onTab(t)}
                  className={cn(
                    "h-8 rounded-full px-3.5 text-[0.8125rem] font-medium transition-colors",
                    tab === t ? "bg-moon text-night" : "text-white/80 hover:bg-white/10 hover:text-white",
                  )}
                >
                  {TAB_LABEL[t]}
                </button>
              ))}
            </div>
          ) : (
            <span />
          )}
          <button
            onClick={onClose}
            aria-label="Close"
            className="pointer-events-auto grid size-10 shrink-0 place-items-center rounded-full bg-black/35 text-white/85 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)] backdrop-blur-md transition-colors hover:bg-black/55 hover:text-white"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      </div>

      {/* The calm band: numbers, the floors either side, the way in */}
      <div className="shrink-0 px-6 pb-6 pt-5">
        <dl className="grid grid-cols-3 gap-4">
          {facts.map(([value, label]) => (
            <div key={label} className="min-w-0">
              <dt className="sr-only">{label}</dt>
              <dd className="t-num text-[1.625rem] font-medium leading-none tracking-[-0.02em] lg:text-[2.125rem]">{value}</dd>
              <dd className="t-meta mt-1.5 truncate">{label}</dd>
            </div>
          ))}
        </dl>

        <Floors ride={ride} />

        <div className="mt-4 flex gap-2">
          <Link href={`/venues/${v.slug}`} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-moon text-[0.9375rem] font-medium text-night transition-colors hover:bg-white">
            Explore {shortName(v.name)}
            <Icon name="arrow-right" size={16} />
          </Link>
          <Link
            href={`/venues/inquire?venue=${v.slug}`}
            className="flex h-12 items-center rounded-full px-5 text-[0.9375rem] font-medium shadow-[inset_0_0_0_1px_rgb(255_255_255/0.18)] transition-colors hover:bg-white/8"
          >
            Inquire
          </Link>
        </div>
      </div>
    </div>
  );
}

function Title({ v, className }: { v: Venue; className?: string }) {
  return (
    <div className={cn("mb-3", className)}>
      <p className="t-meta truncate !text-white/70">
        {v.levelLabel} · {v.kind}
      </p>
      {/* Tight leading puts descenders below the line box, where truncate's overflow would cut them; the padding
          gives them room and the negative margin takes it back out of the layout */}
      <h3 className="-mb-[0.16em] mt-1 truncate pb-[0.16em] text-[2.25rem] font-[540] leading-[0.98] tracking-[-0.035em] text-white lg:text-[3.25rem]">{shortName(v.name)}</h3>
    </div>
  );
}

/** The floors either side, drawn like the rail's rows so it reads as the same elevator. */
function Floors({ ride }: { ride: Ride }) {
  return (
    <div className="mt-5 grid gap-1 border-t sm:grid-cols-2 sm:gap-2 border-white/10 pt-4">
      {([-1, 1] as const).map((d) => {
        const to = d < 0 ? ride.up : ride.down;
        return (
          <button
            key={d}
            onClick={() => ride.go(d)}
            disabled={!to}
            aria-label={to ? `${d < 0 ? "Up" : "Down"} to ${to.label}` : undefined}
            className="group flex min-w-0 items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-white/[0.06] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <Icon name="chevron-down" size={14} className={cn("shrink-0 text-moon-2 transition-colors group-enabled:group-hover:text-accent-glow", d < 0 && "rotate-180")} />
            {to && (
              <>
                <span className="t-num w-5 shrink-0 text-right text-[0.8125rem] text-accent-glow">{to.num}</span>
                <span aria-hidden className="h-px w-3 shrink-0 bg-white/30 transition-[width,background-color] duration-500 group-hover:w-5 group-hover:bg-accent-glow" />
              </>
            )}
            <span className="min-w-0 truncate text-[0.9375rem] font-medium">{to ? to.label : d < 0 ? "Top floor" : "Street level"}</span>
          </button>
        );
      })}
    </div>
  );
}

const PHOTO_MS = 5200;

/**
 * One big photo, edge to edge, that crossfades and advances on its own until you touch it. Story-style progress
 * bars along its foot show where you are and jump to a photo; `overlay` (the venue's name) sits just above them.
 */
function Photos({ gallery, i: shown, onI, overlay }: { gallery: Img[]; i?: number; onI?: (i: number) => void; overlay?: React.ReactNode }) {
  const [own, setOwn] = useState(0);
  const i = Math.min(shown ?? own, gallery.length - 1);
  const tell = useRef(onI);
  useEffect(() => {
    tell.current = onI;
  }, [onI]);
  const setI = useCallback((k: number) => {
    setOwn(k);
    tell.current?.(k);
  }, []);
  const [held, setHeld] = useState(false);
  const reduce = useReducedMotion();
  const n = gallery.length;
  // Each photo gets its full turn, however it came up (a bar, the auto-advance, a place picked in the 3D)
  useEffect(() => {
    if (held || reduce || n < 2) return;
    const t = setTimeout(() => setI((i + 1) % n), PHOTO_MS);
    return () => clearTimeout(t);
  }, [held, reduce, n, i, setI]);
  const img = gallery[i];
  // While held the bar sits full; letting go restarts it from empty, as the timer does
  const running = !held && !reduce;

  return (
    <div className="flex min-h-0 flex-1 flex-col" onPointerEnter={() => setHeld(true)} onPointerLeave={() => setHeld(false)}>
      <figure className="relative aspect-[4/5] overflow-hidden bg-night sm:aspect-[16/11] lg:aspect-auto lg:min-h-0 lg:flex-1">
        <AnimatePresence initial={false}>
          <motion.div key={img.src} className="absolute inset-0" initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.9, ease: EASE }}>
            <Image src={img.src} alt={img.alt} fill sizes={STAGE_PHOTO_SIZES} className="object-cover" style={{ objectPosition: img.pos }} />
          </motion.div>
        </AnimatePresence>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-6 pb-5 pt-28">
          {overlay}
          {n > 1 && (
            <div className="pointer-events-auto mt-1 flex gap-1.5">
              {gallery.map((g, k) => (
                <button key={g.src} onClick={() => setI(k)} aria-label={`Photo ${k + 1}: ${g.caption ?? g.alt}`} aria-current={k === i} className="group flex h-4 min-w-0 flex-1 items-center">
                  <span className="relative block h-[3px] w-full overflow-hidden rounded-full bg-white/25 transition-[height] group-hover:h-[5px]">
                    <span
                      key={k === i ? `${i}-${running}` : undefined}
                      className="absolute inset-0 origin-left rounded-full bg-white"
                      style={
                        k === i && running
                          ? { animationName: "progress-fill", animationDuration: `${PHOTO_MS}ms`, animationTimingFunction: "linear", animationFillMode: "both" }
                          : { transform: `scaleX(${k <= i ? 1 : 0})` }
                      }
                    />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </figure>
    </div>
  );
}

function Plan({ plan, title }: { plan: NonNullable<Venue["floorPlans"]>[number]; title: string }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button onClick={() => setOpen(true)} aria-label={`Open the ${title} floor plan`} className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-[#fdf7f4] lg:aspect-auto lg:min-h-0 lg:flex-1">
        <NextImage src={plan.src} alt={plan.alt} fill sizes="660px" className="object-contain p-3 mix-blend-multiply transition-transform duration-500 group-hover:scale-[1.03]" />
        <span className="absolute bottom-2.5 right-2.5 inline-flex h-7 items-center gap-1.5 rounded-full bg-ink px-2.5 text-[0.75rem] font-medium text-paper">
          <Icon name="expand" size={12} />
          Full plan
        </span>
      </button>
      <PlanViewer plan={open ? plan : null} title={`${title} · ${plan.label}`} onClose={close} />
    </>
  );
}

/**
 * The real view from the venue, with its landmarks tagged. The photo is fitted inside the frame at its own
 * proportions (container units), so the tags stay exactly where they belong at any panel height.
 */
function Views({ views, i, onI }: { views: ViewPhoto[]; i: number; onI: (i: number) => void }) {
  const v = views[i];
  const go = (d: number) => onI((i + d + views.length) % views.length);
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="grid h-[72vw] place-items-center lg:h-auto lg:min-h-0 lg:flex-1" style={{ containerType: "size" }}>
        <div className="relative overflow-hidden rounded-xl" style={{ width: `min(100cqw, calc(100cqh * ${v.ratio}))`, aspectRatio: v.ratio }}>
          <AnimatePresence initial={false}>
            <motion.div key={v.src} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
              <Image src={v.src} alt={v.alt} fill sizes={STAGE_PHOTO_SIZES} className="object-cover" />
            </motion.div>
          </AnimatePresence>
          {v.tags?.map((t, k) => (
            <motion.span
              key={`${v.src}-${t.label}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + k * 0.08, duration: 0.4 }}
              className="pointer-events-none absolute flex -translate-x-1/2 flex-col items-center"
              style={{ left: `${t.x}%`, bottom: `${100 - t.y}%` }}
            >
              <span className="whitespace-nowrap rounded-full bg-night/80 px-2 py-0.5 text-[0.6875rem] font-medium text-moon backdrop-blur-sm">{t.label}</span>
              <span className="h-4 w-px bg-moon/80" />
              <span className="keep-round size-1.5 rounded-full bg-moon" />
            </motion.span>
          ))}
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-between gap-3">
        <span className="min-w-0">
          <span className="block truncate text-[0.8125rem] font-medium">{v.caption}</span>
          {v.bearing != null && <span className="t-meta">Facing {compass(v.bearing)} · the model turns to match</span>}
        </span>
        {views.length > 1 && (
          <span className="flex shrink-0 items-center gap-1">
            <button onClick={() => go(-1)} aria-label="Previous view" className="grid size-8 place-items-center rounded-full hover:bg-white/10">
              <Icon name="chevron-left" size={16} />
            </button>
            <span className="t-num text-[0.75rem] text-moon-2">
              {i + 1} / {views.length}
            </span>
            <button onClick={() => go(1)} aria-label="Next view" className="grid size-8 place-items-center rounded-full hover:bg-white/10">
              <Icon name="chevron-right" size={16} />
            </button>
          </span>
        )}
      </div>
    </div>
  );
}

/** Street level: where to enter and check in. Each place is numbered like its pin on the map; pointing at one flies
 * the camera there, and the whole row opens walking or driving directions in Google Maps. */
export function ArrivalStage({
  pois,
  active,
  onActive,
  onFocus,
  ride,
  onClose,
}: {
  pois: Poi[];
  active: string | null;
  onActive: (id: string | null) => void;
  onFocus: (id: string) => void;
  ride: Ride;
  onClose: () => void;
}) {
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const enter = (id: string) => {
    onActive(id);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => onFocus(id), 450);
  };
  const leave = () => {
    clearTimeout(timer.current);
    onActive(null);
  };
  const placed = pois.filter((x) => !x.pending);
  const pending = pois.filter((x) => x.pending);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header meta="Street level" title="Arriving" tagline="Point at a place to see it on the map; click for directions." ride={ride} onClose={onClose} />
      <ul className="mx-2 mt-2 min-h-0 flex-1 overflow-y-auto px-1" onPointerLeave={leave}>
        {placed.map((x, i) => {
          const on = active === x.id;
          return (
            <li key={x.id}>
              <a
                href={directionsHref(x.maps ?? x.label)}
                target="_blank"
                rel="noreferrer"
                onPointerEnter={() => enter(x.id)}
                onFocus={() => {
                  onActive(x.id);
                  onFocus(x.id);
                }}
                onClick={() => onFocus(x.id)}
                aria-label={`${x.label}: directions in Google Maps`}
                className={cn("group flex items-start gap-3.5 rounded-xl px-3 py-3 transition-colors", on ? "bg-white/[0.07]" : "hover:bg-white/[0.05]")}
              >
                <span
                  className={cn(
                    "keep-round t-num mt-px grid size-6 shrink-0 place-items-center rounded-full text-[0.75rem] font-medium transition-colors",
                    on ? "bg-accent-glow text-night" : "bg-white/10 text-moon",
                  )}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-[0.9375rem] font-medium transition-colors", on && "text-accent-glow")}>{x.label}</span>
                  <span className="t-small block text-moon-2">{x.detail}</span>
                </span>
                <span className={cn("t-small mt-0.5 inline-flex shrink-0 items-center gap-1 font-medium transition-colors", on ? "text-moon" : "text-moon-2 group-hover:text-moon")}>
                  Directions
                  <Icon name="arrow-up-right" size={14} />
                </span>
              </a>
            </li>
          );
        })}
        {pending.map((x) => (
          <li key={x.id} className="flex items-start gap-3.5 px-3 py-3 opacity-60">
            <span className="keep-round mt-px grid size-6 shrink-0 place-items-center rounded-full border border-dashed border-white/25">
              <Icon name="pin" size={12} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[0.9375rem] font-medium">{x.label}</span>
              <span className="t-small block text-moon-2">{x.detail}</span>
            </span>
            <span className="t-meta mt-0.5 shrink-0">Coming</span>
          </li>
        ))}
      </ul>
      <p className="t-meta mx-5 shrink-0 border-t border-white/10 py-4">Directions open in Google Maps, in a new tab.</p>
    </div>
  );
}
