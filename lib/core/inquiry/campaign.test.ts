import { strict as assert } from "node:assert";
import { test } from "node:test";
import { resolvePublicCampaign } from "./campaign.ts";

/** Model one tab's campaign storage without accessing a browser. */
function storage() {
  const values = new Map<string, string>();
  return { values, getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); } };
}

test("campaign survives homepage to clean venue-detail navigation without retaining other URL data", () => {
  const tab = storage();
  assert.equal(resolvePublicCampaign("?utm_campaign=fall&email=private%40example.com&details=private", tab), "fall");
  assert.equal(resolvePublicCampaign("", tab), "fall");
  assert.deepEqual([...tab.values], [["public-venue-campaign", "fall"]]);
});

test("a new explicit campaign replaces the previous campaign; blank parameters do not erase it", () => {
  const tab = storage();
  resolvePublicCampaign("?utm_campaign=fall", tab);
  assert.equal(resolvePublicCampaign("?utm_campaign=winter", tab), "winter");
  assert.equal(resolvePublicCampaign("?utm_campaign=%20", tab), "winter");
  assert.equal(resolvePublicCampaign("", storage()), "");
});

test("campaign is bounded to the Core contract", () => {
  const tab = storage();
  assert.equal(resolvePublicCampaign(`?utm_campaign=${"a".repeat(250)}`, tab).length, 200);
  assert.equal(resolvePublicCampaign("", tab).length, 200);
});

test("unavailable browser storage does not prevent URL attribution or inquiry submission", () => {
  const blocked = { getItem(): string | null { throw Error("blocked"); }, setItem() { throw Error("blocked"); } };
  assert.equal(resolvePublicCampaign("?utm_campaign=fall", blocked), "fall");
  assert.equal(resolvePublicCampaign("", blocked), "");
  assert.equal(resolvePublicCampaign("?utm_campaign=fall"), "fall");
});
