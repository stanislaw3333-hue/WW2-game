// Bullet decals and debris particles. Both are fixed pools that are recycled, so nothing is allocated per shot.
import * as THREE from 'three';
import { V3 } from '../core/util.js';
import { scene } from '../render/renderer.js';
import { M } from '../render/materials.js';

const decals = []; let decalI = 0;
for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), M.hole); m.visible = false; scene.add(m); decals.push(m); }
const parts = []; let partI = 0;
for (let i = 0; i < 48; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.07), M.dust); m.visible = false; scene.add(m); parts.push({ m, v: new V3(), life: 0 }); }

// a bullet hole on a surface at point p, facing normal n
export function placeDecal(p, n) {
  const d = decals[decalI++ % decals.length];
  d.visible = true; d.position.copy(p); d.lookAt(p.x + n.x, p.y + n.y, p.z + n.z); d.rotateZ(Math.random() * 6.28);
}
// debris burst at p, thrown out along normal n. wood: M.chip for splinters, a material for others, or falsy for dust
export function spawnParts(p, n, wood, count = 7) {
  for (let i = 0; i < count; i++) {
    const q = parts[partI++ % parts.length];
    q.m.material = wood === true ? M.chip : wood || M.dust; q.m.visible = true; q.m.position.copy(p);
    q.v.set((Math.random() - 0.5) * 2.4, Math.random() * 2.6, (Math.random() - 0.5) * 2.4).addScaledVector(n, 2.2);
    q.life = 0.35 + Math.random() * 0.35;
    q.m.scale.setScalar(0.6 + Math.random() * 1.2);
  }
}
// advance debris; each piece turns to face the camera and disappears on the ground or when its life ends
export function updateParticles(dt, camera) {
  for (const q of parts) if (q.life > 0) {
    q.life -= dt; q.v.y -= 9 * dt; q.m.position.addScaledVector(q.v, dt); q.m.quaternion.copy(camera.quaternion);
    if (q.life <= 0 || q.m.position.y < 0.02) { q.m.visible = false; q.life = 0; }
  }
}
