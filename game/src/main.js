// Nightshade — Silent Infiltration: the game itself.
//
// A top-down stealth game in three missions. The thief steals every
// artifact in a level and reaches the exit without being caught. Guards
// patrol with vision cones and suspicion meters; cameras sweep the halls;
// shadows hide the player and running footsteps give them away.
//
// States: title, playing, paused, level (level complete), caught, win.
// The game is fully offline: canvas 2D, synthesized WebAudio, no network.

import {
  ARTIFACT_SCORE,
  CATCH_DIST,
  COLS,
  GHOST_BONUS,
  NOISE_RADIUS,
  PICKUP_DIST,
  ROWS,
  TIME_BONUS_RATE,
} from './config.js';
import { LEVELS, parseLevel } from './levels.js';
import { Camera, Guard } from './guards.js';
import { Player } from './player.js';
import { Renderer } from './render.js';
import { SoundEngine } from './audio.js';
import { Input } from './input.js';
import { applyShot } from './shots.js';

const $ = (id) => document.getElementById(id);

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = new Input();
    this.sfx = new SoundEngine();
    this.renderer = new Renderer();
    this.levelIndex = 0;
    this.level = null;
    this.guards = [];
    this.cameras = [];
    this.artifacts = [];
    this.player = null;
    this.state = 'title';
    this.frozen = false; // screenshot mode: render only, never update
    this.time = 0;
    this.levelTime = 0;
    this.score = 0;
    this.levelScore = 0;
    this.alarmedThisLevel = false;
    this.anyAlarm = false;
    this.lastTs = 0;
    this._shot = null;

    this.input.attach();
    this.input.onFirstGesture = () => this.sfx.ensure();
    this._wireButtons();
    this._bindKeys();
  }

  // ------------------------------------------------------------ levels

  startLevel(index, opts = {}) {
    this.levelIndex = index;
    const def = LEVELS[index];
    this.level = parseLevel(def);
    this.guards = this.level.guards.map((g) => new Guard(g));
    this.cameras = this.level.cameras.map((c) => new Camera(c));
    this.artifacts = this.level.artifacts;
    this.player = new Player(this.level.playerStart.x, this.level.playerStart.y);
    this.levelTime = 0;
    this.levelScore = 0;
    this.alarmedThisLevel = false;
    this.anyAlarm = false;
    this.state = 'playing';
    this.hideScreens();
    if (!opts.silent) {
      this.sfx.ensure();
      this.sfx.startDrone();
    }
    this.updateHud();
    this.setMessage(`${def.name} — steal ${this.artifacts.length} artifact${this.artifacts.length > 1 ? 's' : ''}, then reach the exit.`);
  }

  get artifactsLeft() {
    return this.artifacts.filter((a) => !a.taken).length;
  }

  get maxSuspicion() {
    let m = 0;
    for (const g of this.guards) m = Math.max(m, g.suspicion);
    for (const c of this.cameras) m = Math.max(m, c.suspicion);
    return m;
  }

  // ------------------------------------------------------------ screens

  _wireButtons() {
    $('btn-start').addEventListener('click', () => this._startGame());
    $('btn-resume').addEventListener('click', () => this.resume());
    $('btn-retry').addEventListener('click', () => this.startLevel(this.levelIndex));
    $('btn-next').addEventListener('click', () => this.startLevel(this.levelIndex + 1));
    $('btn-again').addEventListener('click', () => this._startGame());
    $('btn-title').addEventListener('click', () => this.toTitle());
    $('btn-mute').addEventListener('click', () => this.toggleMute());
    $('btn-quit').addEventListener('click', () => this.toTitle());
  }

  _bindKeys() {
    // Menu keys are handled in the frame update, where the state is known.
  }

  _startGame() {
    this.score = 0;
    this.sfx.ensure();
    this.sfx.click();
    this.startLevel(0);
  }

  toTitle() {
    this.state = 'title';
    this.sfx.stopDrone();
    this.hideScreens();
    $('screen-title').classList.remove('hidden');
    this.levelIndex = 0;
    this.startLevelPreview();
  }

  startLevelPreview() {
    // The title screen shows the first mission behind it, frozen.
    const def = LEVELS[0];
    this.level = parseLevel(def);
    this.guards = this.level.guards.map((g) => new Guard(g));
    this.cameras = this.level.cameras.map((c) => new Camera(c));
    this.artifacts = this.level.artifacts;
    this.player = new Player(this.level.playerStart.x, this.level.playerStart.y);
    this.levelTime = 0;
    this.anyAlarm = false;
  }

  pause() {
    if (this.state !== 'playing' || this.frozen) return;
    this.state = 'paused';
    $('screen-pause').classList.remove('hidden');
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    $('screen-pause').classList.add('hidden');
    // Consume the very keypress that resumed the game, so this frame's
    // update does not read the same P as a fresh pause request.
    this.input.pressed.delete('KeyP');
    this.input.pressed.delete('Escape');
    this.sfx.click();
  }

  toggleMute() {
    this.sfx.ensure();
    this.sfx.setMuted(!this.sfx.muted);
    $('btn-mute').textContent = this.sfx.muted ? 'Sound: Off (M)' : 'Sound: On (M)';
  }

  hideScreens() {
    for (const id of ['screen-title', 'screen-pause', 'screen-level', 'screen-caught', 'screen-win']) {
      $(id).classList.add('hidden');
    }
  }

  // ------------------------------------------------------------ HUD

  setMessage(text) {
    $('hud-msg').textContent = text;
  }

  updateHud() {
    const def = LEVELS[this.levelIndex];
    $('hud-level').textContent = `${def.name} · ${this.levelIndex + 1}/${LEVELS.length}`;
    const taken = this.artifacts.length - this.artifactsLeft;
    $('hud-artifacts').textContent = `◆ ${taken}/${this.artifacts.length}`;
    $('hud-time').textContent = fmtTime(this.levelTime);
    $('hud-score').textContent = `Score ${this.score + this.levelScore}`;
    const sus = this.maxSuspicion;
    const bar = $('hud-detect-fill');
    bar.style.width = `${sus}%`;
    const alarm = this.guards.some((g) => g.state === 'chase') || this.cameras.some((c) => c.alarmed);
    this.anyAlarm = alarm;
    bar.className = sus >= 100 ? 'alarm' : sus > 40 ? 'warm' : '';
    $('hud-detect-label').textContent = alarm ? 'ALARM' : sus > 40 ? 'SPOTTED?' : 'UNSEEN';
    $('hud-detect-label').className = alarm ? 'alarm-text' : '';
    const near = this.nearestArtifact();
    $('hud-msg').textContent =
      near && !near.taken
        ? `Press E — take the ${near.name}`
        : this.artifactsLeft === 0
          ? 'All artifacts stolen — reach the glowing EXIT!'
          : `${def.name} — steal ${this.artifactsLeft} more, then reach the exit.`;
  }

  nearestArtifact() {
    if (!this.player) return null;
    let best = null;
    let bestDist = Infinity;
    for (const a of this.artifacts) {
      if (a.taken) continue;
      const d = Math.hypot(a.x - this.player.x, a.y - this.player.y);
      if (d < bestDist) {
        bestDist = d;
        best = a;
      }
    }
    return bestDist < PICKUP_DIST + 14 ? best : null;
  }

  // ------------------------------------------------------------ update

  update(dt) {
    if (this.state === 'title') {
      // Guards keep walking behind the title screen.
      for (const g of this.guards) g.update(dt, this.level, this.player);
      for (const c of this.cameras) c.update(dt, this.level, this.player, null);
      return;
    }
    if (this.state !== 'playing' || this.frozen) return;

    const input = this.input;
    if (input.wasPressed('KeyP') || input.wasPressed('Escape')) {
      this.pause();
      return;
    }
    if (input.wasPressed('KeyR')) {
      this.startLevel(this.levelIndex);
      return;
    }
    if (input.wasPressed('KeyM')) this.toggleMute();

    this.levelTime += dt;
    this.time += dt;

    this.player.update(dt, input, this.level.solids, (mode) => {
      this.sfx.footstep(mode);
      if (mode === 'run') {
        for (const g of this.guards) g.hearNoise(this.player.x, this.player.y, NOISE_RADIUS);
      }
    });

    for (const g of this.guards) {
      g.update(dt, this.level, this.player);
      if (g.state === 'chase' && !this.alarmedThisLevel) {
        this.alarmedThisLevel = true;
        this.sfx.alarm();
      }
    }
    for (const c of this.cameras) {
      c.update(dt, this.level, this.player, (pos) => {
        this.alarmedThisLevel = true;
        this.sfx.alarm();
        // A camera that spots the thief sends the two nearest guards over.
        const sorted = [...this.guards].sort(
          (a, b) => Math.hypot(a.x - pos.x, a.y - pos.y) - Math.hypot(b.x - pos.x, b.y - pos.y),
        );
        for (const g of sorted.slice(0, 2)) {
          if (g.state !== 'chase') {
            g.state = 'investigate';
            g.investigateAt = { x: pos.x, y: pos.y };
          }
        }
      });
    }
    this.anyAlarm =
      this.guards.some((g) => g.state === 'chase') || this.cameras.some((c) => c.alarmed);

    // Pick up an artifact with E (or Space).
    if (input.wasPressed('KeyE') || input.wasPressed('Space')) {
      const near = this.nearestArtifact();
      if (near) {
        near.taken = true;
        this.levelScore += ARTIFACT_SCORE;
        this.sfx.pickup();
      }
    }

    // Caught: a guard close enough to grab the thief.
    for (const g of this.guards) {
      if (Math.hypot(g.x - this.player.x, g.y - this.player.y) < CATCH_DIST) {
        this._caught(g);
        return;
      }
    }

    // Exit: open once every artifact is stolen.
    if (this.artifactsLeft === 0) {
      const e = this.level.exit;
      if (Math.hypot(e.x - this.player.x, e.y - this.player.y) < 24) {
        this._levelComplete();
        return;
      }
    }

    this.updateHud();
  }

  _caught(guard) {
    this.state = 'caught';
    this.sfx.stopDrone();
    this.sfx.lose();
    $('caught-text').textContent = `A guard caught you in ${LEVELS[this.levelIndex].name}. The night is not over — try a darker route.`;
    $('screen-caught').classList.remove('hidden');
  }

  _levelComplete() {
    const def = LEVELS[this.levelIndex];
    const timeBonus = Math.max(0, Math.round((def.par - this.levelTime) * TIME_BONUS_RATE));
    const ghost = this.alarmedThisLevel ? 0 : GHOST_BONUS;
    const total = this.levelScore + timeBonus + ghost;
    this.score += total;
    this.levelScore = 0;
    this.sfx.stopDrone();
    this.sfx.levelClear();
    if (this.levelIndex + 1 >= LEVELS.length) {
      this.state = 'win';
      this.sfx.win();
      $('win-score').textContent = `Final score: ${this.score}`;
      $('win-detail').textContent =
        'The Nightshade Diamond is yours. Three halls, three clean getaways — the city never saw you.';
      $('screen-win').classList.remove('hidden');
      return;
    }
    this.state = 'level';
    $('level-title').textContent = `${def.name} — Clean Getaway`;
    $('level-detail').textContent =
      `Artifacts ${this.artifacts.length}/${this.artifacts.length} · Time ${fmtTime(this.levelTime)} (par ${fmtTime(def.par)}) · Time bonus +${timeBonus} · Ghost bonus +${ghost}`;
    $('level-score').textContent = `Level score ${total} · Total ${this.score}`;
    $('btn-next').textContent = `Next: ${LEVELS[this.levelIndex + 1].name} →`;
    $('screen-level').classList.remove('hidden');
  }

  // ------------------------------------------------------------ loop

  frame(ts) {
    const dt = Math.min(0.05, this.lastTs ? (ts - this.lastTs) / 1000 : 0.016);
    this.lastTs = ts;
    if (!this.frozen) {
      // Menu keys.
      if (this.state === 'title' && (this.input.wasPressed('Enter') || this.input.wasPressed('Space'))) {
        this._startGame();
      } else if (this.state === 'paused' && (this.input.wasPressed('KeyP') || this.input.wasPressed('Escape'))) {
        this.resume();
      } else if (this.state === 'level' && this.input.wasPressed('Enter')) {
        this.startLevel(this.levelIndex + 1);
      } else if (this.state === 'caught' && this.input.wasPressed('Enter')) {
        this.startLevel(this.levelIndex);
      } else if (this.state === 'win' && this.input.wasPressed('Enter')) {
        this._startGame();
      }
      this.update(dt);
    }
    this.renderer.draw(this.ctx, this);
    this.input.endFrame();
    requestAnimationFrame((t) => this.frame(t));
  }

  start() {
    // A shot URL poses one frozen frame; otherwise the title screen shows.
    const params = new URLSearchParams(location.search);
    const shot = params.get('shot');
    if (shot) {
      this._shot = shot;
      this.startLevelPreview();
      if (applyShot(this, shot)) {
        requestAnimationFrame((t) => this.frame(t));
        return;
      }
    }
    this.toTitle();
    requestAnimationFrame((t) => this.frame(t));
  }
}

function fmtTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

// Boot the game. Exposed on window for headless play-testing only.
const game = new Game(document.getElementById('game'));
window.__game = game;
game.start();

export { COLS, ROWS };
