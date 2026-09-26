import { strict as assert } from "node:assert";
import { test } from "node:test";
import { handlePublicInquiry, type InquiryEnvironment, type InquiryTarget } from "./handle.ts";

/** Adapted from Tenant Experience's handle-inquiry.test.ts for config-driven buildings. */

const host = "public-tap.playbookexp.com";
const key = "beff053f-5857-47d6-b438-e7e6c0c13166";
const input = {
  firstName: "Test",
  lastName: "Visitor",
  email: "visitor@example.com",
  venues: ["bay-lounge"],
  date: "2026-11-12",
  guests: "80",
  privacy: true,
  marketing: false,
  startedAt: "2026-09-16T12:00:00.000Z",
  privacyVersion: "test-policy",
};
const target: InquiryTarget = {
  venues: [
    { slug: "bay-lounge", name: "Bay Lounge" },
    { slug: "sky-bar", name: "Sky Bar" },
  ],
  config: { coreBuildingId: "768ca2ed-d07b-4b3c-adec-41ad66a83334", sourceKey: "web_inquiry", privacyVersion: "test-policy" },
  privacyUrl: "https://example.com/privacy",
};
const live: InquiryEnvironment = {
  NODE_ENV: "production",
  PUBLIC_INQUIRY_MODE: "live",
  CORE_HOST: "https://core-staging.playbookexp.com/",
  CORE_PUBLIC_API_KEY: "server-secret",
};

