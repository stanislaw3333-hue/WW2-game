// Enemy weapon handling, mirroring the player's: the Kar98 cycles its bolt after every shot and both guns reload when empty.
// The body moves through the reload stances in enemies/poses.js (ANIMS); his hands follow the bolt and magazine moved here.
import { clamp, sstep } from '../core/util.js';
import { ENEMY_WEAPON, K98_CLIP_IN_T } from '../core/config.js';
import { SFX } from '../audio/audio.js';

function boltCycle(u) { // same curve as the player's bolt: [rotation 0..1, pulled back 0..1]
  return [sstep(0, 0.22, u) - sstep(0.78, 1, u), sstep(0.22, 0.45, u) - sstep(0.55, 0.78, u)];
}
export function resetWeapon(e) {
  e.ammo = ENEMY_WEAPON[e.weapon].mag; e.cyc = -1; e.rel = -1; e.boltT = 0; e.reloading = false;
  applyParts(e, 0, 0, 0, 0);
}
// moves the visible gun parts: bolt (Kar98: turns and slides; MP40: slides) and the MP40 magazine
function applyParts(e, rot, back, magY, magShow) {
  e.boltBack = back; e.magY = magY;   // read by poseEnemy: reload hands follow the bolt and the magazine
  if (!e.bolt) return;
  if (e.weapon === 'mp40') {
    e.bolt.position.z = back * 0.08;
    e.mag.position.y = -0.145 + magY; e.mag.visible = magShow !== 1;
  } else { e.bolt.rotation.z = rot * 1.45; e.bolt.position.z = -0.045 + back * 0.085; }
}
// called when a round has been fired: the Kar98 starts its between-shot bolt cycle
export function roundFired(e) {
  e.ammo--;
  if (e.weapon === 'mp40') e.boltT = 0.1; else e.cyc = 0;
}
export function tickWeapon(e, dt, dist) {
  let rot = 0, back = 0, magY = 0, magHide = 0;
  if (e.weapon === 'k98' && e.cyc >= 0) {
    const p = e.cyc; e.cyc += dt;
    const u = clamp((e.cyc - 0.3) / 0.85, 0, 1); [rot, back] = boltCycle(u);
    if (p < 0.32 && e.cyc >= 0.32) SFX.ebolt(dist);
    if (e.cyc > 1.2) e.cyc = -1;
  } else if (e.rel < 0 && e.ammo <= 0) {
    e.rel = 0; e.burstLeft = 0; SFX.ereload(e.weapon, dist);   // empty and the bolt cycle is over: reload
  }
  if (e.rel >= 0) {
    const p = e.rel, t = (e.rel += dt), W = ENEMY_WEAPON[e.weapon];
    if (e.weapon === 'k98') {
      rot = sstep(0.35, 0.5, t) - sstep(1.95, 2.1, t); back = sstep(0.5, 0.7, t) - sstep(1.75, 1.95, t);
      if (p < K98_CLIP_IN_T && t >= K98_CLIP_IN_T) SFX.eclipIn(dist);
      if (p < 1.35 && t >= 1.35) e.ammo = W.mag;
    } else {
      // magazine swap: the old one drops out, the fresh one rises into the well, then the bolt is charged
      magY = -0.3 * sstep(0.35, 0.8, t) + (t >= 0.9 ? 0.3 * sstep(0.9, 1.3, t) : 0);
      magHide = t >= 0.8 && t < 0.9 ? 1 : 0;
      if (p < 1.28 && t >= 1.28) e.ammo = W.mag;
      if (p < 1.7 && t >= 1.7) e.boltT = 0.1;
    }
    e.shootT = Math.max(e.shootT, 0.4);
    if (t > W.reloadT) e.rel = -1;
  }
  e.reloading = e.rel >= 0;
  if (e.weapon === 'mp40') { e.boltT = Math.max(0, e.boltT - dt); back = e.boltT / 0.1; }
  applyParts(e, rot, back, magY, magHide);
}
