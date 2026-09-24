"use client";

import { AnimatePresence, motion } from "motion/react";
import Image from "@/components/ui/SmoothImage";
import { ViewTransition, useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import type { Img } from "@/lib/data/types";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/Button";

/** 1 + 4 photo mosaic (Airbnb/Kayak) that opens a full gallery. */
export function Mosaic({ images, vt, title }: { images: Img[]; vt: string; title: string }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <>
      <div className="grid h-[62svh] min-h-[380px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-[var(--radius-media)] lg:h-[72svh] lg:max-h-[760px]">
        {images.slice(0, 5).map((img, i) => (
          <button
            key={img.src + i}
            onClick={() => setOpen(i)}
            className={cn("group relative overflow-hidden bg-fog", i === 0 ? "col-span-4 row-span-2 lg:col-span-2" : "hidden lg:block")}
            aria-label={`Open photo ${i + 1} of ${images.length}`}
          >
            {i === 0 ? (
              <ViewTransition name={vt} share="morph" default="none">
                <div className="absolute inset-0">
                  <Image
                    src={img.src}
                    alt={img.alt}
                    fill
                    priority
                    sizes="(min-width:1024px) 50vw, 100vw"
                    className="object-cover transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-[1.02]"
                    style={{ objectPosition: img.pos }}
                  />
                </div>
              </ViewTransition>
            ) : (
              <Image
                src={img.src}
                alt={img.alt}
                fill
                sizes="25vw"
                className="object-cover transition-[transform,filter] duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-[1.04] group-hover:brightness-95"
                style={{ objectPosition: img.pos }}
              />
            )}
          </button>
        ))}
      </div>
      <div className="relative">
        <button
          onClick={() => setOpen(0)}
          className="absolute -top-16 right-4 flex h-10 items-center gap-2 rounded-full bg-paper px-4 text-[0.875rem] font-medium shadow-[var(--shadow-soft)] transition-transform active:scale-95"
        >
          <Icon name="grid" size={16} />
          Show all {images.length} photos
        </button>
      </div>
      <Gallery images={images} start={open} onClose={() => setOpen(null)} title={title} />
    </>
  );
}

function Gallery({ images, start, onClose, title }: { images: Img[]; start: number | null; onClose: () => void; title: string }) {
  useEffect(() => {
    if (start == null) return;
    window.__lenis?.stop();
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => document.getElementById(`g-${start}`)?.scrollIntoView({ block: "center" }), 50);
    return () => {
      clearTimeout(t);
      window.__lenis?.start();
      document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [start, onClose]);

  return (
    <AnimatePresence>
      {start != null && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`${title} photos`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="theme-night fixed inset-0 z-[90] overflow-y-auto"
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
                <Image src={img.src} alt={img.alt} fill sizes="(min-width:1024px) 1200px, 100vw" className="object-cover" style={{ objectPosition: img.pos }} />
              </motion.figure>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
