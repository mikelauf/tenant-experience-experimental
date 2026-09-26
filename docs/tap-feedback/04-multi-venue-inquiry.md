# 04 · Several venues in one inquiry

## What they asked for
Let people pick several venues in one inquiry, so they don't fill the form out twice when weighing options. Date and estimated guests become **required**.

## Plan (Phase B)
- Venue tiles become checkboxes: 1 to 5 venues, or "Not sure yet" on its own. Shortlist hearts and `?venue=` pre-select.
- **Contract:** add `venues: string[]` to `lib/core/inquiry/contract.ts`. Core's `requested_venue_text` is free text, so we send the names joined ("Sky Bar, Bay Lounge"), capped at 500 characters.
- The capacity hint uses the largest capacity among the selected venues.
- Date and guests are required in both the form and the shared server validation.
- A better date picker, and a guest count you can type into, keeping the ±10 buttons.

## Needs
- **Matt:** confirm Core's length limit for `requested_venue_text`.
