import { tap } from "./tap";
import type { Img, Venue } from "@/lib/data/types";

/**
 * The five Transamerica venues, as the building presents them. Facts, taglines and amenities come from the
 * building's booklet (notes/TransamericaPyramid_Booklet.pdf, July 2026), which wins where older sources
 * disagree; conflicts are logged in docs/tap-feedback/07-booklet-content.md. Summaries and photo captions
 * come from Tenant Experience's reviewed content pack.
 *
 * `minBudget` is a placeholder ($10k, the building's stated floor) until the events team sets real
 * minimums per space in OS. It is never shown publicly.
 */

const shot = (id: keyof typeof tap, caption: string): Img => ({ ...tap[id], caption });

const indoorRequired = { title: "Required services", items: ["Janitorial service", "HVAC"], note: "Listed separately from venue facilities." };
const PLACEHOLDER_MIN_BUDGET = 10_000;
const plan = (file: string, label: string, alt: string, guests?: number) => ({
  src: `/images/tap/plans/${file}.webp`,
  alt,
  label,
  guests,
});
const indoorAvailable = ["Catering partners", "DJ or live music", "Additional security", "Furniture rental", "Podium or lectern"];

const skyBar = [
  shot("tap-7344408fc8", "Meet me at the bar."),
  shot("tap-267559de18", "Gather around the table."),
  shot("tap-8125719fc3", "Your table above the city."),
  shot("tap-77243742bc", "Settle in by the skyline."),
  shot("tap-c7f3eb45d2", "Make an evening of it."),
  shot("booklet-skybar-lounge", "Window-side seating."),
];
const bayLounge = [
  shot("tap-2ef8d72b6d", "Bring everyone together."),
  shot("tap-7c5a65183f", "Take a seat by the bay."),
  shot("tap-e1c1d016c2", "Start with a coffee."),
  shot("tap-23e01879b4", "Gather, then break into groups."),
  shot("tap-4ee89c2c17", "Find a corner for conversation."),
];
const sandbox = [
  shot("tap-ebffdd1c2d", "Put your ideas on the table."),
  shot("tap-f1cfbe5b90", "Give your next idea a stage."),
  shot("tap-8f918747d5", "Make room for something new."),
  shot("tap-45267c1d07", "Keep the conversation going."),
  shot("tap-1fd88aa5c1", "Behind every gathering."),
  shot("booklet-sandbox-floor", "An open floor, ready for anything."),
];
const legacyGallery = [shot("booklet-legacy-gallery", "A window into history."), shot("booklet-legacy-models", "The designs that came before.")];
const redwoodPark = [
  shot("tap-3fd70cd176", "Gather beneath the redwoods."),
  shot("tap-22f669475f", "Take the conversation outside."),
  shot("tap-dd2bfca670", "Step into the trees."),
  shot("tap-8038adf795", "Set the stage outdoors."),
  shot("tap-1c47164e32", "A pause by the fountain."),
];

