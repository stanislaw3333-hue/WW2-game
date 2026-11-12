// Tunable numbers in one place. Balance and feel changes should happen here, not in the systems.
// Values are in metres, metres per second, or seconds unless noted. No imports: this file is data only.

// Level-specific data (spawns, enemy placement, navigation, indoor areas, radio, lighting) is NOT here:
// it lives in src/levels/<id>/data.js. This file holds the numbers shared by every level.

export const PLAYER = {
  maxHp: 100,
  mouseSens: 0.0023,       // radians per mouse pixel
  adsSensMult: 0.55,       // mouse sensitivity multiplier at full aim-down-sights
  mouseSpike: 250,         // px: a single mouse event bigger than this, and spikeMult times the last one, is dropped
  spikeMult: 5,            //   (Chrome/Electron pointer lock on Windows sometimes reports one huge jump, which whips the view round)
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
  limbMult: 0.5,            // with ENEMY.maxHp 100 and the Kar98's 55: head 1 hit, torso 2, arms and legs 4 (MP40, 34: 1, 3, 6)
  patrolSpeed: 0.7,        // m/s on a patrol route (a relaxed walk)
  chaseSpeed: 3.0,         // m/s moving to a flank point
  strafeSpeed: 1.5,        // m/s sideways while shooting
  retreatSpeed: 1.6,       // m/s backing off when the player is within 3.5 m
  sightRange: 45,          // m: line-of-sight checks beyond this are skipped
  alertRadius: 12,         // m: a soldier who spots the player alerts the soldiers this close (they join the fight)
  awareRadius: 30,         // m: ...and makes the ones this close aware (they turn and look toward the player, but hold their ground)
  rangeK98: [10, 17],      // m: distance to the player a rifleman tries to fight from: random in [min, max]
  rangeMP40: [6, 11],      // m: the same for a soldier with an MP40
};

// what soldiers hear (enemies/hearing.js). A noise is heard within its radius in metres, or within radius * wallMult when
// there is no line of sight between the soldier and the noise. Hearing makes a soldier aware: he stops, turns toward the
// noise and looks, but only goes on the attack when he sees the player (or a noise is within alertWithin).
export const HEARING = {
  rifle: 16,               // a Kar98 shot
  smg: 12,                 // an MP40 round
  sprint: 4,               // footsteps while sprinting
  walk: 1.5,               // footsteps while walking (crouched: silent)
  reload: 2,               // reloading
  grenade: 30,             // a blast
  wallMult: 0.5,
  alertWithin: 4,          // m: a noise this close makes him attack even without seeing the player
  awareT: 14,              // s an aware soldier stays on watch after the last noise
  awareFarMult: 1.25,      // an aware soldier notices the player in sight this much further out (ENEMY_FIRE.noticeFar), whichever way he faces
};

// alerted soldiers' tactics (enemies/tactics.js, enemies/cover.js): cover, peeking, kneeling, flanking and moving up in turns
export const ENEMY_TACTICS = {
  // cover points are made from the level's collision blocks and pillars, `offset` m out from each side, every `spacing` m
  offset: 0.55, spacing: 1.2, minSize: 0.6,
  searchRadius: 14,        // m: cover this far from the soldier is considered
  minPlayerDist: 5,        // m: no cover closer to the player than this
  hideH: 1.1,              // m: eye height that must be hidden from the player (kneeling behind low cover, standing behind high cover is checked at standH)
  standH: 1.6,             // m: standing eye height (shooting over low cover, hiding behind high cover)
  peek: 0.75,              // m: sideways step out from high cover to lean round it and shoot
  hideT: [1.2, 2.6],       // s ducked down in cover between bursts of fire: random in [min, max]
  exposeT: [1.8, 3.4],     // s up and shooting before ducking again
  stayT: [5, 9],           // s in one cover before moving up to the next
  thinkT: 0.8,             // s between checks that the cover still covers and decisions to move
  noLosAdvanceT: 3.5,      // s without sight of the player before he moves up anyway
  closeBreak: 4,           // m: the player this close makes him leave cover and fight in the open
  moveGiveUpT: 4,          // s: a move to cover that takes longer than this is dropped
  // moving up in turns: while one soldier within leapfrogRadius runs to new cover, the others wait their turn and pop up to give covering fire
  leapfrogRadius: 14,
  // flanking: every flankEvery s, if two or more soldiers are fighting, one swings out flankAngle rad round the player
  flankEvery: [9, 15], flankAngle: 1.1, flankMaxT: 18,
  kneelDist: 13,           // m: a rifleman shooting in the open kneels when the player is further than this
  kneelHitMult: 1.15,      // kneeling steadies his aim
};

