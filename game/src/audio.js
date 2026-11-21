// Nightshade — Silent Infiltration: synthesized sound.
//
// Every sound is built from oscillators and filtered noise at runtime; the
// game ships no audio files. The engine starts lazily on the first user
// gesture (browsers block audio before that) and stays silent until then.

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.noiseBuf = null;
    this.droneNodes = null;
    this.alarmUntil = 0;
  }

  ensure() {
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
        const len = this.ctx.sampleRate;
        this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      } catch (e) {
        this.ctx = null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  tone(freq, dur, type, gain, when = 0, slideTo = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.now() + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  noise(dur, gain, filterFreq, when = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.now() + when;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = 0.8;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  /** A footstep: soft tap while sneaking, louder thud while running. */
  footstep(mode) {
    if (!this.ctx || this.muted) return;
    if (mode === 'sneak') this.noise(0.07, 0.05, 700);
    else if (mode === 'run') this.noise(0.09, 0.22, 420);
    else this.noise(0.08, 0.11, 520);
  }

  click() {
    this.tone(660, 0.07, 'sine', 0.12);
  }

  pickup() {
    // A small two-note chime, like a gem slipping into a pouch.
    this.tone(880, 0.14, 'sine', 0.2);
    this.tone(1318, 0.22, 'sine', 0.18, 0.09);
  }

  alarm() {
    // A short two-tone warning sting; throttled so it cannot stack.
    if (!this.ctx || this.muted) return;
    if (this.now() < this.alarmUntil) return;
    this.alarmUntil = this.now() + 0.9;
    this.tone(622, 0.22, 'square', 0.08);
    this.tone(466, 0.3, 'square', 0.08, 0.22);
  }

  win() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.28, 'triangle', 0.2, i * 0.11));
  }

  lose() {
    [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.32, 'sawtooth', 0.1, i * 0.14));
  }

  levelClear() {
    [784, 988, 1175].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.18, i * 0.1));
  }

  /** A low, slow drone under the game; starts with play, stops on title. */
  startDrone() {
    if (!this.ensure() || this.droneNodes) return;
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.value = 0.035;
    const o1 = ctx.createOscillator();
    o1.type = 'sine';
    o1.frequency.value = 55;
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = 55.6;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain);
    lfoGain.connect(g.gain);
    o1.connect(g);
    o2.connect(g);
    g.connect(this.master);
    o1.start();
    o2.start();
    lfo.start();
    this.droneNodes = { g, o1, o2, lfo };
  }

  stopDrone() {
    if (!this.droneNodes) return;
    try {
      const { g, o1, o2, lfo } = this.droneNodes;
      g.gain.setValueAtTime(0.0001, this.now());
      o1.stop(this.now() + 0.2);
      o2.stop(this.now() + 0.2);
      lfo.stop(this.now() + 0.2);
    } catch (e) {
      /* already stopped */
    }
    this.droneNodes = null;
  }
}
