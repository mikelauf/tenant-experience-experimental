"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { getImageProps } from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { preload } from "react-dom";
import Image from "@/components/ui/SmoothImage";
import { cn } from "@/lib/cn";
import { guestsLabel } from "@/lib/data/shared";
import type { Venue } from "@/lib/data/types";
import { useTenant } from "@/lib/tenants/client";
import { NumberRoll } from "@/components/motion/NumberRoll";
import { Icon } from "@/components/ui/Icon";
import { Tower } from "@/components/three/Tower";
import { DWELL_MS, FloorMarker, PEEK_MS } from "./explorer/FloorMarker";
import { ArrivalStage, STAGE_PHOTO_SIZES, StagePanel, VenueStage, type Ride, type Tab } from "./explorer/VenueStage";
import { useTour } from "./explorer/useTour";

type Stop = { id: string; label: string; level: number | null; venue?: Venue; arrive?: boolean };

const num = (level: number) => (level === 0 ? "G" : String(level));

/** Warm the panel's first photo while someone is still deciding, so it's there the moment it opens. */
function preloadHero(v: Venue) {
  const img = v.gallery[0] ?? v.hero;
  const { props } = getImageProps({ src: img.src, alt: "", fill: true, sizes: STAGE_PHOTO_SIZES, quality: 85 });
  preload(props.src, { as: "image", imageSrcSet: props.srcSet, imageSizes: props.sizes });
}

/** Tracks whether the stage is laid out for desktop (side panel) or phones (bottom sheet), and its height. */
function useStage() {
  const ref = useRef<HTMLDivElement>(null);
  const [s, setS] = useState({ ready: false, wide: true, panel: 600, h: 700 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) =>
      setS({
        ready: true,
        wide: window.innerWidth >= 1024,
        panel: window.innerWidth >= 1536 ? 660 : window.innerWidth >= 1280 ? 600 : 500,
        h: e.contentRect.height,
      }),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, s] as const;
}

/**
 * Version C, "3D": the procedural tower with the real landmarks around it. Hover a floor (its marker or the lit
 * slab) to peek; keep hovering or click and the camera flies in, sliding the tower aside for a panel
 * with the space's photos, floor plan and tagged views. The rail only highlights on hover and changes floors
 * on click, so a stray pointer can't send the camera off. Arrow keys ride the floors; Escape comes back out.
 */
