# The member app: the Pyramid's Building Home

The public venue site is in good shape. This doc covers the next surface, the signed-in member app (`app/(member)/`, demo-only, starting at `/home`). It follows Spencer's Wayfinder map ([lulafit/knowledge-base#296](https://github.com/lulafit/knowledge-base/issues/296)). The roadmap's Phases 2–4 point here.

## Direction

**The building is the interface.** There is one member app, and the tower is its front door. Every floor shows what's on it for you, who can use it, and the next step.

- **Building Home, not a product menu.** It shows everything the public gets, plus tenant services, grouped by what you'd do there: Move, Work, Meet, Gather, Eat (Wayfinder #299, #336).
- **Browse first.** An account is asked for only when a member action starts, and the task carries on after sign-in (#308, #336).
- **Sign-in (#334).** Verified email by code or magic link, or Google, Apple or Microsoft. Then a one-time work-email check, with a "building access is being verified" state for unclear cases.
- **Member status wins over public status** at the same building (#300, #310).
- **Light marketing.** The tower and the real amenities do the selling. No editorial filler.
- **Fitness-only** is a configuration of the same app (Spencer's stair-step), not a separate site.

### States (switched from the demo dock)

| State | Who | Home leads with |
|---|---|---|
| Signed out | A tenant employee browsing | Hero with "Sign in with your work email"; "Sign in, and it's yours" (real rooms, the next class, an event, planning, each signing in and returning to the task); the floor-by-floor spotlights with a sign-in button on each; this week, with "Sign in to RSVP"; a closing sign-in band. No "What you can use" (it repeated the spotlights). A link to /venues for anyone planning an event |
| Verifying | Signed in, work email under review | The same discovery, an "access being verified" banner, public offerings usable |
| New | Verified, no first action yet | Your first week (Wayfinder #307 measures a first action in 30 days) |
| Returning | Has activity | Up next, today in the building, book again |
| Public account | Inquired or booked publicly, not a member | The Public Customer Activity Center: inquiries and bookings, links back to venues |

## Status

_Last updated: 2026-09-27._

- [x] 1. Real amenity content: `amenities` on every tenant (`lib/tenants/pyramid/amenities.ts`). Fitness moves to L26. The Foster and Pereira rooms (names and capacities from Core staging) replace Washington. The demo's storage key moves to v2.
- [x] 2. Personas and sign-in: Public account and Verifying join the dock. `/sign-in` offers an email code or Google, Apple and Microsoft, then a one-time work-email link: a matching domain makes you a member, and anything else goes to review. Every member action goes through `lib/access.ts`, and you land back where you started.
- [x] 3. Building Home rewrite (`components/member/home/`).
  - **Hero (`DayHero`), revised 2026-09-27 per Mike: the 3D was too much up top.** A full-bleed photo follows the building's day: the lobby coffee bar in the morning, L26 at midday, L27 at golden hour, Sky Bar after dark, the park on weekends. It opens on the scene picked by SF's clock and the real sun (`copy.day`, `lib/useBuildingDay.ts`), then cycles through the others every 7 s with a slow drift, with a clickable progress line naming each place. The "Right now" strip is gone (2026-09-27).
  - **"Right now" line:** the next class with room, what's on today, and sunset.
  - **Your card:** members get theirs in front of the hero (up next, a first step, verification status, or the Activity Center).
  - **Inside the building (`InsideTheBuilding`), further down, revised 2026-09-27 per Mike: spotlights, not a picker.** One row per place, the words and the place trading sides as you scroll, in the order of each amenity's `spotlight`. It runs Sky Lounge (3D room), wellness center (3D room), meeting rooms (photos), Sky Bar (3D, from its venue plan), lobby coffee bar (photos), then Redwood Park (3D, from its venue plan). 3D rows put a photo of the real room in the text column. The rooms come from `components/three/room/RoomCanvas.tsx` with the real kit (`props.ts`); Sky Bar and the park reuse the venue `SetupCanvas` at an everyday headcount.
  - **What you can use (`WhatYouCanUse`)** is grouped by Move, Work, Meet, Gather and Eat. The tabs follow the scroll. The tower line drawing sits at the bottom of the sticky column, with the group's floors lit.
- [ ] 4. 3D, in order:
  - [x] ~~open the floor~~ (replaced 2026-09-27 by the standalone rooms above; the tower code stays but is unused): pick L26 or L27 on the Home. The floors above lift seven floors, the slab thins to a plate, and an illustrative interior grows on it with its areas named (`lib/tenants/pyramid/interiors.ts`, `components/three/tower/interior.tsx`, `open` on `TowerCanvas`). The camera looks down into it. Phones hide the labels.
  - pick your bike
  - getting there
  - your floor, your view
  - your day in the Pyramid
  - inside the Pyramid
- [ ] 5. Service pages up to public quality: fitness, spaces, programming, Activity, account, `NotHere`
  - [x] Before building access (2026-09-28): Spaces lists rooms with "Free now / Free from 2pm" and their next open times, which open the room with that time picked (the Free/Booked/Yours bars and filters are gone; weekends aren't offered). The room's booking card is three steps (day, start, length), then "Sign in to book this", which returns to the review. Fitness trims to Coming up, class types and one "Also in" row; Events hides the company filter until you're a member and uses an even grid. Each ends with `SignInStrip`.
- [ ] 6. Fitness-only configuration: nav profiles and a demo toggle

Checkpoint with Mike after 1–3 and "open the floor".

## To confirm with Spencer / TAP

Every amenity carries `confirmed` and `source` in the bundle. Until an item is confirmed, it stays demo-only.

| What | What we're showing | Source | Question |
|---|---|---|---|
| Wellness center floor | Level 26 | Time Out, Haute Living | Is it L26? What's it called? Who can use it, and is it a paid membership? Hours? |
| Class schedule, coaches, price | Samples (Strength 45, Ride, $65/month) | Invented | What classes and pricing are real? Is there a Ride studio? |
| Sky Lounge | Level 27, work lounge and espresso bar | Press (L26 or L27) | Is this the same room as Bay Lounge (L27)? Who can use it, and when? |
| Sky Bar as a tenant lounge | Level 48, tenant cocktail lounge | SF Standard, Aug 2024 | Is it open to tenants day to day, and when? How does that fit with booking it as an event venue? |
| Meeting rooms | Foster (18) and Pereira (16) on L6, plus sample rooms Clay, Jackson, Merchant | Core staging (names and capacities) | Which floor? Which other rooms exist? Kit and setups? Instant booking or by request? |
| Lobby coffee bar | L1, open to the public | Building photos, Archinect | Name and hours |
| Dining on the block | Café Sebastian, MadLab, Ama in Transamerica Three | SF Standard, Aug 2024 | All still open? Any tenant perks? |
| Pyramid Arts | Transamerica Two, second floor | Press | Where exactly, and what's the current show? |
| Programming | Sample events (cupping, talks, grove evenings) | Invented, apart from the grove concert series | The real calendar source and the current season |
| Wellness center and Sky Lounge interiors | Illustrative layouts from photos, shown when a floor is opened | Our own layout | Can TAP share plans for L26 and L27, so we can trace them like the venues? |
| Concierge | "(415) 555-0172", weekdays 7am–7pm | Invented | Real desk contact and hours, if there is a desk |

## Building facts for the 3D

These come from Wikipedia, USGS and press. They're for storytelling and are safe to show as history:
- **Height:** 48 floors, 853 ft to the tip. The top 212 ft is a hollow spire with a beacon, the "Crown Jewel".
- **Wings:** the east wing holds the elevators (18 in total; 2 reach L48), the west wing the stairs and the smoke tower.
- **Windows and floor plates:** about 3,678 windows that pivot to be washed from inside. Floor plates shrink from about 20,000 sq ft at the base to about 3,000 near the top.
- **Seismic base:** X-bracing above the ground floor, on a 9 ft concrete mat poured over three days, 52 ft down. It swayed about a foot in the 1989 quake, with no damage.
- **Redwood Park:** about 50 of the original 80 redwoods, which came from the Santa Cruz Mountains. The 2024 remodel added 1,000 sq ft.
