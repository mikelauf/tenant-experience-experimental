import type { ParkSpot } from "../../tower.ts";
import { redwoodParkPlan } from "./shells.ts";

/**
 * The park plan's meters onto the scene. On the plan (0.075 m a pixel) the Pyramid's base is 580 px across,
 * centered at pixel (422, 515); in the scene it's 2.9 units at the origin. So one unit is 15 m, and the plan's
 * own origin, pixel (1100, 520), lands at (3.39, 0.025).
 */
const toScene = (x: number, z: number): [number, number] => [Math.round((x / 15 + 3.39) * 1000) / 1000, Math.round((z / 15 + 0.025) * 1000) / 1000];

/** Redwood Park as the 3D explorer plants it */
export const parkPlan: { trees: [number, number][]; spots: ParkSpot[] } = {
  trees: redwoodParkPlan.trees.map(([x, z]) => toScene(x, z)),
  spots: redwoodParkPlan.spots.map((s) => {
    const [x, z] = toScene(s.x, s.z);
    return { ...s, x, z, w: s.w / 15, d: s.d / 15 };
  }),
};
