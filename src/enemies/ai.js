// Enemy AI, per frame: noticing the player (sight, and hearing through enemies/hearing.js), the alerted soldier's
// tactics (enemies/tactics.js: cover, flanking, suppression, grenades), patrols and watch for the others, then
// movement, aiming, kneeling, leaning and the hit flinch. Deaths are enemies/death.js.
import { clamp, lerp, angLerp } from '../core/util.js';
import { S, player, enemies } from '../core/state.js';
import { ENEMY, ENEMY_FIRE, HEARING } from '../core/config.js';
import { resolve } from '../player/collide.js';
import { poseEnemy, runBlend } from './soldiers.js';
import { alertEnemy, enemyShoot, tickBurst } from './combat.js';
import { tickWeapon } from './weaponAnim.js';
import { tickGrenadier, updateGrenadeSquad } from './grenadier.js';
import { updateChatter } from './chatter.js';
import { hasLOS } from './sight.js';
import { stepNoise } from './hearing.js';
import { tactics, checkGrenades, updateSquad } from './tactics.js';
import { tickDeath } from './death.js';
import { FLINCH, WALK, TURN } from './poses.js';

let stepT = 0;
export function updateEnemies(dt) {
  const live = S.state === 'play';
  updateChatter();
  if (live) { if ((stepT -= dt) <= 0) { stepT = 0.25; stepNoise(); } updateSquad(dt); }
  updateGrenadeSquad(dt, live);
  for (const e of enemies) {
    if (e.frozen) { poseEnemy(e); e.g.position.set(e.x, 0, e.z); e.g.rotation.y = e.yaw; continue; }   // pose editor (debug/posetune.js)
    const dx = player.x - e.x, dz = player.z - e.z, dist = Math.hypot(dx, dz) || 0.01;
    if (!e.alive) { tickDeath(e, dt, dist); continue; }
    tickWeapon(e, dt, dist);
    tickGrenadier(e, dt, dist);
    if (e.burstLeft > 0) tickBurst(e, dt, dist);   // an MP40 burst keeps firing even if he loses sight for a moment
    e.eye = 1.6 - 0.52 * e.kneelV;
    e.losT -= dt;
    if (e.losT <= 0) {
      e.losT = 0.18 + Math.random() * 0.12;
      const had = e.los;
      e.los = live && dist < ENEMY.sightRange && hasLOS(e);
      if (e.los && !e.alert) {
        // he must be roughly facing the player beyond noticeClose; once aware (he heard something) he looks round and sees further
        const facing = (Math.sin(e.yaw) * dx + Math.cos(e.yaw) * dz) / dist, aware = e.awareT > 0;
        if (dist < ENEMY_FIRE.noticeClose || (dist < ENEMY_FIRE.noticeFar * (aware ? HEARING.awareFarMult : 1) && (aware || facing > 0.1))) alertEnemy(e);
      }
      if (e.los && !had) e.shootT = Math.max(e.shootT, 0.6 + Math.random() * 0.7);
      if (live) checkGrenades(e);
    }
    let mvx = 0, mvz = 0, speed = 0, face = e.yaw, aim = 0;
    e.kneel = 0; e.lean = 0;
    if (e.alert && live) {
      ({ mvx, mvz, speed, face, aim } = tactics(e, dt, dist, dx, dz));
      if (e.los && e.tac !== 'evade') { e.shootT -= dt; if (e.shootT <= 0) enemyShoot(e, dist, speed > 2); }
    } else if (e.awareT > 0 && live) {
      // on watch: stops where he is and looks toward the noise, gun at the ready
      e.awareT -= dt;
      face = Math.atan2(e.heardX - e.x, e.heardZ - e.z); aim = 0.5;
    } else if (e.patrol) {
      if (e.waitT > 0) e.waitT -= dt;
      else {
        const p = e.patrol[e.pi], tx = p[0] - e.x, tz = p[1] - e.z, tl = Math.hypot(tx, tz);
        if (tl < 0.4) { e.pi = (e.pi + 1) % e.patrol.length; e.waitT = 1.5 + Math.random() * 2; }
        else { mvx = tx / tl; mvz = tz / tl; speed = ENEMY.patrolSpeed; face = Math.atan2(tx, tz); }
      }
    } else face = e.home.yaw + Math.sin(S.time * 0.4 + e.home.x) * 0.5;
    // throwing: he stands where he is and faces the player
    if (e.gT >= 0) { mvx = mvz = speed = 0; face = Math.atan2(dx, dz); e.kneel = 0; e.lean = 0; }
    // he stands up before he moves; a leg hit slows him for a moment
    if (e.limpT > 0) { e.limpT -= dt; speed *= 0.45; }
    speed *= clamp(1 - e.kneelV * 1.5, 0, 1);
    let moved = 0;
    if (speed > 0) {
      // stuck against something while running: veer off to one side for a moment
      if (e.sideT > 0) { e.sideT -= dt; const s = e.sideDir, ax = mvx * 0.25 - mvz * s, az = mvz * 0.25 + mvx * s, al = Math.hypot(ax, az) || 1; mvx = ax / al; mvz = az / al; }
      const ox = e.x, oz = e.z;
      e.x += mvx * speed * dt; e.z += mvz * speed * dt; resolve(e, e);
      moved = Math.hypot(e.x - ox, e.z - oz) / Math.max(dt, 1e-4);
      if (speed > 2 && moved < speed * 0.35) { e.stuckT += dt; if (e.stuckT > 0.3 && e.sideT <= 0) { e.sideT = 0.9 + Math.random() * 0.8; e.sideDir = Math.random() < 0.5 ? -1 : 1; e.stuckT = 0; } }
      else e.stuckT = 0;
    }
    e.mv = lerp(e.mv, clamp(moved / 3, 0, 1), 1 - Math.exp(-dt * 10));
    e.walk += moved * dt * WALK.rate * lerp(1, WALK.run.stride, runBlend(e));
    const y0 = e.yaw;
    e.yaw = angLerp(e.yaw, face, 1 - Math.exp(-dt * 7));
    // how fast he is turning, for the foot shuffle (TURN in poses.js): one step per half turn of turnPh, at a steady pace
    const dy = Math.abs(Math.atan2(Math.sin(e.yaw - y0), Math.cos(e.yaw - y0)));
    e.turnV = lerp(e.turnV, dy / Math.max(dt, 1e-4), 1 - Math.exp(-dt * 8)); if (e.turnV > TURN.minRate) e.turnPh += dt * TURN.stepRate * Math.PI;
    e.aim = lerp(e.aim, aim, 1 - Math.exp(-dt * 8));
    e.kneelV = lerp(e.kneelV, e.kneel, 1 - Math.exp(-dt * 7));
    e.leanV = lerp(e.leanV, e.lean, 1 - Math.exp(-dt * 7));
    e.flinch = Math.max(0, e.flinch - dt * 3.5);
    e.body.rotation.x = -e.flinch * (e.hitPart ? FLINCH[e.hitPart].rock : 0.2);
    poseEnemy(e);
    e.g.position.set(e.x, 0, e.z); e.g.rotation.y = e.yaw;
    if (e.flash > 0) e.flash -= dt;
    e.flashM.visible = e.flash > 0;
  }
}
