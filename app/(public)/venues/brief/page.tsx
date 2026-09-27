import type { Metadata } from "next";
import { headers } from "next/headers";
import NextImage from "next/image";
import Link from "next/link";
import { briefHref, readBrief, type Brief, type BriefVenue } from "@/lib/brief";
import { setupLabels, setupNotes } from "@/lib/data/shared";
import { compass, formatDate } from "@/lib/format";
import type { Venue, ViewPhoto } from "@/lib/data/types";
import { LIGHT_LABEL, clock, eveningOf, lightAt, minutesOf, sunPosition, zonedTime, type Geo } from "@/lib/sun";
import { getTenant } from "@/lib/tenants/server";
import { BriefActions } from "@/components/public/brief/BriefActions";
import { Plan } from "@/components/public/SetupVisualizer";
import { ButtonLink } from "@/components/ui/Button";

const query = async (searchParams: PageProps<"/venues/brief">["searchParams"]) => {
  const q = await searchParams;
  return new URLSearchParams(Object.entries(q).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])));
};

/** This site's own origin, for absolute links: the link card, and the address printed on paper. */
async function originOf() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return host ? `${proto}://${host}` : "";
}

const shortName = (n: string) => n.replace(/^Transamerica /, "");

/** "Sky Bar", "Sky Bar & Bay Lounge", "Sky Bar, Bay Lounge & The Sandbox" */
const names = (vs: Venue[]) => {
  const n = vs.map((v) => shortName(v.name));
  return n.length < 3 ? n.join(" & ") : `${n.slice(0, -1).join(", ")} & ${n.at(-1)}`;
};

