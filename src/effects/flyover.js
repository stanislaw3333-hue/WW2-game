// Junkers Ju87 flyover: a small, near-black Stuka crosses high overhead every FLYOVER.minWait to maxWait seconds, with its
// propeller sound. Each pass starts from a random side of the spot the player stands on and crosses it.
import * as THREE from 'three';
import { FLYOVER } from '../core/config.js';
import { S, player } from '../core/state.js';
import { scene, mat } from '../render/renderer.js';
import { T } from '../render/materials.js';
import { addBaked } from '../render/baked.js';
import { playFlyby } from '../audio/audio.js';
import JU87_MODEL from '../models/ju87.json';

// the whole aircraft uses one near-black material
const MATS = { metal: mat(T.white, { tint: [0.05, 0.05, 0.06] }) };

let plane = null;     // the aircraft group, built on the first update
let timer = 0;        // s since the last pass started
let wait = FLYOVER.minWait;   // s to wait before the next pass; the first one comes after minWait, later ones are random
let flight = null;    // the pass in progress: { t, dur, x0, z0, dx, dz, sound }

function build() {
  plane = new THREE.Group();
  plane.scale.setScalar(FLYOVER.scale);
  plane.visible = false;
  scene.add(plane);
  addBaked(JU87_MODEL, plane, MATS);
}

// starts a pass: it crosses the player's current spot, from halfLength away on one side to halfLength away on the other
function startFlight() {
  const a = Math.random() * Math.PI * 2;
  const dx = Math.cos(a), dz = Math.sin(a);
  const x0 = player.x - dx * FLYOVER.halfLength, z0 = player.z - dz * FLYOVER.halfLength;
  // the model's length runs along +X: yaw it so +X points along the pass
  plane.rotation.y = Math.atan2(-dz, dx);
  plane.position.set(x0, FLYOVER.altitude, z0);
  plane.visible = true;
  const sound = playFlyby(x0, FLYOVER.altitude, z0);
  flight = { t: 0, dur: 2 * FLYOVER.halfLength / FLYOVER.speed, x0, z0, dx, dz, sound };
}

function endFlight() {
  plane.visible = false;
  if (flight.sound) flight.sound.stop();
  flight = null;
}

// called once per frame from updateWorld; the pass runs only while the game is being played
export function updateFlyover(dt) {
  if (!plane) build();
  if (S.state !== 'play') return;
  if (flight) {
    flight.t += dt;
    if (flight.t >= flight.dur) { endFlight(); }
    else {
      const d = flight.t * FLYOVER.speed;   // metres flown so far along the pass
      const x = flight.x0 + flight.dx * d, z = flight.z0 + flight.dz * d;
      plane.position.set(x, FLYOVER.altitude, z);
      if (flight.sound) flight.sound.move(x, FLYOVER.altitude, z);
    }
  }
  timer += dt;
  if (!flight && timer >= wait) {
    timer = 0;
    wait = FLYOVER.minWait + Math.random() * (FLYOVER.maxWait - FLYOVER.minWait);
    startFlight();
  }
}
