import { strict as assert } from "node:assert";
import { test } from "node:test";
import type { Setup } from "../data/types.ts";
import { fitRadius, frameFor } from "../../components/three/setup/camera.ts";
import { makeLayout } from "../../components/three/setup/layouts.ts";
import { layouts } from "../tenants/pyramid/shells.ts";
import { shellBounds } from "./shell.ts";

const all = Object.entries(layouts).flatMap(([venue, v]) =>
  (Object.entries(v.setups) as [Setup, NonNullable<(typeof v.setups)[Setup]>][]).map(([setup, spec]) => ({ venue, setup, spec, shell: v.shell })),
);

test("a close-up keeps everything the setup laid out in frame", () => {
  for (const { venue, setup, spec, shell } of all) {
    const L = makeLayout(setup, spec.max, shell, spec);
    const { box } = frameFor(shell, spec, setup, L, "close");
    for (const [x, z] of [...L.chairs, ...L.people, ...L.rounds, ...L.sofas, ...L.highs]) {
      assert.ok(x >= box.x0 && x <= box.x1 && z >= box.z0 && z <= box.z1, `${venue} ${setup}: ${x},${z} outside the close-up`);
    }
  }
});

test("the overview looks from the side the event is on", () => {
  for (const { venue, setup, spec, shell } of all) {
    const L = makeLayout(setup, spec.max, shell, spec);
    const { yaw } = frameFor(shell, spec, setup, L, "overview");
    const b = shellBounds(shell);
    const rs = shell.zones[spec.zone];
    const zx = rs.reduce((s, r) => s + r.x, 0) / rs.length - b.cx;
    const zz = rs.reduce((s, r) => s + r.z, 0) / rs.length - b.cz;
    if (Math.hypot(zx, zz) < 1.5) continue;
    // The camera's direction from the middle and the zone's should agree (within the three-quarter turn)
    assert.ok(Math.cos(yaw) * zx + Math.sin(yaw) * zz > 0, `${venue} ${setup}: overview camera on the far side`);
  }
});

test("theaters are seen from behind the audience", () => {
  for (const { venue, setup, spec, shell } of all.filter((a) => a.setup === "theater")) {
    const L = makeLayout(setup, spec.max, shell, spec);
    const { yaw } = frameFor(shell, spec, setup, L, "close");
    const [sx0, sz0, sx1, sz1] = shell.fixed!.screen!;
    const ax = L.chairs.reduce((s, c) => s + c[0], 0) / L.chairs.length;
    const az = L.chairs.reduce((s, c) => s + c[1], 0) / L.chairs.length;
    // Camera direction points from the screen toward the audience
    assert.ok(Math.cos(yaw) * (ax - (sx0 + sx1) / 2) + Math.sin(yaw) * (az - (sz0 + sz1) / 2) > 0, venue);
  }
});

test("fitting is monotonic: a wider stage needs less distance", () => {
  const box = { x0: -10, x1: 10, y0: 0, y1: 2, z0: -5, z1: 5 };
  const narrow = fitRadius(box, 0.8, 0.7, 0.5, 0.8);
  const wide = fitRadius(box, 0.8, 0.7, 0.5, 2);
  assert.ok(wide < narrow && wide > 0);
});
