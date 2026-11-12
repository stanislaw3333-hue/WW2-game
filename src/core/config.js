// Tunable numbers in one place. Balance and feel changes should happen here, not in the systems.
// Values are in metres, metres per second, or seconds unless noted. No imports: this file is data only.

export const PLAYER = {
  spawn: { x: 17.3, z: -13 },  // just behind the Polish truck's tailgate (truck along z at x 17.3, tailgate about z -11.5), as in the user's screenshot
  spawnYaw: Math.atan2(17.3, -10),   // facing the fountain at (0, -3) from the spawn point
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
  patrolSpeed: 0.7,        // m/s on a patrol route (a relaxed walk)
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
// building footprints in metres (x0..x1, z0..z1): the distant air siren fades out while the player is inside one
export const BUILDINGS = [
  { x0: -20, x1: 20, z0: -26, z1: -20 },   // manor
  { x0: 20, x1: 26, z0: -20, z1: 12 },     // stable
  { x0: -63, x1: -31, z0: -16, z1: -10 },  // barracks in the enemy yard
];
export const RADIO = { x: -47.5, y: 1.2, z: 2 };
// the radio fades linearly to silence at this distance in metres (spawn is about 66 m away, so it is silent there)
export const RADIO_RANGE = 25;
// German voices (callouts and conversations) come from the soldier who speaks and are heard only within this
// distance of him, in metres. Every soldier follows the rule, so soldiers added later get it automatically.
// 15.5 m: half the 31 m the first test used, since voices were still heard from the fountain.
export const VOICE_RADIUS = 15.5;
// German conversations (soldiers talking to each other, chatter.js) are heard within this distance of the speaker, in metres
// Junkers Ju87 flyover (effects/flyover.js): a small, near-black Stuka passes high overhead with its propeller sound.
export const FLYOVER = {
  minWait: 60,         // s from the start of one pass to the start of the next: a random time between minWait and maxWait
  maxWait: 180,
  altitude: 110,       // m above the ground
  speed: 45,           // m/s along the pass
  halfLength: 220,     // m either side of the point overhead: the pass starts and ends this far away
  scale: 0.25,         // model scale: small, so it reads as far away
  soundGain: 0.3,      // propeller clip level: kept quiet
  refDist: 10,         // propeller sound: linear falloff from refDist to maxDist, so it is loudest when overhead
  maxDist: 400,
};
export const CHATTER_RADIUS = 40;   // bottom of the set: on top of the crate, right of centre of the enemy yard seen from the passage
export const ENEMY_SPAWNS = [
  // three stand around the radio (RADIO), facing the passage (+x); three patrol across the middle of the yard
  { x: -50.2, z: 0.6,  yaw: E,       patrol: null, officer: false, look: { uni: 0, face: 0 } },
  { x: -48.9, z: -1.7, yaw: E,       patrol: null, officer: false, look: { uni: 0, face: 2 } },
  { x: -50.0, z: 4.2,  yaw: E,       patrol: null, officer: false, look: { uni: 1, face: 0 } },
  // the three walkers take different, crossing routes so they never walk in step or in parallel
  { x: -45.2, z: 0.9,  yaw: E,       patrol: [[-45.2, 0.9], [-37, -5.5], [-41, 6.5]], officer: false, look: { uni: 1, face: 1 } },
  { x: -46.4, z: -2.4, yaw: E,       patrol: [[-46.4, -2.4], [-35.5, 2.5]], officer: true,  look: { uni: 1, face: 3 } },
  { x: -46.2, z: 4.6,  yaw: E,       patrol: [[-46.2, 4.6], [-40, -7], [-34, 1]], officer: false, look: { uni: 0, face: 1 } },
];
// the two courtyards are joined by one archway; enemies route through these points
export const ARCH_WAYPOINTS = { A: { x: -20.4, z: 10.5 }, B: { x: -32.6, z: 10.5 } };

// weapon table: index 0 = Kar98k, 1 = MP40, 2 = stielhandgranate. dmg per bullet; fov is the zoomed field of view; auto = fires while held.
// hip/adsY/adsZ are the viewmodel offsets; kz/kr are recoil kick (position/rotation).
export const WEAPON_DEFS = [
  { id: 'k98', name: 'KAR 98K', mag: 5, ammo: 5, reserve: 45, max: 45, dmg: 140, auto: false, fov: 36, hip: [0.15, -0.165, -0.40], hipYaw: 0.075, adsY: -0.0765, adsZ: -0.36, adsTilt: 0.02, kz: 0.07, kr: 0.1 },
  { id: 'mp40', name: 'MP 40', mag: 32, ammo: 32, reserve: 128, max: 128, dmg: 34, auto: true, fov: 47, hip: [0.17, -0.14, -0.41], hipYaw: 0.075, adsY: -0.0702, adsZ: -0.36, adsTilt: 0.038, kz: 0.03, kr: 0.03 },
  // index 2 = Stielhandgranate. Each throw uses the grenade in hand (mag 1); the next one is readied from reserve. No sights, no direct damage.
  { id: 'gren', kind: 'grenade', name: 'GRENADE', mag: 1, ammo: 1, reserve: 40, max: 40, dmg: 0, auto: false, fov: 62, hip: [0.15, -0.17, -0.52], hipYaw: 0.1, adsY: -0.17, adsZ: -0.38, kz: 0, kr: 0 },
];

// Kar98 reload sound: the clip has two sections with a quiet gap between them. The first section (0 to K98_RELOAD_SPLIT_T s of the clip) plays as the bolt is pulled back; the second (from K98_RELOAD_SPLIT_T) plays when the bolt cocks back, K98_RELOAD_COCK_T s into the reload.
export const K98_RELOAD_SPLIT_T = 0.66;
export const K98_RELOAD_COCK_T = 1.75;
// size of the viewmodel muzzle flash planes (guns.js flashes()); 1.5 = half as big again on top of the previous size
export const FLASH_SIZE = 1.5;
// level of the German death clips (audio.js SFX.death); half the earlier 0.4
export const DEATH_GAIN = 0.2;
export const K98_CLIP_IN_T = 0.75;   // s into the Kar98 reload when the stripper clip goes down into the receiver: the first section plays again here

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
  windT: 0.5,              // s the arm takes to rise up and back (slow windup)
  swingT: 0.2,             // s the swing forward takes after the windup: short and sharp, it ends just after the release
  releaseT: 0.62,          // s into the throw animation when the grenade leaves the hand: just as the arm starts to come down (windT + a moment)
  pivot: [0.04, -0.08, 0.42],   // the point the throw turns about: the bottom of the arm, in grenade space (metres; +z is back toward the player)
  raiseAng: 1.25,          // rad the arm is raised about the pivot on the windup
  forwardAng: -0.05,       // rad the arm is lowered below its resting angle at the end of the swing (negative = a little above it)
  releaseOffset: [0.25, -0.15, 0.5],   // where the thrown grenade appears relative to the eye: [right, up, forward] metres, at the throwing hand (was straight ahead and 0.15 down)
  throwT: 1.15,            // s for the whole throw animation
};

