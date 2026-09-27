import Image from "@/components/ui/SmoothImage";
import { getTenant } from "@/lib/tenants/server";
import { LineReveal, Reveal, ClipReveal } from "@/components/motion/Reveal";
import { NumberRoll } from "@/components/motion/NumberRoll";
import { ButtonLink } from "@/components/ui/Button";
import { Photo } from "@/components/ui/Photo";
import { CloserLook } from "@/components/public/CloserLook";
import { HeroMedia } from "@/components/public/HeroMedia";
import { Setting } from "@/components/public/Setting";
import { Suspense } from "react";
import { ExplorerSection } from "@/components/public/explorer/ExplorerSection";
import { VenueCollection } from "@/components/public/VenueCollection";
import { TowerHero } from "@/components/three/TowerHero";

export async function generateMetadata() {
  return { title: (await getTenant()).copy.public.title };
}

export default async function VenuesHome() {
  const t = await getTenant();
  const { building, venues, copy } = t;
  const pub = copy.public;
  const host = t.publicHost;
  const total = Math.max(0, ...venues.map((v) => v.capacity ?? 0));
  const steps = [
    { n: "01", title: "Tell us the shape of it", body: "A date or a season, a rough headcount and what you have in mind. No account needed." },
    {
      n: "02",
      title: "The events team follows up",
      body: host ? `${host.name.split(" ")[0]} or someone on the team gets back to you.` : "Someone on the team gets back to you to talk it through.",
    },
    { n: "03", title: "Walk the space", body: "Ask for a site visit and see the venue in person before you decide." },
    { n: "04", title: "Plan it together", body: "Setup, catering and services, agreed with you. Nothing is reserved until you say so." },
  ];

  return (
    <>
      {/* Hero: full-bleed, the building first */}
      <section data-nav-over className="theme-night relative flex min-h-[100svh] flex-col justify-end overflow-hidden">
        {building.heroTower ? (
          <TowerHero className="absolute inset-0" />
        ) : pub.heroSlides.length || pub.heroVideo ? (
          <HeroMedia slides={pub.heroSlides} video={pub.heroVideo} className="absolute inset-0" />
        ) : (
          <Photo img={building.hero} priority quality={90} className="absolute inset-0" imgClassName="animate-[heroZoom_14s_var(--ease-out-quart)_both]" />
        )}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-night/55 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-night/70 via-night/20 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-night via-night/60 to-transparent" />

        <div className="frame pointer-events-none relative grid-12 gap-y-10 pb-10 pt-[calc(var(--nav-h)+48px)] *:pointer-events-auto md:pb-24 lg:pb-28">
          <div className="col-span-12 lg:col-span-8">
            <p className="t-lead text-moon/80 animate-rise">Venues & events · {building.city}</p>
            <LineReveal as="h1" className="t-mega mt-4" lines={pub.heroLines} />
            <Reveal delay={0.35}>
              <p className="t-lead mt-7 max-w-[44ch] text-moon/85">{pub.heroLead}</p>
            </Reveal>
            <Reveal delay={0.45} className="mt-9 flex flex-wrap gap-3">
              <ButtonLink href="#collection" variant="light" size="lg" icon="arrow-right">
                Explore the venues
              </ButtonLink>
              <ButtonLink href="/venues/inquire" variant="glass" size="lg">
                Start an inquiry
              </ButtonLink>
            </Reveal>
          </div>

          <Reveal delay={0.6} className="col-span-12 lg:col-span-4 lg:self-end">
            <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-[20px] bg-white/10 backdrop-blur-md">
              {[{ k: "Venues", v: venues.length }, ...(total ? [{ k: "Up to", v: total, s: " guests" }] : []), { k: "Floors", v: building.floors }].map((x) => (
                <div key={x.k} className="bg-night/30 p-4">
                  <dt className="t-meta">{x.k}</dt>
                  <dd className="t-num mt-1 text-[1.75rem] font-medium leading-none">
                    <NumberRoll value={x.v} fromZero />
                    {x.s && <span className="ml-1 text-[0.8125rem] font-normal tracking-normal text-moon-2">{x.s.trim()}</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </section>

      <VenueCollection />

      <Suspense>
        <ExplorerSection />
      </Suspense>

      <Setting />

      <CloserLook />

      {/* À la carte: what the building can add */}
      {pub.alaCarte && (
        <section className="frame py-24 lg:py-36" aria-labelledby="alacarte-h">
          <div className="grid-12 items-end gap-y-6">
            <h2 id="alacarte-h" className="t-h1 col-span-12 lg:col-span-6">
              À la carte.
              <br />
              <span className="text-stone">Tailor the experience.</span>
            </h2>
            <p className="t-lead col-span-12 text-stone lg:col-span-4 lg:col-start-9">{pub.alaCarte.lead}</p>
          </div>
          <div className="mt-12 grid gap-px overflow-hidden rounded-[var(--radius-media)] bg-line md:grid-cols-3">
            {pub.alaCarte.groups.map((g, i) => (
              <Reveal key={g.title} delay={i * 0.06} className="bg-paper">
                <div className="h-full p-6 lg:p-8">
                  <p className="t-h3">{g.title}</p>
                  <ul className="t-body mt-5 space-y-2 text-ink-2">
                    {g.items.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* How an inquiry works: a dark band, so the ask stands apart from the light sections around it */}
      <section className="theme-night frame py-24 lg:py-36">
        <div className="grid-12 gap-y-8">
          <div className="col-span-12 lg:col-span-5">
            <LineReveal className="t-h1" lines={["An inquiry starts", "a conversation."]} />
            <Reveal delay={0.1}>
              <p className="t-lead mt-6 max-w-[40ch] text-moon-2">
                There&apos;s no checkout here. Every event is a little different, so the events team reads every inquiry and follows up. Nothing is reserved until you agree it together.
              </p>
              <div className="mt-9">
                <ButtonLink href="/venues/inquire" variant="light" size="lg" icon="arrow-right">
                  Start an inquiry
                </ButtonLink>
              </div>
            </Reveal>
          </div>
          <ol className="col-span-12 grid gap-px overflow-hidden rounded-[var(--radius-media)] bg-night-line sm:grid-cols-2 lg:col-span-7">
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.06} className="bg-night-2">
                <li className="flex h-full flex-col p-6 lg:p-8">
                  <span className="t-num text-[0.9375rem] font-medium text-accent-glow">{s.n}</span>
                  <h3 className="t-h3 mt-10 lg:mt-16">{s.title}</h3>
                  <p className="t-body mt-2 text-moon-2">{s.body}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Your host, when there is a real one to introduce */}
      {host && (
        <section className="relative overflow-hidden bg-paper py-24 lg:py-0">
          <div className="grid-12 lg:min-h-[86svh]">
            <ClipReveal className="media relative col-span-12 mx-[var(--gutter)] aspect-[4/5] !rounded-[var(--radius-media)] lg:col-span-5 lg:mx-0 lg:aspect-auto lg:!rounded-none lg:!rounded-r-[var(--radius-media)]">
              {host.image ? (
                <Image
                  src={host.image.src}
                  alt={host.image.alt}
                  fill
                  sizes="(min-width:1024px) 42vw, 100vw"
                  className="object-cover"
                  style={{ objectPosition: host.image.pos }}
                />
              ) : (
                // No portrait yet: a monogram in the building's accent
                <span className="theme-night absolute inset-0 grid place-items-center bg-accent-deep">
                  <span className="t-mega text-[clamp(6rem,16vw,14rem)] text-accent-soft/90">{host.initials}</span>
                </span>
              )}
            </ClipReveal>
            <div className="frame col-span-12 flex flex-col justify-center pt-12 lg:col-span-6 lg:col-start-7 lg:py-24 lg:pl-0">
              <p className="t-meta">Your host</p>
              {pub.hostQuote && <blockquote className="t-h1 mt-5 max-w-[18ch]">&ldquo;{pub.hostQuote}&rdquo;</blockquote>}
              <div className="mt-10 flex items-center gap-4">
                <span className="grid size-12 place-items-center rounded-full bg-ink text-[0.875rem] font-semibold text-paper">{host.initials}</span>
                <div>
                  <p className="font-medium">{host.name}</p>
                  <p className="t-meta">
                    {host.role} · {host.since}
                  </p>
                </div>
              </div>
              <p className="t-body mt-8 max-w-[52ch] text-stone">{host.bio}</p>
              <div className="mt-10">
                <ButtonLink href="/venues/inquire" icon="arrow-right">
                  Start with {host.name.split(" ")[0]}
                </ButtonLink>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Moments: a swipe rail, only with real photography to show */}
      {pub.moments && (
        <section className="pt-24 lg:pt-36">
          <div className="frame flex items-end justify-between gap-6">
            <LineReveal className="t-h1" lines={["What people", "have made here"]} />
            <p className="t-meta hidden max-w-[30ch] text-right md:block">Illustrative moments from sample events. Scroll sideways.</p>
          </div>
          <div className="no-scrollbar mt-12 flex snap-x snap-mandatory scroll-px-[var(--gutter)] gap-3 overflow-x-auto px-[var(--gutter)] pb-2 lg:gap-5">
            {pub.moments.map((m, i) => (
              <figure key={m.title} className={`shrink-0 snap-start ${i % 2 ? "w-[72vw] sm:w-[40vw] lg:w-[26vw]" : "w-[84vw] sm:w-[52vw] lg:w-[36vw]"}`}>
                <div className={`media relative ${i % 2 ? "aspect-[4/5]" : "aspect-[5/4]"}`}>
                  <Image
                    src={m.img.src}
                    alt={m.img.alt}
                    fill
                    sizes="40vw"
                    className="object-cover transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] hover:scale-[1.03]"
                  />
                </div>
                <figcaption className="mt-3 flex items-baseline justify-between gap-4">
                  <span className="font-medium">{m.title}</span>
                  <span className="t-meta shrink-0">{m.where}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* Around the building */}
      <section className="frame py-24 lg:py-36" aria-labelledby="around-h">
        <div className="grid-12 items-end gap-y-6">
          <h2 id="around-h" className="t-h1 col-span-12 lg:col-span-6">
            More than a room
            <br />
            <span className="text-stone">for the night.</span>
          </h2>
          <p className="t-lead col-span-12 text-stone lg:col-span-4 lg:col-start-9">{pub.aroundLead}</p>
        </div>
        <div className={`mt-12 grid gap-3 sm:grid-cols-2 lg:gap-[var(--col-gap)] ${pub.around.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
          {pub.around.map((a, i) => (
            <Reveal key={a.t} delay={i * 0.06}>
              <figure className="group">
                <div className={`media relative ${i % 2 ? "aspect-[4/5] lg:mt-16" : "aspect-[4/5]"}`}>
                  <Image
                    src={a.img.src}
                    alt={a.img.alt}
                    fill
                    sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-[1.03]"
                    style={{ objectPosition: a.img.pos }}
                  />
                </div>
                <figcaption className="mt-4">
                  <p className="font-medium">{a.t}</p>
                  <p className="t-small mt-1 text-stone">{a.d}</p>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Getting here */}
      <section className="frame pb-32 lg:pb-36" aria-labelledby="here-h">
        <div className="grid-12 gap-y-10 border-t hairline pt-12 lg:pt-16">
          <div className="col-span-12 lg:col-span-5">
            <h2 id="here-h" className="t-h1">
              Getting here
            </h2>
            <dl className="mt-10 space-y-8">
              {pub.gettingHere.map((x) => (
                <div key={x.k} className="grid grid-cols-[120px_1fr] gap-4">
                  <dt className="t-meta pt-0.5">{x.k}</dt>
                  <div>
                    <dd className="font-medium">{x.v}</dd>
                    <dd className="t-small mt-1 text-stone">{x.d}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>
          <Reveal className="col-span-12 lg:col-span-6 lg:col-start-7">
            {pub.siteMap ? (
              <div className="relative aspect-square overflow-hidden rounded-[var(--radius-media)] bg-white shadow-[var(--shadow-ring)]">
                <Image src={pub.siteMap.src} alt={pub.siteMap.alt} fill sizes="(min-width:1024px) 45vw, 100vw" className="object-contain p-6 sm:p-10" />
              </div>
            ) : (
              // No site plan yet: the building itself, turning slowly
              <div className="theme-night relative aspect-square overflow-hidden rounded-[var(--radius-media)] bg-night">
                <TowerHero className="absolute inset-0" framing="plaza" />
              </div>
            )}
          </Reveal>
        </div>
      </section>
    </>
  );
}
