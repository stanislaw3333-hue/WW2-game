// Rigged enemy soldier: one skinned body (src/models/soldier_rig.json, baked once by tools/bake_rig.py) posed at runtime.
// A pose ("stance", see enemies/poses.js) says where the gun is, where each hand goes, where the elbows point, and
// how some bones turn. applyStance() places the gun, turns the bones, solves both arms onto their hand targets with
// two-bone IK, and curls the fingers. blendStances() mixes two stances, sampleAnim() plays a keyed list of stances.
//
// Bone frames: every bone's rest frame is aligned with the body axes (x = soldier's left, y = up, z = forward), so a
// rotation [x, y, z] (radians, Euler order YXZ) means the same on every bone: +x pitches the bone's far end forward
// and down... for a bone pointing up (spine, neck, head) +x leans it forward; for a leg (pointing down) +x swings it back.
import * as THREE from 'three';
import { V3, lerp } from '../core/util.js';
import { bakedGeo } from '../render/baked.js';
import RIG from '../models/soldier_rig.json';
import { LAYOUTS } from './uniforms.js';

export const BONE_NAMES = RIG.bones.map(b => b.name);
const f32 = s => { const b = atob(s), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return new Float32Array(a.buffer); };
const REST = RIG.bones.map(b => new V3(...b.pos));   // rest head positions in body space
const IDX = Object.fromEntries(BONE_NAMES.map((n, i) => [n, i]));
const childOf = i => RIG.bones.findIndex(b => b.parent === i);

// ---------------------------------------------------------------- geometry (decoded once, shared by every soldier)
const clampTo = (a, lo, hi) => Math.min(hi, Math.max(lo, a));
// The body is textured from a uniform sheet by position; the FBX's own UVs are not used. Each vertex is sorted by the bone
// that moves it most, then mapped by where it sits in the rest pose (T-pose, facing +z) onto the sheet region drawn for that
// part. The regions of each sheet are LAYOUTS in enemies/uniforms.js (sheet pixels); BODY below is this model's measurements.
// The head and neck are a separate mesh that always keeps the Infantry sheet's shadowy mapping (no features).
//   torso: 0.36 m wide, 0.26 m deep, hem y 0.95, waist / belt y 1.13 (narrowest, buckle bump), collar y 1.60. Angle round the
//   torso: 0 = front, 90 = his left side, 180 = his back (ellipse halfW x halfD, so 45 is the front corner). The front block
//   covers up to sideDeg each way (its face up to faceDeg), the back block the rest. Legs: hip y 0.95, knee y 0.48, sole y 0.
const BODY = { halfW: 0.18, halfD: 0.13, cz: -0.008, hem: 0.95, belt: 1.13, collar: 1.6, faceDeg: 45, sideDeg: 100, hip: 0.95, knee: 0.48, handLen: 0.17 };
const SIDE = s => (s.startsWith('Left') ? 'Left' : s.startsWith('Right') ? 'Right' : '');
const part = n => /Head|Neck/.test(n) ? 'head' : /Hand/.test(n) ? 'hand' : /(Fore)?Arm$/.test(n) ? 'arm'
  : /UpLeg/.test(n) ? 'thigh' : /Leg$/.test(n) ? 'shin' : /Foot|Toe/.test(n) ? 'foot' : 'torso';   // shoulders go with the torso
