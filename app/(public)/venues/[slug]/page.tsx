import Link from "next/link";
import { notFound } from "next/navigation";
import { person } from "@/lib/data/building";
import { maxCap, venue, venues } from "@/lib/data/venues";
import { Reveal } from "@/components/motion/Reveal";
import { Icon } from "@/components/ui/Icon";
import { Pill } from "@/components/ui/Pill";
import { Photo } from "@/components/ui/Photo";
import { InquireCard } from "@/components/public/InquireCard";
import { Mosaic } from "@/components/public/Mosaic";
import { SetupVisualizer } from "@/components/public/SetupVisualizer";
import { HeartButton } from "@/components/public/VenueCard";

export function generateStaticParams() {
  return venues.map((v) => ({ slug: v.slug }));
}

export async function generateMetadata({ params }: PageProps<"/venues/[slug]">) {
  const v = venue((await params).slug);
  return { title: v?.name ?? "Venue", description: v?.summary };
}

export default async function VenuePage({ params }: PageProps<"/venues/[slug]">) {
  const v = venue((await params).slug);
  if (!v) notFound();
  const host = person(v.hostId);
  const others = venues.filter((x) => x.slug !== v.slug);

  const policies = [
    { icon: "clock" as const, t: "Evening events end by 11pm", d: "Load-in from 2pm on event days; load-out by midnight." },
    { icon: "glass" as const, t: "Approved caterers", d: "Choose from four partner caterers, or bring your own with a kitchen fee." },
    { icon: "shield" as const, t: "Holds and deposits", d: "We hold a date for 7 days while you decide. A deposit confirms it." },
    { icon: "calendar" as const, t: "Changes and cancellation", d: "Full refund up to 60 days out; 50% up to 30 days." },
  ];

  return (
    <div className="pb-24 pt-[calc(var(--nav-h)+16px)] lg:pb-0">
      <div className="frame">
        <nav aria-label="Breadcrumb" className="t-small flex items-center gap-1.5 text-stone">
          <Link href="/venues" className="hover:text-ink">
            Venues
          </Link>
          <Icon name="chevron-right" size={14} />
          <span className="text-ink">{v.name}</span>
        </nav>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-x-10 gap-y-4 pb-6">
          <div>
            <h1 className="t-hero">{v.name}</h1>
            <p className="t-lead mt-3 text-stone">
              {v.levelLabel} · {v.kind} · Up to {maxCap(v)} guests
            </p>
          </div>
          <div className="flex items-center gap-2">
            <HeartButton slug={v.slug} name={v.name} tone="plain" />
          </div>
        </div>

        <Mosaic images={v.gallery} vt={`venue-${v.slug}`} title={v.name} />
      </div>

      <div className="frame grid-12 mt-12 gap-y-16 lg:mt-20">
        <div className="col-span-12 lg:col-span-7">
          <Reveal>
            <p className="t-h2 max-w-[24ch]">{v.tagline}</p>
            <p className="t-lead mt-6 max-w-[58ch] text-stone">{v.summary}</p>
          </Reveal>

          <div className="mt-8 flex flex-wrap gap-2">
            {v.goodFor.map((g) => (
              <Pill key={g}>{g}</Pill>
            ))}
          </div>

          <div className="mt-14 space-y-5 border-t hairline pt-10">
            {v.story.map((p) => (
              <p key={p.slice(0, 20)} className="t-body max-w-[62ch] text-ink-2">
                {p}
              </p>
            ))}
          </div>

          <section className="mt-16" aria-labelledby="offers">
            <h2 id="offers" className="t-h2">
              What this venue offers
            </h2>
            <ul className="mt-8 grid gap-x-8 gap-y-7 sm:grid-cols-2">
              {v.features.map((f) => (
                <li key={f.label} className="flex gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-paper shadow-[var(--shadow-ring)]">
                    <Icon name={f.icon} size={21} />
                  </span>
                  <span>
                    <span className="block font-medium">{f.label}</span>
                    {f.detail && <span className="t-small block text-stone">{f.detail}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-20" aria-labelledby="capacity">
            <h2 id="capacity" className="t-h2">
              Capacity, by setup
            </h2>
            <p className="t-body mt-3 max-w-[56ch] text-stone">Pick a setup to see how {v.name} arranges, and how many it seats.</p>
            <SetupVisualizer className="mt-8" plate={v.plate} capacities={v.capacities} title={`${v.name} · ${v.sqft.toLocaleString()} sq ft`} />
          </section>

          <section
            className="mt-20 grid gap-8 rounded-[var(--radius-media)] bg-paper p-6 shadow-[var(--shadow-ring)] sm:grid-cols-[180px_1fr] sm:p-8"
            aria-labelledby="host"
          >
            {host.image && <Photo img={host.image} className="media aspect-[4/5] w-full sm:w-[180px]" sizes="180px" />}
            <div>
              <p className="t-meta">Your host for {v.name}</p>
              <h2 id="host" className="t-h2 mt-2">
                {host.name}
              </h2>
              <p className="t-small text-stone">{host.role}</p>
              <p className="t-body mt-4 max-w-[52ch]">{host.bio}</p>
              <Link
                href={`/venues/inquire?venue=${v.slug}`}
                className="group mt-6 inline-flex items-center gap-2 border-b border-ink/25 pb-0.5 font-medium hover:border-ink"
              >
                Ask Inés a question
                <Icon name="arrow-right" size={17} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </section>

          <section className="mt-20" aria-labelledby="know">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 id="know" className="t-h2">
                Things to know
              </h2>
              <Pill tone="hold">Sample policy for this prototype</Pill>
            </div>
            <ul className="mt-8 grid gap-6 sm:grid-cols-2">
              {policies.map((p) => (
                <li key={p.t} className="border-t hairline pt-5">
                  <Icon name={p.icon} size={20} className="text-stone" />
                  <p className="mt-3 font-medium">{p.t}</p>
                  <p className="t-small mt-1 text-stone">{p.d}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="col-span-12 lg:col-span-4 lg:col-start-9">
          <InquireCard v={v} />
        </div>
      </div>

      <section className="frame mt-28 border-t hairline pb-24 pt-14 lg:pb-32">
        <h2 className="t-h2">Also at the Pyramid</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {others.map((o) => (
            <Link
              key={o.slug}
              href={`/venues/${o.slug}`}
              className="group flex items-center gap-5 rounded-[var(--radius-media)] bg-paper p-3 pr-6 shadow-[var(--shadow-ring)] transition-shadow hover:shadow-[var(--shadow-soft)]"
            >
              <Photo img={o.hero} vt={`venue-${o.slug}`} className="media aspect-square w-28 shrink-0 sm:w-36" sizes="150px" />
              <span className="min-w-0 flex-1">
                <span className="t-meta block">
                  {o.levelLabel} · Up to {maxCap(o)}
                </span>
                <span className="t-h3 mt-1 block">{o.name}</span>
                <span className="t-small mt-1 line-clamp-2 block text-stone">{o.tagline}</span>
              </span>
              <Icon name="arrow-right" size={20} className="shrink-0 transition-transform group-hover:translate-x-1" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
