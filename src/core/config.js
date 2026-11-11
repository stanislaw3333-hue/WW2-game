// Tunable numbers in one place. Balance and feel changes should happen here, not in the systems.
// Values are in metres, metres per second, or seconds unless noted. No imports: this file is data only.

export const PLAYER = {
  spawn: { x: 0, z: 17.2 },
  maxHp: 100,
  walkSpeed: 3.3,          // m/s
  sprintSpeed: 5.4,        // m/s, forward only, not while crouched or aiming
  jumpVel: 4.2,            // m/s upward
  gravity: 12,             // m/s^2
  regenDelay: 6,           // seconds without damage before health regenerates
  regenRate: 7,            // hp per second
};

export const ENEMY = {
  maxHp: 100,
  headMult: 3,             // damage multiplier by hit part
  bodyMult: 1,
  limbMult: 0.75,
  patrolSpeed: 1.15,       // m/s on a patrol route
  chaseSpeed: 3.0,         // m/s moving to a flank point
  strafeSpeed: 1.5,        // m/s sideways while shooting
  retreatSpeed: 1.6,       // m/s backing off when the player is within 3.5 m
  sightRange: 45,          // m: line-of-sight checks beyond this are skipped
  alertRadius: 24,         // m: being alerted spreads to soldiers this close
};

// enemy placement. yaw is radians (PI/2 = facing east); patrol = list of [x, z] points or null; look.uni 0 dark | 1 field-grey, look.face 0..3
const E = Math.PI / 2;
export const ENEMY_SPAWNS = [
  { x: -45.6, z: 6.4,  yaw: E,       patrol: null, officer: false, look: { uni: 0, face: 0 } },
  { x: -40.5, z: -4.2, yaw: E * 0.6, patrol: null, officer: true,  look: { uni: 0, face: 3 } },
  { x: -56,   z: -8,   yaw: E,       patrol: [[-56, -8], [-42, -8]], officer: false, look: { uni: 1, face: 1 } },
  { x: -58,   z: 12.5, yaw: E * 1.2, patrol: null, officer: false, look: { uni: 0, face: 2 } },
  { x: -54,   z: 17.5, yaw: E,       patrol: [[-54, 17.5], [-40, 17.5]], officer: true, look: { uni: 1, face: 0 } },
  { x: -59.5, z: 1,    yaw: E,       patrol: null, officer: false, look: { uni: 1, face: 3 } },
];
// the two courtyards are joined by one archway; enemies route through these points
export const ARCH_WAYPOINTS = { A: { x: -20.4, z: 10.5 }, B: { x: -32.6, z: 10.5 } };

// weapon table: index 0 = Kar98k, 1 = MP40. dmg per bullet; fov is the zoomed field of view; auto = fires while held.
// hip/adsY/adsZ are the viewmodel offsets; kz/kr are recoil kick (position/rotation).
export const WEAPON_DEFS = [
  { id: 'k98', name: 'KAR 98K', mag: 5, ammo: 5, reserve: 45, max: 45, dmg: 140, auto: false, fov: 36, hip: [0.15, -0.165, -0.40], hipYaw: 0.075, adsY: -0.0605, adsZ: -0.36, kz: 0.07, kr: 0.1 },
  { id: 'mp40', name: 'MP 40', mag: 32, ammo: 32, reserve: 128, max: 128, dmg: 34, auto: true, fov: 47, hip: [0.15, -0.135, -0.41], hipYaw: 0.21, adsY: -0.0555, adsZ: -0.36, kz: 0.03, kr: 0.03 },
];