// suppression: player rounds passing or striking within `radius` m of a soldier (other than the one hit) pin him down
export const ENEMY_SUPPRESS = {
  radius: 1.4,
  add: 0.35,               // added per round at point-blank (less further out), capped at 1
  decay: 0.4,              // lost per second
  accuracy: 0.6,           // his hit chance is multiplied by 1 - accuracy * suppression
  hideAt: 0.45,            // above this he stays down in cover
};

// grenades landing near a soldier (enemies/tactics.js): he runs from any grenade within `radius` m that he can notice
export const ENEMY_EVADE = {
  radius: 8.5,             // m (the blast radius is GRENADE.radius)
  safe: 9.5,               // m: he stops running this far from it
  react: [0.25, 0.65],     // s before he reacts
  speed: 3.8,              // m/s
};

// enemy deaths (enemies/death.js): chance weights of each fall; knees = drops to his knees, then pitches forward
export const ENEMY_DEATH = {
  weights: { back: 3, front: 2.5, side: 3, knees: 1.2 },
  kneelT: 0.45,            // s dropping to the knees before the fall forward
  gravity: 9,              // rad/s^2 the fall speeds up by
};

// enemy gunfire, shouts and noticing the player (enemies/combat.js, enemies/ai.js)
export const ENEMY_FIRE = {
  noticeClose: 7,          // m: a soldier with line of sight notices the player this close, whichever way he faces
  noticeFar: 28,           // m: further out he must be roughly facing the player
  shoutCooldown: 1.2,      // s between any two callouts (shared by all soldiers)
  rifleGap: [1.9, 3.2],    // s between Kar98 shots: random in [min, max]
  rifleDmg: [7, 15],       // hp per Kar98 hit: random in [min, max]
  burstGap: 0.09,          // s between MP40 rounds in a burst
  burstPause: [1, 2],      // s pause after an MP40 burst: random in [min, max]
  burstHitMult: 0.4,       // per-round hit chance of an MP40 round relative to an aimed rifle shot
  burstDmg: [3, 6.5],      // hp per MP40 hit
  // chance that one aimed shot hits: base - dist * falloff, clamped to [min, max], then multiplied by the modifiers that apply
  hitBase: 0.6, hitFalloff: 0.015, hitMin: 0.12, hitMax: 0.5,
  hitPlayerRunning: 0.7, hitPlayerCrouched: 0.75, hitWhileMoving: 0.6,
};

// player gunfire (player/shooting.js, player/update.js). Spread is in screen units (1 = the whole view).
export const FIRE = {
  autoCooldown: 0.115,     // s between MP40 rounds (about 520 rpm)
  autoSpreadHip: 0.024, autoSpreadAds: 0.008,
  heatSpread: 1.3,         // extra MP40 spread at full heat (1 + heat * heatSpread)
  heatPerShot: 0.13, heatDecay: 0.9,   // heat 0..1 added per round, and lost per second
  autoClimb: 0.0035,       // rad of muzzle climb per MP40 round (times 1 + heat)
  rifleSpreadHip: 0.004,   // Kar98 spread from the hip; 0 when aimed
  rifleCycleT: 1.2,        // s from a Kar98 shot until it can fire again (bolt cycle)
};

// reload timing in seconds from the start of the reload. The viewmodel animation keys in player/update.js are
// timed for these values: change endT and the hand movements will no longer line up.
export const RELOAD = {
  k98: { refillT: 1.35, endT: 2.65 },
  mp40: { refillT: 1.28, chargeT: 1.7, endT: 2.3 },
};

