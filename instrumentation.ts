/**
 * Server start. A production build checks that its inquiries really reach Core and says plainly in the deploy log
 * when they don't, rather than letting visitors fill in four steps that go nowhere.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PUBLIC_SITE_MODE !== "production") return;
  const { inquiryGaps } = await import("@/lib/core/inquiry/handle");
  const { TENANTS } = await import("@/lib/tenants");
  for (const t of Object.values(TENANTS)) {
    if (!t) continue;
    const gaps = inquiryGaps(process.env, { config: t.inquiry, privacyUrl: t.copy.public.privacyUrl });
    if (gaps.length) console.warn(`[inquiries] ${t.building.name} isn't sending real inquiries yet:\n  - ${gaps.join("\n  - ")}`);
  }
}
