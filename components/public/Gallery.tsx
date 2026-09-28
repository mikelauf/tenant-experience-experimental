"use client";

import { AnimatePresence, motion } from "motion/react";
import Image from "@/components/ui/SmoothImage";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import type { Img } from "@/lib/data/types";
import { useOverlay } from "@/lib/useOverlay";
import { IconButton } from "@/components/ui/Button";
import { PhotoTags } from "./PhotoTags";

/** Full-screen photo gallery; opens scrolled to the photo you picked. `start` null means closed. */
export function Gallery({ images, start, onClose, title }: { images: Img[]; start: number | null; onClose: () => void; title: string }) {
  const panel = useRef<HTMLDivElement>(null);
  useOverlay(start != null, onClose, panel);
  // Open on the photo that was picked
  useEffect(() => {
    if (start == null) return;
    const t = setTimeout(() => document.getElementById(`g-${start}`)?.scrollIntoView({ block: "center" }), 50);
    return () => clearTimeout(t);
  }, [start]);

  return (
    <AnimatePresence>
      {start != null && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`${title} photos`}
          ref={panel}
          tabIndex={-1}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="theme-night fixed inset-0 z-[90] overflow-y-auto outline-none"
          data-lenis-prevent
        >
          <div className="sticky top-0 z-10 flex items-center justify-between bg-night/80 px-4 py-3 backdrop-blur-xl lg:px-8">
            <p className="font-medium">{title}</p>
            <IconButton icon="close" label="Close gallery" onClick={onClose} autoFocus />
          </div>
          <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-2 px-2 pb-16 lg:gap-3 lg:px-8">
            {images.map((img, i) => (
              <motion.figure
                id={`g-${i}`}
                key={img.src + i}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.05, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className={cn("relative overflow-hidden rounded-2xl bg-night-3", i % 3 === 0 ? "col-span-2 aspect-[16/9]" : "aspect-[4/5]")}
              >
                <Image src={img.src} alt={img.alt} fill sizes={i % 3 === 0 ? "(min-width:1200px) 1200px, 100vw" : "(min-width:1200px) 600px, 50vw"} className="object-cover" style={{ objectPosition: img.pos }} />
                <PhotoTags img={img} frame={i % 3 === 0 ? 16 / 9 : 4 / 5} landmarksOnly />
                {img.caption && (
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 pt-10 text-[0.875rem] text-white/90">
                    {img.caption}
                  </figcaption>
                )}
              </motion.figure>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
