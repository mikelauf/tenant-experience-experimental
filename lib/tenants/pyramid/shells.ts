import type { Setup, SetupSpec, Shell } from "../../data/types.ts";
import { tracer } from "../../setup/shell.ts";

/**
 * Each venue's room, traced from the building's plan images in public/images/tap/plans (booklet, July 2026).
 * Coordinates are the plan image's own pixels; `tracer` turns them into meters. The plans have no scale
 * bar, so each scale is set so the traced event area matches the booklet's square footage. Good enough
 * to show how a setup fills the room; the events team confirms every real plan.
 *
 * Capacities are the booklet's where it gives one per setup (The Sandbox's two plans, Bay Lounge's
 * 30-seat boardrooms); the rest are estimates, labeled as such on the page, until Spencer confirms them.
 */

type VenueLayout = { shell: Shell; setups: Partial<Record<Setup, SetupSpec>>; illustrative?: boolean };

const streets = { n: "Washington St", s: "Clay St", w: "Montgomery St", e: "Redwood Park" };

/* ---------- Sky Bar, L48 (sky-bar.webp, 1551 × 891). A cross: the room between two cores. ~2,100 sq ft ---------- */

const sb = tracer(0.0205, 790, 452);
const skyBar: VenueLayout = {
  shell: {
    outline: [
      sb.p(462, 110),
      sb.p(1138, 110),
      sb.p(1138, 280),
      sb.p(1452, 280),
      sb.p(1452, 628),
      sb.p(1138, 628),
      sb.p(1138, 795),
      sb.p(462, 795),
      sb.p(462, 628),
      sb.p(135, 628),
      sb.p(135, 280),
      sb.p(462, 280),
    ],
    glass: [sb.seg(462, 110, 1138, 110), sb.seg(1138, 795, 462, 795)],
    solids: [
      { ...sb.r(150, 290, 430, 615, "Elevators"), note: "Guests ride up from Level 27, where the building's two elevator banks meet." },
      sb.r(430, 280, 640, 628, "Pantry"),
      sb.r(985, 360, 1075, 545),
      sb.r(1075, 365, 1215, 545, "Restrooms"),
      { ...sb.r(1300, 290, 1440, 615, "Elevators"), note: "Guests ride up from Level 27, where the building's two elevator banks meet." },
    ],
    zones: { floor: [sb.r(485, 128, 1115, 282), sb.r(485, 626, 1115, 777), sb.r(765, 292, 975, 612)] },
    fixed: { bars: [{ ...sb.r(693, 290, 752, 615, "Bar"), always: true }] },
    streets,
    finish: "oak",
    decor: {
      plants: [sb.p(478, 126), sb.p(1122, 126), sb.p(478, 779), sb.p(1122, 779), sb.p(1000, 318), sb.p(1000, 590)],
      shelves: [sb.r(650, 300, 670, 605)],
      pendants: [sb.seg(722, 312, 722, 593)],
    },
  },
  setups: { reception: { max: 80, zone: "floor" }, lounge: { max: 50, zone: "floor" }, banquet: { max: 48, zone: "floor" } },
  illustrative: true,
};

/* ---------- Bay Lounge, L27 (bay-lounge.webp, 1333 × 1322). The Transfer Lobby along Washington St. ~3,020 sq ft ---------- */

