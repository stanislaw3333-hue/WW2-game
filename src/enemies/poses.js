// Enemy soldier stances and animations. Data only, no imports. Tune these in the game with the pose editor
// (?test, press N; see src/debug/posetune.js), which prints a block to paste back here.
//
// Body space: metres, origin between the feet, x = the soldier's LEFT, y = up, z = the way he faces.
// A stance:
//   gun    { pos: [x, y, z], rot: [x, y, z] }  where the gun's grip origin sits in body space; rot is radians, Euler YXZ.
//          The enemy gun points +z. null = no gun in the hands (hidden), e.g. the grenade throw.
//   hands  { R, L }: where each hand goes. 'grip' = the player's grip point on this gun (ENEMY_GRIPS in core/config.js);
//          { gun: [x, y, z] } a point in gun space; { bolt: [...] } / { mag: [...] } a point that moves with that part;
//          { body: [x, y, z] } a fixed point in body space. Omitted = 'grip'.
//   poles  { R, L }: body-space points the elbows point towards (default R [-0.55, 1.2, 0], L [0.55, 1.2, 0]).
//   bones  { BoneName: [x, y, z] } extra turns in radians (Euler YXZ, body axes): Spine, Spine1, Spine2, Neck, Head,
//          Hips, LeftShoulder, RightShoulder, LeftUpLeg, LeftLeg, LeftFoot, ... (all names: BONE_NAMES in enemies/rig.js).
//          Arm, ForeArm and Hand bones are set by the IK, so turns on them are overwritten.
//   curl / thumb { R, L }: 0 open .. 1 closed fist.   twist { R, L }: forearm roll, radians.   wrist { R, L }: hand turn [x, y, z].
// Keys missing from a stance take the defaults above, so a stance only lists what it changes.

const k98Carry = { gun: { pos: [0, 1.07, 0.2], rot: [0.45, 0.65, 0] }, bones: { Head: [0.02, 0, 0] } };
const k98Aim = {
  gun: { pos: [-0.085, 1.5, 0.25], rot: [0, 0.05, 0] },
  poles: { R: [-0.45, 0.85, -0.3], L: [0.5, 0.85, 0.1] },   // trigger elbow low and back, support elbow low and out
  bones: { Spine1: [0.04, 0.12, 0], Head: [0.1, -0.12, -0.1] },   // shoulders turn into the gun, cheek down on the stock
};

// where his gun is while he throws (his left hand on its fore grip): low at his left hip, muzzle up and forward
const NADE_GUN = {
  hold: { pos: [0.2, 0.82, 0.02], rot: [-1.05, 0.15, 0.2] },
  wind: { pos: [0.22, 0.88, 0.08], rot: [-0.95, 0.1, 0.25] },
  throw: { pos: [0.2, 0.82, 0.0], rot: [-1.1, 0.2, 0.2] },
};

export const STANCES = {
  k98: {
    carry: k98Carry,
    aim: k98Aim,
    // reload: rifle tipped up across the chest, right hand on the bolt knob (follows the bolt back and forward)
    reload: { gun: { pos: [0.02, 1.12, 0.3], rot: [0.15, 0.45, -0.35] }, hands: { R: { bolt: [-0.052, -0.009, 0.125] } }, bones: { Head: [0.35, 0.1, 0] } },
    // stripper clip: right hand pushes down on the top of the open receiver
    reloadClip: { gun: { pos: [0.02, 1.12, 0.3], rot: [0.15, 0.45, -0.35] }, hands: { R: { gun: [0, 0.07, 0.1] } }, curl: { R: 0.4 }, bones: { Head: [0.35, 0.1, 0] } },
  },
  mp40: {
    carry: { gun: { pos: [0, 1.07, 0.2], rot: [0.45, 0.65, 0] }, bones: { Head: [0.02, 0, 0] } },
    aim: { ...k98Aim, gun: { pos: [-0.085, 1.5, 0.25], rot: [0, 0.05, 0] } },
    // reload: gun held up and turned so he can see the magazine well; left hand on the magazine (drops and rises with it)
    reload: { gun: { pos: [0.02, 1.15, 0.3], rot: [0.1, 0.4, -0.3] }, hands: { L: { mag: [0, -0.24, 0.237] } }, bones: { Head: [0.35, 0.1, 0] } },
  },
  nade: {
    // Stielhandgranate throw: R = the throwing hand (holds the grenade); L keeps hold of his gun by its fore grip, low at his
    // left side with the muzzle tipped up and forward (NADE_GUN), out of the way of the throw
    hold: { gun: NADE_GUN.hold, hands: { R: { body: [-0.20, 1.18, 0.30] }, L: 'grip' }, poles: { R: [-0.55, 1.0, 0.0], L: [0.6, 1.0, -0.2] } },
    wind: { gun: NADE_GUN.wind, hands: { R: { body: [-0.28, 1.78, -0.26] }, L: 'grip' }, poles: { R: [-0.7, 1.55, -0.35], L: [0.6, 1.0, 0.1] }, bones: { Spine1: [-0.1, 0.3, 0] } },
    throw: { gun: NADE_GUN.throw, hands: { R: { body: [-0.18, 1.52, 0.57] }, L: 'grip' }, poles: { R: [-0.5, 1.25, 0.2], L: [0.6, 1.0, -0.1] }, bones: { Spine1: [0.15, -0.25, 0] } },
  },
};

