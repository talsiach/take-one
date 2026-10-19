# Render pipeline (canvas styles)

The watercolor style uses the Claude Animation Base's own `render.mjs`. The other styles use this skill's scripts.

In the commands below `<skill>` is the folder that holds `SKILL.md` (in Claude Code usually `~/.claude/skills/take-one`).

## New project

```bash
bash <skill>/scripts/new-canvas-project.sh ~/my-video
```
Creates the folder, copies `serve.mjs`, `frames.mjs`, `export.mjs` and `springs.js`, installs `playwright-core` (uses the installed Google Chrome, no browser download), and writes a starter `film.html` with the contract below, already loading the springs.

## Springs (all motion that isn't a deliberate cut or step)

`springs.js` is a closed-form damped spring: the value at any t is computed directly, no frame history, so it keeps the any-order contract and passes the gate. `Spring.to(t, [[t0, v0], [t1, v1], ...], 'camera')` sums one spring per target change, so a retarget mid-flight keeps its momentum; `Spring.to2` does points; `Spring.unit(t - start, 'playful')` is a 0-to-1 response for scale, opacity or a mask. Presets and when to use each are in `timing.md`; `Spring.settle(preset)` gives the settle time for planning holds. Verified against RK4 integration of the same ODE (all four presets, a retargeted path): agreement within 0.01% of the move.

## The film.html contract

- One HTML file (plus `assets/`), a canvas at the output size (default 1920x1080).
- `window.FILM_DURATION = <seconds>`
- `window.renderFrame(t)` draws the exact frame for time t. Pure function of t: no state carried between frames, seeded randomness only (hash of an index, never `Math.random()` at draw time). Frames render in any order.
- `window.READY = true` only after images are loaded/processed and `document.fonts.ready` resolved.
- Autoplay loop + small play/pause/scrub controls outside the canvas (for the user to scrub in a browser).

## Review

```bash
cd ~/my-video
node frames.mjs 0 0.5,2,4,6,8,10     # square/landscape: PNGs + contact sheet in review/square/
node frames.mjs 1 0.5,2,4            # ?portrait=1 variant
FILM=other.html node frames.mjs 0 3  # a different file (output in review-other/)
```
Read the PNGs and `sheet.png` with the Read tool. Console errors are printed (a favicon 404 is harmless).

## Quality gate (before showing anything rendered)

```bash
node <skill>/scripts/gate.mjs film.html                    # 1 determinism + 2 contract scan
node <skill>/scripts/gate.mjs film.html --mp4 out.mp4 --holds "12-14" --cuts "4.5,9"   # + 3 dead air, 4 pops
node <skill>/scripts/gate.mjs --self-test                  # prove the gate itself still catches bugs
```
The stillness checks compare frames 1/30 s apart, so a film gets the same answer at 30 and at 60 fps. A clip that plays inside the film at a lower frame rate than the film (a 30 fps video in a 60 fps film) holds each of its frames for two of ours, so every new clip frame reads as a pop: declare it on the page, `window.FOOTAGE = [[from, to, fps]]`, or with `--footage "13-18.5@30"`, and the gate measures that stretch once per clip frame. Cuts inside the clip are still found and still need declaring. Words that land whole on a beat are pops too: give each a three or four frame fade, and declare only the real hits. The burst on a music hit and any deliberate dip to black are declared (`--cuts` for the first, `--holds` for the second) rather than softened. Run it twice per film: checks 1-2 right after the first shots draw (a stale cache or a `Math.random` found now costs minutes, found after a 9-minute export costs the render), and all three on the exported MP4 before the user sees a single frame or contact sheet. It samples ~12 frames cold-forward vs warmed-reverse (md5, PSNR > 45 dB fallback) and on a mismatch names the poisoning frame ("ORDER-DEPENDENT: drawing frame X first changes frame Y" = a cache key missing a term or leaked ctx state). Deliberate stills go in `--holds`. Check 4 (pops) lists every frame whose difference from the last is over 3x its six neighbours': each one is either an intentional hard cut, declared with `--cuts` (or `window.CUTS`), or a bug to fix (an element appearing with no ease, a flood clearing too fast so it reads as a flash). It resolves playwright-core via the `node_modules` symlink beside it in `scripts/` (or `PLAYWRIGHT_NODE_MODULES=/path/to/node_modules`); it only reads the MP4, never writes to the project. Adapted from anidoodle (Apache-2.0).

