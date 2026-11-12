// Weapons: the Kar98k and MP40 viewmodels (baked bodies, procedural bolts, hands, magazines and flashes),
// the weapon table, and the gun state the player update drives.
import * as THREE from 'three';
import { V3 } from '../core/util.js';
import { WEAPON_DEFS, FLASH_SIZE, HAND_OFFSETS, GUN_SCALE, K98_CLIP_SEAT_Y } from '../core/config.js';
import { gunScene, gunL, mat } from '../render/renderer.js';
import { T } from '../render/materials.js';
import { addBaked } from '../render/baked.js';
import K98_MODEL from '../models/k98.json';
import MP40_MODEL from '../models/mp40.json';
import K98_HANDS from '../models/k98_hands.json';   // first-person hands from the FPS sniper pack (tools/bake_hands.py), one bake per weapon
import MP40_HANDS from '../models/mp40_hands.json';
import NADE_HANDS from '../models/nade_hands.json';
import handsColor from '../models/hands_color.png';   // the sniper pack's arm texture (512 px): sleeve, tunic and leather gloves
import muzzleSheet from '../effects/muzzle_sheet.png';   // 6 muzzle flash frames from MuzzleFlashVFX (flash_front_01..06), 3 across and 2 down; brightness is the alpha

// one frame of the muzzle sheet is picked at random for each shot (see setFlashFrame)
export const FLASH_COLS = 3, FLASH_ROWS = 2, FLASH_FRAMES = FLASH_COLS * FLASH_ROWS;
// centre of each frame's flame in UV, measured from the sheet's alpha once it has loaded (the flames sit off-centre in their cells)
let flashCentres = null;
function measureFlashCentres(img) {
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height).data;
  const cw = c.width / FLASH_COLS, ch = c.height / FLASH_ROWS, out = [];
  for (let i = 0; i < FLASH_FRAMES; i++) {
    const x0 = (i % FLASH_COLS) * cw, y0 = Math.floor(i / FLASH_COLS) * ch;
    let sum = 0, sx = 0, sy = 0;
    for (let py = y0; py < y0 + ch; py++) for (let px = x0; px < x0 + cw; px++) { const a = d[(py * c.width + px) * 4 + 3]; sum += a; sx += a * px; sy += a * py; }
    const mx = sum ? sx / sum : x0 + cw / 2, my = sum ? sy / sum : y0 + ch / 2;
    out.push({ u: mx / c.width, v: 1 - my / c.height });   // image row 0 is the top, UV v = 1
  }
  return out;
}
// point a flash plane's UVs at one frame, centred on its flame; frame 0 until the sheet has loaded
export function setFlashFrame(mesh, i) {
  const cu = flashCentres ? flashCentres[i].u : (i % FLASH_COLS + 0.5) / FLASH_COLS;
  const cv = flashCentres ? flashCentres[i].v : 1 - (Math.floor(i / FLASH_COLS) + 0.5) / FLASH_ROWS;
  const u0 = cu - 0.5 / FLASH_COLS, u1 = cu + 0.5 / FLASH_COLS, v0 = cv - 0.5 / FLASH_ROWS, v1 = cv + 0.5 / FLASH_ROWS;
  const uv = mesh.geometry.attributes.uv;   // PlaneGeometry vertices: top-left, top-right, bottom-left, bottom-right
  uv.setXY(0, u0, v1); uv.setXY(1, u1, v1); uv.setXY(2, u0, v0); uv.setXY(3, u1, v0);
  uv.needsUpdate = true;
}

