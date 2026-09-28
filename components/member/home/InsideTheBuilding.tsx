"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo } from "react";
import { gateHref, gateLabel, isMember } from "@/lib/access";
import { ACCESS_LABEL, GROUPS, standing } from "@/lib/amenities";
import { cn } from "@/lib/cn";
import type { Amenity, Img } from "@/lib/data/types";
import { elevation } from "@/lib/elevation";
import type { TowerProfile } from "@/lib/tower";
import { useDemo } from "@/lib/store";
import { useTenant } from "@/lib/tenants/client";
import { Reveal } from "@/components/motion/Reveal";
import { Lazy3D } from "@/components/three/Lazy3D";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import Image from "@/components/ui/SmoothImage";
import { OK, STEP } from "./FloorDrawing";
import { glideTo, useScrollSpy } from "./useScrollSpy";

const RoomCanvas = dynamic(() => import("@/components/three/room/RoomCanvas"), { ssr: false });
const SetupCanvas = dynamic(() => import("@/components/three/setup/SetupCanvas"), { ssr: false });

/**
 * Further down the Home, the building floor by floor: one spotlight per place, the words on one side and the place
 * itself on the other, trading sides as you scroll. Floors with a plan are rooms in 3D (the Sky Lounge and the
 * wellness center from their illustrative layouts, Sky Bar from its traced venue plan); the rest are photographs.
 * Which places, and in what order, is the tenant's `spotlight` on each amenity.
 */
