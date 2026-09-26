# 05 · Budget minimums and qualification

## What they asked for
Leads keep coming in below what a space can rent for ("I want Redwood Park and I've got $2"). The TAP team doesn't want to publish room rates, but wants to catch these before they become leads.

- **Minimums differ by space.** None of the current venues rent below **$10,000**, and most are around **$20,000**. Meeting rooms may be added later with a floor around **$2,000**, and those can come through below $10k.
- **Before sending:** if the budget is below the minimum for the chosen space, say so and ask whether their budget is flexible.
  - **Yes:** they can change their budget.
  - **No:** they've disqualified themselves, and **no lead is created**.
- **Wiggle room:** a room that usually goes for $20k might accept $15k if it's free, so the check uses a floor, not the typical rate.
- **All-in budget:** add hint text under the budget field saying it's the all-in event budget: space, furniture and catering.

## Plan (Phase B)
- Add `minBudget` to each venue in the tenant bundle. All TAP venues start at $10,000, **marked as placeholders** until Chad and OS provide the real figures. Nothing about minimums is shown publicly.
- Budget options gain numeric ranges, so they can be compared to minimums. "Not sure yet" always passes.
- With several venues selected, the check uses the lowest minimum among them. If any one venue fits, the lead is worth having.
- The comparison is a pure function (`lib/core/inquiry/budget.ts`) with tests.
- **Later, with Chad:** move minimums into OS per space, so the events team can manage them.

## Needs
- **Chad / OS:** the real minimum per space, and where it will live in OS.
