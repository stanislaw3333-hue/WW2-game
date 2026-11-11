// Manor yard (east courtyard): manor, stable, west wall + tower, south wall + gate, fountain, props, trucks, tank, ammo crates.
import * as THREE from 'three';
import { V3, lerp } from '../core/util.js';
import { boxes, circles, shootables, lightDefs } from '../core/state.js';
import PZ1_MODEL from '../models/pz1.json';
import { scene, mat } from '../render/renderer.js';
import { M, T } from '../render/materials.js';
import { addBaked } from '../render/baked.js';
import { worldUV, addBox, addCyl, quad, tri, wallQuad, win, addArch, addLantern } from './geo.js';
import { R, crate, AMMO_SPOTS } from './props.js';

export function buildYard1() {
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
}
