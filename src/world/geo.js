// Level building blocks: boxes, cylinders, quads and walls, with collision and shootable registration.
import * as THREE from 'three';
import { V3 } from '../core/util.js';
import { boxes, circles, shootables } from '../core/state.js';
import { scene } from '../render/renderer.js';
import { M } from '../render/materials.js';

export const glows = [];

// world-space UVs so textures line up across neighbouring blocks
// aspect = picture width / height: the vertical scale follows it, so the picture keeps its proportions (1 = square)
export function worldUV(geo, tile, ox, oy, oz, aspect = 1) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  const k = aspect / tile;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    const x = p.getX(i) + ox, y = p.getY(i) + oy, z = p.getZ(i) + oz;
    if (ay >= ax && ay >= az) uv.setXY(i, x / tile, z * k);
    else if (ax >= az) uv.setXY(i, z / tile, y * k);
    else uv.setXY(i, x / tile, y * k);
  }
}
export function addBox(cx, y0, cz, w, h, d, material, o = {}) {
  const seg = o.seg || 0.5;   // max piece length (m): short pieces keep the affine texture warp small on long walls
  const g = new THREE.BoxGeometry(w, h, d, Math.max(1, Math.round(w / seg)), Math.max(1, Math.round(h / seg)), Math.max(1, Math.round(d / seg)));
  if (!o.fit) worldUV(g, o.tile || 2, cx, y0 + h / 2, cz, material.userData.aspect || 1);
  const m = new THREE.Mesh(g, material);
  m.position.set(cx, y0 + h / 2, cz);
  if (o.rotY) m.rotation.y = o.rotY;
  (o.parent || scene).add(m);
  if (o.solid !== false) {
    const pad = o.rotY ? (Math.abs(Math.sin(o.rotY)) * Math.abs(w - d)) * 0 : 0;
    boxes.push({ x0: cx - w / 2 - pad, x1: cx + w / 2 + pad, z0: cz - d / 2 - pad, z1: cz + d / 2 + pad });
  }
  if (o.shoot !== false) { shootables.push(m); m.userData.wood = !!o.wood; }
  return m;
}
export function addCyl(cx, y0, cz, r, h, material, o = {}) {
  const g = new THREE.CylinderGeometry(o.rTop === undefined ? r : o.rTop, r, h, o.sides || 8, 1, !!o.open);
  if (o.us || o.vs) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (o.us || 1), uv.getY(i) * (o.vs || 1)); }
  const m = new THREE.Mesh(g, material);
  m.position.set(cx, y0 + h / 2, cz);
  (o.parent || scene).add(m);
  if (o.solid !== false) circles.push({ cx, cz, r: o.cr || r });
  if (o.shoot !== false) { shootables.push(m); m.userData.wood = !!o.wood; }
  return m;
}
export function quad(a, b, c, d, material, o = {}) {
  const nu = o.nu || 1, nv = o.nv || 1;
  const A = new V3(...a), B = new V3(...b), C = new V3(...c), D = new V3(...d);
  const lu = o.fit ? 1 : A.distanceTo(B) / (o.tile || 2), lv = o.fit ? 1 : A.distanceTo(D) / (o.tile || 2);
  const pos = [], uvs = [], idx = [];
  const p0 = new V3(), p1 = new V3();
  const vm = o.vmax || 1;   // o.vmax: show only the first part of the picture (e.g. 2/3 of it), so it is cropped, not squashed
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const s = i / nu, t = j / nv;
    p0.lerpVectors(A, B, s); p1.lerpVectors(D, C, s); p0.lerp(p1, t);
    pos.push(p0.x, p0.y, p0.z);
    // o.rot turns the picture 90 degrees, for a landscape image hung as a portrait banner
    if (o.rot) uvs.push(t * lv * vm, (1 - s) * lu); else uvs.push(s * lu, t * lv * vm);
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const i0 = j * (nu + 1) + i, i1 = i0 + 1, i2 = i0 + nu + 1, i3 = i2 + 1;
    idx.push(i0, i1, i3, i0, i3, i2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, material);
  (o.parent || scene).add(m);
  if (o.shoot) shootables.push(m);
  return m;
}
export function tri(a, b, c, material, tile = 2) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c], 3));
  const w = Math.hypot(b[0] - a[0], b[2] - a[2]);
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, w / tile, 0, w / tile / 2, (c[1] - a[1]) / tile], 2));
  g.computeVertexNormals();
  scene.add(new THREE.Mesh(g, material));
}
// flat quad on a wall. face = direction the quad faces: S(+z) N(-z) E(+x) W(-x)
export function wallQuad(face, x, z, w, y0, y1, material, o = {}) {
  const h = w / 2;
  const P = { S: [[x - h, z], [x + h, z]], N: [[x + h, z], [x - h, z]], E: [[x, z + h], [x, z - h]], W: [[x, z - h], [x, z + h]] }[face];
  return quad([P[0][0], y0, P[0][1]], [P[1][0], y0, P[1][1]], [P[1][0], y1, P[1][1]], [P[0][0], y1, P[0][1]], material, { fit: true, ...o });
}
export const DECO = { solid: false, shoot: false };
// window = lit/dark pane plus real sill, lintel, side frames and (for wide ones) shutters
export function win(face, x, z, w, y0, y1, material) {
  wallQuad(face, x, z, w, y0, y1, material);
  const n = { S: [0, 1], N: [0, -1], E: [1, 0], W: [-1, 0] }[face], ax = n[0] === 0;
  const bx = (off, yb, out, len, h, t, m, o) => (ax ? addBox(x + off, yb, z + n[1] * out, len, h, t, m, { ...DECO, ...o }) : addBox(x + n[0] * out, yb, z + off, t, h, len, m, { ...DECO, ...o }));
  bx(0, y0 - 0.14, 0.06, w + 0.36, 0.14, 0.34, M.stoneDark);
  bx(0, y1, 0.04, w + 0.3, 0.18, 0.28, M.stoneDark);
  bx(-w / 2 - 0.05, y0, 0, 0.1, y1 - y0, 0.16, M.trim); bx(w / 2 + 0.05, y0, 0, 0.1, y1 - y0, 0.16, M.trim);
  if (w >= 1.2) { const sw = w * 0.5; for (const sgn of [-1, 1]) bx(sgn * (w / 2 + 0.1 + sw / 2), y0, 0, sw, y1 - y0, 0.07, M.shutter, { tile: 0.8 }); }
}
// round arch filling the top of a 3 m opening in a 1 m thick, 4.5 m high wall
export function addArch(cx, cz, alongZ) {
  const sh = new THREE.Shape(); sh.moveTo(-1.5, 4.5); sh.lineTo(-1.5, 2.6); sh.absarc(0, 2.6, 1.5, Math.PI, 0, true); sh.lineTo(1.5, 4.5); sh.lineTo(-1.5, 4.5);
  // 1.02 deep, not 1: the arch's faces must sit proud of the wall faces, or the two z-fight and the arch flickers
  const g = new THREE.ExtrudeGeometry(sh, { depth: 1.02, bevelEnabled: false, curveSegments: 12 }); g.translate(0, 0, -0.51);
  if (alongZ) g.rotateY(Math.PI / 2);
  g.translate(cx, 0, cz); worldUV(g, 3, 0, 0, 0);
  const m = new THREE.Mesh(g, M.stone); scene.add(m); shootables.push(m);
  // dressed-stone ring around the opening
  const rg = new THREE.Shape(); rg.absarc(0, 2.6, 1.72, 0, Math.PI, false); rg.absarc(0, 2.6, 1.5, Math.PI, 0, true);
  const g2 = new THREE.ExtrudeGeometry(rg, { depth: 1.16, bevelEnabled: false, curveSegments: 12 }); g2.translate(0, 0, -0.58);
  if (alongZ) g2.rotateY(Math.PI / 2);
  g2.translate(cx, 0, cz); worldUV(g2, 1.2, 0, 0, 0);
  scene.add(new THREE.Mesh(g2, M.stoneDark));
  // jamb pillars sit 1 cm proud of the wall faces (1.60, not 1.61): flush faces z-fight with the wall and flicker
  for (const sgn of [-1, 1]) { const o = sgn * 1.60;addBox(alongZ ? cx : cx + o, 0, alongZ ? cz + o : cz, alongZ ? 1.16 : 0.22, 2.6, alongZ ? 0.22 : 1.16, M.stoneDark, DECO); }
}
// buttress pier against a wall face; (nx,nz) points away from the wall
export function pier(x, z, nx, nz) {
  const w = nx ? 0.32 : 0.8, d = nx ? 0.8 : 0.32;
  addBox(x + nx * 0.15, 0, z + nz * 0.15, w, 4.75, d, M.brick, { ...DECO, tile: 3 });
  addBox(x + nx * 0.15, 4.75, z + nz * 0.15, w + 0.14, 0.16, d + 0.14, M.stoneDark, DECO);
  addBox(x + nx * 0.2, 0, z + nz * 0.2, w + 0.12, 0.5, d + 0.12, M.stoneDark, DECO);
}
export function addGlow(x, y, z, size = 1.8) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), M.glow);
  m.position.set(x, y, z); scene.add(m); glows.push(m);
}
export function addLantern(x, y, z) {
  addBox(x, y, z, 0.3, 0.42, 0.3, M.lantern, { solid: false, fit: true, shoot: false });
  addBox(x, y + 0.42, z, 0.36, 0.08, 0.36, M.iron, { solid: false, shoot: false });
  addGlow(x, y + 0.2, z);
}