export const venues: Venue[] = [
  {
    slug: "sky-bar",
    name: "Sky Bar",
    level: 48,
    levelLabel: "Level 48",
    kind: "Skyline lounge & bar",
    tagline: "Above all, beyond standard.",
    summary:
      "Perched at the very top of the city's most recognized skyline, extraordinarily curated and considered in every detail. An intimate, refined setting with 360° views, for the kind of evening that stays with people long after it ends.",
    story: [],
    capacity: 80,
    sqft: 2100,
    facts: [
      { label: "Capacity", value: "Up to 80 guests", note: "Larger receptions may require changes to the central furniture." },
      { label: "Area", value: "2,100 sq ft" },
      { label: "Views", value: "360° panoramic views of San Francisco" },
    ],
    features: [
      { icon: "view", label: "360° panoramic views" },
      { icon: "chair", label: "Curated velvet lounge seating" },
      { icon: "glass", label: "Full bar with velvet-back bar stools" },
      { icon: "sun", label: "Programmable ambient lighting" },
      { icon: "music", label: "Ceiling sound system with Spotify connectivity" },
      { icon: "coffee", label: "Separate catering prep area" },
      { icon: "access", label: "Two gender-neutral restrooms" },
      { icon: "lock", label: "Exclusive floor access" },
    ],
    services: [
      { title: "Available services", items: ["Catering partners", "DJ or live music", "Additional security", "Furniture rental", "Private elevator access by arrangement"] },
      indoorRequired,
    ],
    policies: ["Central furniture removal carries an additional fee. Setup and capacity depend on the event format."],
    goodFor: ["Milestone celebrations", "VIP receptions", "Executive dinners", "Luxury brand activations", "Investor receptions", "Film & photo shoots"],
    hero: skyBar[0],
    gallery: skyBar,
    views: [
      {
        ...shot("booklet-skybar-bar-view", "North, over the bay from the bar"),
        ratio: 1548 / 2000,
        bearing: 335,
        tags: [
          { label: "Alcatraz", x: 39, y: 61 },
          { label: "Angel Island", x: 74, y: 56 },
        ],
      },
      {
        ...shot("tap-77243742bc", "Southeast, from the window seats"),
        ratio: 2000 / 1500,
        bearing: 135,
        tags: [
          { label: "Salesforce Tower", x: 78.5, y: 30 },
          { label: "Bay Bridge", x: 15, y: 52 },
        ],
      },
    ],
    viewBearing: 335,
    floorPlans: [plan("sky-bar", "Lounge", "Sky Bar floor plan: a central bar with lounge seating along the Washington and Clay Street windows, pantry and restrooms at either end.", 80)],
    minBudget: PLACEHOLDER_MIN_BUDGET,
    layout: { plate: { w: 16.8, d: 11.6, windows: "wrap" }, capacities: { reception: 80, banquet: 48, lounge: 50 }, illustrative: true },
  },
  {
    slug: "bay-lounge",
    name: "Bay Lounge",
    level: 27,
    levelLabel: "Level 27",
    kind: "Private lounge floor",
    tagline: "A space unlike any other.",
    summary:
      "A private floor above the city. Sweeping skyline views and a setting that moves as naturally from a working session to an evening reception as the light across the bay.",
    story: [
      "A coffee bar, modular sofas and smaller seating areas give the floor a range of gathering places. Use the setting for a shared session, then continue the conversation in smaller groups.",
    ],
    capacity: 130,
    sqft: 3020,
    facts: [
      { label: "Capacity", value: "Up to 130 guests" },
      { label: "Area", value: "3,020 sq ft" },
      { label: "Views", value: "Panoramic skyline, including Coit Tower" },
    ],
    features: [
      { icon: "view", label: "Panoramic views including Coit Tower" },
      { icon: "chair", label: "Modular lounge furniture for sectional setups" },
      { icon: "coffee", label: "Pantry kitchen with full-size refrigerators" },
      { icon: "access", label: "Four gender-neutral restrooms (2 ADA)" },
      { icon: "wifi", label: "High-speed Wi-Fi" },
    ],
    services: [{ title: "Available services", items: [...indoorAvailable, "Portable AV with microphones and speakers"] }, indoorRequired],
    policies: ["The lounge is open to building tenants during the day; private events are held after hours, considered case by case."],
    goodFor: ["Executive retreats & offsites", "Investor receptions", "Private dinners", "Cultural salons", "Milestone events", "Awards & recognition"],
    hero: bayLounge[0],
    gallery: bayLounge,
    views: [
      {
        ...shot("tap-7c5a65183f", "North, over Telegraph Hill to the bay"),
        ratio: 2000 / 1500,
        bearing: 345,
        tags: [
          { label: "Coit Tower", x: 33.4, y: 33 },
          { label: "Alcatraz", x: 15.5, y: 38 },
        ],
      },
      {
        ...shot("tap-2ef8d72b6d", "The lounge, looking north"),
        ratio: 2000 / 1331,
        bearing: 345,
        tags: [
          { label: "Coit Tower", x: 34, y: 46 },
          { label: "Alcatraz", x: 22.5, y: 50 },
        ],
      },
    ],
    viewBearing: 345,
    floorPlans: [
      plan(
        "bay-lounge",
        "Lounge floor",
        "Bay Lounge floor plan: lounge seating and a coffee bar along Washington Street, the elevator core in the middle, and the Foster and Pereira rooms along Clay Street.",
        130,
      ),
    ],
    minBudget: PLACEHOLDER_MIN_BUDGET,
    layout: { plate: { w: 21.5, d: 13.05, windows: "wrap" }, capacities: { reception: 130, banquet: 72, theater: 90, lounge: 60 }, illustrative: true },
  },
  {
    slug: "sandbox",
    name: "The Sandbox",
    level: 3,
    levelLabel: "Level 3",
    kind: "Flexible event floor",
    tagline: "A stage that transforms.",
    summary:
      "A floor that reshapes itself entirely around your vision. Industrial in character, electric in energy: a versatile space for conferences, corporate gatherings and breakout sessions. No two events look the same here.",
    story: [],
    capacity: 300,
    sqft: 14800,
    facts: [
      { label: "Capacity", value: "Up to 300 guests", note: "Theater style for 100, or a cocktail reception for 200." },
      { label: "Area", value: "14,800 sq ft", note: "Across the floor, not an individual room." },
      { label: "Setting", value: "Flexible event floor" },
    ],
    features: [
      { icon: "screen", label: "Large projection screen & projector" },
      { icon: "video", label: "Two 86-inch portable screens" },
      { icon: "mic", label: "AV package: 2 wireless mics + 2 speakers" },
      { icon: "people", label: "Podium & lectern" },
      { icon: "chair", label: "Black highboy tables & director chairs" },
      { icon: "coffee", label: "Catering prep area with sink & refrigerator" },
      { icon: "access", label: "Dedicated men's and women's restrooms" },
      { icon: "wifi", label: "High-speed Wi-Fi" },
    ],
    services: [{ title: "Available services", items: [...indoorAvailable, "Additional microphones and speakers"] }, indoorRequired],
    policies: ["Use of Redwood Park is a separate event-planning arrangement."],
    goodFor: ["Conferences & summits", "Hackathons", "Product launches", "Brand activations", "Executive offsites", "Multi-session formats"],
    hero: sandbox[0],
    gallery: sandbox,
    floorPlans: [
      plan("sandbox-theater", "Theater", "The Sandbox set theater style for 100, with a bar, check-in and round tables toward Clay Street.", 100),
      plan("sandbox-cocktail", "Cocktail", "The Sandbox set for a cocktail reception of 200, with two bars along Washington Street.", 200),
    ],
    minBudget: PLACEHOLDER_MIN_BUDGET,
    layout: { plate: { w: 30, d: 18, windows: "east" }, capacities: { theater: 100, reception: 200 } },
  },
  {
    slug: "redwood-park",
    name: "Transamerica Redwood Park",
    level: 0,
    levelLabel: "Street level",
    kind: "Outdoor redwood park",
    tagline: "A living landmark.",
    summary:
      "Fifty coastal redwoods stand at the base of the city's most iconic building, turning the ground level into a destination, open to the city and reserved for you. A performance stage, lounge areas and a kiosk bar, available as a full venue or in sections.",
    story: [],
    capacity: 1500,
    sqft: 18000,
    facts: [
      { label: "Capacity", value: "Up to 1,500 guests", note: "Event capacity and access depend on the proposed use." },
      { label: "Area", value: "18,000 sq ft" },
      { label: "Access", value: "Clay Street, Washington Street & Mark Twain Alley" },
    ],
    features: [
      { icon: "tree", label: "50 Santa Cruz coastal redwoods" },
      { icon: "music", label: "Performance stage built from redwood" },
      { icon: "moon", label: "Ambient evening string lights" },
      { icon: "glass", label: "Kiosk bar" },
      { icon: "star", label: "Shuffleboard and ping pong" },
      { icon: "chair", label: "Curated lounge and seating areas" },
      { icon: "bolt", label: "Power for production and activations" },
      { icon: "pin", label: "Loading and vendor access" },
    ],
    services: [
      { title: "Available services", items: ["Catering partners", "Music and AV", "Additional security", "Furniture rental", "Food trucks and portable restrooms"] },
      { title: "Required services", items: ["Janitorial service"], note: "Outdoor event requirements need confirmation for the proposed use." },
    ],
    policies: [],
    goodFor: ["Concerts & live performances", "Outdoor soirées", "Brand activations", "Product launches", "Holiday & seasonal events", "Film & photo shoots"],
    hero: redwoodPark[0],
    gallery: redwoodPark,
    floorPlans: [
      plan(
        "redwood-park",
        "Site plan",
        "Site plan of the Pyramid block: the park east of the tower, with the bar and food trucks on Washington Street, guest check-in at Mark Twain Alley off Sansome Street, and Two and Three Transamerica beside it.",
        1500,
      ),
    ],
    minBudget: PLACEHOLDER_MIN_BUDGET,
  },
  {
    slug: "legacy-gallery",
    name: "Legacy Gallery",
    level: 36,
    levelLabel: "Level 36",
    kind: "Gallery & event space",
    tagline: "A window into history.",
    summary:
      "A curated gallery and event space in one. The walls narrate San Francisco's history and the Pyramid's own, the windows frame the city today, and the space elevates everything that happens within it.",
    story: [],
    capacity: 120,
    sqft: 5800,
    facts: [
      { label: "Capacity", value: "Up to 120 guests" },
      { label: "Area", value: "5,800 sq ft" },
      { label: "Setting", value: "Gallery & event space" },
    ],
    features: [
      { icon: "star", label: "Permanent gallery: San Francisco & Pyramid history" },
      { icon: "screen", label: "36:9 LED screen" },
      { icon: "music", label: "Ceiling sound system with Spotify connectivity" },
      { icon: "sun", label: "Programmable lighting & adjustable blinds" },
      { icon: "mic", label: "AV package: 2 wireless mics + 2 speakers" },
      { icon: "coffee", label: "Small event pantry" },
      { icon: "access", label: "Two gender-neutral restrooms (1 ADA)" },
      { icon: "lock", label: "Exclusive floor access" },
    ],
    services: [{ title: "Available services", items: [...indoorAvailable] }, indoorRequired],
    policies: [],
    goodFor: ["VIP entertaining", "Investor receptions", "Gallery openings", "Private press events", "Speaking panels", "Seated dinners"],
    hero: legacyGallery[0],
    gallery: legacyGallery,
    viewBearing: 300,
    floorPlans: [
      plan(
        "legacy-gallery",
        "Reception",
        "Legacy Gallery floor plan: a reception floor along Washington Street with chef stations, bars, a DJ and an LED wall, and catering prep toward Clay Street.",
        120,
      ),
    ],
    minBudget: PLACEHOLDER_MIN_BUDGET,
    layout: { plate: { w: 26, d: 20.7, windows: "wrap" }, capacities: { reception: 120, banquet: 80, theater: 110 }, illustrative: true },
  },
];
