import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  MAX_VENUE_TEXT,
  toCoreInquiry,
  validateInquiry,
  venueText,
  type InquiryInput,
} from "./contract.ts";
import { submitCoreInquiry } from "./submit.ts";

const input: InquiryInput = {
  firstName: "Review",
  lastName: "Example",
  email: "review@example.com",
  venues: ["summit-room"],
  venue: "summit-room",
  date: "2026-11-12",
  guests: "40",
  privacy: true,
  marketing: false,
  startedAt: "2026-09-08T12:00:00.000Z",
};
const settings = {
  sourceKey: "web_inquiry",
  privacyPolicyVersion: "approved-version",
};
const config = {
  host: "https://core.example",
  apiKey: "test-key",
  buildingId: "building-id",
};
const meta = {
  startedAt: input.startedAt,
  website: "",
  idempotencyKey: "test-key-1",
};

test("the minimal inquiry needs a date and guests, and nothing optional", () => {
  assert.ok(validateInquiry(input, ["summit-room"]).input);
  const body = toCoreInquiry(input, "Summit Room", settings);
  assert.deepEqual(body.contact, {
    first_name: "Review",
    last_name: "Example",
    email: "review@example.com",
  });
  assert.deepEqual(body.booking, {
    requested_venue_text: "Summit Room",
    requested_date_text: "2026-11-12",
    attendee_count_min: 40,
    attendee_count_max: 40,
  });
  assert.equal(body.consent.marketing_opt_in, false);
  assert.equal("company" in body.contact, false);
});
test("venue selection and privacy acknowledgement are enforced server-side", () => {
  const result = validateInquiry(
    {
      ...input,
      privacy: "true",
      venues: ["private-room"],
      email: "wrong",
      guests: "1.5",
    },
    ["summit-room"],
  );
  assert.equal(result.input, null);
  assert.deepEqual(Object.keys(result.errors).sort(), [
    "email",
    "guests",
    "privacy",
    "venue",
  ]);
  assert.ok(validateInquiry({ ...input, venues: ["not-sure"] }, []).input);
});
test("date and guests are required", () => {
  const result = validateInquiry({ ...input, date: " ", guests: undefined }, ["summit-room"]);
  assert.equal(result.input, null);
  assert.deepEqual(Object.keys(result.errors).sort(), ["date", "guests"]);
});
test("several venues are accepted, in order, and a single `venue` still works", () => {
  const slugs = ["sky-bar", "bay-lounge", "sandbox"];
  const many = validateInquiry({ ...input, venues: ["bay-lounge", "sky-bar"], venue: undefined }, slugs).input;
  assert.deepEqual(many?.venues, ["bay-lounge", "sky-bar"]);
  assert.equal(many?.venue, "bay-lounge");
  const { venues: _drop, ...legacy } = input;
  void _drop;
  assert.deepEqual(validateInquiry({ ...legacy, venue: "sandbox" }, slugs).input?.venues, ["sandbox"]);
});
test("bad venue lists are rejected", () => {
  const slugs = ["a", "b", "c", "d", "e", "f"];
  for (const venues of [[], ["a", "a"], ["a", "not-sure"], ["a", "zzz"], ["a", 3], ["a", "b", "c", "d", "e", "f"], "a"]) {
    const result = validateInquiry({ ...input, venue: undefined, venues }, slugs);
    assert.equal(result.input, null, JSON.stringify(venues));
    assert.ok(result.errors.venue);
  }
});
test("venue names are joined for Core, in the order chosen, within the limit", () => {
  const list = [
    { slug: "sky-bar", name: "Sky Bar" },
    { slug: "bay-lounge", name: "Bay Lounge" },
  ];
  assert.equal(venueText(["bay-lounge", "sky-bar"], list), "Bay Lounge, Sky Bar");
  assert.equal(venueText(["not-sure"], list), "Not sure yet");
  assert.equal(venueText(["gone"], list), "Not sure yet");
  const long = Array.from({ length: 5 }, (_, i) => ({ slug: `v${i}`, name: "x".repeat(150) + i }));
  assert.ok(venueText(long.map((v) => v.slug), long).length <= MAX_VENUE_TEXT);
});
test("optional details map to documented Core fields without empty values", () => {
  const body = toCoreInquiry(
    {
      ...input,
      eventType: "Workshop",
      guests: "24",
      date: "October, flexible",
      budget: "To discuss",
      campaign: "fall",
    },
    "Summit Room",
    settings,
  );
  assert.equal(body.booking.attendee_count_max, 24);
  assert.equal(body.booking.requested_date_text, "October, flexible");
  assert.equal(body.responses.budget_range, "To discuss");
  assert.equal(body.campaign, "fall");
  assert.equal("target_start_date" in body.booking, false);
});
test("validation bounds strings and rejects object-valued fields", () => {
  assert.equal(
    validateInquiry({ ...input, firstName: "a".repeat(101) }, ["summit-room"])
      .input,
    null,
  );
  assert.equal(
    validateInquiry({ ...input, details: {} }, ["summit-room"]).input,
    null,
  );
  assert.equal(
    validateInquiry({ ...input, startedAt: "bad" }, ["summit-room"]).input,
    null,
  );
});
test("HTTP submission sends the public key and forwards the same retry key", async () => {
  const body = toCoreInquiry(input, "Summit Room", settings);
  const sent: string[] = [];
  const fetcher: typeof fetch = async (url, options) => {
    assert.equal(
      url,
      "https://core.example/public/buildings/building-id/conference-inquiries",
    );
    const headers = new Headers(options?.headers);
    assert.equal(headers.get("X-API-KEY"), "test-key");
    assert.equal(
      headers.get("X-Conference-Inquiry-Started-At"),
      input.startedAt,
    );
    sent.push(headers.get("Idempotency-Key")!);
    return Response.json(
      { accepted: true, inquiry_reference: "inqref_test" },
      { status: 202 },
    );
  };
  assert.equal(
    (await submitCoreInquiry(config, body, meta, fetcher)).body
      .inquiry_reference,
    "inqref_test",
  );
  await submitCoreInquiry(config, body, meta, fetcher);
  assert.deepEqual(sent, ["test-key-1", "test-key-1"]);
});
test("gateway failures and malformed acknowledgements never become success or leak bodies", async () => {
  for (const status of [401, 500, 202]) {
    const result = await submitCoreInquiry(
      config,
      toCoreInquiry(input, "Summit Room", settings),
      meta,
      async () =>
        Response.json({ error: "private upstream detail" }, { status }),
    );
    assert.equal(result.status, 503);
    assert.equal(result.body.accepted, false);
    assert.equal(JSON.stringify(result).includes("private upstream"), false);
  }
});
test("throttling and network uncertainty preserve retry semantics", async () => {
  const body = toCoreInquiry(input, "Summit Room", settings);
  assert.equal(
    (
      await submitCoreInquiry(
        config,
        body,
        meta,
        async () => new Response(null, { status: 429 }),
      )
    ).status,
    429,
  );
  assert.equal(
    (
      await submitCoreInquiry(config, body, meta, async () => {
        throw new Error("network");
      })
    ).status,
    503,
  );
});

