// Nightshade — Silent Infiltration: shared tuning constants.
//
// A top-down stealth game. The player slips through guarded halls, steals
// artifacts and reaches the exit unseen. All numbers below are the game's
// own balance; nothing here is copied from another game.

export const TILE = 32;
export const COLS = 30;
export const ROWS = 18;
export const VIEW_W = COLS * TILE; // 960
export const VIEW_H = ROWS * TILE; // 576

export const PLAYER_R = 11;
export const WALK_SPEED = 150; // px per second
export const SNEAK_SPEED = 78; // Shift: slow, quiet, hard to spot
export const RUN_SPEED = 218; // X: fast, loud, easy to spot
export const GUARD_SPEED = 62;
export const CHASE_SPEED = 178;
export const GUARD_PAUSE = 1.4; // seconds a guard waits at a waypoint

export const FOV = (72 * Math.PI) / 180; // guard vision cone
export const VIEW_RANGE = 205;
export const CAM_RANGE = 235;
export const CAM_FOV = (64 * Math.PI) / 180;

export const SUSPICION_MAX = 100;
export const SUSPICION_RATE = 58; // per second, point-blank, lit, walking
export const CAM_SUSPICION_RATE = 85; // cameras spot faster
export const SUSPICION_DECAY = 26; // per second while unseen
export const ALARM_HOLD = 3.5; // seconds with no sight before the alarm cools
export const NOISE_RADIUS = 135; // how far running footsteps carry
export const NOISE_SUSPICION = 30; // suspicion a heard footstep adds
export const SHADOW_FACTOR = 0.45; // detection is slower in dark floor
export const SNEAK_FACTOR = 0.5;
export const RUN_FACTOR = 1.8;
export const CATCH_DIST = 24; // a guard this close catches the player
export const PICKUP_DIST = 32;
export const EXIT_R = 26;

export const ARTIFACT_SCORE = 500;
export const GHOST_BONUS = 1000; // finish a level without ever raising an alarm
export const TIME_BONUS_RATE = 15; // points per second under par
