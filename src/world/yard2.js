// Enemy yard (west courtyard) and the archway passage: walls, barracks, lamps, cover, props.
import * as THREE from 'three';
import { V3 } from '../core/util.js';
import { circles, shootables, lightDefs } from '../core/state.js';
import { scene } from '../render/renderer.js';
import { M } from '../render/materials.js';
import { worldUV, addBox, addCyl, quad, wallQuad, win, addArch, addLantern } from './geo.js';
import { R, crate } from './props.js';

export function buildYard2() {
  {
    const g = new THREE.PlaneGeometry(44, 44, 22, 22); g.rotateX(-Math.PI / 2);
    worldUV(g, 4, -46, 0, 2);
    const m = new THREE.Mesh(g, M.cobble); m.position.set(-46, 0, 2); scene.add(m); shootables.push(m);
  }
  const cap = (cx, cz, w, d) => addBox(cx, 4.5, cz, w, 0.25, d, M.stoneDark, { solid: false, shoot: false });
  // passage walls (x -32..-21, opening z 9..12)
  addBox(-26.5, 0, 8.5, 11, 4.5, 1, M.stone, { tile: 3 }); cap(-26.5, 8.5, 11, 1.3);
  addBox(-26.5, 0, 12.5, 11, 4.5, 1, M.stone, { tile: 3 }); cap(-26.5, 12.5, 11, 1.3);
  addLantern(-26.5, 2.9, 9.25);
  addBox(-26.5, 3.3, 9.1, 0.06, 0.06, 0.3, M.iron, { solid: false, shoot: false });
  lightDefs.push({ pos: new V3(-26.5, 3.0, 10.4), col: [1.35, 0.85, 0.38] });
  // courtyard 2 walls: x -62..-32, z -10..20
  addBox(-31.5, 0, -1, 1, 4.5, 18, M.stone, { tile: 3 }); cap(-31.5, -1, 1.3, 18);
  addBox(-31.5, 0, 16.5, 1, 4.5, 7, M.stone, { tile: 3 }); cap(-31.5, 16.5, 1.3, 7);
  addArch(-31.5, 10.5, true);
  addBox(-62.5, 0, 5, 1, 4.5, 30, M.stone, { tile: 3 }); cap(-62.5, 5, 1.3, 30);
  addBox(-47, 0, 20.5, 32, 4.5, 1, M.stone, { tile: 3 }); cap(-47, 20.5, 32, 1.3);
  wallQuad('N', -40, 19.97, 1.7, 1.3, 3.2, M.flag); wallQuad('N', -54, 19.97, 1.7, 1.3, 3.2, M.flag);
  wallQuad('E', -61.97, 6, 1.2, 1.4, 2.7, M.poster);
  // barracks on the north side
  addBox(-47, 0, -13, 32, 7, 6, M.plaster, { tile: 4 });
  addBox(-47, 0, -9.9, 32, 1.0, 0.2, M.stone, { solid: false });
  quad([-63.6, 6.9, -9.3], [-30.4, 6.9, -9.3], [-30.4, 9.8, -13], [-63.6, 9.8, -13], M.roof, { nu: 12, nv: 2, tile: 1.6 });
  for (const x of [-59, -55, -51, -43, -39, -35]) {
    win('S', x, -9.95, 1.3, 4.3, 6.1, R() < 0.4 ? M.winLit : M.winDark);
    win('S', x, -9.95, 1.3, 1.5, 3.4, (x === -55 || x === -39) ? M.winLit : M.winDark);
  }
  wallQuad('S', -47, -9.94, 1.8, 0.25, 3.05, M.door);
  addBox(-47, 0, -9.3, 3.2, 0.25, 1.2, M.stoneDark, { solid: false });
  addLantern(-45.1, 2.5, -9.7); addLantern(-48.9, 2.5, -9.7);
  lightDefs.push({ pos: new V3(-47, 3.0, -8.2), col: [1.5, 0.95, 0.42] });
  for (const [x, z] of [[-39.5, 3], [-55, 12]]) {
    addCyl(x, 0, z, 0.09, 3.3, M.iron, { sides: 5, cr: 0.16 });
    addCyl(x, 0, z, 0.2, 0.5, M.iron, { sides: 5, solid: false });
    addLantern(x, 3.3, z);
    lightDefs.push({ pos: new V3(x, 3.4, z), col: [1.45, 0.92, 0.4] });
  }
  // cover: sandbag wall facing the archway, crates, barrels
  for (let layer = 0; layer < 3; layer++) for (let i = 0; i < 6 - (layer % 2); i++) {
    const z = 4 + (i + (layer % 2) * 0.5) * 0.97;
    addBox(-44, layer * 0.3, z, 0.95, 0.32, 0.5, M.sandbag, { fit: true, solid: false, rotY: Math.PI / 2 + (R() - 0.5) * 0.12 });
    if (layer === 0) circles.push({ cx: -44, cz: z, r: 0.42 });
  }
  crate(-36.4, 0, 14.6, 1.4, 0.1); crate(-36.5, 1.4, 14.5, 0.9, 0.5); crate(-36.2, 0, 16.2, 1.1, -0.2);
  crate(-38, 0, -5.5, 1.3, 0.2); crate(-39.5, 0, -5.9, 1.0); crate(-38.2, 1.3, -5.6, 0.9, 0.6);
  crate(-57.5, 0, 15.5, 1.4); crate(-58.9, 0, 15.2, 1.1, 0.3); crate(-57.6, 1.4, 15.4, 1.0, 0.4);
  crate(-50, 0, 9, 1.2, 0.3);
  for (const [x, z] of [[-60.5, -8.6], [-59.5, -8.9], [-60.3, -7.6], [-33.4, -8.2], [-46, 18.6], [-45, 18.9]])
    addCyl(x, 0, z, 0.4, 1.05, M.barrel, { wood: true, cr: 0.42 });
  for (const z of [-6, 2, 9, 17]) wallQuad('E', -69, z, 5, 0, 12 + R() * 4, M.poplar);
  for (const x of [-58, -50, -41, -34]) wallQuad('N', x, 27, 5, 0, 12 + R() * 4, M.poplar);
}
