import Image from "@/components/ui/SmoothImage";
import { getTenant } from "@/lib/tenants/server";
import { LineReveal, Reveal, RevealItem, ClipReveal } from "@/components/motion/Reveal";
import { NumberRoll } from "@/components/motion/NumberRoll";
import { ButtonLink } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Photo } from "@/components/ui/Photo";
import { ArrivalPlan } from "@/components/public/ArrivalPlan";
import { CloserLook } from "@/components/public/CloserLook";
import { HeroMedia } from "@/components/public/HeroMedia";
import { LiveNow } from "@/components/public/LiveNow";
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

  // Getting here: the heading and address, beside the plan of the block (or the site map, or the tower)
  const hereIntro = (
    <>
      <h2 id="here-h" className="t-h1">
        Getting here
      </h2>
      <dl className="mt-8 space-y-5">
        {pub.gettingHere.map((x) => (
          <div key={x.k} className="grid grid-cols-[96px_1fr] gap-4 lg:grid-cols-[88px_1fr]">
            <dt className="t-meta pt-0.5">{x.k}</dt>
            <dd>
              <span className="block font-medium">{x.v}</span>
              <span className="t-small mt-0.5 block text-stone">{x.d}</span>
            </dd>
          </div>
        ))}
      </dl>
    </>
  );

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
            {/* The first screen animates in CSS, not motion: it paints with the HTML instead of waiting for hydration */}
            <h1 className="t-mega mt-4">
              {pub.heroLines.map((l, i) => (
                <span key={l} className="-mb-[0.22em] -mt-[0.1em] block overflow-hidden pb-[0.22em] pt-[0.1em]">
                  <span className="block animate-line" style={{ animationDelay: `${0.1 + i * 0.08}s` }}>
                    {l}
                  </span>
                </span>
              ))}
            </h1>
            <p className="t-lead mt-7 max-w-[44ch] animate-rise text-moon/85 [animation-delay:0.35s]">{pub.heroLead}</p>
            <div className="mt-9 flex animate-rise flex-wrap gap-3 [animation-delay:0.45s]">
              <ButtonLink href="#collection" variant="light" size="lg" icon="arrow-right">
                Explore the venues
              </ButtonLink>
              <ButtonLink href="/venues/inquire" variant="glass" size="lg">
                Start an inquiry
              </ButtonLink>
            </div>
          </div>

          {/* Wide screens: anchored to the hero's bottom edge, level with the slideshow controls on the left */}
          <div className="col-span-12 animate-rise [animation-delay:0.6s] lg:absolute lg:bottom-10 lg:right-[var(--gutter)] lg:w-[calc((100%-2*var(--gutter)-2*var(--col-gap))/3)]">
            <div className="overflow-hidden rounded-[20px] bg-white/10 backdrop-blur-md">
              <dl className="grid grid-cols-3 gap-px">
                {[{ k: "Venues", v: venues.length }, ...(total ? [{ k: "Up to", v: total, s: " guests" }] : []), { k: "Floors", v: building.floors }].map(
                  (x) => (
                    <div key={x.k} className="bg-night/30 p-4">
                      <dt className="t-meta">{x.k}</dt>
                      <dd className="t-num mt-1 text-[1.75rem] font-medium leading-none">
                        <NumberRoll value={x.v} fromZero onLoad delay={0.7} duration={1.2} />
                        {x.s && <span className="ml-1 text-[0.8125rem] font-normal tracking-normal text-moon-2">{x.s.trim()}</span>}
                      </dd>
                    </div>
                  ),
                )}
              </dl>
              {/* The building right now, lit by the real sun, as the 3D tower below is */}
              <div className="mt-px">
                <LiveNow />
              </div>
            </div>
          </div>
        </div>
      </section>

      <VenueCollection />

      <Suspense>
        <ExplorerSection />
      </Suspense>

      <Setting />

      <CloserLook />

      {/* À la carte: what the building can add. A side label and numbered rows, not another heading-and-grid */}
      {pub.alaCarte && (
        <section className="frame py-24 lg:py-36" aria-labelledby="alacarte-h">
          <div className="grid-12 gap-y-10">
            <div className="col-span-12 lg:col-span-4">
              <div className="lg:sticky lg:top-[calc(var(--nav-h)+32px)]">
                <p className="t-meta">À la carte</p>
                <h2 id="alacarte-h" className="t-h1 mt-3 lg:max-w-[12ch]">
                  Tailor the experience.
                </h2>
                <p className="t-body mt-4 max-w-[36ch] text-stone">{pub.alaCarte.lead}</p>
              </div>
            </div>
            <ol className="col-span-12 border-t hairline lg:col-span-7 lg:col-start-6">
              {pub.alaCarte.groups.map((g, i) => (
                <RevealItem key={g.title} delay={i * 0.06} className="grid gap-5 border-b hairline py-8 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:py-10">
                  <div className="flex items-baseline gap-4">
                    <span className="t-num text-[0.9375rem] font-medium text-accent">{String(i + 1).padStart(2, "0")}</span>
                    <h3 className="t-h3">{g.title}</h3>
                  </div>
                  <ul className="flex flex-wrap content-start gap-2">
                    {g.items.map((x) => (
                      <li key={x}>
                        <Pill>{x}</Pill>
                      </li>
                    ))}
                  </ul>
                </RevealItem>
              ))}
            </ol>
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
                There&apos;s no checkout here. Every event is a little different, so the events team reads every inquiry and follows up. Nothing is reserved
                until you agree it together.
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
              <RevealItem key={s.n} delay={i * 0.06} className="flex h-full flex-col bg-night-2 p-6 lg:p-8">
                <span className="t-num text-[0.9375rem] font-medium text-accent-glow">{s.n}</span>
                <h3 className="t-h3 mt-10 lg:mt-16">{s.title}</h3>
                <p className="t-body mt-2 text-moon-2">{s.body}</p>
              </RevealItem>
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
        {/* One voice, stacked: an eyebrow, the line, then the lead under it */}
        <p className="t-meta">Around the building</p>
        <h2 id="around-h" className="t-h1 mt-3 max-w-[18ch] text-balance">
          More than a room for the night.
        </h2>
        <p className="t-lead mt-5 max-w-[48ch] text-stone">{pub.aroundLead}</p>
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

      {/* Getting here: the address and the ways in beside a plan of the block */}
      <section className="frame pb-32 lg:pb-36" aria-labelledby="here-h">
        <div className="border-t hairline pt-12 lg:pt-16">
          {t.tower.pois?.length ? (
            <ArrivalPlan intro={hereIntro} />
          ) : (
            <div className="grid-12 gap-y-10">
              <div className="col-span-12 lg:col-span-4">{hereIntro}</div>
              <Reveal className="col-span-12 lg:col-span-7 lg:col-start-6">
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
          )}
        </div>
      </section>
    </>
  );
}
