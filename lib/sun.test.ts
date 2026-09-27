import { strict as assert } from "node:assert";
import { test } from "node:test";
import { clock, eveningOf, nowIn, lightAt, minutesOf, sunLevel, sunPosition, zonedTime, type Geo } from "./sun.ts";

// 600 Montgomery Street
const pyramid: Geo = { lat: 37.7952, lng: -122.4028, tz: "America/Los_Angeles" };

const near = (a: number | null, b: number, tol: number, msg: string) => assert.ok(a != null && Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

test("wall-clock times in San Francisco become the right instant, either side of daylight saving", () => {
  assert.equal(zonedTime("2026-07-01", "19:00", pyramid.tz).toISOString(), "2026-07-02T02:00:00.000Z");
  assert.equal(zonedTime("2026-12-01", "19:00", pyramid.tz).toISOString(), "2026-12-02T03:00:00.000Z");
});

test("solar noon at the summer solstice: high, and due south", () => {
  // Solar noon in SF is about 1:13 pm PDT in late June
  const { elevation, azimuth } = sunPosition(zonedTime("2026-06-21", "13:13", pyramid.tz), pyramid);
  near(elevation, 90 - 37.7952 + 23.44, 0.5, "elevation");
  near(azimuth, 180, 2, "azimuth");
});

test("sunset matches published San Francisco times", () => {
  // Published: Jun 21 8:35 pm PDT, Dec 21 4:54 pm PST, Sep 26 about 6:59 pm PDT
  near(eveningOf("2026-06-21", pyramid).sunset, 20 * 60 + 35, 3, "June");
  near(eveningOf("2026-12-21", pyramid).sunset, 16 * 60 + 54, 3, "December");
  near(eveningOf("2026-09-26", pyramid).sunset, 18 * 60 + 59, 3, "September");
});

test("golden hour comes before sunset and dusk after it", () => {
  const e = eveningOf("2026-10-12", pyramid);
  assert.ok(e.golden! < e.sunset! && e.sunset! < e.dark!);
});

test("the sun sets in the west-northwest in summer and the southwest in winter", () => {
  const summer = sunPosition(zonedTime("2026-06-21", "20:30", pyramid.tz), pyramid).azimuth;
  const winter = sunPosition(zonedTime("2026-12-21", "16:50", pyramid.tz), pyramid).azimuth;
  assert.ok(summer > 290 && summer < 310, `summer ${summer}`);
  assert.ok(winter > 235 && winter < 250, `winter ${winter}`);
});

test("light levels run night, dusk, day without jumps", () => {
  assert.equal(sunLevel(-20), 0);
  assert.equal(sunLevel(0), 0.5);
  assert.equal(sunLevel(40), 1);
  for (let e = -12; e < 20; e += 0.5) assert.ok(sunLevel(e + 0.5) >= sunLevel(e));
  assert.equal(lightAt(10), "day");
  assert.equal(lightAt(3), "golden");
  assert.equal(lightAt(-3), "dusk");
  assert.equal(lightAt(-10), "night");
});

test("now is the building's time, not the viewer's", () => {
  // 03:30 UTC on Sep 27 is still the evening of Sep 26 in San Francisco (PDT, UTC−7)
  assert.deepEqual(nowIn(pyramid.tz, new Date("2026-09-27T03:30:00Z")), { date: "2026-09-26", minutes: 20 * 60 + 30 });
});

test("clock text", () => {
  assert.equal(clock(19 * 60), "7:00 pm");
  assert.equal(clock(12 * 60 + 5), "12:05 pm");
  assert.equal(clock(0), "12:00 am");
  assert.equal(minutesOf("19:30"), 1170);
  assert.equal(minutesOf("25:00"), null);
});
