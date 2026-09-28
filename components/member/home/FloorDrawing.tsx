"use client";

import { motion, useReducedMotion } from "motion/react";
import { ACCESS_LABEL, standing } from "@/lib/amenities";
import { cn } from "@/lib/cn";
import type { Amenity } from "@/lib/data/types";
import { elevation } from "@/lib/elevation";
import { useDemo } from "@/lib/store";
import { useTenant } from "@/lib/tenants/client";

export const OK = "#5fc08f";
export const STEP = "#f0c77e";

/* The drawing's own units */
const W = 320;
const H = 380;
const CX = 64;
const GROUND = H - 18;
const LABEL_X = 132;
const GAP = 30;

/**
 * The tower in elevation, every floor with something on it lit and named; the names are the buttons.
 * `night` colors each floor by whether you can use it (open, or a step first). `day` is the drawing on paper:
 * the `active` floors take the accent and the rest stay in pencil, so it can follow what you're reading.
 */
export function FloorDrawing({
  list,
  active,
  hoverId,
  onPick,
  onHover,
  tone = "night",
  elevator,
  className,
}: {
  list: Amenity[];
  /** The picked floor (night) or the floors being read (day) */
  active: string[];
  hoverId: string | null;
  onPick: (id: string) => void;
  onHover: (id: string | null) => void;
  tone?: "night" | "day";
  /** A light that rides up the middle of the tower, over and over */
  elevator?: boolean;
  className?: string;
}) {
  const { tower: p } = useTenant();
  const s = useDemo();
  const reduce = useReducedMotion();
  const e = elevation(p, { cx: CX, ground: GROUND });
  const night = tone === "night";
  const glow = night ? "var(--color-accent-glow)" : "var(--color-accent)";

  const marks = list.map((a) => {
    const park = a.level === 0;
    const floor = Math.max(0, a.level! - 1);
    const at = park ? GROUND - 4 : e.y((floor + 0.5) * p.floorH);
    const edge = park ? CX + e.half(0) + 10 : CX + e.half(floor) + (e.inWings(floor) ? e.wingOut : 0) + 3;
    return { a, park, floor, at, edge, labelY: at, ok: standing(a, s.persona, s.fitnessMember).ok };
  });
  for (let k = 1; k < marks.length; k++) marks[k]!.labelY = Math.max(marks[k]!.labelY, marks[k - 1]!.labelY + GAP);
  const last = marks.at(-1);
  if (last && last.labelY > H - 8) {
    last.labelY = H - 8;
    for (let k = marks.length - 2; k >= 0; k--) marks[k]!.labelY = Math.min(marks[k]!.labelY, marks[k + 1]!.labelY - GAP);
  }
  const pct = (n: number, of: number) => `${(n / of) * 100}%`;

  return (
    <div className={cn("relative h-[300px] w-full max-w-[340px] sm:h-[320px]", className)} style={{ aspectRatio: `${W} / ${H}` }}>
      <svg viewBox={`0 0 ${W} ${H}`} className={cn("absolute inset-0 size-full overflow-visible", night ? "text-moon" : "text-ink")} aria-hidden>
        <line x1={CX - e.half(0) - 30} x2={LABEL_X - 16} y1={GROUND + 0.5} y2={GROUND + 0.5} stroke="currentColor" strokeOpacity={0.25} />
        {p.wings &&
          ([-1, 1] as const).map((side) => (
            <polygon key={side} points={e.wing(side)} fill="currentColor" fillOpacity={0.06} stroke="currentColor" strokeOpacity={0.3} strokeLinejoin="round" />
          ))}
        <polygon points={e.body} fill="currentColor" fillOpacity={night ? 0.05 : 0.03} stroke="currentColor" strokeOpacity={night ? 0.45 : 0.4} strokeLinejoin="round" />
        {Array.from({ length: p.floors - 1 }, (_, k) => k + 1).map((i) => (
          <line key={i} x1={CX - e.half(i)} x2={CX + e.half(i)} y1={e.y(i * p.floorH)} y2={e.y(i * p.floorH)} stroke="currentColor" strokeOpacity={0.1} strokeWidth={0.75} />
        ))}
        <polygon points={e.crown.points} fill="currentColor" fillOpacity={0.12} stroke="currentColor" strokeOpacity={0.45} strokeLinejoin="round" />
        {e.crown.kind === "lantern" && <line x1={CX} x2={CX} y1={e.crown.mast[0]} y2={e.crown.mast[1]} stroke="currentColor" strokeOpacity={0.45} />}

        {elevator && !reduce && (
          <motion.rect
            x={CX - 2.5}
            width={5}
            height={7}
            rx={1.5}
            fill={glow}
            initial={{ y: GROUND - 8, opacity: 0 }}
            animate={{ y: [GROUND - 8, e.y(p.floors * p.floorH)], opacity: [0, 1, 1, 0] }}
            transition={{
              y: { duration: 5.5, ease: [0.45, 0, 0.55, 1], repeat: Infinity, repeatDelay: 1.2 },
              opacity: { duration: 5.5, times: [0, 0.08, 0.9, 1], repeat: Infinity, repeatDelay: 1.2 },
            }}
            style={{ filter: "drop-shadow(0 0 6px var(--color-accent-glow))" }}
          />
        )}
        {marks.map((m) => {
          const lit = active.includes(m.a.id);
          const on = lit || m.a.id === hoverId;
          const color = lit ? glow : night ? (m.ok ? OK : STEP) : "currentColor";
          const fill = night ? (on ? 1 : 0.75) : lit ? 1 : on ? 0.45 : 0.22;
          const sl = e.slab(m.floor);
          return (
            <g key={m.a.id}>
              {m.park ? (
                <rect x={CX + e.half(0) + 4} y={GROUND - 6} width={22} height={6} rx={1.5} fill={color} fillOpacity={fill} className="transition-[fill-opacity] duration-500" />
              ) : (
                <rect x={sl.x - 1} y={sl.y - 1} width={sl.w + 2} height={sl.h + 2} fill={color} fillOpacity={fill} className="transition-[fill-opacity] duration-500" />
              )}
              {lit && !m.park && !reduce && (
                <motion.rect
                  x={sl.x - 4}
                  y={sl.y - 4}
                  width={sl.w + 8}
                  height={sl.h + 8}
                  rx={3}
                  fill={glow}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.35, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
              <polyline
                points={`${m.edge},${m.at} ${LABEL_X - 26},${m.at} ${LABEL_X - 10},${m.labelY} ${LABEL_X - 4},${m.labelY}`}
                fill="none"
                stroke="currentColor"
                strokeOpacity={on ? 0.85 : 0.3}
                className="transition-[stroke-opacity] duration-500"
              />
            </g>
          );
        })}
      </svg>

      {marks.map((m) => {
        const lit = active.includes(m.a.id);
        return (
          <button
            key={m.a.id}
            onClick={() => onPick(m.a.id)}
            onPointerEnter={() => onHover(m.a.id)}
            onPointerLeave={() => onHover(null)}
            onFocus={() => onHover(m.a.id)}
            onBlur={() => onHover(null)}
            aria-pressed={night ? lit : undefined}
            aria-current={!night && lit ? "true" : undefined}
            aria-label={`${m.a.name}, ${m.a.where}. ${ACCESS_LABEL[m.a.access]}`}
            className={cn(
              "absolute flex -translate-y-1/2 items-baseline gap-2.5 whitespace-nowrap text-left text-[0.9375rem] transition-colors duration-500",
              night ? (lit ? "font-medium text-moon" : "text-moon/75 hover:text-moon") : lit ? "font-medium text-ink" : "text-stone hover:text-ink",
            )}
            style={{ left: pct(LABEL_X, W), top: pct(m.labelY, H) }}
          >
            <span className={cn("t-num w-6 text-[0.8125rem]", lit ? (night ? "text-accent-glow" : "text-accent") : night ? "text-moon-2" : "text-stone-2")}>
              {m.a.level === 0 ? "St" : m.a.level}
            </span>
            {m.a.name.replace(/^Transamerica /, "")}
          </button>
        );
      })}
    </div>
  );
}
