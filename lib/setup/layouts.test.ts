import { strict as assert } from "node:assert";
import { test } from "node:test";
import type { Setup } from "../data/types.ts";
import { makeLayout } from "../../components/three/setup/layouts.ts";
import { layouts } from "../tenants/pyramid/shells.ts";
import { shellFromPlate, specsFromCapacities } from "./shell.ts";

const seated = (s: Setup) => s !== "reception" && s !== "concert";

const all = Object.entries(layouts).flatMap(([venue, v]) =>
  (Object.entries(v.setups) as [Setup, NonNullable<(typeof v.setups)[Setup]>][]).map(([setup, spec]) => ({ venue, setup, spec, shell: v.shell })),
);

test("every venue setup seats its full capacity", () => {
  for (const { venue, setup, spec, shell } of all) {
    for (const n of [spec.min ?? 5, Math.round(spec.max / 2), spec.max]) {
      const L = makeLayout(setup, n, shell, spec);
      const got = seated(setup) ? L.chairs.length + (setup === "lounge" ? L.sofas.length * 3 : 0) : L.people.length * L.per;
      assert.ok(got >= n, `${venue} ${setup} at ${n}: placed ${got}`);
    }
  }
});

test("nothing lands on a core, a bar or outside the floor", () => {
  for (const { venue, setup, spec, shell } of all) {
    const L = makeLayout(setup, spec.max, shell, spec);
    const solids = [...shell.solids, ...(shell.context ?? [])];
    for (const [x, z] of [...L.chairs, ...L.rounds, ...L.people, ...L.highs, ...L.sofas]) {
      const hit = solids.find((b) => Math.abs(x - b.x) < b.w / 2 && Math.abs(z - b.z) < b.d / 2);
      assert.ok(!hit, `${venue} ${setup}: item at ${x},${z} inside ${hit?.label ?? "a solid"}`);
      const xs = shell.outline.map((p) => p[0]);
      const zs = shell.outline.map((p) => p[1]);
      assert.ok(x > Math.min(...xs) && x < Math.max(...xs) && z > Math.min(...zs) && z < Math.max(...zs), `${venue} ${setup}: ${x},${z} off the floor`);
    }
  }
});

test("layouts are deterministic", () => {
  for (const { setup, spec, shell } of all) assert.deepEqual(makeLayout(setup, spec.max, shell, spec), makeLayout(setup, spec.max, shell, spec));
});

test("plain rooms from a plate still lay out", () => {
  const shell = shellFromPlate({ w: 12, d: 8, windows: "north" });
  const specs = specsFromCapacities({ boardroom: 16, theater: 40, classroom: 24, reception: 50 });
  for (const [s, spec] of Object.entries(specs) as [Setup, NonNullable<(typeof specs)[Setup]>][]) {
    const L = makeLayout(s, spec.max, shell, spec);
    assert.ok((seated(s) ? L.chairs.length : L.people.length) >= spec.max, `${s}`);
  }
});
