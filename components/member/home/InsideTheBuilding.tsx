"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ACCESS_LABEL, offTower, onTower, standing } from "@/lib/amenities";
import { cn } from "@/lib/cn";
import type { Amenity } from "@/lib/data/types";
import { elevation } from "@/lib/elevation";
import { pinsFor } from "@/lib/live";
import { useDemo } from "@/lib/store";
import { useTenant } from "@/lib/tenants/client";
import { useLiveSky } from "@/lib/useLiveSky";
import { skyBackdrop } from "@/components/public/explorer/SkyControl";
import { Tower, type Band } from "@/components/three/Tower";
import { Icon } from "@/components/ui/Icon";
import { Mark } from "@/components/ui/Logo";
import Image from "@/components/ui/SmoothImage";

const OK = "#5fc08f";
const STEP = "#f0c77e";

/** How far to pan the tower right on a wide screen, so it clears the drawing on the left */
function useShift() {
  const ref = useRef<HTMLElement>(null);
  const [x, setX] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setX(window.innerWidth >= 1024 ? -Math.round(e.contentRect.width * 0.18) : 0));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, x] as const;
}

/**
 * Further down the Home, the building itself: a line drawing of the tower is the floor list, with the 3D tower
 * beside it, lit by the real sky. Pick a floor in either and the other follows; floors with an interior (the
 * wellness center, the Sky Lounge) open up, the floors above lifting away. Green floors are open to you, amber
 * ones need a step first. The 3D loads as the section comes near, not with the page.
 */