const bl = tracer(0.026, 660, 665);
const bayLounge: VenueLayout = {
  shell: {
    outline: [bl.p(105, 108), bl.p(1215, 108), bl.p(1215, 1225), bl.p(105, 1225)],
    glass: [bl.seg(105, 108, 1215, 108), bl.seg(1215, 108, 1215, 1225), bl.seg(1215, 1225, 105, 1225), bl.seg(105, 1225, 105, 108)],
    solids: [
      bl.r(160, 495, 390, 780, "Stair"),
      bl.r(205, 780, 400, 850, "Pantry"),
      { ...bl.r(420, 465, 615, 830, "Elevators 1–27"), note: "Up from the lobby. Level 27 is where the two elevator banks meet, so every guest passes through here." },
      { ...bl.r(705, 465, 1200, 830, "Elevators 27–48"), note: "On up to Legacy Gallery (36) and Sky Bar (48)." },
      bl.r(495, 885, 720, 1105, "Restrooms"),
      bl.r(728, 945, 830, 1100),
      bl.r(1040, 850, 1205, 945, "Pantry"),
    ],
    rooms: [{ ...bl.r(125, 860, 385, 1205, "Foster Room"), note: "A separate room off the lounge." }, { ...bl.r(845, 950, 1205, 1205, "Pereira Room"), note: "A separate room off the lounge; it shares its name with William Pereira, the Pyramid's architect. The boardroom setup uses it." }],
    zones: {
      lobby: [bl.r(400, 130, 1195, 452), bl.r(130, 130, 400, 362)],
      facingScreen: [bl.r(400, 130, 1195, 440)],
      pereira: [bl.r(862, 962, 1190, 1192)],
    },
    fixed: { bars: [{ ...bl.r(215, 378, 372, 416, "Coffee bar"), always: true, note: "Staffed espresso can be added as an à la carte service." }], screen: bl.seg(710, 445, 940, 445) },
    streets,
    finish: "walnut",
    decor: {
      // The lobby's standing lounge, west of the screen, out of the theater's way
      lounges: [bl.r(150, 150, 380, 340)],
      rugs: [
        { ...bl.r(135, 870, 375, 1195), color: "#bdb7ad" },
        { ...bl.r(855, 960, 1195, 1195), color: "#bdb7ad" },
      ],
      boards: [bl.r(185, 930, 325, 1150)],
      shelves: [bl.r(225, 428, 362, 446)],
      pendants: [bl.seg(232, 397, 355, 397)],
      plants: [bl.p(125, 128), bl.p(1195, 128), bl.p(1195, 446), bl.p(125, 440), bl.p(632, 482), bl.p(688, 482), bl.p(420, 1205), bl.p(470, 870), bl.p(820, 1205)],
    },
  },
  setups: {
    reception: { max: 130, zone: "lobby" },
    theater: { max: 90, zone: "facingScreen" },
    banquet: { max: 72, zone: "lobby" },
    lounge: { max: 60, zone: "lobby" },
    boardroom: { max: 30, min: 6, zone: "pereira", traced: true },
  },
  illustrative: true,
};

/* ---------- The Sandbox, L3 (sandbox-theater.webp / sandbox-cocktail.webp, 985 × 1040). The whole floor. 14,800 sq ft ---------- */

const sx = tracer(0.0452, 498, 493);
const sandbox: VenueLayout = {
  shell: {
    outline: [sx.p(88, 82), sx.p(908, 82), sx.p(908, 905), sx.p(88, 905)],
    glass: [sx.seg(88, 82, 908, 82), sx.seg(908, 82, 908, 905), sx.seg(908, 905, 88, 905), sx.seg(88, 905, 88, 82)],
    solids: [
      sx.r(195, 345, 345, 590, "Kitchen"),
      sx.r(390, 345, 600, 640, "Restrooms"),
      sx.r(600, 380, 800, 600, "Elevators"),
      sx.r(400, 685, 600, 790, "Stair"),
    ],
    zones: {
      theater: [sx.r(200, 105, 600, 300)],
      cocktail: [sx.r(110, 100, 885, 300), sx.r(620, 625, 885, 885)],
    },
    fixed: {
      bars: [sx.r(270, 132, 326, 152, "Bar"), sx.r(662, 136, 718, 156, "Bar")],
      screen: sx.seg(210, 318, 585, 318),
      marks: [{ ...sx.r(100, 600, 340, 890, "Catering area"), event: true, note: "Where catering sets up, beside the kitchen." }, { ...sx.r(662, 305, 718, 325, "Check-in"), event: true, note: "Guest check-in, from the building's cocktail plan." }, { ...sx.r(835, 385, 855, 585, "Buffet"), event: true }],
    },
    streets,
    finish: "concrete",
    decor: {
      counters: [sx.r(835, 385, 855, 585), sx.r(125, 640, 143, 860)],
      lounges: [sx.r(370, 810, 590, 895)],
      plants: [sx.p(100, 94), sx.p(896, 94), sx.p(896, 893), sx.p(360, 893), sx.p(605, 893), sx.p(100, 330)],
    },
  },
  setups: { theater: { max: 100, zone: "theater", traced: true }, reception: { max: 200, zone: "cocktail", traced: true } },
};

