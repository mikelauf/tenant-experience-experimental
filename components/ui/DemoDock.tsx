"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { Persona } from "@/lib/data/types";
import { setShape, useShape } from "@/lib/shape";
import { actions, useDemo, useHydrated } from "@/lib/store";
import { TENANTS, type TenantId } from "@/lib/tenants";
import { switchTenant, useTenant } from "@/lib/tenants/client";
import { Icon } from "./Icon";

const personas: { id: Persona; label: string; note: string }[] = [
  { id: "signed-out", label: "Signed out", note: "Browsing before sign-in" },
  { id: "new", label: "New member", note: "First week, nothing booked" },
  { id: "returning", label: "Returning", note: "Regular with plans on the books" },
];

/** Reviewer controls. Not part of the product. */
export function DemoDock() {
  const s = useDemo();
  const shape = useShape();
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
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
    window.setTimeout(() => window.location.assign(isPublic ? "/venues" : "/"), 650);
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

  return (
    <div
      ref={ref}
      className={cn(
        "fixed left-3 z-[70] lg:left-auto lg:right-5 lg:bottom-5",
        isPublic ? "bottom-3" : "bottom-[calc(var(--tab-h)+env(safe-area-inset-bottom)+10px)]",
      )}
    >
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}

            className="theme-night absolute bottom-12 left-0 w-[min(340px,calc(100vw-24px))] lg:left-auto lg:right-0 rounded-[22px] p-4 shadow-[var(--shadow-float)]"
            role="dialog"
            aria-label="Demo controls"
          >
            <p className="t-small text-moon-2">Prototype controls. Nothing here is real.</p>

            <fieldset className="mt-4">
              <legend className="t-small mb-2 font-medium">Building</legend>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.values(TENANTS).map((t) => {
                  const on = t.id === tenant.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => go(t.id)}
                      aria-pressed={on}
                      className={cn(
                        "flex items-center gap-2.5 rounded-2xl p-2.5 text-left transition-colors",
                        on ? "bg-night-3 shadow-[inset_0_0_0_1px_var(--color-night-line)]" : "hover:bg-night-2",
                      )}
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl" style={{ background: t.theme.deep }}>
                        <MarkOf id={t.id} size={20} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[0.875rem] font-medium">{t.copy.The}</span>
                        <span className="block truncate text-[0.75rem] text-moon-2">
                          {t.building.city} · {Object.values(t.building.services).filter(Boolean).length} services
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="mt-4 grid grid-cols-2 gap-1 rounded-full bg-night-3 p-1 text-[0.875rem]">
              {[
                { href: "/", label: "Member app", on: !isPublic },
                { href: "/venues", label: "Public venues", on: isPublic },
              ].map((x) => (
                <Link
                  key={x.href}
                  href={x.href}
                  onClick={() => setOpen(false)}
                  className={cn("rounded-full py-2 text-center font-medium transition-colors", x.on ? "bg-moon text-night" : "text-moon-2 hover:text-moon")}
                >
                  {x.label}
                </Link>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 px-1">
              <span className="text-[0.9375rem] font-medium">Style</span>
              <div role="radiogroup" aria-label="Corner style" className="grid grid-cols-2 gap-1 rounded-full bg-night-3 p-1 text-[0.8125rem]">
                {(
                  [
                    { id: "rounded", label: "Rounded", glyph: "rounded-[5px]" },
                    { id: "flat", label: "Flat", glyph: "" },
                  ] as const
                ).map((x) => (
                  <button
                    key={x.id}
                    role="radio"
                    aria-checked={shape === x.id}
                    onClick={() => setShape(x.id)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition-colors",
                      shape === x.id ? "bg-moon text-night" : "text-moon-2 hover:text-moon",
                    )}
                  >
                    {/* keep-round so the swatch still shows the difference once flat is on */}
                    <span aria-hidden className={cn("size-3 border-[1.5px] border-current", x.glyph && `keep-round ${x.glyph}`)} />
                    {x.label}
                  </button>
                ))}
              </div>
            </div>

            {isPublic ? (
              <>
                <div className="mt-5 rounded-2xl bg-night-2 p-4">
                  <p className="text-[0.9375rem] font-medium">No sign-in on the public site</p>
                  <p className="t-small mt-1 text-moon-2">
                    Event organizers browse venues and send an inquiry without an account, so there are no member states here. Switch to the member app to try
                    those.
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between rounded-2xl px-3 py-2.5">
                  <span>
                    <span className="block text-[0.9375rem] font-medium">Shortlist</span>
                    <span className="block text-[0.8125rem] text-moon-2">
                      {s.shortlist.length ? `${s.shortlist.length} saved · carried into the inquiry form` : "Heart a venue to save it"}
                    </span>
                  </span>
                  {s.shortlist.length > 0 && (
                    <button
                      onClick={() => s.shortlist.forEach((slug) => actions.toggleShortlist(slug))}
                      className="rounded-full border border-night-line px-3 py-1.5 text-[0.8125rem] font-medium hover:bg-night-2"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <fieldset className="mt-5">
                  <legend className="t-small mb-2 font-medium">Member state</legend>
                  <div className="flex flex-col gap-1">
                    {personas.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          actions.setPersona(p.id);
                        }}
                        aria-pressed={s.persona === p.id}
                        className={cn(
                          "flex items-center justify-between rounded-2xl px-3 py-2.5 text-left transition-colors",
                          s.persona === p.id ? "bg-night-3" : "hover:bg-night-2",
                        )}
                      >
                        <span>
                          <span className="block text-[0.9375rem] font-medium">{p.label}</span>
                          <span className="block text-[0.8125rem] text-moon-2">{p.note}</span>
                        </span>
                        <span
                          className={cn(
                            "grid size-5 place-items-center rounded-full border",
                            s.persona === p.id ? "border-accent-glow bg-accent-glow text-night" : "border-night-line",
                          )}
                        >
                          {s.persona === p.id && <Icon name="check" size={12} strokeWidth={2.5} />}
                        </span>
                      </button>
                    ))}
                  </div>
                </fieldset>

                {tenant.fitness && (
                  <label className="mt-4 flex cursor-pointer items-center justify-between rounded-2xl px-3 py-2.5 hover:bg-night-2">
                    <span>
                      <span className="block text-[0.9375rem] font-medium">Fitness membership</span>
                      <span className="block text-[0.8125rem] text-moon-2">Off shows the access-required state</span>
                    </span>
                    <input type="checkbox" className="peer sr-only" checked={s.fitnessMember} onChange={(e) => actions.setFitness(e.target.checked)} />
                    <span className="relative h-6 w-10 rounded-full bg-night-line transition-colors peer-checked:bg-accent-glow peer-focus-visible:outline-2 peer-focus-visible:outline-accent-glow after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-moon after:transition-transform peer-checked:after:translate-x-4" />
                  </label>
                )}
              </>
            )}

            <button
              onClick={() => {
                actions.reset();
                setOpen(false);
                router.push(isPublic ? "/venues" : "/");
              }}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-night-line py-2.5 text-[0.875rem] font-medium text-moon hover:bg-night-2"
            >
              <Icon name="refresh" size={16} />
              Reset demo
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>{leaving && <Switching id={leaving} />}</AnimatePresence>

      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Demo controls"
        className="flex h-10 items-center gap-2 rounded-full bg-night p-1.5 sm:pr-3.5 text-[0.8125rem] font-medium text-moon shadow-[var(--shadow-float)] transition-transform active:scale-95"
      >
        <span className="grid size-7 place-items-center rounded-full bg-accent-glow/20 text-accent-glow">
          <Icon name="sliders" size={15} />
        </span>
        <span className="hidden sm:inline">Demo</span>
        <span className="hidden text-moon-2 sm:inline">
          · {tenant.copy.The} · {isPublic ? "Public" : personas.find((p) => p.id === s.persona)?.label}
        </span>
      </button>
    </div>
  );
}

/** Any building's mark, not just the current one */
function MarkOf({ id, size }: { id: TenantId; size: number }) {
  return (
    <svg width={size * 0.62} height={size} viewBox="0 0 20 32" fill="none" aria-hidden className="text-white">
      {TENANTS[id].mark.paths.map((p) => (
        <path key={p.d} d={p.d} fill="currentColor" opacity={p.opacity} />
      ))}
    </svg>
  );
}

/** Full-screen hand-off to the next building while it loads */
function Switching({ id }: { id: TenantId }) {
  const t = TENANTS[id];
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