export function InsideTheBuilding({ personal }: { personal?: boolean }) {
  const t = useTenant();
  const s = useDemo();
  const sky = useLiveSky();
  const [openId, setOpenId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [sectionRef, shiftX] = useShift();

  const tower = useMemo(() => onTower(t.amenities), [t.amenities]);
  const block = useMemo(() => offTower(t.amenities), [t.amenities]);
  const byId = (id: string | null) => t.amenities.find((a) => a.id === id);
  const open = byId(openId);
  const hover = byId(hoverId);
  const inside = open?.inside && open.level != null ? { level: open.level, interior: open.inside } : null;

  const bands: Band[] = tower.map((a) => ({ level: a.level!, tone: standing(a, s.persona, s.fitnessMember).ok ? "open" : "event" }));
  const pins = useMemo(() => (personal ? pinsFor(t, s, new Date()) : []), [personal, t, s]);
  const toggle = (id: string) => setOpenId((x) => (x === id ? null : id));

  return (
    <section ref={sectionRef} id="inside" className="theme-night relative isolate scroll-mt-[var(--nav-h)] overflow-hidden" aria-labelledby="inside-h">
      <div className="relative h-[60svh] lg:absolute lg:inset-0 lg:h-auto">
        <div className="absolute inset-0 transition-[background] duration-1000" style={{ background: skyBackdrop(sky.sun, sky.light, sky.keys) }} />
        <Tower
          className="absolute inset-0"
          shift={shiftX ? [shiftX, inside ? 110 : 0] : [0, 0]}
          level={open ? (open.level ?? 0) : null}
          zoom={open ? 1.3 : 1}
          landmarks
          sun={sky.sun}
          sunSky={sky.sunSky}
          open={inside}
          bands={inside ? undefined : bands}
          pins={inside ? undefined : pins}
          pickable={tower.map((a) => a.level!)}
          onPick={(floor) => {
            const a = tower.find((x) => x.level === floor);
            if (a) toggle(a.id);
          }}
          onHover={(floor) => setHoverId(floor == null ? null : (tower.find((x) => x.level === floor)?.id ?? null))}
          hoverLevel={hover?.level ?? null}
          poster={
            <div className="grid h-full place-items-center">
              <Mark size={200} className="text-moon/15" />
            </div>
          }
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-night to-transparent lg:hidden" />
        <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[55%] bg-gradient-to-r from-night via-night/85 to-transparent lg:block" />
        <AnimatePresence>
          {inside && open && (
            <motion.div
              key={open.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.6, duration: 0.5 } }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              className="absolute right-[var(--gutter)] top-6 z-10 hidden max-w-[300px] rounded-[var(--radius-card)] bg-night/70 p-4 text-moon shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)] backdrop-blur-md lg:block"
            >
              <p className="t-meta text-moon-2">{open.where}, opened up</p>
              <p className="mt-1 font-medium">{open.name}</p>
              <p className="t-meta mt-2 text-moon-2">{inside.interior.note}</p>
              <button onClick={() => setOpenId(null)} className="mt-3 inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-moon hover:text-white">
                <Icon name="close" size={14} /> Close the floor
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="frame relative grid-12 pb-16 lg:pointer-events-none lg:min-h-[100svh] lg:py-20">
        <div className="col-span-12 -mt-10 lg:pointer-events-auto lg:col-span-5 lg:mt-0 xl:col-span-4">
          <p className="t-meta text-moon-2">Inside the building</p>
          <h2 id="inside-h" className="t-h1 mt-3">
            Floor by floor.
          </h2>
          <p className="t-small mt-4 max-w-[40ch] text-moon/75">
            Pick a floor to see what&apos;s there and who can use it. A couple of them open right up.
          </p>
          <p className="t-meta mt-4 flex items-center gap-4 text-moon-2" aria-hidden>
            <span className="flex items-center gap-1.5">
              <span className="keep-round size-1.5 rounded-full" style={{ background: OK }} /> Open to you
            </span>
            <span className="flex items-center gap-1.5">
              <span className="keep-round size-1.5 rounded-full" style={{ background: STEP }} /> A step first
            </span>
          </p>

          <FloorDrawing list={tower} openId={openId} hoverId={hoverId} onToggle={toggle} onHover={setHoverId} />

          <AnimatePresence mode="wait" initial={false}>
            {open && <Detail key={open.id} a={open} />}
          </AnimatePresence>

          {block.length > 0 && (
            <div className="mt-6">
              <p className="t-meta text-moon-2">On the block</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {block.map((a) => (
                  <li key={a.id}>
                    <button
                      onClick={() => toggle(a.id)}
                      aria-pressed={openId === a.id}
                      className={cn(
                        "h-9 rounded-full px-3.5 text-[0.8125rem] font-medium transition-colors",
                        openId === a.id ? "bg-moon text-night" : "bg-white/[0.07] text-moon/85 hover:bg-white/[0.12]",
                      )}
                    >
                      {a.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>
      </div>
    </section>
  );
}

/* The drawing's own units */
const W = 320;
const H = 380;
const CX = 64;
const GROUND = H - 18;
const LABEL_X = 132;
const GAP = 30;

/** The tower in elevation, every floor with something on it lit and named; the names are the buttons */
function FloorDrawing({
  list,
  openId,
  hoverId,
  onToggle,
  onHover,
}: {
  list: Amenity[];
  openId: string | null;
  hoverId: string | null;
  onToggle: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const { tower: p } = useTenant();
  const s = useDemo();
  const reduce = useReducedMotion();
  const e = elevation(p, { cx: CX, ground: GROUND });

  const marks = list.map((a) => {
    const park = a.level === 0;
    const floor = Math.max(0, a.level! - 1);
    const at = park ? GROUND - 4 : e.y((floor + 0.5) * p.floorH);
    const edge = park ? CX + e.half(0) + 10 : CX + e.half(floor) + (e.inWings(floor) ? e.wingOut : 0) + 3;
    return { a, park, floor, at, edge, labelY: at, ok: standing(a, s.persona, s.fitnessMember).ok };
  });
  for (let k = 1; k < marks.length; k++) marks[k]!.labelY = Math.max(marks[k]!.labelY, marks[k - 1]!.labelY + GAP);
  const last = marks.at(-1);
  if (last && last.labelY > H - 8) {
    last.labelY = H - 8;
    for (let k = marks.length - 2; k >= 0; k--) marks[k]!.labelY = Math.min(marks[k]!.labelY, marks[k + 1]!.labelY - GAP);
  }
  const pct = (n: number, of: number) => `${(n / of) * 100}%`;

  return (
    <div className="relative mt-6 h-[300px] w-full max-w-[340px] sm:h-[320px]" style={{ aspectRatio: `${W} / ${H}` }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full overflow-visible text-moon" aria-hidden>
        <line x1={CX - e.half(0) - 30} x2={LABEL_X - 16} y1={GROUND + 0.5} y2={GROUND + 0.5} stroke="currentColor" strokeOpacity={0.25} />
        {p.wings &&
          ([-1, 1] as const).map((side) => (
            <polygon key={side} points={e.wing(side)} fill="currentColor" fillOpacity={0.06} stroke="currentColor" strokeOpacity={0.3} strokeLinejoin="round" />
          ))}
        <polygon points={e.body} fill="currentColor" fillOpacity={0.05} stroke="currentColor" strokeOpacity={0.45} strokeLinejoin="round" />
        {Array.from({ length: p.floors - 1 }, (_, k) => k + 1).map((i) => (
          <line key={i} x1={CX - e.half(i)} x2={CX + e.half(i)} y1={e.y(i * p.floorH)} y2={e.y(i * p.floorH)} stroke="currentColor" strokeOpacity={0.1} strokeWidth={0.75} />
        ))}
        <polygon points={e.crown.points} fill="currentColor" fillOpacity={0.12} stroke="currentColor" strokeOpacity={0.45} strokeLinejoin="round" />
        {e.crown.kind === "lantern" && <line x1={CX} x2={CX} y1={e.crown.mast[0]} y2={e.crown.mast[1]} stroke="currentColor" strokeOpacity={0.45} />}

        {marks.map((m) => {
          const on = m.a.id === openId || m.a.id === hoverId;
          const color = m.a.id === openId ? "var(--color-accent-glow)" : m.ok ? OK : STEP;
          const sl = e.slab(m.floor);
          return (
            <g key={m.a.id}>
              {m.park ? (
                <rect x={CX + e.half(0) + 4} y={GROUND - 6} width={22} height={6} rx={1.5} fill={color} fillOpacity={on ? 1 : 0.7} />
              ) : (
                <rect x={sl.x - 1} y={sl.y - 1} width={sl.w + 2} height={sl.h + 2} fill={color} fillOpacity={on ? 1 : 0.75} />
              )}
              {m.a.id === openId && !m.park && !reduce && (
                <motion.rect
                  x={sl.x - 4}
                  y={sl.y - 4}
                  width={sl.w + 8}
                  height={sl.h + 8}
                  rx={3}
                  fill="var(--color-accent-glow)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.35, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
              <polyline
                points={`${m.edge},${m.at} ${LABEL_X - 26},${m.at} ${LABEL_X - 10},${m.labelY} ${LABEL_X - 4},${m.labelY}`}
                fill="none"
                stroke="currentColor"
                strokeOpacity={on ? 0.85 : 0.3}
              />
            </g>
          );
        })}
      </svg>

      {marks.map((m) => {
        const active = m.a.id === openId;
        return (
          <button
            key={m.a.id}
            onClick={() => onToggle(m.a.id)}
            onPointerEnter={() => onHover(m.a.id)}
            onPointerLeave={() => onHover(null)}
            onFocus={() => onHover(m.a.id)}
            onBlur={() => onHover(null)}
            aria-pressed={active}
            aria-label={`${m.a.name}, ${m.a.where}. ${ACCESS_LABEL[m.a.access]}`}
            className={cn(
              "absolute flex -translate-y-1/2 items-baseline gap-2.5 whitespace-nowrap text-left text-[0.9375rem] transition-colors",
              active ? "font-medium text-moon" : "text-moon/75 hover:text-moon",
            )}
            style={{ left: pct(LABEL_X, W), top: pct(m.labelY, H) }}
          >
            <span className={cn("t-num w-6 text-[0.8125rem]", active ? "text-accent-glow" : "text-moon-2")}>{m.a.level === 0 ? "St" : m.a.level}</span>
            {m.a.name.replace(/^Transamerica /, "")}
          </button>
        );
      })}
    </div>
  );
}

/** What the picked place is, who can use it, and the next step */
function Detail({ a }: { a: Amenity }) {
  const s = useDemo();
  const st = standing(a, s.persona, s.fitnessMember);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="mt-6 flex gap-4 rounded-[var(--radius-card)] bg-white/[0.06] p-4 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]"
      aria-live="polite"
    >
      {a.img && (
        <div className="media relative hidden aspect-[4/5] w-24 shrink-0 overflow-hidden sm:block">
          <Image src={a.img.src} alt={a.img.alt} fill sizes="96px" className="object-cover" style={{ objectPosition: a.img.pos }} />
        </div>
      )}
      <div className="min-w-0">
        <p className="t-meta text-moon-2">
          {a.where}
          {a.hours && ` · ${a.hours}`}
        </p>
        <p className="mt-1 font-medium">{a.name}</p>
        <p className="t-small mt-1.5 text-moon/75">{a.blurb}</p>
        <p className="t-small mt-3 flex items-center gap-1.5">
          <span className="keep-round size-1.5 rounded-full" style={{ background: st.ok ? OK : STEP }} aria-hidden />
          {ACCESS_LABEL[a.access]} · {st.note}
        </p>
        {a.href && (
          <Link href={a.href} className="group/l mt-3 inline-flex items-center gap-1.5 text-[0.9375rem] font-medium">
            {a.cta ?? "Take a look"}
            <Icon name="arrow-right" size={16} className="transition-transform group-hover/l:translate-x-0.5" />
          </Link>
        )}
        {!a.confirmed && <p className="t-meta mt-3 text-moon-2/80">From public sources; not yet confirmed by the building.</p>}
      </div>
    </motion.div>
  );
}
