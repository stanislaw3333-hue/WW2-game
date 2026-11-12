// Firing and reloading: spread, hit resolution against enemies, targets and the level, and the gunfire alert.
import * as THREE from 'three';
import { V3, lerp } from '../core/util.js';
import { FIRE, ENEMY_SUPPRESS } from '../core/config.js';
import { S, player, enemies, enemyParts, shootables } from '../core/state.js';
import { scene, camera } from '../render/renderer.js';
import { M } from '../render/materials.js';
import { SFX } from '../audio/audio.js';
import { G, gun, curW, setFlashFrame, FLASH_FRAMES } from '../weapons/guns.js';
import { hitEnemy, suppressEnemy } from '../enemies/combat.js';
import { gunNoise, reloadNoise } from '../enemies/hearing.js';
import { spawnParts, placeDecal } from '../effects/fx.js';

const ray = new THREE.Raycaster(); ray.far = 200;
const tmpN = new V3(), tmpP = new V3();

export function fire() {
  const w = curW(), m = w.m;
  w.ammo--; gun.flash = w.auto ? 0.05 : 0.075; S.lastShotT = S.time;
  if (w.auto) {
    gun.cool = FIRE.autoCooldown; gun.kick = Math.min(1, gun.kick + 0.55); gun.camKick = Math.max(gun.camKick, 0.5); gun.boltT = 0.1;
    player.pitch = Math.min(1.35, player.pitch + FIRE.autoClimb * (1 + gun.heat)); player.yaw += (Math.random() - 0.5) * 0.007;
    G.brass.visible = true; G.brassLife = 0.4; G.brass.scale.setScalar(0.4); G.brass.position.copy(m.root.position).add(tmpP.set(0.03, 0.04, -0.1)); G.brassV.set(0.9 + Math.random() * 0.5, 1.1, 0.1);
    if (!SFX.autoFireReady()) SFX.smg();   // fallback only: the held-trigger loop plays the MP40 sound otherwise
  } else { gun.state = 'fire'; gun.t = 0; gun.kick = 1; gun.camKick = 1; SFX.shot(); }
  m.flash.rotation.z = Math.random() * 6.28; m.flash.scale.setScalar(0.8 + Math.random() * 0.5);
  const frame = (Math.random() * FLASH_FRAMES) | 0; setFlashFrame(m.flash, frame); setFlashFrame(m.flash2, frame);
  const spread = w.auto ? lerp(FIRE.autoSpreadHip, FIRE.autoSpreadAds, gun.ads) * (1 + gun.heat * FIRE.heatSpread) : FIRE.rifleSpreadHip * (1 - gun.ads);
  if (w.auto) gun.heat = Math.min(1, gun.heat + FIRE.heatPerShot);
  gunNoise(w.auto);   // soldiers within earshot (HEARING) become aware
  scene.updateMatrixWorld();
  ray.setFromCamera(new THREE.Vector2((Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread), camera);
  const list = ray.intersectObjects(shootables.concat(enemyParts), false);
  let hitE = null, len = ray.far;
  for (const h of list) {
    const ud = h.object.userData;
    if (ud.round && h.uv && Math.hypot(h.uv.x - 0.5, h.uv.y - 0.5) > 0.5) continue;
    len = h.distance;
    tmpN.copy(h.face.normal).transformDirection(h.object.matrixWorld);
    if (tmpN.dot(ray.ray.direction) > 0) tmpN.negate();
    tmpP.copy(h.point).addScaledVector(tmpN, 0.03);
    if (ud.enemy) { hitE = ud.enemy; spawnParts(tmpP, tmpN, M.puff, 5); hitEnemy(ud.enemy, ud.part, w.dmg, ud.side); break; }
    spawnParts(tmpP, tmpN, ud.wood, w.auto ? 4 : 7);
    placeDecal(tmpP, tmpN);
    (ud.wood ? SFX.wood : SFX.stone)();
    break;
  }
  suppressAlong(ray.ray, len, hitE);
}
// suppression: every other living soldier whose chest is within ENEMY_SUPPRESS.radius of the round's path (up to where it struck)
function suppressAlong(r, len, hitE) {
  for (const e of enemies) {
    if (!e.alive || e === hitE) continue;
    tmpP.set(e.x, (e.eye || 1.6) - 0.35, e.z).sub(r.origin);
    const t = Math.max(0, Math.min(len, tmpP.dot(r.direction)));
    const d = tmpP.addScaledVector(r.direction, -t).length();
    if (d < ENEMY_SUPPRESS.radius) suppressEnemy(e, d);
  }
}
// pull the pin and start the throw: the grenade leaves the hand at its release frame (update.js), the next one is readied after
export function startThrow() {
  const w = curW();
  w.ammo--; gun.state = 'throw'; gun.t = 0; gun.thrown = false; S.lastShotT = S.time;
  SFX.click(0, 1400);
}
export function tryReload() {
  const w = curW();
  if (w.kind === 'grenade' || gun.state !== 'idle' || w.ammo >= w.mag || w.reserve <= 0) return;
  gun.state = 'reload'; gun.t = 0; SFX.reload(w.id); reloadNoise();
}
