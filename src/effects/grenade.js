// Stielhandgranate: thrown grenades in flight (gravity, bounce off the ground and walls, fuse), and the blast when the fuse ends:
// damage to soldiers and the player inside the radius, a fireball, an expanding shock ring and debris.
// Both kinds of object are fixed pools that are recycled, like the bullet decals and debris in fx.js.
import * as THREE from 'three';
import { V3 } from '../core/util.js';
import { S, player, enemies, boxes, circles } from '../core/state.js';
import { GRENADE } from '../core/config.js';
import { scene, camera } from '../render/renderer.js';
import { M, T } from '../render/materials.js';
import { SFX } from '../audio/audio.js';
import { gun } from '../weapons/guns.js';
import { hitEnemy, hurtPlayer, alertEnemy } from '../enemies/combat.js';
import { spawnParts } from './fx.js';

const R = GRENADE.radius, GROUND = 0.05, RAD = 0.05;   // blast radius; grenade rests on the ground at this height; collision radius
const UP = new V3(0, 1, 0);
const live = [], spare = [];      // grenades in flight, and recycled models

// a stick grenade: metal canister on top of a wooden handle, tumbling as it flies
function makeNade() {
  const g = new THREE.Group();
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.09, 8), M.grenadeMetal);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.14, 6), M.grenadeWood);
  head.position.y = 0.05; handle.position.y = -0.04;
  g.add(head, handle); scene.add(g);
  return { mesh: g, p: new V3(), v: new V3(), fuse: 0 };
}

// release from the throwing hand, along the view direction, when the throw animation reaches its release frame
export function launchGrenade() {
  const dir = camera.getWorldDirection(new V3());
  const g = spare.pop() || makeNade();
  const right = new V3().crossVectors(dir, camera.up).normalize();   // to the player's right
  const [ox, oy, oz] = GRENADE.releaseOffset;
  g.p.copy(camera.position).addScaledVector(right, ox).addScaledVector(dir, oz); g.p.y += oy;
  g.v.copy(dir).multiplyScalar(GRENADE.throwSpeed); g.v.y += GRENADE.throwLift;
  g.fuse = GRENADE.fuse; g.mesh.visible = true; g.mesh.position.copy(g.p);
  live.push(g);
}

// bounce off a wall rectangle (x0..x1, z0..z1) grown by the grenade's radius, through the nearest face
function bounceBox(g, b) {
  const p = g.p, v = g.v, e = GRENADE.bounce;
  if (p.x <= b.x0 - RAD || p.x >= b.x1 + RAD || p.z <= b.z0 - RAD || p.z >= b.z1 + RAD) return;
  const dl = p.x - (b.x0 - RAD), dr = b.x1 + RAD - p.x, dn = p.z - (b.z0 - RAD), df = b.z1 + RAD - p.z;
  const m = Math.min(dl, dr, dn, df);
  if (m === dl) { p.x = b.x0 - RAD; v.x = -Math.abs(v.x) * e; }
  else if (m === dr) { p.x = b.x1 + RAD; v.x = Math.abs(v.x) * e; }
  else if (m === dn) { p.z = b.z0 - RAD; v.z = -Math.abs(v.z) * e; }
  else { p.z = b.z1 + RAD; v.z = Math.abs(v.z) * e; }
}
// bounce off a round pillar: push out along the radius and reflect the inward speed
function bounceCircle(g, c) {
  const p = g.p, v = g.v, e = GRENADE.bounce;
  const dx = p.x - c.cx, dz = p.z - c.cz, d = Math.hypot(dx, dz), min = c.r + RAD;
  if (d >= min || d < 1e-6) return;
  const nx = dx / d, nz = dz / d;
  p.x = c.cx + nx * min; p.z = c.cz + nz * min;
  const vn = v.x * nx + v.z * nz;
  if (vn < 0) { v.x -= (1 + e) * vn * nx; v.z -= (1 + e) * vn * nz; }
}

