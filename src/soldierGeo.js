// Geometry builders for the enemy soldiers: lofted torso/limbs, boots, hands, head, helmet, peaked cap.
// Everything is built once and shared by all soldiers. Soldiers face +z; their left hand is +x.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

// ---- helpers
export function xf(geo, { p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1] } = {}) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  const m = new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...s));
  g.applyMatrix4(m); return g;
}
export function merge(list) { return mergeGeometries(list.map(g => (g.index ? g.toNonIndexed() : g))); }

// smooth tube through elliptical cross sections. secs: [{y, rx, rz, cx, cz}] in any vertical order.
// u wraps once around with u = 0.5 at the front (+z); v = 0 at the lowest section and 1 at the highest.
export function loft(secs, seg = 16) {
  const n = secs.length, pos = [], uv = [], idx = [];
  const ys = secs.map(s => s.y), y0 = Math.min(...ys), y1 = Math.max(...ys);
  for (let j = 0; j < n; j++) {
    const s = secs[j], v = (s.y - y0) / (y1 - y0 || 1);
    for (let i = 0; i <= seg; i++) {
      const u = i / seg, a = (u - 0.5) * Math.PI * 2;
      pos.push((s.cx || 0) + s.rx * Math.sin(a), s.y, (s.cz || 0) + s.rz * Math.cos(a)); uv.push(u, v);
    }
  }
  const flip = secs[0].y > secs[n - 1].y;                       // keep triangles facing outward either way
  for (let j = 0; j < n - 1; j++) for (let i = 0; i < seg; i++) {
    const a = j * (seg + 1) + i, b = a + 1, c = a + seg + 1, d = c + 1;
    if (flip) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const nr = g.attributes.normal;                               // weld the normals across the u seam
  for (let j = 0; j < n; j++) {
    const a = j * (seg + 1), b = a + seg;
    const x = nr.getX(a) + nr.getX(b), y = nr.getY(a) + nr.getY(b), z = nr.getZ(a) + nr.getZ(b), l = Math.hypot(x, y, z) || 1;
    nr.setXYZ(a, x / l, y / l, z / l); nr.setXYZ(b, x / l, y / l, z / l);
  }
  return g;
}
const ring = (y, r, rz = r, cz = 0, cx = 0) => ({ y, rx: r, rz, cz, cx });

// side-profile extrusion, outline = [forward, up] points, thickness across x. Forward is +z.
export function side(pts, thick, bevel = 0.006) {
  const s = new THREE.Shape(); pts.forEach((p, i) => (i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])));
  const d = Math.max(0.001, thick - 2 * bevel);
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 4 });
  g.translate(0, 0, -d / 2); g.rotateY(-Math.PI / 2);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 6, uv.getY(i) * 6);
  return g;
}

