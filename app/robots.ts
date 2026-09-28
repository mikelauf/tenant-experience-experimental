import type { MetadataRoute } from "next";
import { SITE_URL, indexable } from "@/lib/site";

/** Closed to crawlers until launch; after that, everything but the API and the member app. */
export default function robots(): MetadataRoute.Robots {
  if (!indexable) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/venues/brief"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