## Footage inside a frame (a screen in a player, a strip of an earlier film)

```bash
python3 <skill>/scripts/content-box.py capture.mp4 12.0 2.5 --rest --keep 160-900     # where the content sits, and the crop to use
```
Measure before cropping: the script finds the box of everything that is not ground in that stretch and prints an ffmpeg `crop` and `scale` that keep a clear margin round it for the space the film gives it (`--fit 1344x598`). When the content is wider than the space the strip comes out shorter: centre it, do not cut it. Blank what you leave out (a header row, a caption) with `drawbox` before the crop, and draw a dark strip `lighten` over the player's dark ground so the two grounds are one. Declare the footage's frame rate (`window.FOOTAGE`) for the gate.

## Text audit (what the words on screen actually do)

```bash
node <skill>/scripts/text-audit.mjs                 # film.html in this folder
node <skill>/scripts/text-audit.mjs cut.html --step 0.05 --ignore "lorem|^\\d+$" --json text.json
```
Run it at the stills gate and again before the reviewer. It draws the film frame by frame, records every `fillText` and `strokeText` (the text, its size on screen, where it sits, how opaque), joins the samples into "this text was up from A to B", and reports:
- **SMALL**: held 0.6 s or more and under 3.3 % of the frame height (FAIL) or under 4.3 % (WARN). At 1920x1080 that is 36 and 46 px: about 6.5 and 8.5 px on a phone.
- **FLASH**: a caption or card that is not up long enough to read (0.4 s plus 0.2 s a word). A line typed letter by letter in one place (a prompt) counts as one piece from its first letter. A fast roll (a count whose name changes every beat, read at one fixed spot) flags on every name: it is not a caption, so pass the names to `--ignore` and tell the reviewer it is a roll. When the film replays itself inside a small player (a rewind, a film in the film), set `window.TEXT_AUDIT_SKIP = true` while that inner picture is drawn and back to `false` after: its words are picture, not captions.
- **EDGE**, **PINNED**, **LONG**: text partly out of the frame, small text parked in a corner for six seconds in all, one big line held past six seconds.
- **FACE**: text on a face, when the film defines `window.FACES = (t) => [[x, y, w, h], ...]` in canvas pixels.
- **BROKEN**: a value that failed to compute, on screen for any length of time: `NaN`, `undefined`, `Infinity` or `[object Object]` as a word (FAIL; a lone `null` is a WARN). A counter whose start value a timing script had moved to -1.1 showed "NaN" across a whole beat, and nobody saw it until the owner did.
- **OVERLAP**: two different texts printed on top of each other and sitting still for 0.3 s or more (FAIL): a label over a label, a caption over a number. One moving across the other, or a huge word across small text, is a WARN to look at. The same text drawn twice (an outline, a glow, a counter changing its value) and single letters (a rolling digit) are left alone. It does not know about masks, so text hidden under a clip can still be reported; skip it with `--ignore`.

A FAIL is fixed. A WARN is a lead: look, then fix it or say why it stays. On one product ad the first cut had 15 fails, all things a fresh reviewer later named (status chips, tags, a note that flashed for 0.4 s); the delivered cut had 4. It sees only text the page draws itself, not words inside pictures, and it reads size, not contrast, so the 360 px sheet still gets read by eye.

## Plate audit (soft pictures: enlarged or mixed frames)

```bash
node <skill>/scripts/plate-audit.mjs                 # film.html in this folder
node <skill>/scripts/plate-audit.mjs cut.html --step 0.05 --min-area 0.15 --json plates.json
```
Run it next to the text audit, before the reviewer, on any film with photos or footage. It records every `drawImage` the page makes while it draws each sampled frame, keeps the big ones (a picture covering a fifth of the frame or more), and reports:
- **UPSCALE**: a picture drawn bigger than its own pixels: WARN above 1.12x for half a second or more, FAIL at 1.2x or more. A 1080p clip pushed to 1.3x for a "closer shot" was the shot the owner called blurry; the fix was a new clip at its own size, not a sharpening pass.
- **BLEND**: two different frames of one clip laid over each other in the same place, one see-through, for 0.25 s or more: slow motion made by mixing frames, which ghosts faces (WARN). Play the clip at its own speed, end the shot earlier, or hold clean frames.

