// Practice targets: a board on a post that drops flat when shot. Registered as shootable, round collision.
import * as THREE from 'three';
import { targets, circles, shootables } from '../core/state.js';
import { scene } from '../render/renderer.js';
import { M } from '../render/materials.js';

export function addTarget(x, z, rotY) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; scene.add(g);
  const tilt = new THREE.Group(); g.add(tilt);
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.3, 0.1), M.planks); post.position.y = 0.65; tilt.add(post);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), M.target); board.position.set(0, 1.6, 0.06); tilt.add(board);
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 0.5), M.planks); foot.position.y = 0.05; g.add(foot);
  const t = { g, tilt, down: false, a: 0, v: 0 };
  post.userData = { target: t, wood: true }; board.userData = { target: t, wood: true, round: true };
  shootables.push(post, board); targets.push(t);
  circles.push({ cx: x, cz: z, r: 0.3 });
}