/* ---------- Redwood Park, street level (redwood-park.webp, 1517 × 1048). The park east of the tower. ~18,000 sq ft ---------- */

const rp = tracer(0.075, 1100, 520);
const stage = { ...rp.r(975, 515, 1075, 590, "Stage"), always: true, event: true };
const kiosk = { ...rp.r(1035, 170, 1110, 212, "Kiosk bar"), always: true };
/** The plan doesn't draw the fountain. Placed from the photos: east of the stage, with the Pyramid's base across the grove behind it. */
const fountain = { ...rp.r(1095, 505, 1145, 550, "Fountain"), note: "The fountain and its bronze animals, under the redwoods." };
/** The Pyramid's east annex, which the grove wraps around */
const annex = rp.r(700, 375, 845, 655);

/** About fifty redwoods: scattered through the grove as the plan draws them, and a row along Mark Twain Alley. */
const redwoods = (() => {
  let s = 11;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const out: [number, number][] = [];
  const clearOf = (x: number, z: number, b: { x: number; z: number; w: number; d: number }, m: number) =>
    Math.abs(x - b.x) > b.w / 2 + m || Math.abs(z - b.z) > b.d / 2 + m;
  for (let i = 0; i < 1200 && out.length < 42; i++) {
    const [x, z] = rp.p(770 + r() * 370, 120 + r() * 800);
    // The lawn in front of the stage stays open
    const lawn = z > stage.z + 3 && z < stage.z + 16 && Math.abs(x - stage.x) < 9;
    if (lawn || !clearOf(x, z, stage, 3) || !clearOf(x, z, kiosk, 3) || !clearOf(x, z, fountain, 2) || !clearOf(x, z, annex, 1.5)) continue;
    if (out.every(([ox, oz]) => (ox - x) ** 2 + (oz - z) ** 2 > 4.2 ** 2)) out.push([Math.round(x * 100) / 100, Math.round(z * 100) / 100]);
  }
  for (let x = 1185; x <= 1420; x += 58) out.push(rp.p(x, 478), rp.p(x + 29, 552));
  return out;
})();

const redwoodPark: VenueLayout = {
  shell: {
    outline: [rp.p(745, 60), rp.p(1470, 60), rp.p(1470, 965), rp.p(745, 965)],
    glass: [],
    solids: [],
    context: [
      // Kept low so they frame the park without hiding it
      { ...rp.r(1160, 220, 1425, 462, "Three Transamerica"), h: 3 },
      { ...rp.r(1160, 570, 1425, 945, "Two Transamerica"), h: 3 },
    ],
    zones: {
      grove: [rp.r(760, 110, 1150, 930), rp.r(1150, 470, 1440, 560)],
      lawn: [rp.r(760, 600, 1150, 930)],
    },
    fixed: {
      stage,
      bars: [kiosk],
      marks: [fountain, { ...rp.r(1392, 500, 1412, 540, "Check-in"), event: true, note: "Guest check-in for park events, off Mark Twain Alley by Sansome Street." }, { ...rp.r(1285, 64, 1410, 92, "Food trucks"), event: true, note: "Food trucks park along Washington Street." }, { ...rp.r(980, 64, 1190, 92, "Restrooms"), event: true, note: "Portable restrooms along Washington Street." }],
      trees: redwoods,
    },
    streets: { n: "Washington St", s: "Clay St", w: "Transamerica Pyramid", e: "Sansome St" },
    outdoor: true,
    finish: "grass",
    decor: {
      // The walk along the tower's side, the fountain's plaza, and Mark Twain Alley
      paths: [rp.r(1132, 60, 1152, 965), rp.r(1078, 488, 1162, 567), rp.r(1152, 500, 1470, 530)],
      fountain: rp.r(1095, 505, 1145, 550),
      benches: [rp.r(1121, 240, 1127, 264), rp.r(1121, 340, 1127, 364), rp.r(1121, 700, 1127, 724), rp.r(1121, 820, 1127, 844)],
      lamps: [rp.p(1156, 120), rp.p(1156, 300), rp.p(1156, 640), rp.p(1156, 820), rp.p(1260, 496), rp.p(1360, 534)],
      trucks: rp.r(1225, 62, 1455, 94),
    },
  },
  setups: {
    reception: { max: 1500, min: 50, zone: "grove" },
    concert: { max: 1000, min: 50, zone: "lawn" },
    banquet: { max: 400, min: 16, zone: "grove" },
  },
  illustrative: true,
};

