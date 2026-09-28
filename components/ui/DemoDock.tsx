"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { Persona } from "@/lib/data/types";
import { setShape, useShape } from "@/lib/shape";
import { actions, useDemo, useHydrated } from "@/lib/store";
import { DEFAULT_TENANT, tenantById, type TenantId } from "@/lib/tenants";
import { switchTenant, useTenant } from "@/lib/tenants/client";
import { Icon } from "./Icon";

const personas: { id: Persona; label: string; note: string; main: boolean }[] = [
  { id: "signed-out", label: "Signed out", note: "Hasn't signed in yet", main: true },
  { id: "new", label: "New member", note: "Just verified, nothing booked", main: true },
  { id: "returning", label: "Returning", note: "A regular, with plans on the books", main: true },
  { id: "public", label: "Public account", note: "Inquired about a venue; no work email", main: false },
  { id: "verifying", label: "Verifying", note: "Work email under review", main: false },
];

const sites = [
  { id: "venues", href: "/venues", label: "Public venues", note: "What anyone planning an event sees. No sign-in." },
  { id: "member", href: "/home", label: "Member app", note: "What people who work in the building see." },
] as const;

/**
 * Reviewer controls, not part of the product. One choice first (which site), then only what changes that site:
 * who's looking and their fitness membership in the member app, the saved venues on the public site.
 */
