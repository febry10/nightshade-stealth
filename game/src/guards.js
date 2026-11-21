// Nightshade — Silent Infiltration: guards and cameras.
//
// A guard walks a waypoint patrol, watches a vision cone, and grows
// suspicious when the player is seen. Suspicion fills faster up close, in
// the light, and against a running player; it drains when the player is out
// of sight. A full meter raises the alarm: the guard chases, and touching
// the player ends the level. Lose the guard, wait out the alarm, and it
// goes back to its patrol. Cameras are fixed eyes that sweep an arc and call
// the guards when they spot the player.

import {
  CAM_FOV,
  CAM_RANGE,
  CAM_SUSPICION_RATE,
  CATCH_DIST,
  CHASE_SPEED,
  FOV,
  GUARD_PAUSE,
  GUARD_SPEED,
  NOISE_SUSPICION,
  RUN_FACTOR,
  SHADOW_FACTOR,
  SNEAK_FACTOR,
  SUSPICION_DECAY,
  SUSPICION_MAX,
  SUSPICION_RATE,
  VIEW_RANGE,
  ALARM_HOLD,
} from './config.js';

const TAU = Math.PI * 2;

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= TAU;
  while (d < -Math.PI) d += TAU;
  return d;
}

function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

function segmentHitsRect(x1, y1, x2, y2, r) {
  // A segment is blocked when either end is inside the rectangle, or it
  // crosses one of the rectangle's four edges.
  if (pointInRect(x1, y1, r) || pointInRect(x2, y2, r)) return true;
  const edges = [
    [r.x, r.y, r.x + r.w, r.y],
    [r.x + r.w, r.y, r.x + r.w, r.y + r.h],
    [r.x + r.w, r.y + r.h, r.x, r.y + r.h],
    [r.x, r.y + r.h, r.x, r.y],
  ];
  for (const [ax, ay, bx, by] of edges) {
    const d1 = (bx - ax) * (y1 - ay) - (by - ay) * (x1 - ax);
    const d2 = (bx - ax) * (y2 - ay) - (by - ay) * (x2 - ax);
    const d3 = (x2 - x1) * (ay - y1) - (y2 - y1) * (ax - x1);
    const d4 = (x2 - x1) * (by - y1) - (y2 - y1) * (bx - x1);
    if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  }
  return false;
}

/** True when no wall or crate stands between two points. */
export function losClear(x1, y1, x2, y2, blockers) {
  for (const r of blockers) {
    if (segmentHitsRect(x1, y1, x2, y2, r)) return false;
  }
  return true;
}

/**
 * Whether a watcher at (x, y) facing `angle` with a cone of `fov` and a
 * reach of `range` can see a target at (tx, ty).
 */
export function canSee(x, y, angle, fov, range, tx, ty, blockers) {
  const dx = tx - x;
  const dy = ty - y;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist > 1 && Math.abs(angleDiff(Math.atan2(dy, dx), angle)) > fov / 2) return false;
  return losClear(x, y, tx, ty, blockers);
}

/** Whether a point sits inside a shadow zone (dark floor). */
export function inShadow(x, y, shadows) {
  for (const r of shadows) {
    if (pointInRect(x, y, r)) return true;
  }
  return false;
}

export class Guard {
  constructor(def) {
    this.waypoints = def.waypoints;
    this.x = def.waypoints[0].x;
    this.y = def.waypoints[0].y;
    this.wp = 1 % def.waypoints.length;
    this.angle = 0;
    this.pause = 0.6;
    this.state = 'patrol'; // patrol | chase | investigate | return
    this.suspicion = 0;
    this.alarmTimer = 0;
    this.lastSeen = null;
    this.investigateAt = null;
    this.lookTimer = 0;
    this.alarmed = false; // raised the alarm at least once this level
    this.stepPhase = 0;
  }

  get alarmedNow() {
    return this.state === 'chase';
  }

  hearNoise(nx, ny, radius) {
    if (this.state === 'chase') return;
    const d = Math.hypot(nx - this.x, ny - this.y);
    if (d > radius) return;
    this.suspicion = Math.min(SUSPICION_MAX, this.suspicion + NOISE_SUSPICION);
    this.investigateAt = { x: nx, y: ny };
    if (this.state === 'patrol') this.state = 'investigate';
  }

