import { images } from "./images";
import type { ClassKind, ClassTemplate, Resource } from "@/lib/data/types";
import type { FitnessBundle } from "../types";

const templates: Record<ClassKind, ClassTemplate> = {
  strength: {
    kind: "strength",
    name: "Strength 45",
    studio: "Strength floor",
    durationMin: 45,
    capacity: 12,
    intensity: 3,
    summary: "Coached kettlebell and dumbbell work in small groups. Every level welcome; the coach scales each movement to you.",
    bring: ["Training shoes", "Water bottle"],
    image: images.strength,
  },
  ride: {
    kind: "ride",
    name: "Ride",
    studio: "Ride studio",
    durationMin: 45,
    capacity: 16,
    intensity: 3,
    summary: "Rhythm-based indoor cycling in low amber light. Clip-in shoes are provided, so come as you are.",
    bring: ["Water bottle", "Towel (we have them too)"],
    image: images.ride,
  },
  pilates: {
    kind: "pilates",
    name: "Pilates mat",
    studio: "Studio B",
    durationMin: 50,
    capacity: 14,
    intensity: 2,
    summary: "Classical mat work for core strength and posture. Slow, precise and harder than it looks.",
    bring: ["Grip socks optional"],
    image: { ...images.gym, pos: "30% 60%" },
  },
  mobility: {
    kind: "mobility",
    name: "Desk-body mobility",
    studio: "Studio B",
    durationMin: 30,
    capacity: 14,
    intensity: 1,
    summary: "Thirty minutes for hips, shoulders and upper back. Built for people who sit for a living.",
    bring: ["Nothing. Work clothes are fine."],
    image: images.recovery,
  },
  run: {
    kind: "run",
    name: "Embarcadero run club",
    studio: "Meet in the lobby",
    durationMin: 40,
    capacity: 20,
    intensity: 2,
    summary: "A conversational 5K along the Embarcadero and back. Two pace groups. Showers are waiting.",
    bring: ["Running shoes", "A layer for the fog"],
    image: images.aerialGolden,
  },
};

const weekly: FitnessBundle["weekly"] = {
  1: [
    ["strength", 420, "dev"],
    ["ride", 720, "mae"],
    ["pilates", 1050, "sol"],
  ],
  2: [
    ["ride", 420, "mae"],
    ["mobility", 735, "mae"],
    ["strength", 1050, "dev"],
  ],
  3: [
    ["strength", 420, "dev"],
    ["ride", 720, "mae"],
    ["pilates", 1050, "sol"],
  ],
  4: [
    ["ride", 420, "mae"],
    ["strength", 735, "dev"],
    ["run", 1065, "dev"],
  ],
  5: [
    ["mobility", 450, "mae"],
    ["ride", 720, "mae"],
  ],
  // Weekends: open gym only
};

const resources: Resource[] = [
  {
    slug: "ride-studio",
    name: "Ride studio, open bikes",
    kind: "ride",
    summary: "Book a bike between classes and ride your own session. The screens run scenic routes or your own playlist.",
    slotMin: 45,
    units: ["Bike 3", "Bike 7", "Bike 11", "Bike 14"],
    image: images.ride,
    features: [
      { icon: "bike", label: "16 studio bikes" },
      { icon: "clock", label: "45-minute sessions" },
      { icon: "towel", label: "Towels & shoes provided" },
    ],
  },
  {
    slug: "recovery-lounge",
    name: "Recovery lounge",
    kind: "recovery",
    summary: "A cedar sauna, a cold plunge and compression boots in a quiet room. Book a 30-minute private session.",
    slotMin: 30,
    units: ["Suite 1", "Suite 2"],
    image: images.recovery,
    features: [
      { icon: "flame", label: "Cedar sauna" },
      { icon: "snow", label: "Cold plunge, 50°F" },
      { icon: "bolt", label: "Compression boots" },
    ],
  },
];

const membership = {
  name: "Pyramid Fitness",
  price: "$65/month",
  note: "Sample pricing. Billed through your company or card.",
  perks: ["Unlimited classes", "Open gym 6am–9pm", "Ride studio & recovery lounge bookings", "Towel service and lockers"],
};

export const fitness: FitnessBundle = {
  name: "Pyramid Fitness",
  level: 2,
  templates,
  weekly,
  // Noon Ride is always popular; it's the demo's "full" class.
  full: ["ride", 720],
  resources,
  membership,
  hero: images.gym,
  pitch: {
    title: "Two floors down from your desk.",
    body: "Coached classes, a Ride studio you can book between meetings, and a recovery lounge with a sauna and cold plunge.",
    points: ["Classes every weekday", "Ride studio & recovery bookings", "Personal training intros"],
    img: images.ride,
    cta: "See Pyramid Fitness",
    access: "Pyramid Fitness membership",
  },
};