// moves every grenade in flight, bounces it, and detonates the ones whose fuse has run out
export function updateGrenades(dt) {
  for (let i = live.length - 1; i >= 0; i--) {
    const g = live[i];
    g.fuse -= dt;
    g.v.y -= GRENADE.gravity * dt;
    g.p.addScaledVector(g.v, dt);
    if (g.p.y < GROUND) {
      g.p.y = GROUND;
      if (g.v.y < 0) { g.v.y = -g.v.y * GRENADE.bounce; g.v.x *= 0.6; g.v.z *= 0.6; }
    }
    for (const b of boxes) bounceBox(g, b);
    for (const c of circles) bounceCircle(g, c);
    g.mesh.position.copy(g.p);
    g.mesh.rotation.x += dt * 7 * Math.min(1, g.v.length() * 0.2);
    g.mesh.rotation.z += dt * 3;
    if (g.fuse <= 0) {
      live[i] = live[live.length - 1]; live.pop();
      g.mesh.visible = false; spare.push(g);
      explode(g.p);
    }
  }
  updateBlasts(dt);
}

// drop every grenade in flight (used when a new game starts)
export function clearGrenades() {
  while (live.length) { const g = live.pop(); g.mesh.visible = false; spare.push(g); }
}

// ---- blast: damage, then the visual pieces

// blast visuals: a fireball played from the explosion sprite sheet (src/pack/explosion_sheet.png, 55 frames, 8 across, 24 fps).
// Three sets in rotation so overlapping blasts do not share one set.
const FRAMES = 55, COLS = 8, ROWS = 7, FPS = 24, SPRITE_T = FRAMES / FPS;   // the fireball plays out its whole sheet
const BALL = 1.5;                                 // fireball size in multiples of the blast radius
const fireGeo = new THREE.PlaneGeometry(1, 1);
const blasts = [];
for (let i = 0; i < 3; i++) {
  const tex = T.explosionSheet.clone();          // own copy per set: each one shows its own frame
  tex.repeat.set(1 / COLS, 1 / ROWS); tex.needsUpdate = true;
  const ball = new THREE.Mesh(fireGeo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.1, depthWrite: false, fog: false }));
  ball.visible = false; scene.add(ball);
  blasts.push({ ball, tex, t: -1 });
}
let blastI = 0;

function explode(p) {
  SFX.explode(Math.hypot(player.x - p.x, player.z - p.z));
  startBlast(p);
  spawnParts(p, UP, M.dust, 18);       // dust cloud
  spawnParts(p, UP, M.chip, 12);       // splinters and grit
  spawnParts(p, UP, M.puff, 6);        // dark smoke
  // soldiers: full damage at the centre, falling off to nothing at the edge; anyone close enough to hear it is alerted
  for (const e of enemies) {
    if (!e.alive) continue;
    const d = Math.hypot(e.x - p.x, e.z - p.z);
    if (d < R) hitEnemy(e, 'body', GRENADE.enemyDmg * (1 - d / R));
    else if (d < R * 3.5) alertEnemy(e, false);
  }
  // the player: the blast reaches the body's centre, not just the feet, and shakes the view
  if (S.state === 'play') {
    const d = Math.hypot(player.x - p.x, player.y + 0.9 - p.y, player.z - p.z);
    if (d < R) hurtPlayer(GRENADE.playerDmg * (1 - d / R));
    if (d < R * 2) gun.camKick = Math.max(gun.camKick, 1 - d / (R * 2));
  }
}
function startBlast(p) {
  const b = blasts[blastI++ % blasts.length];
  b.t = 0; b.ball.visible = true;
  b.ball.position.set(p.x, 0.6, p.z); b.ball.scale.setScalar(R * BALL);
}
// play the fireball's sprite frames (turned to face the camera) and end the blast when the sheet has run out
function updateBlasts(dt) {
  for (const b of blasts) {
    if (b.t < 0) continue;
    b.t += dt;
    if (b.t >= SPRITE_T) { b.t = -1; b.ball.visible = false; continue; }
    const f = Math.min(FRAMES - 1, Math.floor(b.t * FPS));
    b.tex.offset.set((f % COLS) / COLS, 1 - (Math.floor(f / COLS) + 1) / ROWS);   // row 0 is the top of the sheet
    b.ball.quaternion.copy(camera.quaternion);
  }
}
