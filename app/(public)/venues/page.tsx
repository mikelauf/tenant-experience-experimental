import Image from "@/components/ui/SmoothImage";
import { building, person } from "@/lib/data/building";
import { images } from "@/lib/data/images";
import { maxCap, venues } from "@/lib/data/venues";
import { LineReveal, Reveal, ClipReveal } from "@/components/motion/Reveal";
import { NumberRoll } from "@/components/motion/NumberRoll";
import { ButtonLink } from "@/components/ui/Button";
import { Photo } from "@/components/ui/Photo";
import { FloorByFloor } from "@/components/public/FloorByFloor";
import { VenueCollection } from "@/components/public/VenueCollection";

export const metadata = { title: "Gather at the Pyramid" };

const moments = [
  { img: images.bayReception, title: "Launch night for 120", where: "Bay Lounge" },
  { img: images.bayDusk, title: "Blue hour for twenty", where: "Bay Lounge" },
  { img: images.redwoodEvening, title: "A long-table dinner under the trees", where: "Redwood Park" },
  { img: images.talk, title: "A fireside talk at dusk", where: "Bay Lounge" },
  { img: images.artStratagems, title: "A private view in the pavilion", where: "The Pavilion" },
  { img: images.montgomeryHall, title: "An all-hands for 160", where: "Montgomery Hall" },
];

const around = [
  { img: images.lobbyCoffee, t: "Coffee in the lobby", d: "Your guests arrive to a travertine coffee bar and a concierge who knows their name." },
  { img: images.colonnade, t: "The colonnade", d: "The tower's sculpted concrete legs frame the walk in from Montgomery Street." },
  { img: images.artStratagems, t: "Art in the pavilion", d: "Rotating installations from Pyramid Arts, open to guests before and after." },
  { img: images.historyGallery, t: "The history gallery", d: "Fifty years of the building, from the drawings to the day it topped out." },
];

const steps = [
  { n: "01", title: "Tell us the shape of it", body: "A date or a season, a rough headcount and the feeling you want. Five minutes, no account." },
  { n: "02", title: "We call you back", body: "Inés or someone on her team replies within one business day with options that fit." },
  { n: "03", title: "Walk the space", body: "Come see it at the hour your event would happen. Light matters up here." },
  { n: "04", title: "Hold, plan, host", body: "We hold your date, build the plan with you, and run the night so you can be a guest." },
];

