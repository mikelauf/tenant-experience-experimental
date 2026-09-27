"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { setupLabels, setupNotes } from "@/lib/data/shared";
import type { Rect, Setup, SetupSpec, Shell, ViewPhoto } from "@/lib/data/types";
import { briefHref } from "@/lib/brief";
import { readSpace, spaceQuery } from "@/lib/setup/share";
import { shellBounds } from "@/lib/setup/shell";
import { NumberRoll } from "@/components/motion/NumberRoll";
import { Lazy3D } from "@/components/three/Lazy3D";
import { Tower } from "@/components/three/Tower";
import { windowFor, type Preset } from "@/components/three/setup/camera";
import { makeLayout, perFigure } from "@/components/three/setup/layouts";
import { Button, ButtonLink } from "@/components/ui/Button";
import Image from "@/components/ui/SmoothImage";
import { Icon } from "@/components/ui/Icon";
import { compass } from "@/lib/format";
import { PhotoTags } from "./PhotoTags";

const SetupCanvas = dynamic(() => import("@/components/three/setup/SetupCanvas"), { ssr: false });


const standing = (s: Setup) => s === "reception" || s === "concert";

/** A tiny top-down sketch of each setup, for the picker. */
function Glyph({ s }: { s: Setup }) {
  const dots = (pts: [number, number][], r = 1.1) => pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={r} fill="currentColor" stroke="none" />);
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden>
      {s === "reception" && (
        <>
          <rect x={3} y={5} width={3} height={14} rx={1} />
          {dots([
            [11, 7],
            [15, 6],
            [19, 9],
            [12, 12],
            [17, 13],
            [11, 17],
            [15, 18],
            [20, 17],
          ])}
        </>
      )}
      {s === "theater" && (
        <>
          <path d="M5 4.5h14" />
          <path d="M5 10q7 2 14 0M5 14q7 2 14 0M5 18q7 2 14 0" />
        </>
      )}
      {s === "classroom" && (
        <>
          <path d="M5 4.5h14" />
          <path d="M4 10h6M14 10h6M4 14.5h6M14 14.5h6M4 19h6M14 19h6" />
        </>
      )}
      {s === "banquet" && (
        <>
          <circle cx={7.5} cy={7.5} r={3.2} />
          <circle cx={16.5} cy={7.5} r={3.2} />
          <circle cx={7.5} cy={16.5} r={3.2} />
          <circle cx={16.5} cy={16.5} r={3.2} />
        </>
      )}
      {s === "lounge" && (
        <>
          <rect x={4} y={4} width={16} height={4} rx={2} />
          <rect x={4} y={16} width={16} height={4} rx={2} />
          <circle cx={12} cy={12} r={2} />
        </>
      )}
      {s === "boardroom" && (
        <>
          <rect x={6} y={9} width={12} height={6} rx={1.5} />
          {dots([
            [8, 6],
            [12, 6],
            [16, 6],
            [8, 18],
            [12, 18],
            [16, 18],
            [3.5, 12],
            [20.5, 12],
          ])}
        </>
      )}
      {s === "concert" && (
        <>
          <path d="M6 7a6 3 0 0 1 12 0" />
          {dots(
            [
              [6, 12],
              [10, 11.5],
              [14, 11.5],
              [18, 12],
              [5, 16],
              [9, 15.5],
              [13, 15.5],
              [17, 16],
              [7, 20],
              [11, 19.5],
              [15, 19.5],
              [19, 20],
            ],
            1,
          )}
        </>
      )}
    </svg>
  );
}

const presets: { id: Preset; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "close", label: "Close-up" },
  { id: "top", label: "Top-down" },
];

/** Where the slider starts: half the setup's most, on its step, so a big room doesn't open with its whole crowd. */
function startAt(spec: SetupSpec) {
  const step = spec.max >= 500 ? 10 : 1;
  return Math.max(spec.min ?? Math.min(10, spec.max), Math.round(spec.max / 2 / step) * step);
}

/** How full the room reads at this count, against the setup's most guests. */
function fullness(guests: number, max: number) {
  const r = guests / max;
  if (r < 0.5) return { label: "Spacious", tone: "bg-ok-soft text-ok" };
  if (r < 0.85) return { label: "Comfortable", tone: "bg-fog text-ink-2" };
  return { label: "At capacity", tone: "bg-accent-soft text-accent-deep" };
}

