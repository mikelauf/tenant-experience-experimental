import type { Photo } from "../types";

/**
 * The Meridian is fictional and has no photography yet. These are neutral interiors borrowed
 * from the Pyramid set, chosen because nothing in them says San Francisco. Prompts for real
 * Meridian imagery are in docs/image-prompts.md.
 */
const p = (src: string, alt: string, pos?: string): Photo => ({ src: `/images/${src}.webp`, alt, source: "placeholder", pos });

export const images = {
  /* The Lantern Room (L40) */
  lanternBar: p("venues/club-bar", "A walnut bar with brass stools and backlit shelving in the Lantern Room", "50% 55%"),
  lanternLounge: p("venues/sky-lounge", "Armchairs and tables in the Lantern Room, walled with oak shelving", "50% 60%"),
  lanternRound: p("venues/bay-lounge-round", "A circular seating island on a woven rug beneath the lantern's windows", "50% 60%"),
  lanternCoffee: p("venues/bay-lounge-bar", "The Lantern Room coffee bar and lounge seating", "50% 55%"),
  talk: p("programming/talk", "A speaker addressing an audience at dusk, seen from the back of the room", "50% 50%"),

  /* The Great Hall (L1) */
  hallColonnade: p("building/colonnade", "People walking between the Great Hall's sculpted concrete columns", "45% 55%"),
  hallLounge: p("building/lobby-lounge", "Lounge chairs gathered around a column in the Great Hall", "50% 60%"),
  hallDesk: p("building/lobby-desk", "The pale stone concierge desk under the Great Hall's coffered oak ceiling", "50% 60%"),
  hallTheater: p("venues/montgomery-hall", "The Great Hall set in theater rows in morning daylight", "50% 55%"),
  hallCoffee: p("building/lobby-coffee", "Baristas at the stone coffee bar off the Great Hall", "50% 55%"),

  /* Rooms */
  huddle: p("spaces/huddle", "Two colleagues talking over coffee in a small meeting room", "50% 40%"),
  boardroom: p("spaces/boardroom", "A walnut boardroom table with city views", "50% 50%"),
  boardroomReal: p("spaces/boardroom-real", "A boardroom with a long oak table, leather chairs and a wall display", "55% 55%"),

  /* Programming */
  cupping: p("programming/cupping", "A roaster pours water over rows of cupping bowls on a walnut bar", "50% 45%"),
  archive: p("building/history-gallery", "Archival photographs of the building's construction along dark gallery walls", "50% 50%"),
} satisfies Record<string, Photo>;
