import Link from "next/link";
import { notFound } from "next/navigation";
import { guestsShort } from "@/lib/data/shared";
import { isDemo, showV2 } from "@/lib/flags";
import { getTenant } from "@/lib/tenants/server";
import { Reveal } from "@/components/motion/Reveal";
import { Icon } from "@/components/ui/Icon";
import { Pill } from "@/components/ui/Pill";
import { Photo } from "@/components/ui/Photo";
import { FloorPlan } from "@/components/public/FloorPlan";
import { InquireCard } from "@/components/public/InquireCard";
import { InquireLink, InquiryHost } from "@/components/public/InquiryModal";
import { VenueSpace } from "@/components/public/VenueSpace";
import { PhotoRow, VenueHero } from "@/components/public/VenuePhotos";

export async function generateMetadata({ params }: PageProps<"/venues/[slug]">) {
  const v = (await getTenant()).venue((await params).slug);
  return { title: v?.name ?? "Venue", description: v?.tagline };
}

/** Marks, in the demo only, the sections that are hidden at launch until real data backs them. */
function InProgress() {
  return isDemo ? <Pill tone="hold">In progress · hidden at launch</Pill> : null;
}

const IN_HERO = new Set(["Capacity", "Area", "Setting"]);

export default async function VenuePage({ params }: PageProps<"/venues/[slug]">) {
  const t = await getTenant();
  const v = t.venue((await params).slug);
  if (!v) notFound();
  const host = t.publicHost;
  const others = t.venues.filter((x) => x.slug !== v.slug);
  const features = showV2 ? v.features : [];
  // The hero already reads out capacity, area and setting; here they only add their fine print
  const facts = v.facts.flatMap((f) => (!IN_HERO.has(f.label) ? [{ ...f, fine: false }] : f.note ? [{ label: f.label, value: f.note, fine: true }] : []));
  const plan = v.floorPlans?.length ? <FloorPlan plans={v.floorPlans} venue={v.name} compact /> : null;

  return (
    <InquiryHost>
      <div className="pb-24 lg:pb-0">
        <VenueHero v={v} />

        <div id="details" className="frame grid-12 mt-16 scroll-mt-[calc(var(--nav-h)+24px)] lg:mt-24">
          <Reveal className="col-span-12 lg:col-span-8">
            <p className="t-h2 max-w-[24ch]">{v.tagline}</p>
            <p className="t-lead mt-6 max-w-[58ch] text-stone">{v.summary}</p>
            {v.goodFor.length > 0 && (
              <div className="mt-8">
                <p className="t-meta">Suited to</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {v.goodFor.map((g) => (
                    <Pill key={g}>{g}</Pill>
                  ))}
                </div>
              </div>
            )}
          </Reveal>
        </div>

        <VenueSpace v={{ slug: v.slug, name: v.name, sqft: v.sqft, layout: v.layout, views: v.views, viewBearing: v.viewBearing }} />

        <div className="frame grid-12 mt-16 gap-y-16 lg:mt-24">
          <div className="col-span-12 flex flex-col gap-16 lg:col-span-7">
            {plan && <div className="lg:hidden">{plan}</div>}
            {v.story.length > 0 && (
              <div className="space-y-5 border-t hairline pt-10">
                {v.story.map((p) => (
                  <p key={p.slice(0, 20)} className="t-body max-w-[62ch] text-ink-2">
                    {p}
                  </p>
                ))}
              </div>
            )}

            {facts.length > 0 && (
              <section aria-labelledby="facts">
                <h2 id="facts" className="sr-only">
                  At a glance
                </h2>
                <dl className={`grid border-t hairline ${facts.length > 2 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
                  {facts.map((f) => (
                    <div key={f.label} className="border-b hairline py-5 sm:pr-6">
                      <dt className="t-meta">{f.label}</dt>
                      <dd className={f.fine ? "t-small mt-1.5 text-ink-2" : "mt-1.5 font-medium"}>{f.value}</dd>
                      {!f.fine && f.note && <dd className="t-small mt-1 text-stone">{f.note}</dd>}
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {features.length > 0 && (
              <section aria-labelledby="offers">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h2 id="offers" className="t-h2">
                    What this venue offers
                  </h2>
                  <InProgress />
                </div>
                <ul className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2">
                  {features.map((f) => (
                    <li key={f.label} className="flex items-center gap-4">
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
            )}

            {v.services.length > 0 && (
              <section aria-labelledby="services">
                <h2 id="services" className="t-h2">
                  Event services
                </h2>
                <div className="mt-8 grid gap-8 sm:grid-cols-2">
                  {v.services.map((g) => (
                    <div key={g.title} className="border-t hairline pt-5">
                      <p className="font-medium">{g.title}</p>
                      <ul className="t-small mt-3 space-y-2 text-ink-2">
                        {g.items.map((x) => (
                          <li key={x} className="flex gap-2.5">
                            <Icon name="check" size={16} className="mt-0.5 shrink-0 text-stone" />
                            {x}
                          </li>
                        ))}
                      </ul>
                      {g.note && <p className="t-meta mt-3">{g.note}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {host && (
              <section
                className="grid gap-8 rounded-[var(--radius-media)] bg-paper p-6 shadow-[var(--shadow-ring)] sm:grid-cols-[180px_1fr] sm:p-8"
                aria-labelledby="host"
              >
                {host.image ? (
                  <Photo img={host.image} className="media aspect-[4/5] w-full sm:w-[180px]" sizes="180px" />
                ) : (
                  <span className="media grid aspect-[4/5] w-full place-items-center !bg-accent-deep text-[3rem] font-semibold text-accent-soft sm:w-[180px]">
                    {host.initials}
                  </span>
                )}
                <div>
                  <p className="t-meta">Your host for {v.name}</p>
                  <h2 id="host" className="t-h2 mt-2">
                    {host.name}
                  </h2>
                  <p className="t-small text-stone">{host.role}</p>
                  <p className="t-body mt-4 max-w-[52ch]">{host.bio}</p>
                  <InquireLink
                    initial={{ venue: v.slug }}
                    className="group mt-6 inline-flex items-center gap-2 border-b border-ink/25 pb-0.5 font-medium hover:border-ink"
                  >
                    Ask {host.name.split(" ")[0]} a question
                    <Icon name="arrow-right" size={17} className="transition-transform group-hover:translate-x-0.5" />
                  </InquireLink>
                </div>
              </section>
            )}

            {v.policies.length > 0 && (
              <section aria-labelledby="know">
                <h2 id="know" className="t-h2">
                  Good to know
                </h2>
                <ul className="mt-6 space-y-4">
                  {v.policies.map((p) => (
                    <li key={p} className="t-body max-w-[62ch] border-t hairline pt-4 text-ink-2">
                      {p}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* The inquiry card and a small floor plan stay in view together while you read */}
          <div className="col-span-12 lg:col-span-4 lg:col-start-9">
            <div className="space-y-4 lg:sticky lg:top-[calc(var(--nav-h)+20px)]">
              <InquireCard v={v} />
              {plan && <div className="hidden lg:block">{plan}</div>}
            </div>
          </div>
        </div>

        {v.gallery.length > 1 && (
          <section className="frame mt-24 lg:mt-32" aria-labelledby="photos">
            <div className="mb-6 flex items-baseline justify-between gap-4">
              <h2 id="photos" className="t-h2">
                Photos
              </h2>
              <p className="t-meta">{v.gallery.length} photographs</p>
            </div>
            <PhotoRow v={v} />
          </section>
        )}

        {others.length > 0 && (
          <section className="frame mt-24 border-t hairline pb-24 pt-14 lg:mt-32 lg:pb-32">
            <h2 className="t-h2">Also at {t.copy.the}</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {others.map((o) => (
                <Link
                  key={o.slug}
                  href={`/venues/${o.slug}`}
                  className="group flex items-center gap-5 rounded-[var(--radius-media)] bg-paper p-3 pr-6 shadow-[var(--shadow-ring)] transition-shadow hover:shadow-[var(--shadow-soft)]"
                >
                  <Photo img={o.hero} vt={`venue-${o.slug}`} className="media aspect-square w-28 shrink-0 sm:w-36" sizes="150px" />
                  <span className="min-w-0 flex-1">
                    <span className="t-meta block first-letter:uppercase">
                      {o.levelLabel} · {guestsShort(o)}
                    </span>
                    <span className="t-h3 mt-1 block">{o.name}</span>
                    <span className="t-small mt-1 line-clamp-2 block text-stone">{o.tagline}</span>
                  </span>
                  <Icon name="arrow-right" size={20} className="shrink-0 transition-transform group-hover:translate-x-1" />
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </InquiryHost>
  );
}
