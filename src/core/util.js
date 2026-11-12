// Small math helpers and build-wide constants. No game state here.
import * as THREE from 'three';

export const V3 = THREE.Vector3;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const angLerp = (a, b, t) => { const d = (((b - a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; return a + d * t; };
export const TEST = location.search.includes('test');   // ?test: keeps the canvas readable and exposes window.__g
export const LOW_H = 240;                                // height of the low-res HUD and render buffers
// true when (x, z) lies in area {x0, x1, z0, z1}; a missing side is open. Used by level data (nav zones, alert areas).
export const inArea = (a, x, z) => x >= (a.x0 ?? -1e9) && x <= (a.x1 ?? 1e9) && z >= (a.z0 ?? -1e9) && z <= (a.z1 ?? 1e9);
