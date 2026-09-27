import { strict as assert } from "node:assert";
import { test } from "node:test";
import { BUDGETS, budgetOptions } from "./budget.ts";

const labels = (minimums: (number | undefined)[]) => budgetOptions(minimums).map((b) => b.label);

test("ranges below a space's minimum aren't offered", () => {
  assert.deepEqual(labels([10_000]), ["$10k–$25k", "$25k–$50k", "$50k–$100k", "$100k+", "Not sure yet"]);
  // A $20k room can still take $10k–$25k: the range reaches the floor.
  assert.deepEqual(labels([20_000])[0], "$10k–$25k");
  assert.deepEqual(labels([30_000])[0], "$25k–$50k");
});

test("with several spaces, the cheapest one decides", () => {
  // Redwood Park at $10k and a meeting room at $2k: under $10k still fits the meeting room.
  assert.equal(labels([10_000, 2_000])[0], "Under $10k");
  assert.equal(labels([10_000, 20_000])[0], "$10k–$25k");
});

test("no spaces, or a space without a minimum, offers everything; not sure is always there", () => {
  assert.equal(budgetOptions([]).length, BUDGETS.length);
  assert.equal(budgetOptions([10_000, undefined]).length, BUDGETS.length);
  assert.equal(labels([1_000_000]).at(-1), "Not sure yet");
});

test("options are ordered, with not sure last", () => {
  const maxes = BUDGETS.filter((b) => b.max !== undefined).map((b) => b.max!);
  assert.deepEqual([...maxes].sort((a, b) => a - b), maxes);
  assert.equal(BUDGETS.at(-1)?.max, undefined);
});