// the radio fades linearly to silence at this distance in metres (spawn is about 66 m away, so it is silent there)
export const RADIO_RANGE = 25;
// German voices (callouts and conversations) come from the soldier who speaks and are heard only within this
// distance of him, in metres. Every soldier follows the rule, so soldiers added later get it automatically.
// 15.5 m: half the 31 m the first test used, since voices were still heard from the fountain.
export const VOICE_RADIUS = 15.5;
// Junkers Ju87 flyover (effects/flyover.js): a small, near-black Stuka passes high overhead with its propeller sound.
export const FLYOVER = {
  firstPass: 10,       // s of play before the first pass starts
  minWait: 60,         // s from the start of one pass to the start of the next: a random time between minWait and maxWait
  maxWait: 180,
  altitude: 110,       // m above the ground
  speed: 45,           // m/s along the pass
  halfLength: 220,     // m either side of the point overhead: the pass starts and ends this far away
  scale: 0.5,          // model scale: twice the old 0.25, so the planes read as lower and closer (the bomber inherits it)
  soundGain: 0.3,      // propeller clip level: kept quiet
  refDist: 10,         // propeller sound: linear falloff from refDist to maxDist, so it is loudest when overhead
  maxDist: 400,
};
// Bomber: the same Ju87 flies the same kind of pass, but its first pass is fixed at 20 s into play, with its own clip
// (effects/flyover.js). Everything else, including the colour and the random gap between later passes, is shared with FLYOVER.
// Bomber: the Junkers Ju52 (models/ju52.json, baked from junkers-ju-52.zip at its real 18.9 m length) flies the pass with
// its own clip; first pass fixed at 20 s into play, then every 2–3 min. Everything else is shared with FLYOVER.
export const BOMBER = { ...FLYOVER, firstPass: 20, minWait: 120, maxWait: 180, soundGain: 0.9 };   // louder than the plane's 0.3
export const CHATTER_RADIUS = 40;   // German conversations (chatter.js) are heard within this distance of the speaker, in metres

// weapon table: index 0 = Kar98k, 1 = MP40, 2 = stielhandgranate. dmg per bullet; fov is the zoomed field of view; auto = fires while held.
// hip/adsY/adsZ are the viewmodel offsets; kz/kr are recoil kick (position/rotation). adsAim: radians the whole gun is turned
// up about the eye at full aim, so the tip of the front sight sits on the screen centre, where the shot goes (the sight
// picture itself is unchanged).
export const WEAPON_DEFS = [
  { id: 'k98', name: 'KAR 98K', mag: 5, ammo: 5, reserve: 45, max: 45, dmg: 55, auto: false, fov: 36, hip: [0.15, -0.165, -0.40], hipYaw: 0.075, adsY: -0.0765, adsZ: -0.36, adsTilt: 0.02, adsAim: 0.038, kz: 0.07, kr: 0.1 },
  { id: 'mp40', name: 'MP 40', mag: 32, ammo: 32, reserve: 128, max: 128, dmg: 34, auto: true, fov: 47, hip: [0.17, -0.14, -0.41], hipYaw: 0.075, adsY: -0.0702, adsZ: -0.36, adsTilt: 0.038, adsAim: 0.025, kz: 0.03, kr: 0.03 },
  // index 2 = Stielhandgranate. Each throw uses the grenade in hand (mag 1); the next one is readied from reserve. No sights, no direct damage.
  { id: 'gren', kind: 'grenade', name: 'GRENADE', mag: 1, ammo: 1, reserve: 2, max: 2, dmg: 0, auto: false, fov: 62, hip: [0.15, -0.17, -0.52], hipYaw: 0.1, adsY: -0.17, adsZ: -0.38, kz: 0, kr: 0 },
];

