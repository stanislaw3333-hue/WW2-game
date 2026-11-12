// Enemy pose editor, loaded only with ?test (see game.js). Freezes every soldier, shows one up close from fixed angles,
// and lets you move the gun, hands, elbows and bones of any stance in enemies/poses.js, play its animation, and print
// the stance to paste back into poses.js.
//   N            editor on / off (the panel lists the keys)
//   , / .        previous / next stance (the soldier's gun set, then the grenade set)
//   Tab / Shift+Tab   next / previous thing to edit: gun, right hand, left hand, right elbow, left elbow, then bones
//   arrows       move it: left / right, forward / back (the soldier's own axes); PgUp / PgDn up / down
//   I / K, J / L, U / O   turn it: pitch, yaw, roll (gun and bones; for a hand this turns the wrist)
//   [ / ]        finger curl (hands)    ; / '   thumb (hands)    T / G   forearm twist (hands)
//   Shift        fine steps (2 mm, 0.5 degree) instead of 1 cm, 3 degrees
//   V / B        next / previous camera view       Q / E   turn the camera round him
//   C            next soldier (Kar98 / MP40)       Space   play / stop this set's animation (reload or throw)
//   P            print the stance block (panel + console); P again hides it
//   X            work light on / off (bright flat light so the pose is easy to see; on by default)
// From the browser JS tool: __g.pose(i, set, name) shows soldier i frozen in a stance, __g.pose(i) releases him.
import { S, enemies, player } from '../core/state.js';
import { STANCES, ANIMS } from '../enemies/poses.js';
import { resolveStance, sampleAnim, setUniform } from '../enemies/rig.js';
import { SOLDIER_TYPES } from '../enemies/uniforms.js';
import { worldL } from '../render/renderer.js';
import { SM } from '../render/materials.js';

// [name, angle round him from his front, camera height, distance, look-at height]
const VIEWS = [['front', 0, 1.3, 2.4, 1.0], ['right side', -Math.PI / 2, 1.3, 2.2, 1.0], ['left side', Math.PI / 2, 1.3, 2.2, 1.0], ['back', Math.PI, 1.4, 2.4, 1.0],
  ['hands close', 0.5, 1.35, 1.6, 1.2], ['high front', 0.3, 2.4, 2.2, 1.0], ['low', 0.2, 0.5, 2.4, 1.0], ['face', 0.35, 1.68, 0.75, 1.64]];
const BONES = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'LeftShoulder', 'RightShoulder', 'LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg', 'LeftFoot', 'RightFoot'];
const TARGETS = ['gun', 'hand R', 'hand L', 'elbow R', 'elbow L', ...BONES];
let light = true, savedAmb = null;
function applyLight() {
  if (on && light) { if (!savedAmb) savedAmb = worldL.uAmbient.value.clone(); worldL.uAmbient.value.set(1.1, 1.1, 1.15); }
  else if (savedAmb) { worldL.uAmbient.value.copy(savedAmb); savedAmb = null; }
}
let on = false, ei = 0, setName = '', names = [], si = 0, ti = 0, view = 0, orbit = 0, playing = false, playT = 0, dumpText = '';
const panel = document.createElement('pre');
panel.style.cssText = 'position:fixed;left:8px;top:8px;margin:0;padding:6px 8px;background:rgba(0,0,0,.7);color:#fff;font:12px monospace;z-index:9;display:none;white-space:pre;max-height:95vh;overflow:auto';
document.body.appendChild(panel);
const fmt = a => '[' + a.map(v => +(+v).toFixed(3)).join(', ') + ']';
const soldier = () => enemies[ei];
const stance = () => STANCES[setName][names[si]];
const parts = e => ({ bolt: [0, 0, -(e.boltBack || 0) * 0.085], mag: [0, e.magY || 0, 0] });

function pick(i, set, name) {
  ei = (i + enemies.length) % enemies.length;
  const e = soldier();
  setName = set || e.weapon; names = Object.keys(STANCES[setName]);
  si = Math.max(0, names.indexOf(name)); playing = false;
  for (const o of enemies) o.frozen = on || o === e;
  e.alive = true; e.fall = 0; e.body.rotation.x = 0; e.body.position.y = 0; e.mv = 0; e.flinch = 0;
  e.posed = o => {
    const get = n => resolveStance(STANCES[setName][n], o.grips, parts(o));
    const anim = ANIMS[setName] && Object.values(ANIMS[setName])[0];
    return playing && anim ? sampleAnim(anim, playT % (anim.keys[anim.keys.length - 1][0] + 0.4), get) : get(names[si]);
  };
}
function release() { for (const o of enemies) { o.frozen = false; o.posed = null; } }