export function DemoDock() {
  const s = useDemo();
  const shape = useShape();
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const path = usePathname();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const isPublic = path.startsWith("/venues");
  const tenant = useTenant();
  const [leaving, setLeaving] = useState<TenantId | null>(null);

  // Swap buildings: set the cookie the server reads, cover the page with the next building's mark, then load it fresh
  const go = (id: TenantId) => {
    if (id === tenant.id) return;
    switchTenant(id);
    setOpen(false);
    setLeaving(id);
    window.setTimeout(() => window.location.assign(isPublic ? "/venues" : "/home"), 650);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!hydrated) return null;

  const persona = personas.find((p) => p.id === s.persona)!;
  const member = s.persona === "new" || s.persona === "returning";
  // The two rarer states open their drawer when one of them is the one showing
  const showMore = moreOpen || !persona.main;
  const pill = isPublic
    ? "Public venues"
    : `Member app · ${persona.label}${member && tenant.fitness && s.fitnessMember ? " · Fitness" : ""}`;

  const choice = (p: (typeof personas)[number]) => {
    const on = s.persona === p.id;
    return (
      <button
        key={p.id}
        onClick={() => actions.setPersona(p.id)}
        aria-pressed={on}
        className={cn("flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors", on ? "bg-night-3" : "hover:bg-night-2")}
      >
        <span>
          <span className="block text-[0.9375rem] font-medium">{p.label}</span>
          <span className="block text-[0.8125rem] text-moon-2">{p.note}</span>
        </span>
        <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border", on ? "border-accent-glow bg-accent-glow text-night" : "border-night-line")}>
          {on && <Icon name="check" size={12} strokeWidth={2.5} />}
        </span>
      </button>
    );
  };

  return (
    <div
      data-noprint
      ref={ref}
      className={cn(
        "fixed z-[70]",
        // The same dock on every page, member app or public venues
        isPublic
          ? "bottom-[calc(env(safe-area-inset-bottom)+12px)] left-3 lg:bottom-5 lg:left-5"
          : "left-3 bottom-[calc(var(--tab-h)+env(safe-area-inset-bottom)+10px)] lg:left-5 lg:bottom-5",
      )}
    >
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            data-lenis-prevent
            className={cn(
              "theme-night absolute w-[min(360px,calc(100vw-24px))] rounded-[22px] p-4 shadow-[var(--shadow-float)]",
              "bottom-12 left-0 max-h-[calc(100svh-120px)] overflow-y-auto",
            )}
            role="dialog"
            aria-label="Demo controls"
          >
            <p className="font-medium">Demo controls</p>
            <p className="t-small mt-0.5 text-moon-2">Switch what you&apos;re looking at. Nothing here is real.</p>

            {/* Only reachable if a browser still carries the sample building from before it left the dock */}
            {tenant.id !== DEFAULT_TENANT && (
              <button
                onClick={() => go(DEFAULT_TENANT)}
                className="mt-4 flex w-full items-center justify-between gap-3 rounded-2xl bg-night-3 px-3 py-2.5 text-left text-[0.8125rem] hover:bg-night-2"
              >
                <span className="text-moon-2">
                  You&apos;re viewing {tenant.copy.The} (a sample building).
                </span>
                <span className="shrink-0 font-medium text-moon">Back to the Pyramid</span>
              </button>
            )}

            <fieldset className="mt-4">
              <legend className="t-small mb-2 font-medium text-moon-2">Which site</legend>
              <div className="grid grid-cols-2 gap-1.5">
                {sites.map((x) => {
                  const on = x.id === "venues" ? isPublic : !isPublic;
                  return (
                    <Link
                      key={x.id}
                      href={x.href}
                      aria-current={on ? "page" : undefined}
                      className={cn(
                        "rounded-2xl p-3 transition-colors",
                        on ? "bg-moon text-night" : "bg-night-2 text-moon hover:bg-night-3",
                      )}
                    >
                      <span className="block text-[0.9375rem] font-medium">{x.label}</span>
                      <span className={cn("mt-0.5 block text-[0.75rem] leading-snug", on ? "text-night/70" : "text-moon-2")}>{x.note}</span>
                    </Link>
                  );
                })}
              </div>
            </fieldset>

            {!isPublic && (
              <>
                <fieldset className="mt-5">
                  <legend className="t-small mb-2 font-medium text-moon-2">Who&apos;s looking?</legend>
                  <div className="flex flex-col gap-1">{personas.filter((p) => p.main).map(choice)}</div>
                  <button
                    onClick={() => setMoreOpen((o) => !o)}
                    aria-expanded={showMore}
                    className="mt-1 flex w-full items-center gap-1.5 px-3 py-2 text-[0.8125rem] font-medium text-moon-2 hover:text-moon"
                  >
                    <Icon name="chevron-down" size={14} className={cn("transition-transform", showMore && "rotate-180")} />
                    More states
                  </button>
                  {showMore && <div className="flex flex-col gap-1">{personas.filter((p) => !p.main).map(choice)}</div>}
                </fieldset>

                {tenant.fitness && (
                  <label
                    className={cn(
                      "mt-3 flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5",
                      member ? "cursor-pointer hover:bg-night-2" : "cursor-not-allowed opacity-50",
                    )}
                  >
                    <span>
                      <span className="block text-[0.9375rem] font-medium">Has the fitness membership</span>
                      <span className="block text-[0.8125rem] text-moon-2">
                        {member ? "On: can reserve classes. Off: asked to join first." : "Sign in as a member to change this"}
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      role="switch"
                      className="peer sr-only"
                      disabled={!member}
                      checked={member && s.fitnessMember}
                      onChange={(e) => actions.setFitness(e.target.checked)}
                    />
                    <span className="relative h-6 w-10 shrink-0 rounded-full bg-night-line transition-colors peer-checked:bg-accent-glow peer-focus-visible:outline-2 peer-focus-visible:outline-accent-glow after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-moon after:transition-transform peer-checked:after:translate-x-4" />
                  </label>
                )}
              </>
            )}

            {isPublic && (
              <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-night-2 px-3 py-2.5">
                <span>
                  <span className="block text-[0.9375rem] font-medium">Saved venues</span>
                  <span className="block text-[0.8125rem] text-moon-2">
                    {s.shortlist.length ? `${s.shortlist.length} saved, carried into the inquiry` : "Tap the heart on a venue to save it"}
                  </span>
                </span>
                {s.shortlist.length > 0 && (
                  <button
                    onClick={() => actions.clearShortlist()}
                    className="shrink-0 rounded-full border border-night-line px-3 py-1.5 text-[0.8125rem] font-medium hover:bg-night-3"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}

            {/* The small print: corner style and a clean slate */}
            <div className="mt-5 flex items-center justify-between gap-3 border-t border-night-line pt-3.5">
              <div role="radiogroup" aria-label="Corner style" className="flex items-center gap-1 rounded-full bg-night-3 p-1 text-[0.75rem]">
                {(
                  [
                    { id: "rounded", label: "Rounded", glyph: "rounded-[4px]" },
                    { id: "flat", label: "Flat", glyph: "" },
                  ] as const
                ).map((x) => (
                  <button
                    key={x.id}
                    role="radio"
                    aria-checked={shape === x.id}
                    onClick={() => setShape(x.id)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium transition-colors",
                      shape === x.id ? "bg-moon text-night" : "text-moon-2 hover:text-moon",
                    )}
                  >
                    {/* keep-round so the swatch still shows the difference once flat is on */}
                    <span aria-hidden className={cn("size-2.5 border-[1.5px] border-current", x.glyph && `keep-round ${x.glyph}`)} />
                    {x.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  actions.reset();
                  setOpen(false);
                  router.push(isPublic ? "/venues" : "/home");
                }}
                className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-moon-2 hover:text-moon"
              >
                <Icon name="refresh" size={14} />
                Reset demo
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>{leaving && <Switching id={leaving} />}</AnimatePresence>

      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`Demo controls: ${pill}`}
        className={cn(
          "group flex h-10 items-center gap-2 bg-night p-1.5 text-[0.8125rem] font-medium text-moon shadow-[var(--shadow-float)] transition-transform active:scale-95",
          "rounded-full sm:pr-3.5",
        )}
      >
        <span className="grid size-7 place-items-center rounded-full bg-accent-glow/20 text-accent-glow">
          <Icon name="sliders" size={15} />
        </span>
        <span className="hidden sm:inline">Demo</span>
        <span className="hidden text-moon-2 sm:inline">· {pill}</span>
      </button>
    </div>
  );
}

/** Any building's mark, not just the current one */
function MarkOf({ id, size }: { id: TenantId; size: number }) {
  return (
    <svg width={size * 0.62} height={size} viewBox="0 0 20 32" fill="none" aria-hidden className="text-white">
      {tenantById(id).mark.paths.map((p) => (
        <path key={p.d} d={p.d} fill="currentColor" opacity={p.opacity} />
      ))}
    </svg>
  );
}

/** Full-screen hand-off to the next building while it loads */
function Switching({ id }: { id: TenantId }) {
  const t = tenantById(id);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[200] grid place-items-center"
      style={{ background: `radial-gradient(120% 90% at 50% 0%, ${t.theme.deep} 0%, #0b0e12 70%)` }}
      role="status"
      aria-live="polite"
    >
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.12, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center gap-6 text-center text-white"
      >
        <MarkOf id={id} size={72} />
        <div>
          <p className="t-h2">{t.building.name}</p>
          <p className="t-meta mt-2 text-white/60">{t.building.city} · Experience by Playbook</p>
        </div>
      </motion.div>
    </motion.div>
  );
}
