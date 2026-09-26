"use client";

import Image from "@/components/ui/SmoothImage";
import { cn } from "@/lib/cn";
import type { Img } from "@/lib/data/types";

/** A steady hover shows the peek after `PEEK_MS` and opens the venue at `DWELL_MS`; the ring fills in between. */
export const PEEK_MS = 220;
export const DWELL_MS = 1300;
const RING = 2 * Math.PI * 10;

/**
 * A venue's marker on the 3D tower: a beacon dot on the floor's edge, a hairline, and a glass tag.
 * Hovering shows a peek (photo and headline facts) while the ring fills; when it closes, the venue opens.
 */
export function FloorMarker({
  num,
  name,
  photo,
  facts,
  active,
  dim,
  peek,
  arming,
  onEnter,
  onLeave,
  onOpen,
}: {
  num: string;
  name: string;
  photo?: Img;
  facts: string;
  active: boolean;
  dim: boolean;
  peek: boolean;
  arming: boolean;
  onEnter: (e: React.PointerEvent) => void;
  onLeave: () => void;
  onOpen: () => void;
}) {
  const lit = active || peek;
  return (
    <div
      className={cn("relative -ml-[11px] transition-opacity duration-500", dim && !lit ? "opacity-45" : "opacity-100", lit && "z-10")}
    >
      <button
        onClick={onOpen}
        onPointerEnter={onEnter}
        onPointerLeave={onLeave}
        aria-label={`${name}, level ${num}`}
        aria-pressed={active}
        className="group flex items-center outline-offset-4"
      >
        {/* Dot, beacon and dwell ring */}
        <span className="keep-round relative grid size-[22px] place-items-center">
          {!active && <span aria-hidden className="keep-round absolute size-2 animate-beacon rounded-full bg-moon/70" />}
          <svg aria-hidden viewBox="0 0 24 24" className="absolute inset-0 -rotate-90">
            <circle
              cx="12"
              cy="12"
              r="10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="text-accent-glow"
              strokeDasharray={RING}
              strokeDashoffset={arming ? 0 : RING}
              style={{ transition: arming ? `stroke-dashoffset ${DWELL_MS - PEEK_MS}ms linear` : "none" }}
            />
          </svg>
          <span
            className={cn(
              "keep-round relative size-2 rounded-full shadow-[0_0_0_3px_rgb(0_0_0/0.25)] transition-[background-color,transform] duration-300",
              active ? "scale-125 bg-accent-glow" : "bg-moon group-hover:scale-125",
            )}
          />
        </span>
        <span aria-hidden className={cn("h-px bg-moon/45 transition-[width] duration-500 ease-[var(--ease-out-expo)]", lit ? "w-6" : "w-3.5")} />
        <span
          className={cn(
            "flex h-7 items-center gap-2 whitespace-nowrap rounded-full pl-2.5 pr-3 text-[0.75rem] font-medium backdrop-blur-md transition-[background-color,box-shadow,color] duration-300",
            active
              ? "bg-accent text-paper shadow-[0_8px_24px_-8px_rgb(0_0_0/0.6)]"
              : "bg-night/55 text-moon shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)] group-hover:bg-night/75",
          )}
        >
          <span className={cn("t-num text-[0.8125rem]", active ? "text-paper/80" : "text-accent-glow")}>{num}</span>
          {name}
        </span>
      </button>

      {/* Peek: what's here, before you commit */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-[40px] top-[calc(100%+8px)] w-[232px] origin-top-left overflow-hidden rounded-2xl bg-night/80 text-moon shadow-[0_24px_48px_-16px_rgb(0_0_0/0.7),inset_0_0_0_1px_rgb(255_255_255/0.08)] backdrop-blur-xl transition-[opacity,transform] duration-300 ease-[var(--ease-out-expo)]",
          peek && !active ? "scale-100 opacity-100" : "scale-95 opacity-0",
        )}
      >
        {peek && photo && (
          <div className="relative aspect-[16/10] bg-night-2">
            <Image src={photo.src} alt="" fill sizes="232px" className="object-cover" style={{ objectPosition: photo.pos }} />
          </div>
        )}
        <div className="px-3.5 pb-3 pt-2.5">
          <p className="text-[0.9375rem] font-medium">{name}</p>
          <p className="t-meta !text-moon-2">{facts}</p>
          <p className="mt-2 text-[0.6875rem] text-moon-2/80">Keep hovering or click to open</p>
        </div>
      </div>
    </div>
  );
}
