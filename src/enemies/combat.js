// Enemy combat: shouts, alerting, damage taken by enemies, damage dealt to the player, enemy gunfire.
import { clamp } from '../core/util.js';
import { S, player, enemies } from '../core/state.js';
import { ENEMY, VOICE_RADIUS } from '../core/config.js';
import { SFX } from '../audio/audio.js';
import { gun } from '../weapons/guns.js';
import { refreshEnemyParts } from './soldiers.js';
import { stopConversation } from './chatter.js';

// German callouts: a random clip from the sampled shout pool, or the browser's speech synthesis
// (German voice when the system has one) if the clips are not loaded. A shared cooldown keeps
// several soldiers from talking over each other. The word is only used by the speech fallback.
let lastShout = -9;
export function shoutFrom(e, word, prob = 1) {
  if (!e.alive || Math.random() > prob || S.time - lastShout < 1.2) return;
  const d = Math.hypot(e.x - player.x, e.z - player.z);
  if (d > VOICE_RADIUS) return;   // out of earshot: no callout, not even the speech fallback
  lastShout = S.time;
  if (SFX.shout(d)) return;
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(word);
  u.lang = 'de-DE'; u.pitch = 0.45; u.rate = 0.95; u.volume = 0.9;
  const v = speechSynthesis.getVoices().find(x => /^de/i.test(x.lang)); if (v) u.voice = v;
  speechSynthesis.speak(u);
}
export function alertEnemy(e, spread = true) {
  if (!e.alive) return;
  if (!e.alert) { e.alert = true; e.shootT = 0.7 + Math.random() * 0.8; stopConversation(); shoutFrom(e, 'Achtung!'); }
  if (spread) for (const o of enemies) if (o !== e && !o.alert && Math.hypot(o.x - e.x, o.z - e.z) < ENEMY.alertRadius) alertEnemy(o, false);
}
export function hitEnemy(e, part, dmg) {
  e.hp -= dmg * (part === 'head' ? ENEMY.headMult : part === 'body' ? ENEMY.bodyMult : ENEMY.limbMult);
  e.flinch = 1; SFX.hit(); alertEnemy(e);
  if (e.hp > 0) { shoutFrom(e, 'Getroffen!', 0.35); return; }
  shoutFrom(e, 'Gefallen!', 0.8);
  e.alive = false; e.fallV = 1.5; e.flash = 0; e.flashM.visible = false; S.kills++; refreshEnemyParts();
  const all = S.kills >= enemies.length;
  if (all) SFX.done();
}
export function hurtPlayer(d) {
  player.hp -= d; player.hurt = 1; player.lastHit = S.time; SFX.hurt(); gun.camKick = Math.max(gun.camKick, 0.7);
  if (player.hp <= 0) { player.hp = 0; S.state = 'dead'; S.deadT = 0; S.fireHeld = S.adsHeld = false; S.messageT = 0; }
}
export function enemyShoot(e, dist, moving) {
  e.shootT = 1.9 + Math.random() * 1.3; e.flash = 0.07; e.flashM.rotation.z = Math.random() * 6.28;
  SFX.eshot(dist);
  shoutFrom(e, ['Feuer!', 'Halt!', 'Hier!'][(Math.random() * 3) | 0], 0.3);
  let p = clamp(0.6 - dist * 0.015, 0.12, 0.5);
  if (player.move > 0.9) p *= 0.7;
  if (player.crouch > 0.5) p *= 0.75;
  if (moving) p *= 0.6;
  if (Math.random() < p) hurtPlayer(7 + Math.random() * 8);
  else if (Math.random() < 0.6) SFX.whiz();
}
