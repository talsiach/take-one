# Real pictures and moving shots

Code draws type, motion, screens and illustration. It cannot draw a believable person, a real place or a product out in the world. When the film needs those, an image model makes the pictures and a video model makes the important ones move; code does everything around them. Both go through the cost rule in SKILL.md: read the real price, say it, wait for a yes.

Say the ceiling at the pitch: pictures that only pan and zoom hold a real-looking film at about 7 out of 10. If the person wants it to feel filmed, the shots people look at have to move.

## Pictures

- **Free first, where it exists.** An unlimited image plan the person already has (for example Nano Banana Pro in the Higgsfield web UI with Unlimited switched on: check the switch before every generate), or their own ChatGPT from prompts you write. Otherwise price it.
- **One hero example for the whole film.** One product, the same few people, the same world. A run of unrelated pictures reads as a slideshow.
- **Keep the product the same.** Make one clean picture of the product alone first and give it as the reference for every later picture. Describe the product in the same plain words each time.
- **Keep the people the same.** Make every picture from one approved reference picture of the people, say "the exact same people", and describe each one in a plain line.
- **Caught, not posed.** Ask for an observed moment: each person doing a real task, nobody looking at the lens, a doorway or over-the-shoulder view. A smiling group facing the camera reads as stock and is not believed. Make one picture, show it, then make the set.
- **Check each picture like a stranger would.** Is what they are doing physically possible? Is every readable word spelled right, at full size? Keep background signs out of focus. Never let a model draw a logo; place the real one in code.
- **Leave room.** Ask for free space where the type will go. Nothing solid sits on a face.
- **The same product in a new place: say "change only the place", and say which half holds what.** Give the cleanest picture of the product as the reference and write: keep the product exactly as it is (list its parts and any lettering), same position, size and camera angle; change only the place around it. Then lay the picture out in words: "on the LEFT half, behind the product: ...; the RIGHT half is a plain dark wall with nothing on it, from the top edge down to the product". The first try without the layout put sketches and boxes exactly where the headline had to go; the second try with it gave a clean wall, and the lettering on the product held in all four pictures.
- **Type behind a person or a product** needs a cut-out of the subject: `swift scripts/matte.swift in.jpg out.png` (macOS, free, local). Draw the picture, the word, then the cut-out on top. Cut from a sharp picture made for it (the object alone on a plain ground, at the size it will be shown or larger); a cut-out taken from a small corner of another picture and blown up is blurry. Give it a soft shadow onto what is behind it, or it looks pasted in.

## A still as a shot with depth

A picture that holds the frame for a second or more should not only be zoomed: a zoom reads as a picture being enlarged. Cut it into layers and move them apart, and it reads as a camera moving in a room. Free, local, in code. First used for the two-second opening of the short Take One launch film (11 Oct 2026). **It is not enough for an opening:** the owner's note was "we want the headphone to move", and a fresh reviewer measured 20 to 40 px of movement in two seconds and called it "a still on a phone". Use it for a shot inside a film; open on real footage.

1. Cut the subject out: `swift <skill>/scripts/matte.swift photo.jpg cut.png`.
2. Fill its place in the picture: `python3 <skill>/scripts/plate.py photo.jpg cut.png plate.jpg`.
3. In the page draw three layers in this order, each with its own scale and slide about the frame's centre: the plate; what belongs between them (a headline word lands best here: it sits in the room and the subject passes in front of it); the cut-out. All three start on the same transform, so the first frame is exactly the photograph.
4. Move them like a camera. Over two seconds at 1920 wide: the plate grows about 1.5 % and slides about 13 px one way, the cut-out grows about 5 % and slides about 14 px the other way, the middle layer sits between. Keep the cut-out within about 3 % of the frame of its own place: the fill is only good for a rim.
5. Add what a room has: a slow hand-held drift on every layer (the nearer, a little more); one soft light that crosses the subject (draw the cut-out on a small offscreen canvas, fill it `source-in` with a moving gradient, lay it over the subject with `overlay`, which lifts the colour; `lighter` greys it); a few specks of dust, some drawn before the cut-out and some after.
6. A word that lands in the picture scales from its own middle, never from its left edge, or its first frames run off the frame.
7. Look at the subject's edges at full size on the last frame of the move. A doubled edge means the layers moved too far apart, or the hole needs a larger `--grow`.

