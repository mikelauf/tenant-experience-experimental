"use client";

import type { FloorStatus } from "@/lib/live";
import { useTenant } from "@/lib/tenants/client";

const FILL: Record<FloorStatus["tone"], string> = {
  mine: "var(--color-accent-glow)",
  event: "#f0c77e",
  open: "#5fc08f",
  full: "#7d858c",
  quiet: "transparent",
};

/**
 * A flat elevation of the tower from its profile, with lit floors. It stands in for the 3D
 * while it loads, and replaces it for reduced motion or no WebGL.
 */
export function TowerDiagram({ floors, selected, onPick }: { floors: FloorStatus[]; selected: number | null; onPick: (level: number) => void }) {
  const { tower: p } = useTenant();
  // One scale for everything, so the silhouette keeps the 3D model's proportions
  const crownH = (p.crown.kind === "spire" ? p.crown.height : p.crown.height + p.crown.mast) / p.floorH;
  const unit = 100 / (p.floors + crownH + 2);
  const scale = unit / p.floorH;
  const c = (h: number) => (h / p.floorH) * unit;
  const base = 104;
  const y = (f: number) => base - (f + 1) * unit;
  const lit = new Map(floors.map((f) => [f.level, f]));

  return (
    <svg viewBox="0 0 100 110" className="h-full w-full" preserveAspectRatio="xMidYMid meet" aria-hidden>
      {Array.from({ length: p.floors }, (_, f) => {
        const w = p.widthAt(f) * scale;
        return <rect key={f} x={50 - w / 2} y={y(f)} width={w} height={unit * 0.86} fill="rgb(255 255 255 / 0.14)" />;
      })}
      {p.crown.kind === "spire" ? (
        <path d={`M${50 - p.crown.radius * scale * 0.7} ${y(p.floors - 1)} L50 ${y(p.floors - 1) - c(p.crown.height)} L${50 + p.crown.radius * scale * 0.7} ${y(p.floors - 1)} Z`} fill="rgb(255 255 255 / 0.2)" />
      ) : (
        <>
          <rect x={50 - p.crown.radius * scale} y={y(p.floors - 1) - c(p.crown.height)} width={p.crown.radius * scale * 2} height={c(p.crown.height)} fill="var(--color-accent-glow)" opacity={0.5} />
          <rect x={49.6} y={y(p.floors - 1) - c(p.crown.height + p.crown.mast)} width={0.8} height={c(p.crown.mast)} fill="rgb(255 255 255 / 0.4)" />
        </>
      )}
      {[...lit.values()].map((f) => {
        const floor = Math.min(f.level, p.floors - 1);
        const w = (f.level === 0 ? p.widthAt(0) + 2 : p.widthAt(floor)) * scale;
        return (
          <rect
            key={f.level}
            x={50 - w / 2 - 1}
            y={f.level === 0 ? base : y(floor) - 0.3}
            width={w + 2}
            height={unit + 0.6}
            fill={FILL[f.tone]}
            opacity={selected == null || selected === f.level ? 0.95 : 0.45}
            className="cursor-pointer"
            onClick={() => onPick(f.level)}
          />
        );
      })}
      <rect x={10} y={base} width={80} height={0.3} fill="rgb(255 255 255 / 0.25)" />
    </svg>
  );
}
