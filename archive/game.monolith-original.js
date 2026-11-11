import * as THREE from 'three';
import { makeTextures, drawText5 as drawText, textW5 as textW, rng } from './textures.js';
import { upgradeTextures } from './textures2.js';
import { packTextures, stampEagle, atlasUV } from './packtex.js';
import { soldierTextures } from './textures3.js';
import { bodyGeos, headGeos, helmetGeos, capGeos } from './soldierGeo.js';
import K98_MODEL from './models/k98.json';
import MP40_MODEL from './models/mp40.json';
import PZ1_MODEL from './models/pz1.json';
import PG_MODEL from './models/pg.json';
import PGA_MODEL from './models/pga.json';

const V3 = THREE.Vector3;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const TEST = location.search.includes('test');

// ------------------------------------------------------------------ renderer
const LOW_H = 240;
let lowW = 320;
const canvas = document.getElementById('game');
const hudCanvas = document.getElementById('hud');
const hud = hudCanvas.getContext('2d');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: TEST });
renderer.setPixelRatio(1);
renderer.autoClear = false;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

const scene = new THREE.Scene();
const gunScene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, 4 / 3, 0.08, 400);
camera.rotation.order = 'YXZ';
const gunCam = new THREE.PerspectiveCamera(52, 4 / 3, 0.01, 5);

// ------------------------------------------------------------------ PS1 material
const FOG_COL = [12 / 255, 18 / 255, 34 / 255];
const FOG = [5, 50];
function makeLights() {
  return {
    uAmbient: { value: new V3() }, uSunDir: { value: new V3(0, 1, 0) }, uSunCol: { value: new V3() },
    uLPos: { value: [0, 1, 2, 3, 4].map(() => new V3()) }, uLCol: { value: [0, 1, 2, 3, 4].map(() => new V3()) },
    uFogCol: { value: new V3(...FOG_COL) }, uSnap: { value: new THREE.Vector2(160, 120) },
  };
}
const worldL = makeLights(), gunL = makeLights();

const VERT = `
uniform vec2 uSnap; uniform float uSnapOn;
uniform vec3 uAmbient; uniform vec3 uSunDir; uniform vec3 uSunCol;
uniform vec3 uLPos[5]; uniform vec3 uLCol[5];
uniform vec2 uFog; uniform vec3 uTint; uniform float uEmis; uniform float uAffine; uniform vec2 uUvOff;
uniform float uShadeOn; uniform vec3 uShade;   // optional vertical shade: x = darkest factor, y = height where it starts, z = height where it is fully dark
varying vec3 vUv3; varying vec3 vCol; varying float vFog;
void main(){
  vec4 wp = modelMatrix * vec4(position,1.0);
  vec4 mv = viewMatrix * wp;
  vec4 p = projectionMatrix * mv;
  if(uSnapOn>0.5 && abs(p.w)>0.0001){ vec2 s = p.xy/p.w; s = floor(s*uSnap+0.5)/uSnap; p.xy = s*p.w; }
  gl_Position = p;
  vec3 n = normalize(mat3(modelMatrix)*normal);
  vec3 l = uAmbient + uSunCol*max(dot(n,uSunDir),0.0);
  for(int i=0;i<5;i++){
    vec3 d = uLPos[i]-wp.xyz; float dist = length(d);
    float att = max(1.0-dist/16.0,0.0); att *= att;
    float nd = max(dot(n,d/max(dist,0.001)),0.0)*0.8+0.2;
    l += uLCol[i]*att*nd;
  }
  float sk = uShadeOn > 0.5 ? mix(1.0, uShade.x, smoothstep(uShade.y, uShade.z, position.y)) : 1.0;
  vCol = uTint*mix(l, vec3(1.0), uEmis)*sk;
  float q = mix(1.0, p.w, uAffine);
  vUv3 = vec3((uv+uUvOff)*q, q);
  vFog = clamp((length(mv.xyz)-uFog.x)/(uFog.y-uFog.x),0.0,1.0);
}`;
const FRAG = `
uniform sampler2D map; uniform vec3 uFogCol; uniform float uCut; uniform float uAdd;
varying vec3 vUv3; varying vec3 vCol; varying float vFog;
float bayer(vec2 p){
  int x = int(mod(p.x,4.0)); int y = int(mod(p.y,4.0));
  const float m[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
  return m[y*4+x]/16.0;
}
void main(){
  vec2 uv = vUv3.xy/vUv3.z;
  vec4 t = texture2D(map, uv);
  if(t.a < uCut) discard;
  vec3 c = t.rgb*vCol;
  c = uAdd>0.5 ? c*(1.0-vFog) : mix(c, uFogCol, vFog);
  c = clamp(c,0.0,1.0);
  c += (bayer(gl_FragCoord.xy)-0.5)/255.0;
  gl_FragColor = vec4(c, t.a);
}`;

function mat(map, o = {}) {
  const L = o.lights || worldL;
  const m = new THREE.ShaderMaterial({
    uniforms: {
      ...L, map: { value: map },
      uTint: { value: new V3(...(o.tint || [1, 1, 1])) }, uEmis: { value: o.emis || 0 },
      uFog: { value: new THREE.Vector2(...(o.fog === false ? [1e6, 2e6] : FOG)) },
      uAffine: { value: o.affine === undefined ? 0.3 : o.affine }, uSnapOn: { value: o.snap === false ? 0 : 1 },
      uUvOff: { value: new THREE.Vector2() }, uShadeOn: { value: o.shade ? 1 : 0 }, uShade: { value: new V3(...(o.shade || [1, 0, 1])) }, uCut: { value: o.additive ? 0.01 : 0.5 }, uAdd: { value: o.additive ? 1 : 0 },
    },
    vertexShader: VERT, fragmentShader: FRAG, side: o.side || THREE.FrontSide,
  });
  if (o.additive) { m.transparent = true; m.blending = THREE.AdditiveBlending; m.depthWrite = false; }
  if (o.decal) { m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -6; }
  if (o.depthWrite === false) m.depthWrite = false;
  return m;
}

const T = stampEagle(soldierTextures(packTextures(upgradeTextures(makeTextures()))));
const M = {
  cobble: mat(T.cobble), stone: mat(T.stone), stoneDark: mat(T.stoneDark), plaster: mat(T.plaster),
  planks: mat(T.planks), crate: mat(T.crate), ammo: mat(T.ammo), roof: mat(T.roof),
  winLit: mat(T.winLit, { emis: 1, tint: [1.0, 0.92, 0.75], decal: true }), winDark: mat(T.winDark, { decal: true }),
  door: mat(T.door, { decal: true }), gate: mat(T.gate), gateD: mat(T.gate, { decal: true }),
  barrel: mat(T.barrel), sandbag: mat(T.sandbag), hay: mat(T.hay), bark: mat(T.bark), dirt: mat(T.dirt),
  foliage: mat(T.foliage, { side: THREE.DoubleSide }), poplar: mat(T.poplar, { emis: 1, tint: [0.02, 0.035, 0.06] }),
  target: mat(T.target, { side: THREE.DoubleSide }), iron: mat(T.iron),
  olive: mat(T.olive), tarp: mat(T.tarp), tire: mat(T.tire), glass: mat(T.glass, { decal: true }),
  water: mat(T.water, { tint: [1.4, 1.5, 1.7] }), lantern: mat(T.lantern, { emis: 1, tint: [1.15, 1.0, 0.8] }),
  lampOff: mat(T.lampOff, { decal: true }), sign: mat(T.sign, { decal: true, side: THREE.DoubleSide }),
  glow: mat(T.glow, { additive: true, emis: 1, tint: [1.0, 0.62, 0.25], snap: false }),
  hole: mat(T.hole, { decal: true }),
  flag: mat(T.flag, { decal: true, side: THREE.DoubleSide }), poster: mat(T.poster, { decal: true }), crateE: mat(T.crateEagle),
  dust: mat(T.white, { tint: [0.6, 0.58, 0.52] }), chip: mat(T.white, { tint: [0.62, 0.42, 0.22] }),
  sky: mat(T.sky, { emis: 1, fog: false, affine: 0, snap: false, side: THREE.BackSide, depthWrite: false }),
  skin: mat(T.skin, { affine: 0, emis: 0.16 }), boot: mat(T.boot, { affine: 0, emis: 0.16 }), cloth: mat(T.cloth, { affine: 0, emis: 0.16 }), trouser: mat(T.trouser, { affine: 0, emis: 0.16 }),
  tunic: mat(T.tunic, { affine: 0, emis: 0.16 }), belt: mat(T.belt, { affine: 0, emis: 0.16 }), head: mat(T.head, { affine: 0, emis: 0.16 }),
  helmet: mat(T.helmet, { affine: 0, emis: 0.16, side: THREE.DoubleSide }), cap: mat(T.cap, { affine: 0, emis: 0.16, side: THREE.DoubleSide }),
  visor: mat(T.boot, { affine: 0, emis: 0.16, side: THREE.DoubleSide }),
  erifle: mat(T.gunwood, { affine: 0, tint: [0.8, 0.75, 0.7] }), emetal: mat(T.gunmetal, { affine: 0 }),
  trim: mat(T.plaster, { tint: [0.74, 0.72, 0.7] }), shutter: mat(T.planks, { tint: [0.5, 0.68, 0.56] }),
  eflash: mat(T.flash, { additive: true, emis: 1, snap: false, side: THREE.DoubleSide }),
  puff: mat(T.white, { tint: [0.42, 0.13, 0.1] }),
};

// soldier materials: two uniform colours, four faces, shared kit
const SM = (() => {
  const o = { affine: 0, emis: 0.16 }, od = { ...o, side: THREE.DoubleSide };
  return {
    uni: [
      { tunic: mat(T.atlasSepia, { ...o, tint: [0.46, 0.44, 0.48] }), trouser: mat(T.sUniforms[0].trouser, o), sleeve: mat(T.atlasSepia, { ...o, tint: [0.46, 0.44, 0.48] }) },   // dark charcoal
      { tunic: mat(T.atlasGrey, { ...o, tint: [0.9, 0.98, 0.9] }), trouser: mat(T.sUniforms[1].trouser, o), sleeve: mat(T.atlasGrey, { ...o, tint: [0.9, 0.98, 0.9] }) },   // field grey
    ],
    // faces: pack head textures (two painted variants), plain skin for neck and features
    face: T.sFaces.map((f, i) => ({ head: mat(i % 2 ? T.face758 : T.face768, o), skin: mat(f.skin, o) })),
    // face under the brim: the upper face (brow, eyes, nose bridge) falls into shadow, the mouth and chin stay lit
    shadow: mat(T.face768, { affine: 0, emis: 0.16, tint: [0.85, 0.8, 0.74], shade: [0.2, -0.06, -0.01] }),
    boot: mat(T.sBoot, o), leather: mat(T.sLeather, o), belt: mat(T.sBelt, o), metal: mat(T.sMetal, o), felt: mat(T.sFelt, o), canvas: mat(T.sCanvas, o),
    stahl: mat(T.sStahl, od), cap: mat(T.sCap, od), band: mat(T.sBand, o), peak: mat(T.sPeak, od),
  };
})();

