// Builds the level once at import by calling the area builders in a fixed order (the seeded RNG depends on it),
// then the sky, practice targets and fixed lighting. Edit the area files: yard1.js, yard2.js, detail.js.
import * as THREE from 'three';
import { scene, worldL, gunL } from '../render/renderer.js';
import { M } from '../render/materials.js';
import { addTarget } from './targets.js';
import { buildYard1 } from './yard1.js';
import { buildYard2 } from './yard2.js';
import { buildDetail } from './detail.js';
export { AMMO_SPOTS } from './props.js';

buildYard1(); buildYard2(); buildDetail();
// --- sky
export const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 20, 12), M.sky);
sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);

// practice targets: four along the west side of the manor yard, two more by the walls
addTarget(-17.4, -14, Math.PI / 2); addTarget(-17.4, -9, Math.PI / 2); addTarget(-17.4, -4, Math.PI / 2); addTarget(-17.4, 1, Math.PI / 2);
addTarget(13.5, -17.4, 0); addTarget(-10.5, 17.5, Math.PI);

// ------------------------------------------------------------------ fixed lighting
worldL.uAmbient.value.set(0.2, 0.235, 0.36);
worldL.uSunDir.value.set(-0.266, 0.469, -0.842).normalize();
worldL.uSunCol.value.set(0.5, 0.56, 0.8);
gunL.uSunDir.value.set(-0.5, 0.8, 0.35).normalize();