// ---------------------------------------------------------------- body
export function bodyGeos() {
  const G = {};
  // jacket from hem to collar top; the tunic texture is laid out over exactly this height (0.80 .. 1.51)
  G.jacket = loft([
    ring(0.80, 0.208, 0.140, 0.004), ring(0.90, 0.201, 0.134, 0.004), ring(1.00, 0.186, 0.122), ring(1.11, 0.196, 0.126, 0.006),
    ring(1.24, 0.204, 0.134, 0.014), ring(1.35, 0.205, 0.128, 0.008), ring(1.42, 0.168, 0.104), ring(1.47, 0.112, 0.082), ring(1.51, 0.066, 0.066),
  ], 18);
  G.neck = loft([ring(1.48, 0.058), ring(1.54, 0.05, 0.054, 0.004), ring(1.6, 0.048, 0.052, 0.006)], 10);
  G.belt = loft([ring(0.975, 0.19, 0.128, 0.004), ring(1.045, 0.19, 0.128, 0.004)], 18);
  G.buckle = new THREE.BoxGeometry(0.058, 0.05, 0.014);
  const pouch = (x) => merge([xf(new THREE.BoxGeometry(0.075, 0.1, 0.05), { p: [x, 1.05, 0.138], r: [0, x < 0 ? 0.28 : -0.28, 0] }),
    xf(new THREE.BoxGeometry(0.079, 0.026, 0.056), { p: [x * 1.02, 1.1, 0.138], r: [0, x < 0 ? 0.28 : -0.28, 0] })]);
  G.pouches = merge([pouch(-0.105), pouch(-0.058), pouch(0.058), pouch(0.105)].map((g, i) => xf(g, { p: [i < 2 ? -0.01 : 0.01, 0, 0] })));
  G.canteen = merge([xf(new THREE.CylinderGeometry(0.055, 0.055, 0.075, 12), { p: [0, 0, 0], r: [0, 0, Math.PI / 2] }),
    xf(new THREE.CylinderGeometry(0.018, 0.018, 0.03, 8), { p: [0, 0.062, 0] })]);
  G.canteen.scale(0.62, 1.1, 1.0);
  G.breadbag = xf(new THREE.BoxGeometry(0.2, 0.19, 0.075), { p: [0, 0, 0] });
  G.bayonet = merge([xf(new THREE.BoxGeometry(0.03, 0.27, 0.018), { p: [0, -0.1, 0] }), xf(new THREE.BoxGeometry(0.036, 0.034, 0.024), { p: [0, 0.05, 0] })]);
  // arms: sleeve upper and forearm hang from the joint down (-y)
  G.upper = loft([ring(0, 0.056), ring(-0.07, 0.06, 0.058), ring(-0.17, 0.051, 0.051), ring(-0.3, 0.045, 0.046)], 10);
  G.fore = loft([ring(0, 0.045, 0.046), ring(-0.07, 0.05, 0.05, 0.0), ring(-0.2, 0.042, 0.042), ring(-0.275, 0.036, 0.036)], 10);
  G.cuff = loft([ring(-0.255, 0.044), ring(-0.29, 0.046)], 10);
  G.shoulder = new THREE.SphereGeometry(0.058, 10, 7);
  // fist (palm + curled fingers + thumb), hangs from the wrist; fingers curl toward +z (the soldier's front)
  const fing = (x) => xf(new THREE.CapsuleGeometry(0.0125, 0.034, 3, 6), { p: [x, -0.075, 0.034], r: [Math.PI / 2 * 0.35, 0, 0] });
  G.hand = merge([
    xf(new THREE.BoxGeometry(0.084, 0.082, 0.04), { p: [0, -0.05, 0] }),
    fing(-0.032), fing(-0.011), fing(0.011), fing(0.032),
    xf(new THREE.CapsuleGeometry(0.014, 0.04, 3, 6), { p: [0.04, -0.04, 0.026], r: [0.7, 0, -0.5] }),
  ]);
  // legs: trousers with a bloused turn-in above the boot, boots with shaft + shaped foot
  G.thigh = loft([ring(0, 0.1, 0.105), ring(-0.1, 0.096, 0.1), ring(-0.25, 0.082, 0.086), ring(-0.44, 0.066, 0.07)], 12);
  G.blouse = loft([ring(0, 0.066, 0.07), ring(-0.07, 0.08, 0.084), ring(-0.14, 0.078, 0.08), ring(-0.2, 0.062, 0.062)], 12);
  G.shaft = loft([ring(-0.14, 0.064, 0.066), ring(-0.22, 0.056, 0.058), ring(-0.32, 0.054, 0.056), ring(-0.4, 0.06, 0.062), ring(-0.42, 0.062, 0.064)], 12);
  G.foot = side([[-0.085, -0.04], [0.2, -0.04], [0.215, -0.012], [0.185, 0.026], [0.1, 0.05], [0.03, 0.075], [-0.06, 0.075], [-0.092, 0.02]], 0.1, 0.012);
  G.sole = side([[-0.09, -0.052], [0.205, -0.052], [0.22, -0.036], [0.2, -0.032], [-0.09, -0.032]], 0.108, 0.004);
  G.heel = xf(new THREE.BoxGeometry(0.098, 0.034, 0.06), { p: [0, -0.04, -0.058] });
  G.shaft.translate(0, 0, 0);
  return G;
}
const V = THREE.Vector3;

