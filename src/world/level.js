// Builds the current level once at import (levels/index.js picks it), then the sky, searchlights, fixed lighting
// and the player's start. Level geometry lives in src/levels/<id>/; this file stays level-neutral.
import * as THREE from 'three';
import { scene, worldL, gunL } from '../render/renderer.js';
import { M } from '../render/materials.js';
import { player } from '../core/state.js';
import { LEVEL, buildLevel } from '../levels/index.js';
import { buildSearchlights } from '../effects/searchlight.js';

buildLevel();
// --- sky
export const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 20, 12), M.sky);
sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);
if (LEVEL.searchlights) buildSearchlights(LEVEL.searchlights);   // three beams far off on the side opposite the moon

// ------------------------------------------------------------------ fixed lighting
const L = LEVEL.light;
worldL.uAmbient.value.set(...L.ambient);
worldL.uSunDir.value.set(...L.sunDir).normalize();
worldL.uSunCol.value.set(...L.sunCol);
gunL.uSunDir.value.set(...L.gunSunDir).normalize();

// player start
Object.assign(player, { x: LEVEL.spawn.x, z: LEVEL.spawn.z, yaw: LEVEL.spawn.yaw });
