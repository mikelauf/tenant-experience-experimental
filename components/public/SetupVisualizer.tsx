"use client";

import { motion } from "motion/react";
import dynamic from "next/dynamic";
import { useDeferredValue, useId, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { setupLabels } from "@/lib/data/shared";
import type { Rect, Setup, SetupSpec, Shell } from "@/lib/data/types";
import { shellBounds } from "@/lib/setup/shell";
import { NumberRoll } from "@/components/motion/NumberRoll";
import { Lazy3D } from "@/components/three/Lazy3D";
import type { Preset } from "@/components/three/setup/camera";
import { makeLayout, perFigure } from "@/components/three/setup/layouts";
import { ButtonLink } from "@/components/ui/Button";

const SetupCanvas = dynamic(() => import("@/components/three/setup/SetupCanvas"), { ssr: false });

const setupNotes: Record<Setup, string> = {
  reception: "Standing, with high-tops and a bar",
  theater: "Rows facing the stage or screen",
  banquet: "Rounds of eight for a seated meal",
  boardroom: "One long table",
  classroom: "Tables in rows, facing forward",
  lounge: "Sofa groups for conversation",
  concert: "A standing crowd facing the stage",
};

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

/** How full the room reads at this count, against the setup's most guests. */
function fullness(guests: number, max: number) {
  const r = guests / max;
  if (r < 0.5) return { label: "Spacious", tone: "bg-ok-soft text-ok" };
  if (r < 0.85) return { label: "Comfortable", tone: "bg-fog text-ink-2" };
  return { label: "At capacity", tone: "bg-accent-soft text-accent-deep" };
}

/** Top-down plan, drawn from the same shell and layout. The poster while 3D loads, and the reduced-motion view. */
function Plan({ shell, spec, setup, guests }: { shell: Shell; spec: SetupSpec; setup: Setup; guests: number }) {
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
}: {
  shell: Shell;
  setups: Partial<Record<Setup, SetupSpec>>;
  className?: string;
  value?: Setup;
  onChange?: (s: Setup) => void;
  title?: string;
  footnote?: string;
  variant?: "stacked" | "split";
  /** Inquiry link; the guest count is added to it */
  inquireHref?: string;
}) {
  const keys = Object.keys(setups) as Setup[];
  const [inner, setInner] = useState<Setup>(keys[0]);
  const setup = value && setups[value] ? value : inner;
  const spec = setups[setup]!;
  const [guests, setGuests] = useState(spec.max);
  const [preset, setPreset] = useState<Preset>("close");
  const [touched, setTouched] = useState(false);
  const uid = useId();
  const shown = Math.min(guests, spec.max);
  const deferred = useDeferredValue(shown);

  const min = spec.min ?? Math.min(10, spec.max);
  const step = spec.max >= 500 ? 10 : 1;
  const per = standing(setup) ? perFigure(deferred) : 1;
  const full = fullness(shown, spec.max);

  // At the most a setup holds, switching follows the new setup's most; otherwise the count carries over.
  const split = variant === "split";

  const choose = (s: Setup) => {
    const next = setups[s]!;
    setGuests((g) => (g >= spec.max ? next.max : Math.max(next.min ?? Math.min(10, next.max), Math.min(g, next.max))));
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
        onChange={(e) => setGuests(Number(e.target.value))}
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
      className={cn("w-full", split ? "aspect-square sm:aspect-[4/3] lg:aspect-auto lg:h-full lg:min-h-[600px]" : "aspect-[16/10]")}
      eager
      poster={
        <div className="flex h-full items-center justify-center p-6">
          <Plan shell={shell} spec={spec} setup={setup} guests={deferred} />
        </div>
      }
    >
      {({ active, onReady }) => (
        <SetupCanvas shell={shell} spec={spec} setup={setup} guests={deferred} preset={preset} active={active} onReady={onReady} onInteract={() => setTouched(true)} />
      )}
    </Lazy3D>
  );

  // Camera views, floating over the stage. Hidden without motion, where the flat plan stands in.
  const views = (
    <>
      <div
        role="radiogroup"
        aria-label="Camera view"
        className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-0.5 rounded-full bg-paper/80 p-1 shadow-[var(--shadow-soft)] backdrop-blur-md motion-reduce:hidden sm:bottom-4"
      >
        {presets.map((p) => (
          <button
            key={p.id}
            role="radio"
            aria-checked={preset === p.id}
            onClick={() => setPreset(p.id)}
            className={cn(
              "relative whitespace-nowrap rounded-full px-3 py-1.5 text-[0.8125rem] font-medium transition-colors duration-300 sm:px-3.5",
              preset === p.id ? "text-paper" : "text-stone hover:text-ink",
            )}
          >
            {preset === p.id && <motion.span layoutId={`view-${uid}`} className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", bounce: 0.15, duration: 0.45 }} />}
            <span className="relative">{p.label}</span>
          </button>
        ))}
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

  const cta = inquireHref && (
    <ButtonLink href={`${inquireHref}${inquireHref.includes("?") ? "&" : "?"}guests=${shown}`} variant="accent" icon="arrow-right" className="w-full">
      Inquire for {shown.toLocaleString("en-US")} guests
    </ButtonLink>
  );

  if (split) {
    return (
      <div className={cn("grid overflow-hidden rounded-[var(--radius-media)] bg-paper shadow-[var(--shadow-ring)] lg:grid-cols-[minmax(0,1fr)_340px]", className)}>
        <div className="relative min-w-0 bg-[radial-gradient(ellipse_at_50%_40%,var(--color-paper),var(--color-quartz))]">
          {stage}
          {views}
        </div>
        <div className="flex flex-col gap-6 border-t hairline p-5 sm:p-7 lg:border-l lg:border-t-0">
          {list}
          {count}
          {slider}
          <div className="mt-auto space-y-4">
            {source}
            {cta}
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
        {views}
      </div>
      <div className="space-y-2 px-5 pb-5 sm:px-7 sm:pb-6">
        {source}
        <p className="t-meta">{footnote}</p>
      </div>
    </div>
  );
}