// ------------------------------------------------------------------ level helpers
const boxes = [], circles = [], shootables = [];
function worldUV(geo, tile, ox, oy, oz) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    const x = p.getX(i) + ox, y = p.getY(i) + oy, z = p.getZ(i) + oz;
    if (ay >= ax && ay >= az) uv.setXY(i, x / tile, z / tile);
    else if (ax >= az) uv.setXY(i, z / tile, y / tile);
    else uv.setXY(i, x / tile, y / tile);
  }
}
function addBox(cx, y0, cz, w, h, d, material, o = {}) {
  const seg = o.seg || 2.5;
  const g = new THREE.BoxGeometry(w, h, d, Math.max(1, Math.round(w / seg)), Math.max(1, Math.round(h / seg)), Math.max(1, Math.round(d / seg)));
  if (!o.fit) worldUV(g, o.tile || 2, cx, y0 + h / 2, cz);
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
function addCyl(cx, y0, cz, r, h, material, o = {}) {
  const g = new THREE.CylinderGeometry(o.rTop === undefined ? r : o.rTop, r, h, o.sides || 8, 1, !!o.open);
  if (o.us || o.vs) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (o.us || 1), uv.getY(i) * (o.vs || 1)); }
  const m = new THREE.Mesh(g, material);
  m.position.set(cx, y0 + h / 2, cz);
  (o.parent || scene).add(m);
  if (o.solid !== false) circles.push({ cx, cz, r: o.cr || r });
  if (o.shoot !== false) { shootables.push(m); m.userData.wood = !!o.wood; }
  return m;
}
function quad(a, b, c, d, material, o = {}) {
  const nu = o.nu || 1, nv = o.nv || 1;
  const A = new V3(...a), B = new V3(...b), C = new V3(...c), D = new V3(...d);
  const lu = o.fit ? 1 : A.distanceTo(B) / (o.tile || 2), lv = o.fit ? 1 : A.distanceTo(D) / (o.tile || 2);
  const pos = [], uvs = [], idx = [];
  const p0 = new V3(), p1 = new V3();
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const s = i / nu, t = j / nv;
    p0.lerpVectors(A, B, s); p1.lerpVectors(D, C, s); p0.lerp(p1, t);
    pos.push(p0.x, p0.y, p0.z); uvs.push(s * lu, t * lv);
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
function tri(a, b, c, material, tile = 2) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c], 3));
  const w = Math.hypot(b[0] - a[0], b[2] - a[2]);
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, w / tile, 0, w / tile / 2, (c[1] - a[1]) / tile], 2));
  g.computeVertexNormals();
  scene.add(new THREE.Mesh(g, material));
}
// flat quad on a wall. face = direction the quad faces: S(+z) N(-z) E(+x) W(-x)
function wallQuad(face, x, z, w, y0, y1, material, o = {}) {
  const h = w / 2;
  const P = { S: [[x - h, z], [x + h, z]], N: [[x + h, z], [x - h, z]], E: [[x, z + h], [x, z - h]], W: [[x, z - h], [x, z + h]] }[face];
  return quad([P[0][0], y0, P[0][1]], [P[1][0], y0, P[1][1]], [P[1][0], y1, P[1][1]], [P[0][0], y1, P[0][1]], material, { fit: true, ...o });
}
const DECO = { solid: false, shoot: false };
// window = lit/dark pane plus real sill, lintel, side frames and (for wide ones) shutters
function win(face, x, z, w, y0, y1, material) {
  wallQuad(face, x, z, w, y0, y1, material);
  const n = { S: [0, 1], N: [0, -1], E: [1, 0], W: [-1, 0] }[face], ax = n[0] === 0;
  const bx = (off, yb, out, len, h, t, m, o) => (ax ? addBox(x + off, yb, z + n[1] * out, len, h, t, m, { ...DECO, ...o }) : addBox(x + n[0] * out, yb, z + off, t, h, len, m, { ...DECO, ...o }));
  bx(0, y0 - 0.14, 0.06, w + 0.36, 0.14, 0.34, M.stoneDark);
  bx(0, y1, 0.04, w + 0.3, 0.18, 0.28, M.stoneDark);
  bx(-w / 2 - 0.05, y0, 0, 0.1, y1 - y0, 0.16, M.trim); bx(w / 2 + 0.05, y0, 0, 0.1, y1 - y0, 0.16, M.trim);
  if (w >= 1.2) { const sw = w * 0.5; for (const sgn of [-1, 1]) bx(sgn * (w / 2 + 0.1 + sw / 2), y0, 0, sw, y1 - y0, 0.07, M.shutter, { tile: 0.8 }); }
}
// round arch filling the top of a 3 m opening in a 1 m thick, 4.5 m high wall
function addArch(cx, cz, alongZ) {
  const sh = new THREE.Shape(); sh.moveTo(-1.5, 4.5); sh.lineTo(-1.5, 2.6); sh.absarc(0, 2.6, 1.5, Math.PI, 0, true); sh.lineTo(1.5, 4.5); sh.lineTo(-1.5, 4.5);
  const g = new THREE.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: false, curveSegments: 12 }); g.translate(0, 0, -0.5);
  if (alongZ) g.rotateY(Math.PI / 2);
  g.translate(cx, 0, cz); worldUV(g, 3, 0, 0, 0);
  const m = new THREE.Mesh(g, M.stone); scene.add(m); shootables.push(m);
  // dressed-stone ring around the opening
  const rg = new THREE.Shape(); rg.absarc(0, 2.6, 1.72, 0, Math.PI, false); rg.absarc(0, 2.6, 1.5, Math.PI, 0, true);
  const g2 = new THREE.ExtrudeGeometry(rg, { depth: 1.16, bevelEnabled: false, curveSegments: 12 }); g2.translate(0, 0, -0.58);
  if (alongZ) g2.rotateY(Math.PI / 2);
  g2.translate(cx, 0, cz); worldUV(g2, 1.2, 0, 0, 0);
  scene.add(new THREE.Mesh(g2, M.stoneDark));
  for (const sgn of [-1, 1]) { const o = sgn * 1.61; addBox(alongZ ? cx : cx + o, 0, alongZ ? cz + o : cz, alongZ ? 1.16 : 0.22, 2.6, alongZ ? 0.22 : 1.16, M.stoneDark, DECO); }
}
// buttress pier against a wall face; (nx,nz) points away from the wall
function pier(x, z, nx, nz) {
  const w = nx ? 0.32 : 0.8, d = nx ? 0.8 : 0.32;
  addBox(x + nx * 0.15, 0, z + nz * 0.15, w, 4.75, d, M.stone, { ...DECO, tile: 3 });
  addBox(x + nx * 0.15, 4.75, z + nz * 0.15, w + 0.14, 0.16, d + 0.14, M.stoneDark, DECO);
  addBox(x + nx * 0.2, 0, z + nz * 0.2, w + 0.12, 0.5, d + 0.12, M.stoneDark, DECO);
}
const glows = [];
function addGlow(x, y, z, size = 1.8) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), M.glow);
  m.position.set(x, y, z); scene.add(m); glows.push(m);
}
function addLantern(x, y, z) {
  addBox(x, y, z, 0.3, 0.42, 0.3, M.lantern, { solid: false, fit: true, shoot: false });
  addBox(x, y + 0.42, z, 0.36, 0.08, 0.36, M.iron, { solid: false, shoot: false });
  addGlow(x, y + 0.2, z);
}

// ------------------------------------------------------------------ build the courtyard
const R = rng(77);
const lightDefs = []; // {pos, col}
const AMMO_SPOTS = [[17.4, -9.5], [-34.2, 18.3]];
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
const sky = buildLevel();

// ------------------------------------------------------------------ targets
const targets = [];
function addTarget(x, z, rotY) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; scene.add(g);
  const tilt = new THREE.Group(); g.add(tilt);
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.3, 0.1), M.planks); post.position.y = 0.65; tilt.add(post);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), M.target); board.position.set(0, 1.6, 0.06); tilt.add(board);
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 0.5), M.planks); foot.position.y = 0.05; g.add(foot);
  const t = { g, tilt, down: false, a: 0, v: 0 };
  post.userData = { target: t, wood: true }; board.userData = { target: t, wood: true, round: true };
  shootables.push(post, board); targets.push(t);
  circles.push({ cx: x, cz: z, r: 0.3 });
}
addTarget(-17.4, -14, Math.PI / 2); addTarget(-17.4, -9, Math.PI / 2); addTarget(-17.4, -4, Math.PI / 2); addTarget(-17.4, 1, Math.PI / 2);
addTarget(13.5, -17.4, 0); addTarget(-10.5, 17.5, Math.PI);

