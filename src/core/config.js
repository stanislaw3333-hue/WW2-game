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
// German radio set on top of the crate stack in the enemy yard, among the patrolling soldiers.
// The chatter loop comes from this point. y is the top of the crate stack (crate at y 1.4, size 1.0).
export const RADIO = { x: -47.5, y: 1.2, z: 2 };   // bottom of the set: on top of the crate, right of centre of the enemy yard seen from the passage
export const ENEMY_SPAWNS = [
  // three stand around the radio (RADIO), facing the passage (+x); three patrol across the middle of the yard
  { x: -50.2, z: 0.6,  yaw: E,       patrol: null, officer: false, look: { uni: 0, face: 0 } },
  { x: -48.9, z: -1.7, yaw: E,       patrol: null, officer: false, look: { uni: 0, face: 2 } },
  { x: -50.0, z: 4.2,  yaw: E,       patrol: null, officer: false, look: { uni: 1, face: 0 } },
  { x: -45.2, z: 0.9,  yaw: E,       patrol: [[-45.2, 0.9], [-38, 0.9]], officer: false, look: { uni: 1, face: 1 } },
  { x: -46.4, z: -2.4, yaw: E,       patrol: [[-46.4, -2.4], [-38, -2.4]], officer: true,  look: { uni: 1, face: 3 } },
  { x: -46.2, z: 4.6,  yaw: E,       patrol: [[-46.2, 4.6], [-38, 4.6]], officer: false, look: { uni: 0, face: 1 } },
];
// the two courtyards are joined by one archway; enemies route through these points
export const ARCH_WAYPOINTS = { A: { x: -20.4, z: 10.5 }, B: { x: -32.6, z: 10.5 } };

// weapon table: index 0 = Kar98k, 1 = MP40, 2 = stielhandgranate. dmg per bullet; fov is the zoomed field of view; auto = fires while held.
// hip/adsY/adsZ are the viewmodel offsets; kz/kr are recoil kick (position/rotation).
export const WEAPON_DEFS = [
  { id: 'k98', name: 'KAR 98K', mag: 5, ammo: 5, reserve: 45, max: 45, dmg: 140, auto: false, fov: 36, hip: [0.15, -0.165, -0.40], hipYaw: 0.075, adsY: -0.0605, adsZ: -0.36, kz: 0.07, kr: 0.1 },
  { id: 'mp40', name: 'MP 40', mag: 32, ammo: 32, reserve: 128, max: 128, dmg: 34, auto: true, fov: 47, hip: [0.15, -0.135, -0.41], hipYaw: 0.21, adsY: -0.0555, adsZ: -0.36, kz: 0.03, kr: 0.03 },
  // index 2 = Stielhandgranate. Each throw uses the grenade in hand (mag 1); the next one is readied from reserve. No sights, no direct damage.
  { id: 'gren', kind: 'grenade', name: 'GRENADE', mag: 1, ammo: 1, reserve: 2, max: 2, dmg: 0, auto: false, fov: 62, hip: [0.2, -0.17, -0.38], hipYaw: 0.1, adsY: -0.17, adsZ: -0.38, kz: 0, kr: 0 },
];

// thrown grenades: flight, fuse, bounce, and the blast that hurts soldiers and the player
export const GRENADE = {
  fuse: 2.6,               // s from release to detonation
  throwSpeed: 12,          // m/s launch speed along the view direction
  throwLift: 3.6,          // m/s extra upward kick at release
  gravity: 9.8,            // m/s^2
  bounce: 0.35,            // share of speed kept after hitting the ground or a wall
  radius: 6.5,             // m blast radius; damage falls off linearly to zero at the edge
  enemyDmg: 160,           // soldier damage at the centre (100 hp soldiers die close to the blast)
  playerDmg: 90,           // player damage at the centre
  releaseT: 0.34,          // s into the throw animation when the grenade leaves the hand
  throwT: 0.95,            // s for the whole throw animation
};
