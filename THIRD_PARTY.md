# Third-party code and credits

What this skill adapts from other people's open work, and what it needs at render time. Licence texts for adapted code are in `LICENSES/`.

The files adapted from anidoodle stay under the Apache License 2.0. Everything else here, including the gallery preview images and the music pieces, is under the MIT licence in `LICENSE`, except the Take One name and logo (see the README).

## Code adapted into this repo

| What | Files here | Upstream | Licence |
|---|---|---|---|
| anidoodle (Alex Greenshpun): code music engine, sound-effect kit, render gate, audio meter, style analyzer, the adapt-a-style method, the ink-wash brush and seal | `scripts/music/*.mjs` and the kit set-up of the pieces in `scripts/music/pieces/`, `scripts/music.mjs`, `scripts/sfx.mjs`, `scripts/gate.mjs`, `scripts/audio-check.mjs`, `scripts/analyze-style.mjs`, `references/music-engine.md`, `references/adapt-a-style.md`, parts of `references/styles/ink-wash.md` and `assets/previews-src/ink/boat.html` (adapted) | github.com/alexgreensh/anidoodle | Apache-2.0: `LICENSES/anidoodle-LICENSE-Apache-2.0.txt`, `LICENSES/anidoodle-NOTICE.txt` |
| Claude Animation Base guide (John Heibel): the "model the viewer" timing rules | `references/timing.md` (prose adapted, credited in its first line) | github.com/JohnHeibel/ClaudeAnimationBase | MIT: `LICENSES/ClaudeAnimationBase-LICENSE-MIT.txt` |

## Ideas credited, no code copied

| What | Where | Upstream | Licence |
|---|---|---|---|
| Closed-form springs, launch-video motion moves, the axes of the review score and the subframe motion-blur filter (Raphael Aubry) | `scripts/springs.js` (own implementation), `references/motion-kit.md`, `references/timing.md`, the rubric in `SKILL.md` and `references/quality-checklist.md`, one filter line in `scripts/export.mjs` | github.com/howseen-ai/claude-motion-design | MIT |
| Character life: blinks placed on head turns with their timings, pose chains that never stop dead, follow-through as a delayed copy of the parent (rossark0) | `references/character-life.md`, `scripts/life.js` (own implementation) | github.com/rossark0/rossark-motion-skill | MIT |
| Asking of every shot whether it is a page or a picture, and measuring a film's text with a script (Tejas Makwana) | `references/page-or-picture.md`, `scripts/text-audit.mjs` (own script; its corner test uses the same thresholds) | github.com/Tejashmakwana/motionmaxxing | Apache-2.0 |
| Banning the default look by name, a number in place of every adjective, and the easing, spring and stagger numbers (Florence, "Opus 5.5 Motion Lab") | `references/directed-look.md`, sections 1 and 3 (own words) | x.com/flxrnc/status/2105311836190978392 | A published guide; ideas only, none of its text or prompts |

## Needed at render time (not shipped here)

- Node 18 or later and `playwright-core` (Apache-2.0), installed per project by `scripts/new-canvas-project.sh`. It drives the Google Chrome already on the machine; no browser is downloaded.
- `ffmpeg` and `ffprobe` on the PATH.
- The watercolor style builds on Claude Animation Base (MIT), cloned into the film's own folder at a fixed commit (`references/styles/watercolor.md`). The 3D styles load three.js (MIT) from a public CDN or install it in the film's own folder, and films load their typefaces from Google Fonts.
- Optional, only when a film needs them: whisper.cpp and demucs (word times and vocal stems for a song), Python 3 with numpy and scipy (`scripts/songmap.py`), and any paid image, video, voice or music service the person chooses. The skill never spends on one without a yes to the price.

## Fonts

No font files ship in this repo. Films load the fonts their brand or style calls for; keep each font's licence with the project that uses it.

## Work we studied

Films and posts that taught something are credited, with links to their makers, in `examples/INDEX.md`. Nothing of theirs is copied here: no frames, no prompts, no code.
