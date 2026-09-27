import { strict as assert } from "node:assert";
import { test } from "node:test";
import { bearingDir, yawForBearing } from "./tower.ts";

const close = (a: number, b: number, msg: string) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} vs ${b}`);

test("bearings map onto the scene: north is −z, east is +x", () => {
  const [nx, nz] = bearingDir(0);
  close(nx, 0, "north x");
  close(nz, -1, "north z");
  const [ex, ez] = bearingDir(90);
  close(ex, 1, "east x");
  close(ez, 0, "east z");
});

test("a grid turned west of north turns bearings the other way", () => {
  // On a grid 9.1° west of true north, a true bearing of 350.9 runs straight up the grid
  const [x, z] = bearingDir(350.9, -9.1);
  close(x, 0, "x");
  close(z, -1, "z");
});

test("the tower camera looking out along a bearing sits opposite it", () => {
  for (const b of [0, 45, 135, 300, 345]) {
    const yaw = yawForBearing(b, -9.1);
    const [dx, dz] = bearingDir(b, -9.1);
    close(Math.cos(yaw), -dx, `bearing ${b} x`);
    close(Math.sin(yaw), -dz, `bearing ${b} z`);
  }
});
