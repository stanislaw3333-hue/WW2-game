// Per-frame player update: look, movement, weapon state machine, reload and switch animation, and the viewmodel pose.
import { V3, clamp, lerp, sstep } from '../core/util.js';
import { S, say, player, keys } from '../core/state.js';
import { PLAYER, GRENADE, K98_CLIP_IN_T } from '../core/config.js';
import { camera } from '../render/renderer.js';
import { SFX } from '../audio/audio.js';
import { G, WEAPONS, gun, curW } from '../weapons/guns.js';
import { resolve } from './collide.js';
import { fire, tryReload, startThrow } from './shooting.js';
import { launchGrenade } from '../effects/grenade.js';

function boltCycle(u) { // u 0..1 -> [rotation 0..1, pulled back 0..1]
  return [sstep(0, 0.22, u) - sstep(0.78, 1, u), sstep(0.22, 0.45, u) - sstep(0.55, 0.78, u)];
}
export function update(dt) {
  S.time += dt;
  // look
  const sens = 0.0023 * lerp(1, 0.55, gun.ads);
  player.yaw -= S.mdx * sens; player.pitch = clamp(player.pitch - S.mdy * sens, -1.35, 1.35);
  const turn = (keys.ArrowLeft ? 1 : 0) - (keys.ArrowRight ? 1 : 0);
  player.yaw += turn * 1.9 * dt;
  gun.swayX = lerp(gun.swayX, clamp(S.mdx * 0.0006 + turn * -0.012, -0.03, 0.03), 1 - Math.exp(-dt * 9));
  gun.swayY = lerp(gun.swayY, clamp(S.mdy * 0.0006, -0.03, 0.03), 1 - Math.exp(-dt * 9));
  S.mdx = S.mdy = 0;
  // move
  let mx = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0), mz = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
  const ml = Math.hypot(mx, mz); if (ml > 0) { mx /= ml; mz /= ml; }
  const crouching = keys.KeyC || keys.ControlLeft;
  player.crouch = lerp(player.crouch, crouching ? 1 : 0, 1 - Math.exp(-dt * 10));
  const sprint = (keys.ShiftLeft || keys.ShiftRight) && mz > 0 && !crouching && gun.ads < 0.3;
  const speed = (sprint ? PLAYER.sprintSpeed : PLAYER.walkSpeed) * lerp(1, 0.5, player.crouch) * lerp(1, 0.6, gun.ads);
  const s = Math.sin(player.yaw), c = Math.cos(player.yaw);
  const ox = player.x, oz = player.z;
  player.x += (-s * mz + c * mx) * speed * dt; player.z += (-c * mz - s * mx) * speed * dt;
  resolve(player);
  const moved = Math.hypot(player.x - ox, player.z - oz) / Math.max(dt, 1e-4);
  player.move = lerp(player.move, clamp(moved / 3.3, 0, 1.6), 1 - Math.exp(-dt * 10));
  if (keys.Space && player.y === 0) { player.vy = PLAYER.jumpVel; }
  player.vy -= PLAYER.gravity * dt; player.y = Math.max(0, player.y + player.vy * dt); if (player.y === 0) player.vy = 0;
  const pb = player.bob; player.bob += moved * dt * 1.75;
  if (player.y === 0 && moved > 0.5 && Math.floor(pb / Math.PI) !== Math.floor(player.bob / Math.PI)) { player.stepAlt = !player.stepAlt; SFX.step(player.stepAlt, sprint); }

  // weapon state
  const w = curW();
  gun.t += dt; gun.cool -= dt; gun.heat = Math.max(0, gun.heat - dt * 0.9); gun.boltT = Math.max(0, gun.boltT - dt);
  if (S.wantW >= 0) {
    if (gun.state === 'idle' && S.wantW !== gun.w) { gun.state = 'switch'; gun.t = 0; gun.next = S.wantW; gun.swapped = false; S.wantW = -1; }
    else if (gun.state !== 'fire') S.wantW = -1;
  }
  const want = S.adsHeld && gun.state !== 'reload' && gun.state !== 'switch' && !sprint && w.kind !== 'grenade';
  gun.ads = lerp(gun.ads, want ? 1 : 0, 1 - Math.exp(-dt * 12));
  if ((S.firePressed || (w.auto && S.fireHeld)) && gun.state === 'idle' && gun.cool <= 0) {
    if (w.ammo > 0) { if (w.kind === 'grenade') startThrow(); else fire(); }
    else if (w.reserve > 0) tryReload();
    else if (S.firePressed) { SFX.click(0, 3200); say('OUT OF AMMO', 2.5); }
  }
  S.firePressed = false;
  // automatic fire sound runs while the trigger is held and the gun can actually fire
  SFX.autoFire(w.auto && S.fireHeld && gun.state === 'idle' && w.ammo > 0);
  let rot = 0, back = 0, cyc = 0, low = 0, mDrop = 0, mRise = 0, mSwap = false, clipOn = false, clipY = 0, press = 0, thr = 0, whip = 0;
  if (gun.state === 'switch') {
    const t = gun.t;
    low = t < 0.26 ? sstep(0, 0.24, t) : 1 - sstep(0.28, 0.52, t);
    if (!gun.swapped && t >= 0.26) { gun.swapped = true; gun.w = gun.next; WEAPONS.forEach((x, i) => { x.m.root.visible = i === gun.w; }); }
    if (t > 0.52) gun.state = 'idle';
  } else if (gun.state === 'throw') {
    // stielhandgranate: wind back, whip forward, let go at the release frame, then the next grenade is readied from reserve
    const t = gun.t;
    // slow raise (thr: 1 = arm up and back), then the swing forward (whip: 1 = arm out in front); the grenade leaves just as the arm starts to come down, and the short swing ends soon after
    const swing = sstep(GRENADE.windT, GRENADE.windT + GRENADE.swingT, t);
    thr = sstep(0, GRENADE.windT, t) * (1 - swing);
    whip = swing * (1 - sstep(GRENADE.throwT - 0.3, GRENADE.throwT, t));
    if (!gun.thrown && t >= GRENADE.releaseT) { gun.thrown = true; launchGrenade(); SFX.grenadeThrow(); }
    if (t >= GRENADE.throwT) { gun.state = 'idle'; const n = Math.min(w.mag - w.ammo, w.reserve); w.ammo += n; w.reserve -= n; }
  } else if (!w.auto) {
    if (gun.state === 'fire') {
      const u = clamp((gun.t - 0.3) / 0.85, 0, 1); [rot, back] = boltCycle(u); cyc = Math.sin(u * Math.PI);
      const p = gun.t - dt;
      if (p < 0.32 && gun.t >= 0.32) SFX.bolt();
      if (p < 0.5 && gun.t >= 0.5) { G.brass.visible = true; G.brassLife = 0.5; G.brass.scale.setScalar(1); G.brass.position.copy(w.m.root.position).add(new V3(0.03, 0.06, 0.05)); G.brassV.set(0.9 + Math.random() * 0.4, 1.3, 0.2); }
      if (gun.t > 1.2) { gun.state = 'idle'; if (w.ammo === 0 && w.reserve > 0) tryReload(); }
    } else if (gun.state === 'reload') {
      const t = gun.t, p = t - dt;
      low = sstep(0, 0.35, t) - sstep(2.3, 2.65, t);
      rot = sstep(0.35, 0.5, t) - sstep(1.95, 2.1, t); back = sstep(0.5, 0.7, t) - sstep(1.75, 1.95, t);
      // the reload sample (started in tryReload) carries the mechanical sounds; only the refill happens here
      if (p < 1.35 && t >= 1.35) { const n = Math.min(w.mag - w.ammo, w.reserve); w.ammo += n; w.reserve -= n; }
      if (p < K98_CLIP_IN_T && t >= K98_CLIP_IN_T) SFX.clipIn();
      // stripper clip: hand brings it down onto the open receiver, rounds drop in, clip is discarded
      clipOn = t > 0.7 && t < 1.38;
      clipY = 0.13 - sstep(0.75, 1.05, t) * 0.083;
      press = sstep(0.75, 1.05, t) - sstep(1.2, 1.38, t);
      if (t > 2.65) gun.state = 'idle';
    }
  } else {
    back = gun.boltT / 0.1;
    if (gun.state === 'reload') {
      const t = gun.t, p = t - dt;
      low = sstep(0, 0.3, t) - sstep(1.95, 2.3, t);
      // magazine swap: old magazine drops out, the fresh one rises into the well, then the bolt is charged
      mDrop = sstep(0.35, 0.8, t); mRise = sstep(0.9, 1.3, t); mSwap = t >= 0.9 && t < 1.35;
      if (p < 1.28 && t >= 1.28) { const n = Math.min(w.mag - w.ammo, w.reserve); w.ammo += n; w.reserve -= n; }
      if (p < 1.7 && t >= 1.7) gun.boltT = 0.1;
      if (t > 2.3) gun.state = 'idle';
    } else if (gun.state === 'idle' && w.ammo === 0 && w.reserve > 0 && gun.cool <= -0.25) tryReload();
  }
  const cw = curW(), gm = cw.m;
  gun.kick = Math.max(0, gun.kick - dt * (cw.auto ? 9 : 6.5)); gun.camKick = Math.max(0, gun.camKick - dt * 5); gun.flash -= dt;
  const k = gun.kick * gun.kick, a = gun.ads, mv = player.move * (1 - a * 0.85);
  const bx = Math.cos(player.bob) * 0.009 * mv, by = -Math.abs(Math.sin(player.bob)) * 0.01 * mv;
  const breathe = Math.sin(S.time * 1.4) * 0.0025 * (1 - a * 0.6);
  gm.root.position.set(
    lerp(cw.hip[0], 0, a) + bx + gun.swayX * (1 - a * 0.7) + cyc * 0.01,
    lerp(cw.hip[1], cw.adsY, a) + by + breathe + gun.swayY * (1 - a * 0.7) - cyc * 0.018 - low * 0.05 - (sprint ? 0.03 : 0) * (1 - a),
    lerp(cw.hip[2], cw.adsZ, a) + k * cw.kz);
  gm.root.rotation.set(lerp(0.035, 0, a) + k * cw.kr - low * 0.25 + cyc * 0.03, lerp(cw.hipYaw, 0, a) + gun.swayX * 1.5 + low * 0.2, -cyc * 0.22 + low * 0.3 - gun.swayX * 2);
  // aim down sights: the back of the gun is lifted by adsTilt about the muzzle, so the muzzle (the flash point) stays where it is
  const tilt = -(cw.adsTilt || 0) * a;   // negative x turns the +Z (back) end up
  const fy = gm.flash.position.y, fz = gm.flash.position.z, cs = Math.cos(tilt), sn = Math.sin(tilt);
  gm.root.rotation.x += tilt;
  gm.root.position.y += fy - (fy * cs - fz * sn);
  gm.root.position.z += fz - (fy * sn + fz * cs);
  if (cw.kind === 'grenade') {
    // overarm throw: the arm is raised high and back on the windup (head tipped back), then swings forward and down over the top through the release
    // the whole viewmodel turns about the bottom of the arm (GRENADE.pivot, in grenade space), like an arm swinging from the shoulder: up and back on the windup, forward on the swing
    const q0 = gm.root.quaternion.clone();
    gm.root.rotation.x += thr * GRENADE.raiseAng - whip * GRENADE.forwardAng; gm.root.rotation.y -= whip * 0.2;
    const pv = new V3(...GRENADE.pivot);
    gm.root.position.add(pv.clone().applyQuaternion(q0)).sub(pv.clone().applyQuaternion(gm.root.quaternion));
    gm.nade.visible = gun.state === 'throw' ? !gun.thrown : w.ammo > 0;   // the grenade in hand; gone once released
  } else if (!cw.auto) {
    gm.bolt.rotation.z = rot * 1.45; gm.bolt.position.z = -0.045 + back * 0.085;
    const hw = gun.state === 'fire' ? sstep(0.18, 0.32, gun.t) - sstep(1.02, 1.18, gun.t) : 0;
    // the right hand moves from its rest grip onto the bolt knob (about 0.05 right, 0.05 up, 0.2 forward of the rest hand) and rides back with the bolt
    gm.right.position.set(0.046 * hw, (0.049 + rot * 0.035) * hw, (-0.195 + back * 0.085) * hw);
    gm.right.position.y -= press * 0.035;                             // right hand presses the clip in
    gm.clip.visible = clipOn; gm.clip.position.y = clipY;
  } else {
    gm.bolt.position.z = back * 0.08;   // the baked bolt (slide) rests at its model position and slides back on each shot
    gm.mag.position.y = -mDrop * 0.35; gm.mag.rotation.x = mDrop * 0.3; gm.mag.visible = !mSwap;
    gm.magNew.visible = mSwap; gm.magNew.position.y = -0.35 + mRise * 0.35;
    gm.left.position.set(0, -mDrop * 0.16, mDrop * 0.03);
  }
  gm.flash.visible = gm.flash2.visible = gun.flash > 0;
  if (G.brassLife > 0) { G.brassLife -= dt; G.brassV.y -= 9 * dt; G.brass.position.addScaledVector(G.brassV, dt); G.brass.rotation.x += dt * 20; G.brass.rotation.z += dt * 13; if (G.brassLife <= 0) G.brass.visible = false; }

  // health: slow recovery once nobody has hit you for a while
  player.hurt = Math.max(0, player.hurt - dt * 2.2);
  if (player.hp < PLAYER.maxHp && S.time - player.lastHit > PLAYER.regenDelay) player.hp = Math.min(PLAYER.maxHp, player.hp + PLAYER.regenRate * dt);
  // hints as you move between the yards
  // objective cycle

  // camera
  const eye = lerp(1.68, 1.05, player.crouch) + player.y + Math.abs(Math.sin(player.bob)) * 0.045 * player.move;
  camera.position.set(player.x, eye, player.z);
  camera.rotation.set(player.pitch + gun.camKick * gun.camKick * 0.035, player.yaw, Math.cos(player.bob) * 0.004 * player.move);
  camera.fov = lerp(62, cw.fov, a);
}