It is still one picture. Use it for a shot of about two seconds inside the film, and say at the pitch what a video model would add (the product turned or handled, a person moving) and its price. Before paying for a new clip, look through the clips the project already has: a shot made for another part of the film can be used again at no cost (ours was the ad's own product shot; say so, because the viewer will see it twice).

## Moving shots

Movement comes last: after the cut works with pictures and the person has seen it. Then pick the few shots where motion shows.

**Where it pays, in this order:** the opening shot; a product shot held two seconds or more; each shot of a person held about a second; an end card that sits still. Type, screens and anything with exact words stay in code. A clip, once made, can play again wherever the same picture appears at no cost.

**Read the model first.** Model facts change in weeks. Before the first clip, read what the person's service offers today and the chosen model's limits (lengths, sizes, what a start picture needs), the same way as the price, and say what you read. `video-models.md` has the rule and dated notes on the models we have used; where it and the live read disagree, the live read wins.

**Money.**
- Read the price before every render (on Higgsfield: the same call with `get_cost: true`) and show it. Prices change; never quote from memory.
- A clip has a minimum length (4 s for Seedance 2.5), so a half-second shot costs the same as a four-second one. Count clips, not seconds, and give the total before the first render.
- Resolution: anything shown full frame gets 1080p. A 720p opening looks soft from the first second, and cropping into it makes it worse. Saving credits there is a false saving.
- A low-resolution draft is extra money, not a discount: finishing it costs the same as rendering directly. Use a draft only to test a risky idea.
- Price every video model the person has before choosing, not only the best-known one. On our launch film a cheaper model at native 1080p (Kling 3.0 Pro) gave a sharper opening than the expensive one at 720p, for about a sixth of the price per clip, and the owner approved it on sight.
- One render per shot. Check the prompt twice before sending. A call that fails validation is not charged; a call that times out may have started, so read the job history and the balance before sending it again.

**The prompt.** The picture already shows the scene; describe the change.
1. One sentence that locks what must not change (the product, the faces, the clothes, any lettering: "stays exactly as it is").
2. One camera instruction, small and slow. If the film's own camera does the move in code, ask for a hand-held frame that stays on this exact framing.
3. One small thing that happens, per person or object, "in real time, already in motion from the first frame".
4. The bans: no new objects, no text, no morphing, no flicker.

**What goes wrong.**
- Two different pictures as first and last frame do not give a camera move between them; they dissolve. For a story in several moments, make one picture per moment, animate each alone and cut.
- Fast hands, tiny lettering, liquids, crowds and mirrors are weak points. Check lettering while the clip plays, not only on its first frame.
- **Keep footage at its own size.** A 1080p clip is soft long before mush: past about 1.1x a face starts to lose detail, and at 1.25 to 1.3x the owner called it blurry on first watch, next to sharp type that then looked pasted on. A push-in that ends near 1.1x is fine; a "closer shot" made by zooming the same clip is not. A close-up is its own picture and its own clip. `scripts/plate-audit.mjs` measures every big picture the film draws and fails one drawn at 1.2x or more (see `pipeline.md`).
- **Slow motion made by mixing two frames ghosts faces.** Stretching a clip to fit a slot by laying the next frame over the current one, partly see-through, gave a doubled outline round a face and smeared eyes for a third of a second, and softened every shot it touched. Play the clip at its own speed and pick the stretch that fits, end the shot earlier, or hold clean frames (a slight stutter is less visible than a ghost). The plate audit lists every BLEND.
- An upscaler is a rescue, not a plan. It sharpened soft clips, but the owner still saw the opening as lower quality than the rest; rendering again at native 1080p fixed it. At twice the size an upscaled clip paints skin.
- A person on a screen inside the picture (a video call, a TV) copies the gestures of the person in the room unless told otherwise. Say who moves and who only listens.
- When several shots form a set (four colours, three reasons), treat them alike: if three get a wide shot and then a different close-up, the fourth does too. The odd one out is what the viewer notices.
- Judge sharpness by looking at the frame at the size it plays, next to its neighbours. A sharpness number can say the opposite of what the eye sees.
- Several jobs can run at once up to the service's limit; the one over the limit is refused and not charged.

**Into the film.**
```bash
python3 <skill>/scripts/clip.py clip.mp4 <name> [start] [seconds] [width]   # one picture per film frame -> assets/seq/<name>/, listed in assets/seq.js
python3 <skill>/scripts/cutseq.py <name> [frames]                            # a cut-out per frame, for a word behind a moving person (macOS)
```
**A word behind a subject that moves, without heavy files.** A cut-out picture for every frame is large (about 1.5 MB each at full size). Keep only the mask: cut each frame out at half size (`matte.swift frame.jpg cut.png 960`), keep its alpha, average each mask with its two neighbours (1:2:1) so the edge does not flicker, and save it as a two-channel PNG (black, alpha): about 20 KB a frame. In the page draw the footage, draw the words on their own canvas, wipe them with the mask (`destination-out`, drawn with the footage's transform), then lay that canvas over the footage. The footage is never touched and the words sit behind the subject on every frame. A word that sits further away than the subject grows less than the footage when the camera pushes in.

**A 24 fps clip in a 60 fps film.** For a slow camera move, make the in-between frames instead of repeating frames: `ffmpeg -ss <start> -t <seconds> -i clip.mp4 -vf "minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1" -q:v 2 f%03d.jpg`. Look at three made-up frames at full size before using it (fast hands and fine patterns can tear); a slow move round an object came out clean.

In the page, load `assets/seq.js` and draw frame `floor(seconds * fps)` of the sequence, falling back to the still when the clip is not there. A shot uses only part of a clip: take the liveliest stretch, unless the shot has to match a still across a cut, then take the stretch closest to that pose.
