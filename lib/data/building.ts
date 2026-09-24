import { images } from "./images";
import type { Img, Level, Person } from "./types";

/**
 * Everything that makes this "the Pyramid" rather than any building.
 * Swap this file (and the content files beside it) to re-skin for another property.
 */
export const building = {
  name: "Transamerica Pyramid",
  short: "The Pyramid",
  address: "600 Montgomery Street",
  city: "San Francisco",
  floors: 48,
  heightFt: 853,
  opened: 1972,
  operator: "Playbook",
  concierge: { phone: "(415) 555-0172", email: "hello@pyramid.example", hours: "Weekdays 7am–7pm" },
  /** Turn services off to see how the product adapts per property. */
  services: { spaces: true, fitness: true, programming: true, publicVenues: true },
  hero: images.aerialGolden as Img,
};

/** The vertical index. Used by the 3D stack and the elevator readout. */
export const levels: Level[] = [
  { n: 0, label: "Street", place: "Redwood Park", href: "/venues/redwood-park", audience: "both" },
  { n: 1, label: "L1", place: "Lobby & concierge", audience: "both" },
  { n: 2, label: "L2", place: "Pyramid Fitness", href: "/fitness", audience: "member" },
  { n: 5, label: "L5", place: "Montgomery Hall", href: "/venues/montgomery-hall", audience: "both" },
  { n: 6, label: "L6", place: "Meeting rooms", href: "/spaces", audience: "member" },
  { n: 27, label: "L27", place: "Bay Lounge", href: "/venues/bay-lounge", audience: "both" },
  { n: 48, label: "L48", place: "The crown", audience: "public" },
];

export const people: Person[] = [
  {
    id: "ines",
    name: "Inés Calderón",
    role: "Events & hospitality lead",
    bio: "Inés has produced everything from 12-person board dinners to 400-guest launches. She'll walk the space with you, sort catering and AV, and be on site the night of.",
    initials: "IC",
    since: "With the Pyramid since 2024",
    image: images.host,
  },
  {
    id: "dev",
    name: "Dev Raman",
    role: "Head coach, Pyramid Fitness",
    bio: "Strength coach and former collegiate rower. Runs Strength 45 and the Thursday run club.",
    initials: "DR",
  },
  {
    id: "mae",
    name: "Mae Okafor",
    role: "Ride & mobility coach",
    bio: "Builds rides around real playlists and good pacing. Teaches mobility for desk bodies.",
    initials: "MO",
  },
  {
    id: "sol",
    name: "Sol Lindqvist",
    role: "Pilates instructor",
    bio: "Classical mat pilates, slow and precise.",
    initials: "SL",
  },
  {
    id: "theo",
    name: "Theo Nakamura",
    role: "Community programming",
    bio: "Books the speakers, the roasters and the music in the park.",
    initials: "TN",
  },
];

export const person = (id: string) => people.find((p) => p.id === id)!;
