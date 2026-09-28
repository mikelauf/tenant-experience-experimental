import type { Photo } from "../types";

/**
 * Transamerica's own event photography, from transamericaevents.com, selected in
 * Tenant Experience's reviewed media manifest (context/product/transamerica-public-content).
 * Keys keep the manifest ids so every file traces back to its source and review status.
 * Usage confirmation for this set is still pending with the building; see docs/production-roadmap.md.
 */
const p = (id: string, alt: string, caption: string, pos: string): Photo & { caption: string } => ({
  src: `/images/tap/${id}.webp`,
  alt,
  caption,
  pos,
  source: "building",
});

export const tap = {
  "tap-8a345d4546": p("tap-8a345d4546", "The Transamerica Pyramid rises above San Francisco with the bay in the distance.", "Transamerica Pyramid", "50% 25%"),
  "tap-267559de18": p("tap-267559de18", "Dining tables arranged around the central bar at Sky Bar.", "Dining around the bar", "50% 50%"),
  "tap-22f669475f": p("tap-22f669475f", "Outdoor lounge seating facing a kiosk at Transamerica Redwood Park.", "Seating in the park", "50% 50%"),
  "tap-8f781df493": p("tap-8f781df493", "The Transamerica Pyramid\u2019s windowed facade beside San Francisco rooftops and the bay.", "The Pyramid and the city", "50% 60%"),
  "tap-7344408fc8": p("tap-7344408fc8", "Bar stools and lounge chairs beneath the coffered ceiling at Sky Bar.", "The bar at Sky Bar", "50% 50%"),
  "tap-77243742bc": p("tap-77243742bc", "Lounge chairs beside tall windows at Sky Bar.", "Window-side seating", "50% 50%"),
  "tap-8125719fc3": p("tap-8125719fc3", "Tables and upholstered chairs beside Sky Bar\u2019s windows overlooking the city.", "Tables with city views", "50% 50%"),
  "tap-c7f3eb45d2": p("tap-c7f3eb45d2", "A view along Sky Bar\u2019s counter toward the lounge seating and windows.", "Bar and lounge", "50% 50%"),
  "tap-575159c961": p("tap-575159c961", "Glassware and flowers on a table beside upholstered seating at Sky Bar.", "A table at Sky Bar", "50% 50%"),
  "tap-2ef8d72b6d": p("tap-2ef8d72b6d", "Curved sofas and low tables facing the bay through Bay Lounge\u2019s windows.", "Bay Lounge", "50% 50%"),
  "tap-7c5a65183f": p("tap-7c5a65183f", "Small tables and armchairs beside Bay Lounge\u2019s bay-facing windows.", "Seats by the bay", "50% 50%"),
  "tap-23e01879b4": p("tap-23e01879b4", "Curved modular sofas arranged across the Bay Lounge floor.", "Room to gather", "50% 50%"),
  "tap-e1c1d016c2": p("tap-e1c1d016c2", "The coffee bar and seating area at Bay Lounge with city views beyond.", "Coffee bar and seating", "50% 50%"),
  "tap-4ee89c2c17": p("tap-4ee89c2c17", "A table and armchairs in front of the coffee bar at Bay Lounge.", "A smaller gathering area", "50% 50%"),
  "tap-8f918747d5": p("tap-8f918747d5", "An open event area at The Sandbox with exposed ceilings and diagonal window columns.", "The Sandbox", "50% 50%"),
  "tap-1fd88aa5c1": p("tap-1fd88aa5c1", "A kitchen preparation counter and refrigerators at The Sandbox.", "Preparation area", "50% 50%"),
  "tap-f1cfbe5b90": p("tap-f1cfbe5b90", "Rows of chairs facing presentation screens at The Sandbox.", "A presentation setup", "50% 50%"),
  "tap-ebffdd1c2d": p("tap-ebffdd1c2d", "Round tables arranged in an event area at The Sandbox.", "Tables for group sessions", "50% 50%"),
  "tap-45267c1d07": p("tap-45267c1d07", "Sofas and a low table beside The Sandbox\u2019s diagonal windows.", "A place for smaller conversations", "50% 50%"),
  "tap-3fd70cd176": p("tap-3fd70cd176", "Paths, benches and a fountain beneath the trees at Transamerica Redwood Park.", "Transamerica Redwood Park", "50% 50%"),
  "tap-dd2bfca670": p("tap-dd2bfca670", "A paved path between redwood trees at Transamerica Redwood Park.", "Among the redwoods", "50% 50%"),
  "tap-1c47164e32": p("tap-1c47164e32", "A fountain and surrounding planting beneath the redwoods.", "The fountain", "50% 50%"),
  "tap-8038adf795": p("tap-8038adf795", "A raised platform framed by trees at Transamerica Redwood Park.", "A stage among the trees", "50% 50%"),

  /* From the building's booklet (notes/TransamericaPyramid_Booklet.pdf, July 2026). Real photography only;
     the booklet's event scenes with people are AI renders and are deliberately left out. */
  "booklet-legacy-gallery": p("booklet-legacy-gallery", "A black scale model of the Pyramid on a plinth in the Legacy Gallery, archival photographs on the walls.", "The Legacy Gallery", "50% 55%"),
  "booklet-legacy-models": p("booklet-legacy-models", "Wooden study models of early tower designs in front of an archival exhibit wall.", "Designs that came before", "45% 50%"),
  "booklet-sandbox-floor": p("booklet-sandbox-floor", "The Sandbox's open floor, with exposed ceilings and the Pyramid's diagonal columns at the windows.", "The open floor", "50% 55%"),
  "booklet-skybar-bar-view": p("booklet-skybar-bar-view", "The Sky Bar counter and velvet stools, with Alcatraz and Angel Island through the windows beyond.", "Alcatraz from the bar", "55% 55%"),
  "booklet-skybar-lounge": p("booklet-skybar-lounge", "Velvet lounge chairs and set tables along the Sky Bar windows in afternoon light.", "Window-side seating", "45% 55%"),
} as const;