/** Top-down plan, drawn from the same shell and layout. The poster while 3D loads, and the reduced-motion view. */
export function Plan({ shell, spec, setup, guests }: { shell: Shell; spec: SetupSpec; setup: Setup; guests: number }) {
  const L = useMemo(() => makeLayout(setup, guests, shell, spec), [setup, guests, shell, spec]);
  const b = shellBounds(shell);
  const f = shell.fixed ?? {};
  const pad = 1;
  const rect = (r: Rect, fill: string, key: string) => <rect key={key} x={r.x - r.w / 2} y={r.z - r.d / 2} width={r.w} height={r.d} fill={fill} />;
  return (
    <svg viewBox={`${b.x0 - pad} ${b.z0 - pad} ${b.w + pad * 2} ${b.d + pad * 2}`} className="h-full w-full">
      <polygon points={shell.outline.map((p) => p.join(",")).join(" ")} fill={shell.outdoor ? "#d6d9cd" : "#ebe4d8"} stroke="#cfccc4" strokeWidth={0.12} />
      {shell.solids.map((r, i) => rect(r, "#d9d3c8", `s${i}`))}
      {(shell.context ?? []).map((r, i) => rect(r, "#e4e1da", `c${i}`))}
      {(f.marks ?? []).map((r, i) => rect(r, "#ddd4c5", `m${i}`))}
      {(shell.rooms ?? []).map((r, i) => (
        <rect key={`r${i}`} x={r.x - r.w / 2} y={r.z - r.d / 2} width={r.w} height={r.d} fill="none" stroke="#cfccc4" strokeWidth={0.12} />
      ))}
      {f.stage && (f.stage.always || L.stage) && rect(f.stage, "#d8d1c4", "stage")}
      {(f.bars ?? []).filter((r) => r.always || L.bar).map((r, i) => rect(r, "#6f4a2f", `b${i}`))}
      {f.screen && <line x1={f.screen[0]} y1={f.screen[1]} x2={f.screen[2]} y2={f.screen[3]} stroke="#2a2d30" strokeWidth={0.14} />}
      {(f.trees ?? []).map(([x, z], i) => (
        <circle key={`t${i}`} cx={x} cy={z} r={1.1} fill="#33443a" opacity={0.85} />
      ))}
      {L.rounds.map(([x, z, s], i) => (
        <circle key={`r${i}`} cx={x} cy={z} r={0.62 * (s || 1)} fill="#6f4a2f" />
      ))}
      {L.longs.map(([x, z, len], i) => (
        <rect key={`l${i}`} x={x - len / 2} y={z - 0.31} width={len} height={0.62} fill="#6f4a2f" />
      ))}
      {L.highs.map(([x, z], i) => (
        <circle key={`h${i}`} cx={x} cy={z} r={0.3} fill="#6f4a2f" />
      ))}
      {L.sofas.map(([x, z, rot], i) => (
        <rect key={`so${i}`} x={x - 0.95} y={z - 0.4} width={1.9} height={0.8} rx={0.2} fill="#d9cfbf" transform={`rotate(${(-rot * 180) / Math.PI} ${x} ${z})`} />
      ))}
      {L.chairs.map(([x, z, rot], i) => (
        <rect key={`ch${i}`} x={x - 0.21} y={z - 0.2} width={0.42} height={0.4} rx={0.08} fill="#3b3f43" transform={`rotate(${(-rot * 180) / Math.PI} ${x} ${z})`} />
      ))}
      {L.people.map(([x, z], i) => (
        <circle key={`p${i}`} cx={x} cy={z} r={L.per > 1 ? 0.24 : 0.18} fill={i % 3 ? "#62666a" : "var(--color-accent)"} />
      ))}
    </svg>
  );
}

/**
 * What you see from the window: the venue's real view photos, filling the stage once the camera has walked
 * to the glass. Tags sit where the landmarks really are, placed for the stage's crop.
 */
