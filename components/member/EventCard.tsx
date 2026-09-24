"use client";

import Link from "next/link";
import { ViewTransition } from "react";
import { cn } from "@/lib/cn";
import type { BuildingEvent } from "@/lib/data/types";
import { currentMember, findActive, useDemo, useHydrated } from "@/lib/store";
import { fmtDay, fmtTime } from "@/lib/time";
import Image from "@/components/ui/SmoothImage";
import { Icon } from "@/components/ui/Icon";
import { Pill } from "@/components/ui/Pill";

export function accessLabel(e: BuildingEvent) {
  if (e.access.type === "company") return `${e.access.company} only`;
  if (e.access.type === "vip") return "Invite only";
  return null;
}

export function canAttend(e: BuildingEvent) {
  if (e.access.type === "vip") return false;
  if (e.access.type === "company") return e.access.company === currentMember.company;
  return true;
}

export function EventCard({ e, className, size = "md" }: { e: BuildingEvent; className?: string; size?: "md" | "lg" }) {
  const s = useDemo();
  const hydrated = useHydrated();
  const mine = hydrated ? findActive(s, "event", e.slug) : undefined;
  const full = e.going >= e.capacity;
  const tag = accessLabel(e);
  const d = new Date(e.startsAt);

  return (
    <Link href={`/programming/${e.slug}`} className={cn("group block", className)}>
      <div className={cn("media relative", size === "lg" ? "aspect-[4/5] sm:aspect-[5/4]" : "aspect-[4/5]")}>
        <ViewTransition name={`event-${e.slug}`} share="morph" default="none">
          <div className="absolute inset-0">
            <Image
              src={e.image.src}
              alt={e.image.alt}
              fill
              sizes={size === "lg" ? "(min-width:1024px) 50vw, 90vw" : "(min-width:1024px) 25vw, 70vw"}
              className="object-cover transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-[1.04]"
              style={{ objectPosition: e.image.pos }}
            />
          </div>
        </ViewTransition>
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" />
        {/* date tile */}
        <div className="absolute left-3 top-3 flex h-[60px] w-[54px] flex-col items-center justify-center rounded-2xl bg-paper/95 text-ink shadow-[var(--shadow-soft)] backdrop-blur">
          <span className="text-[0.6875rem] font-semibold text-redwood">{d.toLocaleDateString("en-US", { month: "short" })}</span>
          <span className="t-num text-[1.5rem] font-medium leading-none">{d.getDate()}</span>
        </div>
        <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
          {mine && (
            <Pill tone={mine.status === "waitlist" ? "accent" : "ok"} dot className="bg-paper/95">
              {mine.status === "waitlist" ? "Waitlisted" : "Going"}
            </Pill>
          )}
          {!mine && full && <Pill tone="glass">Full · waitlist</Pill>}
          {tag && (
            <Pill tone="glass">
              <Icon name={e.access.type === "vip" ? "star" : "lock"} size={13} />
              {tag}
            </Pill>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <p className="text-[0.8125rem] text-white/80">{e.kicker}</p>
        </div>
      </div>
      <div className="mt-3">
        <h3 className={cn("font-medium leading-snug", size === "lg" ? "t-h2" : "text-[1.0625rem]")}>{e.name}</h3>
        <p className="t-meta mt-1">
          {fmtDay(e.startsAt)} · {fmtTime(e.startsAt)} · {e.place}
        </p>
      </div>
    </Link>
  );
}