// reference poses for screenshots and model checks (the pose editor and __g.lineup); not used in play
STANCES.ref = {
  // T-pose: the rest pose, arms straight out sideways, no gun
  tpose: { gun: null, hands: { R: { body: [-0.74, 1.449, -0.006] }, L: { body: [0.74, 1.449, -0.005] } }, curl: { R: 0.1, L: 0.1 }, thumb: { R: 0.1, L: 0.1 } },
};

// grenade-in-hand turn about x for each throw stance (negative = head back), and where the grenade sits relative to the fist
export const NADE_TILT = { hold: 0, wind: -0.9, throw: 0.6 };

// Animations: keys are [seconds, stance name] in the soldier's own stance set (k98 / mp40 / nade); the body blends
// smoothly from one key to the next. Times line up with the gun-part timings in enemies/weaponAnim.js and ENEMY_WEAPON
// (reloads) and ENEMY_GRENADE holdT / windT / throwT (the throw, which releases at holdT + windT = 0.9 s).
export const ANIMS = {
  k98: {
    reload: { keys: [[0, 'carry'], [0.35, 'reload'], [0.7, 'reload'], [0.8, 'reloadClip'], [1.3, 'reloadClip'], [1.45, 'reload'], [2.15, 'reload'], [2.65, 'carry']] },
  },
  mp40: {
    reload: { keys: [[0, 'carry'], [0.3, 'reload'], [1.4, 'reload'], [1.8, 'carry'], [2.3, 'carry']] },
  },
  nade: {
    throw: { keys: [[0, 'hold'], [0.45, 'hold'], [0.8, 'wind'], [0.9, 'wind'], [1.0, 'throw'], [1.25, 'throw']] },
  },
};

// walk cycle (added on top of any stance), per unit of walking speed (e.mv 0..1, 1 = 3 m/s):
//   hip / knee: thigh swing and knee bend (radians); kneeBase: knees always a little bent while moving
//   rate: cycle phase per metre walked (enemies/ai.js); leg: hip-to-ankle length, used to lower the hips as the legs spread so
//   the feet stay on the ground; bounce: extra drop of the whole body (gun and hands too) at each footfall (m)
//   twist: hips turn with the swinging leg (shoulders turn back against it); sway: hips roll over the standing leg
// run: from e.mv `from` to `to` the walk blends into a run, which is the walk sped up: the thigh swing stays at `hip` radians
// (not scaled by speed) and the steps come faster (rate times `stride`), with a slight forward lean
export const WALK = {
  hip: 0.6, knee: 0.95, kneeBase: 0.08, rate: 2.6, leg: 0.89, bounce: 0.015, twist: 0.1, sway: 0.05,
  run: { from: 0.55, to: 0.95, hip: 0.38, knee: 0.95, stride: 1.35, bounce: 0.02, lean: { Spine: [0.1, 0, 0], Spine1: [0.04, 0, 0], Head: [-0.1, 0, 0] } },
};
// turning on the spot: the feet step in turn, stepRate steps a second while he turns. The shuffle starts at minRate rad/s
// and is full at fullRate; hip / knee: how far the stepping leg lifts.
export const TURN = { stepRate: 3.2, minRate: 0.5, fullRate: 2.2, hip: 0.3, knee: 0.65 };