export function BuildingExplorer() {
  const t = useTenant();
  const { venues, copy, tower } = t;
  const pub = copy.public;
  const byLevel = [...venues].sort((a, b) => b.level - a.level);
  const pois = tower.pois ?? [];
  const stops: Stop[] = [
    { id: "overview", label: "The building", level: null },
    ...byLevel.map((v) => ({ id: v.slug, label: v.name.replace(/^Transamerica /, ""), level: v.level, venue: v })),
    ...(pois.length ? [{ id: "arrive", label: "Arriving", level: 0, arrive: true }] : []),
  ];
  const [id, setId] = useState("overview");
  const [landmarks, setLandmarks] = useState(true);
  // Arriving: the place under the pointer, and the one the camera has flown to
  const [poi, setPoi] = useState<string | null>(null);
  const [spot, setSpot] = useState<string | null>(null);
  const [dragged, setDragged] = useState(false);
  const stop = stops.find((s) => s.id === id) ?? stops[0];
  const v = stop.venue;
  const open = stop.id !== "overview";
  const [stageRef, stage] = useStage();
  const panelRef = useRef<HTMLElement>(null);

  const show = (next: string) => {
    setId(next);
    setPoi(null);
    setSpot(null);
  };

  // The open venue's media tab and view photo. They belong to one venue, so opening another starts on its photos.
  const [media, setMedia] = useState<{ slug: string; tab: Tab; i: number }>({ slug: "", tab: "photos", i: 0 });
  const tab: Tab = v && media.slug === v.slug ? media.tab : "photos";
  const viewIndex = v && media.slug === v.slug ? media.i : 0;
  const shownView = v && tab === "view" ? v.views?.[Math.min(viewIndex, v.views.length - 1)] : undefined;
  // A landmark nobody has a photo of: just face it
  const [pointed, setPointed] = useState<{ slug: string; name: string } | null>(null);
  const pointedHere = pointed && v && pointed.slug === v.slug && tab !== "view" ? tower.landmarks?.find((l) => l.name === pointed.name) : undefined;
  const lookBearing = shownView ? (shownView.bearing ?? v?.viewBearing ?? null) : (pointedHere?.bearing ?? null);
  const activeLandmarks = shownView ? (shownView.tags ?? []).map((x) => x.label) : pointedHere ? [pointedHere.name] : [];

  /** A landmark's label, clicked: show the photo that has it, from this floor if one does, else from the nearest floor that does. */
  const findLandmark = (name: string) => {
    const has = (x: (typeof venues)[number]) => (x.views ?? []).findIndex((p) => p.tags?.some((t) => t.label === name));
    const order = v ? [v, ...[...byLevel].sort((a, b) => Math.abs(a.level - v.level) - Math.abs(b.level - v.level)).filter((x) => x !== v)] : byLevel;
    const hit = order.find((x) => has(x) >= 0);
    if (hit) {
      setMedia({ slug: hit.slug, tab: "view", i: has(hit) });
      setPointed(null);
      if (hit.slug !== id) go(hit.slug);
      return;
    }
    const here = v ?? byLevel.find((x) => x.views?.length) ?? byLevel[0];
    setPointed({ slug: here.slug, name });
    setMedia({ slug: here.slug, tab: "photos", i: 0 });
    if (here.slug !== id) go(here.slug);
  };

  // Desktop, first time down the page: scrolling rides the building stop by stop. Any choice of their own ends it.
  const reduce = useReducedMotion();
  const {
    runwayRef,
    barRef,
    touring,
    extra,
    end: endTour,
  } = useTour({ enabled: stage.ready && stage.wide && !reduce, count: stops.length, stageRef, onStop: (i) => show(stops[i].id) });
  const go = (next: string) => {
    endTour();
    show(next);
  };
  const toggle = (next: string) => go(next === id && next !== "overview" ? "overview" : next);
  const pickLevel = (level: number) => {
    const hit = byLevel.find((x) => x.level === level);
    if (hit) toggle(hit.slug);
  };
  const step = (d: -1 | 1) => {
    const rides = stops.slice(1);
    const k = rides.findIndex((s) => s.id === id);
    const next = rides[Math.min(rides.length - 1, Math.max(0, k + d))];
    if (next) go(next.id);
  };

  /* Hover dwell: peek after a beat, open after a steady hover. Any drag on the canvas cancels it. */
  const [hot, setHot] = useState<string | null>(null);
  const [peek, setPeek] = useState(false);
  const hotRef = useRef<string | null>(null);
  const timers = useRef<number[]>([]);
  const down = useRef(false);
  const endDwell = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    hotRef.current = null;
    setHot(null);
    setPeek(false);
  }, []);
  /** `open: false` highlights only (the rail): a floor there changes on click, never on a stray hover. */
  const startDwell = (slug: string, open = true) => {
    if (hotRef.current === slug || down.current || touring) return;
    endDwell();
    hotRef.current = slug;
    setHot(slug);
    if (slug === id) return;
    const venue = byLevel.find((x) => x.slug === slug);
    if (!open) {
      if (venue) preloadHero(venue);
      return;
    }
    timers.current.push(
      window.setTimeout(() => {
        setPeek(true);
        if (venue) preloadHero(venue);
      }, PEEK_MS),
      window.setTimeout(() => {
        endDwell();
        go(slug);
      }, DWELL_MS),
    );
  };
  useEffect(() => {
    const up = () => (down.current = false);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      timers.current.forEach(clearTimeout);
    };
  }, []);
  const onCanvasHover = (level: number | null) => {
    const slug = level == null ? null : (byLevel.find((x) => x.level === level)?.slug ?? null);
    if (slug) startDwell(slug);
    else if (hotRef.current) endDwell();
  };
  const onMouse =
    (slug: string, open = true) =>
    (e: React.PointerEvent) =>
      e.pointerType === "mouse" && startDwell(slug, open);

  // Desktop: opening a floor while the stage is partly off screen glides the whole stage into view under the nav
  const wide = useRef(stage.wide);
  const touringRef = useRef(false);
  useEffect(() => {
    wide.current = stage.wide;
    touringRef.current = touring;
  }, [stage.wide, touring]);
  useEffect(() => {
    const el = stageRef.current;
    if (id === "overview" || !wide.current || touringRef.current || !el) return;
    const r = el.getBoundingClientRect();
    const nav = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 68;
    const top = nav + 16;
    if (r.top >= top - 2 && r.bottom <= window.innerHeight - 8) return;
    // Sized to fit under the nav, so it sits just below it with the panel's buttons in view; on very short screens the bottom wins
    const want = Math.min(top, window.innerHeight - 16 - r.height);
    // An exact position, not the element: scrolling to an element also applies the page's scroll-padding, counting the nav twice
    const lenis = window.__lenis;
    if (lenis) lenis.scrollTo(lenis.animatedScroll + r.top - want, { duration: 1.1 });
    else window.scrollTo({ top: window.scrollY + r.top - want, behavior: "smooth" });
  }, [id, stageRef]);

  // The panel takes focus as it opens, so the arrow keys and Escape work straight away
  useEffect(() => {
    if (open && !touringRef.current) panelRef.current?.focus({ preventScroll: true });
  }, [open]);
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") go("overview");
    else if (e.key === "ArrowUp" || e.key === "ArrowDown") step(e.key === "ArrowUp" ? -1 : 1);
    else return;
    e.preventDefault();
  };

  const ground = t.levels.find((l) => l.n === 0)?.label ?? "Street";
  const readout = stop.level == null ? "—" : stop.level === 0 ? "G" : null;
  const hotLevel = hot ? (byLevel.find((x) => x.slug === hot)?.level ?? null) : null;
  // Clear the panel: slide the tower left beside it on desktop (on phones the panel sits below the stage)
  const shift: [number, number] = open && stage.wide ? [stage.panel / 2 - 10, 0] : [0, 0];

  const railNum = (s: Stop) => (s.arrive ? "↘" : s.level == null ? "·" : num(s.level));

  // The floors either side of this one, named, for the panel's elevator buttons
  const rides = stops.slice(1);
  const k = rides.findIndex((s) => s.id === id);
  const named = (s?: Stop) => s && { num: s.arrive ? "↘" : num(s.level ?? 0), label: s.label };
  const ride: Ride = { up: k > 0 ? named(rides[k - 1]) : undefined, down: named(rides[k + 1]), go: step };

  // One panel, placed inside the stage on desktop and after it on phones
  const panel = (
    <StagePanel key="panel" ref={panelRef} label={stop.label}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={stop.id}
          className="flex min-h-0 flex-1 flex-col"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          {v && (
            <VenueStage
              v={v}
              ride={ride}
              onClose={() => go("overview")}
              tab={tab}
              onTab={(next) => {
                setMedia({ slug: v.slug, tab: next, i: 0 });
                setPointed(null);
              }}
              viewIndex={viewIndex}
              onViewIndex={(i) => setMedia({ slug: v.slug, tab: "view", i })}
            />
          )}
          {stop.arrive && <ArrivalStage pois={pois} active={poi ?? spot} onActive={setPoi} onFocus={setSpot} ride={ride} onClose={() => go("overview")} />}
        </motion.div>
      </AnimatePresence>
    </StagePanel>
  );

  return (
    <div>
      {/* Phones: floor chips above the stage */}
      <FloorChips stops={stops} current={stop.id} onPick={toggle} />

      {/* The tour's runway: extra scroll room the stage stays pinned through */}
      <div ref={runwayRef} style={touring ? { height: stage.h + extra } : undefined}>
        {/* The stage: the tower, its rail and markers, and the panel all live in one frame that never resizes */}
        <div
          ref={stageRef}
          onKeyDown={onKey}
          style={{ "--panel": `${stage.panel}px`, ...(touring && { position: "sticky", top: "calc(var(--nav-h) + 16px)" }) } as React.CSSProperties}
          className="relative h-[64svh] min-h-[440px] overflow-hidden rounded-[26px] lg:h-[min(calc(100svh-var(--nav-h)-32px),880px)] lg:min-h-[560px]"
        >
          <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,#33475a_0%,#151b21_62%)]" />
          <Tower
            level={stop.arrive ? null : stop.level}
            sun={0.55}
            landmarks={landmarks}
            lookBearing={open && !stop.arrive ? lookBearing : null}
            activeLandmarks={open && !stop.arrive ? activeLandmarks : []}
            onLandmark={findLandmark}
            pois={!!stop.arrive}
            activePoi={poi ?? spot}
            focusPoi={spot}
            onPoi={(id) => setSpot((cur) => (cur === id ? null : id))}
            onPoiHover={setPoi}
            compass="right-4 top-4 lg:right-[calc(var(--panel)+2rem)] lg:top-7"
            pickable={byLevel.map((x) => x.level)}
            onPick={pickLevel}
            onHover={onCanvasHover}
            hoverLevel={hotLevel}
            shift={shift}
            zoom={v ? 0.82 : 1}
            hotspots={stop.arrive ? undefined : byLevel.map((x) => ({ id: x.slug, level: x.level }))}
            renderHotspot={(slug) => {
              const x = byLevel.find((b) => b.slug === slug)!;
              return (
                <FloorMarker
                  num={num(x.level)}
                  name={x.name.replace(/^Transamerica /, "")}
                  photo={x.gallery[0] ?? x.hero}
                  facts={[guestsLabel(x), x.sqft && `${x.sqft.toLocaleString("en-US")} sq ft`].filter(Boolean).join(" · ")}
                  active={v?.slug === slug}
                  dim={open}
                  peek={hot === slug && peek}
                  arming={hot === slug && peek}
                  onEnter={onMouse(slug)}
                  onLeave={endDwell}
                  onOpen={() => {
                    endDwell();
                    toggle(slug);
                  }}
                />
              );
            }}
            onInteract={() => {
              down.current = true;
              endDwell();
              setDragged(true);
            }}
            className="absolute inset-0"
            // Drawn while the page is idle, so it's already there on scroll; the photo is only the no-3D fallback
            eager
            placeholder={null}
            poster={
              <Image src={pub.towerPoster.src} alt="" fill sizes="100vw" className="object-cover opacity-80" style={{ objectPosition: pub.towerPoster.pos }} />
            }
          />

          {/* Phones: the elevator readout on its own (the chips above do the picking) */}
          <div className="pointer-events-none absolute left-4 top-4 flex items-end gap-3 lg:hidden">
            <div className="flex h-[64px] min-w-[80px] items-center justify-center rounded-2xl bg-black/40 px-4 backdrop-blur-md">
              <span className="t-num text-[2.5rem] font-medium leading-none text-accent-glow">
                {readout ?? <NumberRoll value={stop.level!} duration={1.1} />}
              </span>
            </div>
            <div className="pb-1">
              <p className="t-meta">{stop.level == null ? "Overview" : stop.level === 0 ? `${ground} level` : `Level ${stop.level}`}</p>
              <p className="t-h3">{stop.label}</p>
            </div>
          </div>

          {/* Desktop: the readout and every stop on one frosted card, so the links hold their own over a busy scene */}
          <div className="absolute left-6 top-6 z-10 hidden w-[244px] rounded-[20px] bg-night/60 p-2 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08),0_24px_48px_-20px_rgb(0_0_0/0.65)] backdrop-blur-xl lg:block">
            <div className="flex items-center gap-3 p-1.5 pb-3">
              <div className="flex h-[60px] min-w-[72px] items-center justify-center rounded-[14px] bg-black/35 px-3">
                <span className="t-num text-[2.4rem] font-medium leading-none text-accent-glow">
                  {readout ?? <NumberRoll value={stop.level!} duration={1.1} />}
                </span>
              </div>
              <div className="min-w-0">
                <p className="t-meta">{stop.level == null ? "Overview" : stop.level === 0 ? `${ground} level` : `Level ${stop.level}`}</p>
                <p className="truncate text-[1.125rem] font-medium leading-tight" aria-live="polite">
                  {stop.label}
                </p>
              </div>
            </div>
            <nav aria-label="Floors" className="relative border-t border-white/8 pt-1.5">
              {touring && (
                <span aria-hidden className="absolute bottom-1.5 left-0 top-10 w-[2px] overflow-hidden rounded-full bg-white/8">
                  <span ref={barRef} className="block h-full origin-top bg-accent-glow" style={{ transform: "scaleY(0)" }} />
                </span>
              )}
              <p className="t-meta px-2.5 pb-1 pt-1.5">Jump to a floor</p>
              <ul>
                {stops.map((s) => {
                  const on = s.id === stop.id;
                  const warm = !on && s.venue && hot === s.id;
                  return (
                    <li key={s.id}>
                      <button
                        onClick={() => {
                          endDwell();
                          toggle(s.id);
                        }}
                        onPointerEnter={s.venue ? onMouse(s.id, false) : undefined}
                        onPointerLeave={s.venue ? endDwell : undefined}
                        aria-current={on ? "true" : undefined}
                        className={cn(
                          "group relative flex w-full items-center gap-2.5 rounded-xl px-2.5 py-[7px] text-left transition-colors",
                          on ? "bg-white/[0.09]" : warm ? "bg-white/[0.06]" : "hover:bg-white/[0.06]",
                        )}
                      >
                        <span className={cn("t-num w-6 text-right text-[0.8125rem] transition-colors", on ? "text-accent-glow" : "text-moon-2/80")}>
                          {railNum(s)}
                        </span>
                        <span
                          aria-hidden
                          className={cn(
                            "h-px transition-[width,background-color] duration-500 ease-[var(--ease-out-expo)]",
                            on ? "w-6 bg-accent-glow" : warm ? "w-4 bg-moon/70" : "w-2.5 bg-white/30 group-hover:w-4 group-hover:bg-moon/60",
                          )}
                        />
                        <span
                          className={cn(
                            "min-w-0 flex-1 truncate text-[0.9375rem] font-medium transition-colors",
                            on || warm ? "text-moon" : "text-moon/80 group-hover:text-moon",
                          )}
                        >
                          {s.label}
                        </span>
                        <Icon
                          name="chevron-right"
                          size={14}
                          className={cn(
                            "shrink-0 transition-[opacity,transform] duration-300",
                            on ? "text-accent-glow opacity-100" : "-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-70",
                          )}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>

          <div className="absolute bottom-4 left-4 flex flex-wrap items-center gap-2 lg:bottom-7 lg:left-7">
            <button
              onClick={() => setLandmarks((x) => !x)}
              aria-pressed={landmarks}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-black/40 px-3.5 text-[0.8125rem] font-medium backdrop-blur-md hover:bg-black/55"
            >
              <Icon name="pin" size={14} />
              {landmarks ? "Hide landmarks" : "Show landmarks"}
            </button>
            {touring ? (
              <>
                <p className="t-meta rounded-full bg-black/40 px-3 py-2 backdrop-blur-md">Keep scrolling to ride the building</p>
                <button
                  onClick={() => endTour(true)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-moon pl-3.5 pr-3 text-[0.8125rem] font-medium text-night transition-colors hover:bg-white"
                >
                  Skip tour
                  <Icon name="chevron-down" size={14} />
                </button>
              </>
            ) : (
              <p
                className={cn(
                  "t-meta rounded-full bg-black/40 px-3 py-2 backdrop-blur-md transition-opacity duration-700",
                  open && "max-lg:hidden",
                  dragged && "opacity-0",
                )}
              >
                Drag to turn · hover or tap a floor{open ? " · ↑ ↓ to ride · esc" : ""}
              </p>
            )}
          </div>

          {/* Phones: the details sit below the stage, so this points the way down to them */}
          <AnimatePresence>
            {open && !stage.wide && (
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                onClick={() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="absolute bottom-4 right-4 inline-flex h-9 items-center gap-1.5 rounded-full bg-moon pl-3.5 pr-3 text-[0.8125rem] font-medium text-night shadow-[0_8px_24px_-8px_rgb(0_0_0/0.6)]"
              >
                {stop.arrive ? "Where to go" : "Details"}
                <Icon name="chevron-down" size={14} />
              </motion.button>
            )}
          </AnimatePresence>

          <AnimatePresence>{open && stage.wide && panel}</AnimatePresence>
        </div>
      </div>

      {/* Phones: the details follow the stage instead of covering it */}
      <AnimatePresence>{open && !stage.wide && panel}</AnimatePresence>

      {/* Under the stage: what you're looking at */}
      <div className="mt-6 grid gap-x-10 gap-y-3 lg:mt-8 lg:grid-cols-2">
        <p className="t-lead text-moon-2">{pub.floorIntro.body}</p>
        {!!tower.landmarks?.length && (
          <p className="t-small text-moon-2 lg:pt-1.5">
            Around it: {tower.landmarks.map((l) => l.name).join(", ")}. True to direction; distances are compressed.
            {tower.realCity && (
              <>
                {" "}
                The surrounding blocks are the real ones, from{" "}
                <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-moon">
                  © OpenStreetMap contributors
                </a>
                .
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * The phone's floor chips: a sideways strip that fades at whichever edge has more to scroll,
 * and keeps the current floor in view as you ride up and down.
 */
function FloorChips({ stops, current, onPick }: { stops: Stop[]; current: string; onPick: (id: string) => void }) {
  const ref = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ l: false, r: true });
  const measure = () => {
    const el = ref.current;
    if (el) setEdges({ l: el.scrollLeft > 4, r: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  };
  useEffect(() => {
    const el = ref.current;
    const chip = el?.querySelector<HTMLElement>('[aria-current="true"]');
    if (el && chip) el.scrollTo({ left: chip.offsetLeft - (el.clientWidth - chip.offsetWidth) / 2, behavior: "smooth" });
    measure();
  }, [current]);
  // The arrows ride the floors one at a time; the strip follows the selection
  const at = stops.findIndex((s) => s.id === current);
  const neighbor = (d: -1 | 1) => stops[at + d];
  const fade = `linear-gradient(to right, ${edges.l ? "transparent" : "#000"} 0, #000 ${edges.l ? "48px" : "0px"}, #000 calc(100% - ${edges.r ? "64px" : "0px"}), ${edges.r ? "transparent" : "#000"} 100%)`;

  return (
    <nav aria-label="Floors" className="relative mb-4 lg:hidden">
      <ul
        ref={ref}
        onScroll={measure}
        className="no-scrollbar relative -mx-[var(--gutter)] flex snap-x gap-1.5 overflow-x-auto scroll-px-[var(--gutter)] px-[var(--gutter)]"
        style={{ maskImage: fade, WebkitMaskImage: fade }}
      >
        {stops.map((s) => (
          <li key={s.id} className="shrink-0 snap-start">
            <button
              onClick={() => onPick(s.id)}
              aria-current={s.id === current ? "true" : undefined}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-[0.9375rem] font-medium transition-colors",
                s.id === current ? "bg-moon text-night" : "bg-white/8 text-moon-2",
              )}
            >
              {s.level != null && !s.arrive && (
                <span className={cn("t-num text-[0.8125rem]", s.id === current ? "text-accent" : "text-moon-2/70")}>{num(s.level)}</span>
              )}
              {s.label}
            </button>
          </li>
        ))}
      </ul>
      {/* Previous and next floor, shown while there is one */}
      {([-1, 1] as const).map((d) => {
        const to = neighbor(d);
        const show = !!to;
        return (
          <button
            key={d}
            onClick={() => to && onPick(to.id)}
            aria-label={to ? `Go to ${to.label}` : undefined}
            tabIndex={show ? 0 : -1}
            className={cn(
              "absolute top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-night/85 text-moon shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12)] backdrop-blur-md transition-opacity duration-300",
              d < 0 ? "-left-1" : "-right-1",
              show ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            <Icon name={d < 0 ? "chevron-left" : "chevron-right"} size={15} />
          </button>
        );
      })}
    </nav>
  );
}
