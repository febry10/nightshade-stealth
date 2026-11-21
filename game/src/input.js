// Nightshade — Silent Infiltration: keyboard input.
//
// Tracks held keys and edge-triggered presses (a press is consumed once per
// frame, so holding E does not re-trigger an interaction every frame).

const PREVENT = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space',
]);

export class Input {
  constructor() {
    this.down = new Set();
    this.pressed = new Set();
    this.onFirstGesture = null;
    this._gestured = false;
    this._onKeyDown = (e) => {
      if (PREVENT.has(e.code)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.code);
      this.down.add(e.code);
      this._gesture();
    };
    this._onKeyUp = (e) => {
      this.down.delete(e.code);
    };
    this._onBlur = () => {
      this.down.clear();
    };
    this._onPointer = () => this._gesture();
  }

  attach() {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    window.addEventListener('pointerdown', this._onPointer);
  }

  _gesture() {
    if (this._gestured) return;
    this._gestured = true;
    if (this.onFirstGesture) this.onFirstGesture();
  }

  held(code) {
    return this.down.has(code);
  }

  /** True once, on the frame the key went down. */
  wasPressed(code) {
    return this.pressed.has(code);
  }

  /** Movement vector from WASD or the arrow keys, normalized. */
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.held('KeyA') || this.held('ArrowLeft')) x -= 1;
    if (this.held('KeyD') || this.held('ArrowRight')) x += 1;
    if (this.held('KeyW') || this.held('ArrowUp')) y -= 1;
    if (this.held('KeyS') || this.held('ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.hypot(x, y);
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  get sneak() {
    return this.held('ShiftLeft') || this.held('ShiftRight');
  }

  get run() {
    return this.held('KeyX');
  }

  endFrame() {
    this.pressed.clear();
  }
}
