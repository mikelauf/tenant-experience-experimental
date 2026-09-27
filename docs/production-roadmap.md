# Plan: Combine Tenant Experience and playbook-tenant, then ship Transamerica public venues V1

## Context

**The two codebases**

| | Tenant Experience ("TE") | playbook-tenant ("PT", this repo) |
|---|---|---|
| Location | `~/Desktop/development/playbook/tenant-experience` | this repo |
| Stack | Next 15.5, Tailwind 3, plain CSS for public pages | Next 16.3, React 19.2, Tailwind 4, r3f/three, motion, Lenis |
| Wiring | Auth0 plus Core/OS | Nothing: data is typed TypeScript bundles per building (`lib/tenants/*`), demo state lives in `localStorage` |
| Deployed at | https://public-tap.playbookexp.com/ | https://tenant-experience-experimental.vercel.app/ |

**What the review found**
- **The live public TAP site is already hardcoded.** public-tap.playbookexp.com is TE's "hosted preview". It renders `src/lib/public-venues/preview.ts` and fakes inquiries.
- **Real Core content is barely proven.** It only works for a Bay Lounge pilot on `public-tap-staging.playbookexp.com`, where inquiries are blocked. Real inquiry delivery for TAP has not been proven, and TAP's inquiry source is still an unpublished draft in OS (v5).
- **Matt's direction (Slack):**
  - Hardcoding the public and marketing side is fine for now.
  - Anything a user actually does must use real data.
  - He wants to get off web-apps.
- **Spencer's direction (meeting, Sep 25):**
  - V1 is public venues only, for Transamerica, launching within about a week.
  - Combine the best of both sites.
  - Then build a fitness-only member site.
  - Then a multi-service member site.
- **Decisions confirmed with you:**
  - **PT becomes the production public-venue app.** Content stays hardcoded; only the inquiry is wired to Core. TE keeps running the member app until PT catches up.
  - **V1 inquiries go to Core for real.**

**A correction to the Gemini notes.** The summary says Spencer preferred a "bento grid". The transcript says the opposite. He preferred TE's clean grid of all spaces ("the left", "feels like browsing products") over PT's asymmetric 7/5 layout. He wants the top four shown, with "view more" after that.

## Guiding architecture (Matt's rule, made concrete)

- **Content is code.** Each building is a `TenantData` bundle (`lib/tenants/<building>/`), edited by pull request or AI. No CMS for V1.
- **Actions are real.** Everything that writes goes through a thin server-only `lib/core/` layer (route handlers or server actions) that calls Core with env-scoped keys. The browser never sees keys.
- **One seam per concern:**
  - `getTenant()` / `useTenant()` stay the content seam.
  - TE's `projectPublicVenuePublication` shows how OS content could map onto the same types later, if it's ever wanted.
- **Demo vs production:**
  - The Demo dock, the member routes, The Meridian, and the simulated flows stay behind `NEXT_PUBLIC_DEMO=1`. That keeps the experimental Vercel deploy as the sandbox.
  - Production builds serve the public venue site only.

---

