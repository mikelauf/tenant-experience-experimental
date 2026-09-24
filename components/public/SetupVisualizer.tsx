"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { setupLabels } from "@/lib/data/rooms";
import type { Setup, Venue } from "@/lib/data/types";
import { NumberRoll } from "@/components/motion/NumberRoll";
import { Lazy3D } from "@/components/three/Lazy3D";
import { makeLayout } from "@/components/three/setup/layouts";

const SetupCanvas = dynamic(() => import("@/components/three/setup/SetupCanvas"), { ssr: false });

const setupNotes: Record<Setup, string> = {
  reception: "Standing, with high-tops and a bar",
  theater: "Rows facing a stage or screen",
  banquet: "Rounds of eight for a seated meal",
  boardroom: "One long table",
  classroom: "Tables in rows, facing forward",
  lounge: "Sofa groups for conversation",
};

/** Top-down plan, drawn from the same layout. Used as the poster and the reduced-motion view. */
function Plan({ plate, setup, capacity }: { plate: Venue["plate"]; setup: Setup; capacity: number }) {
  const L = useMemo(() => makeLayout(setup, capacity, plate.w, plate.d), [setup, capacity, plate.w, plate.d]);
  const pad = 1;
  return (
    <svg viewBox={`${-plate.w / 2 - pad} ${-plate.d / 2 - pad} ${plate.w + pad * 2} ${plate.d + pad * 2}`} className="h-full w-full">
      <rect
        x={-plate.w / 2}
        y={-plate.d / 2}
        width={plate.w}
        height={plate.d}
        rx={0.3}
        fill={plate.outdoor ? "#d6d9cd" : "#ebe4d8"}
        stroke="#cfccc4"
        strokeWidth={0.08}
      />
      {L.stage && <rect x={-Math.min(plate.w * 0.25, 3.5)} y={-plate.d / 2 + 0.3} width={Math.min(plate.w * 0.5, 7)} height={1.3} fill="#d8d1c4" />}
      {L.bar && <rect x={-plate.w / 2 + 0.35} y={-Math.min(plate.d * 0.275, 3)} width={0.7} height={Math.min(plate.d * 0.55, 6)} fill="#6f4a2f" />}
      {L.rounds.map(([x, z, s], i) => (
        <circle key={`r${i}`} cx={x} cy={z} r={0.62 * (s || 1)} fill="#6f4a2f" />
      ))}
      {L.longs.map(([x, z, len], i) => (
        <rect key={`l${i}`} x={x - len / 2} y={z - 0.31} width={len} height={0.62} fill="#6f4a2f" />
      ))}
      {L.highs.map(([x, z], i) => (
        <circle key={`h${i}`} cx={x} cy={z} r={0.3} fill="#6f4a2f" />
      ))}
      {L.sofas.map(([x, z], i) => (
        <rect key={`s${i}`} x={x - 0.95} y={z - 0.4} width={1.9} height={0.8} rx={0.2} fill="#d9cfbf" />
      ))}
      {L.chairs.map(([x, z], i) => (
        <rect key={`c${i}`} x={x - 0.21} y={z - 0.2} width={0.42} height={0.4} rx={0.08} fill="#2a2d30" />
      ))}
      {L.people.map(([x, z], i) => (
        <circle key={`p${i}`} cx={x} cy={z} r={0.18} fill={i % 3 ? "#62666a" : "#9a3f25"} />
      ))}
    </svg>
  );
}

export function SetupVisualizer({
  plate,
  capacities,
  className,
  value,
  onChange,
  title = "How it sets",
}: {
  plate: Venue["plate"];
  capacities: Partial<Record<Setup, number>>;
  className?: string;
  value?: Setup;
  onChange?: (s: Setup) => void;
  title?: string;
}) {
  const setups = Object.keys(capacities) as Setup[];
  const [inner, setInner] = useState<Setup>(setups[0]);
  const setup = value ?? inner;
  const set = (s: Setup) => (onChange ? onChange(s) : setInner(s));
  const cap = capacities[setup] ?? 0;

  return (
    <div className={cn("overflow-hidden rounded-[var(--radius-media)] bg-paper shadow-[var(--shadow-ring)]", className)}>
      <div className="flex flex-wrap items-end justify-between gap-4 p-5 pb-0 sm:p-7 sm:pb-0">
        <div>
          <p className="t-meta">{title}</p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="t-num text-[clamp(2.75rem,2rem+3vw,4.5rem)] font-medium leading-none">
              <NumberRoll value={cap} />
            </span>
            <span className="t-lead text-stone">{setup === "reception" ? "standing" : "seated"}</span>
          </p>
          <p className="t-small mt-1 text-stone">{setupNotes[setup]}</p>
        </div>
        <div role="tablist" aria-label="Room setup" className="flex flex-wrap gap-1 rounded-full bg-fog p-1">
          {setups.map((s) => (
            <button
              key={s}
              role="tab"
              aria-selected={s === setup}
              onClick={() => set(s)}
              className={cn(
                "rounded-full px-3.5 py-2 text-[0.875rem] font-medium transition-[background-color,color,box-shadow] duration-300",
                s === setup ? "bg-paper text-ink shadow-[var(--shadow-soft)]" : "text-stone hover:text-ink",
              )}
            >
              {setupLabels[s]}
            </button>
          ))}
        </div>
      </div>
      <Lazy3D
        className="aspect-[16/10] w-full"
        poster={
          <div className="flex h-full items-center justify-center p-6">
            <Plan plate={plate} setup={setup} capacity={cap} />
          </div>
        }
      >
        {({ active, onReady }) => <SetupCanvas plate={plate} setup={setup} capacity={cap} active={active} onReady={onReady} />}
      </Lazy3D>
      <p className="t-meta px-5 pb-5 sm:px-7 sm:pb-6">Illustrative layout at the listed capacity. Our events team confirms the final plan with you.</p>
    </div>
  );
}
