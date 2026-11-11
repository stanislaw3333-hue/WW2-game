// Vehicles placed in the yards: the Polish truck (starting courtyard) and the canopy truck (enemy yard).
// Both are baked by tools/bake_vehicle.py into src/models/*_truck.json: length along X, bottom centre at the origin.
import * as THREE from 'three';
import { boxes, shootables } from '../core/state.js';
import { scene } from '../render/renderer.js';
import { M } from '../render/materials.js';
import { addBaked } from '../render/baked.js';
import POLISH_MODEL from '../models/polish_truck.json';
import CANOPY_MODEL from '../models/canopy_truck.json';

// the baked material keys (tools/bake_models.py) mapped onto the game's materials
const MATS = { metal: M.iron, paint: M.olive, canvas: M.tarp, tire: M.tire, wood: M.planks, glass: M.glass, truck: M.truck };
// the models are baked at their source length (bake_models.py CFG: Polish 5.3 m, canopy 5.6 m); SCALE enlarges them uniformly in game
const SCALE = { polish: 1.17, canopy: 1.25 };   // Polish 6.2 m, canopy 7.0 m
const HALF_W = 0.95;

// yaw is a multiple of 90 degrees: the box is swapped to match the truck's long axis
export function placeTruck(which, x, z, yaw) {
  const model = which === 'polish' ? POLISH_MODEL : CANOPY_MODEL;
  const s = SCALE[which];
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = yaw; g.scale.setScalar(s); scene.add(g);
  for (const m of addBaked(model, g, MATS)) shootables.push(m);
  const across = Math.abs(Math.cos(yaw)) < 0.5;   // long axis runs along Z
  const half = (which === 'polish' ? 5.3 : 5.6) * s / 2;
  const hl = across ? HALF_W : half, hw = across ? half : HALF_W;
  boxes.push({ x0: x - hl, x1: x + hl, z0: z - hw, z1: z + hw });
}
