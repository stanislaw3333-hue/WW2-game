// Per-frame world update: soldiers, practice targets, debris, light flicker and the nearest-light selection, water and sky.
import { clamp, lerp, V3 } from '../core/util.js';
import { S, targets, lightDefs } from '../core/state.js';
import { camera } from '../render/renderer.js';
import { worldL, gunL } from '../render/renderer.js';
import { M } from '../render/materials.js';
import { glows } from './geo.js';
import { sky } from './level.js';
import { updateEnemies } from '../enemies/ai.js';
import { updateParticles } from '../effects/fx.js';
import { SFX } from '../audio/audio.js';
import { gun } from '../weapons/guns.js';

let skyFlash = 0, nextRumble = 6;
const fwd = new V3();

export function updateWorld(dt) {
  updateEnemies(dt);
  // targets
  for (const t of targets) {
    if (t.down) { t.v -= 16 * dt; t.a += t.v * dt; if (t.a < -1.45) { t.a = -1.45; t.v = t.v < -1.5 ? -t.v * 0.25 : 0; } }
    else { t.a = lerp(t.a, 0, 1 - Math.exp(-dt * 6)); t.v = 0; }
    t.tilt.rotation.x = t.a;
  }
  updateParticles(dt, camera);
  for (const g of glows) g.quaternion.copy(camera.quaternion);
  // lights: flicker + muzzle flash
  lightDefs.forEach((l, i) => { l.f = 1 + Math.sin(S.time * 11 + i * 7) * 0.05 + Math.sin(S.time * 23.7 + i * 3) * 0.04; l.d = l.pos.distanceTo(camera.position); });
  const near = lightDefs.slice().sort((p, q) => p.d - q.d), d5 = near[4] ? near[4].d : 1e9;
  for (let i = 0; i < 4; i++) {
    const l = near[i];
    if (!l) { worldL.uLCol.value[i].set(0, 0, 0); continue; }
    const f = l.f * clamp((d5 - l.d) / 5, 0, 1);
    worldL.uLPos.value[i].copy(l.pos); worldL.uLCol.value[i].set(l.col[0] * f, l.col[1] * f, l.col[2] * f);
  }
  const fl = gun.flash > 0 ? 1 : 0;
  camera.getWorldDirection(fwd);
  worldL.uLPos.value[4].copy(camera.position).addScaledVector(fwd, 1.2);
  worldL.uLCol.value[4].set(2.6 * fl, 2.0 * fl, 1.1 * fl);
  // gun lighting from environment
  let er = worldL.uAmbient.value.x * 1.5, eg = worldL.uAmbient.value.y * 1.5, eb = worldL.uAmbient.value.z * 1.5;
  lightDefs.forEach(l => { const at = Math.pow(Math.max(1 - l.d / 16, 0), 2) * 0.55 * l.f; er += l.col[0] * at; eg += l.col[1] * at; eb += l.col[2] * at; });
  { const lum = (er + eg + eb) / 3; er = lerp(er, lum, 0.55) + 0.06; eg = lerp(eg, lum, 0.55) + 0.06; eb = lerp(eb, lum, 0.55) + 0.06; }
  gunL.uAmbient.value.set(er * 0.75 + fl * 1.2, eg * 0.75 + fl * 0.9, eb * 0.75 + fl * 0.5);
  gunL.uSunCol.value.set(er * 0.9, eg * 0.9, eb * 0.9);
  // water + sky
  M.water.uniforms.uUvOff.value.set(S.time * 0.03, Math.sin(S.time * 0.5) * 0.05);
  nextRumble -= dt;
  if (nextRumble <= 0) { nextRumble = 9 + Math.random() * 14; skyFlash = 1; if (S.state === 'play') SFX.rumble(); }
  skyFlash = Math.max(0, skyFlash - dt * 2.2);
  const sf = 1 + skyFlash * skyFlash * (0.5 + 0.5 * Math.sin(S.time * 40)) * 0.9;
  M.sky.uniforms.uTint.value.set(sf, sf * 0.94, sf * 0.85);
  sky.position.copy(camera.position);
}
