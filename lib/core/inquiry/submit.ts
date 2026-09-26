/** Ported from Tenant Experience (src/lib/public-venues/submit.ts). */
import type { CorePublicInquiry, InquiryInput } from "./contract.ts";

export type InquiryResult = {
  status: number;
  body: { accepted: boolean; inquiry_reference?: string; message?: string };
};

/** Dependency injection keeps the actual HTTP boundary testable without leads. */
export async function submitCoreInquiry(
  config: {
    host: string;
    apiKey: string;
    buildingId: string;
    signal?: AbortSignal;
  },
  payload: CorePublicInquiry,
  metadata: Pick<InquiryInput, "website" | "startedAt"> & {
    idempotencyKey: string;
  },
  fetcher: typeof fetch = fetch,
): Promise<InquiryResult> {
  try {
    config.signal?.throwIfAborted();
    const response = await fetcher(
      `${config.host.replace(/\/$/, "")}/public/buildings/${config.buildingId}/conference-inquiries`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": config.apiKey,
          "Idempotency-Key": metadata.idempotencyKey,
          "X-Conference-Inquiry-Website": metadata.website ?? "",
          "X-Conference-Inquiry-Started-At": metadata.startedAt,
        },
        body: JSON.stringify(payload),
        cache: "no-store",
        signal: config.signal
          ? AbortSignal.any([config.signal, AbortSignal.timeout(12000)])
          : AbortSignal.timeout(12000),
        redirect: "error",
      },
    );
    if (response.status === 202) {
      const body: unknown = await response.json();
      if (
        body &&
        typeof body === "object" &&
        "accepted" in body &&
        body.accepted === true &&
        "inquiry_reference" in body &&
        typeof body.inquiry_reference === "string" &&
        body.inquiry_reference.length > 0 &&
        body.inquiry_reference.length < 500
      ) {
        return {
          status: 202,
          body: { accepted: true, inquiry_reference: body.inquiry_reference },
        };
      }
    }
    // Release ignored error bodies without reading or retaining upstream details.
    if (!response.bodyUsed) await response.body?.cancel().catch(() => {});
    if (response.status === 429)
      return {
        status: 429,
        body: {
          accepted: false,
          message: "Please wait a moment before trying again.",
        },
      };
    if (response.status === 400 || response.status === 413)
      return {
        status: 400,
        body: {
          accepted: false,
          message:
            "We couldn’t accept this inquiry. Please check your details.",
        },
      };
  } catch {
    /* Never log payloads, upstream bodies, contact details or keys. */
  }
  return {
    status: 503,
    body: {
      accepted: false,
      message: "Your inquiry couldn’t be confirmed. Please try again.",
    },
  };
}
