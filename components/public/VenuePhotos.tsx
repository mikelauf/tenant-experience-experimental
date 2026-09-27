"use client";

import { ViewTransition, useState } from "react";
import Image from "@/components/ui/SmoothImage";
import { guestsLabel } from "@/lib/data/shared";
import type { Venue } from "@/lib/data/types";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Gallery } from "./Gallery";
import { PhotoTags } from "./PhotoTags";
import { HeartButton } from "./VenueCard";

/**
 * The venue's first impression: one large, clean photograph with the name over it.
 * The photo morphs in from the venue card; "Show all photos" opens the full gallery.
 */
export function VenueHero({ v }: { v: Venue }) {
  const [open, setOpen] = useState<number | null>(null);
  const hero = v.gallery[0] ?? v.hero;

  return (
    <section data-nav-over className="theme-night relative flex h-[95svh] min-h-[560px] flex-col justify-end overflow-hidden">
      <ViewTransition name={`venue-${v.slug}`} share="morph" default="none">
        <div className="absolute inset-0">
          <Image src={hero.src} alt={hero.alt} fill priority quality={90} sizes="100vw" className="object-cover" style={{ objectPosition: hero.pos }} />
          <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-night/60 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-night/90 via-night/40 to-transparent" />
        </div>
      </ViewTransition>

      {/* Named in CSS so it's drawn above the morphing photo, not hidden under it until the morph ends.
          Not a <ViewTransition>: React skips names it thinks are off-screen, and it checks before the
          page has scrolled back to the top. */}
      <div className="vt-hero-copy frame relative grid-12 items-end gap-y-8 pb-10 lg:pb-14" style={{ viewTransitionName: `venue-copy-${v.slug}` }}>
        <div className="col-span-12 lg:col-span-8">
          <h1 className="t-mega animate-rise">{v.name}</h1>
          {/* Everything else in one quiet row under the name. The row sits 17px left inside a clipping
              box, so when it wraps, the divider that would start the new line is cut off. */}
          <div className="mt-8 overflow-hidden lg:mt-10">
            <p className="-ml-[17px] flex flex-wrap items-center gap-y-1.5 text-[0.9375rem] text-moon/85 animate-rise">
              {[v.levelLabel, v.kind, guestsLabel(v), v.sqft && `${v.sqft.toLocaleString("en-US")} sq ft`]
                .filter((x): x is string => !!x)
                .map((x) => (
                  <span key={x} className="flex items-center gap-4 pr-4">
                    <span aria-hidden className="h-3.5 w-px bg-moon/35" />
                    {x}
                  </span>
                ))}
            </p>
          </div>
        </div>
        <div className="col-span-12 flex flex-wrap items-center gap-3 lg:col-span-4 lg:justify-end">
          {v.gallery.length > 1 && (
            <Button variant="glass" onClick={() => setOpen(0)} iconLeft="grid">
              Show all {v.gallery.length} photos
            </Button>
          )}
          <ButtonLink href={`/venues/inquire?venue=${v.slug}`} variant="light" icon="arrow-right">
            Inquire
          </ButtonLink>
          <HeartButton slug={v.slug} name={v.name} className="hidden size-11 sm:grid" />
        </div>
      </div>
      {/* Scroll cue: tells people there's more below the photo, and takes them there */}
      <a
        href="#details"
        style={{ viewTransitionName: `venue-cue-${v.slug}` }}
        aria-label={`Scroll to details about ${v.name}`}
        className="vt-hero-copy group absolute bottom-3 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-1 text-[0.75rem] font-medium text-moon/75 transition-colors hover:text-moon sm:flex"
      >
        <span>Scroll</span>
        <span className="grid size-8 place-items-center rounded-full bg-black/25 backdrop-blur-md">
          <Icon name="chevron-down" size={16} className="motion-safe:animate-[cue_1.8s_var(--ease-in-out)_infinite]" />
        </span>
      </a>
      <Gallery images={v.gallery} start={open} onClose={() => setOpen(null)} title={v.name} />
    </section>
  );
}

/** The rest of the photographs, with what's in them pointed out; each opens the gallery at that photo. */
export function PhotoRow({ v }: { v: Venue }) {
  const [open, setOpen] = useState<number | null>(null);
  const rest = v.gallery.slice(1, 5);
  if (!rest.length) return null;

  return (
    <>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
        {rest.map((img, k) => (
          <button
            key={img.src}
            onClick={() => setOpen(k + 1)}
            className="group media relative aspect-[4/5] text-left"
            aria-label={`Open photo ${k + 2} of ${v.gallery.length}${img.caption ? `: ${img.caption}` : ""}`}
          >
            <Image
              src={img.src}
              alt={img.alt}
              fill
              sizes="(min-width:1024px) 25vw, 50vw"
              className="object-cover transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-[1.03]"
              style={{ objectPosition: img.pos }}
            />
            <PhotoTags img={img} frame={4 / 5} max={2} small delay={k * 0.1} />
            {img.caption && (
              <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 pt-12 text-[0.875rem] font-medium text-white">
                {img.caption}
              </span>
            )}
          </button>
        ))}
      </div>
      <Gallery images={v.gallery} start={open} onClose={() => setOpen(null)} title={v.name} />
    </>
  );
}
