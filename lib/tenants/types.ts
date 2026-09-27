import type { AnyIcon } from "@/components/ui/Icon";
import type {
  Amenity,
  BuildingEvent,
  ClassKind,
  ClassSession,
  ClassTemplate,
  Feature,
  IconName,
  Img,
  Level,
  Person,
  Resource,
  Room,
  RoomTag,
  Venue,
} from "@/lib/data/types";
import type { TowerProfile } from "@/lib/tower";

export type TenantId = "pyramid" | "meridian";

/**
 * `source`: "building" = the property's own site, "staging" = Playbook's public staging site,
 * "bloom" = generated, "placeholder" = borrowed until real photography exists.
 */
export type Photo = Img & { source: "building" | "staging" | "bloom" | "placeholder" };

export type Services = { spaces: boolean; fitness: boolean; programming: boolean };

/** A service's pitch in the Home service tabs */
export type Pitch = { title: string; body: string; points: string[]; img: Img; cta: string; access: string };

export type FitnessBundle = {
  name: string;
  level: number;
  templates: Record<ClassKind, ClassTemplate>;
  /** Weekday (0 = Sunday) → [kind, minutes from midnight, coach id] */
  weekly: Record<number, [ClassKind, number, string][]>;
  /** The demo's always-full class */
  full: [ClassKind, number];
  resources: Resource[];
  membership: { name: string; price: string; note: string; perks: string[] };
  pitch: Pitch;
  hero: Img;
};

export type Member = { first: string; last: string; email: string; company: string; floor: string };

export type TenantCopy = {
  /** "the Pyramid", for mid-sentence */
  the: string;
  /** "The Pyramid", for the footer wordmark and headings */
  The: string;
  weather: string;
  /** Where the concierge desk is, e.g. "L1, by the Montgomery doors" */
  concierge: string;
  memberHero: { img: Img; lines: string[] };
  signInImg: Img;
  pitches: { spaces: Pitch; events: Pitch };
  firstWeek: { room: { d: string; img: Img }; event: { d: string; img: Img }; concierge: { img: Img } };
  /** Meetings & Events: the two intent cards and the event-planning hero */
  spaces: { roomsImg: Img; planImg: Img; planHero: Img };
  programmingLead: string;
  /** Event kicker → filter chip label */
  kickers: Record<string, string>;
  /** "Book again" chips for a returning member; `id` matches history refs */
  usuals: { id: string; label: string; icon: AnyIcon; href: string }[];
  /** What a returning member already has booked: their usual room and an event */
  seed: { room: string; event: string };
  policies: { icon: IconName; t: string; d: string }[];
  public: {
    title: string;
    description: string;
    heroLines: string[];
    heroLead: string;
    /** Crossfading hero photos, in order. The first also paints before the carousel starts. */
    heroSlides: (Img & { label: string })[];
    /** Optional hero film: plays once, then hands over to the photo carousel */
    heroVideo?: { src: string; poster: Img };
    /** "The setting": a two-line statement over a pair of photos that open out as you scroll */
    setting?: { lines: [string, string]; body: string; images: [Img & { caption: string }, Img & { caption: string }] };
    /** Venue collection heading, two lines */
    collection: [string, string];
    collectionLead: string;
    /** A line from the public host, if there is one */
    hostQuote?: string;
    /** "A closer look": full-bleed scenes, each optionally linking to its venue */
    closerLook?: { heading: string; body?: string; scenes: (Img & { caption: string; venue?: string })[] };
    /** Optional extras the building arranges, grouped */
    alaCarte?: { lead: string; groups: { title: string; items: string[] }[] };
    /** Frequently asked questions, shown on /venues/faq and after an inquiry */
    faq?: { q: string; a: string; tags?: ("planning" | "budget" | "services" | "visits")[] }[];
    /** Illustrative moments from past events. Leave out until there's real photography and permission to share it. */
    moments?: { img: Img; title: string; where: string }[];
    around: { img: Img; t: string; d: string }[];
    aroundLead: string;
    gettingHere: { k: string; v: string; d: string }[];
    siteMap?: Img;
    towerPoster: Img;
    floorIntro: { title: string; body: string };
    /** A last stop above the top venue. Leave out if the top venue is the top floor. */
    crown?: { level: number; readout: string; title: string; body: string };
    /** Public contact for event inquiries. Leave out until it's confirmed; nothing invented goes on the public site. */
    contact?: { phone?: string; email?: string };
    privacyUrl?: string;
  };
};

/** The logo mark: a few SVG paths on a 20×32 box */
export type Mark = { paths: { d: string; opacity?: number }[] };

export type TenantData = {
  id: TenantId;
  building: {
    name: string;
    address: string;
    city: string;
    floors: number;
    heightFt: number;
    opened: number;
    operator: string;
    concierge: { phone: string; email: string; hours: string };
    /** Turn services off to see how the product adapts per property. */
    services: Services;
    hero: Img;
    /** No hero photography yet: heroes render the building's own tower instead */
    heroTower?: boolean;
  };
  /** Accent colors; everything else in the palette is shared */
  theme: { accent: string; deep: string; soft: string; glow: string };
  mark: Mark;
  tower: TowerProfile;
  /** The vertical index: every level with a place on it */
  levels: Level[];
  people: Person[];
  /** Events & hospitality lead, the host for member event planning */
  leadId: string;
  /** The person introduced on the public venue site. Leave out until a real host is confirmed. */
  publicHostId?: string;
  member: Member;
  venues: Venue[];
  /** What a building member can use, by floor. The Building Home and the member tower read from it. */
  amenities: Amenity[];
  rooms: Room[];
  roomTags: { id: RoomTag; label: string }[];
  fitness: FitnessBundle | null;
  /** Built lazily so dates are relative to "now" in the browser */
  events: () => BuildingEvent[];
  /**
   * Where public inquiries are filed in Core. Without it (or without a privacy version),
   * a live deployment answers "temporarily unavailable" rather than guessing.
   */
  inquiry?: { coreBuildingId: string; sourceKey: string; privacyVersion?: string };
  copy: TenantCopy;
};

export type Tenant = TenantData & {
  person: (id: string) => Person;
  venue: (slug: string) => Venue | undefined;
  room: (slug: string) => Room | undefined;
  eventBySlug: (slug: string) => BuildingEvent | undefined;
  /** Fitness helpers return nothing when the building has no fitness */
  sessionsFor: (day: Date) => ClassSession[];
  template: (kind: ClassKind) => ClassTemplate;
  lead: Person;
  /** The public venue site's host, if there is one */
  publicHost?: Person;
};

export type { Feature };
