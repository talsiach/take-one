# The fresh reviewer: the pack and the brief

The reviewer is a new agent that has seen none of the work. It stands in for a stranger who sees the film once, at full speed, on a phone, possibly muted. Its score is the score (SKILL.md step 5). This page is how to hand the film over so the review is worth having.

## Rules

- **A new reviewer every round.** One that saw the last cut is anchored to it.
- **It reads the pack and the film, nothing else.** No conversation, no storyboard, no code, no notes, no earlier score. Say so in the brief, and name the one folder it may open.
- **It cannot hear.** Give it the measurements instead: loudness, where the music is quiet, where it hits hardest, every word with its time.
- **Tell it what is locked.** If the look is the brand's own, or the words are a song's lyrics that cannot change, say so, or it will spend its three problems on things nobody can fix.
- **Three rounds at most.** Still under the bar after three: stop, deliver with the score and the open problems, and let the person decide. Never report a pass that did not happen.
- **Fix what it names before the master.** A fix made after the last review has not been reviewed; say that when you deliver.

## Build the pack

```bash
bash <skill>/scripts/review-pack.sh out/cut.mp4 out/review-pack \
  --beats "0,1.5,4.8,9.6,..."          # one time per story beat (default: 36 evenly spaced)
  --strips "9.2-11.6,66.0-67.2"         # a range across every fast move, hard cut and handoff
  --text "4.8,9.6,14.5,..."             # frames that carry words, for the phone-width sheet
```

Then fill in `WORDS-AND-SOUND.md` in the pack: who the film is for and where it posts, every spoken or sung phrase with its film time, and the sound report (from `audio-check.mjs` and `songmap.py`).

## The brief (give it to a new agent, changing only the bracketed parts)

> You are the reviewer for a short film. You have seen none of the work behind it, and that is the point: you stand in for a stranger who sees it once, at full speed, on a phone, possibly muted. Be honest and specific; a kind score is useless, and so is a harsh one that is not tied to something visible.
>
> Everything you may look at is in one folder: [pack folder]. Start with WORDS-AND-SOUND.md there. Then look at every image: the one-frame-per-second sheets, the beat grids, the full-size frames, every strip, and the phone-width sheet. The film is [cut.mp4]; you may pull a few more frames from it with ffmpeg if you need a closer look. Do not open any other file: you must judge only what a viewer sees.
>
> [What is locked: the brand's look, words that cannot change, the chosen route (for example: drawn fully in code, so people are small stylized figures).]
>
> [For a launch or product film, add: Hold the part that explains the product to what a paid agency would ship. Say whether it shows the real thing (the product's own screen, footage or output) or an invented picture of it, and whether any layout comes back more than twice in a row. If one frame is repeated for every item of a list, that is a problem to name, however polished it looks.]
>
> Report, in this order, in under 450 words:
> 1. The film retold in one sentence, as a viewer would tell a friend. If you could not follow something, say what.
> 2. Scores 1 to 10, one line of reason each: hook (first 2 s), readability at 360 px, motion quality (from the strips), variety (something new every 2 to 4 s), composition (one focal point, clean space for type, nothing cut by an edge, no type on other content), data accuracy, sound sync (from the times given), and overall against what real brands ship.
> 3. The three worst problems, each with a timestamp and what exactly is wrong.
> 4. Anything that looks off, cheap or wrong at full size (hands, people, type, edges).
> 5. Verdict: PASS if every axis is 8 or more, otherwise RETURN.
>
> [For a film over 60 s, add: 6. A ten-second map: one score per 10 s block for "does the picture carry the film here", with the weakest blocks named. It finds the slow stretches that a single score hides.]

## When the owner's taste and the reviewer disagree

Both are in the room for a reason: the taste knows the owner, the reviewer stands in for a stranger. On a film made this way the two agreed on every large problem (weak drawing in the first frame, the loudest moment landing on an empty picture, people who read as icons). They split twice, both times on words: the taste asked for key words only and for a phrase to be said once; the stranger then could not follow the film muted, and called unlabelled cards "empty boxes". When they split on whether a viewer can follow, the stranger wins, because that is the one thing the owner cannot judge from inside.

On a three-minute song clip the fresh reviewer scored every cut 0.5 to 1.5 points above the owner, and stopped moving at about 7.5. The owner's own notes, pinned on frames, moved the score more than another review round did. When the score stalls, show the person; do not run a fourth reviewer.