// ---- modifiers laid over whatever stance he is in (carry, aim, reload, throw), by enemies/soldiers.js currentStance.
// drop: metres the hips (and the gun and hands with them) go down. bones: turns as in a stance, scaled by how far in he is.
// Leg turns about x: negative swings the thigh forward, positive bends the knee (shin back).

// kneeling on the right knee: right thigh straight down, shin flat behind; left thigh forward, shin upright
export const KNEEL = {
  drop: 0.42,
  bones: { LeftUpLeg: [-1.42, 0, 0], LeftLeg: [1.42, 0, 0], RightUpLeg: [-0.12, 0, 0], RightLeg: [1.62, 0, 0], RightFoot: [-0.7, 0, 0], Spine: [0.06, 0, 0] },
};
// ducked down in cover (on top of KNEEL, scaled by how far he is from aiming): hunched forward, head down
export const HUNCH = { bones: { Spine: [0.3, 0, 0], Spine1: [0.22, 0, 0], Head: [-0.15, 0, 0] } };
// leaning out to his LEFT round cover (negated for a lean to the right): upper body rolls over, gun and hands follow by `shift` m
export const LEAN = { shift: 0.26, bones: { Spine: [0, 0, -0.3], Spine1: [0, 0, -0.22], Head: [0, 0, 0.3] } };

// flinch when hit, by hit box class, at full strength (fades out over about a third of a second). side = +1 hit on his left, -1 right:
// the arm and leg turns are multiplied by it. drop: hips sag (a leg hit).
export const FLINCH = {
  head: { bones: { Head: [-0.7, 0, 0], Neck: [-0.3, 0, 0], Spine2: [-0.12, 0, 0] }, rock: 0.25 },
  body: { bones: { Spine: [0.32, 0, 0], Spine1: [0.25, 0, 0], Head: [0.2, 0, 0] }, rock: -0.1 },
  arm: { sided: { Spine1: [0, 0.45, 0], Spine2: [0, 0.3, 0.12], Head: [0, -0.2, 0] }, rock: 0.05 },
  leg: { sided: { Spine: [0, 0, 0.16] }, legBones: { UpLeg: [-0.45, 0, 0], Leg: [1.0, 0, 0] }, drop: 0.14, rock: 0 },
};

// deaths (enemies/death.js). The body group tips over by up to 90 degrees about `pivot` (body space, metres) on `axis`:
// x = 1 forward, -1 backward; z = 1 to his right, -1 to his left (side falls pick a side at random). bones: the limp pose
// laid over the stance as he goes down (scaled by how far down he is). lift: metres the lying body is raised so it rests on
// the floor instead of sinking into it ([falling to his left, to his right] for side falls). knees: drops to both knees
// first (`kneel` pose), then pitches forward about the knees.
export const DEATH = {
  // on his back: chin a little forward so the head rests on the floor, knees slightly up
  back: { axis: [-1, 0], pivot: [0, 0, 0], lift: 0.13, bones: { Spine: [0.05, 0, 0], Head: [0.3, 0, 0], LeftUpLeg: [-0.2, 0, 0], RightUpLeg: [-0.12, 0, 0], LeftLeg: [0.25, 0, 0], RightLeg: [0.12, 0, 0] } },
  // face down: head turned to one side
  front: { axis: [1, 0], pivot: [0, 0, 0.05], lift: 0.27, bones: { Spine: [-0.05, 0, 0], Spine1: [-0.05, 0, 0], Head: [-0.45, 0.5, 0], LeftUpLeg: [-0.25, 0, 0], RightUpLeg: [-0.18, 0, 0] } },
  side: { axis: [0, 1], pivot: [0, 0, 0], lift: [0.26, 0.37], bones: { Spine: [0, 0, 0.05], Head: [0, 0.3, 0], LeftUpLeg: [0, 0, -0.2], RightUpLeg: [0, 0, -0.2] } },
  knees: {
    axis: [1, 0], pivot: [0, 0.08, 0.12], lift: 0.23, bones: { Spine: [0.35, 0, 0], Head: [0.35, 0, 0] },
    kneel: { drop: 0.44, bones: { LeftUpLeg: [-0.1, 0, 0], LeftLeg: [1.62, 0, 0], RightUpLeg: [-0.1, 0, 0], RightLeg: [1.62, 0, 0], LeftFoot: [-0.7, 0, 0], RightFoot: [-0.7, 0, 0], Spine: [0.15, 0, 0], Head: [0.3, 0, 0] } },
  },
};
