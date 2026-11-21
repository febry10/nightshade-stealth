# Nightshade — Silent Infiltration

[![make.fun](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/febry10/nightshade-stealth/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/febry10/nightshade-stealth/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)

A top-down 2D stealth game that runs entirely in the browser — no libraries,
no network requests, no build step. You are the thief they will never see.

## The game

Three missions, one quiet night:

1. **The Gallery** — a museum after closing. Steal the Moon Pearl and the Sun Opal past three patrolling guards.
2. **The Manor** — three treasures behind locked doors, four guards and a turning security camera.
3. **The Vault** — the Nightshade Diamond itself, behind five guards and two cameras.

Guards walk waypoint patrols and watch a vision cone. Step into the light and
their suspicion meter fills — faster up close, faster still if you run. Fill it
and the alarm sounds: the guard chases, and being touched means capture. Break
line of sight, hide in the dark floor, and the alarm cools. Running is fast but
loud: guards hear footsteps and come to look. Steal every artifact, then reach
the glowing exit. Finish a level without ever raising an alarm for the ghost
bonus.

## How to play

| Key | Action |
| --- | --- |
| WASD / Arrows | Move |
| Shift | Sneak — slow, quiet, hard to spot |
| X | Run — fast, loud, easy to spot |
| E / Space | Take an artifact |
| P / Esc | Pause |
| R | Restart level |
| M | Mute |

The HUD shows the mission, artifacts stolen, the detection meter (green =
unseen, amber = spotted, red = alarm), the timer and the score. The player is
the purple hooded figure; guards are maroon, cameras sweep yellow cones.

## Sound

All sound is synthesized live with WebAudio — footsteps, the alarm sting, the
pickup chime, a low ambient drone and the win/lose stingers. No audio files.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Hand the entry in (the way the grader does):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Screenshots in `screenshots/` are real renders of the game's own code, posed
with `?shot=cover|patrol|alarm|escape&seed=1` (see `shots.json`).

## Files

- `game/index.html` — the page, HUD and menu screens
- `game/src/config.js` — tuning constants
- `game/src/levels.js` — the three mission maps and their parser
- `game/src/audio.js` — synthesized WebAudio sounds
- `game/src/input.js` — keyboard input
- `game/src/guards.js` — guard patrols, vision cones, suspicion, cameras
- `game/src/player.js` — movement, sneaking, running, noise
- `game/src/render.js` — canvas drawing, cones and lighting
- `game/src/shots.js` — deterministic screenshot poses
- `game/src/main.js` — game loop, states, scoring
- `main.ts` — the hand-in program (copies `game/` + `screenshots/`, writes `dossier.json`)
- `serve.ts` — a tiny static server for local play

---

Built for the make.fun bounty "Make the best stealth game".
Play more: https://make.fun/r/xttqesbf
