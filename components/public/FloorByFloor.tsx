"use client";

import { images } from "@/lib/data/images";
import Image from "@/components/ui/SmoothImage";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { building } from "@/lib/data/building";
import { maxCap, venues } from "@/lib/data/venues";
import { NumberRoll } from "@/components/motion/NumberRoll";
import { Icon } from "@/components/ui/Icon";
import { Pyramid } from "@/components/three/Pyramid";

type Stop = { level: number | null; readout: string; title: string; body: string; href?: string; meta?: string };

const stops: Stop[] = [
  {
    level: null,
    readout: "The building",
    title: `${building.heightFt} feet. ${building.floors} floors. Three places to gather.`,
    body: "Scroll up the tower. Each venue sits on its own level, with its own light and its own kind of evening.",
  },
  ...[...venues]
    .sort((a, b) => a.level - b.level)
    .map((v) => ({
      level: v.level,
      readout: v.name,
      title: v.name,
      body: v.summary,
      href: `/venues/${v.slug}`,
      meta: `${v.kind} · Up to ${maxCap(v)} guests · ${v.sqft.toLocaleString()} sq ft`,
    })),
  {
    level: 48,
    readout: "The crown",
    title: "And above it all, the spire.",
    body: "The top 212 feet are a hollow aluminum crown. It's not a venue, but it's lit for the holidays, and you'll see it from the Bay Lounge all evening.",
  },
];

/** Sticky 3D Pyramid; the marker rides up the tower as each stop scrolls into view. */
export function FloorByFloor() {
  const [idx, setIdx] = useState(0);
  const [dragged, setDragged] = useState(false);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setIdx(Number((e.target as HTMLElement).dataset.i));
        });
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((r) => r && io.observe(r));
    return () => io.disconnect();
  }, []);

  const stop = stops[idx];

  return (
    <section className="theme-night relative" aria-label="The venues, floor by floor">
      <div className="lg:grid-12 lg:frame">
        <div className="sticky top-[var(--nav-h)] z-0 h-[52svh] p-2 lg:col-span-7 lg:h-[calc(100svh-var(--nav-h))] lg:px-0 lg:py-4">
          <div className="relative h-full overflow-hidden rounded-[26px]">
            <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,#33475a_0%,#151b21_62%)]" />
            <Pyramid
              level={stop.level}
              mood="dusk"
              onInteract={() => setDragged(true)}
              className="absolute inset-0"
              poster={
                <Image
                  src={images.aerialBay.src}
                  alt=""
                  fill
                  sizes="60vw"
                  className="object-cover opacity-80"
                  style={{ objectPosition: images.aerialBay.pos }}
                />
              }
            />
            <p
              className={cn(
                "t-meta pointer-events-none absolute bottom-4 left-4 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-md transition-opacity duration-700 lg:bottom-6 lg:left-6",
                dragged && "opacity-0",
              )}
            >
              Drag to look around
            </p>
            {/* Elevator readout */}
            <div className="pointer-events-none absolute left-4 top-4 flex items-end gap-4 lg:left-6 lg:top-6">
              <div className="flex h-[76px] min-w-[92px] items-center justify-center rounded-2xl bg-black/40 px-4 backdrop-blur-md lg:h-[96px] lg:min-w-[116px]">
                <span className="t-num text-[3rem] font-medium leading-none text-redwood-glow lg:text-[3.75rem]">
                  {stop.level == null ? "—" : stop.level === 0 ? "G" : <NumberRoll value={stop.level} duration={1.1} />}
                </span>
              </div>
              <div className="pb-1">
                <p className="t-meta">{stop.level == null ? "Overview" : stop.level === 0 ? "Street level" : `Level ${stop.level}`}</p>
                <p className="t-h3" aria-live="polite">
                  {stop.readout}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 frame lg:col-span-5 lg:px-0">
          {stops.map((s, i) => (
            <div
              key={s.readout}
              ref={(el) => {
                refs.current[i] = el;
              }}
              data-i={i}
              className="flex min-h-[70svh] flex-col justify-center py-16 lg:min-h-[100svh] lg:pl-10"
            >
              <div className={cn("transition-opacity duration-700", idx === i ? "opacity-100" : "opacity-35")}>
                <p className="t-meta tabular">{s.level == null ? `${building.address}` : s.level === 0 ? "Street level" : `Level ${s.level}`}</p>
                <h3 className="t-h1 mt-3 max-w-[14ch]">{s.title}</h3>
                <p className="t-lead mt-5 max-w-[42ch] text-moon-2">{s.body}</p>
                {s.meta && <p className="t-small mt-5 text-moon">{s.meta}</p>}
                {s.href && (
                  <Link
                    href={s.href}
                    className="group mt-7 inline-flex items-center gap-2 border-b border-moon/30 pb-1 font-medium transition-colors hover:border-moon"
                  >
                    Explore {s.readout}
                    <Icon name="arrow-right" size={18} className="transition-transform group-hover:translate-x-1" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
