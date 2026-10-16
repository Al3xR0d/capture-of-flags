// Процедурный киберпанк-звук на Web Audio — без файлов.
// Браузер разрешит звук только после любого клика/нажатия на странице.

export interface Sfx {
  /** Музыкальная подложка: арпеджио + пульсирующий бас, обрывается через dur секунд */
  bed(dur: number): void;
  blip(): void;
  whoosh(dur?: number): void;
  impact(): void;
  crack(span?: number): void;
  riser(dur?: number): void;
  grind(dur?: number): void;
  thud(): void;
  shatter(): void;
  stinger(): void;
  /** Двойной писк: лазер захватил точку */
  lock(): void;
  stop(fade?: number): void;
}

let ctx: AudioContext | null = null;
let noiseBuf: AudioBuffer | null = null;
let impulse: AudioBuffer | null = null;

function getCtx(): AudioContext | null {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    // импульс реверберации: стерео-шум с экспоненциальным затуханием ~2 с
    const len = Math.floor(ctx.sampleRate * 2);
    impulse = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function distCurve(amount: number): Float32Array<ArrayBuffer> {
  const n = 1024;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * amount);
  }
  return curve;
}

const noop = () => {};
const SILENT: Sfx = {
  bed: noop, blip: noop, whoosh: noop, impact: noop, crack: noop, riser: noop,
  grind: noop, thud: noop, shatter: noop, stinger: noop, lock: noop, stop: noop,
};

// ре минор: D F A C — тёмная «неоновая» гармония
const NOTE = { D1: 36.71, D2: 73.42, A1: 55, F2: 87.31, D3: 146.83, F3: 174.61, A3: 220, C4: 261.63, D4: 293.66, F4: 349.23, A4: 440, D5: 587.33 };

