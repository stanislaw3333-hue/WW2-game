// Hand tuning mode, loaded only with ?test in the URL (see game.js). Move and turn each arm on the weapon in your hands, look at the
// weapon from fixed angles, then print the HAND_OFFSETS block to paste into core/config.js.
//   H                    mode on / off (the panel shows the keys)
//   Tab                  switch between the left and right arm
//   arrows               move the arm: left / right, forward / back (as the player sees it)
//   PgUp / PgDn          move the arm up / down
//   I / K                turn the arm: nose up / down (pitch)
//   J / L                turn the arm: left / right (yaw)
//   U / O                turn the arm: roll left / right
//   Shift                fine steps (1 mm, 0.5 degree) instead of 5 mm, 3 degrees
//   V / B                next / previous camera view: first person, right, left, back, below, above
//   P                    print the HAND_OFFSETS block for all weapons to the panel and the console; P again hides it
// Turns happen about the grip point, so the hand stays where it is and the arm swings round it.
import * as THREE from 'three';
import { gunCam } from '../render/renderer.js';
import { gun, WEAPONS } from '../weapons/guns.js';
import { HAND_OFFSETS } from '../core/config.js';
import { S } from '../core/state.js';

const VIEWS = [
  ['first person', null],
  ['right side', [[0.75, -0.08, -0.05], [0, Math.PI / 2, 0], 30]],
  ['left side', [[-0.75, -0.08, -0.05], [0, -Math.PI / 2, 0], 30]],
  ['back', [[0, -0.1, 0.6], [0, 0, 0], 35]],
  ['below', [[0, -0.7, -0.05], [Math.PI / 2, 0, 0], 35]],
  ['above', [[0, 0.7, -0.05], [-Math.PI / 2, 0, 0], 35]],
];
const fp = { fov: gunCam.fov };
let on = false, side = 'left', view = 0, dumpText = '';
const panel = document.createElement('pre');
panel.style.cssText = 'position:fixed;left:8px;top:8px;margin:0;padding:6px 8px;background:rgba(0,0,0,.7);color:#fff;font:12px monospace;z-index:9;display:none;white-space:pre';
document.body.appendChild(panel);

const hand = () => { const g = WEAPONS[gun.w].m[side]; return g && g.userData.e ? g : null; };
const fmt = a => '[' + a.map(v => +v.toFixed(4)).join(', ') + ']';

function applyView() {
  const root = WEAPONS[gun.w].m.root;
  const v = VIEWS[view][1];
  if (!v) { if (gunCam.parent) gunCam.parent.remove(gunCam); gunCam.position.set(0, 0, 0); gunCam.rotation.set(0, 0, 0); gunCam.fov = fp.fov; }
  else { root.add(gunCam); gunCam.position.set(...v[0]); gunCam.rotation.set(...v[1]); gunCam.fov = v[2]; }
  gunCam.updateProjectionMatrix();
}

function toAxisAngle(q) {
  const w = Math.min(1, Math.abs(q.w)), s = Math.sqrt(1 - w * w), sg = q.w < 0 ? -1 : 1;
  return s < 1e-6 ? [0, 1, 0, 0] : [sg * q.x / s, sg * q.y / s, sg * q.z / s, 2 * Math.acos(w)];
}

function dump() {
  const one = (o, k) => o[k] ? k + ': { p: ' + fmt(o[k].p) + ', d: ' + fmt(o[k].d) + ', r: ' + fmt(o[k].r) + ((o[k].s || 1) !== 1 ? ', s: ' + +o[k].s.toFixed(4) : '') + ' }' : '';
  dumpText = 'export const HAND_OFFSETS = [\n' + HAND_OFFSETS.map(o => '  { ' + [one(o, 'L'), one(o, 'R')].filter(Boolean).join(', ') + ' },').join('\n') + '\n];';
  console.log(dumpText);
}

function refresh() {
  panel.style.display = on ? 'block' : 'none';
  if (!on) return;
  const h = hand();
  const e = h && h.userData.e;
  panel.textContent =
    'HAND TUNE  ' + WEAPONS[gun.w].name + '  ' + (side === 'left' ? 'LEFT' : 'RIGHT') + ' arm  view ' + (view + 1) + '/' + VIEWS.length + ': ' + VIEWS[view][0] + '\n' +
    (e ? 'position ' + fmt(e.d) + '\nrotation ' + fmt(e.r) + '\n' : 'this weapon has no ' + side + ' arm\n') +
    'arrows + PgUp/PgDn  move    I/K J/L U/O  turn    Shift  fine\nTab  other arm    V / B  next / previous view    P  print / hide    H  off' + (dumpText ? '\n\n' + dumpText : '');
}

window.addEventListener('keydown', ev => {
  const k = ev.code || ev.key;
  if (k === 'KeyH' && !ev.repeat) { on = !on; if (!on) view = 0; applyView(); refresh(); return; }
  if (!on) return;
  if (k === 'Tab') { ev.preventDefault(); side = side === 'left' ? 'right' : 'left'; dumpText = ''; refresh(); return; }
  if (k === 'KeyV' || k === 'KeyB') { view = (view + (k === 'KeyV' ? 1 : VIEWS.length - 1)) % VIEWS.length; applyView(); refresh(); return; }
  if (k === 'KeyP') { if (dumpText) dumpText = ''; else dump(); refresh(); return; }   // P again hides the printed block
  const h = hand();
  if (!h) return;
  const e = h.userData.e, pv = h.userData.pv;
  const move = { ArrowLeft: [-1, 0, 0], ArrowRight: [1, 0, 0], ArrowUp: [0, 0, -1], ArrowDown: [0, 0, 1], PageUp: [0, 1, 0], PageDown: [0, -1, 0] }[k];
  // turns about the gun's own axes: pitch about x, yaw about y, roll about z
  const turn = { KeyI: [[1, 0, 0], 1], KeyK: [[1, 0, 0], -1], KeyJ: [[0, 1, 0], 1], KeyL: [[0, 1, 0], -1], KeyU: [[0, 0, 1], 1], KeyO: [[0, 0, 1], -1] }[k];
  if (!move && !turn) return;
  ev.preventDefault();
  if (move) {
    const st = ev.shiftKey ? 0.001 : 0.005;
    for (let i = 0; i < 3; i++) e.d[i] += move[i] * st;
    pv.position.set(e.p[0] + e.d[0], e.p[1] + e.d[1], e.p[2] + e.d[2]);
  } else {
    const a = turn[1] * (ev.shiftKey ? 0.5 : 3) * Math.PI / 180;
    pv.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(...turn[0]), a)).normalize();
    e.r = toAxisAngle(pv.quaternion);
  }
  dumpText = '';
  refresh();
}, true);

// switching weapon with the camera on a side view: keep the camera on the new gun
setInterval(() => { if (on && view) applyView(); if (on && S.state === 'pause') S.state = 'play'; }, 100);   // no pointer lock in the test browser: keep the game from sitting on the pause screen