// the player's muzzle flash (same sheet, same two planes) for an enemy gun: a front starburst plus a side streak along the barrel.
// k scales it (the player's gun models are drawn 1.265x). Returns a hidden group at the muzzle; call randomizeFlash on every shot.
let worldFlashMat = null;
export function makeWorldFlash(parent, y, z, k = 1) {
  const g = new THREE.Group(); g.position.set(0, y, z); g.visible = false; parent.add(g);
  const f1 = new THREE.Mesh(new THREE.PlaneGeometry(0.3 * FLASH_SIZE * k, 0.3 * FLASH_SIZE * k), worldFlashMat);
  const f2 = new THREE.Mesh(new THREE.PlaneGeometry(0.51 * FLASH_SIZE * k, 0.18 * FLASH_SIZE * k), worldFlashMat); f2.rotation.y = Math.PI / 2;
  g.add(f1, f2); g.userData.f1 = f1; g.userData.f2 = f2; setFlashFrame(f1, 0); setFlashFrame(f2, 0);
  return g;
}
// a new random frame, spin and size for the next shot, as the player's gun does
export function randomizeFlash(g) {
  const { f1, f2 } = g.userData, frame = (Math.random() * FLASH_FRAMES) | 0;
  f1.rotation.z = Math.random() * 6.28; f1.scale.setScalar(0.8 + Math.random() * 0.5);
  setFlashFrame(f1, frame); setFlashFrame(f2, frame);
}

export const G = {};   // ejected brass: mesh, velocity, remaining life
export const WEAPONS = WEAPON_DEFS;   // stats live in core/config.js; runtime fields (m, ammo, reserve) are added to these objects

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

