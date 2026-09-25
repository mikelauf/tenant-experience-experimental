import { images } from "./images";
import type { Venue, VenueTag } from "@/lib/data/types";

const img = images;

export const venueTags: { id: VenueTag; label: string }[] = [
  { id: "views", label: "Bay views" },
  { id: "outdoor", label: "Outdoors" },
  { id: "evening", label: "Evening events" },
  { id: "daylight", label: "Daylight" },
  { id: "catering", label: "Catering-ready" },
  { id: "av", label: "Full AV" },
  { id: "private", label: "Fully private" },
];

export const venues: Venue[] = [
  {
    slug: "bay-lounge",
    name: "Bay Lounge",
    level: 27,
    levelLabel: "Level 27",
    kind: "Indoor lounge",
    tagline: "Twenty-seven floors up, with Coit Tower and the bay in every window.",
    summary:
      "A hospitality lounge of curved, channel-tufted sofas, oak and warm plaster, with tall windows over Telegraph Hill and the bay. Built for receptions, launches and evenings that should feel like a host's living room.",
    story: [
      "The lounge looks north across North Beach to Coit Tower and the water, so the light changes all evening, from bright bay daylight to blue hour and the city switching on.",
      "Furniture moves. Keep the sofas for a lounge feel, or clear the floor for a standing reception with bar service along the windows.",
    ],
    capacities: { reception: 130, banquet: 72, theater: 90, lounge: 60 },
    sqft: 3400,
    features: [
      { icon: "view", label: "Views to Coit Tower and the bay", detail: "Tall windows along two sides of the room" },
      { icon: "glass", label: "Coffee and cocktail bar", detail: "Staffed bar service through approved caterers" },
      { icon: "mic", label: "Built-in sound", detail: "Two wireless mics and a discreet speaker array" },
      { icon: "screen", label: "Presentation display", detail: "86-inch screen on a rolling stand" },
      { icon: "chair", label: "Flexible furniture", detail: "Sofas, lounge chairs and high-tops that re-set" },
      { icon: "access", label: "Step-free access", detail: "Dedicated elevator bank from the lobby" },
    ],
    goodFor: ["Receptions", "Product launches", "Panels & talks", "Holiday parties", "Client dinners"],
    tags: ["views", "evening", "catering", "av", "private"],
    hero: img.bayDay,
    gallery: [img.bayDay, img.bayDusk, img.bayReception, img.bayCoit, img.bayRound, img.baySofas, img.bayBar, img.talk, img.clubBar],
    hostId: "ines",
    plate: { w: 24.2, d: 13.05, windows: "wrap" },
  },
  {
    slug: "redwood-park",
    name: "Redwood Park",
    level: 0,
    levelLabel: "Street level",
    kind: "Outdoor grove",
    tagline: "A half-acre of coast redwoods in the middle of the Financial District.",
    summary:
      "The grove at the foot of the tower: mature redwoods, stone paths and a fountain, lit with string lights after dark. For summer evenings, community gatherings and a reception people will remember.",
    story: [
      "The redwoods were brought here as saplings when the tower opened. They're now some of the tallest trees downtown, and the grove stays cool and quiet even at rush hour.",
      "Evening events use the lawn and the fountain plaza. There's a covered rain plan in the lobby.",
    ],
    capacities: { reception: 220, banquet: 120 },
    sqft: 21000,
    features: [
      { icon: "tree", label: "Mature redwood grove", detail: "Shade and a canopy that glows at night" },
      { icon: "moon", label: "Evening lighting", detail: "String lights and path lighting included" },
      { icon: "music", label: "Acoustic sets welcome", detail: "Amplified sound until 9pm" },
      { icon: "table", label: "Long-table dining", detail: "Tables and linens through our partners" },
      { icon: "shield", label: "Rain plan", detail: "Lobby hold available for outdoor dates" },
    ],
    goodFor: ["Summer receptions", "Community gatherings", "Team celebrations", "Long-table dinners"],
    tags: ["outdoor", "evening", "catering"],
    hero: img.redwoodFountain,
    gallery: [img.redwoodFountain, img.redwoodKiosk, img.redwoodEvening, img.redwoodSky, img.redwoodPlaza, img.redwoodPath],
    hostId: "ines",
    plate: { w: 52.3, d: 37.3, windows: "none", outdoor: true },
  },
  {
    slug: "montgomery-hall",
    name: "Montgomery Hall",
    level: 5,
    levelLabel: "Level 5",
    kind: "Conference hall",
    tagline: "A daylight hall for the day your whole team needs to be in one room.",
    summary:
      "A column-free conference hall with pale oak floors, acoustic felt and tall windows. It sets for theater rows, classroom tables or banquet rounds, with breakout rooms next door.",
    story: [
      "Designed for full-day offsites: the hall, two breakout rooms and a coffee pre-function area share a private corridor.",
      "Our team runs the day with you, from AV checks at 7am to lunch service and the evening turnover.",
    ],
    capacities: { theater: 160, classroom: 84, banquet: 110, reception: 180 },
    sqft: 4200,
    features: [
      { icon: "sun", label: "Natural daylight", detail: "Tall windows with blackout shades" },
      { icon: "screen", label: "Dual projection", detail: "Two 4K projectors and confidence monitor" },
      { icon: "video", label: "Hybrid-ready", detail: "PTZ camera and room mics for streaming" },
      { icon: "coffee", label: "Pre-function coffee", detail: "Coffee and pastry service from 8am" },
      { icon: "people", label: "Breakout rooms", detail: "Two rooms for 12 next door" },
      { icon: "wifi", label: "Dedicated network", detail: "Event Wi-Fi with a custom network name" },
    ],
    goodFor: ["Offsites", "Town halls", "Trainings", "Conferences", "Seated lunches"],
    tags: ["daylight", "av", "catering", "private"],
    hero: img.montgomeryHall,
    gallery: [img.montgomeryHall, img.boardroomReal, img.colonnade, img.lobbyCoffee, img.lobbyLounge, img.lobbyDesk],
    hostId: "ines",
    plate: { w: 25.5, d: 15.3, windows: "north" },
  },
];