Frames from one folder (`assets/seq/<clip>/f012.jpg`) or one video file count as one clip. SVG pictures and small pictures (tiles, icons, logos) are left out. A picture drawn onto an off-screen canvas at least half the frame's width is measured against that canvas. It cannot see sharpness inside the source itself (a soft clip at 1.0x passes), so still look at faces at full size next to the raw clip. Set `window.PLATE_AUDIT_SKIP = true` while drawing something that is enlarged on purpose (a deliberately soft background).

## Edge audit (pictures and shapes cut by an edge)

```bash
node <skill>/scripts/edge-audit.mjs                 # film.html in this folder
node <skill>/scripts/edge-audit.mjs cut.html --shots edge-shots --json edge.json
```
Run it next to the text audit. The text audit catches words that leave the frame; this catches the rest: a card, an icon, a photo or a panel cut by the frame's edge or by a window drawn inside it (a player, a phone, a browser), held still for 0.8 s or more (`--min`). It also reads the pixels along the edges of every big picture, so a label or panel inside footage that runs into the picture's edge is caught too. That is what a slow push into a screen recording does to the labels at its sides: on one launch film it found the cut a reviewer had flagged, and more like it. `--shots` saves each frame with the item in red, its window in yellow and the side in magenta. Every line is a WARN: look, then fix it (move it in, zoom less, re-cut the footage with `content-box.py`) or say why it stays. Photos raise some lines that are not mistakes, since a photo's edge is full of picture. Set `window.EDGE_AUDIT_SKIP = true` while drawing texture or a film replayed inside the film. `--self-test` checks the audit itself.

## Export

```bash
node export.mjs 60 out.mp4                         # 1920x1080 by default
W=1080 H=1350 node export.mjs 60 out-4x5.mp4       # other sizes (the page must support them)
SLOW=1.3 node export.mjs 60 out-slow.mp4           # time-stretch the whole film 1.3x (renders t/1.3)
```
Export takes ~2-6 min per 30 s at 60 fps. Run long exports with a generous timeout or in the background.

**Subframe motion blur (`SUB=N`).** Renders N subframes per output frame (t + k/(fps·N)) and averages them in ffmpeg (`tmix=frames=N,select='eq(mod(n\,N)\,N-1)',setpts=N/(fps*TB)`, `-r fps`). It is what makes fast code motion read as filmed instead of stepped.
```bash
SUB=8 node export.mjs 60 master.mp4               # final master only; review exports stay SUB=1
```
- **Use SUB=8** for the final master of kinetic explainer, title sequence, chrome showreel and monochrome launch (and any style with fast camera, whips or type flying in). **SUB=4** is enough when the fast moves are few; below 4 you see separate ghosts on fast moves.
- **Never for stepped art** (pixel art, pencil test, crayon boil, anything animated on 2s or on ticks): the hold is the look, and blur smears it.
- **Cost:** N times the render. At 8 expect about 1-1.5 min of render per second of film at 1080p60; keep it for the master, after the gate is green at SUB=1.
- Proven on a fixture (a dot crossing 440 px in 1 s at 30 fps): frame 15 sharp is a 20 px disc; at SUB=8 it is a 33 px smear with 22 partial-alpha ghost pixels on its row. Blur is trailing (the subframes run forward from t), which is invisible in practice.
- Blur hides a stepped or popping element; it does not fix one. Run the gate's pop check on the SUB=1 export.

## Long films: render in pieces

One browser draws about 4 to 8 frames a second at 1080p, so a 75 s film at 60 fps takes ten minutes or more in one process. Render it in pieces instead:

