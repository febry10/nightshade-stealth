// Nightshade — Silent Infiltration: hand-in program for the make.fun
// "Make the best stealth game" bounty (best-stealth-game-20261121-1759).
//
// The game itself is the static site in game/: an original top-down stealth
// game (three missions, patrolling guards with vision cones, shadow zones,
// cameras, synthesized WebAudio) that a desktop browser plays fully offline.
// This program's whole job is to deliver it: copy game/ and screenshots/
// into the output directory and write dossier.json there with the vendored
// make.fun library, so the scorer reads exactly the bytes this program
// produced. It exits when it is done; it never starts a server.
//
// Run it the way the grader does (Node 22, no dependencies):
//   node main.ts                          -> writes to /output
//   MAKEFUN_OUTPUT_DIR=out node main.ts   -> writes to ./out instead

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The game is useless without its page, so fail loudly rather than hand in
// a hollow entry if the tree is not what this program expects.
for (const needed of ['game/index.html', 'screenshots']) {
  if (!existsSync(join(repoDir, needed))) {
    throw new Error(`nightshade: missing ${needed} beside main.ts — nothing to hand in`);
  }
}

mkdirSync(outDir, { recursive: true });
cpSync(join(repoDir, 'game'), join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoDir, 'screenshots'))) {
  cpSync(join(repoDir, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// The caps below are the bounty's own gate values: the dossier builder only
// lets text_max_bytes shape its output, but passing the rest makes this
// program refuse anything the scorer would refuse — too many or too-large
// screenshots, an over-stuffed game/ tree, an over-long path.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);

// A one-line receipt for whoever ran this (grader logs, curious players):
// what was handed in and how big it is, counted from the output tree itself.
function weigh(dir: string): { files: number; bytes: number } {
  let files = 0;
  let bytes = 0;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      const sub = weigh(p);
      files += sub.files;
      bytes += sub.bytes;
    } else {
      files += 1;
      bytes += st.size;
    }
  }
  return { files, bytes };
}

const game = weigh(join(outDir, 'game'));
const shots = weigh(join(outDir, 'screenshots'));
console.log(
  `nightshade: handed in game/ (${game.files} files, ${game.bytes} bytes) and ` +
    `screenshots/ (${shots.files} files, ${shots.bytes} bytes) + dossier.json`,
);
