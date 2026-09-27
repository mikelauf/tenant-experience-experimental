"use client";

import Link from "next/link";
import { useDemo } from "@/lib/store";
import { useTenant } from "@/lib/tenants/client";
import { Icon } from "@/components/ui/Icon";
import Image from "@/components/ui/SmoothImage";

const fmtDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
const ago = (iso: string) => {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 864e5);
  return days <= 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
};

/**
 * The Public Customer Activity Center (Wayfinder #298): one place per building for what someone has going on here as
 * a member of the public. An inquiry is a conversation, not a booking, until the team sends a proposal (#304).
 * Sections with nothing in them don't show.
 */
export function ActivityCenter() {
  const s = useDemo();
  const t = useTenant();
  if (!s.inquiries.length) return null;
  return (
    <div className="mt-8 rounded-[var(--radius-card)] bg-white/[0.06] p-5 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)] backdrop-blur-md">
      <p className="t-meta text-moon-2">Your event inquiries</p>
      <ul className="mt-3 space-y-3">
        {s.inquiries.map((q) => {
          const v = t.venue(q.venue);
          return (
            <li key={q.id}>
              <Link href={v ? `/venues/${v.slug}` : "/venues"} className="group flex items-center gap-4">
                {v && (
                  <span className="media relative size-14 shrink-0 overflow-hidden">
                    <Image src={v.hero.src} alt="" fill sizes="56px" className="object-cover" style={{ objectPosition: v.hero.pos }} />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-moon">
                    {q.eventType ?? "Event"} at {v?.name ?? "the Pyramid"}
                  </span>
                  <span className="t-small block text-moon-2">
                    {[q.date && fmtDate(q.date), q.guests && `${q.guests} guests`].filter(Boolean).join(" · ")}
                  </span>
                  <span className="t-small mt-1 flex items-center gap-1.5 text-moon/80">
                    <span className="keep-round size-1.5 rounded-full bg-[#f0c77e]" aria-hidden />
                    Sent {ago(q.createdAt)}. The events team replies with a proposal.
                  </span>
                </span>
                <Icon name="arrow-right" size={16} className="shrink-0 text-moon-2 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
