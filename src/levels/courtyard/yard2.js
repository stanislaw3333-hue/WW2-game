// Enemy yard (west courtyard) and the archway passage: walls, shut west gate, barracks, lamps, cover, props, Panzer I.
import * as THREE from 'three';
import { V3 } from '../../core/util.js';
import { boxes, shootables, lightDefs } from '../../core/state.js';
import PZ1_MODEL from '../../models/pz1.json';
import { scene, mat } from '../../render/renderer.js';
import { M, T } from '../../render/materials.js';
import { addBaked } from '../../render/baked.js';
import { worldUV, addBox, addCyl, quad, wallQuad, win, addArch, addLantern } from '../../world/geo.js';
import { R, crate } from '../../world/props.js';
import { RADIO } from './data.js';
import { placeTruck } from '../../world/vehicles.js';

export function buildYard2() {
  {
    const g = new THREE.PlaneGeometry(44, 44, 22, 22); g.rotateX(-Math.PI / 2);
    worldUV(g, 4, -46, 0, 2, M.ground.userData.aspect);
    const m = new THREE.Mesh(g, M.ground); m.position.set(-46, 0, 2); scene.add(m); shootables.push(m);
  }
  const cap = (cx, cz, w, d) => addBox(cx, 4.5, cz, w, 0.25, d, M.stoneDark, { solid: false, shoot: false });
  const crateB = (x, y, z, s, rot) => crate(x, y, z, s, rot, M.crateB);   // this yard's crates use the second square crate face
  // passage walls (x -32..-21, opening z 9..12)
  addBox(-26.5, 0, 8.5, 11, 4.5, 1, M.brick, { tile: 3 }); cap(-26.5, 8.5, 11, 1.3);
  addBox(-26.5, 0, 12.5, 11, 4.5, 1, M.brick, { tile: 3 }); cap(-26.5, 12.5, 11, 1.3);
  addLantern(-26.5, 2.9, 9.25);
  addBox(-26.5, 3.3, 9.1, 0.06, 0.06, 0.3, M.iron, { solid: false, shoot: false });
  lightDefs.push({ pos: new V3(-26.5, 3.0, 10.4), col: [1.35, 0.85, 0.38] });
  // courtyard 2 walls: x -62..-32, z -10..20
  addBox(-31.5, 0, -1, 1, 4.5, 18, M.brick, { tile: 3 }); cap(-31.5, -1, 1.3, 18);
  addBox(-31.5, 0, 16.5, 1, 4.5, 7, M.brick, { tile: 3 }); cap(-31.5, 16.5, 1.3, 7);
  addArch(-31.5, 10.5, true);
  // west wall with a big shut gate (z 2..8) set into it, same construction as the manor's south gate
  addBox(-62.5, 0, -4, 1, 4.5, 12, M.brick, { tile: 3 });
  addBox(-62.5, 0, 14, 1, 4.5, 12, M.brick, { tile: 3 });
  addBox(-62.5, 4.3, 5, 1, 0.9, 6, M.brick, { solid: false, tile: 3 });
  addBox(-62.5, 0, 5, 0.3, 4.3, 6, M.gate, { fit: true, wood: true });
  cap(-62.5, 5, 1.3, 30);
  addBox(-47, 0, 20.5, 32, 4.5, 1, M.brick, { tile: 3 }); cap(-47, 20.5, 32, 1.3);
  wallQuad('E', -61.97, 6, 1.2, 1.4, 2.7, M.poster);
  // barracks on the north side
  addBox(-47, 0, -13, 32, 7, 6, M.facade, { tile: 2.8 });
  // low plinth along the barracks front, broken either side of the door
  addBox(-55.45, 0, -9.9, 15.1, 1.0, 0.2, M.stone, { solid: false });
  addBox(-38.55, 0, -9.9, 15.1, 1.0, 0.2, M.stone, { solid: false });
  quad([-63.6, 6.9, -9.3], [-30.4, 6.9, -9.3], [-30.4, 9.8, -13], [-63.6, 9.8, -13], M.roof, { nu: 12, nv: 2, tile: 1.6 });
  // barracks windows are grouped by room: the west room (x -59, -55) is lit on both floors, the rest are dark
  for (const x of [-59, -55, -51, -43, -39, -35]) {
    const lit = x === -59 || x === -55;
    win('S', x, -9.95, 1.3, 4.3, 6.1, lit ? M.winLit : M.winDark);
    win('S', x, -9.95, 1.3, 1.5, 3.4, lit ? M.winLit : M.winDark);
  }
  // the same door as the manor's: 2.85 m tall, top third of the picture cut off, lintel above
  wallQuad('S', -47, -9.94, 1.5, 0.25, 2.85, M.door, { rot: true, vmax: 2 / 3 });
  addBox(-47, 2.85, -9.85, 2.6, 0.3, 0.4, M.stoneDark, { solid: false, shoot: false });
  // one flag above the barracks door (the door would hide flags either side), the same banner as the manor's
  wallQuad('S', -47, -9.93, 0.9, 4.7, 6.1, M.flagBanner, { rot: true });
  addBox(-47, 0, -9.3, 3.2, 0.25, 1.2, M.stone, { solid: false });
  addLantern(-45.1, 2.5, -9.7); addLantern(-48.9, 2.5, -9.7);
  lightDefs.push({ pos: new V3(-47, 3.0, -8.2), col: [1.5, 0.95, 0.42] });
  for (const [x, z] of [[-39.5, 3], [-55, 12]]) {
    addCyl(x, 0, z, 0.09, 3.3, M.iron, { sides: 5, cr: 0.16 });
    addCyl(x, 0, z, 0.2, 0.5, M.iron, { sides: 5, solid: false });
    addLantern(x, 3.3, z);
    lightDefs.push({ pos: new V3(x, 3.4, z), col: [1.45, 0.92, 0.4] });
  }
  // cover: crates and barrels
  crateB(-36.4, 0, 14.6, 1.4, 0.1); crateB(-36.5, 1.4, 14.5, 0.9, 0.5); crateB(-36.2, 0, 16.2, 1.1, -0.2);
  crateB(-38, 0, -5.5, 1.3, 0.2); crateB(-39.5, 0, -5.9, 1.0); crateB(-38.2, 1.3, -5.6, 0.9, 0.6);
  crateB(-57.5, 0, 15.5, 1.4); crateB(-58.9, 0, 15.2, 1.1, 0.3); crateB(-57.6, 1.4, 15.4, 1.0, 0.4);
  crateB(RADIO.x, 0, RADIO.z, 1.2, 0.3);   // the radio sits on this one, near the middle of the yard
  // German radio set (the chatter is positioned from RADIO in audio/audio.js)
  addBox(RADIO.x, RADIO.y, RADIO.z, 0.36, 0.18, 0.24, M.radio, { solid: false, shoot: false, rotY: 0.35, fit: true });
  addBox(RADIO.x + 0.12, RADIO.y + 0.18, RADIO.z - 0.04, 0.012, 0.55, 0.012, M.emetal, { solid: false, shoot: false });
  // Panzer I moved from the manor yard: parked just inside the west gate, nose toward it (hull collision, shootable)
  {
    const tank = new THREE.Group(); tank.position.set(-56, 0, -2.5); tank.rotation.y = Math.PI / 2; scene.add(tank);
    for (const m of addBaked(PZ1_MODEL, tank, { armor: mat(T.gunmetal, { tint: [0.8, 0.82, 0.78] }), tire: M.tire })) shootables.push(m);
    boxes.push({ x0: -56 - 1.4, x1: -56 + 1.4, z0: -2.5 - 2.7, z1: -2.5 + 2.7 });
  }
  // canopy truck parked in the enemy yard, against the wall at z 20.5
  placeTruck('canopy', -44, 16.5, 0);
  for (const z of [-6, 2, 9, 17]) wallQuad('E', -69, z, 5, 0, 12 + R() * 4, M.poplar);
  for (const x of [-58, -50, -41, -34]) wallQuad('N', x, 27, 5, 0, 12 + R() * 4, M.poplar);
}
