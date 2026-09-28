"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import Image from "@/components/ui/SmoothImage";
import { cn } from "@/lib/cn";
import type { Img } from "@/lib/data/types";
import { Icon } from "@/components/ui/Icon";

type Slide = Img & { label: string };

/** How long each photo holds. The optional film plays for up to `FILM_MS` first. */
const PHOTO_MS = 7000;
const FILM_MS = 10000;

/**
 * Full-bleed hero media: an optional short film, then a crossfading photo carousel.
 * It pauses offscreen, in a background tab, on hover-free pause, and never moves with reduced motion.
 */
export function HeroMedia({ slides, video, className }: { slides: Slide[]; video?: { src: string; poster: Img }; className?: string }) {
  const reduced = useReducedMotion();
  const [filmDone, setFilmDone] = useState(!video);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const [docVisible, setDocVisible] = useState(true);
  const root = useRef<HTMLDivElement>(null);
  const film = useRef<HTMLVideoElement>(null);

  const film_on = !!video && !filmDone && !reduced;
  const running = !reduced && !paused && visible && docVisible;
  const count = slides.length;
  // Photos load as the show reaches them (the one on screen and the next), not all at once on arrival;
  // phones, where the slideshow holds still, fetch only the first
  const [reach, setReach] = useState(0);
  if (i > reach) setReach(i);
  const ready = (k: number) => k === i || k <= reach + (running && !film_on ? 1 : 0);

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.15 });
    if (root.current) io.observe(root.current);
    const onVis = () => setDocVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // The film plays while it can be seen, and hands over to the photos after FILM_MS or when it ends.
  useEffect(() => {
    const el = film.current;
    if (!el || !film_on) return;
    if (running) el.play().catch(() => setFilmDone(true));
    else el.pause();
  }, [film_on, running]);
  useEffect(() => {
    if (!film_on || !running) return;
    const t = window.setTimeout(() => setFilmDone(true), FILM_MS);
    return () => window.clearTimeout(t);
  }, [film_on, running]);

  const go = (k: number) => {
    setFilmDone(true);
    setI(((k % count) + count) % count);
  };

  if (!count && !video) return null;
  const autoplay = count > 1 && !reduced;

  return (
    <div ref={root} className={cn("overflow-hidden", className)}>
      {slides.map((s, k) =>
        !ready(k) ? null : (
          <div
            key={s.src}
            aria-hidden={k !== i || film_on}
            className={cn(
              "absolute inset-0 transition-opacity duration-[1400ms] ease-[var(--ease-out-quart)]",
              k === i && !film_on ? "opacity-100" : "opacity-0",
            )}
          >
            <Image
              src={s.src}
              alt={k === i ? s.alt : ""}
              fill
              priority={k === 0}
              quality={90}
              sizes="100vw"
              className={cn("object-cover", k === i && !reduced && "animate-[heroZoom_9s_var(--ease-out-quart)_both]")}
              style={{ objectPosition: s.pos }}
            />
          </div>
        ),
      )}
      {video && !reduced && (
        <video
          ref={film}
          src={video.src}
          poster={video.poster.src}
          muted
          playsInline
          preload="metadata"
          aria-hidden
          onEnded={() => setFilmDone(true)}
          onError={() => setFilmDone(true)}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-[1400ms]",
            film_on ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        />
      )}

      {/* Controls sit under the copy, bottom-left; the label names what you're looking at. */}
      {(autoplay || count > 1) && (
        <div className="absolute bottom-0 left-0 z-10 hidden items-center gap-4 px-[var(--gutter)] pb-8 text-white md:flex lg:pb-10">
          <div className="flex items-center gap-1.5" role="group" aria-label="Hero photos">
            {slides.map((s, k) => (
              <button
                key={s.src}
                onClick={() => go(k)}
                aria-label={`Show ${s.label}`}
                aria-current={k === i && !film_on}
                className="group relative grid h-6 place-items-center"
              >
                <span
                  className={cn(
                    "relative block h-[3px] overflow-hidden rounded-full transition-[width,background-color] duration-700 ease-[var(--ease-out-expo)]",
                    k === i && !film_on ? "w-10 bg-white/35" : "w-3 bg-white/40 group-hover:bg-white/70",
                  )}
                >
                  {k === i && !film_on && autoplay && (
                    <span
                      key={i}
                      className="absolute inset-0 origin-left rounded-full bg-white"
                      style={{
                        animationName: "progress-fill",
                        animationDuration: `${PHOTO_MS}ms`,
                        animationTimingFunction: "linear",
                        animationFillMode: "both",
                        animationPlayState: running ? "running" : "paused",
                      }}
                      onAnimationEnd={() => go(i + 1)}
                    />
                  )}
                </span>
              </button>
            ))}
          </div>
          {autoplay && (
            <button
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? "Play hero slideshow" : "Pause hero slideshow"}
              className="grid size-9 place-items-center rounded-full bg-black/25 backdrop-blur-md transition-colors hover:bg-black/40"
            >
              <Icon name={paused ? "play" : "pause"} size={14} />
            </button>
          )}
          <p className="t-meta text-white/75" aria-live={running ? "off" : "polite"}>
            {film_on ? "" : slides[i]?.label}
          </p>
        </div>
      )}
    </div>
  );
}
