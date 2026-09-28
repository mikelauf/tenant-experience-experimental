# Pyramid: a building-experience prototype for Playbook

A front-end study of how Playbook's building app could feel, using the **Transamerica Pyramid** as the first property, plus **The Meridian**, a fictional second building that shows the same product running a different property with no code changes. It covers two experiences:

- **Members** (`/home`, demo only): people who work in the building discover what's there, book rooms, reserve classes, RSVP to events, and manage all of it in **Plans**. It has five states (signed out, verifying, new, returning, public account); see [`docs/member-experience.md`](docs/member-experience.md).
- **Public venues** (`/venues`): outside organizers explore Sky Bar, Bay Lounge, The Sandbox, Redwood Park and Legacy Gallery, each traced into 3D from the building's plans, then send an account-free inquiry.

**This repo is becoming the production public venue site for the Transamerica Pyramid** (see [`docs/production-roadmap.md`](docs/production-roadmap.md)). The Pyramid's venues, facts and photography are now real, taken from Tenant Experience's reviewed content. Everything else (the member app, The Meridian, schedules, people) is still simulated demo content.

```bash
npm install
npm run dev        # http://localhost:3100 (demo mode)
npm test           # inquiry, time, sun, tower, setup and brief tests
npm run typecheck && npm run lint
NEXT_PUBLIC_SITE_MODE=production npm run build   # the launch build: public venues only, prerendered
```

## Two builds from one codebase

| | Demo (default) | Production (`NEXT_PUBLIC_SITE_MODE=production`) |
|---|---|---|
| Serves | Venues at `/venues` (and `/`), member app at `/home`, both buildings | The public venue site only; `/` shows the venues home; member routes 404 |
| Building | Picked in the Demo dock (a cookie); every page renders per request | One building per build (the Meridian is left out), so the venue pages prerender |
| V2 sections (facilities list) | Shown, labeled "In progress · hidden at launch" | Hidden unless `NEXT_PUBLIC_V2_SECTIONS=1` |
| Old Tenant Experience URLs | n/a | `/spaces/:slug` redirects to `/venues/:slug` |
| Indexing | Always noindex | Noindex (and `robots.txt` closed) until `SITE_INDEXABLE=1` |

**Content is code, actions are real.** Venue content lives in each building's bundle (`lib/tenants/<building>/`). The one real action is the inquiry: `POST /api/inquiries` (`lib/core/inquiry/`, ported from Tenant Experience with its tests) validates everything, then either answers with a `PREVIEW-…` reference (default) or, with `PUBLIC_INQUIRY_MODE=live`, files it in Core at `/public/buildings/:id/conference-inquiries`. Live mode also needs `CORE_HOST`, `CORE_PUBLIC_API_KEY` and the building's `inquiry.privacyVersion`; without them it answers "temporarily unavailable" rather than guessing. See `.env.example`.

## Try these journeys

