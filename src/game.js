// Courtyard 1944: entry point. Imports every system (module order sets up the scene), then runs the frame loop.
import { TEST, lerp } from './core/util.js';
import { S, player, keys, enemies } from './core/state.js';
import { renderer, scene, gunScene, camera, gunCam, resize } from './render/renderer.js';
import './render/materials.js';
import './world/level.js';
import './player/input.js';
import { update } from './player/update.js';
import { updateWorld } from './world/update.js';
import { drawHUD } from './ui/hud.js';
import { start } from './session.js';
import { hurtPlayer } from './enemies/combat.js';
import { tryReload } from './player/shooting.js';
import { WEAPONS, gun } from './weapons/guns.js';
import { setListener } from './audio/audio.js';
import { LEVEL, loadLevel } from './levels/index.js';
const TC = LEVEL.titleCam;

addEventListener('resize', resize); resize();

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (S.state === 'play') update(dt);
  else if (S.state === 'title') {
    S.time += dt;
    const a = S.time * 0.09 + 1.2;
    camera.position.set(TC.center[0] + Math.sin(a) * TC.radius, TC.height + Math.sin(S.time * 0.2) * 0.6, TC.center[1] + Math.cos(a) * TC.radius);
    camera.lookAt(...TC.look); camera.fov = 62;
  }
  else if (S.state === 'dead') {
    S.time += dt; S.deadT += dt;
    const k = 1 - Math.exp(-dt * 4);
    camera.position.y = lerp(camera.position.y, 0.32, k); camera.rotation.z = lerp(camera.rotation.z, 0.55, k); camera.rotation.x = lerp(camera.rotation.x, 0.15, k);
  }
  if (S.state !== 'pause') updateWorld(dt);
  setListener(camera);
  if (S.messageT > 0 && S.state === 'play') S.messageT -= dt;
  if (S.debugCam) S.debugCam(camera);
  camera.updateProjectionMatrix();
  renderer.clear();
  renderer.render(scene, camera);
  if (S.state !== 'title' && S.state !== 'dead' && !S.hideGunT) { renderer.clearDepth(); renderer.render(gunScene, gunCam); }
  drawHUD();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// test hook for automated checks (only with ?test in the URL)
if (TEST) window.__g = {
  scene, gunScene,
  player, gun, keys, start, enemies, WEAPONS, fire: () => { S.firePressed = true; }, hold: v => { S.fireHeld = v; }, setAds: v => { S.adsHeld = v; },
  reload: tryReload, hideGun: v => { S.hideGunT = v; }, weapon: i => { S.wantW = i; }, hurt: hurtPlayer, get state() { return S.state; }, get kills() { return S.kills; },
  level: LEVEL, loadLevel,
};
if (TEST) import('./debug/smoke.js').then(m => { window.__g.smoke = () => m.smoke(window.__g); });
if (TEST) import('./debug/handtune.js');   // hand tuning mode: press H in the game (see the file header)
if (TEST) import('./enemies/rig.js').then(m => { window.__g.rig = m; });   // rig functions for debugging poses
if (TEST) import('./debug/posetune.js').then(m => { window.__g.pose = m.poseApi; window.__g.lineup = m.lineupApi; });   // enemy pose editor: press N (see the file header)
if (TEST) Promise.all([import('./enemies/cover.js'), import('./enemies/sight.js'), import('./enemies/combat.js'), import('./effects/grenade.js')]).then(([c, s, k, n]) => { window.__g.ai = { ...c, ...s, hitEnemy: k.hitEnemy, launchGrenadeAt: n.launchGrenadeAt, liveGrenades: n.liveGrenades }; });   // cover search, sight, hits and grenades for debugging tactics
if (TEST) Promise.all([import('./player/collide.js'), import('./core/state.js'), import('./enemies/death.js'), import('./enemies/poses.js'), import('./enemies/grenadier.js')]).then(([c, s, d, p, n]) => { window.__g.col = { resolve: c.resolve, boxes: s.boxes, circles: s.circles, S: s.S }; window.__g.death = { ...d, poses: p }; window.__g.nade = n; });   // collision push-outs, and deaths
