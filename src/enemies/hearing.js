// Hearing: noises the player makes (shots, footsteps, reloads, blasts) make the soldiers within earshot aware.
// Earshot is HEARING[kind] metres, cut by HEARING.wallMult when no line of sight joins the soldier and the noise.
import { player, enemies } from '../core/state.js';
import { HEARING as H } from '../core/config.js';
import { clearLine } from './sight.js';
import { alertEnemy, makeAware } from './combat.js';

// a noise at (x, z), heard within `radius` m. The soldier turns toward where the player is (shots and steps come from him).
export function noise(x, z, radius, y = 1.4) {
  for (const e of enemies) {
    if (!e.alive || e.alert) continue;
    const d = Math.hypot(e.x - x, e.z - z);
    if (d > radius) continue;
    if (d > radius * H.wallMult && !clearLine(e.x, 1.6, e.z, x, y, z)) continue;
    if (d < H.alertWithin) alertEnemy(e); else makeAware(e, player.x, player.z);
  }
}
export const gunNoise = auto => noise(player.x, player.z, auto ? H.smg : H.rifle);
export const reloadNoise = () => noise(player.x, player.z, H.reload);

// footsteps: called a few times a second; sprinting is loud, walking quiet, crouching silent
export function stepNoise() {
  if (player.crouch > 0.5 || player.y > 0.05) return;
  const r = player.move > 1.15 ? H.sprint : player.move > 0.3 ? H.walk : 0;
  if (r) noise(player.x, player.z, r, 0.2);
}
