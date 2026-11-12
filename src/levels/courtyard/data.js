// Courtyard level: everything that belongs to this map and not to the game's systems. Data only, no imports.
// A new level copies this file's shape (see levels/README.md); the systems read it through LEVEL (levels/index.js).
const E = Math.PI / 2;

export const id = 'courtyard';
export const name = 'Courtyard 1944';

// player start: just behind the Polish truck's tailgate (truck along z at x 17.3, tailgate about z -11.5), facing the fountain at (0, -3)
export const spawn = { x: 17.3, z: -13, yaw: Math.atan2(17.3, -10) };

// title screen: the camera circles `center` at `radius`, looking at `look`
export const titleCam = { center: [0, -3], radius: 15, height: 3.4, look: [0, 2.2, -3] };

// fixed lighting (render/renderer.js worldL / gunL uniforms)
export const light = {
  ambient: [0.2, 0.235, 0.36],
  sunDir: [-0.266, 0.469, -0.842],
  sunCol: [0.5, 0.56, 0.8],
  gunSunDir: [-0.5, 0.8, 0.35],
};

// searchlights (effects/searchlight.js): the beams sweep around `aim`; null = none on this level
export const searchlights = { aim: [-30, 45, 0] };

// building footprints in metres (x0..x1, z0..z1): the distant air siren fades out while the player is inside one
export const indoors = [
  { x0: -20, x1: 20, z0: -26, z1: -20 },   // manor
  { x0: 20, x1: 26, z0: -20, z1: 12 },     // stable
  { x0: -63, x1: -31, z0: -16, z1: -10 },  // barracks in the enemy yard
];

// German radio set on top of the crate stack in the enemy yard; the chatter loop plays from here. null = no radio.
// y is the top of the crate stack (crate at y 1.4, size 1.0).
export const RADIO = { x: -47.5, y: 1.2, z: 2 };

// enemy navigation (enemies/ai.js). zones: areas as {x0, x1, z0, z1} (missing sides are open); the first zone that
// contains a point owns it, so list the open-ended ones before a catch-all. links: how to get from one zone to the
// next: `via` is one or two points; the soldier heads for via[0] until within 1.2 m of it, then for via[1].
// A soldier in the player's zone (or with no path) goes straight for the player.
export const nav = {
  zones: [
    { name: 'manor yard', x0: -21 },
    { name: 'enemy yard', x1: -32 },
    { name: 'archway' },
  ],
  links: [
    { from: 0, to: 2, via: [{ x: -20.4, z: 10.5 }, { x: -32.6, z: 10.5 }] },
    { from: 2, to: 0, via: [{ x: -20.4, z: 10.5 }] },
    { from: 2, to: 1, via: [{ x: -32.6, z: 10.5 }] },
    { from: 1, to: 2, via: [{ x: -32.6, z: 10.5 }, { x: -20.4, z: 10.5 }] },
  ],
};

// enemy placement. yaw is radians (PI/2 = facing east); patrol = list of [x, z] points or null; type = SOLDIER_TYPES key (enemies/uniforms.js)
// weapon: 'mp40' for a submachine gun; omitted = Kar98k. grenades: n Stielhandgranaten he throws (ENEMY_GRENADE in core/config.js); omitted = none.
export const enemies = [
  // three stand around the radio (RADIO), facing the passage (+x); three patrol across the middle of the yard
  { x: -50.2, z: 0.6,  yaw: E, patrol: null, officer: false, type: 'infantry', grenades: 1 },
  { x: -48.9, z: -1.7, yaw: E, patrol: null, officer: false, type: 'infantry' },
  { x: -50.0, z: 4.2,  yaw: E, patrol: null, officer: false, type: 'infantry', grenades: 1 },
  // the three walkers take different, crossing routes so they never walk in step or in parallel
  { x: -45.2, z: 0.9,  yaw: E, patrol: [[-45.2, 0.9], [-37, -5.5], [-41, 6.5]], officer: false, type: 'infantry', grenades: 1 },
  { x: -46.4, z: -2.4, yaw: E, patrol: [[-46.4, -2.4], [-35.5, 2.5]], officer: true, weapon: 'mp40', type: 'infantry' },
  { x: -46.2, z: 4.6,  yaw: E, patrol: [[-46.2, 4.6], [-40, -7], [-34, 1]], officer: false, type: 'infantry', grenades: 1 },
];