const lerpTo = (a, b, t) => a + (b - a) * t;
const DEG = Math.PI / 180;
// round a limb: 0 at its underside, 0.25 front, 0.5 top / outside, 0.75 back (seam underneath, out of sight)
const round = (dy, dz) => (((Math.atan2(dy, dz) + Math.PI / 2) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) / (2 * Math.PI);
const legAxis = (s, a, b) => { const p0 = REST[IDX[s + a]], p1 = REST[IDX[s + b]]; return [(p0.x + p1.x) / 2, (p0.z + p1.z) / 2]; };
const AX = { thigh: { Left: legAxis('Left', 'UpLeg', 'Leg'), Right: legAxis('Right', 'UpLeg', 'Leg') },
  shin: { Left: legAxis('Left', 'Leg', 'Foot'), Right: legAxis('Right', 'Leg', 'Foot') } };
const domPart = (j, w, i) => { const n = BONE_NAMES[w.getX(i) >= w.getY(i) ? j.getX(i) : j.getY(i)]; return [part(n), SIDE(n)]; };
// a point on a strip (uniforms.js): t along the limb, u round it, both 0..1 -> sheet pixel
const onStrip = (S, t, u) => {
  const al = lerpTo(S.along[0], S.along[1], t), ar = lerpTo(S.around[0], S.around[1], u);
  return S.dir === 'h' ? [al, ar] : [ar, al];
};
function uniformUV(geo, L) {
  const p = geo.attributes.position, uv = geo.attributes.uv, j = geo.attributes.skinIndex, w = geo.attributes.skinWeight, B = BODY;
  const set = (i, [px, py]) => uv.setXY(i, px / 1024, 1 - py / 1024);
  const F = L.front, K = L.back, fc = (F.faceRight + F.faceLeft) / 2, kc = (K.left + K.right) / 2;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), [k, s] = domPart(j, w, i), sd = s === 'Left' ? 'L' : 'R';
    if (k === 'arm' || k === 'hand') {
      // arms are straight out sideways in the rest pose: along = distance from the shoulder joint, round = angle about the arm
      const sh = REST[IDX[s + 'Arm']], wr = REST[IDX[s + 'Hand']], d = Math.abs(x - sh.x), dw = Math.abs(wr.x - sh.x), u = round(y - sh.y, z - sh.z);
      set(i, d < dw ? onStrip(L.sleeve[sd], d / dw, u) : onStrip(L.hand[sd], clampTo((d - dw) / B.handLen, 0, 1), u));
    } else if (k === 'thigh' || k === 'shin' || k === 'foot') {
      const thigh = k === 'thigh', [cx, cz] = AX[thigh ? 'thigh' : 'shin'][s];
      let u = (Math.atan2(x - cx, z - cz) + Math.PI) / (2 * Math.PI); if (s === 'Left') u = 1 - u;   // mirrored: both legs alike
      const t = thigh ? clampTo((B.hip - y) / (B.hip - B.knee), 0, 1) : clampTo((B.knee - y) / B.knee, 0, 1);
      set(i, onStrip(L[thigh ? 'thigh' : 'shin'][sd], t, u));
    } else {
      // torso; sheet row for this height: hem -> belt -> collar, each stretch on its own
      const rowAt = R => y < B.belt ? lerpTo(R.hem, R.belt, clampTo((y - B.hem) / (B.belt - B.hem), 0, 1))
        : lerpTo(R.belt, R.top, clampTo((y - B.belt) / (B.collar - B.belt), 0, 1));
      const phi = Math.atan2(x / B.halfW, (z - B.cz) / B.halfD) / DEG, a = Math.abs(phi), left = phi > 0;
      if (a <= B.sideDeg) {
        const face = left ? F.faceLeft : F.faceRight, edge = left ? F.left : F.right;
        const px = a <= B.faceDeg ? lerpTo(fc, face, a / B.faceDeg) : lerpTo(face, edge, (a - B.faceDeg) / (B.sideDeg - B.faceDeg));
        set(i, [px, rowAt(F)]);
      } else set(i, [lerpTo(left ? K.left : K.right, kc, (a - B.sideDeg) / (180 - B.sideDeg)), rowAt(K)]);
    }
  }
  uv.needsUpdate = true;
}
// head and neck (always the Infantry sheet): the limb panel wrapped round the body's centre line, as on the first rig
function headUV(geo) {
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, 0.58 + 0.41 * (Math.atan2(p.getX(i), p.getZ(i)) + Math.PI) / (2 * Math.PI), 0.26 + 0.31 * clampTo(p.getY(i) / 1.76, 0, 1));
  uv.needsUpdate = true;
}
// skinned geometry of a baked mesh, optionally only the triangles whose three vertex parts keep() accepts
function skinnedGeo(m, keep) {
  const src = bakedGeo(m), J = f32(m.skin), Wt = f32(m.wt), n = src.attributes.position.count;
  const ja = new THREE.Uint16BufferAttribute(Uint16Array.from(J), 4), wa = new THREE.Float32BufferAttribute(Wt, 4);
  if (!keep) { const g = src.clone(); g.setAttribute('skinIndex', ja); g.setAttribute('skinWeight', wa); return g; }
  const tris = [];
  for (let t = 0; t < n; t += 3) if (keep([0, 1, 2].map(o => domPart(ja, wa, t + o)[0]))) tris.push(t);
  const pick = (arr, size) => { const out = new Float32Array(tris.length * 3 * size); tris.forEach((t, k) => out.set(arr.subarray(t * size, (t + 3) * size), k * 3 * size)); return out; };
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pick(src.attributes.position.array, 3), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(pick(src.attributes.normal.array, 3), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(pick(src.attributes.uv.array, 2), 2));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(Uint16Array.from(pick(J, 4)), 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(pick(Wt, 4), 4));
  return g;
}
const CLOTH = RIG.meshes.find(m => m.mat === 'uniform'), HELMET = RIG.meshes.find(m => m.mat === 'helmet');
const isHead = parts => parts.filter(q => q === 'head').length >= 2;
const HEAD_GEO = skinnedGeo(CLOTH, isHead); headUV(HEAD_GEO);
const HELMET_GEO = skinnedGeo(HELMET);
const BODY_GEOS = {};
// the body (everything but head and neck) mapped with one sheet layout; built once per layout and shared
export function bodyGeo(layoutName) {
  if (!BODY_GEOS[layoutName]) { const g = skinnedGeo(CLOTH, q => !isHead(q)); uniformUV(g, LAYOUTS[layoutName]); BODY_GEOS[layoutName] = g; }
  return BODY_GEOS[layoutName];
}
const BONE_INV = REST.map(p => new THREE.Matrix4().makeTranslation(-p.x, -p.y, -p.z));