// ---------------------------------------------------------------- head
export function headGeos() {
  const G = {};
  // skull: finer sphere shaped by hand — flatter forehead, eye sockets, cheekbones and hollows, narrower jaw, chin
  const sk = new THREE.SphereGeometry(1, 48, 32); const p = sk.attributes.position;
  const gau = (v, c, s) => Math.exp(-(((v - c) / s) ** 2));
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    let X = x * 0.079, Y = y * 0.118, Z = z * 0.098;
    const t = clamp((-Y - 0.015) / 0.1, 0, 1);                                // 0 above the cheekbones, 1 at the chin
    X *= 1 - 0.34 * Math.pow(t, 1.15);
    if (Z > 0) Z *= 1 - 0.1 * t * t;                                          // jaw line recedes ...
    if (Z > 0 && t > 0.75) Z += 0.006 * (t - 0.75) * 4;                       // ... but the chin juts a little
    if (Z > 0 && Y > 0.02) Z *= 1 - 0.06 * clamp((Y - 0.02) / 0.08, 0, 1);   // forehead
    if (Z < 0) Z *= 1 + 0.04 * clamp(Y / 0.1, 0, 1);                          // back of skull
    const side = Math.abs(X) / 0.079;                                          // 0 at the centre line, 1 at the cheek edge
    if (Z > 0 && Y > -0.01) {
      Z -= 0.007 * gau(Y, 0.018, 0.02) * gau(Math.abs(X), 0.035, 0.022);     // eye sockets
      Z += 0.003 * gau(Y, 0.036, 0.009) * gau(Math.abs(X), 0.036, 0.025);    // brow ridge
    }
    if (Z > 0) X -= 0.0035 * gau(Y, -0.034, 0.02) * gau(Math.abs(X), 0.058, 0.02) * side; // cheek hollows under the cheekbones
    if (Math.abs(Y + 0.005) < 0.03) X *= 1 + 0.03 * (1 - Math.abs(Y + 0.005) / 0.03);  // cheekbones
    p.setXYZ(i, X, Y, Z);
  }
  sk.computeVertexNormals(); G.skull = sk;
  const ell = (rx, ry, rz, x, y, z, seg = 8) => xf(new THREE.SphereGeometry(1, seg, 6), { p: [x, y, z], s: [rx, ry, rz] });
  // features in head-local space (origin = centre of head): nose and ears only, the rest is in the skull and texture
  G.features = merge([
    ell(0.0085, 0.024, 0.017, 0, -0.022, 0.092),                             // nose bridge and tip
    ell(0.011, 0.007, 0.01, 0, -0.043, 0.097),                               // nose base
    ell(0.0085, 0.028, 0.019, -0.077, -0.012, -0.004), ell(0.0085, 0.028, 0.019, 0.077, -0.012, -0.004), // ears
  ]);
  // eyes: sclera set into the socket, iris and pupil on the front, soft lids over them
  const eye = (sx) => ({
    sclera: ell(0.0098, 0.0075, 0.0098, sx * 0.031, 0.016, 0.0785, 14),
    iris: ell(0.0056, 0.0056, 0.0034, sx * 0.031, 0.0165, 0.0875, 10),
    pupil: ell(0.0025, 0.0025, 0.0016, sx * 0.031, 0.0165, 0.0893, 6),
  });
  const L = eye(-1), R = eye(1);
  G.sclera = merge([L.sclera, R.sclera]);
  G.iris = merge([L.iris, R.iris, L.pupil, R.pupil]);
  // lids: a soft fold over the top of each eye, and a slight lower lid
  G.lids = merge([
    ell(0.0135, 0.0042, 0.0052, -0.031, 0.0245, 0.0812, 10), ell(0.0135, 0.0042, 0.0052, 0.031, 0.0245, 0.0812, 10),
    ell(0.0115, 0.0024, 0.0045, -0.031, 0.0085, 0.0832, 10), ell(0.0115, 0.0024, 0.0045, 0.031, 0.0085, 0.0832, 10),
  ]);
  // brows: thicker at the inner end, tapering outward
  G.brows = merge([
    xf(new THREE.SphereGeometry(1, 10, 5), { p: [-0.031, 0.0355, 0.0865], s: [0.0155, 0.0042, 0.0058], r: [0, 0, 0.16] }),
    xf(new THREE.SphereGeometry(1, 10, 5), { p: [0.031, 0.0355, 0.0865], s: [0.0155, 0.0042, 0.0058], r: [0, 0, -0.16] }),
  ]);
  // mouth: upper and lower lip, dark seam between
  G.lips = merge([ell(0.0125, 0.0045, 0.0055, 0, -0.0655, 0.0835, 12), ell(0.0115, 0.0042, 0.0052, 0, -0.0712, 0.0815, 12)]);
  G.seam = merge([ell(0.0105, 0.0009, 0.0035, 0, -0.0682, 0.0855, 8)]);
  G.neck = loft([ring(-0.08, 0.052, 0.056, -0.004), ring(-0.14, 0.052, 0.058, -0.008)], 10);
  return G;
}

