"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import type { Img } from "@/lib/data/types";

/**
 * Where a tag lands inside a frame that crops the photo (object-fit: cover), in percent of the frame,
 * or null when the crop cuts it off. `frame` is the frame's width / height; `pos` the photo's object-position.
 */
export function coverPoint(x: number, y: number, ratio: number, frame: number, pos = "50% 50%") {
  const [px, py] = pos.split(" ").map((v) => parseFloat(v) / 100);
  let fx = x / 100;
  let fy = y / 100;
  if (ratio > frame) {
    const shown = frame / ratio; // share of the width that's visible
    fx = (fx - (1 - shown) * (px ?? 0.5)) / shown;
  } else {
    const shown = ratio / frame;
    fy = (fy - (1 - shown) * (py ?? 0.5)) / shown;
  }
  if (fx < 0.05 || fx > 0.95 || fy < 0.04 || fy > 0.96) return null;
  return { x: fx * 100, y: fy * 100 };
}

/**
 * Points out what's in a photo (a landmark through the window, the bar, the stage) with a label, a stem
 * and a dot, as in the view photos. Placed for the frame's crop; near the top edge the label hangs below.
 */
export function PhotoTags({
  img,
  frame,
  max = 3,
  small,
  delay = 0,
  landmarksOnly,
}: {
  img: Img;
  frame: number;
  max?: number;
  small?: boolean;
  delay?: number;
  /** Name only the landmarks, not every bench and bar */
  landmarksOnly?: boolean;
}) {
  if (!img.tags?.length || !img.ratio) return null;
  const shown = img.tags
    .filter((t) => !landmarksOnly || t.landmark)
    .map((t) => ({ t, at: coverPoint(t.x, t.y, img.ratio!, frame, img.pos) }))
    .filter((p): p is { t: (typeof img.tags)[number]; at: { x: number; y: number } } => !!p.at)
    .slice(0, max);

  return (
    <>
      {shown.map(({ t, at }, k) => {
        const below = at.y < 22;
        // Near a side edge the label runs inward from the point instead of centering on it
        const edge = at.x < 22 ? "start" : at.x > 78 ? "end" : "mid";
        const label = (
          <span
            className={cn(
              "whitespace-nowrap rounded-full bg-night/75 font-medium text-moon shadow-[var(--shadow-float)] backdrop-blur-sm",
              small ? "px-2 py-0.5 text-[0.6875rem]" : "px-2.5 py-1 text-[0.75rem]",
            )}
          >
            {t.label}
          </span>
        );
        const stem = <span className={cn("w-px bg-moon/80", small ? "h-3" : "h-5", edge === "start" && "ml-[3.5px]", edge === "end" && "mr-[3.5px]")} />;
        const dot = <span className="keep-round size-2 rounded-full border-2 border-night bg-moon" />;
        return (
          <motion.span
            key={t.label}
            initial={{ opacity: 0, y: below ? -6 : 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{ delay: delay + 0.2 + k * 0.08, duration: 0.4 }}
            className={cn(
              "pointer-events-none absolute flex flex-col",
              edge === "start"
                ? "-translate-x-[4px] items-start"
                : edge === "end"
                  ? "translate-x-[calc(-100%+4px)] items-end"
                  : "-translate-x-1/2 items-center",
            )}
            style={below ? { left: `${at.x}%`, top: `${at.y}%` } : { left: `${at.x}%`, bottom: `${100 - at.y}%` }}
          >
            {below ? (
              <>
                {dot}
                {stem}
                {label}
              </>
            ) : (
              <>
                {label}
                {stem}
                {dot}
              </>
            )}
          </motion.span>
        );
      })}
    </>
  );
}
