# Before the first cut: what a checklist catches for free

Walk this on the stills (step 4, the stills gate), before any full export. Every item here was found by a fresh reviewer on a real film, round after round, after the export. Each one is visible in a still, so finding it there costs seconds.

**Why it exists.** On a 40 second product ad, three fresh reviewers in a row returned the cut for things on this page: labels too small for a phone, the surprise arriving at second three, nine seconds of screen with no person, a status that said "ordered" two shots after another said "delivered". Three rounds and two hours moved the score by half a point. None of it needed a reviewer.

## 1. Read it at phone width
Run `node <skill>/scripts/text-audit.mjs` from the film folder first: it measures every word the film draws and fails the ones too small for a phone (and the ones in section 5 that are not up long enough to read). Then make the 360 px sheet of every frame that carries words (`review-pack.sh --text`, or scale the stills) and read it without zooming, because the script cannot see words inside pictures.
- The captions usually pass. The misses are the small things: status chips, tags, counters, menu items, button labels, names under icons.
- A screen or a list is shown as a close crop, not whole: crop in until its text passes at 360 px. A whole screen at once is a screenshot nobody can read.
- A label never runs into the icon or picture beside it. Leave the gap, or make the card wider.

## 2. The first second
- The whole hook is on screen inside the first second, the surprising half included. If the turn is "and two agents", it is up by 0.8 s, not at 3 s.
- Frame 0 is not a bare picture waiting for its words.
- The picture may run ahead of the voice. Do not hold the words back to match a spoken line.

## 3. People stay in the film
- No stretch longer than about six seconds of interface or type with no person and no real result. Break it with a picture, or keep the picture alive behind the interface.
- If the film opens on people, they come back before the end.

## 4. What is on screen agrees with itself
- Every state agrees with every other frame: a status, a counter, who owns what, a name, a price, a day. Read the stills in order for this alone.
- Nothing has happened before the film shows it happen. If a step adds something, it is not already there a shot earlier.
- The voice and the line on screen use the same words. A brand line shown in full is spoken in full.
- Two different things look different. Two agents, two plans or two people that share one plain shape read as one.

## 5. Payoffs get time
- The beat the story turns on holds at least 1.2 s after it lands, on screen and before the cut. A payoff that lands 0.4 s before a cut was not seen.
- The one thing to do (the button, the link) holds three seconds or more. It is never the shortest hold in the film.
- A screen the viewer must read (a chat, a phone, a document) holds about 0.3 s a word plus 1 s and moves slowly while it is read. Fill the frame with it while it is read, then go back. `text-audit.mjs` cannot see words inside pictures or rendered screens, so time these by hand. No time to read it: do not show it.

## 6. Nothing sits on what matters
- Not on a face, not on the hand doing the action, not on the thing the person is looking at (a phone, a page).
- Nothing important is cut by the frame's edge, and nothing waits half off-screen. `node <skill>/scripts/edge-audit.mjs` lists what is cut by the frame, by a window inside it, or by the edge of a picture (see `pipeline.md`).
- In stacked lines of type, a descender does not run into the line below.

## 7. Things that travel
- An element that crosses the frame arrives without overshooting. A bouncy spring over a long distance throws it across its neighbours; keep the bounce for things that pop in place.
- Its sound lands on the arrival, not on the take-off.
- A thing that leaves a picture and reappears in an interface is hidden in between, or it reads as stray clutter.

## 8. Only what the product does
- Every screen shows something the product really does, or is plainly an illustration the person agreed to (`SKILL.md`, step 1c). List the illustrated screens now; the list goes in the delivery note.

## 9. Real things look like the real thing
- Every real object in the story (a ballot box, a form, a uniform, a shop, an app screen) is made from real reference photos collected before the build, down to colour and material. Viewers know these from life and catch them first.
- Real-world logic holds: a lift does not move while its door is held, a clock never runs backwards between scenes, the same person keeps the same face from the first shot to the last.
