import { strict as assert } from "node:assert";
import { test } from "node:test";
import { START_TIMES, dateText } from "./when.ts";

test("the date text carries the start time for the events team", () => {
  assert.equal(dateText("2026-10-12", "19:00", false), "2026-10-12, from 7:00 pm");
  assert.equal(dateText("2026-10-12", "19:30", true), "2026-10-12, from 7:30 pm (flexible)");
});

test("no time, or one we don't offer, leaves the date as it was", () => {
  assert.equal(dateText("2026-10-12", undefined, true), "2026-10-12 (flexible)");
  assert.equal(dateText("2026-10-12", "03:17", false), "2026-10-12");
});

test("start times run every half hour from 7 am to 11 pm", () => {
  assert.equal(START_TIMES[0], "07:00");
  assert.equal(START_TIMES.at(-1), "23:00");
});
