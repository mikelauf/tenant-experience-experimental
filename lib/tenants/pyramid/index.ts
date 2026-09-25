import { makeTenant } from "../make";
import type { TenantData } from "../types";
import { events } from "./events";
import { fitness } from "./fitness";
import { images } from "./images";
import { rooms } from "./rooms";
import { venues } from "./venues";

/**
 * Everything that makes this "the Pyramid" rather than any building.
 * Another property is another folder like this one; the product code doesn't change.
 */
const FLOORS = 48;
const BASE_W = 2.9;
const TOP_W = 0.74;
const taper = (floor: number) => BASE_W + (TOP_W - BASE_W) * (floor / (FLOORS - 1));

const data: TenantData = {
  id: "pyramid",
  building: {
    name: "Transamerica Pyramid",
    address: "600 Montgomery Street",
    city: "San Francisco",
    floors: FLOORS,
    heightFt: 853,
    opened: 1972,
    operator: "Playbook",
    concierge: { phone: "(415) 555-0172", email: "hello@pyramid.example", hours: "Weekdays 7am–7pm" },
    services: { spaces: true, fitness: true, programming: true },
    hero: images.aerialGolden,
  },
  theme: { accent: "#9a3f25", deep: "#7c3019", soft: "#f2e2d9", glow: "#d4653f" },
  // A tapered pyramid with its two wings
  mark: {
    paths: [{ d: "M10 0 L10.9 7 L16.5 31 H3.5 L9.1 7 Z" }, { d: "M8.3 12.5 L6.2 21.5 L8 21.5 Z M11.7 12.5 L13.8 21.5 L12 21.5 Z", opacity: 0.55 }],
  },
  tower: {
    floors: FLOORS,
    floorH: 0.2,
    widthAt: taper,
    depthAt: taper,
    crown: { kind: "spire", height: 4.1, radius: 0.5 },
    // Elevator (east) and stair (west) towers from floor 29 to just above the roof
    wings: { from: 29, to: 52 },
    facade: { slits: 28, width: 3.2 / 9 },
    // Redwood Park sits on the east side of the tower
    park: { x: 3.6, z: 0, w: 2.6, d: 3.8, pad: [0.5, 0.7], trees: 26, shape: "cone", yaw: [0.15, 0.85] },
    city: { inner: 3.4, count: 34 },
    restLevel: 27,
    seed: 0,
  },
  levels: [
    { n: 0, label: "Street", place: "Redwood Park", href: "/venues/redwood-park", audience: "both" },
    { n: 1, label: "L1", place: "Lobby & concierge", audience: "both" },
    { n: 2, label: "L2", place: "Pyramid Fitness", href: "/fitness", audience: "member" },
    { n: 5, label: "L5", place: "Montgomery Hall", href: "/venues/montgomery-hall", audience: "both" },
    { n: 6, label: "L6", place: "Meeting rooms", href: "/spaces", audience: "member" },
    { n: 27, label: "L27", place: "Bay Lounge", href: "/venues/bay-lounge", audience: "both" },
    { n: 48, label: "L48", place: "The crown", audience: "public" },
  ],
  people: [
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
  ],
  leadId: "ines",
  member: { first: "Jordan", last: "Ellis", email: "jordan.ellis@northline.example", company: "Northline Capital", floor: "Level 31" },
  venues,
  venueTags: [
    { id: "views", label: "Bay views" },
    { id: "outdoor", label: "Outdoors" },
    { id: "evening", label: "Evening events" },
    { id: "daylight", label: "Daylight" },
    { id: "catering", label: "Catering-ready" },
    { id: "av", label: "Full AV" },
    { id: "private", label: "Fully private" },
  ],
  rooms,
  roomTags: [
    { id: "small", label: "Up to 6" },
    { id: "large", label: "12+" },
    { id: "views", label: "City views" },
    { id: "video", label: "Video calls" },
    { id: "whiteboard", label: "Whiteboard" },
  ],
  fitness,
  events,
  copy: {
    the: "the Pyramid",
    The: "The Pyramid",
    weather: "Fog clearing by noon · 64°F",
    concierge: "L1, by the Montgomery doors",
    memberHero: { img: images.bayDusk, lines: ["Everything the", "Pyramid has,", "in one place."] },
    signInImg: images.lobbyCoffee,
    pitches: {
      spaces: {
        title: "A room when you need one. A team when it's bigger.",
        body: "Book one of four meeting rooms in seconds, or hand a reception, offsite or dinner to our events team.",
        points: ["Four rooms for 4 to 40", "Instant booking for most", "Event planning with Inés"],
        img: images.boardroomReal,
        cta: "Explore spaces",
        access: "Included with your building access",
      },
      events: {
        title: "Things worth leaving your desk for.",
        body: "Tastings, talks and evenings in the grove, hosted by the building for everyone who works here.",
        points: ["Something most weeks", "RSVP in one tap", "Some just for your company"],
        img: images.cupping,
        cta: "See what's on",
        access: "Included with your building access",
      },
    },
    firstWeek: {
      room: { d: "Four rooms, instant for most. Try Clay for a quiet one-on-one.", img: images.huddle },
      event: { d: "The Pyramid at 54 is a great first one.", img: images.historyGallery },
      concierge: { img: images.lobbyDesk },
    },
    spaces: { roomsImg: images.boardroomReal, planImg: images.bayDusk, planHero: images.skyLounge },
    programmingLead: "Tastings, talks and evenings in the grove",
    kickers: { Coffee: "Food & drink", "Speaker series": "Talks", Music: "Music", "Pyramid Arts": "Art" },
    usuals: [
      { id: "ride", label: "Ride", icon: "bike", href: "/fitness/schedule?kind=ride" },
      { id: "strength", label: "Strength 45", icon: "fitness", href: "/fitness/schedule?kind=strength" },
      { id: "washington", label: "Washington boardroom", icon: "spaces", href: "/spaces/washington" },
      { id: "clay", label: "Clay room", icon: "spaces", href: "/spaces/clay" },
    ],
    seed: { room: "washington", event: "the-pyramid-at-54" },
    policies: [
      { icon: "clock", t: "Evening events end by 11pm", d: "Load-in from 2pm on event days; load-out by midnight." },
      { icon: "glass", t: "Approved caterers", d: "Choose from four partner caterers, or bring your own with a kitchen fee." },
      { icon: "shield", t: "Holds and deposits", d: "We hold a date for 7 days while you decide. A deposit confirms it." },
      { icon: "calendar", t: "Changes and cancellation", d: "Full refund up to 60 days out; 50% up to 30 days." },
    ],
    public: {
      title: "Gather at the Pyramid",
      description: "Host your reception, offsite or dinner at the Transamerica Pyramid: Bay Lounge on L27, Redwood Park and Montgomery Hall.",
      heroLines: ["Gather at", "the Pyramid."],
      heroLead:
        "From a redwood grove at street level to a lounge twenty-seven floors up, host the evening people keep talking about, with a team that does this every week.",
      collection: ["Three places to gather,", "from the grove to the 27th floor."],
      hostQuote: "Tell me the feeling you want in the room. I'll figure out the rest.",
      moments: [
        { img: images.bayReception, title: "Launch night for 120", where: "Bay Lounge" },
        { img: images.bayDusk, title: "Blue hour for twenty", where: "Bay Lounge" },
        { img: images.redwoodEvening, title: "A long-table dinner under the trees", where: "Redwood Park" },
        { img: images.talk, title: "A fireside talk at dusk", where: "Bay Lounge" },
        { img: images.artStratagems, title: "A private view in the pavilion", where: "The Pavilion" },
        { img: images.montgomeryHall, title: "An all-hands for 160", where: "Montgomery Hall" },
      ],
      around: [
        { img: images.lobbyCoffee, t: "Coffee in the lobby", d: "Your guests arrive to a travertine coffee bar and a concierge who knows their name." },
        { img: images.colonnade, t: "The colonnade", d: "The tower's sculpted concrete legs frame the walk in from Montgomery Street." },
        { img: images.artStratagems, t: "Art in the pavilion", d: "Rotating installations from Pyramid Arts, open to guests before and after." },
        { img: images.historyGallery, t: "The history gallery", d: "Fifty years of the building, from the drawings to the day it topped out." },
      ],
      aroundLead: "The whole building is part of the welcome, from the lobby coffee bar to the art in the pavilion.",
      gettingHere: [
        { k: "Address", v: "600 Montgomery Street, San Francisco", d: "The full block between Washington and Clay, Montgomery and Sansome." },
        { k: "Transit", v: "8 minutes from Embarcadero", d: "BART and Muni, with cable cars a few blocks south on California Street." },
        { k: "Arrivals", v: "Guest check-in on L1", d: "Our team meets your guests at the lobby desk and rides up with them." },
        { k: "Outdoor events", v: "Enter from Redwood Park", d: "Through the gates on Washington Street or Mark Twain Alley." },
      ],
      siteMap: images.siteMap,
      towerPoster: images.pyramidDusk,
      floorIntro: {
        title: "853 feet. 48 floors. Three places to gather.",
        body: "Scroll up the tower. Each venue sits on its own level, with its own light and its own kind of evening.",
      },
      crown: {
        level: 48,
        readout: "The crown",
        title: "And above it all, the spire.",
        body: "The top 212 feet are a hollow aluminum crown. It's not a venue, but it's lit for the holidays, and you'll see it from the Bay Lounge all evening.",
      },
    },
  },
};

export const pyramid = makeTenant(data);
