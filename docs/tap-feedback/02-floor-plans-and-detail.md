# 02 · Floor plans and venue detail

## What they asked for
Floor plans and setup diagrams for every venue (classroom, boardroom, theater and so on), and more accurate interactive diagrams. Spencer: "V1 having [the layout] of the space and then having photos of the views would be really helpful."

## What the booklet gives us
A floor plan for all five venues, each labeled with the surrounding streets:

| Venue | Plan page | What's drawn |
|---|---|---|
| Redwood Park | p13 (site plan) | Stage, bar, food trucks, portable restrooms, guest check-in, Mark Twain Alley |
| The Sandbox (L3) | p21 | **Theater style 100** and **Cocktail 200** setups, bars, check-in, catering area |
| Bay Lounge (L27) | p29 | Coffee bar, lounge seating, screen, pantries, the Foster and Pereira rooms, elevators 1–27 / 27–48 |
| Legacy Gallery (L36) | p37 | DJ, bar, chef stations, LED wall, AV/tech room, catering prep (375 sq ft) |
| Sky Bar (L48) | p37 (second) | Central bar, window seating on Washington and Clay, pantry |

## Plan (Phase A)
- Render each plan to an image and show a **"Floor plan"** section on the venue page, with a zoomable lightbox. It's real data, so it ships in production.
- The Sandbox's two real setups replace our estimates.
- The 3D setup viewer stays hidden in production until each venue's layout is traced from these plans. That's the next step.

## Plan (Phase B): shipped
- Every venue's room is **traced from its plan** into 3D (`lib/tenants/pyramid/shells.ts`), including the cores, the Foster and Pereira rooms, fixed bars, screens, and Redwood Park's grove, stage and neighbours. The plans have no scale bar, so each trace is scaled to the booklet's square footage.
- The venue page opens with **The space**: 3D setups, floor plan and the view as tabs. A guest-count slider re-flows the room live and hands the count to the inquiry. It ships in production for all five venues.
- From the booklet: The Sandbox theater 100 and cocktail 200, and Bay Lounge's 30-seat boardroom. Everything else is an estimate and says so.
- **Spencer to confirm:**
  - Sky Bar: reception 80, lounge 50, banquet 48
  - Bay Lounge: reception 130, theater 90, banquet 72, lounge 60
  - Legacy Gallery: reception 120, banquet 80, theater 110
  - Redwood Park: reception 1,500, concert 1,000, banquet 400

## Needs
- **Oscar:** higher-resolution or vector plans. The PDF renders are readable but soft when zoomed in.