1. **Public inquiry:** `/venues`, then heart a venue or two, open **Bay Lounge**, change the setup (Reception, Banquet, Theater) and watch the room rearrange, then **Continue inquiry**. Submit once with an empty last name to see validation keep your input, tick "Demo: simulate a connection error" to see a recoverable failure, and send it again. The confirmation says plainly that nothing was sent.
2. **Reserve a class from signed out:** open the class schedule, then **Sign in to reserve**. Sign-in brings you back to that class. As a new member you hit the fitness access step, start a (simulated) membership, return to the class, and reserve. A toast flies into the Plans tab, and the class shows up as **Up next** on Home and in Plans.
3. **Full class:** the noon Ride (Mon, Wed, Fri) is always full, so **Join waitlist** gives you a waitlist position.
4. **Book a room:** go to **Spaces**, pick **Foster**, choose a day, a start and a length, review, and confirm. Book it again at another time and both stay in Plans. **Merchant** needs approval, so it lands in Plans as *Awaiting approval*.
5. **Plan an event:** go to **Spaces**, then **Plan an event**, and send the member inquiry. It's tracked in Plans.
6. **Events:** RSVP to *The Pyramid at 54*. *Morning cupping* is full (waitlist), the *Northline* social is company-only (you're at Northline, so you can go), and *Chef's table* is invite-only.
7. **Manage:** in Plans, open any item to add it to your calendar (a real `.ics` file) or cancel it with a two-step confirm. The change shows up everywhere.
8. **Inside the building:** on the member Home, scroll through the floor-by-floor spotlights. The wellness center and Sky Lounge are rooms in 3D with their real kit; Sky Bar and the park come from their venue plans.
9. **Another building** (hidden from the dock; set the `pb-building=meridian` cookie): Everything changes: the name, the logo mark, the accent color, the stepped 3D tower, the venues, rooms, events and people. Fitness isn't offered there, so it drops out of the navigation, service tabs, footer, Home and Account, and `/fitness` explains that it isn't available. Each building keeps its own plans.

## Demo controls

The **Demo** pill (bottom-left) says what you're looking at, e.g. "Public venues" or "Member app · Returning · Fitness". Open it to switch:

- **Which site:** Public venues (what anyone planning an event sees) or the Member app (what people who work in the building see).
- **Who's looking?** (member app only): Signed out, New member or Returning. **More states** holds Public account and Verifying.
- **Has the fitness membership** (member app, for members): on to reserve classes, off to see the join step.
- **Saved venues** (public venues only): how many are hearted, with Clear.
- At the bottom: the corner style (Rounded or Flat) and **Reset demo**.

The Meridian, the fictional second building, is no longer in the dock. Its bundle stays in `lib/tenants/meridian/` for a multi-building demo, and a browser still set to it gets a "Back to the Pyramid" line.

State lives in `localStorage`, one key per building (`pyramid-demo-v2:<building>`), so bookings persist across reloads, sync across tabs, and stay separate for each property.

## What's simulated

| Area | In this prototype | In the real product |
|---|---|---|
| Sign-in | Any email signs you in as Jordan Ellis (Northline Capital) and returns you to where you started | Auth0 / company SSO |
| Access | Building access always on; fitness membership toggle | Real eligibility rules |
| Rooms | Deterministic "busy" blocks; instant or approval rooms | Live inventory |
| Classes and waitlists | Generated weekly schedule relative to today, on the building's clock (San Francisco) for every viewer | Fitness platform |
| Payments and billing | Nothing is charged; the billing portal is a toast | Payment provider |
| Inquiries | Public: validated by `/api/inquiries` and answered with a `PREVIEW-` reference until live mode is on. Member: saved in this browser | Delivered to the onsite events team through Core |
| Policies | Labeled "Sample policy" | Set per building in Playbook OS |
| Buildings | Two bundles in `lib/tenants/`, picked by a cookie | Resolved from the hostname, content from Playbook OS |
| The Meridian | Fictional building; its interiors are placeholder photos reused from the Pyramid set | Its own photography |

## Design system

- **Idea:** *a vertical city.* The tower is a stack of places, and the UI moves you *up and through* it, like a hotel moves you between floors.
- **Type:** one family, **Instrument Sans** (a quiet tie to Playbook's own brand), with the display voice using its width axis narrowed to 82–90%. Sentence case and tabular figures throughout. No serif, no mono, no uppercase labels.
- **Color:** built from the building's materials. Quartz `#F2F0EB` (the precast facade), fog, ink `#111315`, and night `#0D1012` for evening moments. **One accent per building**, used only for actions and live state: redwood `#9A3F25` at the Pyramid (from Redwood Park), lake blue `#2C4F8C` at the Meridian. The accent is set as `--color-accent*` on `<html>` from the tenant's `theme`, so it paints correctly on first load. The shared tokens are in `app/globals.css`.
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

Everything is procedural (react-three-fiber), so there are no model files. Scenes mount a screen ahead (once the browser is idle), render only while visible, unmount again once well out of view, and fall back to a photo or plan poster when motion is reduced or WebGL is missing (`components/three/Lazy3D.tsx`). three.js never loads with the first paint.

- **The tower** (`components/three/tower/TowerCanvas.tsx`) is generated from a building's `TowerProfile` (`lib/tower.ts`): the width and depth at each floor, the crown (spire or lit lantern and mast), optional wings, window rhythm, the park or plaza, and the city ring. The Pyramid is a taper with wings, a spire and Redwood Park. The Meridian is a setback tower with a lantern, a mast and a plaza. Light is one continuous `sun` value (night, then dusk, then day) that blends the sky, fog, sun, lit windows and the city, so a scrubber can relight it smoothly.
  - On `/venues`, the explorer: click a floor or a landmark, look out from a venue, and relight the tower for your event's date with the real sun (`lib/sun.ts`).
  - With no hero photography (the Meridian), heroes render the building's own tower at blue hour (`TowerHero`).
- **Setup visualizer** (`components/three/setup/`): an isometric floor plate whose chairs, tables, guests, stage and bar glide between Reception, Theater, Banquet, Classroom, Boardroom and Lounge at the listed capacity. The reduced-motion poster is a 2D plan drawn from the same layout data.

## Structure

```
app/(public)/venues/…        public venue site (own nav and footer)
app/(member)/…               member app (top nav plus mobile tab bar); rendered per request, demo only
app/not-found.tsx, error.tsx branded not-found and error pages; robots.ts and sitemap.ts follow the noindex gate
components/member/…          Home (3 states), fitness, spaces, programming, plans, account
components/public/…          venue cards, mosaic, floor-by-floor, inquiry form
components/three/…           procedural scenes
lib/tenants/<building>/…     one bundle per property: identity, theme, mark, tower profile, levels, people,
                             venues, rooms, fitness (or null), events and copy
lib/tenants/index.ts         the registry; server.ts (getTenant) and client.tsx (useTenant) read the active one
lib/data/types.ts, shared.ts shared types and product-wide rules (setups, room hours, capacities)
lib/time.ts                  dates on the building's clock, so the server and every browser agree
lib/useOverlay.ts            one behavior for every sheet and dialog (scroll lock, Escape, focus)
lib/core/inquiry/…           the real inquiry: validation, Core mapping, the route handler, readiness check
lib/store.ts                 demo state per building (persona, commitments, shortlist, inquiries, notifications)
lib/commit.ts                turns a class, room, event or studio slot into a Plans commitment
```

**Adding a building** means adding a folder under `lib/tenants/` and registering it; no screens change. Its `services` flags decide what appears: a disabled service drops out of the navigation, tab bar, service tabs, footer, Home and Account, and its routes render a "not at this building" page (`lib/tenants/gate.tsx`).

## Images

All photos are registered per building in `lib/tenants/<building>/images.ts` (alt text, focal point, source). Swap one there and it changes everywhere.

- About 60 photos in `public/images`, served resized by `next/image`. Most venue photography comes from the building's booklet and TAP's reviewed set (`public/images/tap/`).
- **Real photos** from transamericapyramid.com and Playbook's public staging site: the Bay Lounge, Redwood Park, the lobby, the fitness center, a boardroom, art, the history gallery and the site map. They're pulled at original resolution and exported at up to 2800px. Source URLs are in `raw/sources.tsv`, and the export list is in `raw/real.tsv` (the source PNGs stay local, out of git).
- **12 Bloom photos** stay in use, mostly scenes with people (receptions, talks, classes, the host). The Bloom Pyramid-at-dusk shot is now the poster for the dusk 3D tower. Their prompts are in `docs/image-prompts.md`, and the brief is in `docs/brand-brief.md`.
- **The Meridian** has no photography yet. Its interiors borrow neutral Pyramid photos (marked `source: "placeholder"`), and its heroes are its own 3D tower. Prompts for real Meridian images are at the end of `docs/image-prompts.md`.
- After changing any image, run `zsh raw/blur.sh` to regenerate the blur-up previews.

Demo recording: `docs/pyramid-demo.mp4` (77s, full walkthrough) and `docs/pyramid-demo.gif` (first 30s).
# tenant-experience-experimental
