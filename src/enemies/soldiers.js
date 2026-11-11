// Enemy soldiers: procedural bodies with hit boxes, the baked Panzergrenadier models, arm IK, AI, shouting, and combat.
import * as THREE from 'three';
import { V3, lerp } from '../core/util.js';
import { enemies, enemyParts } from '../core/state.js';
import { scene, mat } from '../render/renderer.js';
import { SM, M } from '../render/materials.js';
import { addBaked } from '../render/baked.js';
import { atlasUV } from '../packtex.js';
import { bodyGeos, headGeos, helmetGeos, capGeos } from '../soldierGeo.js';
import K98_MODEL from '../models/k98.json';
import PG_MODEL from '../models/pg.json';
import PGA_MODEL from '../models/pga.json';
import { ENEMY, ENEMY_SPAWNS } from '../core/config.js';

const SB = bodyGeos(), SH = headGeos(), SHM = helmetGeos(), SC = capGeos();
const HEAD_SCALE = 1.2;   // skull and features are enlarged so the head fills the helmet; helmet and cap keep their size
// uniform details: left-arm band (a cylinder arc around the sleeve) and officer shoulder boards
const ARMBAND_GEO = new THREE.CylinderGeometry(0.0605, 0.0605, 0.1, 20, 1, true, Math.PI / 2 - 1.15, 2.3);
const BOARD_GEO = new THREE.BoxGeometry(0.075, 0.022, 0.06);
let ARMBAND_MAT = null;
// red armband with white disc and black swastika, painted once on a canvas and shared by every soldier
function armbandMat() {
  if (ARMBAND_MAT) return ARMBAND_MAT;
  const c = document.createElement('canvas'); c.width = 192; c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#9a1212'; x.fillRect(0, 0, 192, 128);
  x.fillStyle = '#ece8dc'; x.beginPath(); x.arc(96, 64, 46, 0, Math.PI * 2); x.fill();
  x.save(); x.translate(96, 64); x.strokeStyle = '#0d0d0d'; x.lineWidth = 11; x.lineJoin = 'miter';
  for (let k = 0; k < 4; k++) { x.rotate(Math.PI / 2); x.beginPath(); x.moveTo(0, -6); x.lineTo(0, -32); x.lineTo(24, -32); x.stroke(); }
  x.restore();
  const tex = new THREE.CanvasTexture(c); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
  ARMBAND_MAT = mat(tex, { affine: 0, emis: 0.16 });
  return ARMBAND_MAT;
}
// jacket and sleeves are laid out on the pack's soldier atlas (torso centre, arms out to each side)
atlasUV(SB.jacket, 0.30, 0.70, 0.02, 0.98);
// skull: the face part of the pack's head map (eyes, nose and mouth sit in the upper-middle of the sheet)
for (const k of ['shoulder', 'upper', 'fore']) if (SB[k]) atlasUV(SB[k], 0.02, 0.28, 0.25, 0.75);
const SG = {};
SG.flash = new THREE.PlaneGeometry(0.5, 0.5);

