// Junkers flyovers: near-black aircraft pass high overhead with a propeller sound. Two of them: the plane (FLYOVER, the
// Ju 87 Stuka dive bomber) and the bomber (BOMBER, the Ju 52, with its own clip, first pass 20 s in). After its first pass
// each one repeats every minWait to maxWait seconds. Each pass starts from a random side of the spot the player stands on
// and crosses it.
import * as THREE from 'three';
import { FLYOVER, BOMBER } from '../core/config.js';
import { S, player } from '../core/state.js';
import { scene, mat } from '../render/renderer.js';
import { T } from '../render/materials.js';
import { addBaked } from '../render/baked.js';
import { playFlyby } from '../audio/audio.js';
import JU87_MODEL from '../models/ju87.json';
import JU52_MODEL from '../models/ju52.json';

// the whole aircraft uses one near-black material; both flyovers share it, so the bomber is the same colour as the plane
const MATS = { metal: mat(T.white, { tint: [0.05, 0.05, 0.06] }) };

// one flyover: cfg is its config (config.js), model its baked mesh, clip its sound's key in audio.js
function makeFlyover(cfg, clip, model) {
  return {
    cfg, clip, model,
    group: null,            // the aircraft group, built on the first update
    timer: 0,               // s since the last pass started
    wait: cfg.firstPass,    // s to wait before the next pass: the first starts firstPass s into play, later ones are random
    flight: null,           // the pass in progress: { t, dur, x0, z0, dx, dz, sound }
  };
}

const FLYOVERS = [
  makeFlyover(FLYOVER, 'planeFlyby', JU87_MODEL),    // the Ju 87 Stuka, a dive bomber
  makeFlyover(BOMBER, 'bomberFlyby', JU52_MODEL),    // the Ju 52, the bomber
];

function build(f) {
  f.group = new THREE.Group();
  f.group.scale.setScalar(f.cfg.scale);
  f.group.visible = false;
  scene.add(f.group);
  addBaked(f.model, f.group, MATS);
}

// starts a pass: it crosses the player's current spot, from halfLength away on one side to halfLength away on the other
function startFlight(f) {
  const { cfg, group } = f;
  const a = Math.random() * Math.PI * 2;
  const dx = Math.cos(a), dz = Math.sin(a);
  const x0 = player.x - dx * cfg.halfLength, z0 = player.z - dz * cfg.halfLength;
  // the model's length runs along +X: yaw it so +X points along the pass
  group.rotation.y = Math.atan2(-dz, dx);
  group.position.set(x0, cfg.altitude, z0);
  group.visible = true;
  const sound = playFlyby(f.clip, cfg, x0, cfg.altitude, z0);
  f.flight = { t: 0, dur: 2 * cfg.halfLength / cfg.speed, x0, z0, dx, dz, sound };
}

function updateOne(f, dt) {
  const { cfg } = f;
  if (f.flight) {
    const fl = f.flight;
    fl.t += dt;
    const d = fl.t * cfg.speed;   // metres flown so far along the pass
    const x = fl.x0 + fl.dx * d, z = fl.z0 + fl.dz * d;
    if (fl.t < fl.dur) f.group.position.set(x, cfg.altitude, z);
    else f.group.visible = false;
    // the clip can run longer than the pass: the sound keeps flying on past the far side until it has played out
    if (fl.sound) fl.sound.move(x, cfg.altitude, z);
    if (fl.t >= fl.dur && (!fl.sound || fl.sound.done())) f.flight = null;
  }
  f.timer += dt;
  if (!f.flight && f.timer >= f.wait) {
    f.timer = 0;
    f.wait = cfg.minWait + Math.random() * (cfg.maxWait - cfg.minWait);
    startFlight(f);
  }
}

// called once per frame from updateWorld; the passes run only while the game is being played
export function updateFlyover(dt) {
  for (const f of FLYOVERS) if (!f.group) build(f);
  if (S.state !== 'play') return;
  for (const f of FLYOVERS) updateOne(f, dt);
}
