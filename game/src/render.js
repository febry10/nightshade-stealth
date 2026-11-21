// Nightshade — Silent Infiltration: canvas rendering.
//
// The scene is drawn in layers: floor, shadow zones, vision cones, then
// walls and crates on top (so a cone looks blocked by a wall), then the
// artifacts, exit, cameras, guards and the player, and finally a darkness
// overlay punched with light around the player and the guards' lanterns.
// All art is drawn code — no images, no fonts from the network.

import { CAM_FOV, CAM_RANGE, FOV, TILE, VIEW_H, VIEW_W, VIEW_RANGE } from './config.js';

const FLOOR_A = '#232733';
const FLOOR_B = '#20242f';
const SHADOW_FILL = 'rgba(8, 10, 26, 0.55)';
const WALL_FILL = '#3a3f52';
const WALL_TOP = '#565d78';
const CRATE_FILL = '#6b4a2b';
const CRATE_LINE = '#4a3018';

const GEM_COLORS = ['#7de3ff', '#ffd166', '#ff6b9d', '#9dff8a', '#c9a7ff'];

function conePath(ctx, x, y, angle, fov, range) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - fov / 2, angle + fov / 2);
  ctx.closePath();
}

function drawCone(ctx, x, y, angle, fov, range, suspicion, alarmed) {
  const color = alarmed
    ? 'rgba(255, 64, 64, 0.30)'
    : suspicion > 40
      ? 'rgba(255, 170, 60, 0.26)'
      : 'rgba(255, 214, 90, 0.17)';
  conePath(ctx, x, y, angle, fov, range);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = alarmed ? 'rgba(255, 90, 90, 0.5)' : 'rgba(255, 220, 120, 0.28)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawGem(ctx, x, y, color, pulse) {
  const s = 9 + pulse * 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = color;
  ctx.shadowBlur = 14 + pulse * 8;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.lineTo(s * 0.75, 0);
  ctx.lineTo(0, s);
  ctx.lineTo(-s * 0.75, 0);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.55);
  ctx.lineTo(s * 0.35, 0);
  ctx.lineTo(0, s * 0.55);
  ctx.lineTo(-s * 0.35, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export class Renderer {
  constructor() {
    this.light = document.createElement('canvas');
    this.light.width = VIEW_W;
    this.light.height = VIEW_H;
  }

  draw(ctx, game) {
    const { level, guards, cameras, player, time } = game;
    const t = time;

    // Floor: a quiet two-tone checker.
    for (let row = 0; row < 18; row++) {
      for (let col = 0; col < 30; col++) {
        ctx.fillStyle = (row + col) % 2 === 0 ? FLOOR_A : FLOOR_B;
        ctx.fillRect(col * TILE, row * TILE, TILE, TILE);
      }
    }

    // Shadow zones: dark floor where detection is slower.
    for (const r of level.shadows) {
      ctx.fillStyle = SHADOW_FILL;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = 'rgba(90, 110, 200, 0.18)';
      ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    }

    // Vision cones (drawn before the walls so walls occlude them).
    for (const g of guards) {
      drawCone(ctx, g.x, g.y, g.angle, FOV, VIEW_RANGE, g.suspicion, g.state === 'chase');
    }
    for (const c of cameras) {
      drawCone(ctx, c.x, c.y, c.angle, CAM_FOV, CAM_RANGE, c.suspicion, c.alarmed);
    }

    // Exit: a doorway that glows green once every artifact is stolen.
    const exit = level.exit;
    const open = game.artifactsLeft === 0;
    ctx.save();
    ctx.translate(exit.x, exit.y);
    ctx.fillStyle = open ? '#123524' : '#1c1f2a';
    ctx.strokeStyle = open ? '#39d98a' : '#4a5068';
    ctx.lineWidth = 2;
    ctx.fillRect(-14, -14, 28, 28);
    ctx.strokeRect(-14, -14, 28, 28);
    if (open) {
      ctx.shadowColor = '#39d98a';
      ctx.shadowBlur = 16 + Math.sin(t * 4) * 5;
      ctx.fillStyle = '#39d98a';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('EXIT', 0, 0);
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = '#6b7280';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('LOCK', 0, 0);
    }
    ctx.restore();

    // Artifacts: glowing gems that bob gently.
    game.artifacts.forEach((a, i) => {
      if (a.taken) return;
      const pulse = Math.sin(t * 3 + i * 1.7) * 0.5 + 0.5;
      drawGem(ctx, a.x, a.y + Math.sin(t * 2 + i) * 2, GEM_COLORS[i % GEM_COLORS.length], pulse);
    });

    // Crates: wooden boxes with cross planks.
    for (const r of level.crates) {
      ctx.fillStyle = CRATE_FILL;
      ctx.fillRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
      ctx.strokeStyle = CRATE_LINE;
      ctx.lineWidth = 2;
      ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
      ctx.beginPath();
      ctx.moveTo(r.x + 2, r.y + 2);
      ctx.lineTo(r.x + r.w - 2, r.y + r.h - 2);
      ctx.moveTo(r.x + r.w - 2, r.y + 2);
      ctx.lineTo(r.x + 2, r.y + r.h - 2);
      ctx.stroke();
    }

    // Walls: slate blocks with a lit top edge.
    for (const r of level.walls) {
      ctx.fillStyle = WALL_FILL;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = WALL_TOP;
      ctx.fillRect(r.x, r.y, r.w, 3);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    }

    // Cameras: a wall eye on a small mount.
    for (const c of cameras) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.fillStyle = '#8a8f9e';
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.rotate(c.angle);
      ctx.fillStyle = c.alarmed ? '#ff4040' : '#e8b64c';
      ctx.beginPath();
      ctx.moveTo(6, -4);
      ctx.lineTo(16, 0);
      ctx.lineTo(6, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      if (c.suspicion > 5) {
        ctx.fillStyle = c.alarmed ? '#ff5a5a' : '#ffb84d';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(c.alarmed ? '!' : '?', c.x, c.y - 14);
      }
    }

    // Guards: maroon coats, a facing tick, and a "?" or "!" overhead.
    for (const g of guards) {
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.fillStyle = g.state === 'chase' ? '#a11d1d' : '#7a2e2e';
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e8d9b0';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.rotate(g.angle);
      ctx.fillStyle = '#f2e6c9';
      ctx.beginPath();
      ctx.moveTo(12, -4);
      ctx.lineTo(20, 0);
      ctx.lineTo(12, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      if (g.suspicion > 4) {
        // A small arc over the guard shows how close it is to raising the alarm.
        ctx.strokeStyle = g.state === 'chase' ? '#ff5a5a' : '#ffcf5e';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(g.x, g.y, 17, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * g.suspicion) / 100);
        ctx.stroke();
      }
      if (g.state === 'chase') {
        ctx.fillStyle = '#ff5a5a';
        ctx.font = 'bold 15px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('!', g.x, g.y - 20);
      } else if (g.suspicion > 35) {
        ctx.fillStyle = '#ffcf5e';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('?', g.x, g.y - 20);
      }
    }

    // The player: a hooded figure in nightshade purple.
    ctx.save();
    ctx.translate(player.x, player.y);
    if (player.mode === 'sneak') {
      ctx.strokeStyle = 'rgba(190, 160, 255, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = '#7b4fd0';
    ctx.beginPath();
    ctx.arc(0, 0, player.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d9c8ff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.rotate(player.facing);
    ctx.fillStyle = '#efe7ff';
    ctx.beginPath();
    ctx.moveTo(player.r - 1, -4);
    ctx.lineTo(player.r + 8, 0);
    ctx.lineTo(player.r - 1, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // The noise ring of running footsteps.
    if (player.noisePulse > 0) {
      const p = 1 - player.noisePulse / 0.4;
      ctx.strokeStyle = `rgba(255, 220, 120, ${0.55 * (1 - p)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(player.noiseX, player.noiseY, 14 + p * 120, 0, Math.PI * 2);
      ctx.stroke();
    }

    this._lighting(ctx, game);

    // A red pulse at the screen edge while any alarm is raised.
    if (game.anyAlarm) {
      const a = 0.22 + Math.sin(t * 8) * 0.1;
      ctx.strokeStyle = `rgba(255, 40, 40, ${a})`;
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, VIEW_W - 10, VIEW_H - 10);
    }
  }

  _lighting(ctx, game) {
    const lc = this.light.getContext('2d');
    lc.clearRect(0, 0, VIEW_W, VIEW_H);
    lc.globalCompositeOperation = 'source-over';
    lc.fillStyle = 'rgba(4, 5, 18, 0.42)';
    lc.fillRect(0, 0, VIEW_W, VIEW_H);
    lc.globalCompositeOperation = 'destination-out';
    const punch = (x, y, r) => {
      const grad = lc.createRadialGradient(x, y, 10, x, y, r);
      grad.addColorStop(0, 'rgba(0,0,0,0.95)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = grad;
      lc.beginPath();
      lc.arc(x, y, r, 0, Math.PI * 2);
      lc.fill();
    };
    punch(game.player.x, game.player.y, 175);
    for (const g of game.guards) punch(g.x, g.y, 110);
    for (const c of game.cameras) punch(c.x, c.y, 90);
    for (const a of game.artifacts) {
      if (!a.taken) punch(a.x, a.y, 70);
    }
    ctx.drawImage(this.light, 0, 0);
  }
}
