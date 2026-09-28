"use client";

import Link from "next/link";
import { useMemo } from "react";
import { gateHref } from "@/lib/access";
import type { Img } from "@/lib/data/types";
import { classSeats } from "@/lib/commit";
import { useDemo, useHydrated } from "@/lib/store";
import { useTenant } from "@/lib/tenants/client";
import { fmtDay, fmtTime } from "@/lib/time";
import { useNow } from "@/lib/useNow";
import { RevealItem } from "@/components/motion/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { Icon, type AnyIcon } from "@/components/ui/Icon";
import Image from "@/components/ui/SmoothImage";

type Unlock = { img?: Img; icon: AnyIcon; title: string; detail: string; verb: string; returnTo: string };

/**
 * Right under the signed-out hero: what signing in turns on, as real things you could do today (a room, the next
 * class with spots, an event, planning something bigger). Each one signs you in and carries on with that task
 * (Wayfinder #336). Times only fill in once the page is in the browser, so the server and client agree.
 */
export function SignInUnlocks() {
  const t = useTenant();
  const s = useDemo();
  const hydrated = useHydrated();
  const now = useNow(60000);

  const list = useMemo<Unlock[]>(() => {
    const out: Unlock[] = [];

    if (t.rooms.length) {
      const bySize = [...t.rooms].sort((a, b) => a.capacity - b.capacity);
      const small = bySize[0]!;
      const big = bySize.at(-1)!;
      const levels = [...new Set(t.rooms.map((r) => r.level))].sort((a, b) => a - b);
      out.push({
        img: t.amenities.find((a) => a.group === "meet" && a.level != null)?.img ?? big.image,
        icon: "people",
        title: `Book one of ${t.rooms.length} meeting rooms`,
        detail: `From ${small.name} (${small.capacity} seats) to ${big.name} (${big.capacity}), on ${levels.length > 1 ? "Levels" : "Level"} ${levels.join(" and ")}. Most book instantly.`,
        verb: "book a room",
        returnTo: "/spaces",
      });
    }

    if (t.fitness) {
      const gym = t.amenities.find((a) => a.group === "move")?.img;
      const next = hydrated
        ? t
            .sessionsFor(new Date(now))
            .concat(t.sessionsFor(new Date(now + 864e5)))
            .filter((c) => new Date(c.startsAt).getTime() > now)
            .map((c) => ({ c, seats: classSeats(t, s, c) }))
            .find((x) => !x.seats.full)
        : undefined;
      out.push(
        next
          ? {
              img: t.template(next.c.kind).image,
              icon: "bike",
              title: `${t.template(next.c.kind).name}, ${fmtDay(next.c.startsAt)} at ${fmtTime(next.c.startsAt)}`,
              detail: `${next.seats.left} ${next.seats.left === 1 ? "spot" : "spots"} left in the wellness center. Classes come with a membership.`,
              verb: "save a spot",
              returnTo: `/fitness/schedule?class=${next.c.id}`,
            }
          : {
              img: gym,
              icon: "bike",
              title: "Save a spot in a class",
              detail: "Coached classes in the wellness center. Classes come with a membership.",
              verb: "save a spot",
              returnTo: "/fitness/schedule",
            },
      );
    }

    if (t.building.services.programming) {
      const ev = hydrated ? t.events().find((e) => new Date(e.startsAt).getTime() > now && e.access.type === "all" && e.going < e.capacity) : undefined;
      out.push(
        ev
          ? {
              img: ev.image,
              icon: "ticket",
              title: `RSVP to ${ev.name}`,
              detail: `${fmtDay(ev.startsAt)} at ${fmtTime(ev.startsAt)}, ${ev.place}. Some events are just for your company.`,
              verb: "RSVP",
              returnTo: `/programming/${ev.slug}`,
            }
          : {
              img: t.amenities.find((a) => a.group === "gather")?.img,
              icon: "ticket",
              title: "RSVP to what's on",
              detail: "Talks, tastings and evenings in the building. Some are just for your company.",
              verb: "RSVP",
              returnTo: "/programming",
            },
      );
    }

    out.push({
      img: t.venues[0]?.hero,
      icon: "star",
      title: "Plan something bigger",
      detail: `An offsite or a company party in one of the building's ${t.venues.length} event venues, planned with the events team.`,
      verb: "start planning",
      returnTo: "/spaces/plan-an-event",
    });
    return out;
  }, [t, s, hydrated, now]);

  return (
    <section className="py-20 lg:py-28" aria-labelledby="unlocks-h">
      <div className="frame grid-12 gap-y-10">
        <div className="col-span-12 lg:col-span-4">
          <div className="lg:sticky lg:top-[calc(var(--nav-h)+32px)]">
            <h2 id="unlocks-h" className="t-h1">
              Sign in with your work email.
            </h2>
            <p className="t-lead mt-4 max-w-[36ch] text-stone">Working at {t.copy.the} comes with more than a desk. Once you&apos;re in, you can:</p>
            <ol className="mt-8 space-y-3 border-t hairline pt-6">
              {[
                "Sign in with an email code, or Google, Apple or Microsoft.",
                "Confirm your work email once. That's how we know you work here.",
                "Book, reserve and RSVP. You land right back where you were.",
              ].map((line, i) => (
                <li key={line} className="flex gap-3 text-[0.9375rem]">
                  <span className="t-num w-4 shrink-0 text-accent">{i + 1}</span>
                  <span className="text-ink-2">{line}</span>
                </li>
              ))}
            </ol>
            <ButtonLink href={gateHref("/home")} size="lg" icon="arrow-right" className="mt-8">
              Sign in
            </ButtonLink>
          </div>
        </div>

        <ul className="col-span-12 grid gap-4 sm:grid-cols-2 lg:col-span-8 lg:col-start-5 lg:gap-5">
          {list.map((u, i) => (
            <RevealItem key={u.verb} delay={i * 0.06} className="h-full">
              <Link
                href={gateHref(u.returnTo)}
                className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] bg-paper shadow-[var(--shadow-ring)] transition-shadow duration-300 hover:shadow-[var(--shadow-soft)]"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-fog">
                  {u.img && (
                    <Image
                      src={u.img.src}
                      alt=""
                      fill
                      sizes="(min-width:1024px) 30vw, (min-width:640px) 45vw, 90vw"
                      className="object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.04]"
                      style={{ objectPosition: u.img.pos }}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                  <span className="absolute bottom-3 left-3 grid size-10 place-items-center rounded-full bg-paper/95 text-accent shadow-[var(--shadow-soft)]">
                    <Icon name={u.icon} size={19} />
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-5 lg:p-6">
                  <p className="t-h3">{u.title}</p>
                  <p className="t-small mt-2 flex-1 text-stone">{u.detail}</p>
                  <span className="mt-5 inline-flex items-center gap-2 self-start rounded-full bg-ink px-4 py-2 text-[0.875rem] font-medium text-paper transition-colors group-hover:bg-accent">
                    Sign in to {u.verb}
                    <Icon name="arrow-right" size={15} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            </RevealItem>
          ))}
        </ul>
      </div>
    </section>
  );
}