export async function generateMetadata({ searchParams }: PageProps<"/venues/brief">): Promise<Metadata> {
  const t = await getTenant();
  const q = await query(searchParams);
  const b = readBrief(q, t.venues);
  const vs = b.venues.map((x) => t.venue(x.slug)!).filter(Boolean);
  const title = vs.length ? `Event brief: ${names(vs)}` : "Event brief";
  const card = `${await originOf()}/venues/brief/card?${q.toString()}`;
  const description = [b.date && formatDate(b.date), b.guests && `${b.guests.toLocaleString("en-US")} guests`, `at ${t.building.name}`].filter(Boolean).join(" · ");
  return {
    title,
    description,
    // A brief is someone's own shortlist, not a page to index
    robots: { index: false, follow: false },
    openGraph: { title, description, images: [{ url: card, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [card] },
  };
}

/** The evening's light, for the brief's header and each venue's view. */
function lightFor(b: Brief, geo?: Geo) {
  if (!geo || !b.date) return null;
  const evening = eveningOf(b.date, geo);
  const m = b.time ? minutesOf(b.time) : null;
  const at = m != null ? sunPosition(zonedTime(b.date, b.time!, geo.tz), geo) : null;
  const sunsetAz = evening.sunset != null ? sunPosition(zonedTime(b.date, `${Math.floor(evening.sunset / 60)}:${String(evening.sunset % 60).padStart(2, "0")}`, geo.tz), geo).azimuth : null;
  return { evening, at, light: at ? lightAt(at.elevation) : null, sunsetAz };
}

export default async function BriefPage({ searchParams }: PageProps<"/venues/brief">) {
  const t = await getTenant();
  const origin = await originOf();
  const b = readBrief(await query(searchParams), t.venues);
  const picked = b.venues.map((x) => ({ ...x, v: t.venue(x.slug)! })).filter((x) => x.v);
  const sky = lightFor(b, t.tower.geo);

  if (!picked.length) {
    return (
      <div className="frame pb-24 pt-[calc(var(--nav-h)+48px)]">
        <p className="t-meta">Event brief</p>
        <h1 className="t-h1 mt-3 max-w-[18ch]">Pick a venue to make a brief.</h1>
        <p className="t-lead mt-4 max-w-[52ch] text-stone">
          A brief is a one-page summary of a venue, set up for your event, that you can share or print. Start from any venue&apos;s 3D space.
        </p>
        <ButtonLink href="/venues" variant="accent" icon="arrow-right" className="mt-8">
          See the venues
        </ButtonLink>
      </div>
    );
  }

  const first = picked[0];
  const inquire = `/venues/inquire?${new URLSearchParams({
    venue: first.slug,
    ...(b.guests ? { guests: String(b.guests) } : {}),
    ...(b.date ? { date: b.date } : {}),
    ...(b.time ? { time: b.time } : {}),
    ...(first.setup && picked.length === 1 ? { setup: first.setup } : {}),
  }).toString()}`;

  const facts: [string, string | undefined][] = [
    ["When", b.date ? `${formatDate(b.date)}${b.time ? `, ${clock(minutesOf(b.time)!)}` : ""}` : "Date to come"],
    ["Guests", b.guests ? b.guests.toLocaleString("en-US") : "To come"],
    [
      "The light",
      sky?.evening.sunset != null
        ? `${sky.light ? `${LIGHT_LABEL[sky.light]} · ` : ""}sunset ${clock(sky.evening.sunset)}${sky.evening.golden != null ? `, golden hour from ${clock(sky.evening.golden)}` : ""}`
        : undefined,
    ],
  ];

  return (
    <article className="pb-24 pt-[calc(var(--nav-h)+40px)] print:pb-0 print:pt-0">
      <header className="frame">
        <p className="t-meta">Event brief · {t.building.name}</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
          <h1 className="t-hero max-w-[16ch] print:text-[3rem]">{picked.length === 1 ? shortName(first.v.name) : names(picked.map((x) => x.v))}</h1>
          <BriefActions inquireHref={inquire} />
        </div>
        <p className="t-lead mt-5 max-w-[60ch] text-stone print:hidden">
          A one-page summary of {picked.length === 1 ? "this venue" : "these venues"}, set up for your event, to share with your team or print. It isn&apos;t an
          inquiry and doesn&apos;t reserve anything.
        </p>
        <dl className="mt-10 grid gap-x-10 gap-y-5 border-t hairline pt-6 sm:grid-cols-3 print:mt-4 print:grid-cols-3 print:pt-4">
          {facts
            .filter((f): f is [string, string] => !!f[1])
            .map(([k, val]) => (
              <div key={k}>
                <dt className="t-meta">{k}</dt>
                <dd className="t-lead mt-1 print:text-[0.9375rem]">{val}</dd>
              </div>
            ))}
        </dl>
      </header>

      {picked.map((x, i) => (
        <VenueBrief key={x.slug} x={x} v={x.v} n={i + 1} total={picked.length} setsInView={setsInView(x.v, sky?.sunsetAz ?? null)} />
      ))}

      <footer className="frame mt-16 border-t hairline pt-6 print:mt-8">
        <p className="t-small max-w-[70ch] text-stone">
          Layouts are drawn from the building&apos;s own floor plans; capacities not taken from the booklet are estimates. The events team confirms the final plan and
          what&apos;s available on your date. Nothing here reserves a space.
        </p>
        <p className="t-meta mt-3">
          Made at {t.building.name} venues · <span className="print:hidden">link below</span>
          <span className="hidden break-all print:inline">{origin}{briefHref({ venues: picked.map((p) => p.slug), setup: first.setup, guests: b.guests, date: b.date, time: b.time })}</span>
        </p>
        <Link href="/venues" className="t-small mt-6 inline-block underline underline-offset-2 hover:text-ink print:hidden">
          Back to all venues
        </Link>
      </footer>
    </article>
  );
}

/** Does the sun set inside the venue's best view that evening? */
function setsInView(v: Venue, sunsetAz: number | null) {
  if (sunsetAz == null || v.viewBearing == null) return false;
  return Math.abs(((sunsetAz - v.viewBearing + 540) % 360) - 180) <= 55;
}

function VenueBrief({ x, v, n, total, setsInView }: { x: BriefVenue; v: Venue; n: number; total: number; setsInView: boolean }) {
  const spec = x.setup ? v.layout?.setups[x.setup] : undefined;
  const guests = x.guests ?? spec?.max;
  const view: ViewPhoto | undefined = v.views?.[0];
  const plan = v.floorPlans?.[0];

  return (
    <section className={`frame mt-16 lg:mt-24 ${n > 1 ? "print:mt-0 print:break-before-page" : "print:mt-6"}`} aria-labelledby={`b-${v.slug}`}>
      <div className="flex items-baseline justify-between gap-6 border-t hairline pt-6">
        <p className="t-meta">
          {total > 1 ? `${n} of ${total} · ` : ""}
          {v.levelLabel} · {v.kind}
        </p>
        <Link href={`/venues/${v.slug}${x.setup ? `?setup=${x.setup}${guests ? `&guests=${guests}` : ""}` : ""}`} className="t-small shrink-0 underline-offset-2 hover:underline print:hidden">
          Open in 3D
        </Link>
      </div>

      <div className="mt-5 grid gap-8 lg:grid-cols-12 print:grid-cols-12 print:gap-6">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-media)] bg-fog lg:col-span-7 print:col-span-7 print:aspect-[3/2]">
          <NextImage src={v.hero.src} alt={v.hero.alt} fill sizes="(min-width:1024px) 55vw, 100vw" className="object-cover" style={{ objectPosition: v.hero.pos }} priority={n === 1} loading="eager" />
        </div>
        <div className="flex flex-col lg:col-span-5 print:col-span-5">
          <h2 id={`b-${v.slug}`} className="t-h1">
            {shortName(v.name)}
          </h2>
          <p className="t-lead mt-2 text-stone">{v.tagline}</p>
          <dl className="mt-6 grid grid-cols-3 gap-4 border-y hairline py-4">
            {[
              [v.capacity ? v.capacity.toLocaleString("en-US") : "—", v.capacity ? "Guests, up to" : (v.capacityNote ?? "Guests")],
              [v.sqft ? v.sqft.toLocaleString("en-US") : "—", "Square feet"],
              [v.level === 0 ? "Street" : String(v.level), v.level === 0 ? "Level" : "Floor"],
            ].map(([val, k]) => (
              <div key={k}>
                <dd className="t-num text-[1.625rem] font-medium leading-none">{val}</dd>
                <dt className="t-meta mt-1.5">{k}</dt>
              </div>
            ))}
          </dl>
          {x.setup && spec && (
            <div className="mt-6">
              <p className="t-meta">Set for your event</p>
              <p className="t-h3 mt-1">
                {setupLabels[x.setup]}
                {guests ? ` for ${guests.toLocaleString("en-US")}` : ""}
              </p>
              <p className="t-small mt-1 text-stone">
                {setupNotes[x.setup]} · holds up to {spec.max.toLocaleString("en-US")}
                {spec.traced ? ", from the building's plan" : v.layout?.illustrative ? " (estimate)" : ""}
              </p>
            </div>
          )}
          {v.summary && <p className="t-body mt-6 text-ink-2 print:mt-4 print:text-[0.8125rem] print:leading-snug">{v.summary}</p>}
        </div>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-3 print:mt-6 print:grid-cols-3 print:gap-4">
        {x.setup && spec && v.layout && (
          <figure className="break-inside-avoid">
            <div className="aspect-[4/3] rounded-[var(--radius-card)] bg-quartz p-4">
              <Plan shell={v.layout.shell} spec={spec} setup={x.setup} guests={guests ?? spec.max} />
            </div>
            <figcaption className="t-meta mt-2">The setup, top-down · Washington St at the top</figcaption>
          </figure>
        )}
        {view && (
          <figure className="break-inside-avoid">
            <ViewFigure view={view} />
            <figcaption className="t-meta mt-2">
              The view{view.bearing != null ? `, facing ${compass(view.bearing)}` : ""}
              {setsInView ? " · the sun sets this way that evening" : ""}
            </figcaption>
          </figure>
        )}
        {plan && (
          <figure className="break-inside-avoid">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] bg-[#fdf7f4]">
              <NextImage src={plan.src} alt={plan.alt} fill sizes="(min-width:768px) 30vw, 100vw" className="object-contain p-3 mix-blend-multiply" loading="eager" />
            </div>
            <figcaption className="t-meta mt-2">The building&apos;s plan · {plan.label}</figcaption>
          </figure>
        )}
      </div>
    </section>
  );
}