// hand placement on each weapon (index as WEAPON_DEFS; L = left hand, R = right hand), in gun space, metres. Only the hands move; the weapon models stay as they are.
// p = the grip point the hand was baked on (tools/bake_hands.py CFG), d = offset added to it, r = turn about that point as [axis x, y, z, angle in radians].
export const HAND_OFFSETS = [
  // Kar98k: the left arm pose (palm up, elbow bent the other way, fingers slightly curled and together) is baked in k98_hands.json (tools/bake_hands.py CFG poseL)
  { L: { p: [-0.004, -0.052, -0.29], d: [-0.03, -0.005, 0.07], r: [0.2671, 0.0444, -0.9627, 0.8099] }, R: { p: [0.006, -0.058, 0.15], d: [0.08, 0.005, 0.035], r: [-0.853, -0.1351, -0.5042, 0.6088] } },
  // MP40: left hand on the magazine housing; right hand on the grip and trigger
  { L: { p: [-0.002, -0.128, -0.156], d: [-0.05, -0.005, 0.085], r: [0, 1, 0, 0] }, R: { p: [0.004, -0.074, 0.066], d: [0.095, -0.015, 0.205], r: [0, 1, 0, 0] } },
  // grenade: hand pointing down along the handle, gripping its bottom
  { R: { p: [0.06, -0.02, -0.1], d: [-0.04, -0.025, 0.215], r: [0, 0, -1, 2.7227] } },
];

// viewmodel size per weapon (index as WEAPON_DEFS): the gun and everything attached to it are scaled, the hands keep their size so the gun reads bigger in them.
// When a gun is scaled, scale its adsY by the same factor (the sights sit that much higher above the barrel axis): Kar98k 1.265 -> adsY -0.0605 * 1.265, MP40 -0.0555 * 1.265.
export const GUN_SCALE = [1.265, 1.265, 1];
