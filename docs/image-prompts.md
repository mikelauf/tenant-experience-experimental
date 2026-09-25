# Pyramid image prompts

All 13 photos in `public/images/` were made with Bloom (brand **Transamerica Pyramid**, built from `docs/brand-brief.md`; 13 credits, all 2K on the "pro" model, first takes, no re-rolls). Everything else is drawn in code and cost no credits: the 3D tower, the setup visualizer, the service icons and the availability bars.

Use these prompts to re-roll any image in Midjourney, ChatGPT or Bloom. Keep the file names so the code doesn't have to change. After adding or replacing an image, run `zsh raw/blur.sh` to regenerate the blur-up previews.

## Shared art direction

When you use a tool that doesn't have the Bloom brand loaded, add this to the end of any prompt:

> San Francisco light: clean morning daylight, real golden hour, blue hour, or low marine fog. Documentary hospitality photography that's candid and observational, never posed stock, never flash. True color, gently warm and calm, soft contrast, fine film grain, generous negative space. Materials: quartz-white concrete, walnut, pale oak, brass, bouclé and wool, cedar, redwood bark. Diverse working professionals in smart-casual neutrals (camel, charcoal, navy, cream, olive) with an occasional muted rust. Warm interior light against cool city or bay views. No readable text, signage or logos.

**Midjourney:** add `--style raw --v 7` and the `--ar` below. **ChatGPT:** ask for "a photograph", give the ratio in words, and paste the shared direction.
**To export for the web:** `magick in.png -resize 2000x\> -quality 80 out.webp` (widths are in `raw/ids.txt`). **To re-download from Bloom:** `zsh raw/get.sh <id> <path> <width>`.

---

## In the site (13)

| File | --ar | Prompt |
|---|---|---|
| `building/pyramid-dusk` | 21:9 | The Transamerica Pyramid in San Francisco at blue hour: the tall, slender, tapering white quartz-concrete pyramid tower with its narrow vertical window grid and pointed spire, seen from street level looking up past the dark trunks and feathery canopy of mature coast redwoods in the foreground. Low marine fog drifts across the upper third of the tower and the spire glows faintly. Warm light in a few office windows. Deep blue sky. Wide cinematic composition, tower right of center, generous dark sky and fog on the left for a headline. |
| `venues/bay-lounge` | 3:2 | The Bay Lounge on the 27th floor of a San Francisco tower at golden hour, empty and ready for guests. Curved low sofas in cream bouclé and camel wool, walnut side tables, warm plaster walls, a glowing brass floor lamp. Floor-to-ceiling windows look east over the Bay Bridge and the glittering bay in low golden sun. Wide interior view at seated eye level, soft long shadows across a pale oak floor. |
| `venues/bay-lounge-evening` | 4:5 | An evening reception in a high-floor lounge in San Francisco. About thirty guests in smart-casual neutrals mingle with wine glasses around curved cream sofas and walnut tables, with warm low lamplight and candles and a bartender at a walnut bar in the background. Tall windows behind them show the Bay Bridge lights and the blue-black city at night. Candid documentary angle from just behind a guest's shoulder. |
| `venues/redwood-park` | 3:2 | A half-acre grove of tall coast redwoods at the base of a downtown San Francisco office tower at dusk, set for an evening event. Long walnut tables with linen and small candle lanterns line a stone path, warm string lights hang between the redwood trunks, there's a small fountain, and a few early guests are arriving. The surrounding city buildings glow softly through the trees. Wide observational view at eye level, deep blue sky above the canopy. |
| `venues/montgomery-hall` | 3:2 | A daylight-filled conference hall in a San Francisco office building set in theater style: rows of upholstered oak chairs facing a low stage with a simple lectern and a large blank screen. Pale oak floor, charcoal acoustic felt wall panels, and tall windows with sheer curtains letting in clean morning light. A few attendees are arriving and chatting. Wide view from the back corner. |
| `spaces/boardroom` | 4:3 | A boardroom for fourteen in a San Francisco office tower: a long walnut table with woven leather chairs, a blank wall display, a brass pendant light, and a credenza with a carafe and glasses. Tall windows show the neighboring Financial District towers in soft late-morning light. Empty and ready, shot at standing eye level from the end of the table. |
| `spaces/huddle` | 4:5 | A small warm meeting room for four: two colleagues, a Black woman in her 30s in a camel sweater and an older East Asian man in a navy overshirt, talk over coffee at a round pale oak table with a laptop open. Behind them are a warm plaster wall, a whiteboard with abstract sketches (no readable text) and a leafy plant. Soft side light, shot candidly through the open glass door. |
| `fitness/strength` | 4:5 | A small-group strength class in a calm, premium office-building gym in early morning light. Five people of different ages lift kettlebells and dumbbells on dark rubber flooring while a coach in charcoal gently corrects a woman's form. Oak wall slats, neatly racked equipment, tall windows with city light. Candid, shallow depth of field. |
| `fitness/ride` | 3:2 | An indoor cycling studio during a class: two rows of matte black bikes with riders mid-effort, and low amber light washing down a cedar-slatted wall, with a soft rust glow near the instructor bike. Moody but inviting, slight motion blur on legs, wide view from the side of the room. |
| `fitness/recovery` | 4:5 | A quiet recovery lounge in an office-building fitness club: a round stone-lined cold plunge beside a cedar sauna whose glass door glows warm, oatmeal towels folded on a teak bench, a pale plaster wall and a single fern. Soft diffused light, faint steam, no people, low eye level. |
| `programming/cupping` | 4:5 | A morning coffee cupping on a long walnut bar: rows of small ceramic cups and bowls of beans, and a roaster in an olive apron pouring from a gooseneck kettle while three office workers lean in to smell the cups. Steam catches soft window light. Close and candid, hands and cups in focus. |
| `programming/talk` | 3:2 | An evening speaker talk in a high-floor lounge: a speaker in a charcoal jacket sits on a low stool mid-sentence, gesturing, while about forty people listen from rows of chairs and curved sofas, seen from behind. Tall windows behind the speaker show the city and bay at dusk. Warm lamplight, documentary, wide. |
| `people/host` | 4:5 | Environmental portrait of a Latina hospitality and events lead in her late 30s standing in a warm high-floor lounge. Her dark hair is pulled back, and she wears a tailored cream shirt and a camel blazer with a small rust enamel pin and holds a slim leather folio, with a relaxed, genuine smile, looking just off camera. Behind her, walnut and bouclé furniture and a bright bay-view window are softly blurred. |

