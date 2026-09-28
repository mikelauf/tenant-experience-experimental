import { isDemo } from "./flags";

/**
 * The public address of this build, for absolute links (sitemap, link previews). `NEXT_PUBLIC_SITE_URL` sets it per
 * deploy; on Vercel it falls back to the project's production domain, and locally to the dev server.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3100")
).replace(/\/$/, "");

/** Indexing is opt-in: only a launched production site sets `SITE_INDEXABLE=1`. */
export const indexable = !isDemo && process.env.SITE_INDEXABLE === "1";
