/**
 * Build-time switches. The same code ships two ways:
 *
 * - Demo (default): the experimental deployment. Demo dock, member app, both buildings,
 *   simulated inquiries, and V2 sections shown with an "in progress" label.
 * - Production: `NEXT_PUBLIC_SITE_MODE=production`. Only what's real and approved.
 */
export const isDemo = process.env.NEXT_PUBLIC_SITE_MODE !== "production";

/**
 * Sections Spencer asked to keep but hide at launch until they're backed by real data
 * (floor plans from Ryan, confirmed facilities). Always on in the demo, labeled as in progress.
 * Turn them on in production with `NEXT_PUBLIC_V2_SECTIONS=1`.
 */
export const showV2 = isDemo || process.env.NEXT_PUBLIC_V2_SECTIONS === "1";