// ---------------------------------------------------------------- one soldier's rig
// parent: the soldier's body group (body space). mats: { body, head, helmet }; layout: key of LAYOUTS (enemies/uniforms.js).
// Returns the rig object used by applyStance. setUniform(rig, layout, material) changes the uniform afterwards.
export function makeRig(parent, mats, layout) {
  const bones = RIG.bones.map((b, i) => {
    const bone = new THREE.Bone(); bone.name = b.name; bone.rotation.order = 'YXZ';
    const pp = b.parent >= 0 ? REST[b.parent] : new V3();
    bone.position.copy(REST[i]).sub(pp);
    return bone;
  });
  RIG.bones.forEach((b, i) => (b.parent >= 0 ? bones[b.parent] : parent).add(bones[i]));
  const skeleton = new THREE.Skeleton(bones, BONE_INV.map(m => m.clone()));
  const skin = (geo, material) => { const sm = new THREE.SkinnedMesh(geo, material); sm.frustumCulled = false; parent.add(sm); sm.bind(skeleton, new THREE.Matrix4()); return sm; };
  const body = skin(bodyGeo(layout), mats.body), head = skin(HEAD_GEO, mats.head), helmet = skin(HELMET_GEO, mats.helmet);
  const meshes = [body, head, helmet];
  const by = Object.fromEntries(bones.map(b => [b.name, b]));
  const arm = s => {
    const P = s === 'R' ? 'Right' : 'Left';
    const up = by[P + 'Arm'], fo = by[P + 'ForeArm'], hand = by[P + 'Hand'];
    const iU = IDX[P + 'Arm'], iF = IDX[P + 'ForeArm'], iH = IDX[P + 'Hand'], tip = childOf(IDX[P + 'HandMiddle1']);
    return {
      up, fo, hand, L1: REST[iF].distanceTo(REST[iU]), L2: REST[iH].distanceTo(REST[iF]),
      handLen: REST[iH].distanceTo(REST[tip >= 0 ? tip : iH]) * 0.6,   // the grip point sits this far past the wrist (mid palm)
      axis: new V3().subVectors(REST[iF], REST[iU]).normalize(),        // rest direction of the arm (straight out sideways)
      fingers: BONE_NAMES.filter(n => n.startsWith(P + 'Hand') && n !== P + 'Hand').map(n => by[n]),
      sign: s === 'R' ? 1 : -1,
    };
  };
  return { root: bones[0], bones: by, skeleton, meshes, body, layout, arms: { R: arm('R'), L: arm('L') } };
}
// gives a rig another uniform: the body geometry of that sheet layout and its material
export function setUniform(rig, layout, material) {
  rig.body.geometry = bodyGeo(layout); rig.body.material = material; rig.layout = layout;
}

