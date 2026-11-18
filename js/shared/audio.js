import { rand, pickOne } from './utils.js';

// ---------------------------------------------------------------- musica e suoni (tutto sintetizzato, nessun file)
// Tutti i suoni sono note "carillon" nella stessa tonalità della musica (do maggiore pentatonico):
// così anche tanti tocchi insieme restano armoniosi. Toccare il prato NON fa suoni.
export const PENTA = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.5];
export const N = (n) => 261.63 * Math.pow(2, n / 12); // nota: semitoni dal do centrale
export const sfx = {
  ctx: null, fx: null, mus: null, last: {}, lastAny: 0,
  init() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = this.ctx = new AC();
      const comp = ctx.createDynamicsCompressor(); comp.connect(ctx.destination);
      const soft = ctx.createBiquadFilter(); soft.type = 'lowpass'; soft.frequency.value = 3800; soft.connect(comp);
      const bus = ctx.createGain(); bus.gain.value = 0.9; bus.connect(soft);
      // un po' di riverbero: suono più morbido, "da cameretta"
      const len = ctx.sampleRate * 1.6, ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
      const rev = ctx.createConvolver(); rev.buffer = ir;
      const wet = ctx.createGain(); wet.gain.value = 0.22; bus.connect(rev).connect(wet).connect(soft);
      this.fx = ctx.createGain(); this.fx.gain.value = 1; this.fx.connect(bus);
      this.mus = ctx.createGain(); this.mus.gain.value = 0; this.mus.connect(bus);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },
  // limita i suoni: lo stesso suono non si ripete troppo in fretta, e mai due suoni nello stesso istante
  ok(name, gap = 0.3) {
    if (!this.ctx) return false;
    const t = this.ctx.currentTime;
    if (t - (this.last[name] ?? -9) < gap || t - this.lastAny < 0.08) return false;
    this.last[name] = t; this.lastAny = t; return true;
  },
  note(f, { delay = 0, vol = 0.08, dur = 0.7, type = 'sine', slide = null, out = null, bright = 0.25 } = {}) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime + delay;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(out || this.fx);
    [[1, 1], [2, bright]].forEach(([m, v]) => {
      if (!v) return;
      const o = ctx.createOscillator(); o.type = m === 1 ? type : 'sine';
      o.frequency.setValueAtTime(f * m, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide * m, t + dur * 0.8);
      const gg = ctx.createGain(); gg.gain.value = v;
      o.connect(gg).connect(g); o.start(t); o.stop(t + dur + 0.05);
    });
  },
  arp(notes, step = 0.09, opt = {}) { notes.forEach((f, i) => this.note(f, { ...opt, delay: (opt.delay || 0) + i * step })); },

  // --- i pochi suoni del gioco
  pop() { if (this.ok('pop', 0.15)) { this.note(pickOne([PENTA[5], PENTA[6], PENTA[7]]), { vol: 0.09, dur: 0.4 }); this.note(900, { slide: 450, vol: 0.04, dur: 0.12, bright: 0 }); } },
  sparkle() { if (this.ok('sparkle')) this.arp([PENTA[4], PENTA[5], PENTA[7]].map((f) => f), 0.07, { vol: 0.06, dur: 0.6 }); },
  collect() { if (this.ok('collect', 0.2)) this.arp([PENTA[2], PENTA[4], PENTA[5]], 0.1, { vol: 0.1, dur: 0.8 }); },
  slot(i) { this.note(PENTA[Math.min(7, i + 3)], { vol: 0.08, dur: 1.0, delay: 0.05 }); },
  leo() { if (this.ok('leo', 0.4)) { this.note(N(7), { slide: N(19), vol: 0.07, dur: 0.25, type: 'triangle', bright: 0 }); this.arp([N(19), N(24)], 0.12, { vol: 0.06, dur: 0.5, delay: 0.15 }); } },
  dizzy() { if (this.ok('dizzy', 1)) this.arp([N(24), N(21), N(19), N(16), N(14)], 0.12, { vol: 0.07, dur: 0.5, type: 'triangle', bright: 0.1 }); },
  munch() { if (this.ok('munch', 0.6)) { this.note(N(7), { vol: 0.08, dur: 0.18, type: 'triangle' }); this.note(N(7), { vol: 0.08, dur: 0.18, type: 'triangle', delay: 0.22 }); this.note(N(19), { vol: 0.07, dur: 0.6, delay: 0.5 }); } },
  magic() { if (this.ok('magic', 0.8)) this.arp([N(12), N(16), N(19), N(24), N(28)], 0.08, { vol: 0.06, dur: 0.7 }); },
  travel() { this.arp([N(12), N(14), N(16), N(19), N(21), N(24), N(26), N(28)], 0.07, { vol: 0.05, dur: 0.6 }); },
  // ogni amico ha il suo piccolo motivo
  voice(kind) {
    if (!this.ok('v-' + kind, 0.6)) return;
    const V = {
      cow: () => this.arp([N(-5), N(-12)], 0.3, { vol: 0.1, dur: 0.6, type: 'triangle', bright: 0.1 }),
      pig: () => this.arp([N(4), N(0), N(4)], 0.1, { vol: 0.08, dur: 0.2, type: 'triangle' }),
      sheep: () => this.arp([N(7), N(7), N(7)], 0.11, { vol: 0.07, dur: 0.18 }),
      chick: () => this.arp([N(31), N(36)], 0.1, { vol: 0.06, dur: 0.18, bright: 0 }),
      dino: () => this.note(N(-5), { slide: N(-12), vol: 0.11, dur: 0.5, type: 'triangle', bright: 0.15 }),
      alien: () => { this.note(N(12), { slide: N(24), vol: 0.07, dur: 0.3, bright: 0 }); this.note(N(24), { slide: N(19), vol: 0.07, dur: 0.3, delay: 0.3, bright: 0 }); },
      fish: () => this.arp([N(16), N(21)], 0.09, { vol: 0.06, dur: 0.25, slide: null, bright: 0 }),
      crab: () => this.arp([N(24), N(24), N(28)], 0.1, { vol: 0.06, dur: 0.12 }),
      penguin: () => this.note(N(12), { slide: N(28), vol: 0.07, dur: 0.5, bright: 0 }),
      butterfly: () => this.arp([N(28), N(31), N(33)], 0.06, { vol: 0.05, dur: 0.4 }),
      car: () => this.arp([N(16), N(16)], 0.16, { vol: 0.07, dur: 0.14, type: 'triangle', bright: 0.3 }),
      gummy: () => this.note(N(19), { slide: N(26), vol: 0.07, dur: 0.22, bright: 0 }),
      firefly: () => this.arp([N(31), N(28), N(33)], 0.06, { vol: 0.05, dur: 0.5 }),
    };
    (V[kind] || V.butterfly)();
  },
  fanfare() {
    music.duck(4);
    this.arp([N(12), N(16), N(19), N(24)], 0.14, { vol: 0.1, dur: 0.6, type: 'triangle', bright: 0.2 });
    [N(12), N(16), N(19), N(24), N(28)].forEach((f) => this.note(f, { vol: 0.05, dur: 1.6, delay: 0.62 }));
  },
};