// ------------------------------------------------------------------ enemy soldiers
const enemies = [], enemyParts = [];
let kills = 0;
const SB = bodyGeos(), SH = headGeos(), SHM = helmetGeos(), SC = capGeos();
const HEAD_SCALE = 1.2;   // skull and features are enlarged so the head fills the helmet; helmet and cap keep their size
// uniform details: left-arm band (a cylinder arc around the sleeve) and officer shoulder boards
const ARMBAND_GEO = new THREE.CylinderGeometry(0.0605, 0.0605, 0.1, 20, 1, true, Math.PI / 2 - 1.15, 2.3);
const BOARD_GEO = new THREE.BoxGeometry(0.075, 0.022, 0.06);
let ARMBAND_MAT = null;
// red armband with white disc and black swastika, painted once on a canvas and shared by every soldier
function armbandMat() {
  if (ARMBAND_MAT) return ARMBAND_MAT;
  const c = document.createElement('canvas'); c.width = 192; c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#9a1212'; x.fillRect(0, 0, 192, 128);
  x.fillStyle = '#ece8dc'; x.beginPath(); x.arc(96, 64, 46, 0, Math.PI * 2); x.fill();
  x.save(); x.translate(96, 64); x.strokeStyle = '#0d0d0d'; x.lineWidth = 11; x.lineJoin = 'miter';
  for (let k = 0; k < 4; k++) { x.rotate(Math.PI / 2); x.beginPath(); x.moveTo(0, -6); x.lineTo(0, -32); x.lineTo(24, -32); x.stroke(); }
  x.restore();
  const tex = new THREE.CanvasTexture(c); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
  ARMBAND_MAT = mat(tex, { affine: 0, emis: 0.16 });
  return ARMBAND_MAT;
}
// jacket and sleeves are laid out on the pack's soldier atlas (torso centre, arms out to each side)
atlasUV(SB.jacket, 0.30, 0.70, 0.02, 0.98);
// skull: the face part of the pack's head map (eyes, nose and mouth sit in the upper-middle of the sheet)
for (const k of ['shoulder', 'upper', 'fore']) if (SB[k]) atlasUV(SB[k], 0.02, 0.28, 0.25, 0.75);
const SG = {};
{
  SG.flash = new THREE.PlaneGeometry(0.5, 0.5);
}
function refreshEnemyParts() { enemyParts.length = 0; for (const e of enemies) if (e.alive) enemyParts.push(...e.parts); }
function resetEnemy(e) {
  Object.assign(e, {
    x: e.home.x, z: e.home.z, yaw: e.home.yaw, hp: 100, alive: true, alert: false, los: false, losT: Math.random() * 0.3,
    shootT: 1, walk: 0, mv: 0, aim: 0, fall: 0, fallV: 0, thud: false, flash: 0, stuckT: 0, sideT: 0, sideDir: 1, flinch: 0,
    pi: 0, waitT: Math.random() * 2, strafeT: 1 + Math.random() * 2, strafeDir: 0, range: 9 + Math.random() * 7,
  });
  e.body.rotation.x = 0; e.body.position.y = 0;
}
// hit boxes: the procedural soldier parts are kept for raycasting but drawn with this invisible material
const HIT_MAT = new THREE.MeshBasicMaterial({ visible: false });
// look = { uni: 0 dark | 1 field-grey, face: 0..3 }; officer = peaked cap, otherwise steel helmet
function addEnemy(x, z, yaw, patrol, officer, look = {}) {
  const g = new THREE.Group(); scene.add(g);
  const body = new THREE.Group(); g.add(body);
  const e = { g, body, home: { x, z, yaw }, patrol: patrol || null, parts: [] };
  const U = SM.uni[look.uni || 0], F = SM.face[look.face || 0];
  const mk = (geo, material, parent, name, px = 0, py = 0, pz = 0) => {
    const m = new THREE.Mesh(geo, material); m.position.set(px, py, pz); parent.add(m);
    m.userData = { enemy: e, part: name }; e.parts.push(m); return m;
  };
  const grp = (parent, px, py, pz) => { const p = new THREE.Group(); p.position.set(px, py, pz); parent.add(p); return p; };
  // legs: trousers -> bloused turn-in -> boot shaft -> shaped foot with sole and heel
  e.legs = [1, -1].map(s => {
    const hip = grp(body, s * 0.105, 0.9, 0); mk(SB.thigh, U.trouser, hip, 'leg');
    const knee = grp(hip, 0, -0.44, 0); mk(SB.blouse, U.trouser, knee, 'leg'); mk(SB.shaft, SM.boot, knee, 'leg');
    const foot = grp(knee, 0, -0.408, 0.004); mk(SB.foot, SM.boot, foot, 'leg'); mk(SB.sole, SM.leather, foot, 'leg'); mk(SB.heel, SM.leather, foot, 'leg');
    return { hip, knee };
  });
  // torso + kit
  mk(SB.jacket, U.tunic, body, 'body');
  mk(SB.neck, F.skin, body, 'head');
  mk(SB.belt, SM.belt, body, 'body');
  mk(SB.buckle, SM.metal, body, 'body', 0, 1.01, 0.137);
  mk(SB.pouches, SM.leather, body, 'body');
  mk(SB.breadbag, SM.canvas, body, 'body', -0.05, 0.88, -0.152).rotation.y = 0.05;
  const cn = mk(SB.canteen, SM.felt, body, 'body', 0.155, 0.9, -0.118); cn.rotation.y = -0.4;
  const by = mk(SB.bayonet, SM.leather, body, 'body', -0.185, 0.98, 0.02); by.rotation.z = 0.06;
  // officer shoulder boards with a piped edge
  if (officer) for (const s of [-1, 1]) { const b = mk(BOARD_GEO, SM.band, body, 'body', s * 0.15, 1.44, 0); b.rotation.z = -s * 0.2; mk(new THREE.BoxGeometry(0.077, 0.004, 0.062), SM.metal, body, 'body', s * 0.15, 1.452, 0).rotation.z = -s * 0.2; }
  // head
  const head = grp(body, 0, 1.645, 0); e.head = head;
  const face = grp(head, 0, 0, 0); face.scale.setScalar(HEAD_SCALE);
  mk(SH.skull, SM.shadow, face, 'head'); mk(SH.features, SM.shadow, face, 'head');
  if (officer) {
    const cap = grp(head, 0, 0.056, -0.008); cap.rotation.x = 0.02;
    mk(SC.band, SM.band, cap, 'head'); mk(SC.crown, SM.cap, cap, 'head'); mk(SC.piping, SM.metal, cap, 'head');
    const pk = mk(SC.peak, SM.peak, cap, 'head', 0, 0.004, 0.106); pk.rotation.x = 0.2;
    mk(SC.badge, SM.metal, cap, 'head', 0, 0.026, 0.1135); mk(SC.cord, SM.metal, cap, 'head');
  } else {
    const hm = grp(head, 0, 0.012, -0.018);
    mk(SHM.dome, SM.stahl, hm, 'head'); mk(SHM.rim, SM.stahl, hm, 'head');
    for (const s of [-1, 1]) mk(SHM.vent, SM.metal, hm, 'head', s * 0.113, 0.07, 0.0);
    mk(SHM.strap, SM.leather, head, 'head');
  }
  // arms: sleeve + bare fist; posed by IK in poseEnemy
  e.arms = [1, -1].map(s => {
    mk(SB.shoulder, U.sleeve, body, 'arm', s * 0.215, 1.405, 0);
    const up = grp(body, s * 0.226, 1.41, 0); mk(SB.upper, U.sleeve, up, 'arm');
    if (s === 1) mk(ARMBAND_GEO, armbandMat(), up, 'arm', 0, -0.09, 0);   // swastika armband on the left upper arm
    const fo = grp(body, 0, 0, 0); mk(SB.fore, U.sleeve, fo, 'arm'); mk(SB.hand, F.skin, fo, 'arm', 0, -0.28, 0);
    return { S: new V3(s * 0.226, 1.41, 0), up, fo, pole: new V3(s * 0.55, -1, -0.25) };
  });
  e.rifle = grp(body, 0, 1.1, 0.2); e.rifle.rotation.order = 'YXZ';
  // the same baked Kar98k as the player's, turned to point +z, with the grip at the rifle origin the hands are placed on
  const rifleM = new THREE.Group(); rifleM.rotation.y = Math.PI; rifleM.position.z = 0.08; e.rifle.add(rifleM);
  addBaked(K98_MODEL, rifleM, { wood: M.erifle, metal: M.emetal });
  e.flashM = new THREE.Group(); e.flashM.position.set(0, 0.058, 0.86); e.flashM.visible = false; e.rifle.add(e.flashM);
  for (const ry of [0, Math.PI / 2]) { const f = new THREE.Mesh(SG.flash, M.eflash); f.rotation.y = ry; e.flashM.add(f); }
  // visible body: the Panzergrenadier in two baked poses, carried and shouldered (poseEnemy swaps them);
  // the procedural parts above only take hits
  const bodyMats = { uniform: U.tunic, helmet: SM.stahl, leather: SM.leather };
  e.carryBody = addBaked(PG_MODEL, body, bodyMats);
  e.aimBody = addBaked(PGA_MODEL, body, bodyMats);
  for (const m of e.aimBody) m.visible = false;
  for (const m of e.parts) m.material = HIT_MAT;
  enemies.push(e); resetEnemy(e);
}
const EAST = Math.PI / 2;
addEnemy(-45.6, 6.4, EAST, null, false, { uni: 0, face: 0 });
addEnemy(-40.5, -4.2, EAST * 0.6, null, true, { uni: 0, face: 3 });
addEnemy(-56, -8, EAST, [[-56, -8], [-42, -8]], false, { uni: 1, face: 1 });
addEnemy(-58, 12.5, EAST * 1.2, null, false, { uni: 0, face: 2 });
addEnemy(-54, 17.5, EAST, [[-54, 17.5], [-40, 17.5]], true, { uni: 1, face: 0 });
addEnemy(-59.5, 1, EAST, null, false, { uni: 1, face: 3 });
refreshEnemyParts();

// two-bone arm IK in body space: shoulder a.S -> elbow -> hand target H
const DOWN = new V3(0, -1, 0), ikD = new V3(), ikE = new V3(), ikT = new V3(), ikH = new V3(), ikR = new V3(), ikL = new V3();
function armIK(a, H) {
  const L1 = 0.3, L2 = 0.33;
  ikD.subVectors(H, a.S); let d = ikD.length(); const dm = L1 + L2 - 0.004;
  if (d > dm) { ikD.multiplyScalar(dm / d); d = dm; }
  ikH.copy(a.S).add(ikD);
  const a1 = (L1 * L1 - L2 * L2 + d * d) / (2 * d), hgt = Math.sqrt(Math.max(0, L1 * L1 - a1 * a1));
  ikD.multiplyScalar(1 / d);
  ikE.copy(a.pole).addScaledVector(ikD, -a.pole.dot(ikD)).normalize().multiplyScalar(hgt).addScaledVector(ikD, a1).add(a.S);
  a.up.quaternion.setFromUnitVectors(DOWN, ikT.subVectors(ikE, a.S).normalize());
  a.fo.position.copy(ikE); a.fo.quaternion.setFromUnitVectors(DOWN, ikT.subVectors(ikH, ikE).normalize());
}
function poseEnemy(e) {
  const a = e.aim, w = e.walk, mv = e.mv;
  e.legs.forEach((l, i) => {
    const ph = w + i * Math.PI;
    l.hip.rotation.x = -Math.sin(ph) * 0.6 * mv;
    l.knee.rotation.x = (0.08 + Math.max(0, Math.cos(ph)) * 0.95) * mv;
  });
  // rifle and body switch together: carried low, or shouldered once aiming. The baked hands sit on the rifle in each pose (bake2.py),
  // so the rifle snaps between the two rather than sliding, which would take the hands off it
  const shouldered = a > 0.5;
  for (const m of e.carryBody) m.visible = !shouldered;
  for (const m of e.aimBody) m.visible = shouldered;
  if (shouldered) { e.rifle.position.set(-0.085, 1.4, 0.31); e.rifle.rotation.set(0, 0.05, 0); }
  else { e.rifle.position.set(0, 1.07, 0.2); e.rifle.rotation.set(0.45, 0.65, 0); }
  e.rifle.updateMatrix();
  armIK(e.arms[1], ikR.set(0, 0.0, 0.0).applyMatrix4(e.rifle.matrix));
  armIK(e.arms[0], ikL.set(0, 0.0, 0.2).applyMatrix4(e.rifle.matrix));
  e.head.rotation.set(-e.flinch * 0.3 + lerp(0.02, 0.1, a), lerp(0, -0.12, a), lerp(0, -0.1, a));
}

