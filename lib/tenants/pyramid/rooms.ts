import { images } from "./images";
import type { Room, RoomTag } from "@/lib/data/types";

export const roomTags: { id: RoomTag; label: string }[] = [
  { id: "small", label: "Up to 6" },
  { id: "large", label: "12+" },
  { id: "views", label: "City views" },
  { id: "video", label: "Video calls" },
  { id: "whiteboard", label: "Whiteboard" },
];

const { huddle, boardroom, boardroomReal, montgomeryHall } = images;

export const rooms: Room[] = [
  {
    slug: "clay",
    name: "Clay",
    namesake: "Clay Street, to the north",
    level: 6,
    capacity: 4,
    setups: ["boardroom"],
    summary: "A warm four-seat room for one-on-ones, interviews and quick decisions.",
    amenities: [
      { icon: "whiteboard", label: "Wall whiteboard" },
      { icon: "screen", label: "43-inch display" },
      { icon: "wifi", label: "Fast Wi-Fi" },
    ],
    image: huddle,
    approval: "instant",
    tags: ["small", "whiteboard"],
    plate: { w: 6, d: 5, windows: "east" },
  },
  {
    slug: "jackson",
    name: "Jackson",
    namesake: "Jackson Street and the old Barbary Coast",
    level: 6,
    capacity: 8,
    setups: ["boardroom"],
    summary: "Eight seats, a big screen and a camera that frames everyone. Built for hybrid team meetings.",
    amenities: [
      { icon: "video", label: "Video-call kit", detail: "Camera, mics and one-touch join" },
      { icon: "screen", label: "65-inch display" },
      { icon: "whiteboard", label: "Glass board" },
    ],
    image: boardroom,
    approval: "instant",
    tags: ["video", "whiteboard"],
    plate: { w: 9, d: 6, windows: "east" },
  },
  {
    slug: "washington",
    name: "Washington",
    namesake: "Washington Street, to the south",
    level: 6,
    capacity: 14,
    setups: ["boardroom", "classroom", "reception"],
    summary: "The boardroom: a long oak table for fourteen, leather chairs and a wall display under a sculpted plaster ceiling.",
    amenities: [
      { icon: "view", label: "City views" },
      { icon: "video", label: "Video-call kit" },
      { icon: "coffee", label: "Catering credenza" },
      { icon: "screen", label: "86-inch display" },
    ],
    image: boardroomReal,
    approval: "instant",
    tags: ["views", "video", "large"],
    plate: { w: 12, d: 7, windows: "north" },
  },
  {
    slug: "merchant",
    name: "Merchant",
    namesake: "Merchant Street, where the tower's footprint began",
    level: 5,
    capacity: 40,
    setups: ["theater", "classroom", "reception", "banquet"],
    summary: "A divisible section of Montgomery Hall for members. Big enough for an all-hands; needs a quick approval from our events team.",
    amenities: [
      { icon: "screen", label: "Projection" },
      { icon: "mic", label: "Wireless mics" },
      { icon: "people", label: "Staffed setup" },
      { icon: "coffee", label: "Coffee service available" },
    ],
    image: montgomeryHall,
    approval: "request",
    tags: ["large", "video"],
    plate: { w: 16, d: 11, windows: "north" },
  },
];
