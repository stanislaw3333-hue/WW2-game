// Web Audio: sampled weapon/shout/siren clips (decoded from src/audio/clips.js) with procedural fallbacks,
// the procedural sound effects (noise and tone bursts) and the ambient drone.
import * as THREE from 'three';
import { clamp } from '../core/util.js';
import { LEVEL } from '../levels/index.js';
import { RADIO_RANGE, CHATTER_RADIUS, DEATH_GAIN, K98_RELOAD_SPLIT_T, K98_RELOAD_COCK_T, ENEMY_HANDLING_GAIN } from '../core/config.js';
import { CLIPS } from './clips.js';

let AC = null, master, echoIn, noiseBuf, radioPanner = null;
// decoded sample buffers; null until loaded (every sound falls back to its procedural version)
const BUF = { kar98Shot: null, kar98Reload: null, kar98Rechamber: null, mp40Shot: null, mp40Reload: null, siren: null, radio: null, grenade: null, footstep: null, planeFlyby: null, bomberFlyby: null, shouts: [], convos: [], deaths: [] };
const SIREN_GAIN = 0.3;   // background air siren level under the drone
const RADIO_GAIN = 1.1;   // German radio set level at its reference distance

// call from a user gesture: creates the context on first use and resumes it if the browser suspended it
export function startAudio() {
  initAudio();
  if (AC && AC.state === 'suspended') AC.resume();
}
function initAudio() {
  if (AC) return;
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = 0.85; master.connect(AC.destination);
    noiseBuf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const delay = AC.createDelay(1); delay.delayTime.value = 0.21;
    const fb = AC.createGain(); fb.gain.value = 0.42;
    const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100;
    echoIn = AC.createGain(); echoIn.connect(delay); delay.connect(lp); lp.connect(fb); fb.connect(delay); lp.connect(master);
    // wind
    const w = AC.createBufferSource(); w.buffer = noiseBuf; w.loop = true;
    const wl = AC.createBiquadFilter(); wl.type = 'lowpass'; wl.frequency.value = 260;
    const wg = AC.createGain(); wg.gain.value = 0.16;
    const lfo = AC.createOscillator(); lfo.frequency.value = 0.13; const lg = AC.createGain(); lg.gain.value = 0.08;
    lfo.connect(lg); lg.connect(wg.gain); lfo.start();
    w.connect(wl); wl.connect(wg); wg.connect(master); w.start();
    startDrone();
    loadClips();
  } catch { AC = null; }
}
// decodes every sample clip once; each one is independent, so a failed clip only disables its own sound
function loadClips() {
  const load = url => fetch(url).then(r => r.arrayBuffer()).then(b => AC.decodeAudioData(b)).catch(() => null);
  load(CLIPS.kar98Shot).then(b => { BUF.kar98Shot = b; });
  load(CLIPS.kar98Reload).then(b => { BUF.kar98Reload = b; });
  load(CLIPS.mp40Shot).then(b => { BUF.mp40Shot = b; });
  load(CLIPS.mp40Reload).then(b => { BUF.mp40Reload = b; });
  load(CLIPS.siren).then(b => { if (!b) return; BUF.siren = b; startSiren(); });
  load(CLIPS.radio).then(b => { if (!b || !LEVEL.RADIO) return; BUF.radio = b; startRadio(); });
  load(CLIPS.grenade).then(b => { BUF.grenade = b; });
  load(CLIPS.footstep).then(b => { BUF.footstep = b; });
  load(CLIPS.kar98Rechamber).then(b => { BUF.kar98Rechamber = b; });
  load(CLIPS.planeFlyby).then(b => { BUF.planeFlyby = b; });
  load(CLIPS.bomberFlyby).then(b => { BUF.bomberFlyby = b; });
  CLIPS.shouts.forEach(u => load(u).then(b => { if (b) BUF.shouts.push(b); }));
  CLIPS.convos.forEach(u => load(u).then(b => { if (b) BUF.convos.push(b); }));
  CLIPS.deaths.forEach(u => load(u).then(b => { if (b) BUF.deaths.push(b); }));
}
// looping air siren sits under the drone as background; it is heard only outdoors (see setSirenOutdoors)
let sirenGain = null, sirenOutdoors = true;
function startSiren() {
  const s = AC.createBufferSource(); s.buffer = BUF.siren; s.loop = true;
  sirenGain = AC.createGain(); sirenGain.gain.value = sirenOutdoors ? SIREN_GAIN : 0;
  s.connect(sirenGain); sirenGain.connect(master); s.start();
}
// fades the siren out when the player goes indoors and back in outdoors; only acts on a change
export function setSirenOutdoors(outdoors) {
  if (outdoors === sirenOutdoors) return;
  sirenOutdoors = outdoors;
  if (sirenGain && AC) sirenGain.gain.setTargetAtTime(outdoors ? SIREN_GAIN : 0, AC.currentTime, 0.3);
}
// the German radio set loops at its position in the enemy yard; it is heard from wherever the listener stands
function startRadio() {
  const s = AC.createBufferSource(); s.buffer = BUF.radio; s.loop = true;
  radioPanner = AC.createPanner();
  // linear falloff: full level at 2 m, silent at RADIO_RANGE (the inverse model never reaches zero, so the radio was still audible at spawn)
  radioPanner.panningModel = 'HRTF'; radioPanner.distanceModel = 'linear';
  radioPanner.refDistance = 2; radioPanner.maxDistance = RADIO_RANGE; radioPanner.rolloffFactor = 1;
  const R = LEVEL.RADIO; radioPanner.positionX.value = R.x; radioPanner.positionY.value = R.y + 0.2; radioPanner.positionZ.value = R.z;
  const g = AC.createGain(); g.gain.value = RADIO_GAIN;
  s.connect(radioPanner); radioPanner.connect(g); g.connect(master); s.start();
}
// propeller flyover: plays the named clip (BUF key: planeFlyby or bomberFlyby) from a point that the caller moves with
// the aircraft each frame. cfg is that aircraft's config (refDist, maxDist, soundGain). The falloff is linear, so the
// sound is loudest when the plane is overhead. Returns { move(x, y, z), done() }, or null if not loaded. The clip plays
// to its end (done() turns true then); the caller keeps moving it until then.
export function playFlyby(name, cfg, x, y, z) {
  if (!AC || !BUF[name]) return null;
  const s = AC.createBufferSource(); s.buffer = BUF[name];
  let ended = false;
  s.onended = () => { ended = true; };
  const p = AC.createPanner();
  p.panningModel = 'HRTF'; p.distanceModel = 'linear';
  p.refDistance = cfg.refDist; p.maxDistance = cfg.maxDist; p.rolloffFactor = 1;
  const g = AC.createGain(); g.gain.value = cfg.soundGain;
  s.connect(p); p.connect(g); g.connect(master);
  const move = (px, py, pz) => { p.positionX.value = px; p.positionY.value = py; p.positionZ.value = pz; };
  move(x, y, z);
  s.start();
  return { move, done: () => ended };
}
// keeps the audio listener on the camera each frame so the radio pans and fades with the player's view
const fwd = new THREE.Vector3();
export function setListener(camera) {
  if (!AC) return;
  const L = AC.listener, p = camera.position;
  camera.updateMatrixWorld();
  camera.getWorldDirection(fwd);
  if (L.positionX) {
    L.positionX.value = p.x; L.positionY.value = p.y; L.positionZ.value = p.z;
    L.forwardX.value = fwd.x; L.forwardY.value = fwd.y; L.forwardZ.value = fwd.z;
    L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0;
  } else {
    L.setPosition(p.x, p.y, p.z); L.setOrientation(fwd.x, fwd.y, fwd.z, 0, 1, 0);
  }
}
// plays a decoded clip; returns false when the clip is not loaded so the caller can fall back
function playBuf(buf, gain, rate = 1) {
  if (!AC || !buf) return false;
  const s = AC.createBufferSource(), g = AC.createGain();
  s.buffer = buf; s.playbackRate.value = rate; g.gain.value = gain;
  s.connect(g); g.connect(master); s.start();
  return true;
}
// plays `len` seconds of a buffer from `from`, starting `delay` seconds from now
function playSlice(buf, gain, from, len, delay = 0) {
  if (!AC || !buf) return false;
  const s = AC.createBufferSource(), g = AC.createGain();
  s.buffer = buf; g.gain.value = gain;
  s.connect(g); g.connect(master); s.start(AC.currentTime + delay, from, len);
  return true;
}
// one spoken line from a German soldier `dist` metres away: quiet when far, louder as he comes closer.
// Returns the source node (so combat can cut it off) and the line's length in seconds, or null if no audio.
export function playConvoLine(dist) {
  if (!AC || !BUF.convos.length || dist > CHATTER_RADIUS) return null;
  const buf = BUF.convos[(Math.random() * BUF.convos.length) | 0];
  const s = AC.createBufferSource(), g = AC.createGain();
  s.buffer = buf; g.gain.value = clamp(0.8 / (1 + dist * 0.35), 0, 0.8);
  s.connect(g); g.connect(master); s.start();
  return { node: s, length: buf.duration };
}
export function stopNodes(nodes) { if (!AC) return; nodes.forEach(s => { try { s.stop(); } catch { /* already finished */ } }); }
// continuous automatic fire: the MP40 burst sample is chained back to back while the trigger is held,
// and cuts off as soon as firing stops. Returns false when the sample is not loaded (caller falls back to per-shot sound).
let fireBus = null, fireOn = false, fireNext = 0, fireNodes = [];
export function autoFireReady() { return !!(AC && BUF.mp40Shot); }
export function setAutoFire(on) {
  if (!autoFireReady()) return;
  const now = AC.currentTime;
  if (!fireBus) { fireBus = AC.createGain(); fireBus.gain.value = 0; fireBus.connect(master); }
  if (on && !fireOn) { fireOn = true; fireNext = now; fireBus.gain.cancelScheduledValues(now); fireBus.gain.setValueAtTime(1, now); }
  if (!on && fireOn) {
    fireOn = false;
    fireBus.gain.cancelScheduledValues(now); fireBus.gain.setTargetAtTime(0, now, 0.02);
    stopNodes(fireNodes); fireNodes = [];
    return;
  }
  if (!on) return;
  fireNodes = fireNodes.filter(n => n.end > now);
  if (fireNext < now) fireNext = now + 0.01;   // never schedule a burst in the past: that would leave a gap
  const fb = trimmedFire();
  while (fireNext < now + 0.25) {   // keep about a quarter second of bursts queued ahead
    const s = AC.createBufferSource(); s.buffer = fb;   // same rate for every burst, so the bursts join with no pitch step
    s.connect(fireBus); s.start(fireNext);
    s.end = fireNext + fb.duration;
    fireNodes.push(s);
    fireNext = s.end;
  }
}
// the MP40 burst with the decoder's silent padding cut from both ends (the mp3 adds a few ms of silence at each
// end, which showed as a break between chained bursts). Built once from the decoded sample.
let fireSrc = null, fireTrim = null;
function trimmedFire() {
  if (fireSrc === BUF.mp40Shot) return fireTrim;
  fireSrc = BUF.mp40Shot;
  const b = fireSrc, n = b.length, chans = [];
  for (let c = 0; c < b.numberOfChannels; c++) chans.push(b.getChannelData(c));
  const loud = i => chans.some(d => Math.abs(d[i]) > 0.002);
  const attack = i => chans.some(d => Math.abs(d[i]) > 0.2);
  // start 2 ms before the first real shot: the sample opens with ~40 ms of near-silence, which was the pause
  let a = 0, z = n - 1;
  while (a < n - 1 && !attack(a)) a++;
  a = Math.max(0, a - 88);
  while (z > a && !loud(z)) z--;
  const out = AC.createBuffer(chans.length, z - a + 1, b.sampleRate);
  chans.forEach((d, c) => out.copyToChannel(d.subarray(a, z + 1), c));
  fireTrim = out;
  return out;
}
// enemy MP40 burst heard from `dist` metres: the trimmed burst sample chained 1-3 times (about 1 s each), quieter with distance.
// Returns the burst's length in seconds (0 when the sample is not loaded, so the caller can fall back).
const distGain = dist => clamp(1.1 / (1 + dist * 0.09), 0.12, 0.8);   // level of an enemy weapon sound `dist` metres away
export function enemyBurst(dist) {
  if (!AC || !BUF.mp40Shot) return 0;
  const fb = trimmedFire(), k = 1 + ((Math.random() * 3) | 0), t0 = AC.currentTime + 0.01;
  const g = AC.createGain(); g.gain.value = distGain(dist); g.connect(master);
  for (let i = 0; i < k; i++) { const s = AC.createBufferSource(); s.buffer = fb; s.connect(g); s.start(t0 + i * fb.duration); }
  return k * fb.duration;
}
// sinister ambient drone: detuned low voices with a dissonant minor second, a slowly swelling filter,
// a distant drifting wail, a dark echo, and occasional low stings
function startDrone() {
  const t0 = AC.currentTime;
  const bus = AC.createGain(); bus.gain.setValueAtTime(0.0001, t0); bus.gain.exponentialRampToValueAtTime(0.12, t0 + 8);
  const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 4;
  bus.connect(lp); lp.connect(master);
  const swell = AC.createOscillator(); swell.frequency.value = 0.05; const swellG = AC.createGain(); swellG.gain.value = 180;
  swell.connect(swellG); swellG.connect(lp.frequency); swell.start(t0);
  // D1 + A1 + D2 with a detuned pair, plus Eb1 for the sinister minor second
  [[36.71, 'sawtooth', 0.5], [36.71 * 1.004, 'sawtooth', 0.4], [55.0, 'sawtooth', 0.28], [73.42, 'triangle', 0.22], [38.89, 'sine', 0.18]]
    .forEach(([f, type, g]) => {
      const o = AC.createOscillator(); o.type = type; o.frequency.value = f;
      const vg = AC.createGain(); vg.gain.value = g;
      const br = AC.createOscillator(); br.frequency.value = 0.03 + Math.random() * 0.05;   // slow breathing of each voice
      const bg = AC.createGain(); bg.gain.value = g * 0.4; br.connect(bg); bg.connect(vg.gain);
      o.connect(vg); vg.connect(bus); o.start(t0); br.start(t0);
    });
  // distant wail that drifts up and down
  const wail = AC.createOscillator(); wail.frequency.value = 466; const wailG = AC.createGain(); wailG.gain.value = 0.035;
  const wailLfo = AC.createOscillator(); wailLfo.frequency.value = 0.07; const wailLfoG = AC.createGain(); wailLfoG.gain.value = 9;
  wailLfo.connect(wailLfoG); wailLfoG.connect(wail.frequency); wail.connect(wailG); wailG.connect(bus); wail.start(t0); wailLfo.start(t0);
  // dark echo on the drone
  const dl = AC.createDelay(2); dl.delayTime.value = 0.62; const dfb = AC.createGain(); dfb.gain.value = 0.5;
  const dlp = AC.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 700;
  lp.connect(dl); dl.connect(dlp); dlp.connect(dfb); dfb.connect(dl); dlp.connect(master);
  // occasional low sting
  setInterval(() => {
    if (!AC || AC.state !== 'running' || Math.random() > 0.6) return;
    const notes = [36.71, 38.89, 29.14];
    const f = notes[(Math.random() * notes.length) | 0];
    sfxTone(f, f * 0.97, 4.5, 0.12, 'sine');
  }, 14000);
}
function sfxNoise(o) {
  if (!AC) return;
  const t = AC.currentTime + (o.delay || 0);
  const s = AC.createBufferSource(); s.buffer = noiseBuf; s.playbackRate.value = o.rate || 1;
  const f = AC.createBiquadFilter(); f.type = o.type || 'lowpass'; f.Q.value = o.q || 0.7;
  f.frequency.setValueAtTime(o.f0, t); if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);
  const g = AC.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.gain, t + (o.attack || 0.003)); g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
  s.connect(f); f.connect(g); g.connect(master); if (o.echo) { const e = AC.createGain(); e.gain.value = o.echo; g.connect(e); e.connect(echoIn); }
  s.start(t, Math.random()); s.stop(t + o.dur + 0.05);
}
function sfxTone(f0, f1, dur, gain, type = 'sine', delay = 0) {
  if (!AC) return;
  const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}