// ---------------------------------------------------------------- headgear
export function helmetGeos() {
  const G = {};
  // Stahlhelm: lathe dome, then the rim is pulled down over the neck and ears and lifted over the brow
  const prof = [[0.0, 0.142], [0.04, 0.139], [0.075, 0.13], [0.1, 0.113], [0.114, 0.09], [0.12, 0.062], [0.1225, 0.034], [0.1235, 0.0]];
  const d = new THREE.LatheGeometry(prof.map(q => new THREE.Vector2(q[0], q[1])), 32);
  const p = d.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const r = Math.hypot(x, z) || 1, c = z / r, w = clamp((0.06 - y) / 0.06, 0, 1), ww = w * w * (3 - 2 * w);
    const drop = c >= 0 ? lerp(-0.034, 0.03, Math.pow(c, 1.3)) : lerp(-0.034, -0.1, Math.pow(-c, 1.1));
    y += ww * drop;
    const flare = c < 0 ? 1 + 0.11 * -c * ww : 1;
    x *= flare; z = z * flare * 1.14 + (c > 0 ? ww * 0.01 * c : 0);
    p.setXYZ(i, x, y, z);
  }
  d.computeVertexNormals(); G.dome = d;
  // rolled rim + chin strap + side vents
  const rim = new THREE.TorusGeometry(1, 0.0364, 5, 48); const rp = rim.attributes.position;   // tube radius 0.0364 * R = 4.5 mm
  for (let i = 0; i < rp.count; i++) {
    const x = rp.getX(i), y = rp.getY(i), z = rp.getZ(i), a = Math.atan2(x, y), c = Math.cos(a), rho = Math.hypot(x, y);   // torus lies in xy
    const R = 0.1235, drop = (c >= 0 ? lerp(-0.034, 0.03, Math.pow(c, 1.3)) : lerp(-0.034, -0.1, Math.pow(-c, 1.1)));
    const flare = c < 0 ? 1 + 0.11 * -c : 1, rr = R * rho * flare;
    rp.setXYZ(i, Math.sin(a) * rr, drop + z * R, Math.cos(a) * rr * 1.14);
  }
  rim.computeVertexNormals(); G.rim = rim;
  G.strap = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new V(-0.117, -0.02, 0.012), new V(-0.1, -0.075, 0.034), new V(-0.055, -0.119, 0.066), new V(0, -0.128, 0.074),
    new V(0.055, -0.119, 0.066), new V(0.1, -0.075, 0.034), new V(0.117, -0.02, 0.012)]), 20, 0.0072, 4);
  G.vent = xf(new THREE.CylinderGeometry(0.0075, 0.0075, 0.012, 6), { r: [0, 0, Math.PI / 2] });
  return G;
}
export function capGeos() {
  const G = {};
  // Schirmmütze: black band, wide saddled crown, polished peak, plain silver cap badge
  G.band = loft([ring(0.0, 0.0935, 0.113, -0.004), ring(0.044, 0.0955, 0.115, -0.004)], 24);
  const prof = [[0.0955, 0.044], [0.1, 0.052], [0.118, 0.07], [0.128, 0.088], [0.12, 0.101], [0.07, 0.106], [0.0, 0.106]];
  const c = new THREE.LatheGeometry(prof.map(q => new THREE.Vector2(q[0], q[1])), 32); const p = c.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(x, z), k = clamp((y - 0.05) / 0.05, 0, 1);
    y += k * 0.012 * Math.cos(2 * a);                                          // crown sags at the sides
    z = z * 1.2 - 0.004; p.setXYZ(i, x * (1 + 0.04 * k * Math.abs(Math.cos(a))), y, z);
  }
  c.computeVertexNormals(); G.crown = c;
  const pk = new THREE.Shape(); pk.moveTo(-0.082, 0); pk.quadraticCurveTo(-0.09, 0.07, 0, 0.09); pk.quadraticCurveTo(0.09, 0.07, 0.082, 0); pk.lineTo(-0.082, 0);
  const pg = new THREE.ExtrudeGeometry(pk, { depth: 0.004, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0015, bevelSegments: 1, curveSegments: 8 });
  pg.rotateX(Math.PI / 2); { const uv = pg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 12, uv.getY(i) * 12); }
  G.peak = pg;
  G.piping = new THREE.TorusGeometry(1, 0.0034, 4, 36); { const q = G.piping.attributes.position; for (let i = 0; i < q.count; i++) q.setXYZ(i, q.getX(i) * 0.0965, q.getZ(i) + 0.044, q.getY(i) * 0.116 - 0.004); G.piping.computeVertexNormals(); }
  G.badge = merge([xf(new THREE.CylinderGeometry(0.019, 0.019, 0.005, 10), { r: [Math.PI / 2, 0, 0] }), xf(new THREE.BoxGeometry(0.044, 0.012, 0.004), { p: [0, 0, 0] })]);
  G.cord = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new V(-0.088, 0.036, 0.112), new V(-0.05, 0.026, 0.126), new V(0, 0.024, 0.13), new V(0.05, 0.026, 0.126), new V(0.088, 0.036, 0.112)]), 14, 0.0035, 4);
  return G;
}
