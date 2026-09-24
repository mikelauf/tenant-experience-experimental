export type Img = { src: string; alt: string; /** focal point for object-position */ pos?: string };

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

export type Venue = {
  slug: string;
  name: string;
  level: number;
  levelLabel: string;
  kind: string;
  tagline: string;
  summary: string;
  story: string[];
  capacities: Partial<Record<Setup, number>>;
  sqft: number;
  features: Feature[];
  goodFor: string[];
  tags: VenueTag[];
  hero: Img;
  gallery: Img[];
  hostId: string;
  /** Plate shape for the setup visualizer */
  plate: { w: number; d: number; windows: "north" | "east" | "wrap" | "none"; outdoor?: boolean };
};

export type VenueTag = "views" | "outdoor" | "catering" | "av" | "evening" | "daylight" | "private";

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
  plate: Venue["plate"];
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
