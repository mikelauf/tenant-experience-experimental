"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import Image from "@/components/ui/SmoothImage";
import { cn } from "@/lib/cn";
import { useTenant } from "@/lib/tenants/client";
import { Icon } from "@/components/ui/Icon";
import { Gallery } from "./Gallery";

const SCENE_MS = 7000;
const pad = (n: number) => String(n + 1).padStart(2, "0");

/**
 * "A closer look": a full-bleed slideshow of the building's photography, each scene
 * linking to its venue. Ported from Tenant Experience's atmosphere gallery. It only
 * advances while it's on screen, and holds still with reduced motion.
 */
export function CloserLook() {
  const t = useTenant();
  const look = t.copy.public.closerLook;
  const reduced = useReducedMotion();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(false);
  const [docVisible, setDocVisible] = useState(true);
  const [open, setOpen] = useState<number | null>(null);
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting && e.intersectionRatio >= 0.35), { threshold: [0, 0.35] });
    if (root.current) io.observe(root.current);
    const onVis = () => setDocVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  if (!look?.scenes.length) return null;
  const scenes = look.scenes;
  const count = scenes.length;
  const autoplay = count > 1 && !reduced;
  const running = autoplay && visible && docVisible && !paused && open === null;
  const scene = scenes[i];
  const venue = scene.venue ? t.venue(scene.venue) : undefined;

  return (
    <section ref={root} className="theme-night relative flex min-h-[100svh] flex-col justify-between overflow-hidden" aria-labelledby="closer-h" aria-roledescription="carousel">
      {scenes.map((s, k) => (
        <div
          key={s.src}
          aria-hidden={k !== i}
          className={cn("absolute inset-0 transition-opacity duration-[1400ms] ease-[var(--ease-out-quart)]", k === i ? "opacity-100" : "opacity-0")}
        >
          <Image src={s.src} alt={k === i ? s.alt : ""} fill sizes="100vw" quality={85} className="object-cover" style={{ objectPosition: s.pos }} />
        </div>
      ))}
      <div className="absolute inset-x-0 top-0 h-2/5 bg-gradient-to-b from-night/75 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-night/90 via-night/45 to-transparent" />

      <header className="frame relative flex flex-wrap items-start justify-between gap-6 pt-20 lg:pt-28">
        <div>
          <p className="t-meta">A closer look</p>
          <h2 id="closer-h" className="t-hero mt-3 max-w-[14ch]">
            {look.heading}
          </h2>
          {look.body && <p className="t-lead mt-4 max-w-[40ch] text-moon/85">{look.body}</p>}
        </div>
        <Link href="/venues/inquire" className="group inline-flex items-center gap-2 border-b border-moon/40 pb-1 font-medium hover:border-moon">
          Inquire about your event
          <Icon name="arrow-up-right" size={18} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      </header>

      <div className="frame relative pb-8 lg:pb-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div aria-live={running ? "off" : "polite"} aria-atomic="true">
            <p key={i} className="t-h2 animate-rise">
              {scene.caption}
            </p>
            {venue && (
              <Link href={`/venues/${venue.slug}`} className="group mt-2 inline-flex items-center gap-1.5 text-moon/85 hover:text-moon">
                Explore {venue.name}
                <Icon name="arrow-up-right" size={16} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOpen(i)}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-white/14 px-4 text-[0.875rem] font-medium backdrop-blur-md transition-colors hover:bg-white/24"
            >
              <Icon name="expand" size={16} />
              View photograph
            </button>
            {autoplay && (
              <button
                onClick={() => setPaused((p) => !p)}
                aria-label={paused ? "Play slideshow" : "Pause slideshow"}
                className="grid size-10 place-items-center rounded-full bg-white/14 backdrop-blur-md transition-colors hover:bg-white/24"
              >
                <Icon name={paused ? "play" : "pause"} size={14} />
              </button>
            )}
          </div>
        </div>

        {count > 1 && (
          <div
            role="group"
            aria-label="Choose a scene"
            className="no-scrollbar mt-8 flex gap-4 overflow-x-auto border-t border-white/15 lg:grid lg:grid-cols-[repeat(var(--n),minmax(0,1fr))] lg:gap-[var(--col-gap)] lg:overflow-visible"
            style={{ "--n": count } as React.CSSProperties}
          >
            {scenes.map((s, k) => (
              <button
                key={s.src}
                aria-pressed={k === i}
                onClick={() => setI(k)}
                className={cn("relative min-w-[60vw] shrink-0 pt-4 text-left transition-colors sm:min-w-[40vw] lg:min-w-0", k === i ? "text-moon" : "text-moon/55 hover:text-moon/85")}
              >
                <span className="absolute inset-x-0 top-0 -mt-px block h-[2px] overflow-hidden" aria-hidden>
                  {k === i && (
                    <span
                      key={i}
                      className="absolute inset-0 origin-left bg-moon"
                      style={
                        autoplay
                          ? { animation: `progress-fill ${SCENE_MS}ms linear both`, animationPlayState: running ? "running" : "paused" }
                          : undefined
                      }
                      onAnimationEnd={() => setI((i + 1) % count)}
                    />
                  )}
                </span>
                <span className="t-num text-[0.8125rem]">{pad(k)}</span>
                <span className="t-small mt-1 block">{s.caption}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <Gallery images={scenes} start={open} onClose={() => setOpen(null)} title="A closer look" />
    </section>
  );
}
