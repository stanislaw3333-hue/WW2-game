// Architectural detail on top of the main shells: cornices, pilasters, dormers, chimneys, buttress piers.
import { M } from '../render/materials.js';
import { addBox, wallQuad, pier, DECO } from './geo.js';

export function buildDetail() {
  const T4 = { ...DECO, tile: 4 };
  // manor: cornice, pilasters, door surround, dormers, chimney caps
  addBox(0, 8.5, -19.78, 40.4, 0.4, 0.5, M.stoneDark, DECO); addBox(0, 8.3, -19.84, 40.2, 0.2, 0.34, M.trim, T4);
  for (const x of [-18, -14, -10, -6, 6, 10, 14, 18]) { addBox(x, 1.0, -19.89, 0.46, 7.3, 0.24, M.trim, T4); addBox(x, 7.9, -19.86, 0.6, 0.4, 0.3, M.stoneDark, DECO); }
  addBox(0, 3.15, -19.8, 2.0, 0.22, 0.36, M.stoneDark, DECO);
  for (const x of [-10, 0, 10]) {
    addBox(x, 9.55, -20.85, 1.4, 1.5, 1.7, M.plaster, T4); addBox(x, 11.05, -20.85, 1.75, 0.14, 2.0, M.roof, { ...DECO, tile: 1.6 });
    wallQuad('S', x, -19.98, 0.9, 9.8, 10.9, x === 0 ? M.winLit : M.winDark);
  }
  for (const cx of [-13, 9]) addBox(cx, 13.2, -21.6, 1.4, 0.2, 1.4, M.stoneDark, DECO);
  // stable: eaves board, door posts
  addBox(19.8, 5.2, -4, 0.4, 0.28, 32.3, M.planks, DECO);
  for (const z of [-13, 3]) for (const sgn of [-1, 1]) addBox(19.87, 0, z + sgn * 1.85, 0.3, 3.3, 0.3, M.planks, DECO);
  // barracks: cornice, pilasters, door surround, chimneys
  addBox(-47, 6.55, -9.78, 32.4, 0.38, 0.5, M.stoneDark, DECO); addBox(-47, 6.36, -9.84, 32.2, 0.2, 0.34, M.trim, T4);
  for (const x of [-61, -57, -53, -41, -37, -33]) { addBox(x, 1.0, -9.89, 0.46, 5.36, 0.24, M.trim, T4); addBox(x, 6.0, -9.86, 0.6, 0.36, 0.3, M.stoneDark, DECO); }
  addBox(-47, 4.15, -9.84, 2.9, 0.32, 0.42, M.stoneDark, DECO);
  for (const cx of [-56, -38]) { addBox(cx, 7.8, -12.2, 1.0, 3.0, 1.0, M.stone, { ...DECO, tile: 3 }); addBox(cx, 10.8, -12.2, 1.3, 0.2, 1.3, M.stoneDark, DECO); }
  // buttress piers along the courtyard walls
  for (const z of [-17, -11, -5, 1, 6.5]) pier(-20, z, 1, 0);
  for (const x of [-14, -8, 8, 14]) pier(x, 20, 0, -1);
  for (const z of [-6, 0, 6, 12, 18]) pier(-62, z, 1, 0);
  for (const x of [-58, -52, -46, -40, -34]) pier(x, 20, 0, -1);
  for (const z of [-7, -1, 5, 16.5]) pier(-32, z, -1, 0);
}
