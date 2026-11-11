// Session flow: starting or restarting a run, and the pointer lock that captures the mouse.
import { TEST } from './core/util.js';
import { PLAYER } from './core/config.js';
import { S, say, player, enemies } from './core/state.js';
import { canvas } from './render/renderer.js';
import { startAudio } from './audio/audio.js';
import { resetEnemy, refreshEnemyParts } from './enemies/soldiers.js';
import { WEAPONS, gun } from './weapons/guns.js';

export function start() {
  startAudio();
  if (S.state === 'dead') { if (S.deadT < 1.2) return; resetGame(); }
  if (S.state === 'title') { say('OBJECTIVE: KNOCK DOWN THE 6 PRACTICE TARGETS', 6); S.hintT = 7; }
  S.state = 'play';
  if (!TEST) { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ } }
}
function resetGame() {
  Object.assign(player, { x: PLAYER.spawn.x, z: PLAYER.spawn.z, y: 0, vy: 0, yaw: 0, pitch: 0, hp: PLAYER.maxHp, hurt: 0, lastHit: -99 });
  for (const w of WEAPONS) { w.ammo = w.mag; w.reserve = w.max; }
  gun.state = 'idle'; gun.t = 0; gun.cool = 0; gun.kick = 0; gun.camKick = 0;
  enemies.forEach(resetEnemy); refreshEnemyParts(); S.kills = 0; S.zoneMsg = 0;
  for (const e of enemies) { e.g.position.set(e.x, 0, e.z); e.g.rotation.y = e.yaw; }
  say('TRY AGAIN', 2.5);
}
