// Texture set and the material palette: world materials (M) and soldier materials (SM).
import * as THREE from 'three';
import { makeTextures } from '../textures.js';
import { upgradeTextures } from '../textures2.js';
import { packTextures, stampEagle } from '../packtex.js';
import { soldierTextures } from '../textures3.js';
import { mat } from './renderer.js';

export const T = stampEagle(soldierTextures(packTextures(upgradeTextures(makeTextures()))));
export const M = {
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
export const SM = (() => {
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
