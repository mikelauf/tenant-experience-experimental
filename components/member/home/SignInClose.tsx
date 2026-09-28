"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { gateHref } from "@/lib/access";
import { onTower } from "@/lib/amenities";
import { useDemo } from "@/lib/store";
import { useTenant } from "@/lib/tenants/client";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { FloorDrawing, type DrawnFloor } from "./FloorDrawing";
import { glideTo } from "./useScrollSpy";

/**
 * A last word: a big line beside the tower in elevation, every spotlighted floor lit and named, and a light
 * riding up through it. On the Home the names go back to their spotlights; pass `floors` and `onPick` to name
 * something else (the venues home names its venues, each opening its page).
 */
export function CloseBand({
  meta,
  title,
  lead,
  actions,
  floors,
  onPick,
}: {
  meta: string;
  title: string;
  lead: React.ReactNode;
  actions: React.ReactNode;
  floors?: DrawnFloor[];
  onPick?: (id: string) => void;
}) {
  const t = useTenant();
  const tower = useMemo(() => floors ?? onTower(t.amenities), [floors, t.amenities]);
  const lit = useMemo(() => (floors ? floors.map((f) => f.id) : t.amenities.filter((a) => a.level != null && a.spotlight != null).map((a) => a.id)), [floors, t.amenities]);
  const [hoverId, setHoverId] = useState<string | null>(null);

  return (
    <section className="theme-night relative isolate overflow-hidden" aria-labelledby="close-h">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_70%_60%,color-mix(in_srgb,var(--color-accent-glow)_16%,transparent),transparent_60%)]" />
      <div className="frame grid-12 min-h-[80svh] items-center gap-y-12 py-24">
        <div className="col-span-12 lg:col-span-6">
          <p className="t-meta text-moon-2">{meta}</p>
          <h2 id="close-h" className="t-mega mt-4">
            {title}
          </h2>
          <p className="t-lead mt-6 max-w-[34ch] text-moon/80">{lead}</p>
          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">{actions}</div>
        </div>
        <div className="col-span-12 flex justify-center lg:col-span-5 lg:col-start-8">
          <FloorDrawing
            elevator
            className="h-[400px] w-auto max-w-none sm:h-[min(62svh,560px)]"
            list={tower}
            active={lit}
            hoverId={hoverId}
            onHover={setHoverId}
            onPick={
              onPick ??
              ((id) => {
                const el = document.getElementById(`at-${id}`);
                if (el) glideTo(el);
              })
            }
          />
        </div>
      </div>
    </section>
  );
}

const linkCls = "group inline-flex items-center gap-1.5 text-[0.9375rem] font-medium text-moon/75 hover:text-moon";

/** Signed out (or verifying): "Come on up." For anyone who came to plan an event instead, the way to the public venues. */
export function SignInClose() {
  const t = useTenant();
  const waiting = useDemo().persona === "verifying";
  return (
    <CloseBand
      meta={waiting ? "Access being verified" : `Work at ${t.copy.the}?`}
      title="Come on up."
      lead={
        waiting
          ? "Once your work email is confirmed, everything from the lobby to the top floor is yours to use."
          : "Sign in with your work email, and everything from the lobby to the top floor is yours to use."
      }
      actions={
        <>
          <ButtonLink href={gateHref("/home")} variant="light" size="lg" icon="arrow-right">
            {waiting ? "See the status" : "Sign in with your work email"}
          </ButtonLink>
          <Link href="/venues" className={linkCls}>
            Planning an event instead? See the venues
            <Icon name="arrow-right" size={16} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </>
      }
    />
  );
}

/** A new member's last word: the building is theirs now, the concierge can help, and bigger plans start here. */
export function MemberClose() {
  const t = useTenant();
  const { phone, hours } = t.building.concierge;
  return (
    <CloseBand
      meta={`Welcome to ${t.copy.the}`}
      title="Make yourself at home."
      lead={
        <>
          From the lobby to the top floor, it&apos;s yours to use. Anything else, ask the concierge: {t.copy.concierge}, {hours.toLowerCase()}.
        </>
      }
      actions={
        <>
          <ButtonLink href="/spaces/plan-an-event" variant="light" size="lg" icon="arrow-right">
            Plan an event
          </ButtonLink>
          <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className={linkCls}>
            Call the concierge
            <Icon name="arrow-right" size={16} className="transition-transform group-hover:translate-x-0.5" />
          </a>
        </>
      }
    />
  );
}