// ---------------------------------------------------------------- two-bone arm IK (world space)
const _q = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _m = new THREE.Matrix4(), _r = new THREE.Matrix4();
const vS = new V3(), vT = new V3(), vP = new V3(), vD = new V3(), vE = new V3(), vU = new V3(), vV = new V3(), vN = new V3(), vB = new V3(), vX = new V3();
const REST_FWD = new V3(0, 0, 1);
// basis rotation: maps the rest frame (a = arm axis, f = forward, a x f) onto (u, b, u x b)
const vF = new V3();
function basisQuat(out, a, f, u, b) {
  vF.copy(f).addScaledVector(a, -f.dot(a)).normalize();               // forward made exactly square to the arm axis
  vX.crossVectors(a, vF); _r.makeBasis(a, vF, vX).transpose();        // rest basis, inverted (orthonormal)
  vN.crossVectors(u, b); _m.makeBasis(u, b, vN).multiply(_r);
  return out.setFromRotationMatrix(_m);
}
// sets a bone's local rotation so that its world rotation becomes q (world)
function setWorldQuat(bone, q) { bone.parent.getWorldQuaternion(_pq); bone.quaternion.copy(_pq.invert().multiply(q)); bone.updateMatrixWorld(true); }

// hand target T and elbow pole point P are world positions; twist turns the forearm about its own axis (radians)
function solveArm(A, T, P, twist, bodyQ) {
  A.up.updateMatrixWorld(true);
  A.up.getWorldPosition(vS);
  const L1 = A.L1, L2 = A.L2 + A.handLen;
  vD.subVectors(T, vS); let d = vD.length(); const dm = (L1 + L2) * 0.999;
  if (d > dm) { vD.multiplyScalar(dm / d); d = dm; }
  if (d < 1e-4) return;
  vD.divideScalar(d);
  const a1 = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - a1 * a1));
  vP.subVectors(P, vS); vP.addScaledVector(vD, -vP.dot(vD));
  if (vP.lengthSq() < 1e-8) vP.set(0, -1, 0);
  vP.normalize();
  vE.copy(vS).addScaledVector(vD, a1).addScaledVector(vP, h);       // elbow
  vU.subVectors(vE, vS).normalize();                                  // upper arm direction
  vV.copy(vS).addScaledVector(vD, d).sub(vE).normalize();             // forearm direction
  // bend direction: the forearm's lean away from the upper arm; straight arm -> towards the pole
  vB.copy(vV).addScaledVector(vU, -vV.dot(vU));
  if (vB.lengthSq() < 1e-6) vB.copy(vP).multiplyScalar(-1);
  vB.normalize();
  // rest frame: arm axis, forward (+z in body space, the way the elbow bends); both in world via the body rotation
  const ra = vT.copy(A.axis).applyQuaternion(bodyQ), rf = new V3().copy(REST_FWD).applyQuaternion(bodyQ);
  // a bone's world rotation at rest is the body's rotation, so the swing (rest -> target, in world) goes on top of it
  setWorldQuat(A.up, basisQuat(_q, ra, rf, vU, vB).multiply(bodyQ));
  vN.crossVectors(vU, vB);                                            // elbow hinge stays shared
  const fb = new V3().crossVectors(vN, vV).normalize();
  basisQuat(_q, ra, rf, vV, fb);
  if (twist) _q.premultiply(new THREE.Quaternion().setFromAxisAngle(vV, twist * A.sign));
  setWorldQuat(A.fo, _q.multiply(bodyQ));
}