```bash
bash <skill>/scripts/render-parallel.sh 60 78.6 out/master.mp4          # fps, duration in seconds, output; 3 workers
bash <skill>/scripts/render-parallel.sh 30 78.6 out/draft.mp4 3 12      # review draft: 30 fps, 3 workers, 12 s pieces
```
- Run it from the project folder. It writes the picture only; add the sound with `mux-audio.sh` (or one ffmpeg call).
- **Three workers on a laptop.** Each worker is a whole Chrome. Six at once ran a 16 GB machine out of memory in the middle of a film; three finished without trouble.
- A piece whose browser never starts is started again after 60 s (it happens about once in ten runs with several browsers launching together). A piece that dies part way is reported with the last lines of its log: that is almost always an exception in `renderFrame` at some time inside that piece, so read the error, fix the film, render again.
- **Render a draft at 30 fps for review and the gate, the master at 60 fps once.** Frames are deterministic, so the two match.
- The script checks the frame count of the joined file. A film that is short by a piece's worth of frames means a piece stopped early.

## Gotchas

- Canvas reading local images needs http, not file:// (taint). `serve.mjs` handles it; always go through the scripts.
- An SVG used as an `<img>` (a logo file) only loads if the server sends it as `image/svg+xml`; `serve.mjs` does. If a logo is silently missing from the frames, check the image actually loaded before blaming the draw code.
- A favicon 404 in the console output of `frames.mjs` is harmless.
- Stale headless browsers pile up when renders are interrupted. If the machine feels slow, look for leftover `Google Chrome ... --headless` processes started by earlier runs and close the ones that are yours.
- Google Fonts load fine over the local server; wait for `document.fonts.ready`.
- `SLOW` stretches everything, including music timing: re-time the audio afterwards.
- Keep the one-shot output file untouched (`film-oneshot.html`) before any hand edits, so the "one prompt" claim can point at it.

## Face audit (main character's face stays clear)

Panels, boards, cards, slams, bands and captions must never sit on the main character's face, in any aspect ratio. Zooms, jump-ins and the 9:16 recompose move the face under overlays placed for another framing, so prove it with an audit instead of eyeballing.

1. **Face box per photo.** For each plate the hero appears in, record the face box in plate units, hairline to chin, ear to ear. Draw the boxes over the plates on a grid and check them by eye once.
2. **Track the current plate.** `plate()` stores which plate and transform it just drew (`CUR`).
3. **Register overlays.** Every panel, board, card, slam, band, caption strip and custom block calls `ovr(x, y, w, h, 'what')` with the screen rect it covers. Tracking brackets and thin outlines don't register.
4. **Check per frame.** After the shot draws, intersect the registered rects with the face box mapped through `CUR`, and expose the result as `window.__hits` (labels) and `window.__shot` (shot number).
5. **Run it:**
   ```bash
   node audit-faces.mjs 0        # 16:9, samples every 1/8 s, prints shot · element · time ranges
   node audit-faces.mjs 1        # 9:16
   ```
   Fix every hit (move the element into free space, reframe the photo, or anchor the zoom so the face moves), then re-run until both say "no face overlaps".

## UI on a phone or screen inside a photo

Never eyeball the screen corners. Generate the photo with a plain blank white screen, then:
1. Threshold the bright, unsaturated screen region around a seed point, fill holes, and save it as an alpha mask the size of the plate.
2. Fit a minimum-area rectangle to the mask for the four corners (TL, TR, BR, BL).
3. Draw the UI canvas into that quad with a bilinear-subdivided perspective map (about 10x10 triangle pairs).
4. Clip it with the mask (`destination-in`) so it gets the real rounded corners and notch, and fingers over the screen stay in front.
5. Make the detection frame the bounding box of the screen quad plus the bezel, so it hugs the device.
Keep the UI's own header below the notch area.

## Re-render only what changed (fast iteration)