const losRay = new THREE.Raycaster(), losA = new V3(), losD = new V3();
function hasLOS(e) {
  losA.set(e.x, 1.6, e.z); losD.copy(camera.position).sub(losA);
  const d = losD.length(); if (d < 0.5) return true;
  losRay.set(losA, losD.divideScalar(d)); losRay.near = 0.3; losRay.far = d - 0.2;
  return losRay.intersectObjects(shootables, false).length === 0;
}
// German shouts through the browser's speech synthesis (uses a German voice when the system has one).
// A shared cooldown keeps several soldiers from talking over each other.
let lastShout = -9;
function shoutFrom(e, word, prob = 1) {
  if (!e.alive || Math.random() > prob || time - lastShout < 1.2) return;
  if (!('speechSynthesis' in window)) return;
  lastShout = time;
  const u = new SpeechSynthesisUtterance(word);
  u.lang = 'de-DE'; u.pitch = 0.45; u.rate = 0.95; u.volume = 0.9;
  const v = speechSynthesis.getVoices().find(x => /^de/i.test(x.lang)); if (v) u.voice = v;
  speechSynthesis.speak(u);
}
function alertEnemy(e, spread = true) {
  if (!e.alive) return;
  if (!e.alert) { e.alert = true; e.shootT = 0.7 + Math.random() * 0.8; shoutFrom(e, 'Achtung!'); }
  if (spread) for (const o of enemies) if (o !== e && !o.alert && Math.hypot(o.x - e.x, o.z - e.z) < 24) alertEnemy(o, false);
}
function hitEnemy(e, part, dmg) {
  e.hp -= dmg * (part === 'head' ? 3 : part === 'body' ? 1 : 0.75);
  e.flinch = 1; SFX.hit(); alertEnemy(e);
  if (e.hp > 0) { shoutFrom(e, 'Getroffen!', 0.35); return; }
  shoutFrom(e, 'Gefallen!', 0.8);
  e.alive = false; e.fallV = 1.5; e.flash = 0; e.flashM.visible = false; kills++; refreshEnemyParts();
  const all = kills >= enemies.length;
  say(all ? 'COURTYARD SECURED - ALL ENEMIES DOWN' : 'ENEMY DOWN  ' + kills + '/' + enemies.length, all ? 5 : 2.5);
  if (all) SFX.done();
}
function hurtPlayer(d) {
  player.hp -= d; player.hurt = 1; player.lastHit = time; SFX.hurt(); gun.camKick = Math.max(gun.camKick, 0.7);
  if (player.hp <= 0) { player.hp = 0; state = 'dead'; deadT = 0; fireHeld = adsHeld = false; messageT = 0; }
}
function enemyShoot(e, dist, moving) {
  e.shootT = 1.9 + Math.random() * 1.3; e.flash = 0.07; e.flashM.rotation.z = Math.random() * 6.28;
  SFX.eshot(dist);
  shoutFrom(e, ['Feuer!', 'Halt!', 'Hier!'][(Math.random() * 3) | 0], 0.3);
  let p = clamp(0.6 - dist * 0.015, 0.12, 0.5);
  if (player.move > 0.9) p *= 0.7;
  if (player.crouch > 0.5) p *= 0.75;
  if (moving) p *= 0.6;
  if (Math.random() < p) hurtPlayer(7 + Math.random() * 8);
  else if (Math.random() < 0.6) SFX.whiz();
}
// the two courtyards are joined by one archway, so enemies route through it
const WP_A = { x: -20.4, z: 10.5 }, WP_B = { x: -32.6, z: 10.5 };
const zoneOf = x => (x > -21 ? 0 : x < -32 ? 2 : 1);
function navTarget(e) {
  const ze = zoneOf(e.x), zp = zoneOf(player.x);
  if (ze === zp) return player;
  if (ze === 2) return Math.hypot(e.x - WP_B.x, e.z - WP_B.z) > 1.2 ? WP_B : WP_A;
  if (ze === 0) return Math.hypot(e.x - WP_A.x, e.z - WP_A.z) > 1.2 ? WP_A : WP_B;
  return zp === 0 ? WP_A : WP_B;
}
function angLerp(a, b, t) { const d = (((b - a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; return a + d * t; }
function updateEnemies(dt) {
  const live = state === 'play';
  for (const e of enemies) {
    const dx = player.x - e.x, dz = player.z - e.z, dist = Math.hypot(dx, dz) || 0.01;
    if (!e.alive) {
      if (e.fall < 1.5708) {
        e.fallV += 9 * dt; e.fall = Math.min(1.5708, e.fall + e.fallV * dt);
        if (e.fall >= 1.5708 && !e.thud) { e.thud = true; SFX.thud(dist); }
      }
      e.body.rotation.x = -e.fall; e.body.position.y = Math.sin(e.fall) * 0.13;
      if (e.fall < 1.5708) { e.aim = lerp(e.aim, 0, 1 - Math.exp(-dt * 6)); e.mv = lerp(e.mv, 0.5, 1 - Math.exp(-dt * 6)); e.flinch = 0; poseEnemy(e); }
      continue;
    }
    e.losT -= dt;
    if (e.losT <= 0) {
      e.losT = 0.18 + Math.random() * 0.12;
      const had = e.los;
      e.los = live && dist < 45 && hasLOS(e);
      if (e.los && !e.alert) {
        const facing = (Math.sin(e.yaw) * dx + Math.cos(e.yaw) * dz) / dist;
        if (dist < 7 || (dist < 28 && facing > 0.1)) alertEnemy(e);
      }
      if (e.los && !had) e.shootT = Math.max(e.shootT, 0.6 + Math.random() * 0.7);
    }
    let mvx = 0, mvz = 0, speed = 0, face = e.yaw, aim = 0;
    if (e.alert && live) {
      if (e.los && dist < e.range) {
        aim = 1; face = Math.atan2(dx, dz);
        e.strafeT -= dt;
        if (e.strafeT <= 0) { e.strafeDir = e.strafeDir ? 0 : (Math.random() < 0.5 ? -1 : 1); e.strafeT = e.strafeDir ? 0.6 + Math.random() * 0.6 : 1.5 + Math.random() * 2.5; }
        if (dist < 3.5) { mvx = -dx / dist; mvz = -dz / dist; speed = 1.6; }
        else if (e.strafeDir) { mvx = dz / dist * e.strafeDir; mvz = -dx / dist * e.strafeDir; speed = 1.5; }
      } else {
        const t = navTarget(e);
        let tx = t.x - e.x, tz = t.z - e.z; const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
        if (e.sideT > 0) { e.sideT -= dt; const s = e.sideDir, ax = tx * 0.25 - tz * s, az = tz * 0.25 + tx * s, al = Math.hypot(ax, az); tx = ax / al; tz = az / al; }
        mvx = tx; mvz = tz; speed = 3.0; aim = e.los ? 0.85 : 0.35;
        face = e.los ? Math.atan2(dx, dz) : Math.atan2(tx, tz);
      }
      if (e.los) { e.shootT -= dt; if (e.shootT <= 0) enemyShoot(e, dist, speed > 2); }
    } else if (e.patrol) {
      if (e.waitT > 0) e.waitT -= dt;
      else {
        const p = e.patrol[e.pi], tx = p[0] - e.x, tz = p[1] - e.z, tl = Math.hypot(tx, tz);
        if (tl < 0.4) { e.pi = (e.pi + 1) % e.patrol.length; e.waitT = 1.5 + Math.random() * 2; }
        else { mvx = tx / tl; mvz = tz / tl; speed = 1.15; face = Math.atan2(tx, tz); }
      }
    } else face = e.home.yaw + Math.sin(time * 0.4 + e.home.x) * 0.5;
    let moved = 0;
    if (speed > 0) {
      const ox = e.x, oz = e.z;
      e.x += mvx * speed * dt; e.z += mvz * speed * dt; resolve(e, e);
      moved = Math.hypot(e.x - ox, e.z - oz) / Math.max(dt, 1e-4);
      if (speed > 2 && moved < speed * 0.35) { e.stuckT += dt; if (e.stuckT > 0.3 && e.sideT <= 0) { e.sideT = 0.9 + Math.random() * 0.8; e.sideDir = Math.random() < 0.5 ? -1 : 1; e.stuckT = 0; } }
      else e.stuckT = 0;
    }
    e.mv = lerp(e.mv, clamp(moved / 3, 0, 1), 1 - Math.exp(-dt * 10));
    e.walk += moved * dt * 2.6;
    e.yaw = angLerp(e.yaw, face, 1 - Math.exp(-dt * 7));
    e.aim = lerp(e.aim, aim, 1 - Math.exp(-dt * 8));
    e.flinch = Math.max(0, e.flinch - dt * 4);
    e.body.rotation.x = -e.flinch * 0.2;
    poseEnemy(e);
    e.g.position.set(e.x, 0, e.z); e.g.rotation.y = e.yaw;
    if (e.flash > 0) e.flash -= dt;
    e.flashM.visible = e.flash > 0;
  }
}
function resetGame() {
  Object.assign(player, { x: 0, z: 17.2, y: 0, vy: 0, yaw: 0, pitch: 0, hp: 100, hurt: 0, lastHit: -99 });
  for (const w of WEAPONS) { w.ammo = w.mag; w.reserve = w.max; }
  gun.state = 'idle'; gun.t = 0; gun.cool = 0; gun.kick = 0; gun.camKick = 0;
  enemies.forEach(resetEnemy); refreshEnemyParts(); kills = 0; zoneMsg = 0;
  for (const e of enemies) { e.g.position.set(e.x, 0, e.z); e.g.rotation.y = e.yaw; }
  say('TRY AGAIN', 2.5);
}

// ------------------------------------------------------------------ lights
worldL.uAmbient.value.set(0.2, 0.235, 0.36);
worldL.uSunDir.value.set(-0.266, 0.469, -0.842).normalize();
worldL.uSunCol.value.set(0.5, 0.56, 0.8);
gunL.uSunDir.value.set(-0.5, 0.8, 0.35).normalize();

// ------------------------------------------------------------------ decals + particles
const decals = []; let decalI = 0;
for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), M.hole); m.visible = false; scene.add(m); decals.push(m); }
const parts = []; let partI = 0;
for (let i = 0; i < 48; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.07), M.dust); m.visible = false; scene.add(m); parts.push({ m, v: new V3(), life: 0 }); }
function spawnParts(p, n, wood, count = 7) {
  for (let i = 0; i < count; i++) {
    const q = parts[partI++ % parts.length];
    q.m.material = wood === true ? M.chip : wood || M.dust; q.m.visible = true; q.m.position.copy(p);
    q.v.set((Math.random() - 0.5) * 2.4, Math.random() * 2.6, (Math.random() - 0.5) * 2.4).addScaledVector(n, 2.2);
    q.life = 0.35 + Math.random() * 0.35;
    q.m.scale.setScalar(0.6 + Math.random() * 1.2);
  }
}

