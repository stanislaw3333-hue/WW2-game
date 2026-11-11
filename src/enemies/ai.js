// Enemy AI: line of sight, navigation through the archway, per-frame movement, aiming and falling.
import * as THREE from 'three';
import { V3, clamp, lerp, angLerp } from '../core/util.js';
import { S, player, enemies, shootables } from '../core/state.js';
import { camera } from '../render/renderer.js';
import { ENEMY, ARCH_WAYPOINTS } from '../core/config.js';
import { SFX } from '../audio/audio.js';
import { resolve } from '../player/collide.js';
import { poseEnemy } from './soldiers.js';
import { alertEnemy, enemyShoot } from './combat.js';
import { updateChatter } from './chatter.js';

const losRay = new THREE.Raycaster(), losA = new V3(), losD = new V3();
function hasLOS(e) {
  losA.set(e.x, 1.6, e.z); losD.copy(camera.position).sub(losA);
  const d = losD.length(); if (d < 0.5) return true;
  losRay.set(losA, losD.divideScalar(d)); losRay.near = 0.3; losRay.far = d - 0.2;
  return losRay.intersectObjects(shootables, false).length === 0;
}

// the two courtyards are joined by one archway, so enemies route through it
const { A: WP_A, B: WP_B } = ARCH_WAYPOINTS;
const zoneOf = x => (x > -21 ? 0 : x < -32 ? 2 : 1);
function navTarget(e) {
  const ze = zoneOf(e.x), zp = zoneOf(player.x);
  if (ze === zp) return player;
  if (ze === 2) return Math.hypot(e.x - WP_B.x, e.z - WP_B.z) > 1.2 ? WP_B : WP_A;
  if (ze === 0) return Math.hypot(e.x - WP_A.x, e.z - WP_A.z) > 1.2 ? WP_A : WP_B;
  return zp === 0 ? WP_A : WP_B;
}
export function updateEnemies(dt) {
  const live = S.state === 'play';
  updateChatter();
  for (const e of enemies) {
    const dx = player.x - e.x, dz = player.z - e.z, dist = Math.hypot(dx, dz) || 0.01;
    if (!e.alive) {
      if (e.fall < 1.5708) {
        e.fallV += 9 * dt; e.fall = Math.min(1.5708, e.fall + e.fallV * dt);
        if (e.fall >= 1.5708 && !e.thud) { e.thud = true; SFX.thud(dist); }
      }
      e.body.rotation.x = -e.fall; e.body.position.y = Math.sin(e.fall) * 0.13;
      if (e.fall < 1.5708) { e.aim = lerp(e.aim, 0, 1 - Math.exp(-dt * 6)); e.mv = lerp(e.mv, 0.5, 1 - Math.exp(-dt * 6)); e.flinch = 0; poseEnemy(e); }
      continue;
    }
    e.losT -= dt;
    if (e.losT <= 0) {
      e.losT = 0.18 + Math.random() * 0.12;
      const had = e.los;
      // while the player is in the passage, soldiers in the enemy yard cannot see them; they are seen once inside the courtyard
      const hidden = zoneOf(player.x) === 1 && zoneOf(e.x) !== 1;
      e.los = live && !hidden && dist < ENEMY.sightRange && hasLOS(e);
      if (e.los && !e.alert) {
        const facing = (Math.sin(e.yaw) * dx + Math.cos(e.yaw) * dz) / dist;
        if (dist < 7 || (dist < 28 && facing > 0.1)) alertEnemy(e);
      }
      if (e.los && !had) e.shootT = Math.max(e.shootT, 0.6 + Math.random() * 0.7);
    }
    let mvx = 0, mvz = 0, speed = 0, face = e.yaw, aim = 0;
    if (e.alert && live) {
      if (e.los && dist < e.range) {
        aim = 1; face = Math.atan2(dx, dz);
        e.strafeT -= dt;
        if (e.strafeT <= 0) { e.strafeDir = e.strafeDir ? 0 : (Math.random() < 0.5 ? -1 : 1); e.strafeT = e.strafeDir ? 0.6 + Math.random() * 0.6 : 1.5 + Math.random() * 2.5; }
        if (dist < 3.5) { mvx = -dx / dist; mvz = -dz / dist; speed = ENEMY.retreatSpeed; }
        else if (e.strafeDir) { mvx = dz / dist * e.strafeDir; mvz = -dx / dist * e.strafeDir; speed = ENEMY.strafeSpeed; }
      } else {
        const t = navTarget(e);
        let tx = t.x - e.x, tz = t.z - e.z; const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
        if (e.sideT > 0) { e.sideT -= dt; const s = e.sideDir, ax = tx * 0.25 - tz * s, az = tz * 0.25 + tx * s, al = Math.hypot(ax, az); tx = ax / al; tz = az / al; }
        mvx = tx; mvz = tz; speed = ENEMY.chaseSpeed; aim = e.los ? 0.85 : 0.35;
        face = e.los ? Math.atan2(dx, dz) : Math.atan2(tx, tz);
      }
      if (e.los) { e.shootT -= dt; if (e.shootT <= 0) enemyShoot(e, dist, speed > 2); }
    } else if (e.patrol) {
      if (e.waitT > 0) e.waitT -= dt;
      else {
        const p = e.patrol[e.pi], tx = p[0] - e.x, tz = p[1] - e.z, tl = Math.hypot(tx, tz);
        if (tl < 0.4) { e.pi = (e.pi + 1) % e.patrol.length; e.waitT = 1.5 + Math.random() * 2; }
        else { mvx = tx / tl; mvz = tz / tl; speed = ENEMY.patrolSpeed; face = Math.atan2(tx, tz); }
      }
    } else face = e.home.yaw + Math.sin(S.time * 0.4 + e.home.x) * 0.5;
    let moved = 0;
    if (speed > 0) {
      const ox = e.x, oz = e.z;
      e.x += mvx * speed * dt; e.z += mvz * speed * dt; resolve(e, e);
      moved = Math.hypot(e.x - ox, e.z - oz) / Math.max(dt, 1e-4);
      if (speed > 2 && moved < speed * 0.35) { e.stuckT += dt; if (e.stuckT > 0.3 && e.sideT <= 0) { e.sideT = 0.9 + Math.random() * 0.8; e.sideDir = Math.random() < 0.5 ? -1 : 1; e.stuckT = 0; } }
      else e.stuckT = 0;
    }
    e.mv = lerp(e.mv, clamp(moved / 3, 0, 1), 1 - Math.exp(-dt * 10));
    e.walk += moved * dt * 2.6;
    e.yaw = angLerp(e.yaw, face, 1 - Math.exp(-dt * 7));
    e.aim = lerp(e.aim, aim, 1 - Math.exp(-dt * 8));
    e.flinch = Math.max(0, e.flinch - dt * 4);
    e.body.rotation.x = -e.flinch * 0.2;
    poseEnemy(e);
    e.g.position.set(e.x, 0, e.z); e.g.rotation.y = e.yaw;
    if (e.flash > 0) e.flash -= dt;
    e.flashM.visible = e.flash > 0;
  }
}
