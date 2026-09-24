import type { Img } from "./types";

/**
 * Every photo in the prototype, in one place.
 * `source`: "building" = transamericapyramid.com, "staging" = Playbook's public staging site, "bloom" = generated.
 * Swap a file or a focal point here and it changes everywhere.
 */
type Photo = Img & { source: "building" | "staging" | "bloom" };

const p = (src: string, alt: string, source: Photo["source"], pos?: string): Photo => ({ src: `/images/${src}.webp`, alt, source, pos });

export const images = {
  /* The building */
  aerialGolden: p("building/aerial-golden", "The Pyramid rising above the Financial District at golden hour, the Golden Gate and Marin beyond", "building", "54% 42%"),
  aerialBay: p("building/aerial-bay", "Aerial view of the Financial District with the Pyramid, the Bay Bridge and the bay", "building", "50% 55%"),
  pyramidDusk: p("building/pyramid-dusk", "The Pyramid rising above the redwoods at blue hour, with fog drifting past the spire", "bloom", "62% 40%"),
  lobbyCoffee: p("building/lobby-coffee", "Baristas at the travertine coffee bar in the Pyramid's lobby", "building", "50% 55%"),
  lobbyDesk: p("building/lobby-desk", "The lobby's pale stone desk under the diamond-grid oak ceiling", "building", "50% 60%"),
  colonnade: p("building/colonnade", "People walking through the lobby's sculptural concrete colonnade", "building", "45% 55%"),
  lobbyLounge: p("building/lobby-lounge", "Lounge chairs gathered around a column in the Pyramid lobby", "building", "50% 60%"),
  historyGallery: p("building/history-gallery", "The Pyramid's history gallery, with archival photographs along dark walls", "building", "50% 50%"),
  artStratagems: p("building/art-stratagems", "Tara Donovan's sculptural columns installed in the Pyramid's glass pavilion", "building", "55% 50%"),
  siteMap: p("building/site-map", "Site plan of the Pyramid block: Montgomery, Washington, Sansome and Clay streets, with Redwood Park at the center", "building", "50% 50%"),

  /* Bay Lounge (Level 27) */
  bayDay: p("venues/bay-lounge-day", "Bay Lounge by day: curved channel-tufted sofas beneath tall windows looking out to Coit Tower and the bay", "building", "18% 72%"),
  bayDusk: p("venues/bay-lounge-dusk", "Bay Lounge at blue hour, a round rug and lounge chairs facing Coit Tower through the windows", "building", "50% 55%"),
  bayCoit: p("venues/bay-lounge-coit", "Window tables in the Bay Lounge overlooking Telegraph Hill and Coit Tower", "staging", "50% 45%"),
  bayRound: p("venues/bay-lounge-round", "The Bay Lounge's circular seating island on a woven rug", "staging", "50% 60%"),
  bayBar: p("venues/bay-lounge-bar", "The Bay Lounge coffee bar and lounge seating with city views", "staging", "50% 55%"),
  baySofas: p("venues/bay-lounge-sofas", "Long curved sofas in the Bay Lounge with views over North Beach", "building", "50% 60%"),
  skyLounge: p("venues/sky-lounge", "Tables and armchairs in the upper lounge, walled with oak shelving", "building", "50% 60%"),
  clubBar: p("venues/club-bar", "A walnut bar with brass stools and backlit shelving", "building", "50% 55%"),
  bayGolden: p("venues/bay-lounge", "A high-floor lounge at golden hour with the Bay Bridge beyond", "bloom", "50% 55%"),
  bayReception: p("venues/bay-lounge-evening", "Guests at an evening reception in the Bay Lounge, city lights behind them", "bloom", "50% 45%"),

  /* Redwood Park */
  redwoodFountain: p("venues/redwood-fountain", "Redwood Park's fountain and oak benches under the redwood canopy", "building", "50% 60%"),
  redwoodKiosk: p("venues/redwood-kiosk", "Morning sun through the redwoods onto the park's kiosk and plantings", "building", "50% 55%"),
  redwoodSky: p("venues/redwood-sky", "Looking up through a timber art installation in Redwood Park to the Pyramid", "building", "50% 40%"),
  redwoodPlaza: p("venues/redwood-plaza", "The fountain at the foot of the Pyramid, framed by redwoods", "building", "50% 55%"),
  redwoodPath: p("venues/redwood-path", "A stone path through the redwood grove toward the fountain", "building", "50% 55%"),
  redwoodEvening: p("venues/redwood-park", "Redwood Park set for an evening event, string lights between the trunks", "bloom", "50% 60%"),

  /* Rooms and conference */
  boardroomReal: p("spaces/boardroom-real", "A boardroom with a long oak table, leather chairs and a wall display beneath a sculpted ceiling", "building", "55% 55%"),
  boardroom: p("spaces/boardroom", "A walnut boardroom table with Financial District views", "bloom", "50% 50%"),
  huddle: p("spaces/huddle", "Two colleagues talking over coffee in a small meeting room", "bloom", "50% 40%"),
  montgomeryHall: p("venues/montgomery-hall", "Montgomery Hall set in theater rows in morning daylight", "bloom", "50% 55%"),

  /* Fitness */
  gym: p("fitness/gym", "Pyramid Fitness: cardio and strength equipment facing the city through a glass entry", "building", "50% 55%"),
  strength: p("fitness/strength", "A coach corrects a member's kettlebell form during Strength 45", "bloom", "50% 40%"),
  ride: p("fitness/ride", "Riders mid-class in the amber-lit Ride studio", "bloom", "50% 50%"),
  recovery: p("fitness/recovery", "The recovery lounge's cold plunge and cedar sauna", "bloom", "50% 50%"),

  /* Programming and people */
  cupping: p("programming/cupping", "A roaster pours water over rows of cupping bowls on the walnut bar", "bloom", "50% 45%"),
  talk: p("programming/talk", "A speaker talk in the Bay Lounge at dusk, the audience seen from behind", "bloom", "50% 50%"),
  host: p("people/host", "Inés Calderón, the Pyramid's events lead, in the Bay Lounge", "bloom", "50% 28%"),
} satisfies Record<string, Photo>;

export type ImageKey = keyof typeof images;
