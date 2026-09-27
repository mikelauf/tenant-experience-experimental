import { strict as assert } from "node:assert";
import { test } from "node:test";
import { layouts } from "../tenants/pyramid/shells.ts";
import { readSpace, spaceQuery } from "./share.ts";

const { setups } = layouts["bay-lounge"];

test("a shared link round-trips", () => {
  const s = { setup: "banquet" as const, guests: 48, view: "top" as const };
  assert.deepEqual(readSpace(new URLSearchParams(spaceQuery(s)), setups), s);
});

test("the close-up is the default and stays out of the link", () => {
  assert.equal(spaceQuery({ setup: "theater", guests: 60, view: "close" }), "setup=theater&guests=60");
});

test("bad values fall back instead of breaking the page", () => {
  const s = readSpace(new URLSearchParams("setup=concert&guests=9999&view=sideways"), setups)!;
  assert.equal(s.setup, "reception", "a setup the venue doesn't offer falls back to its first");
  assert.equal(s.guests, setups.reception!.max, "guests clamp to the setup's most");
  assert.equal(s.view, "close");
});

test("guests clamp to the setup's fewest", () => {
  assert.equal(readSpace(new URLSearchParams("setup=boardroom&guests=1"), setups)!.guests, 6);
});

test("no guests means the setup's most", () => {
  assert.equal(readSpace(new URLSearchParams("setup=theater"), setups)!.guests, setups.theater!.max);
});
