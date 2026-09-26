import { strict as assert } from "node:assert";
import { test } from "node:test";
import { BUDGETS, budgetByLabel, budgetCheck } from "./budget.ts";

const under10 = budgetByLabel("Under $10k");
const tenTo25 = budgetByLabel("$10k–$25k");

test("a budget below a space's minimum is caught", () => {
  assert.deepEqual(budgetCheck(under10, [10_000]), { ok: false, floor: 10_000 });
  assert.deepEqual(budgetCheck(tenTo25, [20_000]), { ok: true });
  assert.deepEqual(budgetCheck(tenTo25, [30_000]), { ok: false, floor: 30_000 });
});

test("with several spaces, the cheapest one decides", () => {
  // Redwood Park at $10k and a meeting room at $2k: under $10k still fits the meeting room.
  assert.deepEqual(budgetCheck(under10, [10_000, 2_000]), { ok: true });
  assert.deepEqual(budgetCheck(under10, [10_000, 20_000]), { ok: false, floor: 10_000 });
});

test("not sure, no budget, no spaces, or a space without a minimum always pass", () => {
  assert.deepEqual(budgetCheck(budgetByLabel("Not sure yet"), [10_000]), { ok: true });
  assert.deepEqual(budgetCheck(undefined, [10_000]), { ok: true });
  assert.deepEqual(budgetCheck(under10, []), { ok: true });
  assert.deepEqual(budgetCheck(under10, [10_000, undefined]), { ok: true });
});

test("options are ordered, with not sure last", () => {
  const maxes = BUDGETS.filter((b) => b.max !== undefined).map((b) => b.max!);
  assert.deepEqual([...maxes].sort((a, b) => a - b), maxes);
  assert.equal(BUDGETS.at(-1)?.max, undefined);
});
