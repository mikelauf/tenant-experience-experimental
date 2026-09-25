# Playbook — product brief for a fresh frontend prototype

September 24, 2026. This is a standalone brief you can give to a coding agent. It describes the product and the most important journeys without prescribing a detailed visual design. The experiment is a separate local app; it does not replace the existing application or change its release scope.

## The assignment

Build a fresh, working Next.js prototype of Playbook's building experience app. Use this brief as product context. I will provide more detailed creative direction separately.

Create the prototype in its own new project directory, outside the existing Tenant Experience repository, and run it on an available localhost port. Use Next.js App Router, React, TypeScript, and whichever lightweight styling approach best supports the design. Use realistic mock data and simulated interactions. No live backend, real authentication, payment processing, or external message delivery is needed.

The goal is to explore a stronger frontend architecture and experience: how the product is organized, how people move through it, and how beautiful discovery pages connect to useful everyday tools. Build navigable, responsive screens with working journeys, not only a landing page or disconnected mockups.

## What Playbook is

Playbook is a hospitality and workplace experience company. It partners with commercial office building owners and operators to make their buildings better places to work, meet, gather, and stay well. Its work includes amenity strategy, physical spaces, onsite staffing, fitness, events, and the technology that supports those experiences.

This app is the digital front door for an individual building. Someone working there should be able to discover what is available, understand their access, book or reserve something, and manage it later. Someone outside the building should be able to explore publicly offered event venues and contact the events team.

The building's identity comes first. Each property has its own name, photography, personality, amenities, and content, with Playbook powering the experience. The same underlying product should adapt to different buildings without a separate rebuild for each one.

## Who uses it

| Person                                | What they need                                                                                                                   |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| An employee who works in the building | Discover benefits, use amenities, reserve classes or rooms, attend events, and manage upcoming plans.                            |
| A new building member                 | Understand what is available, what access they have, and how to take a first useful action.                                      |
| A returning member                    | Quickly find a schedule, book again, see upcoming commitments, or change a reservation.                                          |
| A public event organizer              | Evaluate a publicly offered venue and send an inquiry without creating an account.                                               |
| Building owners and operators         | Offer a distinctive building experience, increase amenity use, and connect demand to onsite teams.                               |
| Onsite hospitality staff              | Receive inquiries, help members, and operate the services. Their editing and operational tools live in a separate staff product. |

Here, “tenant” usually means a person working for a company in the building. Building affiliation and a paid fitness membership are different things. Signing in does not automatically unlock every service.

## The two main experiences

### 1. The building member experience

Before signing in, people can learn about their building and its enabled amenities. When they begin a member action, such as reserving a class, sign-in should preserve their destination and let them continue.

After signing in, the experience should reflect what the person needs. A new member needs orientation and a compelling first step. An established member needs their commitments and efficient repeat actions. An empty calendar does not mean someone is new.

This can differ by service: someone might use the gym every week but never have booked a meeting room. Keep discovery available without forcing experienced people through introductory content every time.

### 2. The public venue experience

Public visitors have a focused journey: discover the building's publicly offered venues, explore a venue, and inquire about an event. They do not need a member account.

This experience has its own navigation and content. It does not expose member fitness, account tools, or internal room inventory. Public V1 is inquiry-led: no instant reservation, availability calendar, pricing checkout, or payment. An inquiry starts a conversation; it does not reserve the space.

In the real product, the address identifies the building and audience. In this prototype, use a simple demo switch or separate route groups so both experiences are easy to review locally.

## Core functionality

### Building Home

Introduce the building and its available services. Help a new member understand why each offering is useful and how to get started. For an established member, prioritize upcoming activity and relevant next actions while keeping discovery accessible.

Show useful content rather than filling every available section. If a building has no upcoming programming, it should not display invented events or an oversized empty module.

### Meetings & Events

Support two distinct intentions:

- **Book a room:** browse member spaces, inspect capacity and amenities, choose a date/time and setup, review the details, and complete a simulated booking or request. Show its status and a way to manage it later.
- **Plan an event:** explain suitable spaces and available planning support, then collect an inquiry for the onsite events team. A catered reception or company offsite may need coordination rather than a self-service booking widget.

Member rooms and public venues may overlap physically, but their access and actions are different. Keep any prototype approval, pricing, and cancellation rules clearly identified as sample behavior.

### Fitness & wellness

