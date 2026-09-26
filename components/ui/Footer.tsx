import Link from "next/link";
import { isDemo } from "@/lib/flags";
import { getTenant } from "@/lib/tenants/server";
import { Mark, PoweredBy } from "./Logo";

export async function Footer({ variant }: { variant: "member" | "public" }) {
  const t = await getTenant();
  const { building, copy } = t;
  const on = building.services;
  const links =
    variant === "member"
      ? [
          ...(on.spaces
            ? [
                { href: "/spaces", label: "Meeting rooms" },
                { href: "/spaces/plan-an-event", label: "Plan an event" },
              ]
            : []),
          ...(t.fitness ? [{ href: "/fitness", label: t.fitness.name }] : []),
          ...(on.programming ? [{ href: "/programming", label: "Events" }] : []),
          { href: "/plans", label: "Your plans" },
          { href: "/venues", label: "Public venues site" },
        ]
      : [
          { href: "/venues#collection", label: "All venues" },
          ...t.venues.map((v) => ({ href: `/venues/${v.slug}`, label: v.name })),
          { href: "/venues/inquire", label: "Start an inquiry" },
          ...(copy.public.faq?.length ? [{ href: "/venues/faq", label: "Questions & answers" }] : []),
          ...(isDemo ? [{ href: "/", label: "Work here? Member site" }] : []),
        ];
  // The member footer shows the concierge desk; the public one only shows a confirmed events contact.
  const contact =
    variant === "member"
      ? { title: "Concierge", lines: [building.concierge.phone, building.concierge.email, building.concierge.hours] }
      : copy.public.contact
        ? { title: "Events team", lines: [copy.public.contact.phone, copy.public.contact.email].filter((x): x is string => !!x) }
        : null;

  return (
    <footer className={`theme-night relative overflow-hidden ${variant === "member" ? "max-lg:pb-[calc(var(--tab-h)+env(safe-area-inset-bottom))]" : ""}`}>
      <div className="frame grid-12 gap-y-12 pb-10 pt-20 lg:pt-28">
        <div className="col-span-12 lg:col-span-5">
          <Mark size={40} className="text-moon" />
          <p className="t-h2 mt-8 max-w-[18ch]">
            {variant === "member"
              ? `The concierge desk is on ${copy.concierge}, and always happy to help.`
              : "Tell us about your event. We'll take it from there."}
          </p>
        </div>
        {contact && (
          <div className="col-span-6 lg:col-span-3 lg:col-start-7">
            <p className="t-meta mb-4">{contact.title}</p>
            <ul className="t-body space-y-1.5">
              {contact.lines.map((l, i) => (
                <li key={l} className={i === 2 ? "text-moon-2" : undefined}>
                  {l}
                </li>
              ))}
            </ul>
          </div>
        )}
        <nav className={`col-span-6 lg:col-span-3 ${contact ? "" : "lg:col-start-10"}`} aria-label="Footer">
          <p className="t-meta mb-4">Explore</p>
          <ul className="t-body space-y-1.5">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="transition-colors hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="frame overflow-hidden pb-[0.12em] text-[clamp(3.5rem,14.5vw,15rem)]">
        <p aria-hidden className="t-mega select-none whitespace-nowrap text-[length:inherit] leading-[0.9] text-night-3">
          {copy.The}
        </p>
      </div>
      <div className="frame flex flex-col gap-3 border-t hairline py-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="t-meta">
          {building.address}, {building.city}
          {isDemo && (variant === "member" ? " · A design prototype. Schedules and people are sample content." : " · Demo build")}
          {variant === "public" && copy.public.privacyUrl && (
            <>
              {" · "}
              <a href={copy.public.privacyUrl} className="underline-offset-2 hover:underline">
                Privacy
              </a>
            </>
          )}
        </p>
        <PoweredBy className="text-moon" />
      </div>
    </footer>
  );
}