## Extras, ready when you have credits (12)

These fill gaps the prototype currently covers by reusing images (noted in brackets).

| Suggested file | --ar | Prompt |
|---|---|---|
| `building/lobby` | 16:9 | The lobby of a 1970s San Francisco tower, restored: pale travertine floors, a long walnut concierge desk with a brass lamp, tall glass doors onto a redwood grove, and two people checking in with a smiling concierge. Morning light, calm and generous. *(Concierge step, sign-in)* |
| `building/aerial-fog` | 21:9 | High aerial view of San Francisco's Financial District at sunrise, with a slender white tapered pyramid tower piercing a layer of fog while the bay and Bay Bridge glow beyond. Quiet, cinematic, lots of sky. *(Alternate public hero)* |
| `building/crown-night` | 4:5 | Looking straight up the side of a slender white tapered skyscraper at night toward its lit aluminum spire, with fog glowing around the crown and warm windows below. *(The "crown" stop in the 3D section)* |
| `venues/redwood-detail` | 4:5 | Close detail in a redwood grove at dusk: a candle lantern on a linen-covered walnut table with glasses of wine, string lights softly out of focus, and the fibrous red bark of a giant trunk beside it. *(Redwood Park gallery)* |
| `venues/montgomery-banquet` | 3:2 | The same daylight conference hall reset for a seated lunch: round tables of eight with white linen, low floral arrangements and pale oak chairs, with staff finishing the table settings. *(Montgomery Hall gallery; currently reuses the boardroom)* |
| `venues/bay-lounge-dinner` | 3:2 | A long candlelit dinner table for twenty down the middle of a high-floor lounge at blue hour, with walnut chairs, linen, low flowers and the lit Bay Bridge beyond the glass. Guests are just sitting down. *(Bay Lounge "banquet" setup)* |
| `fitness/pilates` | 4:5 | A small pilates mat class in a calm studio with pale oak floors and tall windows: six people in neutral activewear hold a side plank while an instructor walks between them. Morning light, serene. *(Pilates class; currently reuses strength)* |
| `fitness/run-club` | 3:2 | A small group of office workers in running gear jogging along the San Francisco Embarcadero at 6pm, with the Bay Bridge behind them, fog rolling in and everyone laughing mid-conversation. *(Run club; currently reuses the tower)* |
| `fitness/coach-portrait` | 4:5 | Environmental portrait of a strength coach in his 30s, a South Asian man in a charcoal training top, arms folded, relaxed smile, leaning on a rack of kettlebells in a sunlit gym with oak slats. *(Coach cards; currently initials)* |
| `programming/mixer` | 3:2 | An after-work company social in a warm lounge: small groups laughing around high-top tables with glasses of wine and small plates, and a city view going blue outside. Candid. *(Company-only event; currently reuses the reception)* |
| `programming/grove-music` | 3:2 | A jazz trio (upright bass, guitar and a singer) playing under string lights in a redwood grove at dusk, with office workers on picnic blankets and folding chairs, glasses in hand. *(Evening in the grove; currently reuses the park)* |
| `people/concierge` | 4:5 | Portrait of a friendly concierge in his 50s, a Black man in a navy suit with a small rust pin, standing behind a walnut desk in a travertine lobby and looking warmly at the camera. *(Onboarding "meet the concierge")* |