export default function VenuesHome() {
  const host = person("ines");
  const total = venues.reduce((a, v) => Math.max(a, maxCap(v)), 0);

  return (
    <>
      {/* Hero: full-bleed, the building first */}
      <section data-nav-over className="theme-night relative flex min-h-[100svh] flex-col justify-end overflow-hidden">
        <Photo img={building.hero} priority quality={90} className="absolute inset-0" imgClassName="animate-[heroZoom_14s_var(--ease-out-quart)_both]" />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-night/55 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-night/70 via-night/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-night via-night/60 to-transparent" />

        <div className="frame relative grid-12 gap-y-10 pb-10 pt-[calc(var(--nav-h)+48px)] lg:pb-14">
          <div className="col-span-12 lg:col-span-8">
            <p className="t-lead text-moon/80 animate-rise">Venues & events · {building.city}</p>
            <LineReveal as="h1" className="t-mega mt-4" lines={["Gather at", "the Pyramid."]} />
            <Reveal delay={0.35}>
              <p className="t-lead mt-7 max-w-[44ch] text-moon/85">
                From a redwood grove at street level to a lounge twenty-seven floors up, host the evening people keep talking about, with a team that does this
                every week.
              </p>
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
              {[
                { k: "Venues", v: venues.length },
                { k: "Up to", v: total, s: " guests" },
                { k: "Floors", v: building.floors },
              ].map((x) => (
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

      <FloorByFloor />

      {/* How an inquiry works */}
      <section className="frame py-24 lg:py-36">
        <div className="grid-12 gap-y-8">
          <div className="col-span-12 lg:col-span-5">
            <LineReveal className="t-h1" lines={["An inquiry starts", "a conversation."]} />
            <Reveal delay={0.1}>
              <p className="t-lead mt-6 max-w-[40ch] text-stone">
                There&apos;s no checkout here. Every event is a little different, so a person reads every inquiry and calls you back. Nothing is reserved until
                you&apos;ve agreed a hold with us.
              </p>
            </Reveal>
          </div>
          <ol className="col-span-12 grid gap-px overflow-hidden rounded-[var(--radius-media)] bg-line sm:grid-cols-2 lg:col-span-7">
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.06} className="bg-quartz">
                <li className="flex h-full flex-col p-6 lg:p-8">
                  <span className="t-num text-[0.9375rem] font-medium text-redwood">{s.n}</span>
                  <h3 className="t-h3 mt-10 lg:mt-16">{s.title}</h3>
                  <p className="t-body mt-2 text-stone">{s.body}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Your host */}
      <section className="relative overflow-hidden bg-paper py-24 lg:py-0">
        <div className="grid-12 lg:min-h-[86svh]">
          <ClipReveal className="media relative col-span-12 mx-[var(--gutter)] aspect-[4/5] !rounded-[var(--radius-media)] lg:col-span-5 lg:mx-0 lg:aspect-auto lg:!rounded-none lg:!rounded-r-[var(--radius-media)]">
            <Image
              src={host.image!.src}
              alt={host.image!.alt}
              fill
              sizes="(min-width:1024px) 42vw, 100vw"
              className="object-cover"
              style={{ objectPosition: host.image!.pos }}
            />
          </ClipReveal>
          <div className="frame col-span-12 flex flex-col justify-center pt-12 lg:col-span-6 lg:col-start-7 lg:py-24 lg:pl-0">
            <p className="t-meta">Your host</p>
            <blockquote className="t-h1 mt-5 max-w-[18ch]">&ldquo;Tell me the feeling you want in the room. I&apos;ll figure out the rest.&rdquo;</blockquote>
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
                Start with Inés
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      {/* Moments: a swipe rail */}
      <section className="py-24 lg:py-36">
        <div className="frame flex items-end justify-between gap-6">
          <LineReveal className="t-h1" lines={["What people", "have made here"]} />
          <p className="t-meta hidden max-w-[30ch] text-right md:block">Illustrative moments from sample events. Scroll sideways.</p>
        </div>
        <div className="no-scrollbar mt-12 flex snap-x snap-mandatory scroll-px-[var(--gutter)] gap-3 overflow-x-auto px-[var(--gutter)] pb-2 lg:gap-5">
          {moments.map((m, i) => (
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

      {/* Around the building */}
      <section className="frame pb-24 lg:pb-36" aria-labelledby="around-h">
        <div className="grid-12 items-end gap-y-6">
          <h2 id="around-h" className="t-h1 col-span-12 lg:col-span-6">
            More than a room
            <br />
            <span className="text-stone">for the night.</span>
          </h2>
          <p className="t-lead col-span-12 text-stone lg:col-span-4 lg:col-start-9">
            The whole building is part of the welcome, from the lobby coffee bar to the art in the pavilion.
          </p>
        </div>
        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-[var(--col-gap)]">
          {around.map((a, i) => (
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
              {[
                { k: "Address", v: `${building.address}, ${building.city}`, d: "The full block between Washington and Clay, Montgomery and Sansome." },
                { k: "Transit", v: "8 minutes from Embarcadero", d: "BART and Muni, with cable cars a few blocks south on California Street." },
                { k: "Arrivals", v: "Guest check-in on L1", d: "Our team meets your guests at the lobby desk and rides up with them." },
                { k: "Outdoor events", v: "Enter from Redwood Park", d: "Through the gates on Washington Street or Mark Twain Alley." },
              ].map((x) => (
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
            <div className="relative aspect-square overflow-hidden rounded-[var(--radius-media)] bg-white shadow-[var(--shadow-ring)]">
              <Image src={images.siteMap.src} alt={images.siteMap.alt} fill sizes="(min-width:1024px) 45vw, 100vw" className="object-contain p-6 sm:p-10" />
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
