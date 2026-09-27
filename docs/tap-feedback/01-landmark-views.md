# 01 · Landmarks, views and clickable floors

## What they asked for (Sep 25 meeting)
- **Landmarks for orientation:** the TAP team named Coit Tower and the Bay Bridge. The Gemini notes say "Quite Tower"; that's a transcription error.
- **Views:** "for the higher floors, the question they always get is what are the views like." Show the floor, then a section of view photos you can click through.
- **Redwood Park:** the questions are about its layout. Use the aerial image and graphics of the park.
- **Entrances and the loading dock:** nothing on the site shows where the Redwood Park entrance, the building entrances or the loading dock are.
- **Click, don't scroll:** Spencer "gets jammed" by the scroll-driven tower. He wants to click a floor (for example "that orange floor") so the model zooms to it and shows its views. He also wants jump links such as "Redwood Park" or "Loading dock", with a Google Maps pin for getting there in person.
- **Later (V5):** a Google Maps-style 3D virtual tour for people booking from overseas. This needs an on-site capture.
- The TAP team "went crazy" for the 3D model. It's their V2.

## Where we are today
- The tower is procedural (`components/three/tower/TowerCanvas.tsx`, `lib/tower.ts`). The city around it is random boxes, and Redwood Park is on +x.
- `components/public/FloorByFloor.tsx` moves the tower as you scroll. That's the part Spencer found jarring.

## What the booklet gives us
- Every floor plan is drawn the same way round: **Washington St at the top (north), Clay St at the bottom (south), Montgomery St on the left (west), Redwood Park on the right (east).** That fixes the model's compass.
- Real view photos: Coit Tower, Alcatraz and the bay from Bay Lounge (L27); Alcatraz, Angel Island and the Bay Bridge from Sky Bar (L48); Saints Peter and Paul Church and Mount Tamalpais from the upper floors.
- The Redwood Park site plan (p13) shows guest check-in at Mark Twain Alley / Sansome, food trucks and portable restrooms on Washington, the bar, and Two and Three Transamerica next door. **No loading dock is labeled.**
- Elevators: floors 1–27 and 27–48, so Level 27 is the transfer lobby.

## Plan (Phase D)
1. **Set the compass:** north = −z, matching the plans.
2. **Landmarks:** place stylized models by their real bearing and distance from 600 Montgomery: Coit Tower, the Bay Bridge, Alcatraz, the Ferry Building, Salesforce Tower, Saints Peter and Paul Church, and the Golden Gate Bridge on the horizon. Each gets a label.
3. **`BuildingExplorer` replaces the scroll-driven tower:**
   - Clickable floor bands, plus a jump list: Redwood Park, L3, L27, L36, L48, Entrances, Guest check-in.
   - Selecting one moves the camera and opens a panel: venue photos, **"The view from here"**, and a link to the venue.
4. **Ground pins** for entrances, guest check-in and food trucks, each linking to Google Maps. The loading dock is listed as "coming" until Oscar's diagrams arrive.

## Landmark pass (Sep 26)
Models live in `components/three/tower/landmarks.tsx`, placed from `landmarks` in the tenant profile.
- **Detailed:** Coit Tower (fluted column, arched gallery, wooded Telegraph Hill), the Ferry Building (arcaded shed, Giralda-style clock tower with lit faces), Saints Peter and Paul (twin staged spires, rose window), Alcatraz (cellhouse, lighthouse, water tower), the Bay Bridge (both western suspension spans, the mid-bay anchorage, Yerba Buena Island, the white eastern span, and the Bay Lights shimmering on the hangers after dark), and the Golden Gate (stepped Art Deco towers, portal struts, hanging cables, beacons).
- **Added** to fill the south and southwest, where only Salesforce Tower stood: **Oracle Park** (brick bowl, light towers, clock tower, the Coke bottle and glove) and **City Hall** (colonnaded front, dome, gilded lantern). Both are drawn larger than life so they clear the city blocks.
- Everything floodlights at night, in step with the scene's light.
- **Candidates for later:** Sutro Tower on the southwest horizon (needs land to stand on, since the scene's ground ends at the city's edge), Pier 39 / Fisherman's Wharf, Embarcadero Center, and Chinatown's Dragon Gate at street level. Worth asking the TAP team which ones their guests mention.

## Needs
- **Oscar:** raw files, street-view, parking and loading diagrams, and the Redwood Park aerial. Send him the booklet link.
- **More view photos per floor**, especially Legacy Gallery (L36).
