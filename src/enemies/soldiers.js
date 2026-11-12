// Enemy soldiers: the rigged German soldier (enemies/rig.js) with his gun, hit boxes that ride on his bones, and poseEnemy,
// which picks the stance (carry / aim blend, reload and grenade animations from enemies/poses.js) every frame.
import * as THREE from 'three';
import { V3, sstep, lerp, clamp } from '../core/util.js';
import { enemies, enemyParts } from '../core/state.js';
import { scene } from '../render/renderer.js';
import { SM, M } from '../render/materials.js';
import { addBaked } from '../render/baked.js';
import K98_MODEL from '../models/k98.json';
import MP40_MODEL from '../models/mp40.json';
import { ENEMY, ENEMY_GRENADE, ENEMY_GRIPS } from '../core/config.js';
import { LEVEL } from '../levels/index.js';
import { resetWeapon } from './weaponAnim.js';
import { makeWorldFlash } from '../weapons/guns.js';
import { makeRig, applyStance, resolveStance, blendStances, sampleAnim, handPoint, shiftStance } from './rig.js';
import { SOLDIER_TYPES } from './uniforms.js';
import { STANCES, ANIMS, NADE_TILT, WALK, TURN, KNEEL, HUNCH, LEAN, FLINCH, DEATH } from './poses.js';

// hit boxes on the bones: part = damage class (head / body / arm / leg, ENEMY hit multipliers). size [x, y, z] and at
// (centre, bone space) in metres; limb boxes with only `thick` run from the bone to its child bone.
const HITBOXES = [
  { bone: 'Head', part: 'head', size: [0.22, 0.27, 0.25], at: [0, 0.1, 0.01] },
  { bone: 'Spine2', part: 'body', size: [0.42, 0.24, 0.26], at: [0, 0.1, 0] },
  { bone: 'Spine1', part: 'body', size: [0.38, 0.15, 0.24], at: [0, 0.07, 0] },
  { bone: 'Spine', part: 'body', size: [0.36, 0.13, 0.24], at: [0, 0.06, 0] },
  { bone: 'Hips', part: 'body', size: [0.36, 0.16, 0.24], at: [0, -0.02, 0] },
  ...['Left', 'Right'].flatMap(s => [
    { bone: s + 'Arm', part: 'arm', thick: 0.11 }, { bone: s + 'ForeArm', part: 'arm', thick: 0.09 },
    { bone: s + 'UpLeg', part: 'leg', thick: 0.16 }, { bone: s + 'Leg', part: 'leg', thick: 0.12 },
    { bone: s + 'Foot', part: 'leg', size: [0.11, 0.1, 0.26], at: [0, -0.03, 0.06] },
  ]),
];
const HIT_MAT = new THREE.MeshBasicMaterial({ visible: false });
const hitGeoCache = {};
function hitBox(rig, h) {
  const b = rig.bones[h.bone]; if (!b) return null;
  let size = h.size, at = h.at;
  if (!size) {   // limb: from this bone's head to its child's, thickness across
    const c = b.children.find(o => o.isBone); const d = c ? c.position : new V3(0, -0.2, 0);
    size = [Math.max(Math.abs(d.x), h.thick), Math.max(Math.abs(d.y), h.thick), Math.max(Math.abs(d.z), h.thick)];
    at = [d.x / 2, d.y / 2, d.z / 2];
  }
  const key = size.join(',');
  const m = new THREE.Mesh(hitGeoCache[key] ||= new THREE.BoxGeometry(...size), HIT_MAT);
  m.position.set(...at); b.add(m);
  return m;
}

