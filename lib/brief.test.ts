import { strict as assert } from "node:assert";
import { test } from "node:test";
import { briefHref, readBrief } from "./brief.ts";
import { layouts } from "./tenants/pyramid/shells.ts";

const all = Object.entries(layouts).map(([slug, layout]) => ({ slug, layout }));
const read = (s: string) => readBrief(new URLSearchParams(s), all);

test("a brief link round-trips", () => {
  const href = briefHref({ venues: ["sky-bar", "bay-lounge"], setup: "banquet", guests: 40, date: "2026-10-12", time: "19:00" });
  assert.equal(href, "/venues/brief?v=sky-bar,bay-lounge&setup=banquet&guests=40&date=2026-10-12&time=19:00");
  const b = read(href.split("?")[1]);
  assert.deepEqual(b.venues, [
    { slug: "sky-bar", setup: "banquet", guests: 40 },
    { slug: "bay-lounge", setup: "banquet", guests: 40 },
  ]);
  assert.equal(b.date, "2026-10-12");
  assert.equal(b.time, "19:00");
});

test("unknown venues, repeats and bad values are dropped", () => {
  const b = read("v=sky-bar,nowhere,sky-bar&date=2026-13-45&time=25:00&guests=-3");
  assert.deepEqual(b.venues.map((v) => v.slug), ["sky-bar"]);
  assert.equal(b.date, undefined);
  assert.equal(b.time, undefined);
  assert.equal(b.guests, undefined);
});

test("a setup a venue doesn't offer falls back to one that fits the crowd", () => {
  // Sky Bar has no theater; 60 guests fit its reception (80), not its lounge (50)
  const [v] = read("v=sky-bar&setup=theater&guests=60").venues;
  assert.equal(v.setup, "reception");
  assert.equal(v.guests, 60);
});

test("guests are clamped to what each venue's setup holds", () => {
  const b = read("v=sky-bar,redwood-park&setup=banquet&guests=300");
  assert.equal(b.venues[0].guests, 48, "Sky Bar seats 48 for a banquet");
  assert.equal(b.venues[1].guests, 300, "Redwood Park seats 400");
});

test("no more than five venues", () => {
  assert.equal(read(`v=${all.map((x) => x.slug).join(",")},sky-bar`).venues.length, 5);
});
