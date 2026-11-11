// Web Audio: procedural sound effects (noise and tone bursts) and the ambient drone. Nothing is loaded from files.
import { clamp } from '../core/util.js';

let AC = null, master, echoIn, noiseBuf;

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
  } catch (e) { AC = null; }
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
  shot() { sfxNoise({ f0: 5200, f1: 300, dur: 0.5, gain: 1.0, echo: 0.6 }); sfxNoise({ type: 'highpass', f0: 2500, dur: 0.07, gain: 0.5 }); sfxTone(170, 38, 0.24, 0.9); },
  click(d = 0, f = 2600) { sfxNoise({ type: 'bandpass', f0: f, q: 3, dur: 0.05, gain: 0.45, delay: d }); sfxTone(f * 0.4, f * 0.2, 0.03, 0.12, 'square', d); },
  step(alt) { sfxNoise({ f0: alt ? 420 : 340, f1: 120, dur: 0.11, gain: 0.26 }); sfxNoise({ type: 'bandpass', f0: 1800, q: 1, dur: 0.035, gain: 0.05 }); },
  wood() { sfxNoise({ type: 'bandpass', f0: 520, q: 2.5, dur: 0.14, gain: 0.7, echo: 0.2 }); sfxTone(240, 110, 0.1, 0.3, 'triangle'); },
  stone() { sfxNoise({ type: 'bandpass', f0: 2400, q: 2, dur: 0.09, gain: 0.35, echo: 0.2 }); if (Math.random() < 0.4) sfxTone(2600 + Math.random() * 900, 900, 0.3, 0.07, 'sine', 0.02); },
  pickup() { sfxTone(520, 520, 0.08, 0.2, 'square'); sfxTone(780, 780, 0.12, 0.2, 'square', 0.09); SFX.click(0.02, 1800); },
  rumble() { sfxNoise({ f0: 110, f1: 40, dur: 2.2, gain: 0.5, attack: 0.25 }); },
  // objective complete: a slow, low, dark sting instead of a bright fanfare
  done() {
    [[55, 0.5], [41.2, 0.4], [36.7, 0.35]].forEach(([f, g], i) => { sfxTone(f, f * 0.96, 3.2, g * 0.35, 'triangle', i * 0.22); sfxTone(f * 0.5, f * 0.48, 3.8, g * 0.6, 'sine', i * 0.22); });
    sfxNoise({ f0: 140, f1: 40, dur: 3.0, gain: 0.35, attack: 0.3 });
  },
  smg() { sfxNoise({ f0: 4200, f1: 480, dur: 0.17, gain: 0.72, echo: 0.3 }); sfxNoise({ type: 'highpass', f0: 3000, dur: 0.04, gain: 0.3 }); sfxTone(210, 70, 0.09, 0.5); },
  eshot(dist) { const g = clamp(1.1 / (1 + dist * 0.09), 0.12, 0.8); sfxNoise({ f0: 3600, f1: 260, dur: 0.4, gain: g, echo: 0.5 }); sfxTone(150, 40, 0.2, g * 0.7); },
  hit() { sfxNoise({ type: 'bandpass', f0: 700, q: 1.5, dur: 0.09, gain: 0.5 }); },
  hurt() { sfxNoise({ f0: 300, f1: 80, dur: 0.18, gain: 0.8 }); sfxTone(110, 50, 0.2, 0.5, 'triangle'); },
  whiz() { sfxTone(2400, 900, 0.12, 0.07, 'sawtooth'); },
  thud(dist) { sfxNoise({ f0: 220, f1: 60, dur: 0.22, gain: clamp(0.7 / (1 + dist * 0.08), 0.08, 0.5) }); },
};