// ------------------------------------------------------------------ weapons (Kar98k + MP40)
const G = {};
const WEAPONS = [
  { id: 'k98', name: 'KAR 98K', mag: 5, ammo: 5, reserve: 45, max: 45, dmg: 140, auto: false, fov: 36, hip: [0.15, -0.165, -0.40], hipYaw: 0.075, adsY: -0.0605, adsZ: -0.36, kz: 0.07, kr: 0.1 },
  { id: 'mp40', name: 'MP 40', mag: 32, ammo: 32, reserve: 128, max: 128, dmg: 34, auto: true, fov: 47, hip: [0.15, -0.135, -0.41], hipYaw: 0.21, adsY: -0.0555, adsZ: -0.36, kz: 0.03, kr: 0.03 },
];
// profile helpers: side outlines are given as [forward, up] in metres and extruded sideways with a small bevel,
// which gives rounded silhouettes instead of stacked boxes
function uvScale(g, s) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * s, uv.getY(i) * s); return g; }
function profGeo(pts, thick, bevel = 0.004, fwd = -1) {
  const s = new THREE.Shape(); pts.forEach((p, i) => (i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])));
  const d = Math.max(0.001, thick - 2 * bevel);
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 4 });
  g.translate(0, 0, -d / 2); g.rotateY(fwd < 0 ? Math.PI / 2 : -Math.PI / 2);
  return uvScale(g, 7);
}
// baked Blender models (src/models/*.json, made by the bake step): base64 Float32 positions, normals and uvs per material key.
// They are already in metres with the muzzle along -Z, so they can be added as they are.
function bakedGeo(m) {
  if (m.geo) return m.geo;   // decoded once, shared by every mesh that uses it
  const f32 = s => { const b = atob(s), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return new Float32Array(a.buffer); };
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(f32(m.pos), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(f32(m.nrm), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(f32(m.uv), 2));
  m.geo = g;
  return g;
}
// adds each baked mesh under parent, with the material that matches its key; returns the meshes
function addBaked(data, parent, mats) {
  return data.meshes.map(m => { const mesh = new THREE.Mesh(bakedGeo(m), mats[m.mat]); parent.add(mesh); return mesh; });
}
function buildGuns() {
  const o = { lights: gunL, fog: false, snap: false, affine: 0 };
  const od = { ...o, side: THREE.DoubleSide, emis: 0.35 };  // lift the dark steel so shadowed faces never go black  // MP40 parts are thin open shells, so draw both faces
  const wood = mat(T.gunwood, o), metal = mat(T.gunmetal, od), skin = mat(T.skin, o), dark = mat(T.gunmetal, { ...od, tint: [0.8, 0.8, 0.85] });
  const fm = mat(T.flash, { ...o, additive: true, emis: 1 });
  const add = (g, m, parent, x = 0, y = 0, z = 0) => { const b = new THREE.Mesh(g, m); b.position.set(x, y, z); parent.add(b); return b; };
  const prof = (pts, thick, m, parent, bevel) => add(profGeo(pts, thick, bevel), m, parent);
  // tube along the barrel axis from forward distance f0 to f1
  const tube = (r, f0, f1, y, m, parent, sides = 10, r1 = r) => { const g = new THREE.CylinderGeometry(r1, r, Math.abs(f1 - f0), sides); g.rotateX(-Math.PI / 2); uvScale(g, 2); return add(g, m, parent, 0, y, -(f0 + f1) / 2); };
  const cross = (r, len, x, y, f, m, parent, sides = 8) => { const g = new THREE.CylinderGeometry(r, r, len, sides); g.rotateZ(Math.PI / 2); return add(g, m, parent, x, y, -f); };
  const box = (w, h, d, x, y, f, m, parent) => add(new THREE.BoxGeometry(w, h, d), m, parent, x, y, -f);
  const ball = (r, x, y, f, m, parent, sx = 1, sy = 1, sz = 1) => { const g = new THREE.SphereGeometry(r, 8, 6); g.scale(sx, sy, sz); return add(g, m, parent, x, y, -f); };
  // bare forearm + fist. hand at (hx,hy,f), elbow at (ex,ey,ef)
  const arm = (root, hx, hy, hf, ex, ey, ef, wide = 1) => {
    const g = new THREE.Group(); root.add(g);
    ball(0.034, hx, hy, hf, skin, g, 1.0 * wide, 0.9, 1.25);
    ball(0.015, hx + 0.026 * wide, hy + 0.018, hf + 0.012, skin, g, 1, 1, 1.6);
    const A = new V3(hx, hy - 0.006, -hf + 0.03), B = new V3(ex, ey, -ef), L = A.distanceTo(B);
    const c = new THREE.Mesh(uvScale(new THREE.CylinderGeometry(0.047, 0.029, L, 9), 2), skin);
    c.position.copy(A).add(B).multiplyScalar(0.5); c.quaternion.setFromUnitVectors(new V3(0, 1, 0), B.clone().sub(A).normalize());
    g.add(c); return g;
  };
  const flashes = (root, z) => {
    const f1 = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), fm); f1.position.set(0, 0.026, z); f1.visible = false; root.add(f1);
    const f2 = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.12), fm); f2.position.set(0, 0.026, z - 0.06); f2.rotation.y = Math.PI / 2; f2.visible = false; root.add(f2);
    return [f1, f2];
  };
  const ring = (r, t, y, f, m, parent) => add(new THREE.TorusGeometry(r, t, 5, 10), m, parent, 0, y, -f);

  // ---- Karabiner 98k: body is the baked model; bolt, clip, hands and muzzle flash stay procedural so the reload still animates
  {
    const root = new THREE.Group(); gunScene.add(root);
    addBaked(K98_MODEL, root, { wood, metal });
    const bolt = new THREE.Group(); bolt.position.set(0, 0.03, 0.075); root.add(bolt);
    tube(0.0095, -0.05, 0.05, 0, metal, bolt, 8);
    tube(0.011, -0.075, -0.045, 0, dark, bolt, 8);
    cross(0.0045, 0.045, 0.028, -0.008, 0, metal, bolt, 6).rotation.z = -0.35;
    ball(0.011, 0.052, -0.017, 0, metal, bolt);
    const left = arm(root, -0.004, -0.052, 0.29, -0.27, -0.33, -0.08, 1.15);
    const right = arm(root, 0.006, -0.058, -0.15, 0.14, -0.28, -0.52);
    const [flash, flash2] = flashes(root, -0.74);
    // stripper clip: five cartridges standing in a steel strip, pressed down into the receiver during reload
    const clip = new THREE.Group(); root.add(clip); clip.visible = false;
    const brass = mat(T.brass, o);
    box(0.011, 0.003, 0.094, 0, 0, 0.01, metal, clip);
    for (let i = 0; i < 5; i++) add(new THREE.CylinderGeometry(0.0055, 0.0055, 0.03, 8), brass, clip, 0, -0.016, -(0.01 + (i - 2) * 0.0185));
    WEAPONS[0].m = { root, bolt, left, right, flash, flash2, clip };
  }

  // ---- MP40: body is the baked model; magazine (reloads), bolt, hands and muzzle flash stay procedural
  {
    const root = new THREE.Group(); gunScene.add(root); root.visible = false;
    addBaked(MP40_MODEL, root, { metal });
    const mag = new THREE.Group(); root.add(mag);
    prof([[0.141, -0.05], [0.169, -0.05], [0.173, -0.24], [0.146, -0.24]], 0.023, dark, mag, 0.003);
    const magNew = mag.clone(); root.add(magNew); magNew.visible = false;   // fresh magazine that is inserted during reload
    const bolt = new THREE.Group(); bolt.position.set(-0.026, 0.024, -0.11); root.add(bolt);
    cross(0.0048, 0.032, 0, 0, 0, metal, bolt, 6); ball(0.007, -0.016, 0, 0, metal, bolt);
    const left = arm(root, -0.002, -0.128, 0.156, -0.25, -0.35, -0.12, 1.1);
    const right = arm(root, 0.004, -0.074, -0.066, 0.15, -0.28, -0.45);
    const [flash, flash2] = flashes(root, -0.47);
    WEAPONS[1].m = { root, bolt, mag, magNew, left, right, flash, flash2 };
  }
  G.brass = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.05), mat(T.brass, o)); G.brass.visible = false; gunScene.add(G.brass);
  G.brassV = new V3(); G.brassLife = 0;
}
buildGuns();
const gun = {
  w: 0, next: 0, swapped: false, state: 'idle', t: 0, cool: 0, heat: 0, boltT: 0, ads: 0, kick: 0, flash: 0, swayX: 0, swayY: 0, camKick: 0,
  get ammo() { return WEAPONS[this.w].ammo; }, set ammo(v) { WEAPONS[this.w].ammo = v; },
  get reserve() { return WEAPONS[this.w].reserve; }, set reserve(v) { WEAPONS[this.w].reserve = v; },
};
const curW = () => WEAPONS[gun.w];

// ------------------------------------------------------------------ audio
let AC = null, master, echoIn, noiseBuf;
function initAudio() {
  if (AC) return;
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = 0.85; master.connect(AC.destination);
    noiseBuf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const delay = AC.createDelay(1); delay.delayTime.value = 0.21;
    const fb = AC.createGain(); fb.gain.value = 0.42;
    const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100;
    echoIn = AC.createGain(); echoIn.connect(delay); delay.connect(lp); lp.connect(fb); fb.connect(delay); lp.connect(master);
    // wind
    const w = AC.createBufferSource(); w.buffer = noiseBuf; w.loop = true;
    const wl = AC.createBiquadFilter(); wl.type = 'lowpass'; wl.frequency.value = 260;
    const wg = AC.createGain(); wg.gain.value = 0.16;
    const lfo = AC.createOscillator(); lfo.frequency.value = 0.13; const lg = AC.createGain(); lg.gain.value = 0.08;
    lfo.connect(lg); lg.connect(wg.gain); lfo.start();
    w.connect(wl); wl.connect(wg); wg.connect(master); w.start();
    startDrone();
  } catch (e) { AC = null; }
}
// sinister ambient drone: detuned low voices with a dissonant minor second, a slowly swelling filter,
// a distant drifting wail, a dark echo, and occasional low stings
function startDrone() {
  const t0 = AC.currentTime;
  const bus = AC.createGain(); bus.gain.setValueAtTime(0.0001, t0); bus.gain.exponentialRampToValueAtTime(0.12, t0 + 8);
  const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 4;
  bus.connect(lp); lp.connect(master);
  const swell = AC.createOscillator(); swell.frequency.value = 0.05; const swellG = AC.createGain(); swellG.gain.value = 180;
  swell.connect(swellG); swellG.connect(lp.frequency); swell.start(t0);
  // D1 + A1 + D2 with a detuned pair, plus Eb1 for the sinister minor second
  [[36.71, 'sawtooth', 0.5], [36.71 * 1.004, 'sawtooth', 0.4], [55.0, 'sawtooth', 0.28], [73.42, 'triangle', 0.22], [38.89, 'sine', 0.18]]
    .forEach(([f, type, g]) => {
      const o = AC.createOscillator(); o.type = type; o.frequency.value = f;
      const vg = AC.createGain(); vg.gain.value = g;
      const br = AC.createOscillator(); br.frequency.value = 0.03 + Math.random() * 0.05;   // slow breathing of each voice
      const bg = AC.createGain(); bg.gain.value = g * 0.4; br.connect(bg); bg.connect(vg.gain);
      o.connect(vg); vg.connect(bus); o.start(t0); br.start(t0);
    });
  // distant wail that drifts up and down
  const wail = AC.createOscillator(); wail.frequency.value = 466; const wailG = AC.createGain(); wailG.gain.value = 0.035;
  const wailLfo = AC.createOscillator(); wailLfo.frequency.value = 0.07; const wailLfoG = AC.createGain(); wailLfoG.gain.value = 9;
  wailLfo.connect(wailLfoG); wailLfoG.connect(wail.frequency); wail.connect(wailG); wailG.connect(bus); wail.start(t0); wailLfo.start(t0);
  // dark echo on the drone
  const dl = AC.createDelay(2); dl.delayTime.value = 0.62; const dfb = AC.createGain(); dfb.gain.value = 0.5;
  const dlp = AC.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 700;
  lp.connect(dl); dl.connect(dlp); dlp.connect(dfb); dfb.connect(dl); dlp.connect(master);
  // occasional low sting
  setInterval(() => {
    if (!AC || AC.state !== 'running' || Math.random() > 0.6) return;
    const notes = [36.71, 38.89, 29.14];
    const f = notes[(Math.random() * notes.length) | 0];
    sfxTone(f, f * 0.97, 4.5, 0.12, 'sine');
  }, 14000);
}
function sfxNoise(o) {
  if (!AC) return;
  const t = AC.currentTime + (o.delay || 0);
  const s = AC.createBufferSource(); s.buffer = noiseBuf; s.playbackRate.value = o.rate || 1;
  const f = AC.createBiquadFilter(); f.type = o.type || 'lowpass'; f.Q.value = o.q || 0.7;
  f.frequency.setValueAtTime(o.f0, t); if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);
  const g = AC.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.gain, t + (o.attack || 0.003)); g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
  s.connect(f); f.connect(g); g.connect(master); if (o.echo) { const e = AC.createGain(); e.gain.value = o.echo; g.connect(e); e.connect(echoIn); }
  s.start(t, Math.random()); s.stop(t + o.dur + 0.05);
}
function sfxTone(f0, f1, dur, gain, type = 'sine', delay = 0) {
  if (!AC) return;
  const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
const SFX = {
  shot() { sfxNoise({ f0: 5200, f1: 300, dur: 0.5, gain: 1.0, echo: 0.6 }); sfxNoise({ type: 'highpass', f0: 2500, dur: 0.07, gain: 0.5 }); sfxTone(170, 38, 0.24, 0.9); },
  click(d = 0, f = 2600) { sfxNoise({ type: 'bandpass', f0: f, q: 3, dur: 0.05, gain: 0.45, delay: d }); sfxTone(f * 0.4, f * 0.2, 0.03, 0.12, 'square', d); },
  step(alt) { sfxNoise({ f0: alt ? 420 : 340, f1: 120, dur: 0.11, gain: 0.26 }); sfxNoise({ type: 'bandpass', f0: 1800, q: 1, dur: 0.035, gain: 0.05 }); },
  wood() { sfxNoise({ type: 'bandpass', f0: 520, q: 2.5, dur: 0.14, gain: 0.7, echo: 0.2 }); sfxTone(240, 110, 0.1, 0.3, 'triangle'); },
  stone() { sfxNoise({ type: 'bandpass', f0: 2400, q: 2, dur: 0.09, gain: 0.35, echo: 0.2 }); if (Math.random() < 0.4) sfxTone(2600 + Math.random() * 900, 900, 0.3, 0.07, 'sine', 0.02); },
  pickup() { sfxTone(520, 520, 0.08, 0.2, 'square'); sfxTone(780, 780, 0.12, 0.2, 'square', 0.09); SFX.click(0.02, 1800); },
  rumble() { sfxNoise({ f0: 110, f1: 40, dur: 2.2, gain: 0.5, attack: 0.25 }); },
  // objective complete: a slow, low, dark sting instead of a bright fanfare
  done() {
    [[55, 0.5], [41.2, 0.4], [36.7, 0.35]].forEach(([f, g], i) => { sfxTone(f, f * 0.96, 3.2, g * 0.35, 'triangle', i * 0.22); sfxTone(f * 0.5, f * 0.48, 3.8, g * 0.6, 'sine', i * 0.22); });
    sfxNoise({ f0: 140, f1: 40, dur: 3.0, gain: 0.35, attack: 0.3 });
  },
  smg() { sfxNoise({ f0: 4200, f1: 480, dur: 0.17, gain: 0.72, echo: 0.3 }); sfxNoise({ type: 'highpass', f0: 3000, dur: 0.04, gain: 0.3 }); sfxTone(210, 70, 0.09, 0.5); },
  eshot(dist) { const g = clamp(1.1 / (1 + dist * 0.09), 0.12, 0.8); sfxNoise({ f0: 3600, f1: 260, dur: 0.4, gain: g, echo: 0.5 }); sfxTone(150, 40, 0.2, g * 0.7); },
  hit() { sfxNoise({ type: 'bandpass', f0: 700, q: 1.5, dur: 0.09, gain: 0.5 }); },
  hurt() { sfxNoise({ f0: 300, f1: 80, dur: 0.18, gain: 0.8 }); sfxTone(110, 50, 0.2, 0.5, 'triangle'); },
  whiz() { sfxTone(2400, 900, 0.12, 0.07, 'sawtooth'); },
  thud(dist) { sfxNoise({ f0: 220, f1: 60, dur: 0.22, gain: clamp(0.7 / (1 + dist * 0.08), 0.08, 0.5) }); },
};

// ------------------------------------------------------------------ player + input
const player = { x: 0, z: 17.2, y: 0, vy: 0, yaw: 0, pitch: 0, crouch: 0, bob: 0, move: 0, stepAlt: false, hp: 100, hurt: 0, lastHit: -99 };
const keys = {}; let mdx = 0, mdy = 0, fireHeld = false, firePressed = false, adsHeld = false, wantW = -1;
let state = 'title', time = 0, hits = 0, message = '', messageT = 0, cycleT = -1, skyFlash = 0, nextRumble = 6;
let deadT = 0, zoneMsg = 0, hintT = -1, hideGunT = false;
const say = (m, t = 3) => { message = m; messageT = t; };

addEventListener('keydown', e => {
  if (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
  if (e.repeat) return;
  keys[e.code] = true;
  if ((state === 'title' || state === 'dead') && (e.code === 'Enter' || e.code === 'Space')) start();
  else if (state === 'pause' && e.code === 'KeyQ') window.close();
  else if (state === 'pause' && e.code === 'Enter') start();
  else if (state === 'play' && e.code === 'KeyR') tryReload();
  else if (state === 'play' && e.code === 'Digit1') wantW = 0;
  else if (state === 'play' && e.code === 'Digit2') wantW = 1;
  else if (state === 'play' && e.code === 'KeyQ') wantW = 1 - gun.w;
  else if (state === 'play' && e.code === 'KeyP') { state = 'pause'; document.exitPointerLock && document.exitPointerLock(); }
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; fireHeld = adsHeld = false; });
addEventListener('mousemove', e => { if (document.pointerLockElement && state === 'play') { mdx += e.movementX; mdy += e.movementY; } });
addEventListener('mousedown', e => {
  if (state !== 'play') { start(); return; }
  if (!document.pointerLockElement && !TEST) { start(); return; }
  if (e.button === 0) { fireHeld = true; firePressed = true; }
  if (e.button === 2) adsHeld = true;
});
addEventListener('mouseup', e => { if (e.button === 0) fireHeld = false; if (e.button === 2) adsHeld = false; });
addEventListener('contextmenu', e => e.preventDefault());
addEventListener('wheel', () => { if (state === 'play') wantW = 1 - gun.w; }, { passive: true });
document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && state === 'play' && !TEST) state = 'pause'; });
function start() {
  initAudio(); if (AC && AC.state === 'suspended') AC.resume();
  if (state === 'dead') { if (deadT < 1.2) return; resetGame(); }
  if (state === 'title') { say('OBJECTIVE: KNOCK DOWN THE 6 PRACTICE TARGETS', 6); hintT = 7; }
  state = 'play';
  if (!TEST) { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ } }
}