/** A view photo with its landmarks tagged, cropped to the card; tags the crop cuts off are left out. */
function ViewFigure({ view }: { view: ViewPhoto }) {
  const frame = 4 / 3;
  const tags = (view.tags ?? [])
    .map((t) => {
      // Same crop maths as the site's photo tags (object-fit: cover, centered)
      let fx = t.x / 100;
      let fy = t.y / 100;
      if (view.ratio > frame) fx = (fx - (1 - frame / view.ratio) / 2) / (frame / view.ratio);
      else fy = (fy - (1 - view.ratio / frame) / 2) / (view.ratio / frame);
      return fx > 0.06 && fx < 0.94 && fy > 0.08 && fy < 0.96 ? { label: t.label, x: fx * 100, y: fy * 100 } : null;
    })
    .filter((t): t is { label: string; x: number; y: number } => !!t)
    .sort((a, b) => a.x - b.x)
    // In a small card, two landmarks close together would overlap: lift every other one on a longer stem
    .map((t, i, all) => ({ ...t, lift: i % 2 === 1 && t.x - all[i - 1].x < 22 }));
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] bg-night">
      <NextImage src={view.src} alt={view.alt} fill sizes="(min-width:768px) 30vw, 100vw" className="object-cover" loading="eager" />
      {tags.map((t) => {
        // A lifted label near the top edge hangs below its point instead, so it stays in the frame
        const below = t.lift && t.y < 45;
        const label = <span className="whitespace-nowrap rounded-full bg-night/80 px-2 py-0.5 text-[0.6875rem] font-medium text-moon">{t.label}</span>;
        const stem = <span className={`${t.lift ? "h-9" : "h-3"} w-px bg-moon/80`} />;
        const dot = <span className="keep-round size-1.5 rounded-full bg-moon" />;
        return (
          <span key={t.label} className="absolute flex -translate-x-1/2 flex-col items-center" style={below ? { left: `${t.x}%`, top: `${t.y}%` } : { left: `${t.x}%`, bottom: `${100 - t.y}%` }}>
            {below ? (
              <>
                {dot}
                {stem}
                {label}
              </>
            ) : (
              <>
                {label}
                {stem}
                {dot}
              </>
            )}
          </span>
        );
      })}
    </div>
  );
}