const rnd = ([a, b]) => a + Math.random() * (b - a);
export function refreshEnemyParts() { enemyParts.length = 0; for (const e of enemies) if (e.alive) enemyParts.push(...e.parts); }
export function resetEnemy(e) {
  Object.assign(e, {
    x: e.home.x, z: e.home.z, yaw: e.home.yaw, hp: ENEMY.maxHp, alive: true, alert: false, los: false, losT: Math.random() * 0.3,
    shootT: 1, walk: 0, mv: 0, aim: 0, fall: 0, fallV: 0, thud: false, flash: 0, grenades: e.home.grenades, gT: -1, nadeCd: ENEMY_GRENADE.firstDelay, throwPose: null, nadeReleased: false, burstLeft: 0, burstT: 0, burstMoving: false, stuckT: 0, sideT: 0, sideDir: 1, flinch: 0,
    pi: 0, waitT: Math.random() * 2, strafeT: 1 + Math.random() * 2, strafeDir: 0, posed: null,
    range: rnd(e.weapon === 'mp40' ? ENEMY.rangeMP40 : ENEMY.rangeK98),
    // hearing (enemies/hearing.js): seconds left on watch, and where the noise came from
    awareT: 0, heardX: 0, heardZ: 0,
    // tactics (enemies/tactics.js): tac = 'none' | 'move' | 'cover' | 'open' | 'chase' | 'evade'; cover = the chosen cover point
    tac: 'none', cover: null, phase: 'hide', phaseT: 0, coverT: 0, stayT: 0, thinkT: Math.random() * 0.5, moveT: 0, noLosT: 0,
    role: null, flankSide: 0, roleT: 0, supp: 0, evadeG: null, evadeT: 0, eye: 1.6,
    kneel: 0, kneelV: 0, lean: 0, leanV: 0, turnV: 0, turnPh: 0,
    // hit reaction and death
    hitPart: null, hitSide: 0, limpT: 0, death: null, deathSide: 1, dieT: 0, kneelD: 0,
  });
  e.body.rotation.set(0, 0, 0); e.body.position.set(0, 0, 0);
  resetWeapon(e);
}

// type = a key of SOLDIER_TYPES (enemies/uniforms.js): uniform sheet and layout; officer = the level's officer flag (no look of its own)
function addEnemy(x, z, yaw, patrol, officer, type = 'infantry', weapon = 'k98', grenades = 0) {
  const g = new THREE.Group(); scene.add(g);
  const body = new THREE.Group(); g.add(body);
  if (!SOLDIER_TYPES[type]) type = 'infantry';
  const e = { g, body, home: { x, z, yaw, grenades }, patrol: patrol || null, parts: [], officer, type };
  e.rig = makeRig(body, { body: SM.types[type], head: SM.head, helmet: SM.stahl }, SOLDIER_TYPES[type].layout);
  for (const h of HITBOXES) { const m = hitBox(e.rig, h); if (m) { m.userData = { enemy: e, part: h.part, side: h.bone.startsWith('Left') ? 1 : h.bone.startsWith('Right') ? -1 : 0 }; e.parts.push(m); } }
  // the gun: the same baked model as the player's, turned to point +z, with the grip at the gun group's origin
  e.rifle = new THREE.Group(); e.rifle.rotation.order = 'YXZ'; body.add(e.rifle);
  const rifleM = new THREE.Group(); rifleM.rotation.y = Math.PI; rifleM.position.z = 0.08; e.rifle.add(rifleM);
  const mp40 = weapon === 'mp40'; e.weapon = mp40 ? 'mp40' : 'k98';
  // hand points on this gun in gun-group space: the player's grip points, turned with rifleM (ENEMY_GRIPS in core/config.js)
  const G = ENEMY_GRIPS[e.weapon];
  e.grips = { R: [-G.R[0], G.R[1], -G.R[2] + 0.08], L: [-G.L[0], G.L[1], -G.L[2] + 0.08] };
  // the Kar98 model also carries the stripper clip (player reload only): the enemy rifle leaves it out
  const gunModel = mp40 ? MP40_MODEL : { meshes: K98_MODEL.meshes.filter(m => m.mat !== 'clip' && m.mat !== 'clipbrass') };
  const gunParts = addBaked(gunModel, rifleM, mp40 ? { metal: M.emetal, bolt: M.emetal } : { wood: M.erifle, metal: M.emetal });
  const rod = (r, z0, z1) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, z1 - z0, 8), M.emetal); m.rotation.x = Math.PI / 2; m.position.z = (z0 + z1) / 2; return m; };
  if (mp40) {
    // the baked slide moves back on each round; the magazine (not in the baked model) drops out and is replaced on reload
    e.bolt = gunParts[MP40_MODEL.meshes.findIndex(m => m.mat === 'bolt')];
    e.mag = new THREE.Mesh(new THREE.BoxGeometry(0.023, 0.19, 0.032), M.emetal); e.mag.position.set(0, -0.145, -0.157); rifleM.add(e.mag);
  } else {
    // the Kar98 bolt is not in the baked model: the same rod, sleeve and knob as the player's, turned and slid by weaponAnim.js
    e.bolt = new THREE.Group(); e.bolt.position.set(0, 0.008, -0.045); rifleM.add(e.bolt);
    e.bolt.add(rod(0.0095, -0.05, 0.05), rod(0.011, -0.075, -0.045));
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.045, 6), M.emetal); handle.rotation.z = Math.PI / 2 - 0.35; handle.position.set(0.028, -0.008, 0); e.bolt.add(handle);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6), M.emetal); knob.position.set(0.052, -0.017, 0); e.bolt.add(knob);
  }
  e.flashM = makeWorldFlash(e.rifle, mp40 ? 0.03 : 0.058, mp40 ? 0.55 : 0.86, 1);
  // the grenade in his throwing hand: canister on a wooden handle, placed at the fist by poseEnemy
  e.nade = new THREE.Group(); e.nade.visible = false; body.add(e.nade);
  const nHead = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.09, 8), M.grenadeMetal); nHead.position.y = 0.1;
  const nHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.14, 6), M.grenadeWood); nHandle.position.y = 0.01;
  e.nade.add(nHead, nHandle);
  enemies.push(e); resetEnemy(e);
}
for (const d of LEVEL.enemies) addEnemy(d.x, d.z, d.yaw, d.patrol, d.officer, d.type, d.weapon, d.grenades);
refreshEnemyParts();

