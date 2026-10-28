# Use case: your song → a music video

The user brings a song (often a Suno track) and wants a clip "with lyrics and everything". This is the flow that worked on a family song.

1. **Get the song and the real lyrics** (ask the user to paste them; Suno shows them). Note structure tags ([Verse], [Chorus], [Bridge]).
2. **Map the song** (see audio.md): isolate vocals with demucs, word timestamps with whisper, onsets from the vocal stem, tempo from autocorrelation. Re-transcribe any section whisper garbles from the vocal stem alone. Produce a section map: start/end of every section and line.
3. **Style menu:** 3D teaching song (if the song explains something), watercolor character (story, people), kinetic lyric (words are the visuals), painterly glow (emotional, symbolic), cinematic short (story, stylized 3D), broadcast titles (anthem energy). Pitch the route as in SKILL.md step 3: for an illustrated clip code only is usually the best look, so say why when you pitch it, and say what pictures or moving shots would add.
4. **Concept for the whole song:** one arc across the sections (e.g. a day from dawn to stars; the bridge as the emotional turn; the ending rhymes with the opening). Choruses return to the same place/motif, escalating each time.
5. **Storyboard by section**, one row per section with what happens on screen and which words trigger actions. Approve with the user. For a full song, offer a 30 s test of the opening first.
6. **Build in chapters:** one chapter per section group, parallel animators, shared characters/palette/guide, shared files read-only. Every action word's timestamp goes in the brief.
7. **Lyrics on screen:** decide with the user: soft karaoke subtitles, painted words in the scene, or none. Hebrew and other RTL languages need `direction = 'rtl'` and a font that supports them.
8. **Render with the song** at 1080p; for a 3-4 minute song expect ~30-60 min of rendering on a GPU.
9. **Deliver** plus a 15-30 s cut of the best section (the chorus) for social.

## The studio process for long films (trust the process)

The user should be able to approve a concept and trust the result without checking every step. That trust comes from quality gates, not from luck:

1. **Director agent** (one): owns the plan. Produces (a) an exact song map at word level from the vocal stem, (b) a full shot-by-shot storyboard per chapter with each chapter's first/last frame defined so neighbours match, motifs with setup and payoff, and the escalation plan for returning choruses, (c) a chapter guide for animators (file ownership, shared read-only files, transitions, subtitles, render/review commands, quality bar), and (d) the chapter architecture in code with stubs, verifying the approved test section still renders identically.
2. **Critic agent** (independent, different from the director): reviews the storyboard against timing.md and quality-checklist.md before any animation: dead shots, two reads at once, choruses that don't escalate, weak bridge, missing payoffs, unreadable moments, handoff mismatches. The director (or you) revises. Fixing a storyboard costs minutes; fixing a rendered chapter costs an hour.
3. **Animator agents** (one per chapter, in parallel): build only their chapter file, follow the guide, review their own contact sheets and strips at every action word.
4. **Integrator** (one, last): renders the whole film, checks every chapter boundary frame by frame, fixes seams, renders with the song, and writes the delivery notes.

Use the approved short test (e.g. the first 30 s) as the style bible every agent looks at first.

## Hooks as slams, verses as karaoke (app-builder music video lesson)

- Sung hook lines ("Someone should", "I will", "I built it") slam in big, each word on its sung syllable. Verse lines run as a karaoke strip with the current word in the accent color. Never both for the same line.
- Lines already shown another way (a flap board spelling "23 BOOKING REQUESTS", chat bubbles arriving on a phone) skip the karaoke strip.
- A story clock that runs through the whole song (00 booked → 01 → 08 of 08) gives a 1-2 minute clip a spine, like the reference's countdown.

## Storytelling with the lyrics (make the clip enhance the song)