/** The park as the 3D explorer plants it: the redwoods and the places worth pointing at, in plan meters. */
export const redwoodParkPlan = {
  trees: redwoods,
  spots: [
    { id: "stage", label: "Redwood stage", kind: "stage" as const, x: stage.x, z: stage.z, w: stage.w, d: stage.d },
    { id: "bar", label: "Kiosk bar", kind: "bar" as const, x: kiosk.x, z: kiosk.z, w: kiosk.w, d: kiosk.d },
    { id: "fountain", label: "Fountain", kind: "fountain" as const, x: fountain.x, z: fountain.z, w: fountain.w, d: fountain.d },
  ],
};

/* ---------- Legacy Gallery, L36 (legacy-gallery.webp, 1468 × 1280). Gallery halls either side of the core. ~5,800 sq ft ---------- */

const lg = tracer(0.0272, 748, 638);
const legacyGallery: VenueLayout = {
  shell: {
    outline: [
      lg.p(230, 115),
      lg.p(1265, 115),
      lg.p(1265, 470),
      lg.p(1365, 470),
      lg.p(1365, 790),
      lg.p(1265, 790),
      lg.p(1265, 1160),
      lg.p(230, 1160),
      lg.p(230, 790),
      lg.p(125, 790),
      lg.p(125, 470),
      lg.p(230, 470),
    ],
    glass: [
      lg.seg(230, 115, 1265, 115),
      lg.seg(1265, 115, 1265, 470),
      lg.seg(1265, 790, 1265, 1160),
      lg.seg(1265, 1160, 230, 1160),
      lg.seg(230, 1160, 230, 790),
      lg.seg(230, 470, 230, 115),
    ],
    solids: [
      lg.r(140, 480, 405, 760, "Elevators"),
      { ...lg.r(405, 465, 560, 760, "AV / tech"), note: "The gallery's own AV and tech room." },
      lg.r(650, 465, 830, 810, "Restrooms"),
      lg.r(830, 500, 930, 800),
      lg.r(930, 465, 1360, 805, "Elevators 27–48"),
    ],
    rooms: [{ ...lg.r(240, 820, 565, 1150, "Catering prep"), note: "375 sq ft of catering prep, behind the scenes." }],
    zones: {
      gallery: [lg.r(530, 215, 1255, 450), lg.r(580, 815, 1255, 1150)],
      facingWall: [lg.r(520, 215, 1150, 450)],
    },
    fixed: {
      bars: [lg.r(1165, 262, 1205, 350, "Bar"), lg.r(1100, 865, 1185, 905, "Bar")],
      screen: lg.seg(725, 462, 1025, 462),
      marks: [{ ...lg.r(605, 170, 890, 205, "Chef stations"), note: "Chef stations along the Washington Street windows." }, lg.r(265, 265, 300, 350, "DJ"), lg.r(308, 197, 512, 438, "Lounge")],
    },
    streets,
    finish: "ash",
    decor: {
      lounges: [lg.r(318, 210, 502, 425)],
      counters: [lg.r(620, 179, 875, 196)],
      // Pieces on plinths along the windows, and framed work on panels against the core
      plinths: [lg.r(935, 140, 975, 172), lg.r(1065, 140, 1105, 172), lg.r(1195, 140, 1235, 172), lg.r(660, 1112, 700, 1144), lg.r(900, 1112, 940, 1144), lg.r(1140, 1112, 1180, 1144)],
      art: [lg.seg(1040, 453, 1245, 453), lg.seg(665, 822, 815, 822), lg.seg(950, 822, 1100, 822)],
      plants: [lg.p(245, 130), lg.p(1250, 130), lg.p(1250, 1145), lg.p(245, 455), lg.p(580, 1145)],
    },
  },
  setups: { reception: { max: 120, zone: "gallery" }, banquet: { max: 80, zone: "gallery" }, theater: { max: 110, zone: "facingWall" } },
  illustrative: true,
};

export const layouts = {
  "sky-bar": skyBar,
  "bay-lounge": bayLounge,
  sandbox,
  "redwood-park": redwoodPark,
  "legacy-gallery": legacyGallery,
};
