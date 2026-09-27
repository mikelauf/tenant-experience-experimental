"use client";

import Link from "next/link";
import { ACCESS_LABEL, GROUPS, standing } from "@/lib/amenities";
import { cn } from "@/lib/cn";
import type { Amenity } from "@/lib/data/types";
import { useDemo } from "@/lib/store";
import { useTenant } from "@/lib/tenants/client";
import { RevealItem } from "@/components/motion/Reveal";
import { Icon } from "@/components/ui/Icon";
import Image from "@/components/ui/SmoothImage";

/**
 * Everything the building offers, grouped by what you'd go there to do (Wayfinder #299, #336), with who can use each
 * and what it takes. Public offerings sit alongside tenant ones: members get more access, not a smaller catalog.
 */
export function WhatYouCanUse({ heading = "What you can use", lead }: { heading?: string; lead?: string }) {
  const t = useTenant();
  const groups = GROUPS.map((g) => ({ ...g, items: t.amenities.filter((a) => a.group === g.id) })).filter((g) => g.items.length);
  if (!groups.length) return null;

  return (
    <section className="frame py-20 lg:py-28" aria-labelledby="use-h">
      <div className="grid-12 gap-y-10">
        <div className="col-span-12 lg:col-span-4">
          <div className="lg:sticky lg:top-[calc(var(--nav-h)+32px)]">
            <h2 id="use-h" className="t-h1">
              {heading}
            </h2>
            <p className="t-lead mt-4 max-w-[36ch] text-stone">
              {lead ?? `Working here gets you in the door. A few things are memberships or on request, and each one says which.`}
            </p>
            <nav className="mt-8 hidden flex-wrap gap-2 lg:flex" aria-label="Jump to">
              {groups.map((g) => (
                <a key={g.id} href={`#use-${g.id}`} className="rounded-full bg-paper px-4 py-2 text-[0.875rem] font-medium shadow-[var(--shadow-ring)] hover:shadow-[inset_0_0_0_1px_var(--color-ink)]">
                  {g.label}
                </a>
              ))}
            </nav>
          </div>
        </div>
        <div className="col-span-12 space-y-14 lg:col-span-8">
          {groups.map((g) => (
            <div key={g.id} id={`use-${g.id}`} className="scroll-mt-[calc(var(--nav-h)+24px)]">
              <div className="flex items-baseline justify-between gap-4 border-b hairline pb-3">
                <h3 className="t-h2">{g.label}</h3>
                <p className="t-small text-stone">{g.line}</p>
              </div>
              <ul className="mt-5 grid gap-4 sm:grid-cols-2">
                {g.items.map((a, i) => (
                  // A card left on its own in the row takes the whole row, photo beside the words
                  <RevealItem key={a.id} delay={i * 0.05} className={cn("h-full", i % 2 === 0 && i === g.items.length - 1 && "sm:col-span-2")}>
                    <Card a={a} wide={i % 2 === 0 && i === g.items.length - 1} />
                  </RevealItem>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Card({ a, wide }: { a: Amenity; wide?: boolean }) {
  const s = useDemo();
  const st = standing(a, s.persona, s.fitnessMember);
  const body = (
    <>
      {a.img ? (
        <div className={cn("relative aspect-[16/10] overflow-hidden", wide && "sm:aspect-auto sm:min-h-[260px] sm:w-[52%] sm:shrink-0")}>
          <Image
            src={a.img.src}
            alt={a.img.alt}
            fill
            sizes={wide ? "(min-width:1024px) 32vw, (min-width:640px) 50vw, 90vw" : "(min-width:1024px) 30vw, (min-width:640px) 45vw, 90vw"}
            className="object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.03]"
            style={{ objectPosition: a.img.pos }}
          />
        </div>
      ) : (
        <div className={cn("flex aspect-[16/10] items-end bg-fog p-5", wide && "sm:aspect-auto sm:w-[52%] sm:shrink-0")}>
          <ul className="space-y-1">
            {a.points?.map((x) => (
              <li key={x} className="t-h3 text-ink-2">
                {x}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        <p className="t-meta">{a.where}</p>
        <p className="t-h3 mt-1.5">{a.name}</p>
        <p className="t-small mt-2 flex-1 text-stone">{a.blurb}</p>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <span className={cn("inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[0.8125rem] font-medium", st.ok ? "bg-ok-soft text-ok" : "bg-hold-soft text-hold")}>
            {ACCESS_LABEL[a.access]}
          </span>
          {a.href ? (
            <span className="inline-flex items-center gap-1.5 text-[0.9375rem] font-medium">
              {a.cta ?? "Take a look"}
              <Icon name="arrow-right" size={16} className="transition-transform group-hover:translate-x-0.5" />
            </span>
          ) : (
            <span className="t-small text-stone">{st.note}</span>
          )}
        </div>
      </div>
    </>
  );
  const cls = cn("card group flex h-full flex-col overflow-hidden", wide && "sm:flex-row");
  return a.href ? (
    <Link href={a.href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
