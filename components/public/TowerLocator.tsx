"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import type { Venue } from "@/lib/data/types";
import { useTenant } from "@/lib/tenants/client";
import { topOf } from "@/lib/tower";
import { Icon } from "@/components/ui/Icon";

/** The drawing's own units; it renders at this size on wide screens, a little smaller on phones */
const W = 320;
const H = 400;
const CX = 92;
const GROUND = H - 30;
/** Where the labels start, and the least room between two of them */
const LABEL_X = 176;
const GAP = 27;

const pct = (n: number, of: number) => `${(n / of) * 100}%`;
const shortName = (name: string) => name.replace(/^Transamerica /, "");

/**
 * Where a venue sits in its building: an elevation drawn from the tenant's own tower profile (its floors, taper,
 * wings and crown), every venue's floor marked and named, this one lit. The drawing links to the 3D explorer,
 * which opens at this floor.
 */
export function TowerLocator({ v }: { v: Pick<Venue, "slug" | "name" | "level"> }) {
  const { tower: p, venues } = useTenant();
  const reduce = useReducedMotion();
  const top = topOf(p);
  const crown = p.crown.kind === "spire" ? p.crown.height : p.crown.height + p.crown.mast;
  const s = (GROUND - 12) / (top + crown);
  const y = (u: number) => GROUND - u * s;
  const half = (floor: number) => (p.widthAt(Math.max(0, Math.min(floor, p.floors - 1))) / 2) * s;
  const inWings = (floor: number) => !!p.wings && floor >= p.wings.from && floor < p.wings.to;
  const WING_OUT = 0.29 * s;

  // The body, stepped floor by floor (a straight taper reads as a smooth line at this size; setbacks stay crisp)
  const left: string[] = [];
  const right: string[] = [];
  for (let i = 0; i < p.floors; i++) {
    const w = half(i);
    left.push(`${CX - w},${y(i * p.floorH)}`, `${CX - w},${y((i + 1) * p.floorH)}`);
    // Walked back down on the right: each floor's top corner before its bottom one
    right.unshift(`${CX + w},${y((i + 1) * p.floorH)}`, `${CX + w},${y(i * p.floorH)}`);
  }
  const body = [...left, ...right].join(" ");

  // The park, when the building has one: a short row of trees beside the base, on the side away from the labels
  const baseRight = CX + half(0);
  const trees = p.park ? Array.from({ length: 6 }, (_, k) => CX - half(0) - 9 - k * 7.5) : [];

  // The wings, each one outline: stepped with the body on its inner edge, a fixed depth out
  const wing = (side: -1 | 1) => {
    if (!p.wings) return "";
    const pts: string[] = [];
    const rows = Array.from({ length: p.wings.to - p.wings.from }, (_, k) => p.wings!.from + k);
    for (const i of rows) pts.push(`${CX + side * (half(i) + WING_OUT)},${y(i * p.floorH)}`, `${CX + side * (half(i) + WING_OUT)},${y((i + 1) * p.floorH)}`);
    for (const i of [...rows].reverse()) pts.push(`${CX + side * half(i)},${y((i + 1) * p.floorH)}`, `${CX + side * half(i)},${y(i * p.floorH)}`);
    return pts.join(" ");
  };

  // Every venue's floor: its slab, and a label pushed clear of its neighbours, top to bottom
  const marks = [...venues]
    .sort((a, b) => b.level - a.level)
    .map((x) => {
      const floor = x.level - 1;
      const park = x.level === 0;
      const at = park ? GROUND - 5 : y((floor + 0.5) * p.floorH);
      const edge = park ? baseRight + 3 : CX + half(floor) + (inWings(floor) ? WING_OUT : 0) + 3;
      return { x, floor, park, at, edge, labelY: at, here: x.slug === v.slug };
    });
  for (let k = 1; k < marks.length; k++) marks[k].labelY = Math.max(marks[k].labelY, marks[k - 1].labelY + GAP);
  // Pushed past the bottom: settle the last one on it and let the others make room above
  const last = marks.at(-1);
  if (last && last.labelY > H - 10) {
    last.labelY = H - 10;
    for (let k = marks.length - 2; k >= 0; k--) marks[k].labelY = Math.min(marks[k].labelY, marks[k + 1].labelY - GAP);
  }
  const here = marks.find((m) => m.here);

  return (
    <figure>
      <figcaption className="t-meta">In the building</figcaption>
      <div className="relative mt-4 aspect-[4/5] h-[300px] sm:h-[340px] lg:h-[400px]">
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full overflow-visible" aria-hidden>
          <line x1={(trees.at(-1) ?? CX - half(0)) - 8} x2={LABEL_X - 16} y1={GROUND + 0.5} y2={GROUND + 0.5} stroke="var(--color-ink)" strokeOpacity={0.22} />

          {/* The wings behind, then the body */}
          {p.wings &&
            ([-1, 1] as const).map((side) => (
              <polygon key={side} points={wing(side)} fill="var(--color-ink)" fillOpacity={0.1} stroke="var(--color-ink)" strokeOpacity={0.3} strokeWidth={1} strokeLinejoin="round" />
            ))}
          <polygon points={body} fill="var(--color-quartz)" stroke="var(--color-ink)" strokeOpacity={0.4} strokeWidth={1} strokeLinejoin="round" />
          <polygon points={body} fill="var(--color-ink)" fillOpacity={0.06} />

          {/* One hairline a floor */}
          {Array.from({ length: p.floors - 1 }, (_, k) => k + 1).map((i) => (
            <line key={i} x1={CX - half(i)} x2={CX + half(i)} y1={y(i * p.floorH)} y2={y(i * p.floorH)} stroke="var(--color-ink)" strokeOpacity={0.09} strokeWidth={0.75} />
          ))}

          {/* The crown */}
          {p.crown.kind === "spire" ? (
            <polygon
              points={`${CX - p.crown.radius * s},${y(top)} ${CX + p.crown.radius * s},${y(top)} ${CX},${y(top + p.crown.height)}`}
              fill="var(--color-ink)"
              fillOpacity={0.14}
              stroke="var(--color-ink)"
              strokeOpacity={0.4}
              strokeLinejoin="round"
            />
          ) : (
            <>
              <polygon
                points={`${CX - p.crown.radius * s},${y(top)} ${CX + p.crown.radius * s},${y(top)} ${CX + p.crown.radius * 0.82 * s},${y(top + p.crown.height)} ${CX - p.crown.radius * 0.82 * s},${y(top + p.crown.height)}`}
                fill="var(--color-ink)"
                fillOpacity={0.14}
                stroke="var(--color-ink)"
                strokeOpacity={0.4}
              />
              <line x1={CX} x2={CX} y1={y(top + p.crown.height)} y2={y(top + crown)} stroke="var(--color-ink)" strokeOpacity={0.4} />
            </>
          )}

          {trees.map((tx, k) => (
            <path
              key={tx}
              d={`M${tx - 3.2},${GROUND} L${tx},${GROUND - 11 - (k % 3) * 2} L${tx + 3.2},${GROUND} Z`}
              fill={here?.park ? "var(--color-accent)" : "var(--color-ink)"}
              fillOpacity={here?.park ? 0.85 : 0.22}
            />
          ))}

          {/* Venue floors: the others quietly, this one lit, with a slow breath around it */}
          {marks.map((m) =>
            m.park ? null : (
              <rect
                key={m.x.slug}
                x={CX - half(m.floor)}
                y={y((m.floor + 1) * p.floorH)}
                width={half(m.floor) * 2}
                height={p.floorH * s}
                fill={m.here ? "var(--color-accent)" : "var(--color-ink)"}
                fillOpacity={m.here ? 1 : 0.4}
              />
            ),
          )}
          {here && !here.park && !reduce && (
            <motion.rect
              x={CX - half(here.floor) - 3}
              y={y((here.floor + 1) * p.floorH) - 3}
              width={half(here.floor) * 2 + 6}
              height={p.floorH * s + 6}
              rx={3}
              fill="var(--color-accent)"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.28, 0] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            />
          )}

          {/* Leaders out to the names */}
          {marks.map((m) => (
            <polyline
              key={m.x.slug}
              points={`${m.edge},${m.at} ${LABEL_X - 26},${m.at} ${LABEL_X - 10},${m.labelY} ${LABEL_X - 4},${m.labelY}`}
              fill="none"
              stroke={m.here ? "var(--color-accent)" : "var(--color-ink)"}
              strokeOpacity={m.here ? 0.9 : 0.25}
              strokeWidth={1}
            />
          ))}
        </svg>

        {marks.map((m) => {
          const num = m.park ? "G" : String(m.x.level);
          const style = { left: pct(LABEL_X, W), top: pct(m.labelY, H) };
          const body = (
            <>
              <span className={m.here ? "w-7 tabular-nums text-accent" : "w-7 tabular-nums"}>{num}</span>
              {shortName(m.x.name)}
            </>
          );
          return m.here ? (
            <span key={m.x.slug} aria-current="location" className="absolute flex -translate-y-1/2 items-baseline whitespace-nowrap text-[0.9375rem] font-medium text-ink" style={style}>
              {body}
            </span>
          ) : (
            <Link
              key={m.x.slug}
              href={`/venues/${m.x.slug}`}
              className="absolute flex -translate-y-1/2 items-baseline whitespace-nowrap text-[0.875rem] text-stone transition-colors hover:text-ink"
              style={style}
            >
              {body}
            </Link>
          );
        })}
      </div>

      <Link href={`/venues?floor=${v.slug}`} className="group mt-5 inline-flex items-center gap-2 border-b border-ink/25 pb-0.5 font-medium transition-colors hover:border-ink">
        {v.level > 0 ? `See Level ${v.level} in 3D` : "See it in 3D"}
        <Icon name="arrow-right" size={17} className="transition-transform group-hover:translate-x-0.5" />
      </Link>
    </figure>
  );
}
