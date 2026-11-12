// Courtyard 1944 mission theme: procedural orchestra render (strings, horns, trumpets,
// field snare, timpani, bass drum, pizzicato, tam-tam) into a stereo WAV.
// Usage: node tools/music/compose.mjs <out.wav>   (then ffmpeg -> mp3)
// Key D minor (Phrygian Eb, tritone G#), 72 bpm, 90 bars = 5:00.
import fs from 'fs';

const SR = 44100, BPM = 72, BEAT = 60 / BPM, LEAD = 0.25;
const BARS = 90, TAIL = 7;
const N = Math.ceil((LEAD + BARS * 4 * BEAT + TAIL) * SR);
const dryL = new Float32Array(N), dryR = new Float32Array(N);
const revL = new Float32Array(N), revR = new Float32Array(N);

// ---------- utilities ----------
let seed = 1944;
function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const rr = (a, b) => a + (b - a) * rnd();
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const NAMES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function n(s) { const m = s.match(/^([A-G])(#|b)?(-?\d)$/); return 12 * (+m[3] + 1) + NAMES[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); }
const T = (bar, beat = 0) => LEAD + (bar * 4 + beat) * BEAT;
const B = BEAT;

function blep(t, dt) { if (t < dt) { t /= dt; return t + t - t * t - 1; } if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; } return 0; }

class SVF {
  constructor() { this.ic1 = 0; this.ic2 = 0; this.lp = 0; this.bp = 0; this.hp = 0; }
  set(fc, q = 0.707) { const g = Math.tan(Math.PI * Math.min(Math.max(fc, 20), SR * 0.45) / SR); this.k = 1 / q; this.a1 = 1 / (1 + g * (g + this.k)); this.a2 = g * this.a1; this.a3 = g * this.a2; }
  p(v0) { const v3 = v0 - this.ic2, v1 = this.a1 * this.ic1 + this.a2 * v3, v2 = this.ic2 + this.a2 * this.ic1 + this.a3 * v3; this.ic1 = 2 * v1 - this.ic1; this.ic2 = 2 * v2 - this.ic2; this.lp = v2; this.bp = v1; this.hp = v0 - this.k * v1 - v2; return v2; }
}

// Section dynamics (bar -> level): quiet intro, breakdown dip, modest peak, fading outro.
const DYN = [[0, 0.6], [8, 0.66], [24, 0.72], [40, 0.62], [52, 0.44], [68, 0.46], [76, 0.6], [80, 0.55], [90, 0.45]];
function dyn(t) { const b = (t - LEAD) / (4 * BEAT); for (let i = 1; i < DYN.length; i++) if (b < DYN[i][0]) { const [b0, v0] = DYN[i - 1], [b1, v1] = DYN[i]; return v0 + (v1 - v0) * (b - b0) / (b1 - b0); } return DYN[DYN.length - 1][1]; }
function mix(sig, t, pan = 0, gain = 1, send = 0.3) {
  gain *= dyn(t);
  const s0 = Math.round(t * SR); const a = (pan + 1) * Math.PI / 4; const gl = Math.cos(a) * gain, gr = Math.sin(a) * gain;
  for (let i = 0; i < sig.length; i++) { const j = s0 + i; if (j < 0 || j >= N) continue; const v = sig[i]; dryL[j] += v * gl; dryR[j] += v * gr; revL[j] += v * gl * send; revR[j] += v * gr * send; }
}

// ---------- instruments ----------
const KILL = new Set((process.env.KILL || '').split(',')); // debug: mute instruments by name
// Bowed string section: detuned band-limited saws, slow bow attack, vibrato, 4-pole low-pass.
function strings(t, dur, m, vel, o = {}) {
  if (KILL.has('strings')) return new Float32Array(1);
  const f = mtof(m), att = o.att ?? 0.6, rel = o.rel ?? 1.2, nv = o.voices ?? 5, len = Math.floor((dur + rel) * SR);
  const out = new Float32Array(len), f1 = new SVF(), f2 = new SVF(), nz = new SVF(); nz.set(2600, 1.2);
  const vs = []; for (let v = 0; v < nv; v++) vs.push({ ph: rnd(), det: Math.pow(2, rr(-9, 9) / 1200), vr: rr(4.6, 5.6), vp: rr(0, 6.28) });
  const cutBase = 1.0 * (o.cut ?? Math.min(5000, f * 5)), sw0 = o.swell0 ?? 1, sw1 = o.swell1 ?? 1;
  const trR = o.trem ?? 0, trP = rr(0, 6.28);
  for (let i = 0; i < len; i++) {
    const s = i / SR;
    let env = s < att ? Math.pow(s / att, 1.6) : 1;
    if (s > dur) env *= Math.exp(-(s - dur) / (rel / 4));
    env *= sw0 + (sw1 - sw0) * Math.min(1, s / dur);
    if ((i & 63) === 0) { const c = cutBase * (0.45 + 0.55 * Math.min(1, env)); f1.set(c, 0.6); f2.set(c * 1.3, 0.6); }
    const vd = 0.0032 * Math.min(1, s / 0.9);
    let x = 0;
    for (const v of vs) { const fr = f * v.det * (1 + vd * Math.sin(6.283 * v.vr * s + v.vp)); const dt = fr / SR; v.ph += dt; if (v.ph >= 1) v.ph -= 1; x += 2 * v.ph - 1 - blep(v.ph, dt); }
    x = x / nv + nz.p(rnd() * 2 - 1) * 0.04 * (o.noise ?? 1);
    let a = env * vel;
    if (trR) a *= 0.55 + 0.45 * Math.abs(Math.sin(Math.PI * trR * s + trP + 0.3 * Math.sin(s * 3.1)));
    out[i] = f2.p(f1.p(x)) * a;
  }
  return out;
}
// Short bowed note (spiccato), used for the driving ostinato.
const spicc = (t, m, vel) => strings(t, 0.13, m, vel, { att: 0.02, rel: 0.25, voices: 4, cut: Math.min(3500, mtof(m) * 6) });

// Pizzicato: Karplus-Strong pluck, darkened.
function pizz(m, vel, dec = 0.993) {
  if (KILL.has('pizz')) return new Float32Array(1);
  const f = mtof(m), L = Math.max(2, Math.round(SR / f)), buf = new Float32Array(L), len = Math.floor(1.6 * SR), out = new Float32Array(len), lp = new SVF();
  let prev = 0; for (let i = 0; i < L; i++) { prev = prev * 0.6 + (rnd() * 2 - 1) * 0.4; buf[i] = prev; }
  lp.set(Math.min(2500, f * 8), 0.7); let idx = 0;
  for (let i = 0; i < len; i++) { const y = buf[idx], nx = buf[(idx + 1) % L]; buf[idx] = (y + nx) * 0.5 * dec; idx = (idx + 1) % L; out[i] = lp.p(y) * vel * 1.0 * Math.min(1, i / 40); }
  return out;
}

// Brass: horn (dark), trombone, trumpet (open or cup-muted).
function brass(t, dur, m, vel, o = {}) {
  if (KILL.has('brass')) return new Float32Array(1);
  const f = mtof(m), att = o.att ?? 0.09, rel = o.rel ?? 0.35, nv = o.voices ?? 3, len = Math.floor((dur + rel) * SR);
  const out = new Float32Array(len), f1 = new SVF(), f2 = new SVF(), bp = new SVF(), hp = new SVF();
  const vs = []; for (let v = 0; v < nv; v++) vs.push({ ph: rnd(), det: Math.pow(2, rr(-6, 6) / 1200), dl: rr(0, 0.02) });
  const bright = o.bright ?? 4, cap = o.cap ?? 3500, mute = o.mute ?? false, vib = o.vib ?? 0.0035;
  bp.set(1500, 2.2); hp.set(450, 0.7);
  for (let i = 0; i < len; i++) {
    const s = i / SR;
    let env = s < att ? Math.pow(s / att, 1.3) : 1;
    if (s > dur) env *= Math.exp(-(s - dur) / (rel / 4));
    env *= (o.swell0 ?? 1) + ((o.swell1 ?? 1) - (o.swell0 ?? 1)) * Math.min(1, s / dur);
    if ((i & 31) === 0) { const blat = 1 + 0.35 * Math.exp(-s / 0.12); const c = Math.min(cap, f * (1 + bright * vel * Math.min(1, env) * blat)); f1.set(c, 0.8); f2.set(c, 0.7); }
    const scoop = Math.pow(2, (-0.35 * Math.exp(-s / 0.035)) / 12), vd = vib * Math.max(0, Math.min(1, (s - 0.35) / 0.6));
    let x = 0;
    for (const v of vs) { if (s < v.dl) continue; const fr = f * v.det * scoop * (1 + vd * Math.sin(6.283 * 5.2 * s)); const dt = fr / SR; v.ph += dt; if (v.ph >= 1) v.ph -= 1; x += 2 * v.ph - 1 - blep(v.ph, dt); }
    x = f2.p(f1.p(x / nv));
    if (mute) { bp.p(x); x = hp.p(bp.bp * 2.2 + x * 0.25); }
    out[i] = Math.tanh(x * 1.6) * env * vel;
  }
  return out;
}
const horn = (t, d, m, v, o = {}) => mix(brass(t, d, m, v, { bright: 2.2, cap: 1800, voices: 3, att: 0.12, ...o }), t, o.pan ?? -0.25, o.g ?? 1.7, o.send ?? 0.45);
const bone = (t, d, m, v, o = {}) => mix(brass(t, d, m, v, { bright: 2.8, cap: 2200, voices: 3, att: 0.08, ...o }), t, o.pan ?? 0.3, o.g ?? 1.4, o.send ?? 0.4);
const tpt = (t, d, m, v, o = {}) => mix(brass(t, d, m, v, { bright: 5, cap: o.mute ? 5000 : 4200, voices: o.voices ?? 1, att: 0.05, vib: 0.005, ...o }), t, o.pan ?? 0.15, o.g ?? 1.1, o.send ?? 0.5);

// Field snare: low-tuned shell tone + wire noise.
function snareSig(vel, o = {}) {
  if (KILL.has('snareSig')) return new Float32Array(1);
  const len = Math.floor(0.45 * SR), out = new Float32Array(len), hp = new SVF(), lp = new SVF();
  hp.set(850, 0.8); lp.set((o.far ? 2600 : 3200) + 4500 * vel * (o.far ? 0.3 : 1), 0.7);
  const dec = 0.10 + 0.07 * vel, f0 = rr(178, 188);
  for (let i = 0; i < len; i++) {
    const s = i / SR;
    const tone = Math.sin(6.283 * f0 * s * (1 + 0.15 * Math.exp(-s / 0.01))) * Math.exp(-s / 0.045) * 0.55 + Math.sin(6.283 * 331 * s) * Math.exp(-s / 0.025) * 0.25;
    const nz = lp.p(hp.p(rnd() * 2 - 1)) * Math.exp(-s / dec) * (s < 0.002 ? s / 0.002 : 1);
    out[i] = (tone * 0.6 + nz * 1.25) * vel;
  }
  return out;
}
const snare = (t, v, o = {}) => mix(snareSig(v, o), t + rr(-0.004, 0.004), o.pan ?? -0.2, o.g ?? 0.5, o.send ?? (o.far ? 0.8 : 0.35));
function rim(t, v, o = {}) {
  if (KILL.has('rim')) return new Float32Array(1);
  const len = Math.floor(0.08 * SR), out = new Float32Array(len), hp = new SVF(); hp.set(1800, 1);
  for (let i = 0; i < len; i++) { const s = i / SR; out[i] = (Math.sin(6.283 * 520 * s) * Math.exp(-s / 0.012) * 0.6 + hp.p(rnd() * 2 - 1) * Math.exp(-s / 0.006)) * v; }
  mix(out, t + rr(-0.003, 0.003), o.pan ?? -0.3, o.g ?? 0.35, o.send ?? 0.5);
}
function roll(t0, dur, v0, v1, o = {}) {
  const rate = 15; let k = 0;
  for (let t = 0; t < dur; t += 1 / rate + rr(-0.004, 0.004), k++) { const p = t / dur, v = (v0 + (v1 - v0) * p * p) * (k % 2 ? 0.8 : 1) * rr(0.85, 1.05); snare(t0 + t, v, { ...o, g: (o.g ?? 0.5) * 0.75 }); }
  if (o.end) snare(t0 + dur, o.end, o);
}

// Concert bass drum.
function bdrum(t, v, o = {}) {
  if (KILL.has('bdrum')) return new Float32Array(1);
  const len = Math.floor(1.8 * SR), out = new Float32Array(len), lp = new SVF(); lp.set(180, 0.7); let ph = 0;
  for (let i = 0; i < len; i++) { const s = i / SR, fr = 54 * (1 + 0.5 * Math.exp(-s / 0.03)); ph += fr / SR; out[i] = (Math.sin(6.283 * ph) * Math.exp(-s / 0.55) + lp.p(rnd() * 2 - 1) * Math.exp(-s / 0.05) * 0.6) * v; }
  mix(out, t, o.pan ?? 0.05, o.g ?? 0.17, o.send ?? 0.3);
}
// Timpani: inharmonic membrane partials.
function timp(t, m, v, o = {}) {
  if (KILL.has('timp')) return new Float32Array(1);
  const f = mtof(m), len = Math.floor((o.len ?? 3.2) * SR), out = new Float32Array(len), lp = new SVF(); lp.set(500, 0.7);
  const P = [[1, 1, 2.4], [1.504, 0.45, 1.5], [1.742, 0.22, 1.0], [1.995, 0.28, 1.1], [2.245, 0.12, 0.7]]; const ph = P.map(() => 0);
  for (let i = 0; i < len; i++) { const s = i / SR, bend = 1 + 0.012 * Math.exp(-s / 0.05); let x = 0; for (let k = 0; k < P.length; k++) { ph[k] += f * P[k][0] * bend / SR; x += Math.sin(6.283 * ph[k]) * P[k][1] * Math.exp(-s / P[k][2]); } out[i] = (x + lp.p(rnd() * 2 - 1) * Math.exp(-s / 0.02) * 0.8) * v * Math.min(1, i / 30); }
  mix(out, t, o.pan ?? 0.35, o.g ?? 0.2, o.send ?? 0.35);
}
function timpRoll(t0, dur, m, v0, v1) { for (let t = 0; t < dur; t += 0.075 + rr(-0.006, 0.006)) timp(t0 + t, m, (v0 + (v1 - v0) * t / dur) * rr(0.7, 1) * 0.45, { len: 1.2 }); timp(t0 + dur, m, v1); }
// Tam-tam: long inharmonic shimmer.
function tamtam(t, v) {
  if (KILL.has('tamtam')) return new Float32Array(1);
  const len = Math.floor(9 * SR), out = new Float32Array(len), bp = new SVF(), bp2 = new SVF(); bp.set(380, 3); bp2.set(1100, 4);
  const fs = [61, 87.3, 113, 151, 197, 263, 331]; const ph = fs.map(() => rnd());
  for (let i = 0; i < len; i++) { const s = i / SR; let x = 0; for (let k = 0; k < fs.length; k++) { ph[k] += fs[k] * (1 + 0.002 * Math.sin(s * (0.7 + k))) / SR; x += Math.sin(6.283 * ph[k]) / (k + 1.5); } const nz = rnd() * 2 - 1; bp.p(nz); bp2.p(nz); const sw = Math.min(1, s / 0.6); x = x * 0.2 + (bp.bp * 1.5 + bp2.bp * 0.8) * sw; out[i] = x * Math.exp(-s / 2.8) * v * Math.min(1, i / 200); }
  mix(out, t, -0.1, 0.8, 0.6);
}
// Suspended cymbal swell (soft mallets).
function cymSwell(t, dur, v) {
  if (KILL.has('cymSwell')) return new Float32Array(1);
  const len = Math.floor((dur + 2.5) * SR), out = new Float32Array(len), hp = new SVF(), lp = new SVF(); hp.set(3000, 0.7); lp.set(9000, 0.7);
  for (let i = 0; i < len; i++) { const s = i / SR; const e = s < dur ? Math.pow(s / dur, 2.5) : Math.exp(-(s - dur) / 0.7); out[i] = lp.p(hp.p(rnd() * 2 - 1)) * e * v; }
  mix(out, t, 0.4, 0.5, 0.6);
}
// Sub drone.
function sub(t, dur, m, v) {
  if (KILL.has('sub')) return new Float32Array(1);
  const f = mtof(m), len = Math.floor((dur + 2) * SR), out = new Float32Array(len);
  for (let i = 0; i < len; i++) { const s = i / SR; const e = Math.min(1, s / 3) * (s > dur ? Math.exp(-(s - dur) / 0.6) : 1); out[i] = (Math.sin(6.283 * f * s) * 0.15 + 0.12 * Math.sin(6.283 * 2 * f * s)) * e * v; }
  mix(out, t, 0, 1, 0.1);
}

const str = (t, d, m, v, o = {}) => mix(strings(t, d, m, v, o), t, o.pan ?? 0, o.g ?? 1.3, o.send ?? 0.4);
const chordStr = (t, d, ms, v, o = {}) => ms.forEach((m, i) => str(t, d, m, v, { ...o, pan: (o.pan ?? 0) + (i / Math.max(1, ms.length - 1) - 0.5) * 0.8 }));

// ---------- musical material ----------
const DM = ['D3', 'F3', 'A3'], GM = ['D3', 'G3', 'Bb3'], EB = ['Eb3', 'G3', 'Bb3'], BB = ['D3', 'F3', 'Bb3'], A7 = ['C#3', 'E3', 'G3'], GD = ['D3', 'F3', 'G#3'];
const nn = a => a.map(n);
// Main theme: [note, beats] per bar, 8 bars; null = rest.
const THEME = [
  [['D4', 1.5], ['D4', 0.5], ['A4', 2]],
  [['Bb4', 1], ['A4', 0.75], ['G4', 0.25], ['A4', 2]],
  [['F4', 1.5], ['E4', 0.5], ['D4', 1], ['Eb4', 1]],
  [['D4', 4]],
  [['D4', 1.5], ['F4', 0.5], ['A4', 1.5], ['Bb4', 0.5]],
  [['C5', 1], ['Bb4', 0.75], ['A4', 0.25], ['G#4', 2]],
  [['A4', 1.5], ['G4', 0.5], ['F4', 1], ['E4', 1]],
  [['D4', 4]],
];
// Harmony under each theme bar: [bass note, chord]
const THEME_H = [['D2', DM], ['G1', GM], ['A1', A7], ['D2', DM], ['D2', DM], ['E2', GD], ['A1', A7], ['D2', DM]];
const ROOT_OST = ['D2', 'G1', 'A1', 'D2', 'D2', 'E2', 'A1', 'D2'];
const BUGLE = [['A4', 0.5], ['A4', 0.25], ['A4', 0.25], ['D5', 1.5], [null, 0.5], ['C5', 0.5], ['Bb4', 0.5], ['A4', 2.5]];
const HARM_SET = new Set([2, 4, 5, 7, 9, 10, 0, 1].map(x => x % 12));

function playLine(bar, line, fn, transpose = 0) {
  let beat = 0;
  for (const [nm, d] of line) { if (nm) fn(T(bar, beat), d * B, n(nm) + transpose); beat += d; }
}
function playTheme(bar0, fn, transpose = 0) { THEME.forEach((ln, i) => playLine(bar0 + i, ln, (t, d, m) => fn(t, d, m, i), transpose)); }
const third = m => { for (const k of [3, 4]) if (HARM_SET.has(((m - k) % 12 + 12) % 12)) return m - k; return m - 5; };

// Field-drum march pattern (16th slots per bar); 0 = silent.
const MARCH = [1, 0, 0.35, 0.4, 0.75, 0, 0.35, 0, 0.9, 0.3, 0.35, 0.45, 0.7, 0, 0.3, 0.3];
const MARCH_B = [1, 0, 0.35, 0, 0.7, 0.3, 0.35, 0.4, 0.85, 0, 0.35, 0, 0, 0, 0, 0]; // last beat becomes a roll
function marchBar(bar, v, o = {}) {
  const pat = o.fill ? MARCH_B : MARCH;
  pat.forEach((a, k) => { if (!a) return; const t = T(bar, k / 4); if (k % 8 === 0 && a > 0.8) snare(t - 0.028, v * 0.35, o); snare(t, v * a * rr(0.9, 1.05), o); });
  if (o.fill) roll(T(bar, 3), B * 0.95, v * 0.3, v * 0.75, o);
}
const OST = [0, 0, 12, 0, 1, 0, -2, 0]; // pizz ostinato offsets in 8ths: D D d D Eb D C D

// ---------- score ----------
// A: intro, bars 0-7 — drone, distant drum, first horn call.
tamtam(T(0), 0.35);
sub(T(0), 32 * B, n('D1'), 0.10);
str(T(0), 32 * B, n('D2'), 0.28, { att: 5, cut: 450, voices: 6, pan: -0.1 });
str(T(0), 32 * B, n('D3'), 0.25, { att: 7, cut: 700, voices: 5, pan: 0.2 });
str(T(2), 8 * B, n('A3'), 0.22, { att: 3, cut: 1100, pan: 0.3 });
str(T(4), 8 * B, n('Bb3'), 0.24, { att: 2.5, cut: 1100, pan: 0.3 });
str(T(6), 8 * B, n('A3'), 0.22, { att: 2, cut: 1100, pan: 0.3 });
str(T(4), 16 * B, n('C#4'), 0.10, { att: 4, cut: 1600, trem: 7, pan: -0.45 });
[0, 2, 4].forEach(b => timp(T(b), n('D2'), 0.45));
timp(T(5, 2), n('G#1'), 0.3);
timpRoll(T(6), 8 * B - 0.1, n('D2'), 0.12, 0.55);
roll(T(4), 16 * B - 0.05, 0.05, 0.38, { far: true, g: 0.5, end: 0.6 });
playLine(5, THEME[0], (t, d, m) => horn(t, d, m, 0.35, { mute: true, send: 0.8, g: 0.8 }));

// B: bars 8-23 — pizzicato ostinato, field drum, sustained chords.
const B_CH = [[DM, 'D2'], [DM, 'D2'], [GM, 'D2'], [EB, 'D2'], [DM, 'D2'], [BB, 'Bb1'], [GM, 'G1'], [A7, 'A1']];
for (let bar = 8; bar < 24; bar++) {
  const k = bar - 8, ch = B_CH[Math.floor(k / 2) % 8];
  const root = n(ch[1]) + (n(ch[1]) < n('C2') ? 12 : 0);
  OST.forEach((o, i) => { const m = (k % 4 === 3 && i >= 6) ? [n('A1'), n('C#2')][i - 6] : root + o; mix(pizz(m, i % 2 ? 0.45 : 0.6), T(bar, i / 2) + rr(-0.005, 0.005), -0.35, 0.55, 0.3); });
  if (k % 2 === 0) { chordStr(T(bar), 8 * B, nn(ch[0]), 0.22, { att: 1.2, cut: 1300, rel: 1.5 }); str(T(bar), 8 * B, n(ch[1]), 0.18, { att: 1, cut: 600, pan: -0.1 }); }
  if (bar >= 12) marchBar(bar, 0.32 + 0.1 * Math.min(1, (bar - 12) / 8), { fill: k % 4 === 3, pan: -0.25 });
  else if (bar >= 10) [1, 3].forEach(b => rim(T(bar, b), 0.4));
  bdrum(T(bar), 0.35);
  if (bar >= 16 && k % 2 === 0) chordStr(T(bar), 8 * B, nn(ch[0]).map(m => m + 12), 0.12, { att: 2, cut: 1600, pan: -0.3, g: 0.6 });
}
str(T(20), 16 * B, n('D5'), 0.07, { att: 4, cut: 3000, trem: 8, pan: 0.5 });
roll(T(23), 4 * B, 0.1, 0.45, { pan: -0.25 });

// C: bars 24-39 — theme in horns (two passes), muted trumpet answers on the second.
for (let pass = 0; pass < 2; pass++) {
  const b0 = 24 + pass * 8;
  playTheme(b0, (t, d, m) => { horn(t, d, m, 0.5 + 0.08 * pass, { g: 0.85 }); if (pass) bone(t, d, m - 12, 0.32, { g: 0.6 }); });
  THEME_H.forEach(([bass, ch], i) => {
    const bar = b0 + i;
    chordStr(T(bar), 4 * B, nn(ch), 0.2, { att: 0.5, cut: 1300, rel: 1 });
    str(T(bar), 4 * B, n(bass), 0.18, { att: 0.4, cut: 600, pan: -0.15 });
    const root = n(ROOT_OST[i]) + (n(ROOT_OST[i]) < n('C2') ? 12 : 0);
    OST.forEach((o, j) => mix(pizz(root + (o === 1 && ROOT_OST[i] !== 'D2' ? 0 : o), j % 2 ? 0.4 : 0.55), T(bar, j / 2), -0.35, 0.5, 0.3));
    marchBar(bar, 0.42, { fill: i === 3 || i === 7, pan: -0.25 });
    bdrum(T(bar), 0.4);
    if (i === 0 || i === 4) timp(T(bar), n('D2'), 0.4);
  });
  if (pass) { playLine(b0 + 3, BUGLE.slice(0, 4), (t, d, m) => tpt(t + 0.5 * B, d, m, 0.4, { mute: true, pan: 0.45, send: 0.7 })); playLine(b0 + 7, BUGLE.slice(4), (t, d, m) => tpt(t, d, m, 0.38, { mute: true, pan: 0.45, send: 0.7 })); }
  if (pass) str(T(b0), 32 * B, n('A4'), 0.08, { att: 6, cut: 2400, trem: 7, pan: 0.5, swell0: 0.5, swell1: 1.2 });
}

// D: bars 40-51 — breakdown: tremolo clusters, distant bugle, rim clicks; snare roll rises into E.
tamtam(T(40), 0.4);
timp(T(40), n('D2'), 0.6);
sub(T(40), 48 * B, n('D1'), 0.09);
str(T(40), 48 * B, n('D2'), 0.22, { att: 3, cut: 380, voices: 6 });
for (let i = 0; i < 6; i++) {
  const bar = 40 + i * 2, hi = i % 2 ? 'Eb5' : 'D5';
  str(T(bar), 8 * B, n(hi), 0.07, { att: 1.5, cut: 4500, trem: 9, pan: 0.5, noise: 2.5 });
  str(T(bar), 8 * B, n(i % 2 ? 'G#3' : 'A3'), 0.13, { att: 1.5, cut: 900, trem: 6, pan: -0.4 });
  timp(T(bar, 2), n(i % 2 ? 'G#1' : 'D2'), 0.28);
  horn(T(bar), 7.5 * B, n(i % 3 === 2 ? 'Eb3' : 'D3'), 0.25, { mute: true, att: 1.2, g: 0.7, send: 0.6 });
}
for (let bar = 40; bar < 48; bar++) { rim(T(bar, 1), 0.3); if (bar % 2) rim(T(bar, 3.5), 0.2); rim(T(bar, 3), 0.25); }
playLine(44, BUGLE, (t, d, m) => tpt(t, d, m, 0.42, { mute: false, pan: 0.6, send: 1.0, g: 0.38, cap: 2600 }));
playLine(46, BUGLE.slice(4), (t, d, m) => tpt(t + 2 * B, d, m - 12, 0.3, { mute: true, pan: -0.5, send: 0.9, g: 0.4 }));
roll(T(48), 16 * B - 0.05, 0.04, 0.45, { pan: -0.25, end: 0.7 });
cymSwell(T(50), 8 * B, 0.12);
timpRoll(T(50), 8 * B - 0.1, n('A1'), 0.1, 0.6);

// E: bars 52-75 — the march builds: spiccato ostinato, low brass, theme, then trumpets.
for (let bar = 52; bar < 76; bar++) {
  const k = bar - 52, sec = k < 8 ? 0 : k < 16 ? 1 : 2, i = k % 8;
  const lvl = 0.5 + 0.25 * (k / 24);
  const [bass, ch] = sec === 0 ? [B_CH[Math.floor(i / 2) * 2 % 8][1], B_CH[Math.floor(i / 2) * 2 % 8][0]] : THEME_H[i];
  const root = n(sec === 0 ? bass : ROOT_OST[i]) + (n(sec === 0 ? bass : ROOT_OST[i]) < n('C2') ? 12 : 0);
  OST.forEach((o, j) => { const m = root + 12 + (o === 12 ? 12 : o); mix(spicc(T(bar, j / 2), m, (j % 2 ? 0.28 : 0.38) * lvl * 1.5), T(bar, j / 2) + rr(-0.004, 0.004), -0.4, 0.55, 0.3); mix(pizz(root + (o === 12 ? 0 : o), 0.45 * lvl), T(bar, j / 2), -0.2, 0.45, 0.25); });
  marchBar(bar, 0.5 + 0.18 * (k / 24), { fill: i === 3 || i === 7, pan: -0.25 });
  bdrum(T(bar), 0.45 + 0.1 * sec); if (sec === 2) bdrum(T(bar, 2), 0.3);
  timp(T(bar), root - 12 < n('F1') ? root : root - 12, 0.35 + 0.1 * sec);
  str(T(bar), 4 * B, n(bass), 0.2, { att: 0.3, cut: 600, pan: -0.15 });
  if (sec === 0 && i % 2 === 0) nn(ch).forEach((m, j) => bone(T(bar), 8 * B, m - (j === 0 ? 12 : 0), 0.22 + 0.04 * i / 8, { att: 0.8, swell0: 0.6, swell1: 1, pan: -0.2 + j * 0.25 }));
  if (sec >= 1) chordStr(T(bar), 4 * B, nn(ch), 0.22 + 0.04 * sec, { att: 0.35, cut: 1500, rel: 0.9 });
  if (sec === 2) chordStr(T(bar), 4 * B, nn(ch).map(m => m + 12), 0.13, { att: 0.4, cut: 2400, rel: 0.9, pan: 0.25 });
}
playTheme(60, (t, d, m) => { horn(t, d, m, 0.6, { g: 0.9 }); bone(t, d, m - 12, 0.42, { g: 0.7 }); });
playLine(63, BUGLE.slice(0, 4), (t, d, m) => tpt(t + 0.5 * B, d, m, 0.42, { mute: true, pan: 0.45, send: 0.6 }));
playLine(67, BUGLE.slice(4), (t, d, m) => tpt(t, d, m, 0.42, { mute: true, pan: 0.45, send: 0.6 }));
cymSwell(T(66), 8 * B, 0.16);
timpRoll(T(67), 4 * B - 0.1, n('D2'), 0.15, 0.6);
playTheme(68, (t, d, m) => { tpt(t, d, m, 0.5, { voices: 2, g: 0.55, pan: 0.2, send: 0.45 }); horn(t, d, third(m), 0.5, { g: 0.75 }); bone(t, d, m - 12, 0.45, { g: 0.7 }); });
str(T(68), 32 * B, n('D5'), 0.09, { att: 3, cut: 3200, pan: 0.45, swell0: 0.6, swell1: 1.3 });
timpRoll(T(71), 4 * B - 0.1, n('D2'), 0.2, 0.65);
cymSwell(T(73), 12 * B, 0.18);
timpRoll(T(75), 4 * B - 0.1, n('A1'), 0.25, 0.75);

// F: bars 76-89 — the column passes: final chord, fading drum, lone muted trumpet, tritone ending.
tamtam(T(76), 0.5); timp(T(76), n('D2'), 0.8); bdrum(T(76), 0.6); snare(T(76), 0.6, { pan: -0.25 });
chordStr(T(76), 16 * B, nn(DM).concat(nn(DM).map(m => m + 12)), 0.22, { att: 0.15, cut: 1500, rel: 4, swell0: 1, swell1: 0.25 });
nn(DM).forEach((m, j) => bone(T(76), 6 * B, m - (j === 0 ? 12 : 0), 0.4, { rel: 2.5, swell0: 1, swell1: 0.3, pan: -0.2 + j * 0.25 }));
sub(T(76), 56 * B, n('D1'), 0.09);
str(T(78), 46 * B, n('D2'), 0.22, { att: 4, cut: 380, voices: 6, rel: 4 });
for (let bar = 80; bar < 88; bar++) {
  const fade = 1 - (bar - 80) / 8;
  marchBar(bar, 0.3 * fade + 0.04, { far: true, pan: -0.4, fill: bar === 83 });
  [0, 2].forEach(b => mix(pizz(n('D2'), 0.4 * fade + 0.1), T(bar, b), -0.35, 0.5, 0.35));
  mix(pizz(n('Eb2'), 0.3 * fade + 0.08), T(bar, 3), -0.35, 0.5, 0.35);
}
playLine(80, THEME[0], (t, d, m) => tpt(t, d, m, 0.36, { mute: true, pan: 0.5, send: 0.9 }));
playLine(81, THEME[1], (t, d, m) => tpt(t, d, m, 0.34, { mute: true, pan: 0.5, send: 0.9 }));
playLine(82, THEME[2], (t, d, m) => tpt(t, d, m, 0.32, { mute: true, pan: 0.5, send: 0.9 }));
playLine(83, THEME[3], (t, d, m) => tpt(t, d, m, 0.3, { mute: true, pan: 0.5, send: 0.9, swell0: 1, swell1: 0.3 }));
str(T(80), 8 * B, n('Bb3'), 0.16, { att: 2, cut: 1000, pan: 0.3 });
str(T(82), 8 * B, n('A3'), 0.16, { att: 2, cut: 1000, pan: 0.3 });
str(T(84), 12 * B, n('D5'), 0.05, { att: 3, cut: 3000, trem: 8, pan: 0.5 });
timp(T(84), n('D2'), 0.4); timp(T(86), n('G#1'), 0.32);
['D3', 'F3', 'G#3'].forEach((m, j) => horn(T(86), 14 * B, n(m), 0.28, { mute: true, att: 2, rel: 4, swell0: 1, swell1: 0.2, pan: -0.3 + j * 0.3, send: 0.7 }));
timp(T(89), n('D2'), 0.35);
rim(T(89, 2), 0.25);

// ---------- reverb (Freeverb) + master ----------
function freeverb(inL, inR, room = 0.88, damp = 0.35) {
  const C = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], A = [556, 441, 341, 225], sp = 23, pre = Math.round(0.03 * SR);
  const outL = new Float32Array(N), outR = new Float32Array(N);
  for (const [inp, out, off] of [[inL, outL, 0], [inR, outR, sp]]) {
    const cb = C.map(c => ({ b: new Float32Array(c + off), i: 0, s: 0 })), ab = A.map(a => ({ b: new Float32Array(a + off), i: 0 }));
    for (let j = 0; j < N; j++) {
      const x = (j >= pre ? inp[j - pre] : 0) * 0.015; let y = 0;
      for (const c of cb) { const o = c.b[c.i]; c.s = o * (1 - damp) + c.s * damp; c.b[c.i] = x + c.s * room; if (++c.i >= c.b.length) c.i = 0; y += o; }
      for (const a of ab) { const o = a.b[a.i]; a.b[a.i] = y + o * 0.5; if (++a.i >= a.b.length) a.i = 0; y = o - y; }
      out[j] = y;
    }
  }
  return [outL, outR];
}
const [wl, wr] = freeverb(revL, revR);
const lpL = new SVF(), lpR = new SVF(), hpL = new SVF(), hpR = new SVF(); lpL.set(13000); lpR.set(13000); hpL.set(38); hpR.set(38);
// Tilt EQ: shelf down below ~160 Hz, gentle lift around 2 kHz.
const shL = new SVF(), shR = new SVF(), prL = new SVF(), prR = new SVF(); shL.set(160); shR.set(160); prL.set(2000, 0.6); prR.set(2000, 0.6); const hsL = new SVF(), hsR = new SVF(); hsL.set(4500); hsR.set(4500);
const tilt = (x, sh, pr, hs) => { sh.p(x); pr.p(x); hs.p(x); return x - 0.5 * sh.lp + 0.25 * pr.bp; };
const L = new Float32Array(N), R = new Float32Array(N); let peak = 0;
for (let j = 0; j < N; j++) {
  const l = dryL[j] + wl[j] * 3.2 + wr[j] * 0.6, r = dryR[j] + wr[j] * 3.2 + wl[j] * 0.6;
  lpL.p(tilt(l, shL, prL, hsL)); lpR.p(tilt(r, shR, prR, hsR)); hpL.p(lpL.lp); hpR.p(lpR.lp); L[j] = Math.tanh(hpL.hp * 0.9); R[j] = Math.tanh(hpR.hp * 0.9);
  peak = Math.max(peak, Math.abs(L[j]), Math.abs(R[j]));
}
const g = process.env.FIXG ? +process.env.FIXG : 0.89 / peak; // -1 dBFS peak
const wav = Buffer.alloc(44 + N * 4);
wav.write('RIFF', 0); wav.writeUInt32LE(36 + N * 4, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22);
wav.writeUInt32LE(SR, 24); wav.writeUInt32LE(SR * 4, 28); wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(N * 4, 40);
for (let j = 0; j < N; j++) { wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[j] * g)) * 32767), 44 + j * 4); wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[j] * g)) * 32767), 46 + j * 4); }
fs.writeFileSync(process.argv[2] || 'theme.wav', wav);
console.log('rendered', (N / SR).toFixed(1), 's, raw peak', peak.toFixed(3));
