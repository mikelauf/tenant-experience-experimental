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

test("Redwood Park plants its plan: every redwood and place on the block, clear of the tower", async () => {
  const { treesFor } = await import("./tower.ts");
  const { parkPlan } = await import("./tenants/pyramid/park.ts");
  const p = { seed: 7, park: { x: 2.6, z: 0, w: 2.6, d: 3.9, pad: [0.5, 0.7], trees: 26, shape: "cone", yaw: [0, 1], plan: parkPlan } } as unknown as Parameters<typeof treesFor>[0];
  const trees = treesFor(p);
  assert.equal(trees.length, parkPlan.trees.length);
  trees.forEach(([x, z], i) => assert.deepEqual([x, z], parkPlan.trees[i]));
  // Between Washington (z −2.54) and Clay (z 2.5), short of Sansome (x 5.58), and east of the Pyramid's base (half-width 1.45)
  for (const [x, z] of [...parkPlan.trees, ...parkPlan.spots.map((s) => [s.x, s.z] as const)]) {
    assert.ok(x > 1.45 && x < 5.58, `x ${x}`);
    assert.ok(z > -2.54 && z < 2.5, `z ${z}`);
  }
});