// ---------------------------------------------------------------- stances
// A resolved stance (what blend/sample produce) has: gun {pos, rot} | null, hands {R, L} as body-space points,
// poles {R, L} body-space points, bones {name: [x, y, z]}, curl {R, L}, thumb {R, L}, twist {R, L}, wrist {R, L} [x, y, z].
const tmpM = new THREE.Matrix4(), tmpE = new THREE.Euler(0, 0, 0, 'YXZ'), tmpQ = new THREE.Quaternion(), tmpV = new V3();
// gun-space point -> body space for a gun at {pos, rot} (the enemy gun group, rotation order YXZ)
export function gunToBody(gun, p, out = new V3()) {
  tmpE.set(gun.rot[0], gun.rot[1], gun.rot[2]); tmpQ.setFromEuler(tmpE);
  tmpM.compose(tmpV.set(...gun.pos), tmpQ, new V3(1, 1, 1));
  return out.set(p[0], p[1], p[2]).applyMatrix4(tmpM);
}
// turns a stance from enemies/poses.js into a resolved one for this soldier. grips: {R, L} hand points in enemy gun space.
// parts: optional {bolt, mag} offsets in gun space (moving parts the hands can follow during reloads).
export function resolveStance(st, grips, parts = {}) {
  const out = { gun: st.gun ? { pos: [...st.gun.pos], rot: [...st.gun.rot] } : null, hands: {}, poles: {}, bones: { ...(st.bones || {}) }, drop: st.drop || 0,
    curl: { R: 0.8, L: 0.8, ...(st.curl || {}) }, thumb: { R: 0.6, L: 0.6, ...(st.thumb || {}) }, twist: { R: 0, L: 0, ...(st.twist || {}) },
    wrist: { R: [0, 0, 0], L: [0, 0, 0], ...(st.wrist || {}) } };
  for (const s of ['R', 'L']) {
    const h = st.hands ? st.hands[s] : 'grip';
    let p;
    if (h === 'grip' || h == null) p = gunToBody(out.gun, grips[s]);
    else if (h.body) p = new V3(...h.body);
    else {   // { gun: [x, y, z] } or { bolt | mag: [x, y, z] }: a point in gun space, moved with that part
      const off = h.bolt ? parts.bolt : h.mag ? parts.mag : null, q = h.gun || h.bolt || h.mag;
      p = gunToBody(out.gun, off ? [q[0] + off[0], q[1] + off[1], q[2] + off[2]] : q);
    }
    out.hands[s] = p;
    out.poles[s] = new V3(...(st.poles && st.poles[s] ? st.poles[s] : s === 'R' ? [-0.55, 1.2, 0] : [0.55, 1.2, 0]));
  }
  return out;
}
const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
// mixes two resolved stances: t = 0 gives a, 1 gives b. A missing gun (grenade) snaps at the halfway point.
export function blendStances(a, b, t) {
  if (t <= 0) return a; if (t >= 1) return b;
  const bones = {};
  for (const k of new Set([...Object.keys(a.bones), ...Object.keys(b.bones)])) bones[k] = lerp3(a.bones[k] || [0, 0, 0], b.bones[k] || [0, 0, 0], t);
  const gun = a.gun && b.gun ? { pos: lerp3(a.gun.pos, b.gun.pos, t), rot: lerp3(a.gun.rot, b.gun.rot, t) } : t < 0.5 ? a.gun : b.gun;
  const two = f => ({ R: f('R'), L: f('L') });
  return {
    gun, bones, drop: lerp(a.drop || 0, b.drop || 0, t),
    hands: two(s => a.hands[s].clone().lerp(b.hands[s], t)), poles: two(s => a.poles[s].clone().lerp(b.poles[s], t)),
    curl: two(s => lerp(a.curl[s], b.curl[s], t)), thumb: two(s => lerp(a.thumb[s], b.thumb[s], t)),
    twist: two(s => lerp(a.twist[s], b.twist[s], t)), wrist: two(s => lerp3(a.wrist[s], b.wrist[s], t)),
  };
}
// a resolved stance moved as a whole: the gun, hands and elbow poles shifted by dx (body x, his left) and down by
// drop (the hips go down with it), plus bone turns scaled by k (e.g. kneeling, leaning round cover). Returns a new stance.
export function shiftStance(st, dx, drop, bones, k) {
  const out = { ...st, bones: { ...st.bones }, drop: (st.drop || 0) + drop, hands: {}, poles: {} };
  if (st.gun) out.gun = { pos: [st.gun.pos[0] + dx, st.gun.pos[1] - drop, st.gun.pos[2]], rot: st.gun.rot };
  for (const s of ['R', 'L']) { out.hands[s] = st.hands[s].clone(); out.hands[s].x += dx; out.hands[s].y -= drop; out.poles[s] = st.poles[s].clone(); out.poles[s].x += dx; out.poles[s].y -= drop; }
  for (const n in bones) { const a = out.bones[n] || [0, 0, 0], b = bones[n]; out.bones[n] = [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k]; }
  return out;
}
const smooth = t => t * t * (3 - 2 * t);
// anim: { keys: [[time, stanceName], ...] } (poses.js ANIMS); get(name) resolves a stance by name. Blends between keys.
export function sampleAnim(anim, t, get) {
  const k = anim.keys;
  if (t <= k[0][0]) return get(k[0][1]);
  for (let i = 0; i < k.length - 1; i++) {
    if (t < k[i + 1][0]) return blendStances(get(k[i][1]), get(k[i + 1][1]), smooth((t - k[i][0]) / (k[i + 1][0] - k[i][0])));
  }
  return get(k[k.length - 1][1]);
}

