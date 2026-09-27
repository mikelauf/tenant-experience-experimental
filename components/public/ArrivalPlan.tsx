"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useTenant } from "@/lib/tenants/client";
import { trueNorth } from "@/lib/tower";
import { Icon } from "@/components/ui/Icon";

type City = { buildings: { p: number[] }[]; roads: { p: number[]; w: number; n?: string }[]; parks: number[][] };

/** The block and the streets around it, in scene units (east is +x, south is +z); phones crop in to the block itself */
const WIDE = { x: -3.6, z: -4.7, w: 11, h: 9.4 };
const NARROW = { x: -2.9, z: -3.35, w: 9.4, h: 6.7 };
/** A flat [x, z, x, z…] list as SVG points */
function pts(flat: number[]) {
  const out: string[] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) out.push(`${flat[i]},${flat[i + 1]}`);
  return out.join(" ");
}
const mapsUrl = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

/**
 * Getting here, drawn from the real neighborhood (OpenStreetMap) and the tower's own profile: the streets,
 * the building from above, its park and every way in, numbered to match the list. Hovering one lights the other.
 * Lays out the whole section: `intro` (the heading and address) and the list on the left, the plan held beside them.
 */
export function ArrivalPlan({ intro }: { intro: React.ReactNode }) {
  const { tower: p } = useTenant();
  const [city, setCity] = useState<City | null>(null);
  const [hot, setHot] = useState<string | null>(null);
  // Pins and names are sized in screen pixels, whatever size the drawing renders at
  const frame = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(760);
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const VIEW = width < 560 ? NARROW : WIDE;
  const px = VIEW.w / width;

  useEffect(() => {
    if (!p.realCity) return;
    let live = true;
    fetch(p.realCity.src)
      .then((r) => r.json())
      .then((j: City) => live && setCity(j))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [p.realCity]);

  const pois = p.pois ?? [];
  const placed = pois.filter((x) => !x.pending);
  const half = p.widthAt(0) / 2;
  const [nx, nz] = trueNorth(p);
  const inView = (flat: number[]) => flat.some((v, i) => (i % 2 ? v > VIEW.z - 1 && v < VIEW.z + VIEW.h + 1 : v > VIEW.x - 1 && v < VIEW.x + VIEW.w + 1));
  const outline = p.park?.outline?.flat();

  return (
    <div className="grid-12 gap-y-10">
      <div className="col-span-12 lg:col-span-5 lg:row-start-1 xl:col-span-4">{intro}</div>

      {/* The plan: beside the text on wide screens, held in view while the list beside it scrolls */}
      <div className="col-span-12 lg:col-span-7 lg:col-start-6 lg:row-span-2 lg:row-start-1 xl:col-span-8 xl:col-start-5">
        <div className="lg:sticky lg:top-[calc(var(--nav-h)+24px)]">
          <div ref={frame} className="relative overflow-hidden rounded-[var(--radius-media)] bg-paper shadow-[var(--shadow-ring)]">
            <svg
              viewBox={`${VIEW.x} ${VIEW.z} ${VIEW.w} ${VIEW.h}`}
              className="block w-full"
              style={{ aspectRatio: `${VIEW.w} / ${VIEW.h}` }}
              role="img"
              aria-label="Plan of the block: the building, its park and the ways in"
            >
              {/* The neighborhood */}
              {city?.buildings
                .filter((b) => inView(b.p))
                .map((b, i) => (
                  <polygon key={i} points={pts(b.p)} fill="var(--color-ink)" fillOpacity={0.055} />
                ))}
              {city?.roads
                .filter((r) => inView(r.p))
                .map((r, i) => (
                  <polyline
                    key={i}
                    points={pts(r.p)}
                    fill="none"
                    stroke="var(--color-quartz)"
                    strokeWidth={r.w * 1.15}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}

              {/* The park, and its trees where they stand */}
              {outline && <polygon points={pts(outline)} fill="#8aa287" fillOpacity={0.28} />}
              {p.park?.plan?.trees.map(([x, z], i) => (
                <circle key={i} cx={x} cy={z} r={0.065} fill="#5f7a5c" fillOpacity={0.5} />
              ))}

              {/* The building from above: a square base, its four faces meeting at the top */}
              <rect
                x={-half}
                y={-half}
                width={half * 2}
                height={half * 2}
                fill="var(--color-paper)"
                stroke="var(--color-ink)"
                strokeOpacity={0.55}
                strokeWidth={0.03}
              />
              <path
                d={`M${-half},${-half} L${half},${half} M${half},${-half} L${-half},${half}`}
                stroke="var(--color-ink)"
                strokeOpacity={0.3}
                strokeWidth={0.02}
              />

              {/* Street names along their centrelines */}
              {p.streets?.map((s) => {
                const road = city?.roads.find((r) => r.n && r.n.startsWith(s.name.replace(/ (St|Pl|Ave)$/, "")));
                const vertical = road ? Math.abs(road.p[2] - road.p[0]) < Math.abs(road.p[3] - road.p[1]) : false;
                // Slide the name along its street, clear of any pin it would sit under
                const halfLen = s.name.length * 12 * px * 0.3;
                const pinR = 16 * px;
                let along = 0;
                for (const q of placed) {
                  const a = vertical ? q.z - s.z : q.x - s.x;
                  const across = vertical ? q.x - s.x : q.z - s.z;
                  if (Math.abs(across) < 7 * px + pinR && Math.abs(a - along) < halfLen + pinR) along = a - Math.sign(a || 1) * (halfLen + pinR + 4 * px);
                }
                const lx = vertical ? s.x : s.x + along;
                const lz = vertical ? s.z + along : s.z;
                return (
                  <text
                    key={s.name}
                    x={lx}
                    y={lz}
                    transform={vertical ? `rotate(-90 ${lx} ${lz})` : undefined}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={12 * px}
                    letterSpacing={0.4 * px}
                    fill="var(--color-stone)"
                    // A halo in the paper's color keeps names legible over trees and footprints
                    stroke="var(--color-paper)"
                    strokeWidth={3.5 * px}
                    strokeLinejoin="round"
                    paintOrder="stroke"
                  >
                    {s.name}
                  </text>
                );
              })}

              {/* The ways in */}
              {placed.map((x, i) => {
                const on = hot === x.id;
                return (
                  <g
                    key={x.id}
                    transform={`translate(${x.x} ${x.z})`}
                    onPointerEnter={() => setHot(x.id)}
                    onPointerLeave={() => setHot(null)}
                    className="cursor-default"
                  >
                    <circle r={on ? 20 * px : 0} fill="var(--color-accent)" fillOpacity={0.18} className="transition-[r] duration-300" />
                    <circle
                      r={13 * px}
                      fill={on ? "var(--color-accent-deep)" : "var(--color-accent)"}
                      stroke="var(--color-paper)"
                      strokeWidth={2.5 * px}
                      className="transition-colors"
                    />
                    <text textAnchor="middle" dominantBaseline="central" fontSize={13 * px} fontWeight={600} fill="var(--color-paper)">
                      {i + 1}
                    </text>
                  </g>
                );
              })}

              {/* True north: the street grid sits a few degrees off it */}
              <g transform={`translate(${VIEW.x + VIEW.w - 34 * px} ${VIEW.z + 56 * px}) scale(${px * 60})`}>
                <line x1={-nx * 0.3} y1={-nz * 0.3} x2={nx * 0.3} y2={nz * 0.3} stroke="var(--color-ink)" strokeWidth={0.03} />
                <path
                  d={`M${nx * 0.3},${nz * 0.3} l${-nz * 0.09 - nx * 0.14},${nx * 0.09 - nz * 0.14} M${nx * 0.3},${nz * 0.3} l${nz * 0.09 - nx * 0.14},${-nx * 0.09 - nz * 0.14}`}
                  stroke="var(--color-ink)"
                  strokeWidth={0.03}
                  strokeLinecap="round"
                  fill="none"
                />
                <text x={nx * 0.56} y={nz * 0.56} textAnchor="middle" dominantBaseline="central" fontSize={0.2} fontWeight={600} fill="var(--color-ink)">
                  N
                </text>
              </g>
            </svg>
            {city && <p className="t-meta absolute bottom-2.5 right-3.5 !text-[0.6875rem] !text-stone-2">© OpenStreetMap contributors</p>}
          </div>
        </div>
      </div>

      {/* The ways in, numbered as on the plan: one line each, directions at the end */}
      <div className="col-span-12 lg:col-span-5 lg:row-start-2 xl:col-span-4">
        <p className="t-meta">Ways in</p>
        <ol className="mt-3 border-b hairline">
          {pois.map((x) => {
            const n = placed.indexOf(x) + 1;
            return (
              <li
                key={x.id}
                onPointerEnter={() => !x.pending && setHot(x.id)}
                onPointerLeave={() => setHot(null)}
                className={cn("flex items-start gap-3 border-t hairline py-3 transition-colors lg:-mx-3 lg:rounded-xl lg:px-3", hot === x.id && "bg-fog/70")}
              >
                <span
                  className={cn(
                    "keep-round mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-[0.75rem] font-semibold",
                    x.pending ? "text-stone-2 shadow-[inset_0_0_0_1px_var(--color-line-2)]" : "bg-accent text-paper",
                  )}
                >
                  {x.pending ? "·" : n}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-[0.9375rem] font-medium", x.pending && "text-stone")}>{x.label}</span>
                  <span className="t-small block text-stone">{x.detail}</span>
                </span>
                {x.maps ? (
                  <a
                    href={mapsUrl(x.maps)}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Directions to ${x.label}`}
                    onFocus={() => setHot(x.id)}
                    onBlur={() => setHot(null)}
                    className="t-small mt-0.5 inline-flex shrink-0 items-center gap-1 font-medium underline-offset-2 hover:underline"
                  >
                    Directions
                    <Icon name="arrow-up-right" size={14} />
                  </a>
                ) : (
                  <span className="t-meta mt-0.5 shrink-0">Coming</span>
                )}
              </li>
            );
          })}
        </ol>
        <Link
          href="/venues?floor=arrive"
          scroll={false}
          className="group mt-6 inline-flex items-center gap-2 border-b border-ink/25 pb-0.5 font-medium transition-colors hover:border-ink"
        >
          See the arrival in 3D
          <Icon name="arrow-right" size={17} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