function buildGuns() {
  const o = { lights: gunL, fog: false, snap: false, affine: 0 };
  const od = { ...o, side: THREE.DoubleSide, emis: 0.35 };  // lift the dark steel so shadowed faces never go black; MP40 parts are thin open shells, so draw both faces
  const wood = mat(T.gunwood, o), metal = mat(T.gunmetal, od), dark = mat(T.gunmetal, { ...od, tint: [0.8, 0.8, 0.85] });
  const muzzleTex = new THREE.TextureLoader().load(muzzleSheet, t => { flashCentres = measureFlashCentres(t.image); });   // sharp pixels, no mipmaps: keeps the PS1 look
  muzzleTex.magFilter = muzzleTex.minFilter = THREE.NearestFilter; muzzleTex.generateMipmaps = false;
  const fm = mat(muzzleTex, { ...o, additive: true, emis: 1 });
  worldFlashMat = mat(muzzleTex, { additive: true, emis: 1, snap: false, side: THREE.DoubleSide });   // the same flash sheet for enemy guns, drawn in the world scene
  const add = (g, m, parent, x = 0, y = 0, z = 0) => { const b = new THREE.Mesh(g, m); b.position.set(x, y, z); parent.add(b); return b; };
  const prof = (pts, thick, m, parent, bevel) => add(profGeo(pts, thick, bevel), m, parent);
  // tube along the barrel axis from forward distance f0 to f1
  const tube = (r, f0, f1, y, m, parent, sides = 10, r1 = r) => { const g = new THREE.CylinderGeometry(r1, r, Math.abs(f1 - f0), sides); g.rotateX(-Math.PI / 2); uvScale(g, 2); return add(g, m, parent, 0, y, -(f0 + f1) / 2); };
  const cross = (r, len, x, y, f, m, parent, sides = 8) => { const g = new THREE.CylinderGeometry(r, r, len, sides); g.rotateZ(Math.PI / 2); return add(g, m, parent, x, y, -f); };
  const ball = (r, x, y, f, m, parent, sx = 1, sy = 1, sz = 1) => { const g = new THREE.SphereGeometry(r, 8, 6); g.scale(sx, sy, sz); return add(g, m, parent, x, y, -f); };
  // a hand and forearm from a baked hands model (its 'right' or 'left' part), in a group under root so the game can move it on its own
  // the pack's arm texture (UVs come from the bake); nearest filtering, no mipmaps, keeps the PS1 look
  const handsTex = new THREE.TextureLoader().load(handsColor);
  handsTex.magFilter = handsTex.minFilter = THREE.NearestFilter; handsTex.generateMipmaps = false;
  const handsMat = mat(handsTex, o);
  // the baked hand sits in an inner group moved by HAND_OFFSETS[weapon][side] (gun space, metres), so the game can still move the outer group
  const hands = (root, data, side, wi) => {
    const g = new THREE.Group(); root.add(g);
    // pv sits at the grip point (e) plus the offset (d) and turns by the axis-angle r about it; inner puts the baked hand's grip point back on pv
    const e = (HAND_OFFSETS[wi] && HAND_OFFSETS[wi][side === 'left' ? 'L' : 'R']) || { p: [0, 0, 0], d: [0, 0, 0], r: [0, 1, 0, 0] };
    const pv = new THREE.Group(); g.add(pv); g.userData.pv = pv; g.userData.e = e;
    pv.position.set(e.p[0] + e.d[0], e.p[1] + e.d[1], e.p[2] + e.d[2]);
    pv.quaternion.setFromAxisAngle(new THREE.Vector3(e.r[0], e.r[1], e.r[2]).normalize(), e.r[3]);
    pv.scale.setScalar((e.s || 1) / (GUN_SCALE[wi] || 1));   // optional uniform scale about the grip point; the hand keeps its size when the gun is scaled up
    const inner = new THREE.Group(); pv.add(inner); inner.position.set(-e.p[0], -e.p[1], -e.p[2]);
    addBaked({ meshes: data.meshes.filter(m => m.mat === side) }, inner, { right: handsMat, left: handsMat });
    return g;
  };
  // y is the flash height on the viewmodel; the planes are FLASH_SIZE x the size they were before (1.5x, then 1.5x again)
  const flashes = (root, z, y = 0.026) => {
    const f1 = new THREE.Mesh(new THREE.PlaneGeometry(0.3 * FLASH_SIZE, 0.3 * FLASH_SIZE), fm); f1.position.set(0, y, z); f1.visible = false; root.add(f1); setFlashFrame(f1, 0);
    const f2 = new THREE.Mesh(new THREE.PlaneGeometry(0.51 * FLASH_SIZE, 0.18 * FLASH_SIZE), fm); f2.position.set(0, y, z); f2.rotation.y = Math.PI / 2; f2.visible = false; root.add(f2); setFlashFrame(f2, 0);
    return [f1, f2];
  };

  // ---- Karabiner 98k: body is the baked model; bolt, clip, hands and muzzle flash stay procedural so the reload still animates
  {
    const root = new THREE.Group(); gunScene.add(root); root.scale.setScalar(GUN_SCALE[0]);
    const brass = mat(T.brass, o);
    const parts = addBaked(K98_MODEL, root, { wood, metal, clip: metal, clipbrass: brass });
    const bolt = new THREE.Group(); bolt.position.set(0, 0.008, -0.045); root.add(bolt);   // lowered and moved forward onto the receiver
    tube(0.0095, -0.05, 0.05, 0, metal, bolt, 8);
    tube(0.011, -0.075, -0.045, 0, dark, bolt, 8);
    cross(0.0045, 0.045, 0.028, -0.008, 0, metal, bolt, 6).rotation.z = -0.35;
    ball(0.011, 0.052, -0.017, 0, metal, bolt);
    const left = hands(root, K98_HANDS, 'left', 0);
    const right = hands(root, K98_HANDS, 'right', 0);
    const [flash, flash2] = flashes(root, -0.767, 0.004);   // centred on the muzzle tip, measured on the viewmodel; a little lower than before
    // stripper clip: the model's own five-round clip (baked as 'clip' and 'clipbrass' parts), pressed down into the receiver during reload.
    // update.js moves `clip` from 0.13 m down to 0.047 m; clipIn lifts the baked clip so that end point lands K98_CLIP_SEAT_Y above its baked place.
    const clip = new THREE.Group(); root.add(clip); clip.visible = false;
    const clipIn = new THREE.Group(); clip.add(clipIn); clipIn.position.y = K98_CLIP_SEAT_Y - 0.047;
    K98_MODEL.meshes.forEach((m, i) => { if (m.mat === 'clip' || m.mat === 'clipbrass') clipIn.add(parts[i]); });
    WEAPONS[0].m = { root, bolt, left, right, flash, flash2, clip };
  }

  // ---- MP40: body is the baked model; the cocking handle on the left of the receiver is its own baked part and slides back on each shot; magazine (reloads), hands and muzzle flash stay procedural
  {
    const root = new THREE.Group(); gunScene.add(root); root.visible = false; root.scale.setScalar(GUN_SCALE[1]);
    const parts = addBaked(MP40_MODEL, root, { metal, bolt: metal });
    const bolt = parts[MP40_MODEL.meshes.findIndex(m => m.mat === 'bolt')];   // the slide (bolt), at its rest position in the model
    const mag = new THREE.Group(); root.add(mag);
    prof([[0.141, -0.05], [0.169, -0.05], [0.173, -0.24], [0.146, -0.24]], 0.023, dark, mag, 0.003);
    const magNew = mag.clone(); root.add(magNew); magNew.visible = false;   // fresh magazine that is inserted during reload
    const left = hands(root, MP40_HANDS, 'left', 1);
    const right = hands(root, MP40_HANDS, 'right', 1);
    const [flash, flash2] = flashes(root, -0.466, 0.0);   // centred on the muzzle tip, measured on the viewmodel; lowered to the barrel's axis
    WEAPONS[1].m = { root, bolt, mag, magNew, left, right, flash, flash2 };
  }

  // ---- Stielhandgranate: wooden handle with a metal canister head, held in the right hand. The throw animation is in player/update.js.
  // bolt, clip and flashes exist only so the shared viewmodel code can drive them; they never show.
  {
    const root = new THREE.Group(); gunScene.add(root); root.visible = false;
    const nade = new THREE.Group(); root.add(nade);
    nade.rotation.x = Math.PI / 2; nade.position.y = -0.11;   // stands upright: head up, the hand grips the handle at f = 0.1 (raised from -0.17 to sit in the hand)
    const gWood = mat(T.grenadeWood, o), gMetal = mat(T.grenadeMetal, od);   // model pack textures (wood handle, metal canister)
    tube(0.016, 0.02, 0.2, 0, gWood, nade, 8);                       // handle; the hand grips it around f = 0.1
    tube(0.034, 0.2, 0.3, 0, gMetal, nade, 10);                      // canister head, pointing forward
    tube(0.036, 0.3, 0.31, 0, gMetal, nade, 10);                     // cap
    const bolt = new THREE.Group(); root.add(bolt);
    const clip = new THREE.Group(); root.add(clip); clip.visible = false;
    const right = hands(root, NADE_HANDS, 'right', 2);
    const left = new THREE.Group(); root.add(left);
    const [flash, flash2] = flashes(root, -0.4);
    WEAPONS[2].m = { root, nade, bolt, left, right, flash, flash2, clip };
  }
  G.brass = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.05), mat(T.brass, o)); G.brass.visible = false; gunScene.add(G.brass);
  G.brassV = new V3(); G.brassLife = 0;
}
buildGuns();

// the gun the player holds: index, timers and animation drivers. ammo/reserve proxy the active weapon.
export const gun = {
  w: 0, next: 0, swapped: false, state: 'idle', t: 0, cool: 0, heat: 0, boltT: 0, ads: 0, kick: 0, flash: 0, swayX: 0, swayY: 0, camKick: 0,
  thrown: false,   // grenade: true once this throw has left the hand
  get ammo() { return WEAPONS[this.w].ammo; }, set ammo(v) { WEAPONS[this.w].ammo = v; },
  get reserve() { return WEAPONS[this.w].reserve; }, set reserve(v) { WEAPONS[this.w].reserve = v; },
};
export const curW = () => WEAPONS[gun.w];