function WindowView({ views, onBack, onCovered }: { views: ViewPhoto[]; onBack: () => void; onCovered: () => void }) {
  const [i, setI] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState(4 / 3);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setFrame(e.contentRect.width / Math.max(1, e.contentRect.height)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const v = views[i];
  const go = (d: number) => setI((k) => (k + d + views.length) % views.length);

  return (
    <motion.div
      ref={box}
      className="absolute inset-0 z-20 overflow-hidden bg-night"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.06 }}
      transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      onAnimationComplete={(d: { opacity?: number }) => d.opacity === 1 && onCovered()}
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={v.src}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <Image src={v.src} alt={v.alt} fill sizes="(min-width:1024px) 70vw, 100vw" className="object-cover" style={{ objectPosition: v.pos }} />
          <PhotoTags img={v} frame={frame} max={4} />
        </motion.div>
      </AnimatePresence>
      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 bg-gradient-to-b from-night/70 to-transparent p-3 sm:p-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-full bg-paper/90 px-3 py-1.5 text-[0.8125rem] font-medium text-ink shadow-[var(--shadow-soft)] backdrop-blur-md hover:bg-paper"
        >
          <Icon name="chevron-left" size={16} />
          Back to the room
        </button>
        <p className="t-meta !text-moon-2 flex items-center gap-1.5 pt-1.5">
          {v.bearing != null && (
            <span className="keep-round inline-block size-3 rounded-full border border-current" style={{ transform: `rotate(${v.bearing}deg)` }} aria-hidden>
              <span className="mx-auto mt-px block h-1.5 w-px bg-current" />
            </span>
          )}
          {v.bearing != null ? `Facing ${compass(v.bearing)}` : null}
          {views.length > 1 ? ` · ${i + 1} of ${views.length}` : null}
        </p>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-night/75 to-transparent p-3 pt-10 sm:p-4 sm:pt-12">
        <p className="min-w-0 text-[0.875rem] font-medium text-moon">{v.caption}</p>
        {views.length > 1 && (
          <div className="flex shrink-0 gap-1.5">
            <button onClick={() => go(-1)} aria-label="Previous view" className="grid size-9 place-items-center rounded-full bg-night/60 text-moon backdrop-blur-md hover:bg-night/80">
              <Icon name="chevron-left" size={18} />
            </button>
            <button onClick={() => go(1)} aria-label="Next view" className="grid size-9 place-items-center rounded-full bg-night/60 text-moon backdrop-blur-md hover:bg-night/80">
              <Icon name="chevron-right" size={18} />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/** Copies the page's link (the share sheet on phones), then says so for a moment. */
function ShareButton({ className }: { className?: string }) {
  const [done, setDone] = useState(false);
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share && matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ title: document.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setDone(true);
      setTimeout(() => setDone(false), 2200);
    } catch {
      // Dismissed share sheet, or no clipboard: nothing to undo
    }
  };
  return (
    <button onClick={share} className={cn("flex items-center justify-center gap-1.5 text-[0.875rem] font-medium text-stone transition-colors hover:text-ink", className)}>
      <Icon name={done ? "check" : "share"} size={16} />
      <span aria-live="polite">{done ? "Link copied" : "Share this setup"}</span>
    </button>
  );
}

/**
 * The room in 3D, set for an event: pick a setup, then drag the guest count and watch the furniture
 * re-flow. `split` puts the controls in a rail beside a large stage (the venue page); `stacked` keeps
 * them above it (member rooms).
 */
export function SetupVisualizer({
  shell,
  setups,
  className,
  value,
  onChange,
  title = "How it sets",
  footnote = "Illustrative layout. Our events team confirms the final plan with you.",
  variant = "stacked",
  inquireHref,
  onInquire,
  seedGuests,
  views,
  viewBearing,
  north,
  shareable,
  slug,
  building,
}: {
  shell: Shell;
  setups: Partial<Record<Setup, SetupSpec>>;
  className?: string;
  value?: Setup;
  onChange?: (s: Setup) => void;
  title?: string;
  footnote?: string;
  variant?: "stacked" | "split";
  /** Inquiry link; the guest count and setup are added to it */
  inquireHref?: string;
  /** Opens the inquiry in place with the guest count and setup; wins over `inquireHref` */
  onInquire?: (q: { guests: number; setup: Setup }) => void;
  /** The headcount set elsewhere on the page or site: the room follows it until the slider is moved here */
  seedGuests?: number;
  /** The venue's view photos, for "Look out from here" */
  views?: ViewPhoto[];
  /** Which way the best view faces (degrees from true north), to pick the window */
  viewBearing?: number;
  /** The street grid's turn from true north, in degrees */
  north?: number;
  /** Keep setup, guests and view in the page's link, and offer to share it */
  shareable?: boolean;
  /** The venue, for "Make a brief" */
  slug?: string;
  /** The room's floor, to offer "3D render": the 3D tower with that floor lit, in place of the room */
  building?: { level: number; name: string };
}) {
  const keys = Object.keys(setups) as Setup[];
  const [inner, setInner] = useState<Setup>(keys[0]);
  const setup = value && setups[value] ? value : inner;
  const spec = setups[setup]!;
  const [guests, setGuests] = useState(() => startAt(spec));
  const [preset, setPresetRaw] = useState<Preset>("close");
  const [touched, setTouched] = useState(false);
  const reduce = useReducedMotion();

  // Look out from here: the camera walks to the window facing the view, then the view photo fades in
  const lookout = useMemo(() => (views?.length && viewBearing != null ? windowFor(shell, viewBearing, north) : null), [views, viewBearing, north, shell]);
  const [looking, setLooking] = useState(false);
  // In the building: the tower takes over the stage. It mounts on first ask and stays, paused, after that.
  const [inBuilding, setInBuilding] = useState(false);
  const [builtOnce, setBuiltOnce] = useState(false);
  const [towerUp, setTowerUp] = useState(false);
  const showBuilding = () => {
    setInBuilding(true);
    setBuiltOnce(true);
    setLooking(false);
    setSeen(false);
    setCovered(false);
    setChanged(true);
  };
  const [seen, setSeen] = useState(false);
  // Once the photo fully covers the stage, the 3D behind it stops drawing
  const [covered, setCovered] = useState(false);
  const lookOut = () => {
    setInBuilding(false);
    setLooking(true);
    setChanged(true);
    if (reduce) setSeen(true);
  };
  const back = () => {
    setSeen(false);
    setCovered(false);
    setLooking(false);
    setChanged(true);
  };
  // If the 3D never arrives (still loading, or no WebGL), show the photo anyway
  useEffect(() => {
    if (!looking || seen) return;
    const t = setTimeout(() => setSeen(true), 2400);
    return () => clearTimeout(t);
  }, [looking, seen]);

  // Shared links: read the state once on arrival, then keep the link current as people change it
  const [changed, setChanged] = useState(false);
  const [seededWith, setSeededWith] = useState<number | undefined>();
  const [slid, setSlid] = useState(false);
  if (seedGuests && seedGuests !== seededWith && !slid) {
    setSeededWith(seedGuests);
    setGuests(Math.max(spec.min ?? Math.min(10, spec.max), Math.min(seedGuests, spec.max)));
  }
  const setPreset = (p: Preset) => {
    setPresetRaw(p);
    setInBuilding(false);
    setLooking(false);
    setSeen(false);
    setCovered(false);
    setChanged(true);
  };
  useEffect(() => {
    if (!shareable) return;
    const s = readSpace(new URLSearchParams(window.location.search), setups);
    if (!s || !new URLSearchParams(window.location.search).has("setup")) return;
    /* eslint-disable react-hooks/set-state-in-effect -- the link is only readable after hydration */
    setInner(s.setup);
    setGuests(s.guests);
    if (s.view === "window") {
      if (lookout) {
        setLooking(true);
        if (reduce) setSeen(true);
      }
    } else if (s.view === "building") {
      if (building) {
        setInBuilding(true);
        setBuiltOnce(true);
      }
    } else setPresetRaw(s.view);
    /* eslint-enable react-hooks/set-state-in-effect */
    // Arrival only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const uid = useId();
  const shown = Math.min(guests, spec.max);
  const deferred = useDeferredValue(shown);

  useEffect(() => {
    if (!shareable || !changed) return;
    const t = setTimeout(() => {
      const q = spaceQuery({ setup, guests: shown, view: inBuilding ? "building" : looking ? "window" : preset });
      window.history.replaceState(null, "", `${window.location.pathname}?${q}${window.location.hash}`);
    }, 250);
    return () => clearTimeout(t);
  }, [shareable, changed, setup, shown, preset, looking, inBuilding]);

  const min = spec.min ?? Math.min(10, spec.max);
  const step = spec.max >= 500 ? 10 : 1;
  const per = standing(setup) ? perFigure(deferred) : 1;
  const full = fullness(shown, spec.max);

  // At the starting count or the most a setup holds, switching follows the new setup's; otherwise the count carries over.
  const split = variant === "split";

  const choose = (s: Setup) => {
    const next = setups[s]!;
    setChanged(true);
    setGuests((g) => (g === startAt(spec) ? startAt(next) : g >= spec.max ? next.max : Math.max(next.min ?? Math.min(10, next.max), Math.min(g, next.max))));
    setPreset("close");
    if (onChange) onChange(s);
    else setInner(s);
  };

  const pct = ((shown - min) / Math.max(1, spec.max - min)) * 100;

  const tabs = (
    <div role="tablist" aria-label="Room setup" className="flex flex-wrap gap-1 rounded-full bg-fog p-1">
      {keys.map((s) => (
        <button
          key={s}
          role="tab"
          aria-selected={s === setup}
          onClick={() => choose(s)}
          className={cn(
            "rounded-full px-3.5 py-2 text-[0.875rem] font-medium transition-[background-color,color,box-shadow] duration-300",
            s === setup ? "bg-paper text-ink shadow-[var(--shadow-soft)]" : "text-stone hover:text-ink",
          )}
        >
          {setupLabels[s]}
        </button>
      ))}
    </div>
  );

  // The rail's picker: one row per setup with a sketch of it and how many it holds. Arrow keys move through it.
  const list = (
    <div
      role="radiogroup"
      aria-label="Room setup"
      className="grid gap-0.5 rounded-[20px] bg-fog/70 p-1"
      onKeyDown={(e) => {
        const d = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        const next = keys[(keys.indexOf(setup) + d + keys.length) % keys.length];
        choose(next);
        (e.currentTarget.querySelector(`[data-setup="${next}"]`) as HTMLElement | null)?.focus();
      }}
    >
      {keys.map((s) => {
        const on = s === setup;
        return (
          <button
            key={s}
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            data-setup={s}
            onClick={() => choose(s)}
            className={cn("relative flex items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition-colors duration-300", on ? "text-ink" : "text-stone hover:text-ink")}
          >
            {on && <motion.span layoutId={`setup-${uid}`} className="absolute inset-0 rounded-2xl bg-paper shadow-[var(--shadow-soft)]" transition={{ type: "spring", bounce: 0.15, duration: 0.45 }} />}
            <span className={cn("relative grid size-9 shrink-0 place-items-center rounded-xl transition-colors", on ? "bg-accent-soft text-accent-deep" : "bg-paper/60")}>
              <Glyph s={s} />
            </span>
            <span className="relative flex-1 font-medium">{setupLabels[s]}</span>
            <span className="t-num relative text-[0.8125rem] text-stone">up to {setups[s]!.max.toLocaleString("en-US")}</span>
          </button>
        );
      })}
    </div>
  );

  const count = (
    <div>
      <p className="t-meta">{title}</p>
      <p className="mt-1 flex items-baseline gap-2">
        <span className="t-num text-[clamp(2.75rem,2rem+3vw,4.5rem)] font-medium leading-none">
          <NumberRoll value={shown} duration={0.35} />
        </span>
        <span className="t-lead text-stone">{standing(setup) ? "standing" : "seated"}</span>
      </p>
      <p className="t-small mt-1 text-stone">
        {setupNotes[setup]}
        {split ? null : ` · up to ${spec.max.toLocaleString("en-US")}`}
      </p>
    </div>
  );

  const slider = (
    <div>
      <label htmlFor={`guests-${title}`} className="sr-only">
        Guests
      </label>
      <input
        id={`guests-${title}`}
        type="range"
        min={min}
        max={spec.max}
        step={step}
        value={shown}
        onChange={(e) => {
          setGuests(Number(e.target.value));
          setChanged(true);
          setSlid(true);
        }}
        aria-valuetext={`${shown} guests, ${setupLabels[setup].toLowerCase()}`}
        className="scrub scrub-day w-full"
        style={{ "--p": `${pct}%` } as React.CSSProperties}
      />
      <div className="t-meta mt-1 flex items-center justify-between gap-3">
        <span>{min.toLocaleString("en-US")}</span>
        <span className={cn("rounded-full px-2 py-0.5 font-medium normal-case tracking-normal transition-colors", full.tone)}>{full.label}</span>
        <span>{spec.max.toLocaleString("en-US")}</span>
      </div>
    </div>
  );

  const source = (
    <p className="t-meta">
      {spec.traced ? "Setup from the building's own plan." : null}
      {per > 1 ? `${spec.traced ? " " : ""}Each figure is about ${per} guests.` : null}
    </p>
  );

  const stage = (
    <Lazy3D
      className={cn("w-full", split ? "aspect-[4/5] sm:aspect-[4/3] lg:aspect-auto lg:h-full" : "aspect-[16/10]")}
      eager
      poster={
        <div className="flex h-full items-center justify-center p-6">
          <Plan shell={shell} spec={spec} setup={setup} guests={deferred} />
        </div>
      }
    >
      {({ active, onReady }) => (
        <SetupCanvas
          shell={shell}
          spec={spec}
          setup={setup}
          guests={deferred}
          preset={preset}
          active={active && !covered && !(inBuilding && towerUp)}
          onReady={onReady}
          onInteract={() => setTouched(true)}
          look={looking ? lookout : null}
          onLook={() => setSeen(true)}
        />
      )}
    </Lazy3D>
  );

  // Camera views, floating over the stage. Hidden without motion, where the flat plan stands in.
  const cameraViews = (
    <>
      {building && builtOnce && (
        <div
          className={cn(
            "absolute inset-0 overflow-hidden bg-[radial-gradient(120%_90%_at_60%_0%,#3a4d66_0%,#141a21_55%,#0b0e12_100%)] transition-opacity duration-700",
            inBuilding ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          aria-hidden={!inBuilding}
          onTransitionEnd={(e) => e.target === e.currentTarget && setTowerUp(inBuilding)}
        >
          <Tower
            level={building.level}
            sun={0.32}
            landmarks
            whole
            zoom={building.level >= 15 ? 0.8 : 1.2}
            paused={!inBuilding}
            className="absolute inset-0"
            // The park is outlined and its own places are pinned; a floor gets a label
            hotspots={building.level > 0 ? [{ id: "here", level: building.level }] : undefined}
            renderHotspot={() => (
              <span className="-ml-[5px] flex items-center">
                <span className="keep-round size-2.5 rounded-full bg-accent-glow shadow-[0_0_0_3px_rgb(0_0_0/0.25)]" />
                <span className="h-px w-5 bg-moon/50" />
                <span className="flex h-7 items-center gap-2 whitespace-nowrap rounded-full bg-accent pl-2.5 pr-3 text-[0.75rem] font-medium text-paper shadow-[0_8px_24px_-8px_rgb(0_0_0/0.6)]">
                  <span className="t-num text-[0.8125rem] text-paper/80">{building.level}</span>
                  {building.name}
                </span>
              </span>
            )}
            poster={null}
          />
        </div>
      )}
      <AnimatePresence>{seen && views && <WindowView key="window" views={views} onBack={back} onCovered={() => setCovered(true)} />}</AnimatePresence>
      {lookout && !looking && !inBuilding && (
        <button
          onClick={lookOut}
          className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-[0.8125rem] font-medium text-paper shadow-[var(--shadow-soft)] transition-transform hover:scale-[1.03] sm:right-4 sm:top-4"
        >
          <Icon name="view" size={16} />
          Look out from here
        </button>
      )}
      <div
        role="radiogroup"
        aria-label="Camera view"
        className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-0.5 rounded-full bg-paper/80 p-1 shadow-[var(--shadow-soft)] backdrop-blur-md motion-reduce:hidden sm:bottom-4"
      >
        {presets.map((p) => (
          <button
            key={p.id}
            role="radio"
            aria-checked={preset === p.id && !looking && !inBuilding}
            onClick={() => setPreset(p.id)}
            className={cn(
              "relative whitespace-nowrap rounded-full px-3 py-1.5 text-[0.8125rem] font-medium transition-colors duration-300 sm:px-3.5",
              preset === p.id && !looking && !inBuilding ? "text-paper" : "text-stone hover:text-ink",
            )}
          >
            {preset === p.id && !looking && !inBuilding && <motion.span layoutId={`view-${uid}`} className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", bounce: 0.15, duration: 0.45 }} />}
            <span className="relative">{p.label}</span>
          </button>
        ))}
        {building && (
          <button
            role="radio"
            aria-checked={inBuilding}
            onClick={showBuilding}
            className={cn(
              "relative whitespace-nowrap rounded-full px-3 py-1.5 text-[0.8125rem] font-medium transition-colors duration-300 sm:px-3.5",
              inBuilding ? "text-paper" : "text-stone hover:text-ink",
            )}
          >
            {inBuilding && <motion.span layoutId={`view-${uid}`} className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", bounce: 0.15, duration: 0.45 }} />}
            <span className="relative">3D render</span>
          </button>
        )}
      </div>
      <p
        className={cn(
          "t-meta pointer-events-none absolute left-4 top-4 z-10 flex items-center gap-1.5 rounded-full bg-paper/80 px-2.5 py-1 backdrop-blur-md transition-opacity duration-700 motion-reduce:hidden",
          touched && "opacity-0",
        )}
      >
        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" aria-hidden>
          <path d="M4 12h16M7 9l-3 3 3 3M17 9l3 3-3 3" />
        </svg>
        Drag to turn
      </p>
    </>
  );

  const cta = onInquire ? (
    <Button onClick={() => onInquire({ guests: shown, setup })} variant="accent" icon="arrow-right" className="w-full">
      Inquire for {shown.toLocaleString("en-US")} guests
    </Button>
  ) : inquireHref && (
    <ButtonLink href={`${inquireHref}${inquireHref.includes("?") ? "&" : "?"}guests=${shown}&setup=${setup}`} variant="accent" icon="arrow-right" className="w-full">
      Inquire for {shown.toLocaleString("en-US")} guests
    </ButtonLink>
  );

  if (split) {
    // Wide screens: most of a screen tall (short of it, so the section still reads as part of the page)
    return (
      <div
        className={cn(
          "grid overflow-hidden rounded-[var(--radius-media)] bg-paper shadow-[var(--shadow-ring)] lg:h-[clamp(680px,calc(100svh-var(--nav-h)-72px),960px)] lg:grid-cols-[minmax(0,1fr)_340px]",
          className,
        )}
      >
        <div className="relative min-w-0 bg-[radial-gradient(ellipse_at_50%_40%,var(--color-paper),var(--color-quartz))]">
          {stage}
          {cameraViews}
        </div>
        <div data-lenis-prevent className="flex flex-col gap-6 border-t hairline p-5 sm:p-7 lg:min-h-0 lg:overflow-y-auto lg:border-l lg:border-t-0">
          {list}
          {count}
          {slider}
          <div className="mt-auto space-y-4">
            {source}
            {cta}
            {shareable && (
              <div className="flex items-center justify-center gap-5">
                <ShareButton />
                {slug && (
                  <Link href={briefHref({ venues: [slug], setup, guests: shown })} className="flex items-center gap-1.5 text-[0.875rem] font-medium text-stone transition-colors hover:text-ink">
                    <Icon name="print" size={16} />
                    Save as a brief
                  </Link>
                )}
              </div>
            )}
            <p className="t-meta">{footnote}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-[var(--radius-media)] bg-paper shadow-[var(--shadow-ring)]", className)}>
      <div className="flex flex-wrap items-end justify-between gap-4 p-5 pb-0 sm:p-7 sm:pb-0">
        {count}
        {tabs}
      </div>
      <div className="px-5 pt-5 sm:px-7">{slider}</div>
      <div className="relative">
        {stage}
        {cameraViews}
      </div>
      <div className="space-y-2 px-5 pb-5 sm:px-7 sm:pb-6">
        {source}
        <p className="t-meta">{footnote}</p>
      </div>
    </div>
  );
}