  _moveToward(tx, ty, speed, dt, solids) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) return true;
    const step = Math.min(dist, speed * dt);
    const nx = this.x + (dx / dist) * step;
    const ny = this.y + (dy / dist) * step;
    // Guards walk the open floor; a step into a solid is simply refused.
    let blocked = false;
    for (const r of solids) {
      if (pointInRect(nx, ny, r)) {
        blocked = true;
        break;
      }
    }
    if (!blocked) {
      this.x = nx;
      this.y = ny;
    }
    this.angle = Math.atan2(dy, dx);
    return dist - step < 2;
  }

  update(dt, world, player) {
    const { solids, shadows } = world;
    const seen = canSee(this.x, this.y, this.angle, FOV, VIEW_RANGE, player.x, player.y, solids);
    if (seen) {
      const dist = Math.hypot(player.x - this.x, player.y - this.y);
      const distFactor = 1 - (dist / VIEW_RANGE) * 0.6;
      const lightFactor = inShadow(player.x, player.y, shadows) ? SHADOW_FACTOR : 1;
      const speedFactor = player.mode === 'sneak' ? SNEAK_FACTOR : player.mode === 'run' ? RUN_FACTOR : 1;
      this.suspicion = Math.min(SUSPICION_MAX, this.suspicion + SUSPICION_RATE * distFactor * lightFactor * speedFactor * dt);
      this.lastSeen = { x: player.x, y: player.y };
      this.alarmTimer = ALARM_HOLD;
      if (this.suspicion >= SUSPICION_MAX && this.state !== 'chase') {
        this.state = 'chase';
        this.alarmed = true;
      }
    } else {
      this.suspicion = Math.max(0, this.suspicion - SUSPICION_DECAY * dt);
      if (this.state === 'chase') {
        this.alarmTimer -= dt;
        if (this.alarmTimer <= 0) {
          this.state = 'investigate';
          this.investigateAt = this.lastSeen ? { ...this.lastSeen } : { x: this.x, y: this.y };
        }
      }
    }

    if (this.state === 'patrol') {
      if (this.pause > 0) {
        this.pause -= dt;
        if (this.pause <= 0) {
          const target = this.waypoints[this.wp];
          this.angle = Math.atan2(target.y - this.y, target.x - this.x);
        }
      } else {
        const target = this.waypoints[this.wp];
        if (this._moveToward(target.x, target.y, GUARD_SPEED, dt, solids)) {
          this.wp = (this.wp + 1) % this.waypoints.length;
          this.pause = GUARD_PAUSE;
        }
      }
    } else if (this.state === 'chase') {
      const target = this.lastSeen || { x: player.x, y: player.y };
      this._moveToward(target.x, target.y, CHASE_SPEED, dt, solids);
      // A chasing guard that reaches the last seen spot without finding the
      // player keeps looking from there until the alarm cools.
      if (seen) this._moveToward(player.x, player.y, CHASE_SPEED, dt, solids);
    } else if (this.state === 'investigate') {
      if (this.investigateAt) {
        if (this._moveToward(this.investigateAt.x, this.investigateAt.y, GUARD_SPEED * 1.35, dt, solids)) {
          this.investigateAt = null;
          this.lookTimer = 2.2;
        }
      } else {
        this.lookTimer -= dt;
        this.angle += dt * 0.9;
        if (this.lookTimer <= 0) this.state = 'return';
      }
    } else if (this.state === 'return') {
      // Walk back to the nearest waypoint, then resume the patrol.
      let best = 0;
      let bestDist = Infinity;
      this.waypoints.forEach((w, i) => {
        const d = Math.hypot(w.x - this.x, w.y - this.y);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      const target = this.waypoints[best];
      if (this._moveToward(target.x, target.y, GUARD_SPEED, dt, solids)) {
        this.wp = (best + 1) % this.waypoints.length;
        this.state = 'patrol';
        this.pause = 0.4;
      }
    }
    this.stepPhase += dt;
  }

  get caughtPlayer() {
    return false; // the game checks distance itself
  }
}

export class Camera {
  constructor(def) {
    this.x = def.x;
    this.y = def.y;
    this.base = def.base;
    this.sweep = def.sweep;
    this.speed = def.speed;
    // A fixed starting phase (staggered per camera) keeps every camera's
    // sweep deterministic: the same load always renders the same frame.
    this.t = (def.phase ?? 0) * 2.3;
    this.angle = def.base;
    this.suspicion = 0;
    this.alarmed = false;
    this.alarmTimer = 0;
  }

  update(dt, world, player, onAlarm) {
    this.t += dt;
    this.angle = this.base + Math.sin(this.t * this.speed) * this.sweep;
    const seen = canSee(this.x, this.y, this.angle, CAM_FOV, CAM_RANGE, player.x, player.y, world.solids);
    if (seen) {
      const dist = Math.hypot(player.x - this.x, player.y - this.y);
      const distFactor = 1 - (dist / CAM_RANGE) * 0.5;
      const lightFactor = inShadow(player.x, player.y, world.shadows) ? SHADOW_FACTOR : 1;
      this.suspicion = Math.min(SUSPICION_MAX, this.suspicion + CAM_SUSPICION_RATE * distFactor * lightFactor * dt);
      if (this.suspicion >= SUSPICION_MAX && !this.alarmed) {
        this.alarmed = true;
        this.alarmTimer = ALARM_HOLD;
        if (onAlarm) onAlarm({ x: player.x, y: player.y });
      }
    } else {
      this.suspicion = Math.max(0, this.suspicion - SUSPICION_DECAY * dt);
      if (this.alarmed) {
        this.alarmTimer -= dt;
        if (this.alarmTimer <= 0) this.alarmed = false;
      }
    }
  }
}

export { CATCH_DIST };