/** An ordinary same-origin request with a stable retry key. */
function request(body: unknown = input, headers: Record<string, string> = {}, url = `https://${host}/api/inquiries`) {
  return new Request(url, {
    method: "POST",
    headers: { host, origin: `https://${host}`, "content-type": "application/json", "idempotency-key": key, ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

/** Isolate the HTTP pipeline from the building registry and Core writes. */
function harness(environment: InquiryEnvironment = live) {
  const writes: { url: string; headers: Headers; body: unknown }[] = [];
  let reads = 0;
  const dependencies = {
    getTarget: async (): Promise<InquiryTarget> => {
      reads++;
      return structuredClone(target);
    },
    environment: { ...environment },
    fetcher: (async (url, options) => {
      writes.push({ url: String(url), headers: new Headers(options?.headers), body: JSON.parse(String(options?.body)) });
      assert.equal(options?.redirect, "error");
      assert.equal(options?.cache, "no-store");
      return Response.json({ accepted: true, inquiry_reference: "inqref_test" }, { status: 202 });
    }) as typeof fetch,
  };
  return {
    dependencies,
    writes,
    get reads() {
      return reads;
    },
  };
}

test("live inquiry and identical replay reach the building's Core source with the same key", async () => {
  const h = harness();
  for (let i = 0; i < 2; i++) {
    const response = await handlePublicInquiry(request(), h.dependencies);
    assert.equal(response.status, 202);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), { accepted: true, inquiry_reference: "inqref_test" });
  }
  assert.equal(h.writes.length, 2);
  for (const write of h.writes) {
    assert.equal(write.url, "https://core-staging.playbookexp.com/public/buildings/768ca2ed-d07b-4b3c-adec-41ad66a83334/conference-inquiries");
    assert.equal(write.headers.get("x-api-key"), "server-secret");
    assert.equal(write.headers.get("idempotency-key"), key);
    assert.equal(write.headers.get("x-conference-inquiry-started-at"), input.startedAt);
    assert.deepEqual(write.body, {
      contact: { first_name: "Test", last_name: "Visitor", email: "visitor@example.com" },
      source_key: "web_inquiry",
      booking: { requested_venue_text: "Bay Lounge", requested_date_text: "2026-11-12", attendee_count_min: 80, attendee_count_max: 80 },
      responses: {},
      consent: { privacy_policy_version: "test-policy", marketing_opt_in: false },
    });
  }
});

test("not sure yet is filed without a venue", async () => {
  const h = harness();
  assert.equal((await handlePublicInquiry(request({ ...input, venues: ["not-sure"] }), h.dependencies)).status, 202);
  assert.equal((h.writes[0].body as { booking: { requested_venue_text: string } }).booking.requested_venue_text, "Not sure yet");
});

test("several venues reach Core as one joined venue text", async () => {
  const h = harness();
  assert.equal((await handlePublicInquiry(request({ ...input, venues: ["sky-bar", "bay-lounge"] }), h.dependencies)).status, 202);
  assert.equal((h.writes[0].body as { booking: { requested_venue_text: string } }).booking.requested_venue_text, "Sky Bar, Bay Lounge");
});

test("simulation is the default: valid inquiries are accepted as previews and nothing is sent", async () => {
  for (const mode of [undefined, "", "simulate", "LIVE"]) {
    const h = harness({ ...live, PUBLIC_INQUIRY_MODE: mode });
    const response = await handlePublicInquiry(request(), h.dependencies);
    assert.equal(response.status, 202);
    assert.deepEqual(await response.json(), { accepted: true, inquiry_reference: "PREVIEW-BEFF053F", preview: true });
    assert.equal(h.writes.length, 0);
  }
});

test("simulation still validates", async () => {
  const h = harness({ NODE_ENV: "production" });
  assert.equal((await handlePublicInquiry(request({ ...input, email: "nope" }), h.dependencies)).status, 400);
  assert.equal(h.writes.length, 0);
});

test("invalid origin, media type, retry key, JSON and oversized body never reach Core or the registry", async () => {
  for (const [req, status] of [
    [request(input, { origin: "https://untrusted.example" }), 403],
    [request(input, { origin: "null" }), 403],
    [request(input, { origin: `http://${host}` }), 403],
    [request(input, { "content-type": "text/plain" }), 415],
    [request(input, { "idempotency-key": "" }), 400],
    [request(input, { "idempotency-key": "not-a-uuid" }), 400],
    [request("{"), 400],
    [request("x".repeat(16385), { "content-length": "1" }), 413],
  ] as const) {
    const h = harness();
    assert.equal((await handlePublicInquiry(req, h.dependencies)).status, status);
    assert.equal(h.writes.length, 0);
    assert.equal(h.reads, 0);
  }
});

test("matching spoofed host headers cannot override the request URL authority", async () => {
  const variants: Record<string, string>[] = [
    { "x-forwarded-host": "evil.example", origin: "https://evil.example" },
    { host: "evil.example", origin: "https://evil.example" },
    { "x-forwarded-host": `${host}:8443`, origin: `https://${host}:8443` },
  ];
  for (const headers of variants) {
    const h = harness();
    const response = await handlePublicInquiry(request(input, headers), h.dependencies);
    assert.equal(response.status, 403);
    assert.equal(h.writes.length, 0);
  }
});

test("plain http origins are only allowed in development", async () => {
  const url = "http://localhost:3100/api/inquiries";
  const h = harness({ ...live, NODE_ENV: "development" });
  assert.equal((await handlePublicInquiry(request(input, { origin: "http://localhost:3100" }, url), h.dependencies)).status, 202);
  const p = harness();
  assert.equal((await handlePublicInquiry(request(input, { origin: "http://localhost:3100" }, url), p.dependencies)).status, 403);
});

test("missing Core host, key, source, privacy version or policy link fail closed in live mode", async () => {
  const variants: [Partial<InquiryEnvironment>, Partial<InquiryTarget>][] = [
    [{ CORE_HOST: "" }, {}],
    [{ CORE_PUBLIC_API_KEY: " " }, {}],
    [{}, { config: undefined }],
    [{}, { config: { ...target.config!, privacyVersion: undefined } }],
    [{}, { config: { ...target.config!, sourceKey: "" } }],
    [{}, { privacyUrl: undefined }],
  ];
  for (const [env, t] of variants) {
    const h = harness({ ...live, ...env });
    h.dependencies.getTarget = async () => ({ ...structuredClone(target), ...t });
    const response = await handlePublicInquiry(request(), h.dependencies);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { accepted: false, message: "Inquiries are temporarily unavailable." });
    assert.equal(h.writes.length, 0);
  }
});

test("a failing registry returns a private, non-cacheable 503", async () => {
  const h = harness();
  h.dependencies.getTarget = async () => {
    throw new Error("Private detail: server-secret visitor@example.com");
  };
  const response = await handlePublicInquiry(request(), h.dependencies);
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(JSON.stringify(await response.json()).includes("server-secret"), false);
  assert.equal(h.writes.length, 0);
});

test("stale policy and unlisted venues are rejected before submission", async () => {
  for (const [body, status] of [
    [{ ...input, privacyVersion: "old" }, 409],
    [{ ...input, privacyVersion: undefined }, 409],
    [{ ...input, venues: ["montgomery-hall"] }, 400],
    [{ ...input, date: "" }, 400],
    [{ ...input, privacy: false }, 400],
  ] as const) {
    const h = harness();
    assert.equal((await handlePublicInquiry(request(body), h.dependencies)).status, status);
    assert.equal(h.writes.length, 0);
  }
});

test("Core throttling, malformed acknowledgments and gateway failures stay unsuccessful and private", async () => {
  for (const [status, expected] of [
    [429, 429],
    [400, 400],
    [401, 503],
    [500, 503],
    [202, 503],
  ]) {
    const h = harness();
    h.dependencies.fetcher = async () => Response.json({ error: "server-secret" }, { status });
    const response = await handlePublicInquiry(request(), h.dependencies);
    assert.equal(response.status, expected);
    const body = await response.json();
    assert.equal(body.accepted, false);
    assert.equal(JSON.stringify(body).includes("server-secret"), false);
  }
});

test("an aborted request releases its stream and never submits", async () => {
  const h = harness();
  const abort = new AbortController();
  let cancelled = false;
  const req = new Request(request(), {
    body: new ReadableStream({
      cancel() {
        cancelled = true;
      },
    }),
    signal: abort.signal,
    // Node requires duplex for a streamed request.
    ...({ duplex: "half" } as object),
  });
  const result = handlePublicInquiry(req, h.dependencies);
  await Promise.resolve();
  abort.abort();
  assert.equal((await result).status, 503);
  assert.equal(cancelled, true);
  assert.equal(h.writes.length, 0);
});