export function refreshEnemyParts() { enemyParts.length = 0; for (const e of enemies) if (e.alive) enemyParts.push(...e.parts); }
export function resetEnemy(e) {
  Object.assign(e, {
    x: e.home.x, z: e.home.z, yaw: e.home.yaw, hp: ENEMY.maxHp, alive: true, alert: false, los: false, losT: Math.random() * 0.3,
    shootT: 1, walk: 0, mv: 0, aim: 0, fall: 0, fallV: 0, thud: false, flash: 0, stuckT: 0, sideT: 0, sideDir: 1, flinch: 0,
    pi: 0, waitT: Math.random() * 2, strafeT: 1 + Math.random() * 2, strafeDir: 0, range: 9 + Math.random() * 7,
  });
  e.body.rotation.x = 0; e.body.position.y = 0;
}
// hit boxes: the procedural soldier parts are kept for raycasting but drawn with this invisible material
const HIT_MAT = new THREE.MeshBasicMaterial({ visible: false });
// look = { uni: 0 dark | 1 field-grey, face: 0..3 }; officer = peaked cap, otherwise steel helmet
function addEnemy(x, z, yaw, patrol, officer, look = {}) {
  const g = new THREE.Group(); scene.add(g);
  const body = new THREE.Group(); g.add(body);
  const e = { g, body, home: { x, z, yaw }, patrol: patrol || null, parts: [] };
  const U = SM.uni[look.uni || 0], F = SM.face[look.face || 0];
  const mk = (geo, material, parent, name, px = 0, py = 0, pz = 0) => {
    const m = new THREE.Mesh(geo, material); m.position.set(px, py, pz); parent.add(m);
    m.userData = { enemy: e, part: name }; e.parts.push(m); return m;
  };
  const grp = (parent, px, py, pz) => { const p = new THREE.Group(); p.position.set(px, py, pz); parent.add(p); return p; };
  // legs: trousers -> bloused turn-in -> boot shaft -> shaped foot with sole and heel
  e.legs = [1, -1].map(s => {
    const hip = grp(body, s * 0.105, 0.9, 0); mk(SB.thigh, U.trouser, hip, 'leg');
    const knee = grp(hip, 0, -0.44, 0); mk(SB.blouse, U.trouser, knee, 'leg'); mk(SB.shaft, SM.boot, knee, 'leg');
    const foot = grp(knee, 0, -0.408, 0.004); mk(SB.foot, SM.boot, foot, 'leg'); mk(SB.sole, SM.leather, foot, 'leg'); mk(SB.heel, SM.leather, foot, 'leg');
    return { hip, knee };
  });
  // torso + kit
  mk(SB.jacket, U.tunic, body, 'body');
  mk(SB.neck, F.skin, body, 'head');
  mk(SB.belt, SM.belt, body, 'body');
  mk(SB.buckle, SM.metal, body, 'body', 0, 1.01, 0.137);
  mk(SB.pouches, SM.leather, body, 'body');
  mk(SB.breadbag, SM.canvas, body, 'body', -0.05, 0.88, -0.152).rotation.y = 0.05;
  const cn = mk(SB.canteen, SM.felt, body, 'body', 0.155, 0.9, -0.118); cn.rotation.y = -0.4;
  const by = mk(SB.bayonet, SM.leather, body, 'body', -0.185, 0.98, 0.02); by.rotation.z = 0.06;
  // officer shoulder boards with a piped edge
  if (officer) for (const s of [-1, 1]) { const b = mk(BOARD_GEO, SM.band, body, 'body', s * 0.15, 1.44, 0); b.rotation.z = -s * 0.2; mk(new THREE.BoxGeometry(0.077, 0.004, 0.062), SM.metal, body, 'body', s * 0.15, 1.452, 0).rotation.z = -s * 0.2; }
  // head
  const head = grp(body, 0, 1.645, 0); e.head = head;
  const face = grp(head, 0, 0, 0); face.scale.setScalar(HEAD_SCALE);
  mk(SH.skull, SM.shadow, face, 'head'); mk(SH.features, SM.shadow, face, 'head');
  if (officer) {
    const cap = grp(head, 0, 0.056, -0.008); cap.rotation.x = 0.02;
    mk(SC.band, SM.band, cap, 'head'); mk(SC.crown, SM.cap, cap, 'head'); mk(SC.piping, SM.metal, cap, 'head');
    const pk = mk(SC.peak, SM.peak, cap, 'head', 0, 0.004, 0.106); pk.rotation.x = 0.2;
    mk(SC.badge, SM.metal, cap, 'head', 0, 0.026, 0.1135); mk(SC.cord, SM.metal, cap, 'head');
  } else {
    const hm = grp(head, 0, 0.012, -0.018);
    mk(SHM.dome, SM.stahl, hm, 'head'); mk(SHM.rim, SM.stahl, hm, 'head');
    for (const s of [-1, 1]) mk(SHM.vent, SM.metal, hm, 'head', s * 0.113, 0.07, 0.0);
    mk(SHM.strap, SM.leather, head, 'head');
  }
  // arms: sleeve + bare fist; posed by IK in poseEnemy
  e.arms = [1, -1].map(s => {
    mk(SB.shoulder, U.sleeve, body, 'arm', s * 0.215, 1.405, 0);
    const up = grp(body, s * 0.226, 1.41, 0); mk(SB.upper, U.sleeve, up, 'arm');
    if (s === 1) mk(ARMBAND_GEO, armbandMat(), up, 'arm', 0, -0.09, 0);   // swastika armband on the left upper arm
    const fo = grp(body, 0, 0, 0); mk(SB.fore, U.sleeve, fo, 'arm'); mk(SB.hand, F.skin, fo, 'arm', 0, -0.28, 0);
    return { S: new V3(s * 0.226, 1.41, 0), up, fo, pole: new V3(s * 0.55, -1, -0.25) };
  });
  e.rifle = grp(body, 0, 1.1, 0.2); e.rifle.rotation.order = 'YXZ';
  // the same baked Kar98k as the player's, turned to point +z, with the grip at the rifle origin the hands are placed on
  const rifleM = new THREE.Group(); rifleM.rotation.y = Math.PI; rifleM.position.z = 0.08; e.rifle.add(rifleM);
  addBaked(K98_MODEL, rifleM, { wood: M.erifle, metal: M.emetal });
  e.flashM = new THREE.Group(); e.flashM.position.set(0, 0.058, 0.86); e.flashM.visible = false; e.rifle.add(e.flashM);
  for (const ry of [0, Math.PI / 2]) { const f = new THREE.Mesh(SG.flash, M.eflash); f.rotation.y = ry; e.flashM.add(f); }
  // visible body: the Panzergrenadier in two baked poses, carried and shouldered (poseEnemy swaps them);
  // the procedural parts above only take hits
  const bodyMats = { uniform: U.tunic, helmet: SM.stahl, leather: SM.leather };
  e.carryBody = addBaked(PG_MODEL, body, bodyMats);
  e.aimBody = addBaked(PGA_MODEL, body, bodyMats);
  for (const m of e.aimBody) m.visible = false;
  for (const m of e.parts) m.material = HIT_MAT;
  enemies.push(e); resetEnemy(e);
}
for (const d of ENEMY_SPAWNS) addEnemy(d.x, d.z, d.yaw, d.patrol, d.officer, d.look);
refreshEnemyParts();