function resolve(p, self) {
  const Rr = self ? 0.36 : 0.42;
  for (let it = 0; it < 3; it++) {
    for (const c of boxes) {
      const nx = clamp(p.x, c.x0, c.x1), nz = clamp(p.z, c.z0, c.z1);
      const dx = p.x - nx, dz = p.z - nz, d2 = dx * dx + dz * dz;
      if (d2 >= Rr * Rr) continue;
      if (d2 > 1e-8) { const d = Math.sqrt(d2); p.x = nx + dx / d * Rr; p.z = nz + dz / d * Rr; }
      else {
        const l = p.x - c.x0, r = c.x1 - p.x, t = p.z - c.z0, b = c.z1 - p.z, m = Math.min(l, r, t, b);
        if (m === l) p.x = c.x0 - Rr; else if (m === r) p.x = c.x1 + Rr; else if (m === t) p.z = c.z0 - Rr; else p.z = c.z1 + Rr;
      }
    }
    for (const c of circles) {
      const dx = p.x - c.cx, dz = p.z - c.cz, d = Math.hypot(dx, dz), rr = c.r + Rr;
      if (d < rr) { if (d < 1e-5) { p.x += rr; } else { p.x = c.cx + dx / d * rr; p.z = c.cz + dz / d * rr; } }
    }
    // other bodies: living soldiers, and the player when resolving a soldier
    for (const e of enemies) if (e.alive && e !== self) {
      const dx = p.x - e.x, dz = p.z - e.z, d = Math.hypot(dx, dz), rr = Rr + 0.3;
      if (d < rr && d > 1e-5) { p.x = e.x + dx / d * rr; p.z = e.z + dz / d * rr; }
    }
    if (self) {
      const dx = p.x - player.x, dz = p.z - player.z, d = Math.hypot(dx, dz), rr = Rr + 0.4;
      if (d < rr && d > 1e-5) { p.x = player.x + dx / d * rr; p.z = player.z + dz / d * rr; }
    }
  }
  p.x = clamp(p.x, -61.5, 19.5); p.z = clamp(p.z, -19.5, 19.6);
}

