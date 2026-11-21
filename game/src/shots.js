// Nightshade — Silent Infiltration: deterministic screenshot poses.
//
// Opening the game with ?shot=<name>&seed=1 poses one frozen frame of the
// game: the guards and the player are placed at fixed tiles, the state is
// set, and time does not advance, so the same URL always renders the same
// picture. The four shots are: cover, patrol, alarm, escape.

import { TILE } from './config.js';

function at(col, row) {
  return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 };
}

function placeGuard(guard, col, row, angle, state, suspicion) {
  const p = at(col, row);
  guard.x = p.x;
  guard.y = p.y;
  guard.angle = angle;
  guard.state = state;
  guard.suspicion = suspicion;
  guard.pause = 99;
  if (state === 'chase') guard.alarmed = true;
}

/**
 * Poses `game` for a screenshot and freezes it (no updates, just renders).
 * Returns true when the shot name is known.
 */
export function applyShot(game, name) {
  if (name === 'cover') {
    game.startLevel(0, { silent: true });
    const p = at(6, 10);
    game.player.x = p.x;
    game.player.y = p.y;
    game.player.mode = 'sneak';
    game.player.facing = Math.PI / 2;
    placeGuard(game.guards[0], 9, 5, Math.PI / 2, 'patrol', 0);
    placeGuard(game.guards[1], 20, 9, -Math.PI / 2, 'patrol', 0);
    placeGuard(game.guards[2], 24, 15, Math.PI, 'patrol', 0);
    game.state = 'playing';
  } else if (name === 'patrol') {
    game.startLevel(0, { silent: true });
    const p = at(5, 8);
    game.player.x = p.x;
    game.player.y = p.y;
    game.player.mode = 'sneak';
    game.player.facing = 0;
    placeGuard(game.guards[0], 7, 5, 0, 'patrol', 0);
    placeGuard(game.guards[1], 20, 7, Math.PI / 2, 'patrol', 0);
    placeGuard(game.guards[2], 20, 15, Math.PI, 'patrol', 0);
    game.state = 'playing';
  } else if (name === 'alarm') {
    game.startLevel(1, { silent: true });
    const p = at(14, 7);
    game.player.x = p.x;
    game.player.y = p.y;
    game.player.mode = 'run';
    game.player.facing = Math.PI;
    placeGuard(game.guards[0], 10, 6, 0, 'chase', 100);
    placeGuard(game.guards[1], 18, 6, Math.PI, 'chase', 100);
    placeGuard(game.guards[2], 24, 4, Math.PI / 2, 'patrol', 55);
    placeGuard(game.guards[3], 2, 12, 0, 'patrol', 0);
    game.state = 'playing';
  } else if (name === 'escape') {
    game.startLevel(2, { silent: true });
    // Every artifact is already in the pouch; the exit glows and the thief
    // is one step from vanishing with the Nightshade Diamond.
    for (const a of game.artifacts) a.taken = true;
    const p = at(24, 16);
    game.player.x = p.x;
    game.player.y = p.y;
    game.player.mode = 'walk';
    game.player.facing = 0;
    placeGuard(game.guards[0], 6, 5, 0, 'patrol', 0);
    placeGuard(game.guards[1], 18, 5, Math.PI, 'patrol', 30);
    placeGuard(game.guards[2], 26, 8, -Math.PI / 2, 'patrol', 0);
    placeGuard(game.guards[3], 6, 12, 0, 'patrol', 0);
    placeGuard(game.guards[4], 18, 12, Math.PI / 2, 'patrol', 0);
    game.state = 'playing';
  } else {
    return false;
  }
  game.frozen = true;
  game.state = 'playing';
  game.hideScreens();
  game.updateHud();
  return true;
}

export const SHOT_NAMES = ['cover', 'patrol', 'alarm', 'escape'];
