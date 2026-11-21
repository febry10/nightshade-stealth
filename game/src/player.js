// Nightshade — Silent Infiltration: the player.
//
// The thief moves with WASD or the arrow keys: Shift to sneak (slow, quiet,
// hard to spot), X to run (fast, loud, easy to spot). Movement is resolved
// axis by axis against the solid rectangles, so the player slides along
// walls instead of sticking to them. Running leaves noise that guards hear.

import { PLAYER_R, RUN_SPEED, SNEAK_SPEED, TILE, WALK_SPEED } from './config.js';

function circleHitsRect(cx, cy, r, rect) {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.r = PLAYER_R;
    this.mode = 'walk'; // walk | sneak | run
    this.moving = false;
    this.facing = -Math.PI / 2;
    this.stepTimer = 0;
    this.noisePulse = 0; // seconds left of the visible noise ring
    this.noiseX = x;
    this.noiseY = y;
  }

  update(dt, input, solids, onNoise) {
    const v = input.moveVector();
    this.moving = v.x !== 0 || v.y !== 0;
    this.mode = input.sneak ? 'sneak' : input.run ? 'run' : 'walk';
    const speed = this.mode === 'sneak' ? SNEAK_SPEED : this.mode === 'run' ? RUN_SPEED : WALK_SPEED;
    if (this.moving) {
      this.facing = Math.atan2(v.y, v.x);
      const dx = v.x * speed * dt;
      const dy = v.y * speed * dt;
      // Move one axis at a time so a blocked axis does not stop the other.
      if (!solids.some((r) => circleHitsRect(this.x + dx, this.y, this.r, r))) this.x += dx;
      if (!solids.some((r) => circleHitsRect(this.x, this.y + dy, this.r, r))) this.y += dy;
      // Keep the thief inside the floor (the outer wall is solid, but the
      // clamp also guards against a bad level).
      this.x = Math.max(TILE + this.r, Math.min(TILE * 29 - this.r, this.x));
      this.y = Math.max(TILE + this.r, Math.min(TILE * 17 - this.r, this.y));
      this.stepTimer -= dt;
      const interval = this.mode === 'run' ? 0.26 : this.mode === 'sneak' ? 0.62 : 0.38;
      if (this.stepTimer <= 0) {
        this.stepTimer = interval;
        if (onNoise) onNoise(this.mode);
        if (this.mode === 'run') {
          this.noisePulse = 0.4;
          this.noiseX = this.x;
          this.noiseY = this.y;
        }
      }
    }
    if (this.noisePulse > 0) this.noisePulse -= dt;
  }
}