test("the shared deadline cancels an in-flight Core submission with a retryable uncertain result", async () => {
  const deadline = new AbortController();
  const result = await submitCoreInquiry(
    { ...config, signal: deadline.signal },
    toCoreInquiry(input, "Summit Room", settings), meta,
    async (_url, options) => new Promise<Response>((_resolve, reject) => {
      options!.signal!.addEventListener("abort", () => reject(options!.signal!.reason), { once: true });
      deadline.abort();
    }),
  );
  assert.equal(result.status, 503);
  assert.equal(result.body.accepted, false);
  assert.match(result.body.message!, /couldn’t be confirmed/);
});

test("ignored Core response bodies are cancelled while preserving status handling", async () => {
  for (const [status, expected] of [[429, 429], [400, 400], [413, 400], [401, 503], [500, 503]]) {
    let cancelled = false;
    const response = new Response(new ReadableStream({
      start(controller) { controller.enqueue(new TextEncoder().encode("private upstream details")); },
      cancel() { cancelled = true; },
    }), { status });
    const result = await submitCoreInquiry(
      config, toCoreInquiry(input, "Summit Room", settings), meta,
      async () => response,
    );
    assert.equal(cancelled, true, `status ${status} must release its body`);
    assert.equal(result.status, expected);
    assert.equal(result.body.accepted, false);
    assert.equal(JSON.stringify(result).includes("private upstream"), false);
  }
});
