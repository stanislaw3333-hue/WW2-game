// Enemy grenade throwing, to flush out a player who hides: when nobody alerted has seen him for ENEMY_GRENADE.hiddenT s and he
// has not fired for quietT s, the nearest soldier with grenades (spawn `grenades: n`) in range takes a Stielhandgranate from his
// belt, cocks his arm back and lobs it onto him. One throw at a time, then squadCooldown s before the next. The throw is the ANIMS.nade.throw animation (enemies/poses.js), played by poseEnemy from e.gT;
// the grenade then flies, bounces and explodes like the player's (effects/grenade.js). Numbers are ENEMY_GRENADE in core/config.js.
import { V3 } from '../core/util.js';
import { S, player, enemies } from '../core/state.js';
import { ENEMY_GRENADE as G, GRENADE } from '../core/config.js';
import { SFX } from '../audio/audio.js';
import { launchGrenadeAt } from '../effects/grenade.js';
import { handPoint } from './rig.js';
import { shoutFrom } from './combat.js';

const p0 = new V3(), v0 = new V3();

// true when no other soldier is within the safe distance of the player (the blast would hit him too)
function allySafe(e) {
  for (const o of enemies) if (o !== e && o.alive && Math.hypot(o.x - player.x, o.z - player.z) < G.allySafe) return false;
  return true;
}

// the grenade leaves the hand: from the throwing fist (where the rig's right hand is now) onto the player with a little scatter
function release(e, dist) {
  handPoint(e.rig, 'R', p0);
  const tx = player.x + (Math.random() * 2 - 1) * G.scatter, tz = player.z + (Math.random() * 2 - 1) * G.scatter;
  const T = Math.min(G.flightMax, Math.max(G.flightMin, dist / G.flightSpeed));          // flight time to the landing point
  v0.set((tx - p0.x) / T, 0, (tz - p0.z) / T);
  v0.y = (0.1 - p0.y + 0.5 * GRENADE.gravity * T * T) / T;                               // lands about on the ground at the target
  launchGrenadeAt(p0, v0);
  SFX.grenadeThrow(Math.min(1, Math.max(0.15, 1 / (1 + dist * 0.09))));
  e.nadeReleased = true;
}

// once per frame for the squad: how long the player has been hidden, and whether someone throws now
let hidden = 0, squadCd = 0;
export function updateGrenadeSquad(dt, live) {
  squadCd -= dt;
  let alerted = false, seen = false, busy = false;
  for (const e of enemies) if (e.alive) { if (e.alert) { alerted = true; if (e.los) seen = true; } if (e.gT >= 0) busy = true; }
  hidden = alerted && !seen ? hidden + dt : 0;
  if (!live || busy || squadCd > 0 || hidden < G.hiddenT || S.time - S.lastShotT < G.quietT) return;
  let best = null, bd = Infinity;
  for (const e of enemies) {
    if (!e.alive || !e.alert || e.grenades <= 0 || e.nadeCd > 0 || e.reloading || e.burstLeft > 0 || e.tac === 'evade') continue;
    const d = Math.hypot(player.x - e.x, player.z - e.z);
    if (d >= G.minRange && d <= G.maxRange && d < bd && allySafe(e)) { best = e; bd = d; }
  }
  if (!best) return;
  best.gT = 0; best.throwPose = 'hold'; best.nadeReleased = false; squadCd = G.squadCooldown;
  shoutFrom(best, 'Granate!');
}

// called every frame for a living enemy, before poseEnemy: plays out a throw started by updateGrenadeSquad
export function tickGrenadier(e, dt, dist) {
  e.nadeCd -= dt;
  if (e.gT < 0) return;
  e.gT += dt;
  e.shootT = Math.max(e.shootT, 0.5);                                                    // no rifle shots while he throws
  if (e.gT < G.holdT) e.throwPose = 'hold';
  else if (e.gT < G.holdT + G.windT) e.throwPose = 'wind';
  else {
    e.throwPose = 'throw';
    if (!e.nadeReleased) { release(e, dist); e.grenades--; }
    if (e.gT >= G.holdT + G.windT + G.throwT) { e.gT = -1; e.throwPose = null; }
  }
}