Help members understand the fitness offering and then use it. Include a class schedule, class details, reserve/cancel actions, and full-class waitlist states. Also demonstrate bookable wellness resources, such as a bike studio or recovery amenity, and an introduction to personal training or private services.

Make access understandable. A person may need a fitness membership or another eligibility step before reserving. Show an appropriate next action instead of a booking button that cannot work. Membership status and a simulated billing-management destination belong in the account experience.

### Programming

These are events hosted by the building for its community: a coffee tasting, speaker series, tenant gathering, or wellness event. Show upcoming events, detail pages, RSVP/cancel actions, and full or waitlisted states where relevant.

The distinction is simple: in Meetings & Events, the member organizes the gathering; in Programming, the building organizes it. Some events can have assigned access restrictions, such as company-only or VIP access.

### Profile & activity

Give members one dependable place to see their account details, membership/access status, and upcoming bookings, reservations, and RSVPs. Let them open a commitment, understand its status, and perform its supported management action.

Home should help with “What should I do now?” Profile/activity should answer “What have I arranged, and how do I manage it?” These can share data without duplicating entire screens.

### Public venues & inquiries

Create a public homepage with a venue collection and useful building context. Venue details should include photography, an overview, qualified capacity, amenities or arrangements, and an inquiry action.

The inquiry form needs first name, last name, email, venue preference (including “Not sure yet”), and privacy acknowledgment. Optional details can include company, phone, date/flexibility, guest count, event type, budget, and a message. A detail page should preselect its venue while allowing a change.

Preserve entered information after validation errors. End the prototype flow with an explicitly simulated confirmation. Do not imply that staff received a message.

## A focused prototype to build

Use Transamerica Pyramid in San Francisco as the first building context. Treat sample venues, schedules, people, capacities, and commercial terms as demonstration content, not verified operating facts.

Build these connected areas:

1. Building Home, with signed-out, new-member, and returning-member states.
2. Fitness landing, schedule, and a class reservation journey.
3. Meetings & Events landing, a room detail/booking journey, and an event inquiry path.
4. Programming listing, event detail, and RSVP journey.
5. Profile/activity showing the results of the member's actions.
6. Public venue homepage, venue detail, and account-free inquiry journey.

Prioritize complete representative journeys over a large number of shallow screens. Reuse components when the behavior is shared, while allowing public discovery and member utility to have different compositions.

Use a small typed data layer for the building, venues, classes, events, member access, and activity. Keep content separate from layout. Mock state can live in memory or local storage; reservations and cancellations should update activity consistently across screens. Include a demo reset and an easy way to switch member states.

## Experience principles

- Make the building feel like a place with people and hospitality behind it.
- Let discovery create interest; make task completion clear and fast.
- Use purposeful copy that helps someone understand a place, service, fact, or next step.
- Design for mobile as a primary use case, including schedules, forms, galleries, and navigation.
- Include accessible focus states, readable contrast, keyboard support, and reduced-motion behavior.
- Demonstrate useful states: successful booking, full class, waitlist, access required, no upcoming activity, and a recoverable error.
- Keep building identity and enabled services configurable. Different properties will offer different combinations.

The detailed typography, color system, layout language, imagery, and motion direction will come in a separate creative prompt. This brief does not require copying the existing frontend or retaining its component structure.

## Where the existing project stands

There is already a substantial Next.js application with a separate Core backend, Auth0 sign-in, and an operations/content product called Playbook OS. Public content is authored and published through that operational system. Member services connect to real inventory, access rules, and activity.

The public venue design has been explored extensively. A hosted staging site now renders real published Bay Lounge content. Member onboarding, fitness, activity, and discovery flows have significant implementation behind them. Some live room-booking, inquiry-delivery, and other transaction acceptance remains unfinished; not every visible feature is launch-ready.

For this experiment, use the product knowledge without inheriting the integration work. Simulate the important behaviors so we can evaluate the frontend independently.

## Keep outside this experiment

Do not build staff administration, CMS editing, real payments, live integrations, production hosting, or a cross-building marketplace. Public customer accounts, contracts, proposals, deposits, and a full messaging center are later possibilities, not requirements for this prototype.

Do not modify or import the existing app wholesale. This is an independent exploration of how the same product could be presented and organized.

## What to deliver

A separate runnable Next.js project, a working localhost URL, and a short README with setup instructions, demo-state controls, and a list of what is simulated. Someone reviewing it should be able to discover a service, complete a sample action, find it in their activity, and manage it—or explore a public venue and finish a sample inquiry.
