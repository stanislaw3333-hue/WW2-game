// Texture set and the material palette: world materials (M) and soldier materials (SM).
import * as THREE from 'three';
import { makeTextures } from '../textures.js';
import { upgradeTextures } from '../textures2.js';
import { packTextures, derivedTextures } from '../packtex.js';
import { soldierTextures } from '../textures3.js';
import { mat } from './renderer.js';

export const T = derivedTextures(soldierTextures(packTextures(upgradeTextures(makeTextures()))));
// aspect = the picture's width / height as it is laid on the world; worldUV uses it so the pictures are not stretched
const withAspect = (m, aspect) => { m.userData.aspect = aspect; return m; };
export const M = {
  ground: withAspect(mat(T.flagstone), 2), stone: mat(T.stone), stoneDark: mat(T.stoneDark), plaster: mat(T.plaster),
  brick: withAspect(mat(T.brickRough), 0.5), facade: withAspect(mat(T.facadeBrick), 0.5), ivy: mat(T.ivy, { decal: true }),
  planks: mat(T.planks), crate: mat(T.crateA), crateB: mat(T.crateB), crateWide: mat(T.crateWide), ammo: mat(T.ammo), roof: mat(T.roof),
  // lit and unlit windows: the same pane texture, the lit one glows
  winLit: mat(T.windowLit, { emis: 1, tint: [1.0, 0.92, 0.75], decal: true }), winDark: mat(T.windowDark, { decal: true }),
  door: mat(T.doorPanels, { decal: true }), gate: mat(T.gate), gateD: mat(T.gate, { decal: true }),
  barrel: mat(T.barrel), sandbag: mat(T.sandbag), hay: mat(T.hay), bark: mat(T.bark), dirt: mat(T.dirt),
  foliage: mat(T.treeA, { side: THREE.DoubleSide }), poplar: mat(T.treeB, { emis: 1, tint: [0.55, 0.6, 0.65], side: THREE.DoubleSide }),
  target: mat(T.target, { side: THREE.DoubleSide }), iron: mat(T.iron), radio: mat(T.radio),
  olive: mat(T.olive), tarp: mat(T.tarp), tire: mat(T.tire), glass: mat(T.glass, { decal: true }),
  water: mat(T.water, { tint: [1.4, 1.5, 1.7] }), lantern: mat(T.lantern, { emis: 1, tint: [1.15, 1.0, 0.8] }),
  lampOff: mat(T.lampOff, { decal: true }), sign: mat(T.sign, { decal: true, side: THREE.DoubleSide }),
  glow: mat(T.glow, { additive: true, emis: 1, tint: [1.0, 0.62, 0.25], snap: false }),
  hole: mat(T.hole, { decal: true }),
  flag: mat(T.flag, { decal: true, side: THREE.DoubleSide }), flagBanner: mat(T.flagBanner, { decal: true, side: THREE.DoubleSide }),
  poster: mat(T.poster, { decal: true }), crateE: mat(T.crateEagle),
  dust: mat(T.white, { tint: [0.6, 0.58, 0.52] }), chip: mat(T.white, { tint: [0.62, 0.42, 0.22] }),
  sky: mat(T.skyNight, { emis: 1, fog: false, affine: 0, snap: false, side: THREE.BackSide, depthWrite: false }),
  skin: mat(T.skin, { affine: 0, emis: 0.16 }), boot: mat(T.boot, { affine: 0, emis: 0.16 }), cloth: mat(T.cloth, { affine: 0, emis: 0.16 }), trouser: mat(T.trouser, { affine: 0, emis: 0.16 }),
  tunic: mat(T.tunic, { affine: 0, emis: 0.16 }), belt: mat(T.belt, { affine: 0, emis: 0.16 }), head: mat(T.head, { affine: 0, emis: 0.16 }),
  helmet: mat(T.helmet, { affine: 0, emis: 0.16, side: THREE.DoubleSide }), cap: mat(T.cap, { affine: 0, emis: 0.16, side: THREE.DoubleSide }),
  visor: mat(T.boot, { affine: 0, emis: 0.16, side: THREE.DoubleSide }),
  erifle: mat(T.gunwood, { affine: 0, tint: [0.8, 0.75, 0.7] }), emetal: mat(T.gunmetal, { affine: 0 }),
  trim: mat(T.plaster, { tint: [0.74, 0.72, 0.7] }), shutter: mat(T.planks, { tint: [0.5, 0.68, 0.56] }),
  eflash: mat(T.flash, { additive: true, emis: 1, snap: false, side: THREE.DoubleSide }),
  puff: mat(T.white, { tint: [0.42, 0.13, 0.1] }),
  grenadeMetal: mat(T.grenadeMetal, { affine: 0 }), grenadeWood: mat(T.grenadeWood, { affine: 0 }),
};

// soldier materials: two uniform colours cut from the same soldier sheet, four faces, shared kit
export const SM = (() => {
  const o = { affine: 0, emis: 0.16 }, od = { ...o, side: THREE.DoubleSide };
  return {
    uni: [
      { tunic: mat(T.soldierSheet, { ...o, tint: [0.46, 0.44, 0.48] }), trouser: mat(T.sUniforms[0].trouser, o), sleeve: mat(T.soldierSheet, { ...o, tint: [0.46, 0.44, 0.48] }) },   // dark charcoal
      { tunic: mat(T.soldierSheet, { ...o, tint: [0.9, 0.98, 0.9] }), trouser: mat(T.sUniforms[1].trouser, o), sleeve: mat(T.soldierSheet, { ...o, tint: [0.9, 0.98, 0.9] }) },   // field grey
    ],
    // faces: pack head textures (two painted variants) with the upper half in shadow; plain skin for neck and hands
    face: T.sFaces.map(f => ({ skin: mat(f.skin, o) })),
    // stand-in for the hidden hit-box parts (never drawn)
    shadow: mat(T.sFelt, o),
    boot: mat(T.sBoot, o), leather: mat(T.sLeather, o), belt: mat(T.sBelt, o), metal: mat(T.sMetal, o), felt: mat(T.sFelt, o), canvas: mat(T.sCanvas, o),
    // helmet: black metal cut from the sheet's dark corner
    stahl: mat(T.helmetBlack, od), cap: mat(T.sCap, od), band: mat(T.sBand, o), peak: mat(T.sPeak, od),
  };
})();
