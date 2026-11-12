// Shared mutable game state. Scalars that several systems read or write live on S.
import { PLAYER } from './config.js';
// Arrays and objects are shared by reference: mutate them, never reassign the import.
export const S = {
  state: 'title',          // 'title' | 'play' | 'pause' | 'dead'
  time: 0,
  lastShotT: -99,          // S.time when the player last fired or threw a grenade (enemy grenades wait for a quiet spell)
  kills: 0,                // enemy soldiers down
  message: '', messageT: 0,
  deadT: 0,
  hintT: -1,
  hideGunT: false,
  lowW: 320,               // HUD and render buffer width (set by resize)
  mdx: 0, mdy: 0,          // mouse movement since the last update
  noLock: false,           // browser refused pointer lock (e.g. the built-in pane): mouse look still works without it
  fireHeld: false, firePressed: false, adsHeld: false,
  wantW: -1,               // requested weapon index, -1 = none
  god: false,              // godmode (pause menu toggle): hits still flash and sound but do no damage
  dmgT: -99, dmgDx: 0, dmgDz: 0,   // last hit: S.time and the offset from the player to where it came from (compass flash)
  debugCam: null,         // ?test only: function(camera) that takes over the camera (debug/posetune.js)
};
export const say = (m, t = 3) => { S.message = m; S.messageT = t; };

export const player = { x: 0, z: 0, y: 0, vy: 0, yaw: 0, pitch: 0, crouch: 0, bob: 0, move: 0, stepAlt: false, hp: PLAYER.maxHp, hurt: 0, lastHit: -99 };   // x, z, yaw are set from the level by world/level.js
export const keys = {};
export const enemies = [];
export const enemyParts = [];   // hit boxes of living soldiers (raycast targets)
export const boxes = [];        // collision: axis-aligned blocks {x0,x1,z0,z1}
export const circles = [];      // collision: round pillars {cx,cz,r}
export const shootables = [];   // meshes bullets can hit
export const lightDefs = [];    // point lights {pos, col}