A heavy photo + HUD film renders at about 3-4 frames/s at 1080p on this Mac (about 9 minutes per 80 s at 24 fps), and two renders in parallel slow each other. After a fix, re-render only the changed shots:
```bash
START=26.5 END=32.5 node export.mjs 24 fix-b.mp4      # renders frames round(START*fps) .. round(END*fps)-1
```
Splice by frame index into the previous master (`trim=start_frame=..:end_frame=..` for the untouched parts, `concat` in order), one re-encode at CRF 14. Make each range cover the whole changed shot plus a few frames either side; frames are deterministic, so the overlap is identical. Then verify alignment: the PSNR of the untouched regions against the old master should be above 40 dB (one app-builder film: 44-57 dB). A one-frame slip drops it far lower.
- To add a held ending, raise `FILM_DURATION` and render only the new tail, then concat.
- **A script that moves part of the film later moves times, never values.** Adding one bar to every `from` and `to` after a point also moved a counter's start and end values (1 became -1.1), and its climb printed "NaN" for a whole beat. Shift only the keys that are times, list every value the script touched, and run the text audit after (its BROKEN rule catches a failed value on screen).
- **Joining without a re-encode (`-c copy`): cut only at a keyframe, and count packets, not seconds.** `-t 17.46 -c copy` on a 60 fps part gave the right NUMBER of frames (1050) and the wrong frames: 0 to 1048 and 1050, with 1049 missing, because the P frame comes before the B frame it is shown after. The joined film then showed one frame of the next shot a frame early. Do this instead: list the kept part's keyframes (`ffprobe -select_streams v:0 -skip_frame nokey -show_entries frame=pts_time`), take the last one at or before the change (frame K), copy exactly K packets (`ffmpeg -i part.mp4 -frames:v K -c copy head.mp4`: everything before a keyframe in file order is frames 0 to K-1), and render from K/fps on. Then prove it: the sorted packet times of `head.mp4` must be 0 to K-1 with none missing, and the joined file must have the full frame count.
- To keep editing while a long render runs, render from a frozen copy: copy the scripts folder and point a copy of film.html at it. The page loads its scripts once, but a copy removes any doubt.

## Frame safety

Reset the canvas at the top of every `renderFrame`: `g.reset()` (or `setTransform(1,0,0,1,0,0)`), `globalAlpha=1`, `globalCompositeOperation='source-over'`, `filter='none'`. Then draw the shot inside `try/finally` with `save/restore`, clamp `t >= 0`, and use a safe modulo for texture indices (`((i % n) + n) % n`). One exception mid-frame otherwise leaks its state into every later frame: the first pilot of an app-builder film rendered grey until this was fixed.

## Geometry from the image, never by eye

Anything that must hug something in a photo gets measured from the photo: tracking boxes on 36 pinned notes came from thresholding plus connected components, phone screens from masks, face boxes from a grid check. Eyeballed corners were the source of both visible compositing bugs on an app-builder film.

## Two slips the checks caught on our launch film (12 Oct 2026)

- **A comment added in the middle of a line switches off the rest of that line.** These pages keep several statements on one line. Patching one statement and appending `// why` to it comments out everything after it on the line; the page still loads and still draws, only wrong (a button with no background drawn at the corner; an end card that stopped moving). The gate caught the second one as "identical frames" plus a pop at the join with older frames. When patching a line, put the comment on its own line above it, and look at a still of every scene the line draws.
- **A check that printed its result and never returned.** On Node 26 a script that ends with `process.exit()` right after heavy number work can deadlock in shutdown (a V8 background thread waits for a garbage collection the exiting main thread will never run). `audio-check.mjs` did it three times in one day and each time a shell pipeline waited on it for hours. It now leaves through the event loop (`process.exitCode` and a short timer). If any script seems stuck after its last line of output, it is this: kill it, the result above it is valid. For unattended chains, give each node step a limit: `perl -e 'alarm 120; exec @ARGV' node <script> ...` (macOS has no `timeout`).
- **A render part that never wrote a frame.** With three parts of an export started at the same second on a busy machine (another session was rendering too, load over 100), one part's Chrome came up with a GPU helper and no page, used no CPU, and its log stayed empty for four minutes while the other two were a third done. Nothing times out on its own. When parts run in parallel, look at every part's log after a minute: an empty log and a `node export.mjs` with under a second of CPU time is this. Kill that node and its Chrome (plain `kill` was ignored; `kill -9`) and start the part again; it then ran normally.
