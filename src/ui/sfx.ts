import type { Rarity } from '../engine/data';
import { useStore } from './store';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function ac(): AudioContext | null {
  if (!useStore.getState().game.settings.sound) return null;
  try {
    if (!ctx) {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.3, delay = 0, slideTo?: number) {
  const c = ac();
  if (!c || !master) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(dur: number, vol = 0.3, filterFreq = 3000, delay = 0, type: BiquadFilterType = 'bandpass') {
  const c = ac();
  if (!c || !master) return;
  const t = c.currentTime + delay;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 1.5;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = filterFreq;
  const g = c.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

let charge: { o: OscillatorNode; g: GainNode } | null = null;

export const sfx = {
  click: () => tone(900, 0.05, 'triangle', 0.12),
  tab: () => tone(620, 0.06, 'triangle', 0.1),
  tear: () => { noise(0.35, 0.5, 2500); noise(0.2, 0.3, 6000, 0.08, 'highpass'); },
  flip: () => { noise(0.08, 0.25, 1800); tone(500, 0.06, 'triangle', 0.08); },
  whoosh: () => noise(0.25, 0.2, 900, 0, 'lowpass'),
  coin: () => { tone(1320, 0.08, 'square', 0.08); tone(1760, 0.18, 'square', 0.08, 0.07); },
  bigCoin: () => [0, 0.06, 0.12, 0.18].forEach((d, i) => tone(1046 * 1.26 ** i, 0.2, 'square', 0.07, d)),
  error: () => tone(180, 0.18, 'sawtooth', 0.12, 0, 120),
  glow: (rarity: Rarity) => {
    const base = { C: 300, U: 340, R: 400, SR: 460, UR: 520, SEC: 600 }[rarity];
    tone(base, 0.4, 'sine', 0.15, 0, base * 1.5);
  },
  crack: () => { noise(0.3, 0.6, 4000); tone(1200, 0.3, 'triangle', 0.15, 0.02, 2400); },
  reveal: (rarity: Rarity) => {
    const seqs: Record<Rarity, number[]> = {
      C: [660], U: [660, 880], R: [523, 659, 784], SR: [523, 659, 784, 1046],
      UR: [523, 659, 784, 1046, 1318], SEC: [392, 523, 659, 784, 1046, 1318, 1568],
    };
    const seq = seqs[rarity];
    seq.forEach((f, i) => tone(f, 0.35 + (i === seq.length - 1 ? 0.6 : 0), rarity === 'SEC' ? 'sawtooth' : 'triangle', rarity === 'C' ? 0.08 : 0.13, i * 0.07));
    if (rarity === 'UR' || rarity === 'SEC') noise(1.2, 0.15, 8000, 0.2, 'highpass');
  },
  chargeStart: () => {
    const c = ac();
    if (!c || !master || charge) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(110, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(880, c.currentTime + 1.3);
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.08, c.currentTime + 0.3);
    o.connect(g).connect(master);
    o.start();
    charge = { o, g };
  },
  chargeStop: () => {
    if (!charge || !ctx) return;
    const { o, g } = charge;
    g.gain.cancelScheduledValues(ctx.currentTime);
    g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
    o.stop(ctx.currentTime + 0.1);
    charge = null;
  },
  slab: () => { tone(220, 0.12, 'square', 0.1); noise(0.15, 0.3, 1200, 0.05); },
  fanfare: () => [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone(f, 0.25, 'square', 0.07, i * 0.11)),
};

export function buzz(pattern: number | number[]) {
  if (!useStore.getState().game.settings.haptics) return;
  try { navigator.vibrate?.(pattern); } catch { /* unsupported */ }
}
