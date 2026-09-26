# 03 · OpenTable-style flow and accounts

## What they asked for
Make it as frictionless as OpenTable: do the task first, and only at the end enter a phone or email to sign in. Accounts link through that identifier, so people can use a personal email or phone instead of a work email.

## What Wayfinder already decided (lulafit/knowledge-base#296)
This is Spencer's product map, and it's the source of truth:
- **Public inquiries stay profile-free.** A profile only begins when an action needs a reservation, payment or ongoing management: accepting a booking proposal, a paid event, or a limited-capacity registration.
- **Sign-in:**
  - A verified email is the account anchor, used with an email code or magic link.
  - Phone is optional, for later sign-in and security. Passwords are optional too.
  - Google, Apple and Microsoft sign-in at launch.
  - Building members verify a work email once, and can still log in with a personal email.
- **The action is never lost** during sign-in or registration.
- Matt is finishing lead-to-user conversion in OS (due Monday, Sep 28), so a lead can become a user for retargeting and email.

## What this means for us
- **Now (Phase B):** the inquiry becomes a step-by-step flow with contact details on the last step: when → where → the event → your details. No account, which matches Wayfinder.
- **Later:** accounts, the Public Customer Activity Center and passwordless sign-in follow Matt's engineering breakdown of the Wayfinder PRD. The PRD wasn't on `main` as of Sep 25.

## Needs
- **Matt:** the Wayfinder engineering breakdown, and how lead-to-user conversion shows up in Core's API.