export const SFX = {
  shot() {
    if (playBuf(BUF.kar98Shot, 0.9, 0.98 + Math.random() * 0.04)) return;
    sfxNoise({ f0: 5200, f1: 300, dur: 0.5, gain: 1.0, echo: 0.6 }); sfxNoise({ type: 'highpass', f0: 2500, dur: 0.07, gain: 0.5 }); sfxTone(170, 38, 0.24, 0.9);
  },
  autoFire: on => setAutoFire(on),
  eburst: dist => enemyBurst(dist),
  autoFireReady: () => autoFireReady(),
  // reload sample for a weapon id ('k98' or 'mp40'); the animation keeps its own timing for the ammo refill
  reload(id) {
    if (id === 'k98' && BUF.kar98Reload) {
      // first section as the bolt is pulled back; second section when it cocks back. The split is the quiet gap in the clip (K98_RELOAD_SPLIT_T).
      const b = BUF.kar98Reload, split = Math.min(K98_RELOAD_SPLIT_T, b.duration);
      playSlice(b, 0.9, 0, split);
      playSlice(b, 0.9, split, b.duration - split, K98_RELOAD_COCK_T);
      return;
    }
    playBuf(id === 'k98' ? BUF.kar98Reload : BUF.mp40Reload, 0.9);
  },
  // German soldier killed: half the time one of the death sounds plays (picked at random)
  death() {
    if (Math.random() < 0.5 || !BUF.deaths.length) return;
    playBuf(BUF.deaths[(Math.random() * BUF.deaths.length) | 0], DEATH_GAIN);
  },
  // Kar98 clip going into the receiver: the first section of the reload sample again
  clipIn() {
    if (!BUF.kar98Reload) return;
    playSlice(BUF.kar98Reload, 0.9, 0, Math.min(K98_RELOAD_SPLIT_T, BUF.kar98Reload.duration));
  },
  // Kar98 bolt cycle after each shot: the rechamber sample covers the whole action; without it, the old four clicks play
  bolt() {
    if (playBuf(BUF.kar98Rechamber, 0.9)) return;
    SFX.click(0, 2400); SFX.click(0.18, 1700); SFX.click(0.5, 2000); SFX.click(0.68, 2900);
  },
  // German callout from a random sample clip, quieter with distance; false if no clip is loaded yet
  shout(dist) {
    if (!BUF.shouts.length) return false;
    return playBuf(BUF.shouts[(Math.random() * BUF.shouts.length) | 0], clamp(0.9 / (1 + dist * 0.12), 0.12, 0.9));
  },
  click(d = 0, f = 2600) { sfxNoise({ type: 'bandpass', f0: f, q: 3, dur: 0.05, gain: 0.45, delay: d }); sfxTone(f * 0.4, f * 0.2, 0.03, 0.12, 'square', d); },
  // one footstep on the stone: the concrete sample, sped up 50% when sprinting; the procedural step is the fallback
  step(alt, sprint = false) {
    if (playBuf(BUF.footstep, 0.6, sprint ? 1.5 : 1)) return;
    sfxNoise({ f0: alt ? 420 : 340, f1: 120, dur: 0.11, gain: 0.26 }); sfxNoise({ type: 'bandpass', f0: 1800, q: 1, dur: 0.035, gain: 0.05 });
  },
  wood() { sfxNoise({ type: 'bandpass', f0: 520, q: 2.5, dur: 0.14, gain: 0.7, echo: 0.2 }); sfxTone(240, 110, 0.1, 0.3, 'triangle'); },
  stone() { sfxNoise({ type: 'bandpass', f0: 2400, q: 2, dur: 0.09, gain: 0.35, echo: 0.2 }); if (Math.random() < 0.4) sfxTone(2600 + Math.random() * 900, 900, 0.3, 0.07, 'sine', 0.02); },
  pickup() { sfxTone(520, 520, 0.08, 0.2, 'square'); sfxTone(780, 780, 0.12, 0.2, 'square', 0.09); SFX.click(0.02, 1800); },
  rumble() { sfxNoise({ f0: 110, f1: 40, dur: 2.2, gain: 0.5, attack: 0.25 }); },
  // objective complete: a slow, low, dark sting instead of a bright fanfare
  done() {
    [[55, 0.5], [41.2, 0.4], [36.7, 0.35]].forEach(([f, g], i) => { sfxTone(f, f * 0.96, 3.2, g * 0.35, 'triangle', i * 0.22); sfxTone(f * 0.5, f * 0.48, 3.8, g * 0.6, 'sine', i * 0.22); });
    sfxNoise({ f0: 140, f1: 40, dur: 3.0, gain: 0.35, attack: 0.3 });
  },
  smg() {
    if (playBuf(BUF.mp40Shot, 0.9, 0.98 + Math.random() * 0.04)) return;
    sfxNoise({ f0: 4200, f1: 480, dur: 0.17, gain: 0.72, echo: 0.3 }); sfxNoise({ type: 'highpass', f0: 3000, dur: 0.04, gain: 0.3 }); sfxTone(210, 70, 0.09, 0.5);
  },
  // enemy gunshot: the same samples the player's weapons use (Kar98 or MP40), quieter with distance; procedural fallback if not loaded
  // enemy bolt cycle, reload and clip sounds: the player's samples, quieter with distance
  // (the handling sounds are ENEMY_HANDLING_GAIN of the distance level: half as loud as the shots)
  ebolt(dist) { playBuf(BUF.kar98Rechamber, distGain(dist) * ENEMY_HANDLING_GAIN); },
  eclipIn(dist) { if (BUF.kar98Reload) playSlice(BUF.kar98Reload, distGain(dist) * ENEMY_HANDLING_GAIN, 0, Math.min(K98_RELOAD_SPLIT_T, BUF.kar98Reload.duration)); },
  ereload(id, dist) {
    const g = distGain(dist) * ENEMY_HANDLING_GAIN;
    if (id === 'k98' && BUF.kar98Reload) {
      const b = BUF.kar98Reload, split = Math.min(K98_RELOAD_SPLIT_T, b.duration);
      playSlice(b, g, 0, split); playSlice(b, g, split, b.duration - split, K98_RELOAD_COCK_T);
      return;
    }
    playBuf(id === 'k98' ? BUF.kar98Reload : BUF.mp40Reload, g);
  },
  eshot(dist, weapon = 'k98') {
    const g = distGain(dist);
    if (playBuf(weapon === 'mp40' ? BUF.mp40Shot : BUF.kar98Shot, g, 0.98 + Math.random() * 0.04)) return;
    sfxNoise({ f0: 3600, f1: 260, dur: 0.4, gain: g, echo: 0.5 }); sfxTone(150, 40, 0.2, g * 0.7);
  },
  hit() { sfxNoise({ type: 'bandpass', f0: 700, q: 1.5, dur: 0.09, gain: 0.5 }); },
  hurt() { sfxNoise({ f0: 300, f1: 80, dur: 0.18, gain: 0.8 }); sfxTone(110, 50, 0.2, 0.5, 'triangle'); },
  whiz() { sfxTone(2400, 900, 0.12, 0.07, 'sawtooth'); },
  thud(dist) { sfxNoise({ f0: 220, f1: 60, dur: 0.22, gain: clamp(0.7 / (1 + dist * 0.08), 0.08, 0.5) }); },
  // arm swinging through: a short rising air whoosh
  grenadeThrow(level = 1) { sfxNoise({ type: 'bandpass', f0: 400, f1: 1600, q: 1.2, dur: 0.28, gain: 0.35 * level, attack: 0.05 }); },   // level < 1: an enemy's throw heard from a distance
  // detonation: the recorded blast when loaded, else a low noise crack with a falling body
  explode(dist) {
    const g = clamp(1.2 / (1 + dist * 0.1), 0.15, 1);
    if (playBuf(BUF.grenade, g, 0.97 + Math.random() * 0.06)) return;
    sfxNoise({ f0: 1200, f1: 50, dur: 1.1, gain: g, echo: 0.3 }); sfxNoise({ type: 'highpass', f0: 1800, dur: 0.12, gain: 0.5 });
    sfxTone(120, 30, 0.9, g * 0.8);
  },
};