// the edit helpers copy shared nested objects first, so editing one stance never changes another that shares a part
const owned = new WeakMap();
function own(st, k, def) {
  const set = owned.get(st) || owned.set(st, new Set()).get(st);
  if (!set.has(k)) { st[k] = JSON.parse(JSON.stringify(st[k] || def)); set.add(k); }
  return st[k];
}
function handPoint(st, s) {   // makes the hand target a gun-space point (or keeps a body point) and returns its array
  const e = soldier(), hands = own(st, 'hands', {});
  let h = hands[s];
  if (h === 'grip' || h == null) h = hands[s] = st.gun ? { gun: [...e.grips[s]] } : { body: s === 'R' ? [-0.2, 1.2, 0.3] : [0.2, 1.2, 0.3] };
  return h.body || h.gun || h.bolt || h.mag;
}
function edit(move, turn, k, fine) {
  const st = stance(), t = TARGETS[ti], step = fine ? 0.002 : 0.01, ang = (fine ? 0.5 : 3) * Math.PI / 180;
  if (t === 'gun') {
    if (!st.gun) return;
    const g = own(st, 'gun', null);
    if (move) for (let i = 0; i < 3; i++) g.pos[i] += move[i] * step;
    if (turn) g.rot[turn[0]] += turn[1] * ang;
  } else if (t.startsWith('hand')) {
    const s = t.slice(-1);
    if (move) { const p = handPoint(st, s), inGun = !own(st, 'hands', {})[s].body && st.gun; moveIn(p, move, step, inGun ? st.gun.rot[1] : 0); }
    if (turn) { const w = own(st, 'wrist', {}); w[s] = w[s] || [0, 0, 0]; w[s][turn[0]] += turn[1] * ang; }
    const adj = { BracketLeft: ['curl', -0.05], BracketRight: ['curl', 0.05], Semicolon: ['thumb', -0.05], Quote: ['thumb', 0.05], KeyT: ['twist', ang], KeyG: ['twist', -ang] }[k];
    if (adj) { const o = own(st, adj[0], {}); const def = adj[0] === 'twist' ? 0 : adj[0] === 'curl' ? 0.8 : 0.6; o[s] = Math.max(adj[0] === 'twist' ? -9 : 0, Math.min(adj[0] === 'twist' ? 9 : 1, (o[s] ?? def) + adj[1])); }
  } else if (t.startsWith('elbow')) {
    const s = t.slice(-1), p = own(st, 'poles', {});
    p[s] = p[s] || (s === 'R' ? [-0.55, 1.2, 0] : [0.55, 1.2, 0]);
    if (move) for (let i = 0; i < 3; i++) p[s][i] += move[i] * step * 3;
  } else {
    const b = own(st, 'bones', {}); b[t] = b[t] || [0, 0, 0];
    if (turn) b[t][turn[0]] += turn[1] * ang;
  }
}
// gun-space points move along the soldier's axes: undo the gun's yaw so "left" stays his left
function moveIn(p, move, step, yaw) {
  const c = Math.cos(yaw), s = Math.sin(yaw), mx = move[0] * step, mz = move[2] * step;
  p[0] += mx * c - mz * s; p[1] += move[1] * step; p[2] += mx * s + mz * c;
}