## Phase 0: Align (no code, about a day)
Take this plan to Matt and get:
1. **Repo and hosting:** PT moves into the `lulafit` GitHub org with a Vercel project.
2. **DNS:** point public-tap.playbookexp.com at PT when we launch (decision 158 process), plus a staging host.
3. **Core access:** env-scoped `CORE_HOST` and `CORE_PUBLIC_API_KEY` for staging and production.
4. **TAP identifiers:**
   - the Core building ID
   - the space IDs for Sky Bar, Bay Lounge, The Sandbox and Redwood Park (in TE's `venue-readiness.md`)
   - the inquiry `source_key` (`web_inquiry`) and privacy policy version
5. **Publishing the TAP inquiry source** in OS: staging first, then production.

Ask Spencer about:
- the pamphlet
- the unclear meeting items (see Open questions)
- whether video assets exist
- the image-usage confirmation, which is still pending for 53 TAP images

## Phase 1: TAP public V1 in PT (target: about 1 week)

### 1a. Real content (replace the fictional Pyramid data)
- **Swap the Pyramid venues in `lib/tenants/pyramid/venues.ts`** (Bay Lounge / Redwood Park / Montgomery Hall) for the real four from TE's `src/lib/public-venues/preview.ts`:

  | Venue | Level | Capacity | Note |
  |---|---|---|---|
  | Sky Bar | L48 | | Capacity conflict (75 / 65–80 / 50–75) needs an answer |
  | Bay Lounge | L27 | 130 | |
  | The Sandbox | L3 | 300 | |
  | Redwood Park | | 1,000 | |

- **Delete Montgomery Hall.**
- **Copy the photography** marked "selected" in TE's `context/product/transamerica-public-content/media-manifest.json` from TE `/assets-resources` into `public/images/venues/`, then run PT's `raw/blur.sh` for the blur-up placeholders.
- **Leave anything we don't know empty** (per-setup capacities, amenities) so those sections hide themselves. No filler facts; TE's handoff has the same rule.

### 1b. Page composition, following the meeting
**Venues home (`app/(public)/venues/page.tsx`)**
- **Nav:** keep PT's `components/public/PublicNav.tsx` (venue links plus Inquire). Drop TE's "All venues" dropdown and the "600 Montgomery" caption.
- **Hero:** full-bleed background media.
  - Add a new `HeroMedia` component: a video for about 10 seconds, then a crossfading image carousel.
  - Start with images only, since no video assets exist yet.
  - Keep PT's type and buttons.
- **Venue grid:** rework `components/public/VenueCollection.tsx` into TE's clean, even grid.
  - Two columns, product-style cards.
  - Keep the per-card photo stepping from `VenueCard.tsx`.
  - Show the top four, with "View more" for anything past that.
- **Keep TE's "A closer look"** scene gallery as an optional, toggleable module (TE `atmosphere-gallery.tsx`). My best guess at "this little module". Confirm with Spencer.
- **Remove the prescriptive "The occasion" section** (dinners & receptions).
- **Keep PT's other sections:** FloorByFloor, how an inquiry works, host, around the building, getting here.
  - Every section renders only when its content exists.

**Venue detail (`app/(public)/venues/[slug]/page.tsx`)**
- **Top:** a large, clean hero image, like TE's Sky Bar hero. Drop the "Dinners & receptions" category label.
- **Gallery:** then PT's `Mosaic.tsx` with its "Show all photos" full-screen gallery. This replaces TE's clunkier carousel.
- **Body:** keep PT's overview, "good for", story and host. This is the "additional information" Spencer wanted brought over.
- **Flagged for V2:** "What this venue offers" (amenities) goes behind a content flag, hidden at launch until confirmed amenities exist. (The 3D `SetupVisualizer` was flagged too, and shipped once the plans were traced.)
- **Sticky inquiry:** keep PT's `InquireCard.tsx` (the mobile bottom bar too) and "Also at the Pyramid".

**Inquiry page:** PT's `app/(public)/venues/inquire/page.tsx` and `components/public/InquiryForm.tsx`, as they are, with the real venue picker.

**Routes:** 301 the old TE URLs (`/spaces/sky-bar` and the rest) to the new venue pages, and keep `/#inquire` working.

### 1c. Productionize the app
- **Host-based tenant.**
  - Add `proxy.ts`. Next 16 renamed middleware; read `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md` and `02-guides/multi-tenant.md` first.
  - It maps host → building, replacing the `pb-building` cookie in `lib/tenants/server.ts`. The cookie stays for demo mode only.
  - On public hosts, `/` serves the venues home.
- **Real inquiry.** Port TE's pure, tested modules into `lib/core/inquiry/`:
  - `src/lib/public-venues/inquiry-contract.ts` (`validateInquiry`, `toCoreInquiry`)
  - `submit.ts` (`submitCoreInquiry`)
  - `handle-inquiry.ts`
  - `campaign.ts`
  - Replace their "publication" dependency with hardcoded per-tenant `inquiry: { sourceKey, privacyVersion, privacyUrl, coreBuildingId, spaceIds }` in the tenant bundle.
  - Add `app/api/inquiries/route.ts`.
  - Change `InquiryForm` to POST with an Idempotency-Key, a honeypot and `startedAt`. The `localStorage` and simulated-error path stays for demo mode only.
  - Match the form's event type and budget options to Core's enums in `inquiry-contract.ts`.
  - Keep the switch-off gate `PUBLIC_INQUIRY_ENABLED`.
- **Hardening:**
  - Carry over TE's `next.config.mjs` security headers.
  - Metadata, OG images and noindex until launch.
  - An image budget check, since `public/images` is 18MB.
  - Check 3D performance on mobile.
- **Tests and CI:**
  - Port TE's inquiry tests (`node --test`).
  - Add a GitHub Actions workflow like TE's `.github/workflows/frontend-checks.yml`: lint, typecheck, tests, build.

### 1d. Launch sequence
1. Deploy to staging, then have Spencer and Oscar review.
2. Spencer walks the Transame team through it.
3. Prove an inquiry on staging, end to end: submit, the record shows in OS Operations, the acknowledgment email arrives, and a retry with the same key creates no duplicate.
4. Get production inquiry config and keys from Matt.
5. Matt moves the public-tap DNS to PT.
6. Remove noindex.

## Phase 2: Public V1.1 and V2
> **Transamerica team feedback, round 1** is captured in [`tap-feedback/`](tap-feedback/README.md): landmark views in 3D, real floor plans, OpenTable-style booking with one account, multi-venue inquiries, and budget qualification. It folds into this phase.
 (the "15% experimentation" track)
- **Floor plans** from Spencer and Ryan become 2D/3D plans with setup overlays (classroom, boardroom, theater), street and loading-dock diagrams, and live photos placed on the tower. Then unhide amenities and the setup visualizer.
- **Video in the hero** once assets exist.
- **AI FAQ experiment:** "Ask a question" answered from the building's content bundle.
- **A light signed-in state** for inquirers and frequent bookers, waiting on Spencer's member vs public concepts.
- **A second building** (One East Wacker, sourced draft in TE `context/product/one-east-wacker/`) as a new tenant bundle. This proves the multi-building model on a real host.
- **Separate side project:** the Playbook marketing website (Spencer is scoping it).

## Phase 3: Fitness-only member site
- **Service profile.** Add a fitness-only profile to PT's tenant `services` gating: its own nav (classes, personal training, fitness center), no spaces or events. First pass is hardcoded, for Spencer's review.
- **Real building.** 2 N Riverside, already wellness-only in TE, is the natural first real host.
- **Wire real actions** by porting TE adapters behind PT's seams:
  - Auth0 plus the broker host: `src/lib/auth0.ts`, `session.ts`
  - Core transport: `src/lib/backend.ts`
  - Wellness, class and membership mapping: `src/lib/data/core.ts`, `wellness-*.ts`
  - Server actions: `fitness-actions.ts`, `wellness-reservation-actions.ts`, membership checkout
  - These replace `lib/commit.ts` and `lib/store.ts` writes in production mode.
- **Reuse TE's accepted transaction evidence** (class reserve, cancel and waitlist; Stripe checkout and portal) as the acceptance checklist.

## Phase 4: Multi-service member app, and retiring the TE frontend
- **Port the rest in the order TE proved it:** spaces and room booking (the Core member room contract is still open), programming RSVP, profile and activity, onboarding.
- **Once PT matches TE**, move member hosts over and freeze TE as a reference and adapter library.

## Open questions (for Spencer)
1. **"I like this little module… keep this on the existing one"**: which module? I'm assuming "A closer look".
2. **"Bring this over, but flag it and hide it after launch"**: amenities only, or the 3D setup visualizer too? I'm assuming both.
3. **Sky Bar capacity:** which figure is right?
4. **Images:** usage confirmation for the TAP images, and whether video exists.

## Risks
- **Two codebases drift** while TE still carries member work (PRs 61 and 62). Keep TE member-only and freeze its public work.
- **The Next 15 → 16 port** of TE code: the TE modules we're porting are pure TypeScript with `.ts` imports, so the risk is low.
- **Launch depends on Matt:** DNS, keys, and publishing the inquiry source.

## Verification
- `npm run lint` and `npm run build` in PT, plus the ported inquiry tests.
- Browser check at desktop and 390px: home, each of the four venues, the inquiry page, the confirmation page, reduced motion, and WebGL-off posters.
- On staging, the end-to-end inquiry proof from 1d.3, before any production switch.
- Lighthouse on the venues home and a venue detail page (LCP from the hero, and whether the 3D chunks load lazily).

## First step once you approve
0. Save this plan in the repo as `docs/production-roadmap.md` and a project memory, so it stays on record. Keep a status checklist in it that's updated as work lands.
1. Start 1a and 1b: real TAP content and the combined page composition, in demo-safe mode. Spencer can review on the experimental URL while Phase 0 runs in parallel with Matt.

---

## Status checklist
_Update as work lands. Last updated: 2026-09-26._

- [x] Review: notes, TE codebase, PT codebase, both live sites
- [x] Roadmap recorded (this file)
- [ ] Phase 0: Matt alignment (repo/org, Vercel, DNS, Core keys, TAP IDs, inquiry source published)
- [ ] Phase 0: Spencer answers (open questions 1–4, pamphlet)
- [x] 1a: real TAP venues and photography (`lib/tenants/pyramid/venues.ts`, `tap.ts`, 25 photos in `public/images/tap/`)
- [x] 1b: venues home: nav, hero carousel with optional film (`HeroMedia`), even 2-column grid with "View all" past four, "A closer look" (`CloserLook`), occasions section gone
- [x] 1b: venue detail: clean full-bleed hero with "Show all photos" gallery (`VenuePhotos`), facts ledger, event services, V2 flags on facilities and 3D setups, sticky inquire card, photos row, "Also at the Pyramid"
- [x] 1b: "The setting" brought over from the current TAP site (`Setting`): two photos that open to full width on scroll, right under the hero
- [x] 1b: venue cards on one shared clock: 4.5s per photo, each card one second after the one before
- [x] 1b: old TE URL redirects (`/spaces/:slug` → `/venues/:slug`, production only)
- [x] 1c: host-based building in production (`lib/tenants/server.ts`); demo mode is the default (`lib/flags.ts`). No `proxy.ts` needed; next.config rewrites/redirects cover it.
- [x] 1c: inquiry route ported from TE (`app/api/inquiries`, `lib/core/inquiry/`), 25 tests; simulated unless `PUBLIC_INQUIRY_MODE=live`
- [x] 1c: security headers, noindex gate, metadata, CI workflow (`.github/workflows/checks.yml`, both modes)
- [ ] 1c: set `inquiry.privacyVersion` for the Pyramid once the TAP inquiry source is published (Matt/OS)
- [ ] 1d: staging deploy, review, inquiry proof, DNS switch

### Transamerica feedback, round 1 (Sep 25) — see `tap-feedback/`
- [x] Booklet content: five venues incl. **Legacy Gallery (L36)**, booklet facts, floor plans on every venue page (real, shown in production), "The view from here", à la carte services, real booklet photos (AI renders excluded)
- [x] Inquiry: 4 steps with contact details last, several venues per inquiry, date + guests required, new date picker, typeable guest count, all-in budget hint, budget floor (ranges below the lowest selected venue's minimum aren't offered; changed from the "flexible?" prompt on Sep 26, pending Spencer's OK), editable summary card
- [x] FAQ page (`/venues/faq`) + nav link + "While you wait" on the confirmation page
- [x] "The space" section: every venue traced into 3D from its booklet plan (incl. Redwood Park), with setups and a live guest-count slider, shipped in production
- [x] The space, round 2: one control rail (setup list with sketches, guests, inquiry). The 3D room turns by drag and drifts when idle, like the tower. Each setup frames itself: Overview, Close-up and Top-down. Walls, cores and trees clear out of the camera's way. Floor finishes, clothed tables, guests who walk in from the elevators. Floor plan and view sit below.
- [x] The space, round 3 (agreed Sep 26): tap a label to fly to it, with a note from the booklet; "Look out from here" walks the camera to the window facing the view and cross-fades into the real view photos (hidden until a venue has views, so Legacy Gallery waits on photos); the page link keeps setup, guests and view (`?setup=&guests=&view=`, `lib/setup/share.ts`) with "Share this setup"; the inquiry picks up the setup
- [x] 3D explorer replaces the scroll-driven tower: click floors or the jump list, real landmarks by true bearing, "Look out from here" per venue, arrival pins with Google Maps links
- [x] Views ↔ 3D: stepping through a venue's view photos turns the tower to face each one, and the landmarks in the photo light up (label, ground ring, beam). Landmark labels are buttons: one opens the nearest floor's photo that shows it, or just turns to face it when no photo does.
- [x] Your event's sky: pick a date and time in the explorer and the building relights with the real sun for 600 Montgomery (NOAA position, `lib/sun.ts`): the key light comes from the sun's true direction, golden hour warms it, a soft sun sits on the horizon, and the backdrop follows. The readout gives sunset and golden hour, and says when the sun sets in the open venue's view. "Inquire for this evening" carries date and time; the inquiry has an optional start time, sent inside Core's date text (`lib/core/inquiry/when.ts`).
- [x] Event brief (`/venues/brief`): a one-page, printable, shareable summary of one to five venues, set for the event (setup, guests, date and time). Hero and facts, the traced setup top-down, the tagged view, the building's plan, and the evening's light. Venue content only, never contact details, and never indexed. Pasted links unfurl as a photo card (`/venues/brief/card`; JPEG crops from `scripts/og-images.mjs`). Made from the 3D space, the inquiry's summary, the sent page and the explorer's sky.
- [ ] Real per-space budget minimums from Chad / OS (all venues use a $10k placeholder)
- [ ] Loading dock location and street diagrams from Oscar
- [ ] AI "ask a question" box (waiting on Danielle's knowledge-base doc and Matt's backend decision)
- [ ] Spencer: Sandbox 300 vs 400 guests; booklet contact email

### Frontend review (2026-09-27), one commit per step
- [x] Inquiry page edge to edge: the chosen space in a tall panel beside the form, not a floating card
- [x] Venue page: facts keep only what the hero doesn't say; photos under the intro; hero Inquire opens in place
- [x] Demo dock is an edge tab on public pages, clear of the corner controls
- [x] Brief empty state: pick venues right there, saved ones pre-ticked
- [x] Footer: already right in production (member link and "Demo build" are demo-only); the events contact appears once `copy.public.contact` is filled
- [x] Home: the two-tone head stays for the collection and the setting; à la carte is a side label with numbered rows, "around the building" a stacked eyebrow and line
- [x] Getting here (`ArrivalPlan.tsx`): the block drawn from OpenStreetMap and the tower profile, numbered ways in matching the list, Directions links, true north; "See the arrival in 3D" opens the explorer's Arriving stop on the same page. (A plan, not a second WebGL canvas.)
- [x] Shortlist tray → side-by-side compare (guests, setups, area, views; a guest count marks rooms that fit) → one inquiry or brief (`Shortlist.tsx`)
- [x] Tower locator on each venue page (`TowerLocator.tsx`): an elevation drawn from the tenant's tower profile, every venue named and linked, this one lit; opens the explorer at that floor (`/venues?floor=`)
- [x] Guest count set once (`useSharedGuests`): the grid brings rooms that hold it forward, and it fills the inquire card, the 3D space (until its slider is moved), the comparison, the brief picker and the inquiry
- [x] Live hero (`LiveNow.tsx`): the stats card gains the time in SF and the real light (golden hour, sunset, after dark), leading to the live 3D tower. Kept the photo carousel Spencer chose; no second WebGL canvas above the fold
- [x] Split `TowerCanvas` (1,606 → 499 + sky, park, city, markers, rig) and `landmarks` (991 → 145 + kit, bridges, buildings). `InquiryForm` gave up its model and fields; it stays ~1,150 lines until the ?layout= explorations (split, card, sentence) are retired or lifted into a hook
- [x] Lighthouse (mobile, production build), 2026-09-27. Home: performance 42 → 79, total blocking 1,820 → 70 ms, accessibility 78 → 100. Sky Bar: 86, accessibility 97 → 100. Best practices 100 on both; SEO 63 is only the pre-launch noindex.
  - Hero entrance is CSS (`animate-line`, `animate-rise`) so the first screen paints without waiting for hydration.
  - `SmoothImage` maps the retired `priority` prop to `loading="eager"` + `fetchPriority="high"`; hero photos were fetching at Low.
  - Valid list and definition markup (`RevealItem`), labeled explorer arrows, contrast (rail numbers, `--color-hold`), footer wordmark as CSS content.
  - three.js (932 KB) never loads on first paint; it waits for the explorer or the 3D space to come near.
  - Page weight: home 1.07 MB, Sky Bar 608 KB. `public/images` is 27 MB of sources, served resized by next/image.
  - Still open: LCP reads 4–5 s (simulated) because hero photos blur up from transparent, and Chrome doesn't count an image that first paints at opacity 0. Dropping the fade on the hero would fix the metric but break the smooth-image rule, so it stays.

### Decisions made while building
- **Invented content stays out of production.** The fictional host (Inés), the 555 phone number, "moments" from sample events, the spire "crown" stop (Sky Bar is on Level 48) and sample policies are no longer on the Pyramid's public site. The host section, public contact and moments return automatically once real ones are added to the bundle (`publicHostId`, `copy.public.contact`, `copy.public.moments`).
- **Sky Bar has no single capacity** (sources say 50–75, 65–80, 75). It shows "Varies by setup", as TE did, until Spencer confirms.
- **3D setups are traced, but their capacities are mostly estimates.** Each room is traced from the booklet plan and ships in production at the top of the venue page ("The space"). Seat counts are labeled as estimates, except The Sandbox's two setups and Bay Lounge's boardroom, which come from the booklet. The list for Spencer is in `tap-feedback/02-floor-plans-and-detail.md`.
- **No contact details in the browser.** The sent page's URL carries only Core's reference and the venue slug. The demo still keeps a local copy for the member app's Plans.
- **Privacy link** is Playbook's policy (`https://www.playbookexp.com/privacy.html`), the one the TAP inquiry draft uses.
