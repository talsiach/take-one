# Paid services: the person decides, the skill knows how

The skill can make a whole film in code for free. Real-looking pictures, moving shots, a voice and a song come from services the person may have. Two things are always theirs to decide: **which services may be used** and **how much may be spent**. For every "no" there is another way to make the film.

## The one question, at the pitch

Put it in the pitch message, once, in plain words. List only what this film would use:

> To make this the way I pitched it I would use:
> - **Pictures** (Higgsfield, Nano Banana; or Codex on your ChatGPT plan): about N pictures, [free on your unlimited plan / about X credits / from your ChatGPT plan's Codex allowance]
> - **Moving shots** (Seedance or Kling through Higgsfield): N clips, about X credits
> - **Voice** (ElevenLabs): one narration, about X credits
> - **Music** (Suno): one song, [X credits / from your plan]
> Total about X. Which of these are OK to use, and is there a cap?

- The person answers per service. A "no" switches that service off for the whole film; it is not asked again and not switched on later without a new yes.
- A cap is a hard stop. A yes to the plan covers the plan; anything over it is a new question.
- Quote from the real price, read just before asking (a price call, the pricing page, the balance). Never from memory: prices change.
- If a service is not connected, say how it could be (a connector in Claude, their logged-in browser, an API key they set) and offer the other way now. Never ask for a password or a card.

## For every service, the other way

| The film needs | With the service | Without it |
|---|---|---|
| Real-looking pictures | An image model (Nano Banana through Higgsfield, GPT image through Codex on a ChatGPT plan (`toolbox.md`), or any the person has). Method: `real-shots.md`, Pictures | The person's own image tool from prompts you write, and they bring the pictures back. Or change the route: an illustrated look drawn in code, where "every frame is code" is part of the appeal |
| Moving shots | A video model (Seedance, Kling) on the few shots people look at. Method: `real-shots.md`, Moving shots | The pictures move in code (camera, parallax, bursts): honest ceiling about 7 of 10 for a film meant to feel filmed. Or an illustrated film animated fully in code |
| A voice | A speech service (ElevenLabs): cast from two or three samples of the real lines, the person picks by ear. Method: `voice.md` | The person records the lines themselves (often the best choice for a founder). Or no voice: the words carry on screen with music (`words.md`) |
| Music | A song service (Suno): a song whose words are the film's own lines, or an instrumental. Method: `audio.md` | Music composed in code, free, fitted to the film's exact length (`music-engine.md`). Or a track the person owns |
| Sound effects | Rarely needed from a service | Made in code by default, free, placed on exact frames (`scripts/sfx.mjs`) |

Say what each "without" costs the film in one line, so the choice is informed. Do not present the free way as worse when it is the better look for the idea.

## When the service meters downloads apart from making

A music or voice plan can have credits left and no downloads left (seen on a song service: generating was allowed, taking the file out was not until the plan renewed). Read both numbers before generating. With no downloads left there is still a way: generate, tell the person the exact title and length of each take and where it sits in their library, and they download and send the files. Then measure every file they send (`scripts/songmap.py`: tempo, where the groove enters, the quiet parts, the last hit) and choose by fit, because you cannot hear it. Say which one you chose and why.

## How to reach a service

Use the first of these that exists, and say which one you are using:
1. **A connector in the session** (for example a Higgsfield connector with image, video and audio tools). Cleanest: prices and balance can be read before each call.
2. **The person's logged-in browser**, driven by you: their page is theirs. Note what was there before touching it and put it back. Some plans are free only in the web page (an unlimited image plan), so check the switch before every generate.
3. **The person runs it**: you write the exact prompt and settings, they generate and hand back the file. Slowest, always possible.

## The ledger

Keep `spend.md` in the project from the first paid call:

| When | Service | What for | Price read | Balance after |
|---|---|---|---|---|

- One line per paid call, written when the call is made, not at the end.
- After each batch say in one line what was spent and what is left of the cap.
- A call that failed validation is not charged. A call that timed out may have started: read the job history and the balance before sending it again.
- On delivery, give the total with the film. A spend from a free pool is still reported.

## Order of spending

Lock the story and the pictures first. Show the cut with still pictures. Movement, the costly part, comes last and once per shot (`real-shots.md`). Spend where the viewer looks first and longest: the opening, then the product, then faces.
