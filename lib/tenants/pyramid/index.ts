import { makeTenant } from "../make";
import type { TenantData } from "../types";
import { events } from "./events";
import { fitness } from "./fitness";
import { images } from "./images";
import { rooms } from "./rooms";
import { tap } from "./tap";
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
    // Redwood Park sits on the east side of the tower; its extent is OpenStreetMap's, squared to the grid
    park: {
      x: 2.6,
      z: 0,
      w: 2.6,
      d: 3.9,
      pad: [0.5, 0.7],
      trees: 26,
      shape: "cone",
      yaw: [0.15, 0.85],
      // OpenStreetMap's outline: the park wraps a notch beside the Pyramid's east face
      outline: [
        [3.9, -1.98],
        [3.9, -1.49],
        [3.71, -1.49],
        [3.67, 2],
        [1.52, 1.94],
        [1.29, 1.79],
        [1.29, 1.45],
        [1.45, 1.45],
        [1.45, 0.64],
        [2.08, 0.64],
        [2.08, -0.59],
        [1.45, -0.58],
        [1.45, -1.78],
        [1.68, -1.99],
      ],
    },
    // The real blocks around the tower (scripts/osm-city.mjs); procedural blocks only fill the outskirts beyond them
    realCity: { src: "/data/pyramid-city.json", radius: 14.2 },
    city: { inner: 15.2, count: 170, spread: 7.4, height: 0.55 },
    ground: 23,
    // Downtown's street grid (and the Pyramid, square to it) sits 9.1° west of true north; measured from the streets
    north: -9.1,
    // Landmarks stand in a ring beyond the real neighborhood instead of among its buildings
    landmarkRing: { start: 16.5, perKm: 2.5 },
    restLevel: 27,
    seed: 0,
    // Bearings and distances from 600 Montgomery Street, from each landmark's coordinates.
    landmarks: [
      { name: "Coit Tower", kind: "coit", bearing: 342, km: 0.84 },
      { name: "Saints Peter and Paul Church", kind: "church", bearing: 317, km: 0.98 },
      { name: "Ferry Building", kind: "ferry", bearing: 88, km: 0.8 },
      { name: "Salesforce Tower", kind: "skyscraper", bearing: 141, km: 0.78 },
      { name: "Bay Bridge", kind: "bay-bridge", bearing: 82, km: 2.3, heading: 52 },
      { name: "Alcatraz", kind: "island", bearing: 333, km: 3.9 },
      { name: "Golden Gate Bridge", kind: "golden-gate", bearing: 292, km: 7.2, heading: 12 },
    ],
    // From the booklet's site plan, placed on the real streets (OpenStreetMap): Montgomery St runs at x −2.17,
    // Washington at z −2.54, Clay at z 2.5, Sansome at x 5.58, and Mark Twain Place crosses the park at z 0.
    // One scene unit is 18.8 m.
    pois: [
      {
        id: "lobby",
        label: "Main entrance",
        detail: "600 Montgomery Street, between Washington and Clay",
        x: -1.95,
        z: 0,
        maps: "600 Montgomery St, San Francisco, CA 94111",
      },
      {
        id: "check-in",
        label: "Guest check-in",
        detail: "Redwood Park events: Mark Twain Alley, off Sansome Street",
        x: 5.2,
        z: 0,
        maps: "Mark Twain Alley and Sansome St, San Francisco, CA",
      },
      {
        id: "park-washington",
        label: "Park entrance · Washington St",
        detail: "Into Redwood Park from Washington Street",
        x: 2.4,
        z: -2.2,
        maps: "Transamerica Redwood Park, Washington St, San Francisco, CA",
      },
      {
        id: "park-clay",
        label: "Park entrance · Clay St",
        detail: "Into Redwood Park from Clay Street",
        x: 2.4,
        z: 2.2,
        maps: "Transamerica Redwood Park, Clay St, San Francisco, CA",
      },
      {
        id: "trucks",
        label: "Food trucks",
        detail: "Staged on Washington Street for park events",
        x: 4.7,
        z: -2.8,
        maps: "Washington St and Sansome St, San Francisco, CA",
      },
      { id: "dock", label: "Loading dock", detail: "Location coming with the building's street-level diagrams", x: 0, z: 0, pending: true },
    ],
    // Street names on the real centrelines, a little way along from the corners
    streets: [
      { name: "Montgomery St", x: -2.17, z: 1.35 },
      { name: "Washington St", x: 0.6, z: -2.54 },
      { name: "Clay St", x: 0.6, z: 2.5 },
      { name: "Sansome St", x: 5.58, z: 1.35 },
      { name: "Mark Twain Pl", x: 3.7, z: 0 },
    ],
  },
  levels: [
    { n: 0, label: "Street", place: "Redwood Park", href: "/venues/redwood-park", audience: "both" },
    { n: 1, label: "L1", place: "Lobby & concierge", audience: "both" },
    { n: 2, label: "L2", place: "Pyramid Fitness", href: "/fitness", audience: "member" },
    { n: 3, label: "L3", place: "The Sandbox", href: "/venues/sandbox", audience: "both" },
    { n: 6, label: "L6", place: "Meeting rooms", href: "/spaces", audience: "member" },
    { n: 27, label: "L27", place: "Bay Lounge", href: "/venues/bay-lounge", audience: "both" },
    { n: 36, label: "L36", place: "Legacy Gallery", href: "/venues/legacy-gallery", audience: "both" },
    { n: 48, label: "L48", place: "Sky Bar", href: "/venues/sky-bar", audience: "both" },
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
  // Core building and inquiry source from Tenant Experience's registry and the TAP inquiry draft in OS.
  // The privacy policy version is set when that source is published; until then live inquiries stay off.
  inquiry: { coreBuildingId: "768ca2ed-d07b-4b3c-adec-41ad66a83334", sourceKey: "web_inquiry" },
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
      description:
        "Host your next event at the Transamerica Pyramid: Sky Bar on Level 48, Legacy Gallery on Level 36, Bay Lounge on Level 27, The Sandbox and Transamerica Redwood Park.",
      heroLines: ["Gather at", "the Pyramid."],
      heroLead: "City views, lounge floors and a redwood park. Find a setting for your next event at the Transamerica Pyramid.",
      heroSlides: [
        { ...tap["tap-8a345d4546"], label: "Transamerica Pyramid" },
        { ...tap["tap-7344408fc8"], label: "Sky Bar" },
        { ...tap["tap-2ef8d72b6d"], label: "Bay Lounge" },
        { ...tap["tap-3fd70cd176"], label: "Transamerica Redwood Park" },
      ],
      setting: {
        lines: ["Above the city.", "Among the redwoods."],
        body: "Four indoor venues. A park beneath the redwoods. Five ways to bring people together at one San Francisco address.",
        images: [
          { ...tap["tap-8f781df493"], caption: "The Pyramid and the city" },
          { ...tap["tap-dd2bfca670"], caption: "Among the redwoods" },
        ],
      },
      collection: ["Five places to gather,", "from the redwoods to Level 48."],
      collectionLead: "Compare them side by side, then send one inquiry for any of them.",
      closerLook: {
        heading: "A sense of place.",
        body: "A table by the skyline. A seat beneath the trees.",
        scenes: [
          { ...tap["tap-575159c961"], caption: "A table at Sky Bar", venue: "sky-bar" },
          { ...tap["tap-e1c1d016c2"], caption: "The coffee bar at Bay Lounge", venue: "bay-lounge" },
          { ...tap["tap-45267c1d07"], caption: "A gathering place at The Sandbox", venue: "sandbox" },
          { ...tap["tap-22f669475f"], caption: "Among the redwoods", venue: "redwood-park" },
          { ...tap["booklet-legacy-gallery"], caption: "History on the walls at Legacy Gallery", venue: "legacy-gallery" },
        ],
      },
      alaCarte: {
        lead: "Venue rental includes access to preferred catering and production partners. Tailor the rest.",
        groups: [
          {
            title: "Entertainment & production",
            items: ["DJ or live music", "Custom lighting design", "Extended AV buildout", "Film & photo shoot support", "Branded signage and graphics"],
          },
          {
            title: "Furniture & environment",
            items: ["Alternative furniture, including table rounds", "Floral and botanical installations", "Custom décor packages"],
          },
          {
            title: "Culinary & beverage",
            items: [
              "Custom cocktail menus",
              "Wine and spirits curation",
              "Chef's table experiences",
              "Branded beverage activations",
              "Staffed espresso service",
            ],
          },
        ],
      },
      faq: [
        {
          q: "Can I inquire before choosing a venue?",
          a: "Yes. Choose “Not sure yet” in the inquiry form, or pick several venues to compare, and share what you have in mind. The events team will suggest the best fit.",
          tags: ["planning"],
        },
        {
          q: "Does an inquiry reserve a venue?",
          a: "No. An inquiry starts a conversation about your event; it doesn't reserve a venue or confirm availability. Nothing is held until you agree it with the events team.",
          tags: ["planning"],
        },
        {
          q: "What should my budget include?",
          a: "Share your all-in event budget: the venue, furniture and rentals, and catering and beverage together. It helps the team suggest a space and setup that fits.",
          tags: ["budget"],
        },
        {
          q: "Is there a minimum budget?",
          a: "Each space has a typical starting budget that depends on the date and format. If yours is below it, the inquiry form will tell you before you send, so you can adjust or choose another space. Not sure yet? Say so, and the team will talk it through.",
          tags: ["budget"],
        },
        {
          q: "What about catering and event services?",
          a: "Venue rental includes access to preferred catering and production partners. Each venue page lists its facilities and services, and you can add DJs, lighting, décor, custom cocktails and more à la carte.",
          tags: ["services"],
        },
        {
          q: "Can I ask about a site visit?",
          a: "Yes. Mention it in your inquiry, with the venues you'd like to see and any dates that work. If you're booking from overseas, ask about photos and floor plans in the meantime.",
          tags: ["visits"],
        },
        {
          q: "Where do guests arrive?",
          a: "600 Montgomery Street, between Washington and Clay. For Redwood Park, guests check in at Mark Twain Alley off Sansome Street; the park is also reachable from Clay and Washington Streets.",
          tags: ["visits"],
        },
        {
          q: "Can I combine spaces?",
          a: "Often, yes. Redwood Park can be booked in full or in sections, and The Sandbox and the park are arranged separately. Select every venue you're considering in one inquiry.",
          tags: ["planning"],
        },
      ],
      around: [
        { img: images.lobbyCoffee, t: "Coffee in the lobby", d: "Guests arrive to the travertine coffee bar in the Pyramid's lobby." },
        { img: images.colonnade, t: "The colonnade", d: "The tower's sculpted concrete legs frame the walk in from Montgomery Street." },
        { img: images.artStratagems, t: "Art in the pavilion", d: "Installations in the Pyramid's glass pavilion." },
        { img: images.historyGallery, t: "The history gallery", d: "The story of the building, from the first drawings to the day it topped out." },
      ],
      aroundLead: "The whole building is part of the welcome, from the lobby coffee bar to the art in the pavilion.",
      gettingHere: [
        { k: "Address", v: "600 Montgomery Street, San Francisco", d: "The full block between Washington and Clay, Montgomery and Sansome." },
        { k: "Transit", v: "A short walk from Embarcadero", d: "BART and Muni, with cable cars a few blocks south on California Street." },
        { k: "Redwood Park", v: "Clay Street, Washington Street & Mark Twain Alley", d: "Access for outdoor events depends on the proposed use." },
      ],
      siteMap: images.siteMap,
      towerPoster: images.pyramidDusk,
      privacyUrl: "https://www.playbookexp.com/privacy.html",
      floorIntro: {
        title: "853 feet. 48 floors. Five places to gather.",
        body: "Scroll up the tower, from the redwoods at street level to Sky Bar on the 48th floor.",
      },
    },
  },
};

export const pyramid = makeTenant(data);
