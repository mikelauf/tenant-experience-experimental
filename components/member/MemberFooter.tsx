import Link from "next/link";
import { isDemo } from "@/lib/flags";
import { getTenant } from "@/lib/tenants/server";
import { Mark, PoweredBy } from "@/components/ui/Logo";

/**
 * The member app's footer: the building and its concierge, then the three places things get done (spaces, fitness,
 * events), each only when the building has it. It never links to the public venue site, a separate product.
 */
export async function MemberFooter() {
  const t = await getTenant();
  const { building, copy } = t;
  const on = building.services;
  const columns = [
    on.spaces && {
      title: "Spaces",
      links: [
        { href: "/spaces", label: "Book a meeting room" },
        { href: "/spaces/plan-an-event", label: "Plan an event" },
      ],
    },
    t.fitness && {
      title: "Fitness",
      links: [
        { href: "/fitness", label: t.fitness.name },
        { href: "/fitness/schedule", label: "Class schedule" },
      ],
    },
    on.programming && {
      title: "Events",
      links: [{ href: "/programming", label: "What's on" }],
    },
  ].filter((c): c is { title: string; links: { href: string; label: string }[] } => !!c);

  return (
    <footer data-noprint className="theme-night relative overflow-hidden max-lg:pb-[calc(var(--tab-h)+env(safe-area-inset-bottom))]">
      <div className="frame grid-12 gap-y-12 pb-12 pt-20 lg:pt-24">
        <div className="col-span-12 lg:col-span-5">
          <Mark size={32} className="text-moon" />
          <p className="t-h3 mt-6">{building.name}</p>
          <p className="t-small mt-1 text-moon-2">
            {building.address}, {building.city}
          </p>
          <div className="t-small mt-8 text-moon/80">
            <p className="t-meta mb-2">Concierge, {copy.concierge}</p>
            <p>
              {building.concierge.phone} · {building.concierge.email}
            </p>
            <p className="text-moon-2">{building.concierge.hours}</p>
          </div>
        </div>
        {columns.map((c, i) => (
          <nav key={c.title} className={`col-span-6 sm:col-span-4 lg:col-span-2 ${i === 0 ? "lg:col-start-7" : ""}`} aria-label={c.title}>
            <p className="t-meta mb-4">{c.title}</p>
            <ul className="t-small space-y-2.5">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-moon/80 transition-colors hover:text-moon">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="frame overflow-hidden pb-[0.12em] text-[clamp(3.5rem,14.5vw,15rem)]">
        {/* Pure decoration, drawn from CSS content so it isn't read out or held to text contrast */}
        <p
          aria-hidden
          data-text={copy.The}
          className="t-mega select-none whitespace-nowrap text-[length:inherit] leading-[0.9] text-night-3 before:content-[attr(data-text)]"
        />
      </div>
      <div className="frame flex flex-col gap-3 border-t hairline py-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="t-meta">{isDemo ? "A design prototype. Schedules and people are sample content." : `© ${building.name}`}</p>
        <PoweredBy className="text-moon" />
      </div>
    </footer>
  );
}
