export type Img = { src: string; alt: string; /** focal point for object-position */ pos?: string; /** short caption, shown in galleries */ caption?: string };

export type Setup = "reception" | "theater" | "banquet" | "boardroom" | "classroom" | "lounge";

export type Level = {
  /** 0 = street / Redwood Park */
  n: number;
  label: string;
  /** Short name for the elevator readout */
  place: string;
  /** Link target, if the level has a place to visit */
  href?: string;
  audience: "public" | "member" | "both";
};

export type Person = {
  id: string;
  name: string;
  role: string;
  bio: string;
  image?: Img;
  initials: string;
  since?: string;
};

export type Feature = { icon: IconName; label: string; detail?: string };

/** Floor plate for the setup visualizer, in meters; w × d should match the area (1 m² ≈ 10.76 sq ft) */
export type Plate = { w: number; d: number; windows: "north" | "east" | "wrap" | "none"; outdoor?: boolean };

/**
 * A photo looking out from a venue. `tags` mark landmarks where they actually appear in the frame
 * (x and y in percent of the photo); `bearing` is the direction the camera faced, degrees from north.
 */
export type ViewPhoto = Img & { tags?: { label: string; x: number; y: number }[]; bearing?: number; ratio: number };

/** A labeled fact, e.g. { label: "Area", value: "3,020 sq ft" } */
export type Fact = { label: string; value: string; note?: string };

export type Venue = {
  slug: string;
  name: string;
  level: number;
  levelLabel: string;
  /** The setting in a few words, e.g. "Skyline lounge & bar" */
  kind: string;
  tagline: string;
  summary: string;
  story: string[];
  /** Most guests the venue holds. Leave it out until it's confirmed; the site then shows `capacityNote`. */
  capacity?: number;
  /** A qualified capacity, e.g. "Varies by setup", when a single number would mislead */
  capacityNote?: string;
  sqft?: number;
  /** The ledger on the venue page: capacity, area, setting, access… */
  facts: Fact[];
  /** Facilities, shown as "What this venue offers" */
  features: Feature[];
  services: { title: string; items: string[]; note?: string }[];
  /** Venue-specific policies. Empty means none are published yet. */
  policies: string[];
  goodFor: string[];
  hero: Img;
  /** Every photo, hero first */
  gallery: Img[];
  /**
   * Seats by setup, for the 3D setup visualizer. `illustrative` layouts are
   * estimates drawn from the area until real floor plans exist, and say so.
   */
  layout?: { plate: Plate; capacities: Partial<Record<Setup, number>>; illustrative?: boolean };
  /** The building's own floor plans, one per documented setup. Oriented with Washington St at the top. */
  floorPlans?: (Img & { label: string; guests?: number })[];
  /** Photos taken from the venue, looking out. Shown as "The view from here", with landmarks tagged. */
  views?: ViewPhoto[];
  /** Which way the venue's best view faces, degrees clockwise from north; drives the 3D "look out" camera */
  viewBearing?: number;
  /**
   * The lowest all-in budget the events team will consider, in dollars. Never shown publicly; the inquiry
   * uses it to ask "is your budget flexible?" before sending a lead that can't work.
   */
  minBudget?: number;
};

export type Room = {
  slug: string;
  name: string;
  level: number;
  capacity: number;
  setups: Setup[];
  summary: string;
  amenities: Feature[];
  image: Img;
  gallery?: Img[];
  approval: "instant" | "request";
  tags: RoomTag[];
  /** named after */
  namesake: string;
  plate: Plate;
};

export type RoomTag = "views" | "small" | "video" | "whiteboard" | "large";

export type ClassKind = "strength" | "ride" | "pilates" | "mobility" | "run";

export type ClassTemplate = {
  kind: ClassKind;
  name: string;
  studio: string;
  durationMin: number;
  capacity: number;
  intensity: 1 | 2 | 3;
  summary: string;
  bring: string[];
  image: Img;
};

export type ClassSession = {
  id: string;
  kind: ClassKind;
  coachId: string;
  startsAt: string; // ISO
  /** seats taken by other people */
  taken: number;
  /** people already on the waitlist */
  waitlist: number;
};

export type Resource = {
  slug: string;
  name: string;
  kind: "ride" | "recovery";
  summary: string;
  slotMin: number;
  units: string[];
  image: Img;
  features: Feature[];
};

export type Access = { type: "all" } | { type: "company"; company: string } | { type: "vip" };

export type BuildingEvent = {
  slug: string;
  name: string;
  kicker: string;
  startsAt: string;
  durationMin: number;
  place: string;
  level: number;
  summary: string;
  body: string[];
  capacity: number;
  going: number;
  access: Access;
  hostId: string;
  image: Img;
  tone: "day" | "night";
};

export type Persona = "signed-out" | "new" | "returning";

export type CommitmentKind = "class" | "room" | "event" | "resource" | "training" | "inquiry";
export type CommitmentStatus = "confirmed" | "pending" | "waitlist" | "cancelled";

export type Commitment = {
  id: string;
  kind: CommitmentKind;
  refId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  place: string;
  status: CommitmentStatus;
  waitlistPos?: number;
  detail?: string;
  image?: Img;
  createdAt: string;
};

export type Inquiry = {
  id: string;
  venue: string;
  firstName: string;
  lastName: string;
  email: string;
  guests?: string;
  date?: string;
  eventType?: string;
  createdAt: string;
};

export type IconName =
  | "view"
  | "sun"
  | "moon"
  | "tree"
  | "glass"
  | "mic"
  | "screen"
  | "wifi"
  | "chair"
  | "table"
  | "coffee"
  | "music"
  | "access"
  | "people"
  | "clock"
  | "whiteboard"
  | "video"
  | "bike"
  | "snow"
  | "flame"
  | "towel"
  | "lock"
  | "star"
  | "leaf"
  | "pin"
  | "calendar"
  | "check"
  | "bolt"
  | "shield";
