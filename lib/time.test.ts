import { strict as assert } from "node:assert";
import { test } from "node:test";
import { at, dayDiff, dayKey, fmtTime, startOfDay, week, zoned } from "./time.ts";

// These must come out the same whatever zone the machine is in: run under TZ=UTC and TZ=Asia/Tokyo in CI too
test("'today at 7am' is 7am in San Francisco, whatever the machine's zone", () => {
  const seven = at(0, 7 * 60);
  assert.equal(zoned(seven).hour, 7);
  assert.equal(zoned(seven).minutes, 7 * 60);
  assert.equal(fmtTime(seven), "7 am");
  assert.equal(dayDiff(seven), 0);
});

test("a week is seven building midnights, one day apart", () => {
  const days = week();
  assert.equal(days.length, 7);
  for (const d of days) assert.equal(zoned(d).minutes, 0);
  assert.equal(dayKey(days[0]), dayKey(new Date()));
  assert.equal(dayDiff(days[3].toISOString()), 3);
});

test("the start of a day is that San Francisco day's midnight", () => {
  const d = startOfDay(new Date("2026-07-01T05:00:00Z")); // 10pm June 30 in SF
  assert.equal(dayKey(d), "2026-06-30");
  assert.equal(d.toISOString(), "2026-06-30T07:00:00.000Z");
});

test("weekdays and days of the month follow the building's calendar", () => {
  const z = zoned("2026-12-01T03:00:00Z"); // 7pm Nov 30 in SF, a Monday
  assert.deepEqual([z.month, z.day, z.weekday, z.hour], [11, 30, 1, 19]);
});
