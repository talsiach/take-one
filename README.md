<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo/take-one-logo.svg">
    <img src="assets/logo/take-one-logo-on-light.svg" alt="Take One" height="72">
  </picture>
</p>

<h3 align="center">A whole creative studio in one skill</h3>

<p align="center">Type one line in Claude Code. Get a finished short film.</p>

https://github.com/user-attachments/assets/f2e005dc-b6b0-4023-b3d7-9bd958643022

<p align="center"><sub>Take One made this film, and the headphone ad inside it. The brand is made up. Sound on.</sub></p>

<!-- The film above is a file uploaded through github.com. To change it, upload the new file the same way and replace the link. -->

## Install (once)

The easy way: paste this into Claude Code and it does the rest.

```
Install the Take One skill: clone https://github.com/talsiach/take-one into ~/.claude/skills/take-one, then run bash ~/.claude/skills/take-one/scripts/doctor.sh and tell me what is missing.
```

Or do it yourself in a terminal:

```bash
npx skills add talsiach/take-one -g -a claude-code
bash ~/.claude/skills/take-one/scripts/doctor.sh
```

The second line checks your machine and says what is missing and what each piece is for. After that, Claude Code knows the skill in every session. A plain `git clone https://github.com/talsiach/take-one ~/.claude/skills/take-one` works too.

You need Claude Code, Node 18 or later, Google Chrome and ffmpeg. So far it has been run on macOS only.

## How to work with it

### 1. Say what you want

In Claude Code (a new session, if one was open while you installed):

```
/take-one a 30 second launch video for <your product>
```

One line is enough. You can also ask in plain words ("make me a launch video for my app") and Claude picks the skill up by itself. The name with the slash is the sure way.

It helps to add, in the same message:

- **The site** of the product or brand. It reads the look and the real lines from there.
- **A reference**, if you have a style or a direction in mind: a video file, a picture, or a link to something you love. It studies the reference first and builds to that.
- **What you already have**: a logo, screenshots, photos, a song.
- **Where it will be posted** (X, LinkedIn, Instagram). That sets the length and the shape.

### 2. Choose how to work

It answers with what it understood, the rough size of the job, and one question: run through to a finished first take, or work in stages with you.

- **Run.** It goes all the way to a finished, reviewed film. It stops only for the pitch, for a cost you have not approved, and for a login only you can do.
- **In stages.** It stops and shows you the idea and the storyboard, the look on a few real frames, the first full cut and the final.

For a first try, pick something real and small and let it run.

### 3. Say yes to the pitch

Before it builds anything you get one message: the idea in a sentence, the storyboard with times, and the ways to make the film, best first, each with its price.

- **Code only.** Every frame is drawn in code. Free.
- **Code with real-looking pictures** from an image model.
- **Code with pictures and moving shots** from a video model, for the few moments that need them.

It asks once which paid services are fine with you and whether you have a cap. Nothing paid is needed: with no budget it makes the best film the free way allows, and says what the paid way would have added.

The look comes from your project, not from a menu. For a product or a brand it builds the film from the brand's own type, colours, pictures and lines. For an app or a site it can use the real product: you log in, it works the product in Chrome and captures it. For a song or a story it offers two or three illustrated looks that fit, or learns a new one from your reference.

### 4. Watch it come together

While it works, each job posts one line when it finishes, so you can step in.

| | Job | What it does |
|---|---|---|
| 1 | Strategist | studies your brand |
| 2 | Creative director | finds the idea |
| 3 | Writer | shapes the story |
| 4 | Voice director | casts the voice |
| 5 | Art director | picks the look |
| 6 | Storyboard artist | draws every shot |
| 7 | Cinematographer | shoots every frame |
| 8 | Composer | writes the music |
| 9 | Sound designer | adds every sound |
| 10 | Editor | cuts it to the beat |
| 11 | Reviewer | scores the cut, and sends it back when it is not good enough |
| 12 | Social copywriter | writes the posts |

They are jobs, not twelve agents: one session does most of them, and long films split the build. The reviewer is always fresh eyes: it never saw the work, it scores the finished cut, and under the bar the film goes back, three rounds at most.

### 5. Get the film

- A finished MP4 at 1080p and 60 frames a second, with sound, on your Desktop or in Downloads.
- The posts that go out with it, for X and LinkedIn.
- The reviewer's score and the open problems. It does not report a pass that did not happen.

### 6. Give notes, get the next take

Type your notes in the chat, or open the review room it gives you (a page on your own computer), click on a frame and leave the note there. Each round of notes becomes the next take.

If you keep your own taste in a file (a `TASTE.md`, a voice guide, an agent that answers as you), point to it. The skill brings it into the room before the pitch, at the words and at the review.

## What it costs

- **Your Claude usage.** A 30 second film built in one session is roughly 0.4 to 0.7 million tokens and one to two hours. Longer films cost more; splitting the build across agents is faster and costs several times more. These are estimates; it tells you the size before it starts.
- **Credits, only if you say yes.** The code-only way is free. Pictures and moving shots (it knows Higgsfield, with Nano Banana, Seedance and Kling), a voice (ElevenLabs) and music (Suno) are used through accounts you already have. It reads the real price first and asks. None of them is required.

## What to expect

Proven on real films: the one-line start, the brand study from a live site, the pitch, the code build, real-looking pictures from an image model, a recorded voice, a song-service track fitted by measurement, code-made sound effects, the quality gate, the fresh-reviewer loop and delivery. Proven on one film, through many rounds: notes pinned in the review room becoming the next take. Proven on a few films only: moving shots from a video model. Done once, and scored 7 out of 10 by its own reviewers: a vertical version. Not tried yet: a computer that is not a Mac.

Without moving shots, a film built on pictures of people tops out at about 7 out of 10 with its own reviewers. They say so, and the skill reports that score as it is.

The film at the top took many takes and its owner's notes. The people and the moving shots in the ad came from paid picture and video services, the voice from a voice service and the music from a song service. One line on the free way gives you a finished film too, drawn in code. It will not have filmed-looking people like that ad.

It is slow, and it is strongest for product and brand films.

## Safe to run

- Everything is made on your own machine. No tracking and no analytics. It goes online only to read the sites you point it at, to load fonts, and to use a paid service you said yes to.
- It asks before anything that costs money or credits, with the real price. Your answer at the pitch covers what you agreed to; anything beyond it is asked again.
- Its local pages (the one that draws the frames and the review room) answer your computer only, not the network.
- It never asks for a password or a card.

## Inside the repo

`SKILL.md` is the entry point. `references/` holds the craft (timing, words, sound, brand, the checks before the first cut, the reviewer's brief, the illustrated looks). `scripts/` holds the tools (machine check, frames, export, quality gate, text audit, picture audit, sound check, review room).

## Credits

Code and ideas adapted from open work are listed in `THIRD_PARTY.md`, with their licences in `LICENSES/`. Films and posts that taught the skill something are credited, with links to their makers, in `examples/INDEX.md`. Nothing of theirs is copied here.

## Licence

MIT. See `LICENSE`. The few files adapted from anidoodle stay under the Apache License 2.0; they are listed in `THIRD_PARTY.md`.

The Take One name and logo are not part of that licence. Use the skill freely, and build on it. Please do not ship a changed copy under the same name or logo.
