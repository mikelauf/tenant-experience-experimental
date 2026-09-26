import { handlePublicInquiry } from "@/lib/core/inquiry/handle";
import { getTenant } from "@/lib/tenants/server";

/** Public venue inquiries. Simulated unless PUBLIC_INQUIRY_MODE=live; see lib/core/inquiry/handle.ts. */
export async function POST(request: Request) {
  return handlePublicInquiry(request, {
    getTarget: async () => {
      const t = await getTenant();
      return { venues: t.venues.map(({ slug, name }) => ({ slug, name })), config: t.inquiry, privacyUrl: t.copy.public.privacyUrl };
    },
    environment: process.env,
  });
}