export function createSfx({ volume = 0.7 } = {}): Sfx {
  const maybeCtx = getCtx();
  if (!maybeCtx || !noiseBuf || !impulse || volume <= 0) return SILENT;

  const ac: AudioContext = maybeCtx;
  const buf = noiseBuf;
  const master = ac.createGain();
  master.gain.value = volume;
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.ratio.value = 5;
  comp.attack.value = 0.003;
  master.connect(comp).connect(ac.destination);

  const reverb = ac.createConvolver();
  reverb.buffer = impulse;
  reverb.connect(master);

  // общий «бус» подложки — его обрываем на взрыве
  const bedBus = ac.createGain();
  bedBus.connect(master);

  const now = () => ac.currentTime;
  const rand = (a: number, b: number) => a + Math.random() * (b - a);

  function out(node: AudioNode, { pan = 0, wet = 0.15, dest = master as AudioNode } = {}) {
    const p = ac.createStereoPanner();
    p.pan.value = pan;
    node.connect(p).connect(dest);
    if (wet > 0) {
      const send = ac.createGain();
      send.gain.value = wet;
      p.connect(send).connect(reverb);
    }
  }

  function env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  function noise(t: number, dur: number, type: BiquadFilterType, freq: number, peak: number,
    { attack = 0.003, q = 0.7, pan = 0, wet = 0.1 } = {}) {
    const src = ac.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const f = ac.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ac.createGain();
    env(g, t, peak, attack, dur);
    src.connect(f).connect(g);
    out(g, { pan, wet });
    src.start(t, Math.random());
    src.stop(t + attack + dur + 0.05);
    return f;
  }

  function tone(t: number, type: OscillatorType, f0: number, f1: number, dur: number, peak: number,
    { attack = 0.002, pan = 0, wet = 0.1 } = {}) {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ac.createGain();
    env(g, t, peak, attack, dur);
    o.connect(g);
    out(g, { pan, wet });
    o.start(t);
    o.stop(t + attack + dur + 0.05);
  }

  // синт-нота: пила/квадрат через резонансный фильтр с огибающей
  function synth(t: number, freq: number, dur: number, peak: number, {
    type = 'sawtooth' as OscillatorType, cutoff = 1200, envAmt = 2500, q = 8, detune = 12,
    pan = 0, wet = 0.2, dest = master as AudioNode,
  } = {}) {
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = q;
    lp.frequency.setValueAtTime(cutoff + envAmt, t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(80, cutoff), t + dur * 0.8);
    const g = ac.createGain();
    env(g, t, peak, 0.004, dur);
    lp.connect(g);
    out(g, { pan, wet, dest });
    for (const d of detune ? [-detune, detune] : [0]) {
      const o = ac.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      o.detune.value = d;
      o.connect(lp);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
  }

  // 808: синус с глайдом вниз через перегруз
  function bass808(t: number, f0: number, f1: number, dur: number, peak: number, drive = 3) {
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + Math.min(0.12, dur * 0.3));
    const sh = ac.createWaveShaper();
    sh.curve = distCurve(drive);
    sh.oversample = '4x';
    const g = ac.createGain();
    env(g, t, peak, 0.002, dur);
    o.connect(sh).connect(g);
    out(g, { wet: 0.05 });
    o.start(t);
    o.stop(t + dur + 0.05);
    noise(t, 0.015, 'highpass', 3000, peak * 0.3, { attack: 0.0005, wet: 0 });
  }

  // цифровой статтер: серия коротких квадратных писков случайной высоты
  function stutter(t: number, count: number, step: number, peak: number) {
    for (let i = 0; i < count; i++) {
      const f = [880, 1320, 1760, 2640, 3520][Math.floor(Math.random() * 5)];
      tone(t + i * step, 'square', f, f * rand(0.6, 1.4), step * 0.7, peak, { attack: 0.001, pan: rand(-0.6, 0.6), wet: 0.05 });
    }
  }

  return {
    bed(dur) {
      const t0 = now() + 0.02;
      const step = 60 / 150 / 4; // шестнадцатые на 150 BPM
      const steps = Math.floor(dur / step);
      const arp = [NOTE.D3, NOTE.A3, NOTE.F3, NOTE.C4, NOTE.D4, NOTE.A3, NOTE.F4, NOTE.C4];
      for (let i = 0; i < steps; i++) {
        const t = t0 + i * step;
        const k = i / steps; // фильтр раскрывается к взрыву
        synth(t, arp[i % arp.length], step * 1.6, 0.05 + k * 0.04, {
          cutoff: 400 + k * 2200, envAmt: 1800 + k * 2000, q: 10, detune: 8,
          pan: i % 2 ? 0.35 : -0.35, wet: 0.25, dest: bedBus,
        });
        if (i % 2 === 0) {
          // пульсирующий бас на восьмых
          synth(t, NOTE.D2, step * 1.8, 0.11, { cutoff: 180 + k * 260, envAmt: 500, q: 4, detune: 5, wet: 0, dest: bedBus });
        }
        if (i % 4 === 2) {
          // хэт на офбитах
          const src = ac.createBufferSource();
          src.buffer = buf;
          const hp = ac.createBiquadFilter();
          hp.type = 'highpass';
          hp.frequency.value = 8000;
          const g = ac.createGain();
          env(g, t, 0.05 + k * 0.04, 0.001, 0.03);
          src.connect(hp).connect(g).connect(bedBus);
          src.start(t, Math.random());
          src.stop(t + 0.06);
        }
      }
      // резкий обрыв в момент взрыва
      bedBus.gain.setValueAtTime(1, t0 + dur - 0.01);
      bedBus.gain.linearRampToValueAtTime(0, t0 + dur + 0.01);
    },

    blip() {
      const t = now();
      tone(t, 'square', 2093, 2093, 0.02, 0.025, { pan: -0.5, wet: 0 });
      tone(t + 0.028, 'square', 3136, 3136, 0.018, 0.02, { pan: -0.5, wet: 0 });
    },

    whoosh(dur = 0.4) {
      const t = now();
      // «лазер» сверху вниз + воздух
      tone(t, 'sawtooth', 2400, 160, dur, 0.035, { attack: dur * 0.6, wet: 0.15 });
      const f = noise(t, 0.05, 'bandpass', 600, 0.2, { attack: dur, q: 2, wet: 0.05 });
      f.frequency.exponentialRampToValueAtTime(3500, t + dur);
    },

    impact() {
      const t = now();
      bass808(t, 160, 45, 0.45, 0.85, 4);
      // металлический удар через ring-mod-подобную пару квадратов
      tone(t, 'square', 523, 498, 0.5, 0.05, { wet: 0.4, pan: 0.15 });
      tone(t, 'square', 787, 760, 0.35, 0.035, { wet: 0.4, pan: -0.15 });
      noise(t, 0.06, 'bandpass', 2600, 0.3, { q: 1.5, wet: 0.25 });
      stutter(t + 0.05, 5, 0.03, 0.03);
    },

    crack(span = 0.8) {
      const t = now();
      for (let i = 0; i < 8; i++) {
        const at = t + 0.12 + Math.pow(Math.random(), 0.8) * span;
        const pan = rand(-0.8, 0.8);
        noise(at, rand(0.006, 0.015), 'highpass', rand(3500, 7000), rand(0.12, 0.22), { attack: 0.0005, pan, wet: 0.2 });
        if (Math.random() < 0.5) stutter(at, 2, 0.018, 0.015);
      }
    },

    riser(dur = 0.8) {
      const t = now();
      // суперсо-райзер: пачка расстроенных пил, фильтр открывается
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.Q.value = 6;
      lp.frequency.setValueAtTime(300, t);
      lp.frequency.exponentialRampToValueAtTime(7000, t + dur);
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.06, t + dur);
      g.gain.linearRampToValueAtTime(0, t + dur + 0.01);
      lp.connect(g);
      out(g, { wet: 0.2 });
      for (const d of [-25, -10, 0, 10, 25]) {
        const o = ac.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(NOTE.D3, t);
        o.frequency.exponentialRampToValueAtTime(NOTE.D5, t + dur);
        o.detune.value = d;
        o.connect(lp);
        o.start(t);
        o.stop(t + dur + 0.05);
      }
    },

    // скрежет: прерывистый узкий шум через перегруз
    grind(dur = 0.7) {
      const t = now();
      const src = ac.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 6;
      bp.frequency.setValueAtTime(800, t);
      bp.frequency.exponentialRampToValueAtTime(2400, t + dur);
      const sh = ac.createWaveShaper();
      sh.curve = distCurve(6);
      const chop = ac.createGain();
      chop.gain.value = 0.5;
      const lfo = ac.createOscillator();
      lfo.type = 'square';
      lfo.frequency.setValueAtTime(16, t);
      lfo.frequency.linearRampToValueAtTime(40, t + dur);
      const lfoDepth = ac.createGain();
      lfoDepth.gain.value = 0.5;
      lfo.connect(lfoDepth).connect(chop.gain);
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.09, t + dur * 0.85);
      g.gain.linearRampToValueAtTime(0, t + dur + 0.01);
      src.connect(bp).connect(sh).connect(chop).connect(g);
      out(g, { wet: 0.15 });
      src.start(t);
      src.stop(t + dur + 0.1);
      lfo.start(t);
      lfo.stop(t + dur + 0.1);
    },

    thud() {
      const t = now();
      bass808(t, 120, 40, 0.5, 0.6, 3);
      tone(t, 'square', 330, 320, 0.25, 0.02, { wet: 0.4 });
    },

    shatter() {
      const t = now();
      // дроп: тяжёлый 808 с длинным хвостом
      bass808(t, 180, NOTE.D1, 1.4, 1.0, 5);
      noise(t, 0.25, 'highpass', 4500, 0.4, { attack: 0.001, wet: 0.3 });
      noise(t, 0.1, 'bandpass', 1400, 0.35, { attack: 0.001, q: 0.8, wet: 0.1 });
      stutter(t + 0.02, 8, 0.025, 0.035);
      // цифровое «стекло»
      for (let i = 0; i < 30; i++) {
        const at = t + Math.pow(Math.random(), 1.8) * 1.1;
        const f = rand(2800, 7500);
        tone(at, Math.random() < 0.3 ? 'square' : 'sine', f, f * rand(0.85, 1.05), rand(0.03, 0.14), rand(0.012, 0.035),
          { attack: 0.001, pan: rand(-0.9, 0.9), wet: 0.3 });
      }
    },

    // финальный аккорд: суперсо Dm(add9) + 808 + арпеджио, с «насосом»
    stinger() {
      const t = now() + 0.1;
      const pump = ac.createGain();
      pump.gain.value = 1;
      const beat = 60 / 150;
      for (let b = 0; b < 6; b++) {
        const bt = t + b * beat;
        pump.gain.setValueAtTime(0.25, bt);
        pump.gain.linearRampToValueAtTime(1, bt + beat * 0.7);
      }
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.Q.value = 3;
      lp.frequency.setValueAtTime(500, t);
      lp.frequency.exponentialRampToValueAtTime(3800, t + 0.4);
      lp.frequency.exponentialRampToValueAtTime(700, t + 2.8);
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.085, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 3);
      lp.connect(pump).connect(g);
      out(g, { wet: 0.35 });
      for (const f of [NOTE.D3, NOTE.A3, NOTE.D4, NOTE.F4, 659.25]) {
        for (const d of [-14, -5, 5, 14]) {
          const o = ac.createOscillator();
          o.type = 'sawtooth';
          o.frequency.value = f;
          o.detune.value = d;
          o.connect(lp);
          o.start(t);
          o.stop(t + 3.1);
        }
      }
      for (let b = 0; b < 4; b++) bass808(t + b * beat, NOTE.D2 * 1.5, NOTE.D2, beat * 0.9, 0.45, 3);
      [NOTE.D5, NOTE.A4, NOTE.F4, NOTE.D4, NOTE.A4, NOTE.D5].forEach((f, i) => {
        synth(t + 0.05 + i * (beat / 4), f, 0.18, 0.04, { type: 'square', cutoff: 1500, envAmt: 3000, q: 6, detune: 0, pan: -0.4 + i * 0.16, wet: 0.4 });
      });
    },

    lock() {
      const t = now();
      for (const at of [0, 0.13]) tone(t + at, 'square', 1568, 1568, 0.06, 0.035, { attack: 0.002, wet: 0.1 });
      tone(t + 0.26, 'square', 2093, 2093, 0.12, 0.03, { attack: 0.002, wet: 0.2 });
    },

    stop(fade = 0.25) {
      const t = now();
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(0, t + fade);
      setTimeout(() => master.disconnect(), (fade + 0.1) * 1000);
    },
  };
}
