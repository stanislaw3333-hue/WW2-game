// Enemy combat: shouts, alerting, damage taken by enemies, damage dealt to the player, enemy gunfire.
import { clamp } from '../core/util.js';
import { S, player, enemies } from '../core/state.js';
import { ENEMY, ENEMY_FIRE as F, ENEMY_SUPPRESS as SUP, ENEMY_TACTICS as TAC, HEARING, VOICE_RADIUS } from '../core/config.js';
import { startDeath } from './death.js';
const rnd = ([a, b]) => a + Math.random() * (b - a);
import { SFX } from '../audio/audio.js';
import { gun, randomizeFlash } from '../weapons/guns.js';
import { refreshEnemyParts } from './soldiers.js';
import { stopConversation } from './chatter.js';
import { roundFired } from './weaponAnim.js';

// German callouts: a random clip from the sampled shout pool (no text to speech; silent if the clips are not loaded).
// A shared cooldown keeps several soldiers from talking over each other. The word is only a label for the reader.
let lastShout = -9;
export function shoutFrom(e, word, prob = 1) {
  if (!e.alive || Math.random() > prob || S.time - lastShout < F.shoutCooldown) return;
  const d = Math.hypot(e.x - player.x, e.z - player.z);
  if (d > VOICE_RADIUS) return;   // out of earshot: no callout
  lastShout = S.time;
  SFX.shout(d);
}
// a soldier who spots the player alerts the ones near him (they join the fight) and makes those further out aware
export function alertEnemy(e, spread = true) {
  if (!e.alive) return;
  if (!e.alert) { e.alert = true; e.awareT = 0; e.shootT = 0.7 + Math.random() * 0.8; stopConversation(); shoutFrom(e, 'Achtung!'); }
  if (spread) for (const o of enemies) {
    if (o === e || o.alert || !o.alive) continue;
    const d = Math.hypot(o.x - e.x, o.z - e.z);
    if (d < ENEMY.alertRadius) alertEnemy(o, false);
    else if (d < ENEMY.awareRadius) makeAware(o, player.x, player.z);
  }
}
// heard something (or was told): he turns toward (x, z) and watches for HEARING.awareT seconds
export function makeAware(e, x, z) {
  if (!e.alive || e.alert) return;
  if (e.awareT <= 0) stopConversation();
  e.awareT = HEARING.awareT; e.heardX = x; e.heardZ = z;
}
// a player round passed or struck within ENEMY_SUPPRESS.radius: d = how far from him (m)
export function suppressEnemy(e, d) {
  if (!e.alive) return;
  e.supp = Math.min(1, e.supp + SUP.add * (1 - 0.6 * d / SUP.radius));
  alertEnemy(e);
}
// part: hit box class (head / body / arm / leg); side: +1 left, -1 right, 0 centre (the hit box's bone side)
export function hitEnemy(e, part, dmg, side = 0) {
  e.hp -= dmg * (part === 'head' ? ENEMY.headMult : part === 'body' ? ENEMY.bodyMult : ENEMY.limbMult);
  e.flinch = 1; e.hitPart = part; e.hitSide = side || (Math.random() < 0.5 ? -1 : 1); SFX.hit(); alertEnemy(e);
  if (part === 'leg') e.limpT = 0.8;
  if (part === 'arm') e.shootT = Math.max(e.shootT, 0.5);
  if (e.tac === 'cover' && e.phase === 'expose' && Math.random() < 0.5) e.phaseT = 0;   // hit while up: often ducks back down
  if (e.hp > 0) { shoutFrom(e, 'Getroffen!', 0.35); return; }
  shoutFrom(e, 'Gefallen!', 0.8);
  e.alive = false; e.flash = 0; e.flashM.visible = false; e.gT = -1; e.throwPose = null; S.kills++; refreshEnemyParts();
  startDeath(e);
  SFX.death();
  const all = S.kills >= enemies.length;
  if (all) SFX.done();
}
// d damage; (fx, fz) is where it came from, for the compass flash (omitted: flashes straight ahead)
export function hurtPlayer(d, fx, fz) {
  S.dmgT = S.time;
  if (fx === undefined) { S.dmgDx = -Math.sin(player.yaw); S.dmgDz = -Math.cos(player.yaw); }
  else { S.dmgDx = fx - player.x; S.dmgDz = fz - player.z; }
  if (!S.god) player.hp -= d;
  player.hurt = 1; player.lastHit = S.time; SFX.hurt(); gun.camKick = Math.max(gun.camKick, 0.7);
  if (player.hp <= 0) { player.hp = 0; S.state = 'dead'; S.deadT = 0; S.fireHeld = S.adsHeld = false; S.messageT = 0; }
}
const BURST_GAP = F.burstGap;
// chance that one aimed shot by soldier e hits the player, from distance, movement, suppression and kneeling
function hitChance(e, dist, moving) {
  let p = clamp(F.hitBase - dist * F.hitFalloff, F.hitMin, F.hitMax);
  if (player.move > 0.9) p *= F.hitPlayerRunning;
  if (player.crouch > 0.5) p *= F.hitPlayerCrouched;
  if (moving) p *= F.hitWhileMoving;
  p *= 1 - SUP.accuracy * e.supp;
  if (e.kneelV > 0.7) p *= TAC.kneelHitMult;
  return p;
}
export function enemyShoot(e, dist, moving) {
  if (e.reloading || e.ammo <= 0) { e.shootT = 0.3; return; }   // empty or mid-reload: no shot
  shoutFrom(e, ['Feuer!', 'Halt!', 'Hier!'][(Math.random() * 3) | 0], 0.3);
  if (e.weapon === 'mp40') {
    // a long burst: the rounds are fired by tickBurst over the length of the burst sound, then a short pause
    const len = SFX.eburst(dist);
    e.burstLeft = len ? Math.max(6, Math.round(len / BURST_GAP)) : 10; e.burstT = 0; e.burstMoving = moving;
    if (!len) SFX.eshot(dist, 'mp40');
    e.shootT = e.burstLeft * BURST_GAP + rnd(F.burstPause);
    return;
  }
  e.shootT = rnd(F.rifleGap); roundFired(e);
  e.flash = 0.075; randomizeFlash(e.flashM);
  SFX.eshot(dist, e.weapon);
  if (Math.random() < hitChance(e, dist, moving)) hurtPlayer(rnd(F.rifleDmg), e.x, e.z);
  else if (Math.random() < 0.6) SFX.whiz();
}
// advances an MP40 burst: one round (muzzle flash and a small chance to hit) every BURST_GAP seconds
export function tickBurst(e, dt, dist) {
  e.burstT -= dt;
  while (e.burstLeft > 0 && e.burstT <= 0) {
    if (e.ammo <= 0) { e.burstLeft = 0; break; }   // magazine empty: the burst stops and he reloads
    e.burstLeft--; e.burstT += BURST_GAP; roundFired(e);
    e.flash = 0.05; randomizeFlash(e.flashM);
    if (Math.random() < hitChance(e, dist, e.burstMoving) * F.burstHitMult) hurtPlayer(rnd(F.burstDmg), e.x, e.z);
    else if (Math.random() < 0.08) SFX.whiz();
  }
}