1. Every line gets an image that carries its meaning at the moment it's sung; the action lands on the line's key word. Write the key word of each line in the storyboard.
2. Repeated choruses are progress markers: the same words over images that show growth (first a hope, then an attempt, finally true). Design a recurring shot or gesture per chorus line that evolves.
3. Verses intimate (close, still, the inner voice); choruses open up (wider, movement, light); the bridge strips everything down.
4. Counterpoint beats literal sometimes: brave words over the small, shaky real step is more moving than a triumphant image.
5. Visual rhymes and payoffs: first frame ↔ last frame; a small motif (a line of light, a closed window, a creature's size) that grows or turns across the song.
6. Quiet, specific, true human details over spectacle (a hand hesitating on a latch; boxes unpacked little by little as a hidden progress bar).
7. Cut and move on the music: cuts on bars, emotional turns on lyric turns, holds when the voice holds. The story reads muted and lands harder with sound.

## Model-footage music video at scale (a public production record, Sep 2026)

One creator released the full production record of a model-footage music video (5:06, 141 shots, 19 h, ~50 director messages). The methods that transfer:

1. **Character identity lives in prompt text, not reference images.** Write the lead as a canon (exact hair, one accent detail, each wardrobe item) and paste it into EVERY image prompt, plus an explicit ethnicity/appearance descriptor (without it the model drifts the face shot to shot). Face-sheet image references over-condition (a close-up-sized head on a distant figure); identity edit passes drift the look. Batch 1 is a **casting call**: 2-3 directions, each as a turnaround + one scene shot + a face sheet; pick the silhouette that reads at thumbnail size.
2. **One family of style words ends every image prompt:** a palette+light line (with hex), the grain, the finish, and always "no text, no letters, no logos". Plus a declared empty area for type ("the top half empty night sky"). That family is what keeps 100+ plates in one world.
3. **Keep generation inputs in color; apply the look in post.** Monochrome plates fed to a video model come back grey and the grade can't recover the "image-model magic". Their fix was exemplar-based recolor using each shot's own source image; ours is simpler: never send a graded/desaturated frame as a generation input.
4. **Storyboard schema:** every shot carries its lyric, a **type mode** (subtitle / coverline / masthead / strobe), its plate prompt, its camera, and clip-or-2.5D. Boards compete: independent director agents board the song from different angles (fashion, meme density, narrative), judges score, a head director merges. Per chapter in the build: an animator writes, an **art-director agent reviews rendered frames** (not code), the animator fixes.
5. **No two clips start from the same frame.** Continue from the previous clip's last frame or pick another start; two clips from one frame is jarring.
6. **Sync most lips, not all** (the Grimes rule). A music video has inserts and cutaways; only the shots that present as singing need sync.
7. **Suno craft:** deadpan spoken verses carry dense references without stretching over melody; the sung euphoric chorus carries the emotional turn; spell out acronyms in the lyrics field (A G I) so Suno pronounces them; use the exclude-styles field.
8. **Director economics:** the director spends ~50 short messages, all taste calls at checkpoints, with a standing rule "wait 5 minutes after sending; silence = approval". Their closing move was ours too: "log all our learnings so future videos are rapid" — the skill IS the product of the work.

The Seedance lip-sync mechanics (audio conditioning, drift detection, cut-and-continue) are in toolbox.md.

## Running the parallel build (lessons from a Hebrew comedy clip, Sep 2026)

A 98 s Hebrew comedy clip, 8 chapters, built by 10 agents in one afternoon. What made the fan-out work, and what broke:

1. **One owner per film.** Before building, check whether another session is already directing the same project (search `~/.claude/projects/*/*.jsonl` for the project's guide file name). Two sessions writing the same `cast.js` overwrite each other. Pick one and tell the user to keep the other closed.
2. **Rig owner in parallel with the style-bible chapter.** Freeze the new rig option names in both briefs up front (`accessory:'shades'`, `lasers:0..1`, `beard:0..1`...) so the chapter animator codes against them before they exist (unknown options are ignored). The rig owner may only ADD options and must prove the approved cast renders pixel-identical with defaults.
3. **Pre-register every chapter's `<script>` tag before the fan-out.** Parallel agents editing the shared `studio.html` race. After registration, agents own only their `chN_*.js`.
4. **Shared render rules:** each agent renders its chapter with `--clip --range` to its own `out/chN.mp4`, never `--frames` (the frames folder is shared), check images under `out/check/chN_*`, and it keeps review renders small because 7 agents share the CPU.
5. **An as-built notes file** (`BUILD_NOTES.md`): the rig, set and prop APIs as actually delivered (not as planned), plus every direction the user gives mid-build. Users send fast fragments while agents work ("graphs up down", "nasdaq", "btc", "etc."); append them to the notes right away instead of asking, and every agent reads the file first.
6. **Say "if your file already exists, continue from it" in chapter briefs.** An interrupted workflow restarts unfinished agents from zero; without that line they may rebuild from scratch.
7. **HUD overlays go in screen space.** A ticker tape drawn inside the camera transform got cropped when the shot zoomed. Draw tapes, tickers and captions after `camEnd()`.
8. **Give the user an ETA for the final render.** p5.brush at 1080p24 ran at about 1.5 s per frame with 11 workers on a 12-core Mac, so a 98 s film took about an hour. Also export a share copy (`-crf 24`, about 90 MB instead of 250 MB) for WhatsApp, alongside the full-quality file and the chorus cut.

Adjusting the user's own character: when they ask to look "a bit younger, a bit slimmer", change the rig parameters (build, jaw, hair and beard colour, drop the tired-eye lines), show a before/after strip, and keep a backup of the old file. It's their face, so flattering is fine, but it must still read as them.

## A three-minute story clip (lessons from a narrative song, Oct 2026)

A 3-minute clip about two friends that politics split, built in code from real photos and real phone screens, ten rounds, finished at about 8 of 10 by its owner. What moved it and what held it back:

1. **The medium decides more than the polish.** The two biggest jumps came from switching illustrated pages to real photos and real phone screens, then a social feed to the group chat everyone has. Review rounds after that moved the score a few tenths each. When a story is about feeling, test the real-looking route early.
2. **One picture, one beat.** Write a registry: every picture against the line it serves, each used once. A chorus that comes back gets new story (new places, new people, new moments), not the same pictures again; one round of reused chorus pictures cost most of a point. `plate-audit.mjs` warns on a picture back in three places (REPEAT) and on one held 8 s or more (HOLD).
3. **The pictures carry the song for its whole length.** Ask the reviewer for a ten-second map (reviewer-brief.md) and rebuild the weakest blocks first.
4. **Spend the strongest picture at its place.** The childhood photo belonged after the second verse; shown in the first chorus it emptied the later payoff.
5. **Words when sung, the picture leads.** Each sung word appears exactly on its time from the song map, as a small caption under the picture. A big lyric band competes with the picture; big type is for the hook only.
6. **Give reading time.** Phone screens and chats were the story and kept flashing by; see before-the-first-cut.md, section 5.
7. **Real objects from real photos, the same people throughout.** See before-the-first-cut.md, section 9.
8. **Plan the vertical cut from day one.** A 60 s 9:16 short was recomposed at the end from the wide film (crops per shot, two people as a top and bottom split); framing for both from the start is cheaper.
9. **Two heavy agents at a time.** Five chapter agents in parallel finished the week's usage overnight. Build chapters two at a time, or give the small fixes to a lighter model.
