// Manor yard (east courtyard): manor, stable, west wall + tower, south wall + gate, fountain, props, ammo crates.
import * as THREE from 'three';
import { V3 } from '../core/util.js';
import { circles, shootables, lightDefs } from '../core/state.js';
import { placeTruck } from './vehicles.js';
import { scene, mat } from '../render/renderer.js';
import { M, T } from '../render/materials.js';
import { worldUV, addBox, addCyl, quad, tri, wallQuad, win, addArch, addLantern } from './geo.js';
import { R, crate, AMMO_SPOTS } from './props.js';

export function buildYard1() {
  // ground
  {
    const g = new THREE.PlaneGeometry(48, 48, 24, 24); g.rotateX(-Math.PI / 2);
    worldUV(g, 4, 0, 0, 0, M.ground.userData.aspect);
    const m = new THREE.Mesh(g, M.ground); scene.add(m); shootables.push(m);
  }
  // --- north manor
  addBox(0, 0, -23, 40, 9, 6, M.facade, { tile: 2.8 });
  // low plinth along the manor front, broken either side of the door so it does not hide the bottom of the door
  addBox(-10.45, 0, -19.9, 19.1, 1.0, 0.2, M.stone, { solid: false });
  addBox(10.45, 0, -19.9, 19.1, 1.0, 0.2, M.stone, { solid: false });
  addBox(0, 4.3, -19.92, 40, 0.3, 0.16, M.stoneDark, { solid: false, shoot: false });
  quad([-20.6, 8.9, -19.3], [20.6, 8.9, -19.3], [20.6, 12.2, -23], [-20.6, 12.2, -23], M.roof, { nu: 16, nv: 2, tile: 1.6 });
  for (const cx of [-13, 9]) addBox(cx, 10, -21.6, 1.1, 3.2, 1.1, M.stone, { solid: false, shoot: false });
  // windows are grouped by room: the upper-left room and the ground-right room are lit, the rest are dark.
  // the ground windows either side of the door (x +-4) are left out to make room for the flags
  for (const x of [-16, -12, -8, -4, 0, 4, 8, 12, 16]) {
    win('S', x, -19.95, 1.3, 5.2, 7.2, (x === -16 || x === -12) ? M.winLit : M.winDark);
    if (x !== 0 && Math.abs(x) !== 4) win('S', x, -19.95, 1.3, 1.5, 3.5, (x === 8 || x === 12) ? M.winLit : M.winDark);
  }
  wallQuad('S', 0, -19.94, 1.5, 0.25, 2.85, M.door, { rot: true, vmax: 2 / 3 });   // the door is three square panels: the top third of the picture is cut off, scale unchanged (top at 2.85)
  for (const x of [-3.2, 3.2]) wallQuad('S', x, -19.93, 0.9, 1.1, 3.2, M.flagBanner, { rot: true });   // flags hang either side of the entrance
  addBox(0, 0, -19.3, 3.2, 0.25, 1.2, M.stone, { solid: false });
  addBox(0, 2.85, -19.85, 2.6, 0.3, 0.4, M.stoneDark, { solid: false, shoot: false });   // lintel over the shortened door
  addLantern(-1.9, 2.5, -19.7); addLantern(1.9, 2.5, -19.7);
  lightDefs.push({ pos: new V3(0, 3.0, -18.2), col: [1.5, 0.95, 0.42] });

  // --- east stable
  addBox(23, 0, -4, 6, 5.5, 32, M.facade, { tile: 2.1 });
  quad([19.4, 5.4, -20], [19.4, 5.4, 12.5], [23, 8, 12.5], [23, 8, -20], M.roof, { nu: 12, nv: 2, tile: 1.6 });
  tri([20, 5.5, 12.01], [26, 5.5, 12.01], [23, 8, 12.01], M.planks);
  for (const z of [-13, 3]) { wallQuad('W', 19.95, z, 3.4, 0, 3.3, M.gateD); addBox(19.9, 3.3, z, 0.25, 0.3, 3.8, M.planks, { solid: false, shoot: false }); }
  for (const z of [-17.5, -8, -2, 8.5]) win('W', 19.95, z, 1.0, 3.3, 4.6, (z === -8 || z === -2) ? M.winLit : M.winDark);
  addLantern(19.7, 2.9, -5);
  addBox(19.85, 3.3, -5, 0.3, 0.06, 0.06, M.iron, { solid: false, shoot: false });
  lightDefs.push({ pos: new V3(18.6, 3.2, -5), col: [1.35, 0.85, 0.38] });
  addBox(20.5, 0, 16, 1, 4.5, 8, M.brick, { tile: 3 });
  addBox(20.5, 4.5, 16, 1.3, 0.25, 8, M.stoneDark, { solid: false, shoot: false });

  // --- west wall (with archway at z 9..12) + tower
  addBox(-20.5, 0, -5.5, 1, 4.5, 29, M.brick, { tile: 3 });
  addBox(-20.5, 0, 12.75, 1, 4.5, 1.5, M.brick, { tile: 3 });
  addArch(-20.5, 10.5, true);
  addBox(-20.5, 4.5, -3.25, 1.3, 0.25, 33.5, M.stoneDark, { solid: false, shoot: false });
  addBox(-20, 0, 17, 7, 11, 7, M.facade, { tile: 2.1 });
  addBox(-20, 11, 17, 7.6, 0.4, 7.6, M.stoneDark, { solid: false, shoot: false });
  { const c = new THREE.Mesh(new THREE.ConeGeometry(5.6, 4, 4, 1), M.roof); c.rotation.y = Math.PI / 4; c.position.set(-20, 13.4, 17); scene.add(c); }
  wallQuad('E', -16.45, 17, 1.2, 0, 2.5, M.door, { rot: true });
  win('E', -16.45, 17, 0.9, 6.5, 8, M.winLit);
  win('N', -19, 13.45, 0.9, 6.5, 8, M.winDark);

  // --- south wall + gate
  addBox(-10.5, 0, 20.5, 12.2, 4.5, 1, M.brick, { tile: 3 });
  addBox(12.5, 0, 20.5, 16.6, 4.5, 1, M.brick, { tile: 3 });
  addBox(-10.5, 4.5, 20.5, 12.2, 0.25, 1.3, M.stoneDark, { solid: false, shoot: false });
  addBox(12.5, 4.5, 20.5, 16.6, 0.25, 1.3, M.stoneDark, { solid: false, shoot: false });
  for (const x of [-3.7, 3.7]) { addBox(x, 0, 20.5, 1.4, 5.4, 1.4, M.brick, { tile: 3 }); addBox(x, 5.4, 20.5, 1.7, 0.3, 1.7, M.stoneDark, { solid: false, shoot: false }); }
  addBox(0, 4.3, 20.5, 6, 0.9, 1.0, M.brick, { solid: false, tile: 3 });
  wallQuad('S', -11, 21.03, 7, 0, 2.4, M.ivy);   // a sparse patch of ivy growing up from the foot of the outside of the south wall
  addBox(0, 0, 20.6, 6, 4.3, 0.3, M.gate, { fit: true, wood: true });

  // --- distant poplars beyond the walls
  for (const [x, z] of [[-27, -12], [-28.5, -3], [-26.5, 3], [-27, 17]]) wallQuad('E', x, z, 5, 0, 13 + R() * 3, M.poplar);
  for (const [x, z] of [[-12, 27], [-5, 29], [7, 27.5], [15, 28], [22, 26.5]]) wallQuad('N', x, z, 5, 0, 12 + R() * 4, M.poplar);

  // --- fountain
  const fz = -3;
  addCyl(0, 0, fz, 3, 0.75, M.stone, { open: true, us: 8, vs: 0.4, cr: 3.05 });
  { const m = new THREE.Mesh(new THREE.CylinderGeometry(2.55, 2.55, 0.75, 8, 1, true), mat(T.stone, { side: THREE.BackSide })); m.position.set(0, 0.375, fz); scene.add(m); }
  { const g = new THREE.RingGeometry(2.55, 3, 8, 1); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, M.stoneDark); m.position.set(0, 0.75, fz); scene.add(m); shootables.push(m); }
  // water: planar UVs from the x/z position, so the texture runs flat across the surface with no radial seam
  { const g = new THREE.CircleGeometry(2.55, 8); g.rotateX(-Math.PI / 2); const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 2.04 + 0.5, p.getZ(i) / 2.04 + 0.5); const m = new THREE.Mesh(g, M.water); m.position.set(0, 0.5, fz); scene.add(m); shootables.push(m); }
  addCyl(0, 0, fz, 0.45, 1.9, M.stone, { solid: false, us: 2 });
  addCyl(0, 1.9, fz, 0.35, 0.45, M.stoneDark, { solid: false, rTop: 1.2, us: 3 });
  addCyl(0, 2.35, fz, 0.2, 0.5, M.stone, { solid: false, rTop: 0.12 });

  // --- lamp posts
  for (const [x, z] of [[-13, 9], [8.5, 5]]) {   // (-13, 9) was standing in line with the manor door
    addCyl(x, 0, z, 0.09, 3.3, M.iron, { sides: 5, cr: 0.16 });
    addCyl(x, 0, z, 0.2, 0.5, M.iron, { sides: 5, solid: false });
    addLantern(x, 3.3, z);
    lightDefs.push({ pos: new V3(x, 3.4, z), col: [1.45, 0.92, 0.4] });
  }

  // --- trees
  for (const [x, z] of [[-11, -11], [12, -11.5]]) {
    addBox(x, 0, z, 2.6, 0.18, 2.6, M.dirt, { solid: false });
    addCyl(x, 0, z, 0.32, 4.2, M.bark, { sides: 6, rTop: 0.2, cr: 0.36, wood: true });
    for (let k = 0; k < 3; k++) {
      const a = k * Math.PI / 3 + 0.3, c = Math.cos(a) * 2.8, s = Math.sin(a) * 2.8;
      quad([x - c, 2.6, z - s], [x + c, 2.6, z + s], [x + c, 8, z + s], [x - c, 8, z - s], M.foliage, { fit: true });
    }
  }

  // --- crates
  crate(-17.8, 0, 6, 1.4); crate(-17.9, 1.4, 6.1, 1.0, 0.3); crate(-18, 0, 7.7, 1.2, 0.15); crate(-16.3, 0, 6.6, 1.0, -0.2);
  crate(-14.5, 0, 12.8, 1.3, 0.1, M.crateE); crate(-14.4, 1.3, 12.7, 0.9, 0.5); crate(-12.9, 0, 12.9, 1.0);
  crate(4.6, 0, -17.6, 1.2, 0, M.crateE); crate(6.1, 0, -18, 1.3, 0.2, M.crateB); crate(5.2, 1.2, -17.8, 1.0, 0.4, M.crateB);
  crate(-5.5, 0, 17.8, 1.1, 0.25);
  addBox(-8, 0, 15.5, 2.0, 0.9, 1.0, M.crateWide, { fit: true, wood: true });   // long wide crate
  // barrels
  for (const [x, z] of [[16.3, -18.4], [17.3, -18.1], [18.3, -18.5], [17.0, -17.2], [-18.4, -17.5], [-17.5, -18.4], [18.6, 9.6]])
    addCyl(x, 0, z, 0.4, 1.05, M.barrel, { wood: true, cr: 0.42 });
  // --- Polish truck, parked against the stable's west wall (long axis along Z)
  placeTruck('polish', 17.3, -8, Math.PI / 2);

  // --- sign near gate
  addBox(5.6, 0, 18.6, 0.12, 1.9, 0.12, M.planks, { solid: false, wood: true });
  circles.push({ cx: 5.6, cz: 18.6, r: 0.15 });
  wallQuad('N', 5.6, 18.52, 1.5, 1.2, 1.95, M.sign);

  // --- ammo crates
  for (const [x, z] of AMMO_SPOTS) addBox(x, 0, z, 1.1, 0.6, 0.7, M.ammo, { fit: true, wood: true });
}