// ------------------------------------------------------------------ shooting
const ray = new THREE.Raycaster(); ray.far = 200;
const tmpN = new V3(), tmpP = new V3();
function fire() {
  const w = curW(), m = w.m;
  w.ammo--; gun.flash = w.auto ? 0.05 : 0.075;
  if (w.auto) {
    gun.cool = 0.115; gun.kick = Math.min(1, gun.kick + 0.55); gun.camKick = Math.max(gun.camKick, 0.5); gun.boltT = 0.1;
    player.pitch = Math.min(1.35, player.pitch + 0.0035 * (1 + gun.heat)); player.yaw += (Math.random() - 0.5) * 0.007;
    G.brass.visible = true; G.brassLife = 0.4; G.brass.scale.setScalar(0.4); G.brass.position.copy(m.root.position).add(tmpP.set(0.03, 0.04, -0.1)); G.brassV.set(0.9 + Math.random() * 0.5, 1.1, 0.1);
    SFX.smg();
  } else { gun.state = 'fire'; gun.t = 0; gun.kick = 1; gun.camKick = 1; SFX.shot(); }
  m.flash.rotation.z = Math.random() * 6.28; m.flash.scale.setScalar(0.8 + Math.random() * 0.5);
  const spread = w.auto ? lerp(0.024, 0.008, gun.ads) * (1 + gun.heat * 1.3) : 0.004 * (1 - gun.ads);
  if (w.auto) gun.heat = Math.min(1, gun.heat + 0.13);
  // gunfire near the second courtyard wakes everyone in it
  if (player.x < -21) for (const e of enemies) if (Math.hypot(e.x - player.x, e.z - player.z) < 45) alertEnemy(e, false);
  scene.updateMatrixWorld();
  ray.setFromCamera(new THREE.Vector2((Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread), camera);
  const list = ray.intersectObjects(shootables.concat(enemyParts), false);
  for (const h of list) {
    const ud = h.object.userData;
    if (ud.round && h.uv && Math.hypot(h.uv.x - 0.5, h.uv.y - 0.5) > 0.5) continue;
    tmpN.copy(h.face.normal).transformDirection(h.object.matrixWorld);
    if (tmpN.dot(ray.ray.direction) > 0) tmpN.negate();
    tmpP.copy(h.point).addScaledVector(tmpN, 0.03);
    if (ud.enemy) { spawnParts(tmpP, tmpN, M.puff, 5); hitEnemy(ud.enemy, ud.part, w.dmg); break; }
    spawnParts(tmpP, tmpN, ud.wood, w.auto ? 4 : 7);
    if (ud.target) {
      if (!ud.target.down) {
        ud.target.down = true; ud.target.v = -2.5; hits++;
        say(hits >= targets.length ? 'ALL TARGETS DOWN - OBJECTIVE COMPLETE' : 'TARGET DOWN  ' + hits + '/' + targets.length, 3);
        if (hits >= targets.length) { cycleT = 7; SFX.done(); }
      }
      SFX.wood();
    } else {
      const d = decals[decalI++ % decals.length];
      d.visible = true; d.position.copy(tmpP); d.lookAt(tmpP.x + tmpN.x, tmpP.y + tmpN.y, tmpP.z + tmpN.z); d.rotateZ(Math.random() * 6.28);
      (ud.wood ? SFX.wood : SFX.stone)();
    }
    break;
  }
}
function tryReload() {
  const w = curW();
  if (gun.state !== 'idle' || w.ammo >= w.mag || w.reserve <= 0) return;
  gun.state = 'reload'; gun.t = 0;
}

// ------------------------------------------------------------------ update
const fwd = new V3();
function boltCycle(u) { // u 0..1 -> [rotation 0..1, pulled back 0..1]
  return [sstep(0, 0.22, u) - sstep(0.78, 1, u), sstep(0.22, 0.45, u) - sstep(0.55, 0.78, u)];
}
function update(dt) {
  time += dt;
  // look
  const sens = 0.0023 * lerp(1, 0.55, gun.ads);
  player.yaw -= mdx * sens; player.pitch = clamp(player.pitch - mdy * sens, -1.35, 1.35);
  const turn = (keys.ArrowLeft ? 1 : 0) - (keys.ArrowRight ? 1 : 0);
  player.yaw += turn * 1.9 * dt;
  gun.swayX = lerp(gun.swayX, clamp(mdx * 0.0006 + turn * -0.012, -0.03, 0.03), 1 - Math.exp(-dt * 9));
  gun.swayY = lerp(gun.swayY, clamp(mdy * 0.0006, -0.03, 0.03), 1 - Math.exp(-dt * 9));
  mdx = mdy = 0;
  // move
  let mx = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0), mz = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
  const ml = Math.hypot(mx, mz); if (ml > 0) { mx /= ml; mz /= ml; }
  const crouching = keys.KeyC || keys.ControlLeft;
  player.crouch = lerp(player.crouch, crouching ? 1 : 0, 1 - Math.exp(-dt * 10));
  const sprint = (keys.ShiftLeft || keys.ShiftRight) && mz > 0 && !crouching && gun.ads < 0.3;
  const speed = (sprint ? 5.4 : 3.3) * lerp(1, 0.5, player.crouch) * lerp(1, 0.6, gun.ads);
  const s = Math.sin(player.yaw), c = Math.cos(player.yaw);
  const ox = player.x, oz = player.z;
  player.x += (-s * mz + c * mx) * speed * dt; player.z += (-c * mz - s * mx) * speed * dt;
  resolve(player);
  const moved = Math.hypot(player.x - ox, player.z - oz) / Math.max(dt, 1e-4);
  player.move = lerp(player.move, clamp(moved / 3.3, 0, 1.6), 1 - Math.exp(-dt * 10));
  if (keys.Space && player.y === 0) { player.vy = 4.2; }
  player.vy -= 12 * dt; player.y = Math.max(0, player.y + player.vy * dt); if (player.y === 0) player.vy = 0;
  const pb = player.bob; player.bob += moved * dt * 1.75;
  if (player.y === 0 && moved > 0.5 && Math.floor(pb / Math.PI) !== Math.floor(player.bob / Math.PI)) { player.stepAlt = !player.stepAlt; SFX.step(player.stepAlt); }

  // weapon state
  const w = curW();
  gun.t += dt; gun.cool -= dt; gun.heat = Math.max(0, gun.heat - dt * 0.9); gun.boltT = Math.max(0, gun.boltT - dt);
  if (wantW >= 0) {
    if (gun.state === 'idle' && wantW !== gun.w) { gun.state = 'switch'; gun.t = 0; gun.next = wantW; gun.swapped = false; SFX.click(0, 1200); wantW = -1; }
    else if (gun.state !== 'fire') wantW = -1;
  }
  const want = adsHeld && gun.state !== 'reload' && gun.state !== 'switch' && !sprint;
  gun.ads = lerp(gun.ads, want ? 1 : 0, 1 - Math.exp(-dt * 12));
  if ((firePressed || (w.auto && fireHeld)) && gun.state === 'idle' && gun.cool <= 0) {
    if (w.ammo > 0) fire();
    else if (w.reserve > 0) tryReload();
    else if (firePressed) { SFX.click(0, 3200); say('OUT OF AMMO - FIND AN AMMO CRATE', 2.5); }
  }
  firePressed = false;
  let rot = 0, back = 0, cyc = 0, low = 0, mDrop = 0, mRise = 0, mSwap = false, clipOn = false, clipY = 0, press = 0;
  if (gun.state === 'switch') {
    const t = gun.t;
    low = t < 0.26 ? sstep(0, 0.24, t) : 1 - sstep(0.28, 0.52, t);
    if (!gun.swapped && t >= 0.26) { gun.swapped = true; gun.w = gun.next; WEAPONS.forEach((x, i) => { x.m.root.visible = i === gun.w; }); SFX.click(0, 1900); }
    if (t > 0.52) gun.state = 'idle';
  } else if (!w.auto) {
    if (gun.state === 'fire') {
      const u = clamp((gun.t - 0.3) / 0.85, 0, 1); [rot, back] = boltCycle(u); cyc = Math.sin(u * Math.PI);
      const p = gun.t - dt;
      if (p < 0.32 && gun.t >= 0.32) SFX.click(0, 2400);
      if (p < 0.5 && gun.t >= 0.5) { SFX.click(0, 1700); G.brass.visible = true; G.brassLife = 0.5; G.brass.scale.setScalar(1); G.brass.position.copy(w.m.root.position).add(new V3(0.03, 0.06, 0.05)); G.brassV.set(0.9 + Math.random() * 0.4, 1.3, 0.2); }
      if (p < 0.82 && gun.t >= 0.82) SFX.click(0, 2000);
      if (p < 1.0 && gun.t >= 1.0) SFX.click(0, 2900);
      if (gun.t > 1.2) { gun.state = 'idle'; if (w.ammo === 0 && w.reserve > 0) tryReload(); }
    } else if (gun.state === 'reload') {
      const t = gun.t, p = t - dt;
      low = sstep(0, 0.35, t) - sstep(2.3, 2.65, t);
      rot = sstep(0.35, 0.5, t) - sstep(1.95, 2.1, t); back = sstep(0.5, 0.7, t) - sstep(1.75, 1.95, t);
      if (p < 0.4 && t >= 0.4) SFX.click(0, 2400);
      if (p < 0.6 && t >= 0.6) SFX.click(0, 1700);
      if (p < 1.05 && t >= 1.05) SFX.click(0, 3300);
      if (p < 1.35 && t >= 1.35) { SFX.click(0, 1300); SFX.click(0.06, 1500); const n = Math.min(w.mag - w.ammo, w.reserve); w.ammo += n; w.reserve -= n; }
      if (p < 1.85 && t >= 1.85) SFX.click(0, 2000);
      if (p < 2.05 && t >= 2.05) SFX.click(0, 2900);
      // stripper clip: hand brings it down onto the open receiver, rounds drop in, clip is discarded
      clipOn = t > 0.7 && t < 1.38;
      clipY = 0.13 - sstep(0.75, 1.05, t) * 0.083;
      press = sstep(0.75, 1.05, t) - sstep(1.2, 1.38, t);
      if (p < 0.78 && t >= 0.78) SFX.click(0, 1400);                 // clip seated
      if (t > 2.65) gun.state = 'idle';
    }
  } else {
    back = gun.boltT / 0.1;
    if (gun.state === 'reload') {
      const t = gun.t, p = t - dt;
      low = sstep(0, 0.3, t) - sstep(1.95, 2.3, t);
      // magazine swap: old magazine drops out, the fresh one rises into the well, then the bolt is charged
      mDrop = sstep(0.35, 0.8, t); mRise = sstep(0.9, 1.3, t); mSwap = t >= 0.9 && t < 1.35;
      if (p < 0.42 && t >= 0.42) SFX.click(0, 1500);
      if (p < 1.28 && t >= 1.28) { SFX.click(0, 1300); SFX.click(0.05, 1700); const n = Math.min(w.mag - w.ammo, w.reserve); w.ammo += n; w.reserve -= n; }
      if (p < 1.7 && t >= 1.7) { SFX.click(0, 2300); gun.boltT = 0.1; }
      if (t > 2.3) gun.state = 'idle';
    } else if (gun.state === 'idle' && w.ammo === 0 && w.reserve > 0 && gun.cool <= -0.25) tryReload();
  }
  const cw = curW(), gm = cw.m;
  gun.kick = Math.max(0, gun.kick - dt * (cw.auto ? 9 : 6.5)); gun.camKick = Math.max(0, gun.camKick - dt * 5); gun.flash -= dt;
  const k = gun.kick * gun.kick, a = gun.ads, mv = player.move * (1 - a * 0.85);
  const bx = Math.cos(player.bob) * 0.009 * mv, by = -Math.abs(Math.sin(player.bob)) * 0.01 * mv;
  const breathe = Math.sin(time * 1.4) * 0.0025 * (1 - a * 0.6);
  gm.root.position.set(
    lerp(cw.hip[0], 0, a) + bx + gun.swayX * (1 - a * 0.7) + cyc * 0.01,
    lerp(cw.hip[1], cw.adsY, a) + by + breathe + gun.swayY * (1 - a * 0.7) - cyc * 0.018 - low * 0.05 - (sprint ? 0.03 : 0) * (1 - a),
    lerp(cw.hip[2], cw.adsZ, a) + k * cw.kz);
  gm.root.rotation.set(lerp(0.035, 0, a) + k * cw.kr - low * 0.25 + cyc * 0.03, lerp(cw.hipYaw, 0, a) + gun.swayX * 1.5 + low * 0.2, -cyc * 0.22 + low * 0.3 - gun.swayX * 2);
  if (!cw.auto) {
    gm.bolt.rotation.z = rot * 1.45; gm.bolt.position.z = 0.075 + back * 0.085;
    const hw = gun.state === 'fire' ? sstep(0.18, 0.32, gun.t) - sstep(1.02, 1.18, gun.t) : 0;
    gm.right.position.set(0.045 * hw, (0.07 + rot * 0.035) * hw, (-0.06 + back * 0.085) * hw);
    gm.right.position.y -= press * 0.035;                             // right hand presses the clip in
    gm.clip.visible = clipOn; gm.clip.position.y = clipY;
  } else {
    gm.bolt.position.z = -0.11 + back * 0.05;
    gm.mag.position.y = -mDrop * 0.35; gm.mag.rotation.x = mDrop * 0.3; gm.mag.visible = !mSwap;
    gm.magNew.visible = mSwap; gm.magNew.position.y = -0.35 + mRise * 0.35;
    gm.left.position.set(0, -mDrop * 0.16, mDrop * 0.03);
  }
  gm.flash.visible = gm.flash2.visible = gun.flash > 0;
  if (G.brassLife > 0) { G.brassLife -= dt; G.brassV.y -= 9 * dt; G.brass.position.addScaledVector(G.brassV, dt); G.brass.rotation.x += dt * 20; G.brass.rotation.z += dt * 13; if (G.brassLife <= 0) G.brass.visible = false; }

  // ammo crates
  for (const [ax, az] of AMMO_SPOTS) if (Math.hypot(player.x - ax, player.z - az) < 1.9 && WEAPONS.some(x => x.reserve < x.max)) {
    WEAPONS.forEach(x => { x.reserve = x.max; }); SFX.pickup(); say('PICKED UP AMMUNITION', 2.5);
  }
  // health: slow recovery once nobody has hit you for a while
  player.hurt = Math.max(0, player.hurt - dt * 2.2);
  if (player.hp < 100 && time - player.lastHit > 6) player.hp = Math.min(100, player.hp + 7 * dt);
  // hints as you move between the yards
  if (hintT > 0) { hintT -= dt; if (hintT <= 0 && messageT <= 0) say('THE WEST ARCH LEADS TO THE ENEMY YARD', 5); }
  if (zoneMsg < 1 && player.x < -21.5) { zoneMsg = 1; say('ENEMY YARD AHEAD - 1 OR 2 SWITCHES WEAPON', 4); }
  if (zoneMsg < 2 && player.x < -32.5 && kills < enemies.length) { zoneMsg = 2; say('CLEAR THE YARD - ' + (enemies.length - kills) + ' ENEMY SOLDIERS', 4); }
  // objective cycle
  if (cycleT > 0) { cycleT -= dt; if (cycleT <= 0) { hits = 0; targets.forEach(t => { t.down = false; }); say('TARGETS RESET', 2.5); } }

  // camera
  const eye = lerp(1.68, 1.05, player.crouch) + player.y + Math.abs(Math.sin(player.bob)) * 0.045 * player.move;
  camera.position.set(player.x, eye, player.z);
  camera.rotation.set(player.pitch + gun.camKick * gun.camKick * 0.035, player.yaw, Math.cos(player.bob) * 0.004 * player.move);
  camera.fov = lerp(62, cw.fov, a);
}
function updateWorld(dt) {
  updateEnemies(dt);
  // targets
  for (const t of targets) {
    if (t.down) { t.v -= 16 * dt; t.a += t.v * dt; if (t.a < -1.45) { t.a = -1.45; t.v = t.v < -1.5 ? -t.v * 0.25 : 0; } }
    else { t.a = lerp(t.a, 0, 1 - Math.exp(-dt * 6)); t.v = 0; }
    t.tilt.rotation.x = t.a;
  }
  // particles
  for (const q of parts) if (q.life > 0) {
    q.life -= dt; q.v.y -= 9 * dt; q.m.position.addScaledVector(q.v, dt); q.m.quaternion.copy(camera.quaternion);
    if (q.life <= 0 || q.m.position.y < 0.02) { q.m.visible = false; q.life = 0; }
  }
  for (const g of glows) g.quaternion.copy(camera.quaternion);
  // lights: flicker + muzzle flash
  lightDefs.forEach((l, i) => { l.f = 1 + Math.sin(time * 11 + i * 7) * 0.05 + Math.sin(time * 23.7 + i * 3) * 0.04; l.d = l.pos.distanceTo(camera.position); });
  const near = lightDefs.slice().sort((p, q) => p.d - q.d), d5 = near[4] ? near[4].d : 1e9;
  for (let i = 0; i < 4; i++) {
    const l = near[i];
    if (!l) { worldL.uLCol.value[i].set(0, 0, 0); continue; }
    const f = l.f * clamp((d5 - l.d) / 5, 0, 1);
    worldL.uLPos.value[i].copy(l.pos); worldL.uLCol.value[i].set(l.col[0] * f, l.col[1] * f, l.col[2] * f);
  }
  const fl = gun.flash > 0 ? 1 : 0;
  camera.getWorldDirection(fwd);
  worldL.uLPos.value[4].copy(camera.position).addScaledVector(fwd, 1.2);
  worldL.uLCol.value[4].set(2.6 * fl, 2.0 * fl, 1.1 * fl);
  // gun lighting from environment
  let er = worldL.uAmbient.value.x * 1.5, eg = worldL.uAmbient.value.y * 1.5, eb = worldL.uAmbient.value.z * 1.5;
  lightDefs.forEach(l => { const at = Math.pow(Math.max(1 - l.d / 16, 0), 2) * 0.55 * l.f; er += l.col[0] * at; eg += l.col[1] * at; eb += l.col[2] * at; });
  { const lum = (er + eg + eb) / 3; er = lerp(er, lum, 0.55) + 0.06; eg = lerp(eg, lum, 0.55) + 0.06; eb = lerp(eb, lum, 0.55) + 0.06; }
  gunL.uAmbient.value.set(er * 0.75 + fl * 1.2, eg * 0.75 + fl * 0.9, eb * 0.75 + fl * 0.5);
  gunL.uSunCol.value.set(er * 0.9, eg * 0.9, eb * 0.9);
  // water + sky
  M.water.uniforms.uUvOff.value.set(time * 0.03, Math.sin(time * 0.5) * 0.05);
  nextRumble -= dt;
  if (nextRumble <= 0) { nextRumble = 9 + Math.random() * 14; skyFlash = 1; if (state === 'play') SFX.rumble(); }
  skyFlash = Math.max(0, skyFlash - dt * 2.2);
  const sf = 1 + skyFlash * skyFlash * (0.5 + 0.5 * Math.sin(time * 40)) * 0.9;
  M.sky.uniforms.uTint.value.set(sf, sf * 0.94, sf * 0.85);
  sky.position.copy(camera.position);
}

