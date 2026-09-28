import type { MetadataRoute } from "next";
import { TENANTS } from "@/lib/tenants";
import { SITE_URL } from "@/lib/site";

/** The public venue site: the home, every venue, the questions and the inquiry. (Briefs are private links, so they're left out.) */
export default function sitemap(): MetadataRoute.Sitemap {
  const t = Object.values(TENANTS)[0]!;
  return [
    { url: `${SITE_URL}/venues`, priority: 1 },
    ...t.venues.map((v) => ({ url: `${SITE_URL}/venues/${v.slug}`, priority: 0.8 })),
    ...(t.copy.public.faq?.length ? [{ url: `${SITE_URL}/venues/faq`, priority: 0.5 }] : []),
    { url: `${SITE_URL}/venues/inquire`, priority: 0.6 },
  ];
}