// two-bone arm IK in body space: shoulder a.S -> elbow -> hand target H
const DOWN = new V3(0, -1, 0), ikD = new V3(), ikE = new V3(), ikT = new V3(), ikH = new V3(), ikR = new V3(), ikL = new V3();
function armIK(a, H) {
  const L1 = 0.3, L2 = 0.33;
  ikD.subVectors(H, a.S); let d = ikD.length(); const dm = L1 + L2 - 0.004;
  if (d > dm) { ikD.multiplyScalar(dm / d); d = dm; }
  ikH.copy(a.S).add(ikD);
  const a1 = (L1 * L1 - L2 * L2 + d * d) / (2 * d), hgt = Math.sqrt(Math.max(0, L1 * L1 - a1 * a1));
  ikD.multiplyScalar(1 / d);
  ikE.copy(a.pole).addScaledVector(ikD, -a.pole.dot(ikD)).normalize().multiplyScalar(hgt).addScaledVector(ikD, a1).add(a.S);
  a.up.quaternion.setFromUnitVectors(DOWN, ikT.subVectors(ikE, a.S).normalize());
  a.fo.position.copy(ikE); a.fo.quaternion.setFromUnitVectors(DOWN, ikT.subVectors(ikH, ikE).normalize());
}
export function poseEnemy(e) {
  const a = e.aim, w = e.walk, mv = e.mv;
  e.legs.forEach((l, i) => {
    const ph = w + i * Math.PI;
    l.hip.rotation.x = -Math.sin(ph) * 0.6 * mv;
    l.knee.rotation.x = (0.08 + Math.max(0, Math.cos(ph)) * 0.95) * mv;
  });
  // rifle and body switch together: carried low, or shouldered once aiming. The baked hands sit on the rifle in each pose (bake2.py),
  // so the rifle snaps between the two rather than sliding, which would take the hands off it
  const shouldered = a > 0.5;
  for (const m of e.carryBody) m.visible = !shouldered;
  for (const m of e.aimBody) m.visible = shouldered;
  if (shouldered) { e.rifle.position.set(-0.085, 1.4, 0.31); e.rifle.rotation.set(0, 0.05, 0); }
  else { e.rifle.position.set(0, 1.07, 0.2); e.rifle.rotation.set(0.45, 0.65, 0); }
  e.rifle.updateMatrix();
  armIK(e.arms[1], ikR.set(0, 0.0, 0.0).applyMatrix4(e.rifle.matrix));
  armIK(e.arms[0], ikL.set(0, 0.0, 0.2).applyMatrix4(e.rifle.matrix));
  e.head.rotation.set(-e.flinch * 0.3 + lerp(0.02, 0.1, a), lerp(0, -0.12, a), lerp(0, -0.1, a));
}
