// Shared level helpers: the seeded RNG (call order is fixed: yard1, yard2, detail), crate shorthand.
import { rng } from '../textures.js';
import { M } from '../render/materials.js';
import { addBox } from './geo.js';

export const R = rng(77);
export const crate = (x, y, z, s, rot = 0, m = M.crate) => addBox(x, y, z, s, s, s, m, { fit: true, rotY: rot, wood: true, solid: y === 0 });
