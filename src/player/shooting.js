// Firing and reloading: spread, hit resolution against enemies, targets and the level, and the gunfire alert.
import * as THREE from 'three';
import { V3, lerp } from '../core/util.js';
import { S, say, player, enemies, enemyParts, shootables, targets } from '../core/state.js';
import { scene, camera } from '../render/renderer.js';
import { M } from '../render/materials.js';
import { SFX } from '../audio/audio.js';
import { G, gun, curW } from '../weapons/guns.js';
import { alertEnemy, hitEnemy } from '../enemies/combat.js';
import { spawnParts, placeDecal } from '../effects/fx.js';

const ray = new THREE.Raycaster(); ray.far = 200;
const tmpN = new V3(), tmpP = new V3();

export function fire() {
  const w = curW(), m = w.m;
  w.ammo--; gun.flash = w.auto ? 0.05 : 0.075;
  if (w.auto) {
    gun.cool = 0.115; gun.kick = Math.min(1, gun.kick + 0.55); gun.camKick = Math.max(gun.camKick, 0.5); gun.boltT = 0.1;
    player.pitch = Math.min(1.35, player.pitch + 0.0035 * (1 + gun.heat)); player.yaw += (Math.random() - 0.5) * 0.007;
    G.brass.visible = true; G.brassLife = 0.4; G.brass.scale.setScalar(0.4); G.brass.position.copy(m.root.position).add(tmpP.set(0.03, 0.04, -0.1)); G.brassV.set(0.9 + Math.random() * 0.5, 1.1, 0.1);
    SFX.smg();
  } else { gun.state = 'fire'; gun.t = 0; gun.kick = 1; gun.camKick = 1; SFX.shot(); }
  m.flash.rotation.z = Math.random() * 6.28; m.flash.scale.setScalar(0.8 + Math.random() * 0.5);
  const spread = w.auto ? lerp(0.024, 0.008, gun.ads) * (1 + gun.heat * 1.3) : 0.004 * (1 - gun.ads);
  if (w.auto) gun.heat = Math.min(1, gun.heat + 0.13);
  // gunfire near the second courtyard wakes everyone in it
  if (player.x < -21) for (const e of enemies) if (Math.hypot(e.x - player.x, e.z - player.z) < 45) alertEnemy(e, false);
  scene.updateMatrixWorld();
  ray.setFromCamera(new THREE.Vector2((Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread), camera);
  const list = ray.intersectObjects(shootables.concat(enemyParts), false);
  for (const h of list) {
    const ud = h.object.userData;
    if (ud.round && h.uv && Math.hypot(h.uv.x - 0.5, h.uv.y - 0.5) > 0.5) continue;
    tmpN.copy(h.face.normal).transformDirection(h.object.matrixWorld);
    if (tmpN.dot(ray.ray.direction) > 0) tmpN.negate();
    tmpP.copy(h.point).addScaledVector(tmpN, 0.03);
    if (ud.enemy) { spawnParts(tmpP, tmpN, M.puff, 5); hitEnemy(ud.enemy, ud.part, w.dmg); break; }
    spawnParts(tmpP, tmpN, ud.wood, w.auto ? 4 : 7);
    if (ud.target) {
      if (!ud.target.down) {
        ud.target.down = true; ud.target.v = -2.5; S.hits++;
        say(S.hits >= targets.length ? 'ALL TARGETS DOWN - OBJECTIVE COMPLETE' : 'TARGET DOWN  ' + S.hits + '/' + targets.length, 3);
        if (S.hits >= targets.length) { S.cycleT = 7; SFX.done(); }
      }
      SFX.wood();
    } else {
      placeDecal(tmpP, tmpN);
      (ud.wood ? SFX.wood : SFX.stone)();
    }
    break;
  }
}
export function tryReload() {
  const w = curW();
  if (gun.state !== 'idle' || w.ammo >= w.mag || w.reserve <= 0) return;
  gun.state = 'reload'; gun.t = 0;
}
