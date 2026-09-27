"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import Image from "@/components/ui/SmoothImage";
import { useTenant } from "@/lib/tenants/client";
import { Reveal } from "@/components/motion/Reveal";

/**
 * "The setting", from the current public TAP site: a two-line statement, then a pair of
 * photographs that start inset and open out to the full width of the page as you scroll.
 */
export function Setting() {
  const setting = useTenant().copy.public.setting;
  const row = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  // 0 as the row's top enters near the bottom of the screen, 1 once it has risen most of the way up.
  const { scrollYProgress } = useScroll({ target: row, offset: ["start 0.95", "start 0.15"] });
  const inset = useTransform(scrollYProgress, [0, 1], [7, 0]);
  // Corners shrink with the inset. The radius comes from CSS so the flat style can square it.
  const round = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const clipPath = useTransform([inset, round], ([i, k]) => `inset(0 ${i}% round calc(${k} * var(--radius-clip)))`);
  const scale = useTransform(scrollYProgress, [0, 1], [1.08, 1]);

  if (!setting) return null;

  return (
    <section className="pb-2 pt-20 lg:pb-3 lg:pt-32" aria-labelledby="setting-h">
      <div className="frame grid-12 items-end gap-y-6">
        <div className="col-span-12 lg:col-span-7">
          <p className="t-meta">The setting</p>
          <h2 id="setting-h" className="t-hero mt-4">
            {setting.lines[0]}
            <br />
            <span className="text-stone">{setting.lines[1]}</span>
          </h2>
        </div>
        <Reveal className="col-span-12 lg:col-span-4 lg:col-start-9 lg:pb-3">
          <p className="t-lead text-stone">{setting.body}</p>
        </Reveal>
      </div>

      <motion.div
        ref={row}
        style={reduced ? undefined : { clipPath }}
        className="mt-12 grid gap-2 sm:grid-cols-[1.2fr_1fr] lg:mt-16 lg:gap-3"
      >
        {setting.images.map((img) => (
          <figure key={img.src} className="relative h-[min(72svh,560px)] overflow-hidden bg-fog sm:h-[clamp(420px,62svh,720px)]">
            <motion.div className="absolute inset-0" style={reduced ? undefined : { scale }}>
              <Image src={img.src} alt={img.alt} fill sizes="(min-width:640px) 55vw, 100vw" className="object-cover" style={{ objectPosition: img.pos }} />
            </motion.div>
            <figcaption className="absolute bottom-5 left-5 rounded-[10px] bg-night/70 px-3.5 py-2 text-[0.875rem] text-moon backdrop-blur-md lg:bottom-7 lg:left-7">
              {img.caption}
            </figcaption>
          </figure>
        ))}
      </motion.div>
    </section>
  );
}
