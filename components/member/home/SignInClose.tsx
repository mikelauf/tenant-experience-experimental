"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { gateHref } from "@/lib/access";
import { onTower } from "@/lib/amenities";
import { useTenant } from "@/lib/tenants/client";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { FloorDrawing } from "./FloorDrawing";
import { glideTo } from "./useScrollSpy";

/**
 * The signed-out Home's last word: "Come on up." beside the tower in elevation, every spotlighted floor lit and
 * named, and a light riding up through it. The names go back to their spotlights. For anyone who came to plan an
 * event instead, the way to the public venues.
 */
export function SignInClose() {
  const t = useTenant();
  const tower = useMemo(() => onTower(t.amenities), [t.amenities]);
  const lit = useMemo(() => tower.filter((a) => a.spotlight != null).map((a) => a.id), [tower]);
  const [hoverId, setHoverId] = useState<string | null>(null);

  return (
    <section className="theme-night relative isolate overflow-hidden" aria-labelledby="close-h">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_70%_60%,color-mix(in_srgb,var(--color-accent-glow)_16%,transparent),transparent_60%)]" />
      <div className="frame grid-12 min-h-[80svh] items-center gap-y-12 py-24">
        <div className="col-span-12 lg:col-span-6">
          <p className="t-meta text-moon-2">Work at {t.copy.the}?</p>
          <h2 id="close-h" className="t-mega mt-4">
            Come on up.
          </h2>
          <p className="t-lead mt-6 max-w-[34ch] text-moon/80">Sign in with your work email, and everything from the lobby to the top floor is yours to use.</p>
          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
            <ButtonLink href={gateHref("/home")} variant="light" size="lg" icon="arrow-right">
              Sign in with your work email
            </ButtonLink>
            <Link href="/venues" className="group inline-flex items-center gap-1.5 text-[0.9375rem] font-medium text-moon/75 hover:text-moon">
              Planning an event instead? See the venues
              <Icon name="arrow-right" size={16} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
        <div className="col-span-12 flex justify-center lg:col-span-5 lg:col-start-8">
          <FloorDrawing
            elevator
            className="h-[400px] w-auto max-w-none sm:h-[min(62svh,560px)]"
            list={tower}
            active={lit}
            hoverId={hoverId}
            onHover={setHoverId}
            onPick={(id) => {
              const el = document.getElementById(`at-${id}`);
              if (el) glideTo(el);
            }}
          />
        </div>
      </div>
    </section>
  );
}