export function InsideTheBuilding() {
  const t = useTenant();
  const list = useMemo(() => t.amenities.filter((a) => a.spotlight != null).sort((a, b) => a.spotlight! - b.spotlight!), [t.amenities]);
  if (!list.length) return null;

  return (
    <section id="inside" className="theme-night relative isolate scroll-mt-[var(--nav-h)] overflow-x-clip py-20 lg:py-28" aria-labelledby="inside-h">
      <div className="frame">
        <p className="t-meta text-moon-2">Inside the building</p>
        <h2 id="inside-h" className="t-h1 mt-3">
          Floor by floor.
        </h2>
        <p className="t-lead mt-4 max-w-[44ch] text-moon/75">From the lobby to the top floor, the places that come with working here, and what each one is like inside.</p>
      </div>
      <div className="relative mt-10 lg:mt-14">
        <JumpBar list={list} />
        <div className="mt-12 space-y-20 lg:mt-16 lg:space-y-32">
          {list.map((a, i) => (
            <Spotlight key={a.id} a={a} flip={i % 2 === 1} order={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Sticks under the nav while the spotlights scroll by: the tower with the floor you're reading lit, where that is,
 * and a tab per kind of thing (Work, Move…) that jumps to its first spotlight.
 */
function JumpBar({ list }: { list: Amenity[] }) {
  const { tower } = useTenant();
  const at = useScrollSpy(
    list.map((a) => `at-${a.id}`),
    0.45,
  );
  const cur = list.find((a) => `at-${a.id}` === at) ?? list[0]!;
  const groups = GROUPS.filter((g) => list.some((a) => a.group === g.id)).sort(
    (x, y) => list.findIndex((a) => a.group === x.id) - list.findIndex((a) => a.group === y.id),
  );
  return (
    <div className="sticky top-[var(--nav-h)] z-20 border-y border-white/10 bg-night/85 backdrop-blur-md">
      <div className="frame flex h-16 items-center gap-6">
        <div className="hidden min-w-0 items-center gap-3 sm:flex" aria-live="polite">
          {cur.level != null && <FloorMark level={cur.level} profile={tower} className="h-10" />}
          <p className="truncate text-[0.875rem]">
            <span className="text-moon-2">{cur.level == null ? "On the block" : cur.level === 0 ? "Street level" : `Level ${cur.level}`}</span>
            <span className="text-moon"> · {cur.name}</span>
          </p>
        </div>
        <nav className="no-scrollbar -mx-[var(--gutter)] flex flex-1 gap-2 overflow-x-auto px-[var(--gutter)] sm:mx-0 sm:justify-end sm:px-0" aria-label="Jump to">
          {groups.map((g) => {
            const first = list.find((a) => a.group === g.id)!;
            const on = cur.group === g.id;
            return (
              <a
                key={g.id}
                href={`#at-${first.id}`}
                aria-current={on ? "true" : undefined}
                onClick={(e) => {
                  const el = document.getElementById(`at-${first.id}`);
                  if (!el) return;
                  e.preventDefault();
                  glideTo(el);
                }}
                className={cn(
                  "h-9 shrink-0 content-center rounded-full px-4 text-[0.875rem] font-medium transition-colors duration-300",
                  on ? "bg-moon text-night" : "bg-white/[0.07] text-moon/85 hover:bg-white/[0.12]",
                )}
              >
                {g.label}
              </a>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

/** One place: what it is and who can use it on one side, the room in 3D or its photos on the other */
function Spotlight({ a, flip, order }: { a: Amenity; flip: boolean; order: number }) {
  const s = useDemo();
  const { tower, building } = useTenant();
  const st = standing(a, s.persona, s.fitnessMember);
  const three = !!(a.inside || a.venue);
  // Signed out or a public account, and there's a page where it's booked: the way in is signing in and landing there
  // (someone already being verified just waits; a place with no page of its own gets no button)
  const gate = !!a.href && a.access !== "public" && !isMember(s.persona) && s.persona !== "verifying";
  const highlights = a.inside ? a.inside.labels.map((l) => l.text) : (a.points ?? []);

  return (
    <article id={`at-${a.id}`} className="frame grid-12 scroll-mt-[calc(var(--nav-h)+72px)] items-center gap-y-8" aria-labelledby={`spot-${a.id}`}>
      <div className={cn("col-span-12 -mx-[var(--gutter)] lg:col-span-7", flip ? "lg:-ml-[var(--gutter)] lg:mr-0" : "lg:order-last lg:col-start-6 lg:-mr-[var(--gutter)] lg:ml-0")}>
        <Asset a={a} order={order} />
      </div>

      <Reveal className={cn("col-span-12 lg:col-span-4", flip ? "lg:col-start-9" : "lg:col-start-1")}>
        <div className="flex items-center gap-3">
          {a.level != null && <FloorMark level={a.level} profile={tower} />}
          <p className="t-meta text-moon-2">
            {a.where}
            {a.level != null && a.level > 1 && ` of ${building.floors}`}
          </p>
        </div>
        <h3 id={`spot-${a.id}`} className="t-h1 mt-4">
          {a.name}
        </h3>
        <p className="t-lead mt-4 text-moon/80">{a.blurb}</p>

        {highlights.length > 0 && (
          <ul className="mt-7 grid grid-cols-2 gap-x-6 border-t border-white/10">
            {highlights.map((h) => (
              <li key={h} className="border-b border-white/10 py-2.5 text-[0.9375rem]">
                {h}
              </li>
            ))}
          </ul>
        )}

        <p className="t-small mt-6 flex items-center gap-1.5">
          <span className="keep-round size-1.5 rounded-full" style={{ background: st.ok ? OK : STEP }} aria-hidden />
          {ACCESS_LABEL[a.access]}
          {!gate && ` · ${st.note}`}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
          {/* Before building access, the next step is signing in, and it comes back here (or to the place's page) */}
          {gate && (
            <ButtonLink href={gateHref(a.href!)} variant="light" icon="arrow-right">
              {gateLabel(s.persona, "use it")}
            </ButtonLink>
          )}
          {a.href && (
            <Link href={a.href} className="group/l inline-flex items-center gap-1.5 text-[0.9375rem] font-medium">
              {gate ? "Look around first" : (a.cta ?? "Take a look")}
              <Icon name="arrow-right" size={16} className="transition-transform group-hover/l:translate-x-0.5" />
            </Link>
          )}
        </div>

        {/* Beside a room in 3D, the real one in a photo */}
        {three && a.img && (
          <figure className="mt-8">
            <div className="media relative aspect-[3/2] w-full max-w-[300px] overflow-hidden">
              <Image src={a.img.src} alt={a.img.alt} fill sizes="300px" className="object-cover" style={{ objectPosition: a.img.pos }} />
            </div>
            <figcaption className="t-meta mt-2 text-moon-2">The real thing</figcaption>
          </figure>
        )}
        {three && (
          <p className="t-meta mt-6 text-moon-2/80">
            Drag to look around, tap a label to get closer. {a.inside ? a.inside.note : "Laid out from the building's floor plan."}
          </p>
        )}
        {!a.confirmed && !three && <p className="t-meta mt-6 text-moon-2/80">From public sources; not yet confirmed by the building.</p>}
      </Reveal>
    </article>
  );
}

/** The place itself: a room in 3D when there's a plan for it, otherwise its photos */
function Asset({ a, order }: { a: Amenity; order: number }) {
  const t = useTenant();
  const layout = a.venue ? t.venues.find((v) => v.slug === a.venue)?.layout : undefined;
  const poster = a.img ? (
    <Image src={a.img.src} alt="" fill sizes="(min-width:1024px) 60vw, 100vw" className="object-cover opacity-50" style={{ objectPosition: a.img.pos }} />
  ) : null;
  const stage = "h-[50svh] min-h-[340px] bg-[radial-gradient(ellipse_at_50%_45%,rgb(255_255_255/0.08),transparent_68%)] lg:h-[82svh] lg:max-h-[860px]";

  if (a.inside)
    return (
      <Lazy3D className={stage} poster={poster} eager={1200 + order * 900}>
        {({ active, onReady }) => <RoomCanvas id={a.id} interior={a.inside!} active={active} onReady={onReady} />}
      </Lazy3D>
    );

  if (layout) {
    // An ordinary day, not an event: its lounge setup when it has one, and a few dozen people at most
    const setup = layout.setups.lounge ? "lounge" : (Object.keys(layout.setups)[0] as keyof typeof layout.setups);
    const spec = layout.setups[setup]!;
    const guests = Math.max(spec.min ?? 0, Math.min(Math.round(spec.max * 0.65), 60));
    return (
      <Lazy3D className={stage} poster={poster} eager={1200 + order * 900}>
        {({ active, onReady }) => <SetupCanvas shell={layout.shell} spec={spec} setup={setup} guests={guests} preset="overview" everyday active={active} onReady={onReady} />}
      </Lazy3D>
    );
  }

  return <Photos main={a.img} more={a.gallery ?? []} />;
}

/** A large photo with up to two smaller ones beside it, as a spread; on a phone, the large one and one more */
function Photos({ main, more }: { main?: Img; more: Img[] }) {
  if (!main) return null;
  const tiles = more.filter((m) => m.src !== main.src).slice(0, 2);
  return (
    <div className="grid h-[62svh] min-h-[380px] grid-rows-[2fr_1fr] gap-2 sm:grid-cols-3 sm:grid-rows-2 lg:h-[82svh] lg:max-h-[860px]">
      <Reveal className={cn("media relative overflow-hidden", tiles.length ? "sm:col-span-2 sm:row-span-2" : "row-span-2 sm:col-span-3")}>
        <Image src={main.src} alt={main.alt} fill sizes="(min-width:1024px) 42vw, 100vw" className="object-cover" style={{ objectPosition: main.pos }} />
      </Reveal>
      {tiles.map((m, i) => (
        <Reveal
          key={m.src}
          delay={0.08 * (i + 1)}
          className={cn("media relative overflow-hidden", tiles.length === 1 && "sm:row-span-2", i > 0 && "hidden sm:block")}
        >
          <Image src={m.src} alt={m.alt} fill sizes="(min-width:1024px) 20vw, 100vw" className="object-cover" style={{ objectPosition: m.pos }} />
        </Reveal>
      ))}
    </div>
  );
}

/** A thumbnail of the tower with this floor lit, so each spotlight says where in the building it is */
function FloorMark({ level, profile, className }: { level: number; profile: TowerProfile; className?: string }) {
  const W = 28;
  const H = 64;
  const e = elevation(profile, { cx: W / 2, ground: H - 2, top: 2 });
  const sl = e.slab(Math.max(0, level - 1));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cn("h-12 w-auto shrink-0 overflow-visible text-moon", className)} aria-hidden>
      <polygon points={e.body} fill="currentColor" fillOpacity={0.06} stroke="currentColor" strokeOpacity={0.4} strokeWidth={0.6} strokeLinejoin="round" />
      <polygon points={e.crown.points} fill="currentColor" fillOpacity={0.12} stroke="currentColor" strokeOpacity={0.4} strokeWidth={0.6} />
      {level === 0 ? (
        <rect x={W / 2 + e.half(0) + 1} y={H - 4} width={6} height={2} fill="var(--color-accent-glow)" />
      ) : (
        <rect x={sl.x - 1} y={sl.y - 0.6} width={sl.w + 2} height={Math.max(1.6, sl.h + 1.2)} fill="var(--color-accent-glow)" />
      )}
    </svg>
  );
}