// the stance this soldier shows right now, resolved and blended (also used by the pose editor through e.posed)
export function currentStance(e) {
  if (e.posed) return e.posed(e);   // debug/posetune.js override
  const set = e.throwPose ? 'nade' : e.weapon;
  const parts = { bolt: [0, 0, -(e.boltBack || 0) * 0.085], mag: [0, e.magY || 0, 0] };
  const get = name => resolveStance(STANCES[set][name], e.grips, parts);
  let st = e.throwPose ? sampleAnim(ANIMS.nade.throw, e.gT, get)
    : e.reloading ? sampleAnim(ANIMS[e.weapon].reload, e.rel, get)
    : blendStances(get('carry'), get('aim'), sstep(0.3, 0.85, e.aim));
  // kneeling (behind low cover, or a rifleman shooting at range), hunched down while he is not aiming
  if (e.kneelV > 0.01) {
    st = shiftStance(st, 0, KNEEL.drop * e.kneelV, KNEEL.bones, e.kneelV);
    const h = e.kneelV * (1 - sstep(0.3, 0.85, e.aim)); if (h > 0.01) st = shiftStance(st, 0, 0, HUNCH.bones, h);
  }
  // leaning round high cover: + to his left, - to his right
  if (Math.abs(e.leanV) > 0.01) st = shiftStance(st, LEAN.shift * e.leanV, 0, LEAN.bones, e.leanV);
  if (e.death) st = deathStance(e, st);
  return st;
}
// the limp pose as he goes down, and the drop onto the knees for that fall (enemies/death.js moves the body group)
function deathStance(e, st) {
  const D = DEATH[e.death], f = e.fall / (Math.PI / 2);
  if (e.death === 'knees') {
    st = shiftStance(st, 0, D.kneel.drop * e.kneelD, D.kneel.bones, e.kneelD);
    // as he pitches forward about the knees the shins stay flat on the ground: the knees open by the fall angle
    st = shiftStance(st, 0, 0, { LeftLeg: [-1, 0, 0], RightLeg: [-1, 0, 0] }, e.fall);
  }
  const side = { ...D.bones }; if (e.death === 'side') for (const k in side) side[k] = [side[k][0], side[k][1] * e.deathSide, side[k][2] * e.deathSide];
  return shiftStance(st, 0, 0, side, Math.max(f, e.death === 'knees' ? e.kneelD * 0.5 : 0));
}
const _hp = new V3();
// 0 walking .. 1 running, from his speed (WALK.run)
export const runBlend = e => (e.death ? 0 : sstep(WALK.run.from, WALK.run.to, e.mv));
export function poseEnemy(e) {
  let st = currentStance(e);
  // walk / run cycle, turning shuffle and flinch on top of the stance
  const extra = {}, R = WALK.run, run = runBlend(e), mv = e.mv;
  const add = (n, v, m) => { const a = extra[n] || [0, 0, 0]; extra[n] = [a[0] + v[0] * m, a[1] + v[1] * m, a[2] + v[2] * m]; };
  // the walk's swing grows with speed; the run's is fixed (R.hip, R.knee): faster steps, not wider ones
  const amp = lerp(WALK.hip * mv, R.hip, run), knee = lerp(WALK.knee, R.knee, run);
  for (let i = 0; i < 2; i++) {
    const s = i ? 'Right' : 'Left', ph = e.walk + i * Math.PI;
    extra[s + 'UpLeg'] = [-Math.sin(ph) * amp, 0, 0];
    extra[s + 'Leg'] = [(WALK.kneeBase + Math.max(0, Math.cos(ph)) * knee) * mv, 0, 0];
  }
  if (mv > 0.01 && !e.death) {
    // the body goes down as the legs spread (feet stay on the ground) and bounces at each footfall; hips turn and roll with the step
    const spread = Math.abs(Math.sin(e.walk));
    const bob = WALK.leg * (1 - Math.cos(amp * spread)) + lerp(WALK.bounce, R.bounce, run) * mv * spread;
    st = shiftStance(st, 0, bob, {}, 0);
    const tw = Math.sin(e.walk) * WALK.twist * mv, roll = Math.cos(e.walk) * WALK.sway * mv * (1 - run * 0.5);
    add('Hips', [0, tw, roll], 1); add('Spine', [0, -tw * 0.8, -roll * 0.7], 1);
    for (const n in R.lean) add(n, R.lean[n], run);
  }
  // turning on the spot: the feet step in turn
  const turn = clamp((e.turnV - TURN.minRate) / (TURN.fullRate - TURN.minRate), 0, 1) * (1 - clamp(mv * 3, 0, 1)) * (1 - e.kneelV);
  if (turn > 0 && !e.death) for (let i = 0; i < 2; i++) {
    const s = i ? 'Right' : 'Left', l = Math.max(0, Math.sin(e.turnPh + i * Math.PI)) * turn;
    add(s + 'UpLeg', [-TURN.hip, 0, 0], l); add(s + 'Leg', [TURN.knee, 0, 0], l);
  }
  // flinch by where he was hit (FLINCH in poses.js): head snaps back, body doubles over, the hit shoulder twists back, the hit leg buckles
  let drop = 0;
  if (e.flinch > 0 && e.hitPart) {
    const F = FLINCH[e.hitPart], k = Math.sin(Math.min(1, e.flinch) * Math.PI / 2);
    for (const n in F.bones || {}) add(n, F.bones[n], k);
    for (const n in F.sided || {}) add(n, F.sided[n], k * e.hitSide);
    if (F.legBones) { const s = e.hitSide > 0 ? 'Left' : 'Right'; for (const n in F.legBones) add(s + n, F.legBones[n], k); }
    drop = (F.drop || 0) * k * (1 - e.kneelV);
  }
  applyStance(e.rig, e.rifle, st, { bones: extra, drop });
  // the grenade sits in the throwing fist until it is released
  const showNade = !!e.throwPose && !e.nadeReleased;
  e.nade.visible = showNade;
  if (showNade) { e.body.worldToLocal(handPoint(e.rig, 'R', _hp)); e.nade.position.copy(_hp); e.nade.rotation.set(NADE_TILT[e.throwPose] || 0, 0, 0); }
}