// colonna sonora: carillon dolce, una melodia diversa per ogni tipo di mondo
export const TUNES = {
  // note in semitoni dal do centrale (null = pausa), un basso per ogni battuta da 8
  allegra: { step: 0.27, mel: [12, null, 16, null, 19, null, 16, null, 21, null, 19, null, 16, null, null, null, 14, null, 16, null, 19, null, 21, null, 19, null, 16, null, 12, null, null, null], bass: [0, 5, 7, 0] },
  acqua: { step: 0.3, mel: [16, 19, 21, 19, 16, null, 14, null, 12, 14, 16, null, 19, null, null, null, 21, 19, 16, 14, 12, null, 14, null, 16, null, null, null, null, null, null, null], bass: [-3, 5, 0, 7] },
  ninna: { step: 0.4, mel: [19, null, 16, null, null, null, 19, null, 21, null, 19, null, 16, null, null, null, 12, null, 14, null, 16, null, 19, null, 16, null, 14, null, 12, null, null, null], bass: [0, -3, 5, 7] },
};
export const music = {
  on: true, tune: TUNES.allegra, nextT: 0, step: 0,
  set(name) { this.tune = TUNES[name] || TUNES.allegra; this.step = 0; },
  start() {
    if (!sfx.ctx || !this.on) return;
    const g = sfx.mus.gain, t = sfx.ctx.currentTime;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(1, t + 2);
  },
  stop() { if (!sfx.ctx) return; const g = sfx.mus.gain, t = sfx.ctx.currentTime; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0, t + 0.5); },
  duck(sec) { // abbassa la musica durante la festa
    if (!sfx.ctx || !this.on) return;
    const g = sfx.mus.gain, t = sfx.ctx.currentTime;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0.25, t + 0.3); g.setValueAtTime(0.25, t + sec); g.linearRampToValueAtTime(1, t + sec + 1.5);
  },
  tick() {
    const ctx = sfx.ctx;
    if (!ctx || ctx.state !== 'running' || !this.on) return;
    if (this.nextT < ctx.currentTime - 0.3) this.nextT = ctx.currentTime + 0.1; // dopo una pausa riparte pulita
    const tn = this.tune;
    while (this.nextT < ctx.currentTime + 0.2) {
      const i = this.step % tn.mel.length, t = this.nextT - ctx.currentTime;
      const m = tn.mel[i];
      if (m !== null) sfx.note(N(m), { delay: t, vol: 0.045, dur: 1.1, out: sfx.mus, bright: 0.3 });
      if (i % 8 === 0) sfx.note(N(tn.bass[(i / 8) % tn.bass.length] - 12), { delay: t, vol: 0.05, dur: tn.step * 7, type: 'triangle', out: sfx.mus, bright: 0 });
      if (i % 8 === 4) sfx.note(N(tn.bass[((i - 4) / 8) % tn.bass.length] - 5), { delay: t, vol: 0.025, dur: tn.step * 3, type: 'triangle', out: sfx.mus, bright: 0 });
      this.nextT += tn.step; this.step++;
    }
  },
};
