// The two courtyards: the manor yard (east) and the enemy yard (west, through the archway).
// Builds the static geometry once at import, plus the practice targets and the fixed lighting.
import * as THREE from 'three';
import { V3, lerp } from '../core/util.js';
import { boxes, circles, shootables, lightDefs } from '../core/state.js';
import { rng } from '../textures.js';
import PZ1_MODEL from '../models/pz1.json';
import { scene, worldL, gunL, mat } from '../render/renderer.js';
import { M, T } from '../render/materials.js';
import { addBaked } from '../render/baked.js';
import { worldUV, addBox, addCyl, quad, tri, wallQuad, win, addArch, pier, addLantern, DECO } from './geo.js';
import { addTarget } from './targets.js';

const R = rng(77);
export const AMMO_SPOTS = [[17.4, -9.5], [-34.2, 18.3]];
function buildLevel() {
  // ground
  {
    const g = new THREE.PlaneGeometry(48, 48, 24, 24); g.rotateX(-Math.PI / 2);
    worldUV(g, 4, 0, 0, 0);
    const m = new THREE.Mesh(g, M.cobble); scene.add(m); shootables.push(m);
  }
  // --- north manor
  addBox(0, 0, -23, 40, 9, 6, M.plaster, { tile: 4 });
  addBox(0, 0, -19.9, 40, 1.0, 0.2, M.stone, { solid: false });
  addBox(0, 4.3, -19.92, 40, 0.3, 0.16, M.stoneDark, { solid: false, shoot: false });
  quad([-20.6, 8.9, -19.3], [20.6, 8.9, -19.3], [20.6, 12.2, -23], [-20.6, 12.2, -23], M.roof, { nu: 16, nv: 2, tile: 1.6 });
  for (const cx of [-13, 9]) addBox(cx, 10, -21.6, 1.1, 3.2, 1.1, M.stone, { solid: false, shoot: false });
  for (const x of [-16, -12, -8, -4, 0, 4, 8, 12, 16]) {
    win('S', x, -19.95, 1.3, 5.2, 7.2, R() < 0.35 ? M.winLit : M.winDark);
    if (x !== 0) win('S', x, -19.95, 1.3, 1.5, 3.5, (x === -8 || x === 12) ? M.winLit : M.winDark);
  }
  wallQuad('S', 0, -19.94, 1.8, 0.25, 3.05, M.door);
  addBox(0, 0, -19.3, 3.2, 0.25, 1.2, M.stoneDark, { solid: false });
  addBox(0, 3.05, -19.85, 2.6, 0.3, 0.4, M.stoneDark, { solid: false, shoot: false });
  addLantern(-1.9, 2.5, -19.7); addLantern(1.9, 2.5, -19.7);
  lightDefs.push({ pos: new V3(0, 3.0, -18.2), col: [1.5, 0.95, 0.42] });

  // --- east stable
  addBox(23, 0, -4, 6, 5.5, 32, M.stone, { tile: 3 });
  quad([19.4, 5.4, -20], [19.4, 5.4, 12.5], [23, 8, 12.5], [23, 8, -20], M.roof, { nu: 12, nv: 2, tile: 1.6 });
  tri([20, 5.5, 12.01], [26, 5.5, 12.01], [23, 8, 12.01], M.planks);
  for (const z of [-13, 3]) { wallQuad('W', 19.95, z, 3.4, 0, 3.3, M.gateD); addBox(19.9, 3.3, z, 0.25, 0.3, 3.8, M.planks, { solid: false, shoot: false }); }
  for (const z of [-17.5, -8, -2, 8.5]) win('W', 19.95, z, 1.0, 3.3, 4.6, z === -2 ? M.winLit : M.winDark);
  addLantern(19.7, 2.9, -5);
  addBox(19.85, 3.3, -5, 0.3, 0.06, 0.06, M.iron, { solid: false, shoot: false });
  lightDefs.push({ pos: new V3(18.6, 3.2, -5), col: [1.35, 0.85, 0.38] });
  addBox(20.5, 0, 16, 1, 4.5, 8, M.stone, { tile: 3 });
  addBox(20.5, 4.5, 16, 1.3, 0.25, 8, M.stoneDark, { solid: false, shoot: false });

  // --- west wall (with archway at z 9..12) + tower
  addBox(-20.5, 0, -5.5, 1, 4.5, 29, M.stone, { tile: 3 });
  addBox(-20.5, 0, 12.75, 1, 4.5, 1.5, M.stone, { tile: 3 });
  addArch(-20.5, 10.5, true);
  addBox(-20.5, 4.5, -3.25, 1.3, 0.25, 33.5, M.stoneDark, { solid: false, shoot: false });
  addBox(-20, 0, 17, 7, 11, 7, M.stone, { tile: 3 });
  addBox(-20, 11, 17, 7.6, 0.4, 7.6, M.stoneDark, { solid: false, shoot: false });
  { const c = new THREE.Mesh(new THREE.ConeGeometry(5.6, 4, 4, 1), M.roof); c.rotation.y = Math.PI / 4; c.position.set(-20, 13.4, 17); scene.add(c); }
  wallQuad('E', -16.45, 17, 1.2, 0, 2.5, M.door);
  win('E', -16.45, 17, 0.9, 6.5, 8, M.winLit);
  win('N', -19, 13.45, 0.9, 6.5, 8, M.winDark);

  // --- south wall + gate
  addBox(-10.5, 0, 20.5, 12.2, 4.5, 1, M.stone, { tile: 3 });
  addBox(12.5, 0, 20.5, 16.6, 4.5, 1, M.stone, { tile: 3 });
  addBox(-10.5, 4.5, 20.5, 12.2, 0.25, 1.3, M.stoneDark, { solid: false, shoot: false });
  addBox(12.5, 4.5, 20.5, 16.6, 0.25, 1.3, M.stoneDark, { solid: false, shoot: false });
  for (const x of [-3.7, 3.7]) { addBox(x, 0, 20.5, 1.4, 5.4, 1.4, M.stone, { tile: 3 }); addBox(x, 5.4, 20.5, 1.7, 0.3, 1.7, M.stoneDark, { solid: false, shoot: false }); }
  addBox(0, 4.3, 20.5, 6, 0.9, 1.0, M.stone, { solid: false, tile: 3 });
  addBox(0, 0, 20.6, 6, 4.3, 0.3, M.gate, { fit: true, wood: true });

  // --- distant poplars beyond the walls
  for (const [x, z] of [[-27, -12], [-28.5, -3], [-26.5, 3], [-27, 17]]) wallQuad('E', x, z, 5, 0, 13 + R() * 3, M.poplar);
  for (const [x, z] of [[-12, 27], [-5, 29], [7, 27.5], [15, 28], [22, 26.5]]) wallQuad('N', x, z, 5, 0, 12 + R() * 4, M.poplar);

  // --- fountain
  const fz = -3;
  addCyl(0, 0, fz, 3, 0.75, M.stone, { open: true, us: 8, vs: 0.4, cr: 3.05 });
  { const m = new THREE.Mesh(new THREE.CylinderGeometry(2.55, 2.55, 0.75, 8, 1, true), mat(T.stone, { side: THREE.BackSide })); m.position.set(0, 0.375, fz); scene.add(m); }
  { const g = new THREE.RingGeometry(2.55, 3, 8, 1); g.rotateX(-Math.PI / 2); g.rotateY(Math.PI / 8); const m = new THREE.Mesh(g, M.stoneDark); m.position.set(0, 0.75, fz); scene.add(m); shootables.push(m); }
  { const g = new THREE.CircleGeometry(2.55, 8); g.rotateX(-Math.PI / 2); g.rotateY(Math.PI / 8); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 3, uv.getY(i) * 3); const m = new THREE.Mesh(g, M.water); m.position.set(0, 0.5, fz); scene.add(m); shootables.push(m); }
  addCyl(0, 0, fz, 0.45, 1.9, M.stone, { solid: false, us: 2 });
  addCyl(0, 1.9, fz, 0.35, 0.45, M.stoneDark, { solid: false, rTop: 1.2, us: 3 });
  addCyl(0, 2.35, fz, 0.2, 0.5, M.stone, { solid: false, rTop: 0.12 });

  // --- lamp posts
  for (const [x, z] of [[-8, 9], [8.5, 5]]) {
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
  const crate = (x, y, z, s, rot = 0, m = M.crate) => addBox(x, y, z, s, s, s, m, { fit: true, rotY: rot, wood: true, solid: y === 0 });
  crate(-17.8, 0, 6, 1.4); crate(-17.9, 1.4, 6.1, 1.0, 0.3); crate(-18, 0, 7.7, 1.2, 0.15); crate(-16.3, 0, 6.6, 1.0, -0.2);
  crate(-14.5, 0, 12.8, 1.3, 0.1, M.crateE); crate(-14.4, 1.3, 12.7, 0.9, 0.5); crate(-12.9, 0, 12.9, 1.0);
  crate(4.6, 0, -17.6, 1.2, 0, M.crateE); crate(6.1, 0, -18, 1.3, 0.2); crate(5.2, 1.2, -17.8, 1.0, 0.4);
  crate(-5.5, 0, 17.8, 1.1, 0.25);
  // barrels
  for (const [x, z] of [[16.3, -18.4], [17.3, -18.1], [18.3, -18.5], [17.0, -17.2], [-18.4, -17.5], [-17.5, -18.4], [18.6, 9.6]])
    addCyl(x, 0, z, 0.4, 1.05, M.barrel, { wood: true, cr: 0.42 });
  // hay
  addBox(18.3, 0, 6.6, 1.3, 0.7, 0.8, M.hay, { fit: true }); addBox(18.3, 0, 7.6, 1.3, 0.7, 0.8, M.hay, { fit: true });
  addBox(18.4, 0.7, 7.1, 1.3, 0.7, 0.8, M.hay, { fit: true, solid: false, rotY: 0.2 });

  // --- sandbag arc facing the gate
  for (let layer = 0; layer < 3; layer++) {
    const n = 9 - layer;
    for (let i = 0; i < n; i++) {
      const a = lerp(0.42, Math.PI - 0.42, (i + (layer % 2) * 0.5 + (layer === 2 ? 0.5 : 0)) / (9 - 0.5));
      const x = Math.cos(a) * 4.2, z = 9.6 + Math.sin(a) * 4.2;
      const m = addBox(x, layer * 0.3, z, 0.95, 0.32, 0.5, M.sandbag, { fit: true, solid: false, rotY: -a + Math.PI / 2 + (R() - 0.5) * 0.15 });
      m.userData.wood = false;
      if (layer === 0) circles.push({ cx: x, cz: z, r: 0.42 });
    }
  }

  // --- trucks (one per courtyard)
  for (const [cx, cz] of [[11, 13.4], [-51, -4.6]]) {
    const o = { solid: false };
    addBox(cx, 0.55, cz, 6, 0.3, 2.0, M.iron, o);
    addBox(cx - 1.1, 0.85, cz, 3.7, 0.3, 2.3, M.olive, { ...o, tile: 1 });
    addBox(cx - 1.1, 1.15, cz, 3.7, 1.5, 2.3, M.tarp, { ...o, tile: 1.5 });
    addBox(cx + 1.6, 0.85, cz, 1.5, 1.65, 2.2, M.olive, { ...o, tile: 1 });
    addBox(cx + 2.92, 0.85, cz, 1.15, 0.95, 1.8, M.olive, { ...o, tile: 1 });
    wallQuad('E', cx + 2.37, cz, 1.8, 1.85, 2.4, M.glass);
    wallQuad('S', cx + 1.6, cz + 1.12, 0.9, 1.7, 2.35, M.glass); wallQuad('N', cx + 1.6, cz - 1.12, 0.9, 1.7, 2.35, M.glass);
    wallQuad('E', cx + 3.51, cz, 1.0, 1.0, 1.7, M.tire);
    wallQuad('E', cx + 3.52, cz - 0.7, 0.26, 1.25, 1.51, M.lampOff); wallQuad('E', cx + 3.52, cz + 0.7, 0.26, 1.25, 1.51, M.lampOff);
    for (const wx of [cx + 2.7, cx - 1.9]) for (const wz of [cz - 1.0, cz + 1.0]) {
      const g = new THREE.CylinderGeometry(0.5, 0.5, 0.36, 8); g.rotateX(Math.PI / 2);
      const m = new THREE.Mesh(g, M.tire); m.position.set(wx, 0.5, wz); scene.add(m); shootables.push(m);
    }
    boxes.push({ x0: cx - 2.95, x1: cx + 3.55, z0: cz - 1.2, z1: cz + 1.2 });
  }

  // --- Panzer I parked in the yard, nose toward the gate (baked model; hull collision, shootable like the trucks)
  {
    const tank = new THREE.Group(); tank.position.set(2, 0, -10); tank.rotation.y = Math.PI / 2; scene.add(tank);
    for (const m of addBaked(PZ1_MODEL, tank, { armor: mat(T.gunmetal, { tint: [0.8, 0.82, 0.78] }), tire: M.tire })) shootables.push(m);
    boxes.push({ x0: 2 - 1.4, x1: 2 + 1.4, z0: -10 - 2.7, z1: -10 + 2.7 });
  }

  // --- sign near gate
  addBox(5.6, 0, 18.6, 0.12, 1.9, 0.12, M.planks, { solid: false, wood: true });
  circles.push({ cx: 5.6, cz: 18.6, r: 0.15 });
  wallQuad('N', 5.6, 18.52, 1.5, 1.2, 1.95, M.sign);

  // --- ammo crates
  for (const [x, z] of AMMO_SPOTS) addBox(x, 0, z, 1.1, 0.6, 0.7, M.ammo, { fit: true, wood: true });

  // ================================================================ passage + second courtyard
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

  // ================================================================ architectural detail
  const T4 = { ...DECO, tile: 4 };
  // manor: cornice, pilasters, door surround, dormers, chimney caps
  addBox(0, 8.5, -19.78, 40.4, 0.4, 0.5, M.stoneDark, DECO); addBox(0, 8.3, -19.84, 40.2, 0.2, 0.34, M.trim, T4);
  for (const x of [-18, -14, -10, -6, 6, 10, 14, 18]) { addBox(x, 1.0, -19.89, 0.46, 7.3, 0.24, M.trim, T4); addBox(x, 7.9, -19.86, 0.6, 0.4, 0.3, M.stoneDark, DECO); }
  for (const x of [-1.25, 1.25]) addBox(x, 0.25, -19.86, 0.34, 2.8, 0.3, M.stoneDark, DECO);
  addBox(0, 3.35, -19.8, 2.0, 0.22, 0.36, M.stoneDark, DECO);
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
  for (const x of [-48.25, -45.75]) addBox(x, 0.25, -9.86, 0.34, 2.8, 0.3, M.stoneDark, DECO);
  addBox(-47, 3.05, -9.84, 2.9, 0.32, 0.42, M.stoneDark, DECO);
  for (const cx of [-56, -38]) { addBox(cx, 7.8, -12.2, 1.0, 3.0, 1.0, M.stone, { ...DECO, tile: 3 }); addBox(cx, 10.8, -12.2, 1.3, 0.2, 1.3, M.stoneDark, DECO); }
  // buttress piers along the courtyard walls
  for (const z of [-17, -11, -5, 1, 6.5]) pier(-20, z, 1, 0);
  for (const x of [-14, -8, 8, 14]) pier(x, 20, 0, -1);
  for (const z of [-6, 0, 6, 12, 18]) pier(-62, z, 1, 0);
  for (const x of [-58, -52, -46, -40, -34]) pier(x, 20, 0, -1);
  for (const z of [-7, -1, 5, 16.5]) pier(-32, z, -1, 0);

  // --- sky
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 20, 12), M.sky);
  sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);
  return sky;
}
export const sky = buildLevel();

// practice targets: four along the west side of the manor yard, two more by the walls
addTarget(-17.4, -14, Math.PI / 2); addTarget(-17.4, -9, Math.PI / 2); addTarget(-17.4, -4, Math.PI / 2); addTarget(-17.4, 1, Math.PI / 2);
addTarget(13.5, -17.4, 0); addTarget(-10.5, 17.5, Math.PI);

// ------------------------------------------------------------------ fixed lighting
worldL.uAmbient.value.set(0.2, 0.235, 0.36);
worldL.uSunDir.value.set(-0.266, 0.469, -0.842).normalize();
worldL.uSunCol.value.set(0.5, 0.56, 0.8);
gunL.uSunDir.value.set(-0.5, 0.8, 0.35).normalize();
