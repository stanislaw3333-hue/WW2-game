// Shared mutable game state. Scalars that several systems read or write live on S.
import { PLAYER } from './config.js';
// Arrays and objects are shared by reference: mutate them, never reassign the import.
export const S = {
  state: 'title',          // 'title' | 'play' | 'pause' | 'dead'
  time: 0,
  kills: 0,                // enemy soldiers down
  hits: 0,                 // practice targets down
  message: '', messageT: 0,
  cycleT: -1,              // seconds until the targets reset (after all are down)
  deadT: 0,
  zoneMsg: 0,              // which yard-entry message has been shown
  hintT: -1,
  hideGunT: false,
  lowW: 320,               // HUD and render buffer width (set by resize)
  mdx: 0, mdy: 0,          // mouse movement since the last update
  fireHeld: false, firePressed: false, adsHeld: false,
  wantW: -1,               // requested weapon index, -1 = none
};
export const say = (m, t = 3) => { S.message = m; S.messageT = t; };

export const player = { x: PLAYER.spawn.x, z: PLAYER.spawn.z, y: 0, vy: 0, yaw: 0, pitch: 0, crouch: 0, bob: 0, move: 0, stepAlt: false, hp: PLAYER.maxHp, hurt: 0, lastHit: -99 };
export const keys = {};
export const enemies = [];
export const enemyParts = [];   // hit boxes of living soldiers (raycast targets)
export const targets = [];      // practice targets
export const boxes = [];        // collision: axis-aligned blocks {x0,x1,z0,z1}
export const circles = [];      // collision: round pillars {cx,cz,r}
export const shootables = [];   // meshes bullets can hit
export const lightDefs = [];    // point lights {pos, col}