// finger curl about the hand's own axes (rest: fingers straight out sideways, palm down)
const FINGER_MAX = 1.5, THUMB_MAX = 1.0;
const _bq = new THREE.Quaternion(), _hp = new V3(), _wp = new V3();
// poses the whole soldier. rig: makeRig result; gunGroup: the soldier's gun group (placed here); st: a resolved stance.
// extra: { bones, drop } added on top (walk cycle, flinch, look; drop lowers the hips), applied before the arms are solved.
export function applyStance(rig, gunGroup, st, extra = {}) {
  for (const b of rig.skeleton.bones) b.quaternion.identity();
  rig.root.position.y = REST[0].y - (st.drop || 0) - (extra.drop || 0);   // kneeling lowers the hips (the legs fold under by their bone turns)
  for (const src of [st.bones, extra.bones || {}]) for (const k in src) {
    const b = rig.bones[k]; if (!b) continue;
    tmpE.set(src[k][0], src[k][1], src[k][2]); b.quaternion.multiply(tmpQ.setFromEuler(tmpE));
  }
  if (gunGroup) {
    gunGroup.visible = !!st.gun;
    if (st.gun) { gunGroup.position.set(...st.gun.pos); gunGroup.rotation.set(st.gun.rot[0], st.gun.rot[1], st.gun.rot[2]); }
  }
  const body = rig.root.parent;
  body.updateMatrixWorld(true);
  body.getWorldQuaternion(_bq);
  for (const s of ['R', 'L']) {
    const A = rig.arms[s];
    body.localToWorld(_hp.copy(st.hands[s])); body.localToWorld(_wp.copy(st.poles[s]));
    solveArm(A, _hp, _wp, st.twist[s], _bq);
    const w = st.wrist[s]; tmpE.set(w[0], w[1], w[2]); A.hand.quaternion.setFromEuler(tmpE);
    for (const f of A.fingers) {
      const thumb = f.name.includes('Thumb');
      const amt = thumb ? st.thumb[s] * THUMB_MAX : st.curl[s] * FINGER_MAX * (/[1]$/.test(f.name) ? 0.7 : 0.45);
      if (thumb) f.quaternion.setFromAxisAngle(_hp.set(1, 0, 0), amt * 0.5);
      else f.quaternion.setFromAxisAngle(_hp.set(0, 0, 1), A.sign * amt);   // fingers bend down towards the palm (right: -x -> -y, left: +x -> -y)
    }
  }
  rig.root.updateMatrixWorld(true);
}
// world position of a hand's grip point (for releases, e.g. the grenade); out = V3
export function handPoint(rig, s, out = new V3()) {
  const A = rig.arms[s]; A.hand.updateMatrixWorld(true);
  return out.copy(A.axis).multiplyScalar(A.handLen).applyMatrix4(A.hand.matrixWorld);
}