// Kar98 reload sound: the clip has two sections with a quiet gap between them. The first section (0 to K98_RELOAD_SPLIT_T s of the clip) plays as the bolt is pulled back; the second (from K98_RELOAD_SPLIT_T) plays when the bolt cocks back, K98_RELOAD_COCK_T s into the reload.
export const K98_RELOAD_SPLIT_T = 0.66;
export const K98_RELOAD_COCK_T = 1.75;
// size of the viewmodel muzzle flash planes (guns.js flashes()); 1.5 = half as big again on top of the previous size
export const FLASH_SIZE = 1.5;
// level of the German death clips (audio.js SFX.death); half the earlier 0.4
export const DEATH_GAIN = 0.2;
// enemy weapon handling, mirroring the player's: magazine size and reload length (s) per weapon. The Kar98 also cycles its bolt after every shot.
export const ENEMY_WEAPON = { k98: { mag: 5, reloadT: 2.65 }, mp40: { mag: 32, reloadT: 2.3 } };
export const ENEMY_HANDLING_GAIN = 0.5 / 3;   // level of enemy bolt (cocking), reload and clip sounds relative to the distance-scaled level; was 0.5, now a third of that
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

// where the enemy's hands sit on each gun, in gun space (metres, muzzle along -z): the player's grip point plus its HAND_OFFSETS offset for each hand.
// The rigged enemies (enemies/rig.js) put their hands on these points with IK every frame: change them freely, no re-bake.
export const ENEMY_GRIPS = {
  k98: { R: [0.086, -0.053, 0.185], L: [-0.034, -0.057, -0.22] },
  mp40: { R: [0.099, -0.089, 0.271], L: [-0.052, -0.133, -0.071] },
};
// enemy grenadiers (spawns with `grenades: n`, enemies/grenadier.js). They throw the same Stielhandgranate as the player (GRENADE above) at a player who is in sight
// and between minRange and maxRange (the blast radius is GRENADE.radius, so keep minRange above it). Set `grenades` to 0 on every spawn to turn this off.
// They throw to flush the player out: once he has been out of sight of every alerted soldier for hiddenT s and has not fired
// for quietT s, the nearest soldier with a grenade in range throws one at him. One throw at a time for the whole squad,
// then squadCooldown s before anyone throws again.
export const ENEMY_GRENADE = {
  hiddenT: 7,                   // s the player must be out of every alerted soldier's sight
  quietT: 6,                    // s since the player last fired or threw
  squadCooldown: 10,            // s after a throw before any soldier may throw again
  minRange: 6, maxRange: 24,    // m from the player
  firstDelay: 4,                // s after he is alerted before his first throw is allowed
  holdT: 0.45, windT: 0.45,     // s with the grenade at the chest, then the arm cocked back
  throwT: 0.35,                 // s in the follow-through after release
  flightSpeed: 12,              // m/s the grenade covers over the ground (sets the flight time to the target)
  flightMin: 0.6, flightMax: 1.6,   // s clamp on the flight time
  scatter: 3,                   // m the landing point is off the player, at random (a landing 2 m away costs about 60 hp, 3 m about 50)
  allySafe: 5.5,                // m: he will not throw if another soldier is this close to the player (friendly fire)
  // the throw's body poses (hand positions, timing keys) are STANCES.nade and ANIMS.nade in enemies/poses.js
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

// HUD text: one serif face for every on-screen word (first installed family wins).
export const HUD_FONT = 'Garamond, "EB Garamond", "Cormorant Garamond", "Palatino Linotype", "Book Antiqua", Georgia, serif';
export const HUD_DAMAGE_FLASH = 0.5;   // s the compass wedge flashes toward the direction a hit came from
export const HUD_COL = { title: '#d8c42c', text: '#f2eee0', dim: '#c8c0a0', warn: '#d04030' };
export const HUD_RETICLE_ALPHA = 0.4;   // crosshair opacity (1 = solid)

// Kar98 stripper clip (the model's own): how far above its baked position (rounds down in the magazine) it ends when pressed in during reload, in metres
export const K98_CLIP_SEAT_Y = 0.09;
export const HUD_TEXT_SHARP = 1.5;      // HUD text edge contrast: 1 = plain antialiasing (softest), higher = crisper edges