// ------------------------------------------------------------------ HUD
function txt(str, x, y, s = 1, col = '#e8e0c0', shadow = '#000') {
  if (shadow) { hud.fillStyle = shadow; drawText((px, py, sz) => hud.fillRect(px + s, py + s, sz, sz), str, x, y, s); }
  hud.fillStyle = col; drawText((px, py, sz) => hud.fillRect(px, py, sz, sz), str, x, y, s);
}
const ctxt = (str, y, s, col, sh) => txt(str, Math.round((lowW - textW(str, s)) / 2), y, s, col, sh);
function drawHUD() {
  hud.clearRect(0, 0, lowW, LOW_H);
  const W = lowW, H = LOW_H;
  if (state === 'title') {
    hud.fillStyle = 'rgba(0,0,0,0.5)'; hud.fillRect(0, 0, W, 30); hud.fillRect(0, H - 78, W, 78);
    ctxt('COURTYARD 1944', 44, 3, '#d8c890', '#201808');
    ctxt('MISSION ONE - THE TWO COURTYARDS', 72, 1, '#b0a888');
    if (Math.floor(time * 2) % 2 === 0) ctxt('CLICK OR PRESS ENTER', 118, 2, '#f0e8d0');
    const lines = ['WASD MOVE - MOUSE LOOK - SHIFT RUN', 'C CROUCH - SPACE JUMP - R RELOAD', 'LEFT CLICK FIRE - RIGHT CLICK AIM', '1 / 2 / Q / WHEEL - SWITCH WEAPON', 'F11 FULLSCREEN - ESC PAUSE'];
    lines.forEach((l, i) => ctxt(l, H - 70 + i * 12, 1, '#c8c0a0'));
    ctxt('ARMED WITH: KARABINER 98K AND MP 40', 10, 1, '#908868');
    return;
  }
  // crosshair
  const cw = curW(), dead = state === 'dead';
  if (player.hurt > 0 && !dead) { hud.fillStyle = 'rgba(170,10,0,' + (player.hurt * 0.4).toFixed(3) + ')'; hud.fillRect(0, 0, W, H); }
  if (gun.ads < 0.5 && gun.state !== 'reload' && gun.state !== 'switch' && !dead) {
    const cx = W >> 1, cy = H >> 1, g = 3 + Math.round(player.move * 2 + gun.kick * 4);
    hud.fillStyle = '#e8e0c0';
    hud.fillRect(cx - g - 3, cy, 3, 1); hud.fillRect(cx + g + 1, cy, 3, 1); hud.fillRect(cx, cy - g - 3, 1, 3); hud.fillRect(cx, cy + g + 1, 1, 3);
  }
  // compass
  const ox = 24, oy = H - 24;
  hud.fillStyle = 'rgba(0,0,0,0.45)'; hud.beginPath(); hud.arc(ox + 0.5, oy + 0.5, 16, 0, 6.3); hud.fill();
  hud.fillStyle = '#a89868';
  for (let i = 0; i < 48; i++) { const a = i / 48 * 6.283; hud.fillRect(Math.round(ox + Math.cos(a) * 16), Math.round(oy + Math.sin(a) * 16), 1, 1); }
  const nx = Math.sin(player.yaw), ny = -Math.cos(player.yaw);
  hud.fillStyle = '#d04030'; for (let i = 0; i <= 11; i++) hud.fillRect(Math.round(ox + nx * i), Math.round(oy + ny * i), 1, 1);
  hud.fillStyle = '#c8c0a0'; for (let i = 1; i <= 9; i++) hud.fillRect(Math.round(ox - nx * i), Math.round(oy - ny * i), 1, 1);
  
  // health
  txt('HEALTH', 48, H - 32, 1, '#a89868');
  hud.fillStyle = '#000'; hud.fillRect(48, H - 21, 54, 8);
  hud.fillStyle = '#403828'; hud.fillRect(49, H - 20, 52, 6);
  hud.fillStyle = player.hp > 50 ? '#7a9a48' : player.hp > 25 ? '#c8a048' : '#d04030'; hud.fillRect(49, H - 20, Math.round(52 * player.hp / 100), 6);
  // ammo
  if (!cw.auto) {
    for (let i = 0; i < 5; i++) {
      const bx = W - 68 + i * 6, by = H - 24;
      hud.fillStyle = '#000'; hud.fillRect(bx + 1, by + 1, 4, 13);
      if (i < cw.ammo) { hud.fillStyle = '#c8a048'; hud.fillRect(bx, by + 4, 4, 9); hud.fillStyle = '#b06830'; hud.fillRect(bx + 1, by, 2, 4); hud.fillRect(bx, by + 2, 4, 2); }
      else { hud.fillStyle = '#403828'; hud.fillRect(bx, by + 4, 4, 9); }
    }
    txt(String(cw.reserve), W - 32, H - 24, 2, cw.reserve ? '#e8e0c0' : '#d04030');
  } else {
    txt(String(cw.ammo), W - 68, H - 24, 2, cw.ammo ? '#e8e0c0' : '#d04030');
    txt('/' + cw.reserve, W - 40, H - 17, 1, cw.reserve ? '#c8c0a0' : '#d04030');
  }
  txt(cw.name, W - 68, H - 36, 1, '#a89868');
  txt('TARGETS ' + hits + '/' + targets.length, 8, 8, 1, '#c8c0a0');
  txt('ENEMIES ' + kills + '/' + enemies.length, 8, 19, 1, kills >= enemies.length ? '#7a9a48' : '#c8c0a0');
  if (gun.state === 'reload' && !dead) ctxt('RELOADING', H / 2 + 24, 1, '#c8c0a0');
  if (messageT > 0 && !dead) ctxt(message, 36, textW(message, 2) < W - 24 ? 2 : 1, '#f0e8d0');
  if (dead) {
    hud.fillStyle = 'rgba(90,0,0,' + clamp(deadT * 0.5, 0, 0.55).toFixed(3) + ')'; hud.fillRect(0, 0, W, H);
    ctxt('YOU WERE KILLED', 84, 3, '#e8d8b0', '#200808');
    if (deadT > 1.2 && Math.floor(time * 2) % 2 === 0) ctxt('CLICK TO TRY AGAIN', 128, 2, '#f0e8d0');
  }
  if (state === 'pause') {
    hud.fillStyle = 'rgba(0,0,10,0.6)'; hud.fillRect(0, 0, W, H);
    ctxt('PAUSED', 80, 3, '#d8c890', '#201808');
    ctxt('CLICK TO RESUME', 124, 2, '#f0e8d0');
    ctxt('Q - QUIT TO DESKTOP', 150, 1, '#c8c0a0');
  }
}

// ------------------------------------------------------------------ main loop
function resize() {
  const asp = clamp(innerWidth / Math.max(1, innerHeight), 1, 2.4);
  lowW = Math.round(LOW_H * asp / 2) * 2;
  const pr = Math.min(window.devicePixelRatio || 1, 2), rh = Math.min(Math.round(innerHeight * pr), 1200);
  renderer.setSize(Math.max(2, Math.round(rh * innerWidth / Math.max(1, innerHeight))), Math.max(2, rh), false);
  hudCanvas.width = lowW; hudCanvas.height = LOW_H; hud.imageSmoothingEnabled = false;
  camera.aspect = gunCam.aspect = lowW / LOW_H; gunCam.updateProjectionMatrix();
  worldL.uSnap.value.set(lowW, LOW_H); gunL.uSnap.value.set(lowW, LOW_H);
}
addEventListener('resize', resize); resize();

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (state === 'play') update(dt);
  else if (state === 'title') {
    time += dt;
    const a = time * 0.09 + 1.2;
    camera.position.set(Math.sin(a) * 15, 3.4 + Math.sin(time * 0.2) * 0.6, -3 + Math.cos(a) * 15);
    camera.lookAt(0, 2.2, -3); camera.fov = 62;
  }
  else if (state === 'dead') {
    time += dt; deadT += dt;
    const k = 1 - Math.exp(-dt * 4);
    camera.position.y = lerp(camera.position.y, 0.32, k); camera.rotation.z = lerp(camera.rotation.z, 0.55, k); camera.rotation.x = lerp(camera.rotation.x, 0.15, k);
  }
  if (state !== 'pause') updateWorld(dt);
  if (messageT > 0 && state === 'play') messageT -= dt;
  camera.updateProjectionMatrix();
  renderer.clear();
  renderer.render(scene, camera);
  if (state !== 'title' && state !== 'dead' && !hideGunT) { renderer.clearDepth(); renderer.render(gunScene, gunCam); }
  drawHUD();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

if (TEST) window.__g = {
  scene, gunScene,
  player, gun, keys, start, enemies, WEAPONS, fire: () => { firePressed = true; }, hold: v => { fireHeld = v; }, setAds: v => { adsHeld = v; },
  reload: tryReload, hideGun: v => { hideGunT = v; }, weapon: i => { wantW = i; }, hurt: hurtPlayer, get state() { return state; }, get kills() { return kills; },
};
