import { toCoreInquiry, validateInquiry, venueText } from "./contract.ts";
import { submitCoreInquiry } from "./submit.ts";
import { INQUIRY_SERVER_TIMEOUT_MS } from "./timeouts.ts";

/**
 * The public inquiry HTTP pipeline, ported from Tenant Experience
 * (src/lib/public-venues/handle-inquiry.ts). The difference: where Tenant Experience read the
 * inquiry source and privacy version from an OS publication, this site reads them from the
 * building's own config, because venue content here is code, not CMS.
 *
 * Every dependency is injected so the tests run without a network or a Next request.
 */

export type InquiryTarget = {
  /** Venue slugs the form may send, besides "not-sure" */
  venues: { slug: string; name: string }[];
  /** Where Core should file it. Missing means the building isn't set up for live inquiries. */
  config?: { coreBuildingId: string; sourceKey: string; privacyVersion?: string };
  privacyUrl?: string;
};

export type InquiryEnvironment = {
  [name: string]: string | undefined;
  NODE_ENV?: string;
  CORE_HOST?: string;
  CORE_PUBLIC_API_KEY?: string;
  /** "live" sends to Core. Anything else accepts the inquiry as a simulation and sends nothing. */
  PUBLIC_INQUIRY_MODE?: string;
};

type Dependencies = {
  getTarget: () => Promise<InquiryTarget>;
  environment: InquiryEnvironment;
  fetcher?: typeof fetch;
};

/** Every inquiry response, including failures, must bypass shared caches. */
const json = (body: unknown, status: number) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

const unavailable = () => json({ accepted: false, message: "Inquiries are temporarily unavailable." }, 503);

/** Browser posts must come from this exact origin, including the port. Never accept Origin: null. */
export function isSameSiteOrigin(origin: string | null, authority: string | null, development: boolean): boolean {
  if (!origin || !authority || authority.includes(",")) return false;
  try {
    const url = new URL(origin);
    return (
      url.origin === origin &&
      url.host === authority.trim().toLowerCase() &&
      (url.protocol === "https:" || (development && url.protocol === "http:"))
    );
  } catch {
    return false;
  }
}

/** True when the route should actually send to Core. */
export const isLiveInquiry = (environment: InquiryEnvironment) => environment.PUBLIC_INQUIRY_MODE === "live";

export async function handlePublicInquiry(request: Request, dependencies: Dependencies) {
  const { environment } = dependencies;
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(INQUIRY_SERVER_TIMEOUT_MS)]);

  // Host headers must not supply both sides of this comparison.
  const authority = new URL(request.url).host;
  if (!isSameSiteOrigin(request.headers.get("origin"), authority, environment.NODE_ENV === "development")) return json({ accepted: false }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return json({ accepted: false }, 415);
  const idempotencyKey = request.headers.get("Idempotency-Key");
  if (!idempotencyKey || !/^[0-9a-f-]{36}$/i.test(idempotencyKey)) return json({ accepted: false, message: "Refresh the page and try again." }, 400);

  // Bound the stream itself; Content-Length can be missing or forged.
  const reader = request.body?.getReader();
  if (!reader) return json({ accepted: false }, 400);
  let length = 0;
  const chunks: Uint8Array[] = [];
  const cancelBody = () => {
    void reader.cancel().catch(() => {});
  };
  signal.addEventListener("abort", cancelBody, { once: true });
  try {
    signal.throwIfAborted();
    for (;;) {
      const { done, value } = await reader.read();
      signal.throwIfAborted();
      if (done) break;
      length += value.byteLength;
      if (length > 16384) {
        await reader.cancel();
        return json({ accepted: false, message: "Please shorten your inquiry." }, 413);
      }
      chunks.push(value);
    }
  } catch {
    return json({ accepted: false, message: "Your inquiry couldn’t be confirmed. Please try again." }, 503);
  } finally {
    signal.removeEventListener("abort", cancelBody);
    reader.releaseLock();
  }

  let value: unknown;
  try {
    value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return json({ accepted: false }, 400);
  }

  let target: InquiryTarget;
  try {
    target = await dependencies.getTarget();
  } catch {
    return unavailable();
  }
  const { input, errors } = validateInquiry(
    value,
    target.venues.map((v) => v.slug),
  );
  if (!input) return json({ accepted: false, errors }, 400);

  // Simulation: everything above ran for real, nothing leaves this server.
  if (!isLiveInquiry(environment)) {
    return json({ accepted: true, inquiry_reference: `PREVIEW-${idempotencyKey.slice(0, 8).toUpperCase()}`, preview: true }, 202);
  }

  const host = environment.CORE_HOST?.trim();
  const apiKey = environment.CORE_PUBLIC_API_KEY?.trim();
  const config = target.config;
  if (!host || !apiKey || !config?.sourceKey || !config.privacyVersion || !target.privacyUrl) return unavailable();

  // The page rendered one privacy version; if it changed since, the visitor must see the new one first.
  if (!value || typeof value !== "object" || (value as Record<string, unknown>).privacyVersion !== config.privacyVersion) {
    return json({ accepted: false, message: "The privacy policy has changed. Refresh this page and review it before submitting." }, 409);
  }

  const venueName = venueText(input.venues, target.venues);
  const result = await submitCoreInquiry(
    { host, apiKey, buildingId: config.coreBuildingId, signal },
    toCoreInquiry(input, venueName, { sourceKey: config.sourceKey, privacyPolicyVersion: config.privacyVersion }),
    { website: input.website, startedAt: input.startedAt, idempotencyKey },
    dependencies.fetcher,
  );
  return json(result.body, result.status);
}

/**
 * What still stands between this deploy and real inquiries, in words for a deploy log. Empty means inquiries go to Core.
 * A production site that isn't ready still takes inquiries, but only as a simulation ("Preview complete"), or not at all.
 */
export function inquiryGaps(environment: InquiryEnvironment, target: Pick<InquiryTarget, "config" | "privacyUrl">): string[] {
  const gaps: string[] = [];
  if (!isLiveInquiry(environment)) gaps.push("PUBLIC_INQUIRY_MODE isn't \"live\", so every inquiry is a simulation and nothing reaches the events team");
  if (!environment.CORE_HOST?.trim()) gaps.push("CORE_HOST is missing");
  if (!environment.CORE_PUBLIC_API_KEY?.trim()) gaps.push("CORE_PUBLIC_API_KEY is missing");
  if (!target.config?.sourceKey || !target.config.coreBuildingId) gaps.push("the building has no Core inquiry config");
  else if (!target.config.privacyVersion) gaps.push("the building's inquiry.privacyVersion isn't set (the TAP inquiry source isn't published yet)");
  if (!target.privacyUrl) gaps.push("the building has no privacy policy link");
  return gaps;
}