## The Meridian (fictional second building), ready when you have credits (8)

The Meridian is a 1931 setback tower in Chicago's Loop with a lit lantern crown. Its accent is lake blue (`#2C4F8C`), and its materials are limestone, walnut, brass and terrazzo. Until these exist, its interiors reuse neutral Pyramid photos and its heroes render the 3D tower. Save these under `public/images/meridian/` and register them in `lib/tenants/meridian/images.ts`.

| Suggested file | --ar | Prompt |
|---|---|---|
| `meridian/tower-dusk` | 21:9 | A 1930s Art Deco limestone skyscraper in Chicago's Loop at blue hour, stepping back in three setbacks to a glowing blue-lit lantern crown and a slender mooring mast. The Chicago River below reflects the lights, warm office windows glow, and the sky is deep blue. Cinematic and wide, shot from across the river. *(Public and member hero)* |
| `meridian/lantern-room` | 3:2 | The top-floor lounge of an Art Deco tower: a walnut cocktail bar with brass rails, deep green velvet armchairs and a terrazzo floor with an inlaid compass. Windows on all sides show Lake Michigan and the Chicago skyline at dusk. Warm lamplight, no people. *(Lantern Room hero)* |
| `meridian/lantern-reception` | 4:5 | An evening reception in the same crown lounge: about forty guests in dark suits and cocktail dresses with glasses in hand, a bartender at the walnut bar, and city lights through the tall windows. Candid, from behind a guest's shoulder. *(Lantern Room gallery)* |
| `meridian/great-hall` | 16:9 | A double-height Art Deco lobby hall with coffered walnut ceilings, fluted limestone columns, pale terrazzo floors and a brass clock over the concierge desk. Morning light through tall windows at both ends, a few people crossing. *(Great Hall hero)* |
| `meridian/great-hall-gala` | 3:2 | The same deco hall set for an evening gala: round tables with white linen and candles, a small stage, and warm uplighting on the columns. Guests are arriving. *(Great Hall gallery)* |
| `meridian/wacker-room` | 4:3 | A small corner meeting room high over the Chicago River: a round walnut table for five, a wall display and a steel-framed window onto the river and bridges in daylight. *(Wacker room)* |
| `meridian/plaza` | 3:2 | A granite plaza at the foot of a limestone tower with round honey-locust trees, benches, and office workers at lunch in early autumn sun. *(Plaza and architecture walk)* |
| `people/rosa` | 4:5 | Environmental portrait of a Scandinavian-American events lead in her 40s with short silver-blonde hair, a navy blazer and a small blue enamel pin, smiling in a deco lounge with walnut and brass softly blurred behind her. *(Host; currently initials)* |
