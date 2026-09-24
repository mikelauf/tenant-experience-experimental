# Pyramid: a building-experience prototype for Playbook

A front-end study of how Playbook's building app could feel, using the **Transamerica Pyramid** as the first property. It covers two experiences:

- **Members** (`/`): people who work in the building discover what's there, book rooms, reserve classes, RSVP to events, and manage all of it in **Plans**.
- **Public venues** (`/venues`): outside organizers explore the Bay Lounge, Redwood Park and Montgomery Hall, then send an account-free inquiry.

Everything is simulated. There's no backend, real sign-in, payment or message delivery. Venues, schedules, people, capacities and policies are sample content, not operating facts.

```bash
npm install
npm run dev        # http://localhost:3100
```

## Try these journeys

1. **Public inquiry:** `/venues`, then heart a venue or two, open **Bay Lounge**, change the setup (Reception, Banquet, Theater) and watch the room rearrange, then **Continue inquiry**. Submit once with an empty last name to see validation keep your input, tick "Demo: simulate a connection error" to see a recoverable failure, and send it again. The confirmation says plainly that nothing was sent.
2. **Reserve a class from signed out:** open the class schedule, then **Sign in to reserve**. Sign-in brings you back to that class. As a new member you hit the fitness access step, start a (simulated) membership, return to the class, and reserve. A toast flies into the Plans tab, and the class shows up as **Up next** on Home and in Plans.
3. **Full class:** the noon Ride (Mon, Wed, Fri) is always full, so **Join waitlist** gives you a waitlist position.
4. **Book a room:** go to **Spaces**, pick **Washington**, choose a time (booked times are struck through), review, and confirm. **Merchant** needs approval, so it lands in Plans as *Awaiting approval*.
5. **Plan an event:** go to **Spaces**, then **Plan an event**, and send the member inquiry. It's tracked in Plans.
6. **Events:** RSVP to *The Pyramid at 54*. *Morning cupping* is full (waitlist), the *Northline* social is company-only (you're at Northline, so you can go), and *Chef's table* is invite-only.
7. **Manage:** in Plans, open any item to add it to your calendar (a real `.ics` file) or cancel it with a two-step confirm. The change shows up everywhere.

## Demo controls

The **Demo** button (bottom corner) switches between:

- **Member app** and **Public venues**
- **Signed out**, **New member** (nothing booked, orientation steps), or **Returning** (plans on the books, "book again")
- **Fitness membership** on or off (off shows the access-required state)
- **Reset demo** (clears everything saved in this browser)

State lives in `localStorage` (`pyramid-demo-v1`), so bookings persist across reloads and sync across tabs.

## What's simulated

| Area | In this prototype | In the real product |
|---|---|---|
| Sign-in | Any email signs you in as Jordan Ellis (Northline Capital) and returns you to where you started | Auth0 / company SSO |
| Access | Building access always on; fitness membership toggle | Real eligibility rules |
| Rooms | Deterministic "busy" blocks; instant or approval rooms | Live inventory |
| Classes and waitlists | Generated weekly schedule relative to today | Fitness platform |
| Payments and billing | Nothing is charged; the billing portal is a toast | Payment provider |
| Inquiries | Saved in this browser only; the confirmation says so | Delivered to the onsite events team |
| Policies | Labeled "Sample policy" | Set per building in Playbook OS |

## Design system

- **Idea:** *a vertical city.* The tower is a stack of places, and the UI moves you *up and through* it, like a hotel moves you between floors.
- **Type:** one family, **Instrument Sans** (a quiet tie to Playbook's own brand), with the display voice using its width axis narrowed to 82–90%. Sentence case and tabular figures throughout. No serif, no mono, no uppercase labels.
- **Color:** built from the building's materials. Quartz `#F2F0EB` (the precast facade), fog, ink `#111315`, and night `#0D1012` for evening moments. **One accent, redwood `#9A3F25`**, from Redwood Park, used only for actions and live state. Tokens are in `app/globals.css`.
- **Layout:** a full-bleed 12-column grid with fluid gutters, left-weighted headlines, asymmetric mosaics and media that bleeds off the edge. There are no narrow centered boxes except where forms need a readable measure.
- **Motion** (`motion` + Lenis): lines rise out of masks and the level readout rolls like an elevator. Images blur up from a 24px preview. Card photos morph into detail heroes through React's `<ViewTransition>`. Booking confirmations fly into the Plans tab, and the tab badge bumps. Everything respects `prefers-reduced-motion`.
- **Travel patterns** (Mobbin, travel category):
  - Airbnb's 3D-icon category tabs become the Spaces, Fitness and Events tabs.
  - Icon filter chips filter venues and rooms.
  - A 1+4 photo mosaic opens a full gallery.
  - A sticky reserve card becomes a mobile bottom bar.
  - The date strip plus time slots drive the schedule and room picker.
  - "Review and continue" becomes the room review step.
  - Trips grouped by month become Plans.
  - Flighty/Delta-style countdowns power "Up next".

## 3D

Everything is procedural (react-three-fiber), so there are no model files. Scenes mount near the viewport, render only while visible, and fall back to a photo or plan poster when motion is reduced or WebGL is missing (`components/three/Lazy3D.tsx`).

- **The Pyramid** (`components/three/pyramid/`): 48 instanced floor slabs with a canvas-drawn window texture (lit at dusk), the two wings, the spire, Redwood Park and low-rise context. On `/venues`, a glowing band rides up the tower as you scroll from the grove to L27.
- **Setup visualizer** (`components/three/setup/`): an isometric floor plate whose chairs, tables, guests, stage and bar glide between Reception, Theater, Banquet, Classroom, Boardroom and Lounge at the listed capacity. The reduced-motion poster is a 2D plan drawn from the same layout data.

## Structure

```
app/(public)/venues/…        public venue site (own nav and footer)
app/(member)/…               member app (top nav plus mobile tab bar); rendered per request
components/member/…          Home (3 states), fitness, spaces, programming, plans, account
components/public/…          venue cards, mosaic, floor-by-floor, inquiry form
components/three/…           procedural scenes
lib/data/…                   typed content, separate from layout (swap it to re-skin a building)
lib/store.ts                 demo state (persona, commitments, shortlist, inquiries)
lib/commit.ts                turns a class, room, event or studio slot into a Plans commitment
```

Building identity and enabled services live in `lib/data/building.ts` (`services`). Turning one off removes it from the navigation and the service tabs.

## Images

All photos are registered in `lib/data/images.ts` (alt text, focal point, source). Swap one there and it changes everywhere.

- **24 real photos** from transamericapyramid.com and Playbook's public staging site: the Bay Lounge, Redwood Park, the lobby, the fitness center, a boardroom, art, the history gallery and the site map. They're pulled at original resolution and exported at up to 2800px. Source URLs are in `raw/sources.tsv`, and the export list is in `raw/real.tsv`.
- **12 Bloom photos** stay in use, mostly scenes with people (receptions, talks, classes, the host). The Bloom Pyramid-at-dusk shot is still in the image library but no page shows it. Their prompts are in `docs/image-prompts.md`, and the brief is in `docs/brand-brief.md`.
- After changing any image, run `zsh raw/blur.sh` to regenerate the blur-up previews.

Demo recording: `docs/pyramid-demo.mp4` (77s, full walkthrough) and `docs/pyramid-demo.gif` (first 30s).
# tenant-experience-experimental