function dump() {
  const st = stance();
  const body = Object.entries(st).map(([k, v]) => '    ' + k + ': ' + JSON.stringify(v, (kk, vv) => typeof vv === 'number' ? +vv.toFixed(3) : vv).replace(/"(\w+)":/g, '$1: ').replace(/,/g, ', ')).join(',\n');
  dumpText = '// enemies/poses.js STANCES.' + setName + '.' + names[si] + '\n  ' + names[si] + ': {\n' + body + ',\n  },';
  console.log(dumpText);
}
function refresh() {
  applyLight();
  panel.style.display = on ? 'block' : 'none';
  if (!on) return;
  const st = stance(), t = TARGETS[ti];
  let val = '';
  if (t === 'gun') val = st.gun ? 'pos ' + fmt(st.gun.pos) + ' rot ' + fmt(st.gun.rot) : '(no gun in this stance)';
  else if (t.startsWith('hand')) { const s = t.slice(-1), h = st.hands && st.hands[s]; val = 'target ' + (h && h !== 'grip' ? JSON.stringify(h) : "'grip'") + '  curl ' + ((st.curl || {})[s] ?? 0.8) + '  thumb ' + ((st.thumb || {})[s] ?? 0.6) + '  twist ' + +((st.twist || {})[s] ?? 0).toFixed(3) + '  wrist ' + fmt((st.wrist || {})[s] || [0, 0, 0]); }
  else if (t.startsWith('elbow')) val = 'pole ' + fmt((st.poles || {})[t.slice(-1)] || [0, 0, 0]);
  else val = 'rot ' + fmt((st.bones || {})[t] || [0, 0, 0]);
  panel.textContent = 'POSE EDIT  soldier ' + ei + ' (' + soldier().weapon + ')  stance ' + setName + '.' + names[si] + (playing ? '  [PLAYING]' : '') + '  view: ' + VIEWS[view][0] + '\n' +
    'editing: ' + t + '   ' + val + '\n' +
    ', .  stance   Tab  next part   arrows PgUp/PgDn  move   I/K J/L U/O  turn   [ ]  curl   ; \'  thumb   T/G  twist\n' +
    'Shift  fine   V/B  view   Q/E  orbit   C  next soldier   Space  play animation   X  light   P  print   N  off' + (dumpText ? '\n\n' + dumpText : '');
}

// camera: called by game.js every frame while S.debugCam is set
const camFn = cam => {
  const e = soldier(), v = VIEWS[view], a = e.yaw + v[1] + orbit, d = v[3];
  cam.position.set(e.x + Math.sin(a) * d, v[2], e.z + Math.cos(a) * d);
  cam.lookAt(e.x, v[4], e.z); cam.fov = 50;
  if (playing) playT += 1 / 60;
};

window.addEventListener('keydown', ev => {
  const k = ev.code || ev.key;
  if (k === 'KeyN' && !ev.repeat) {
    on = !on;
    if (on) { pick(ei, null, 'carry'); S.debugCam = camFn; S.hideGunT = true; } else { release(); S.debugCam = null; S.hideGunT = false; }
    refresh(); return;
  }
  if (!on) return;
  ev.preventDefault(); ev.stopPropagation();
  if (k === 'Comma' || k === 'Period') {
    const d = k === 'Period' ? 1 : -1, all = [...Object.keys(STANCES[soldier().weapon]).map(n => [soldier().weapon, n]), ...Object.keys(STANCES.nade).map(n => ['nade', n])];
    const cur = all.findIndex(([s, n]) => s === setName && n === names[si]), nx = all[(cur + d + all.length) % all.length];
    setName = nx[0]; names = Object.keys(STANCES[setName]); si = names.indexOf(nx[1]); playing = false;
  } else if (k === 'Tab') ti = (ti + (ev.shiftKey ? TARGETS.length - 1 : 1)) % TARGETS.length;
  else if (k === 'KeyV' || k === 'KeyB') view = (view + (k === 'KeyV' ? 1 : VIEWS.length - 1)) % VIEWS.length;
  else if (k === 'KeyQ' || k === 'KeyE') orbit += (k === 'KeyQ' ? 1 : -1) * 0.2;
  else if (k === 'KeyC') {   // next soldier carrying the other gun (or simply the next one)
    const w = soldier().weapon, other = enemies.findIndex(o => o.weapon !== w);
    pick(other >= 0 ? other : ei + 1, null, 'carry');
  }
  else if (k === 'Space') { playing = !playing; playT = 0; }
  else if (k === 'KeyX') { light = !light; applyLight(); }
  else if (k === 'KeyP') { if (dumpText) dumpText = ''; else dump(); }
  else {
    // the soldier's own axes: +x = his left, +z = forward; from the front view "left" on screen is his left
    const move = { ArrowLeft: [1, 0, 0], ArrowRight: [-1, 0, 0], ArrowUp: [0, 0, 1], ArrowDown: [0, 0, -1], PageUp: [0, 1, 0], PageDown: [0, -1, 0] }[k];
    const turn = { KeyI: [0, 1], KeyK: [0, -1], KeyJ: [1, 1], KeyL: [1, -1], KeyU: [2, 1], KeyO: [2, -1] }[k];
    edit(move, turn, k, ev.shiftKey);
    dumpText = '';
  }
  refresh();
}, true);
setInterval(() => { if (on && S.state === 'pause') S.state = 'play'; if (on) { player.hp = Math.max(player.hp, 50); } }, 100);   // keep the game running (no pointer lock in the test browser)

