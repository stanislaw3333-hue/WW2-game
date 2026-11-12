// What soldiers can see and walk: line of sight against the level's shootable meshes, and straight walkable lines
// against the collision blocks and pillars. Shared by the AI, cover search and hearing.
import * as THREE from 'three';
import { V3 } from '../core/util.js';
import { boxes, circles, shootables } from '../core/state.js';
import { camera } from '../render/renderer.js';

const ray = new THREE.Raycaster(), a = new V3(), d = new V3();
// true when nothing shootable lies between (ax, ay, az) and (bx, by, bz)
export function clearLine(ax, ay, az, bx, by, bz) {
  a.set(ax, ay, az); d.set(bx - ax, by - ay, bz - az);
  const len = d.length(); if (len < 0.5) return true;
  ray.set(a, d.divideScalar(len)); ray.near = 0.3; ray.far = len - 0.2;
  return ray.intersectObjects(shootables, false).length === 0;
}
// from a soldier's eye (height h, default his current eye height) to the player's eye
export const seesPlayerFrom = (x, z, h) => clearLine(x, h, z, camera.position.x, camera.position.y, camera.position.z);
export const hasLOS = e => seesPlayerFrom(e.x, e.z, e.eye || 1.6);

// does the segment (ax, az) -> (bx, bz) cross block b grown by r? (slab test)
export function segHitsBox(ax, az, bx, bz, b, r = 0) {
  const dx = bx - ax, dz = bz - az;
  let t0 = 0, t1 = 1;
  for (const [p, v, lo, hi] of [[ax, dx, b.x0 - r, b.x1 + r], [az, dz, b.z0 - r, b.z1 + r]]) {
    if (Math.abs(v) < 1e-9) { if (p < lo || p > hi) return false; continue; }
    let u0 = (lo - p) / v, u1 = (hi - p) / v; if (u0 > u1) [u0, u1] = [u1, u0];
    t0 = Math.max(t0, u0); t1 = Math.min(t1, u1); if (t0 > t1) return false;
  }
  return true;
}
// does the segment pass within c.r + r of pillar c?
export function segHitsCircle(ax, az, bx, bz, c, r = 0) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1e-9;
  const t = Math.max(0, Math.min(1, ((c.cx - ax) * dx + (c.cz - az) * dz) / l2));
  return Math.hypot(ax + dx * t - c.cx, az + dz * t - c.cz) < c.r + r;
}
// true when a body of radius r can walk straight from (ax, az) to (bx, bz) without crossing a block or pillar
export function walkable(ax, az, bx, bz, r = 0.3) {
  for (const b of boxes) if (segHitsBox(ax, az, bx, bz, b, r)) return false;
  for (const c of circles) if (segHitsCircle(ax, az, bx, bz, c, r)) return false;
  return true;
}
