import Link from "next/link";
import { building } from "@/lib/data/building";
import { Mark, PoweredBy } from "./Logo";

export function Footer({ variant }: { variant: "member" | "public" }) {
  const links =
    variant === "member"
      ? [
          { href: "/spaces", label: "Meeting rooms" },
          { href: "/spaces/plan-an-event", label: "Plan an event" },
          { href: "/fitness", label: "Pyramid Fitness" },
          { href: "/programming", label: "Events" },
          { href: "/plans", label: "Your plans" },
          { href: "/venues", label: "Public venues site" },
        ]
      : [
          { href: "/venues#collection", label: "All venues" },
          { href: "/venues/bay-lounge", label: "Bay Lounge" },
          { href: "/venues/redwood-park", label: "Redwood Park" },
          { href: "/venues/montgomery-hall", label: "Montgomery Hall" },
          { href: "/venues/inquire", label: "Start an inquiry" },
          { href: "/", label: "Work here? Member site" },
        ];

  return (
    <footer className={`theme-night relative overflow-hidden ${variant === "member" ? "max-lg:pb-[calc(var(--tab-h)+env(safe-area-inset-bottom))]" : ""}`}>
      <div className="frame grid-12 gap-y-12 pb-10 pt-20 lg:pt-28">
        <div className="col-span-12 lg:col-span-5">
          <Mark size={40} className="text-moon" />
          <p className="t-h2 mt-8 max-w-[18ch]">
            {variant === "member" ? "The concierge desk is on L1, and always happy to help." : "Tell us about your event. We'll take it from there."}
          </p>
        </div>
        <div className="col-span-6 lg:col-span-3 lg:col-start-7">
          <p className="t-meta mb-4">Concierge</p>
          <ul className="t-body space-y-1.5">
            <li>{building.concierge.phone}</li>
            <li>{building.concierge.email}</li>
            <li className="text-moon-2">{building.concierge.hours}</li>
          </ul>
        </div>
        <nav className="col-span-6 lg:col-span-3" aria-label="Footer">
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
          The Pyramid
        </p>
      </div>
      <div className="frame flex flex-col gap-3 border-t hairline py-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="t-meta">
          {building.address}, {building.city} · A design prototype. Venues, schedules and people are sample content.
        </p>
        <PoweredBy className="text-moon" />
      </div>
    </footer>
  );
}