// for the browser JS tool: show soldier i frozen in a stance (and a camera view), or release him
export function poseApi(i, set, name, v = 0) {
  if (i == null || set == null) { on = false; release(); S.debugCam = null; S.hideGunT = false; refresh(); return 'released'; }
  on = true; pick(i, set, name); view = v; S.debugCam = camFn; S.hideGunT = true; refresh();
  return setName + '.' + names[si];
}

// ---------------------------------------------------------------- line-up: soldiers side by side for reference pictures
// __g.lineup([{ i, label, type }], set, name) stands the listed soldiers in a row in the open middle of the enemy yard, facing
// the camera, frozen in STANCES[set][name] (each in his own gun's set when set is 'gun'), with a label over each head.
// type (optional, a SOLDIER_TYPES key) shows that soldier in another uniform for the picture. __g.lineup() ends it.
const ROW = { x: -37.2, z0: 0.5, step: -2.0, camDist: 1.35, perSoldier: 1.0, camY: 1.0, lookY: 0.92 };   // one soldier: 2.35 m away (fills a square view)   // step < 0: first soldier on the left
let lineup = null;
const labels = [];
function label(k) {
  while (labels.length <= k) {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;transform:translate(-50%,-100%);padding:2px 6px;background:rgba(0,0,0,.75);color:#fff;font:bold 13px monospace;z-index:9;pointer-events:none;white-space:nowrap';
    document.body.appendChild(d); labels.push(d);
  }
  return labels[k];
}
const lineCam = cam => {
  const n = lineup.list.length, zc = ROW.z0 + (n - 1) * ROW.step / 2;
  cam.position.set(ROW.x + ROW.camDist + n * ROW.perSoldier, ROW.camY, zc); cam.lookAt(ROW.x, ROW.lookY, zc); cam.fov = 50;
  cam.updateMatrixWorld(); cam.updateProjectionMatrix();
  const r = document.querySelector('canvas').getBoundingClientRect();
  lineup.list.forEach((it, k) => {
    const e = enemies[it.i], v = e.g.position.clone();
    v.y = 2.0; v.project(cam);
    const d = label(k); d.style.display = 'block'; d.textContent = it.label;
    d.style.left = (r.left + (v.x + 1) / 2 * r.width) + 'px'; d.style.top = (r.top + (1 - v.y) / 2 * r.height) + 'px';
  });
};
export function lineupApi(list, set = 'ref', name = 'tpose') {
  if (lineup) {   // put the previous line-up back
    for (const s of lineup.saved) { const e = enemies[s.i]; Object.assign(e, s.pos); if (s.uniform) setUniform(e.rig, s.uniform.layout, s.uniform.material); }
    lineup = null; for (const d of labels) d.style.display = 'none';
    release(); on = false; S.debugCam = null; S.hideGunT = false; refresh();
  }
  if (!list) return 'line-up ended';
  lineup = { list, saved: [] };
  setName = 'ref'; names = Object.keys(STANCES.ref); si = 0;
  on = true; refresh();   // editor state on: work light, every soldier frozen
  for (const o of enemies) o.frozen = true;
  list.forEach((it, k) => {
    const e = enemies[it.i];
    const saved = { i: it.i, pos: { x: e.x, z: e.z, yaw: e.yaw } };
    if (it.type) { saved.uniform = { layout: e.rig.layout, material: e.rig.body.material }; setUniform(e.rig, SOLDIER_TYPES[it.type].layout, SM.types[it.type]); }
    lineup.saved.push(saved);
    Object.assign(e, { x: ROW.x, z: ROW.z0 + k * ROW.step, yaw: Math.PI / 2, alive: true, fall: 0, mv: 0, flinch: 0 });
    e.body.rotation.x = 0; e.body.position.y = 0;
    const st = set === 'gun' ? e.weapon : set;
    e.posed = o => resolveStance(STANCES[st][name], o.grips, parts(o));
  });
  S.debugCam = lineCam; S.hideGunT = true;
  panel.style.display = 'none';
  return list.map(it => it.label).join(' | ');
}
