// Textures taken from the user's own copy of the Frontline HD texture pack (personal use only).
// Files live in src/pack/ (git-ignored). Each name says what the picture is, not where it came from;
// the key on the right is what materials.js uses. The source name is in the comment for reference.
import * as THREE from 'three';
import windowLit from './pack/window_lit.png';          // tex1_128x256_6762a26577a817e3_14: lit room window
import windowDark from './pack/window_dark.png';        // tex1_128x256_d04b2a47de41886f_14: unlit window
import ivy from './pack/ivy_wall_sparse.png';           // baked by tools/bake_pack.ps1 from tex1_256x256_b1f146a02e852a5c_58e6f72f9187a76f_8
import flagstone from './pack/ground_flagstone_crop.png'; // baked from tex1_256x128_307b089b26985229_14: outdoor floor, edge cut, 1024x512
import brickRough from './pack/brick_wall_rough_level.png'; // baked from tex1_256x128_2255d8c5092aa031_14: outer walls, turned level
import facadeBrick from './pack/facade_brick_level.png';    // baked from tex1_256x128_8f76faec106263d3_14: building facades, turned level
import flagBanner from './pack/flag_banner.png';        // tex1_128x64_fa9e081f1ee3e25b_14: hangs by the entrance
import crateWide from './pack/crate_wide_wood.png';     // tex1_128x64_fbf948d6e5917f27_14: long crate
import crateA from './pack/crate_square_a.png';         // tex1_64x64_414182222a620001_14: square crate, one per crate
import crateB from './pack/crate_square_b.png';         // tex1_64x64_31841256d006ff67_14: square crate, one per crate
import treeA from './pack/tree_foliage_a.png';          // tex1_256x128_3c27a77a50de9926_7b6eebc8fb24f8a1_9
import treeB from './pack/tree_foliage_b.png';          // tex1_256x128_7d52d6ac83ef1721_765591499361d3c2_8
import radio from './pack/radio.png';                   // tex1_128x128_fab07a580d84dbdb_14
import soldierSheet from './pack/soldier_sheet.png';    // tex1_256x256_ce1e2eb5faa0f5c0_14: uniform + helmet atlas
// uniform sheets for the other soldier types (enemies/uniforms.js maps each onto the body)
import sheetPanzergrenadier from './pack/soldier_panzergrenadier.png';   // tex1_256x256_fea098d61952c7c2_14
import sheetSSOfficer from './pack/soldier_ss_officer.png';               // tex1_256x256_fd2d1643cc113d34_14
import sheetLuftwaffeOfficer from './pack/soldier_luftwaffe_officer.png'; // tex1_256x256_f407b531e1815693_14
import sheetEngineer from './pack/soldier_engineer.png';                  // tex1_256x256_ffd7118852bcfd57_14
import sheetColonel from './pack/soldier_colonel.png';                    // tex1_256x256_769db0c61558036f_14
import stone from './pack/stone_wall_tan_blocks.png';
import stoneDark from './pack/brick_wall_dark.png';
import plaster from './pack/plaster_wall_grey.png';
import roof from './pack/roof_tiles_brown.png';
import planks from './pack/wood_planks_horizontal.png';
import dirt from './pack/ground_dirt_mud.png';
import doorPanels from './pack/door_wood_panels.png';   // tex1_128x64_43f57a464d02232b_14: panelled door (turned to stand upright)
import flag from './pack/flag_nazi_banner.png';
import crateEagle from './pack/crate_wood_eagle_stencil.png';
import poster from './pack/poster_wartime_propaganda.png';
import gunwood from './pack/rifle_stock_wood.png';
import gunmetal from './pack/gun_metal_dark.png';
import grenadeMetal from './pack/grenade_metal.png';   // Metal15_col from the grenade model pack: canister head
import grenadeWood from './pack/grenade_wood.png';     // Wood03_col from the grenade model pack: handle
import truckPolish from './pack/truck_polish.png';     // the Polish truck's picture (ww2-polish-truck.zip), downsized to 1024
import explosionSheet from './pack/explosion_sheet.png'; // the explosion smoke from Trial+explosion.blend: 55 frames, 8 across, rendered in Blender (courtyard-assets/models/Effects)
import skyNight from './pack/sky_night_moon.png';      // City Rooftop Night panorama (courtyard-assets/models/Skybox): buildings removed, moon and stars kept, 2048x1024

const FILES = {
  brickRough, facadeBrick, flagstone, ivy,
  windowLit, windowDark, flagBanner, crateWide, crateA, crateB,
  treeA, treeB, radio, soldierSheet, sheetPanzergrenadier, sheetSSOfficer, sheetLuftwaffeOfficer, sheetEngineer, sheetColonel,
  stone, stoneDark, plaster, roof, planks, dirt, doorPanels, flag, crateEagle, poster, gunwood, gunmetal,
  grenadeMetal, grenadeWood, skyNight, truckPolish, explosionSheet,
};
export function packTextures(T) {
  const loader = new THREE.TextureLoader();
  for (const [name, url] of Object.entries(FILES)) {
    const t = loader.load(url);            // real-size upload (no blank 64x64 canvas left on the GPU)
    t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    T[name] = t;
  }
  return T;
}

// Pictures that were turned, cut or thinned are baked to files by tools/bake_pack.ps1 and loaded in FILES above.
// Only the helmet steel is still painted on a canvas, and it is drawn at once, before its first upload.
// The helmet steel: a plain dark gradient for the helmet (a flat gunmetal with a faint top-to-bottom sheen)
export function derivedTextures(T) {
  T.helmetBlack = steelTex();
  return T;
}

// plain gunmetal texture for the helmet: a vertical gradient, no pattern
function steelTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 64);
  gr.addColorStop(0, '#3a3e42'); gr.addColorStop(0.5, '#22252a'); gr.addColorStop(1, '#181b1e');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// remap every vertex of a geometry into a rectangle of the atlas (u, v in 0..1 -> x0..x1, y0..y1)
export function atlasUV(geo, x0, x1, y0, y1) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, x0 + uv.getX(i) * (x1 - x0), y0 + uv.getY(i) * (y1 - y0));
  }
  uv.needsUpdate = true;
  return geo;
}
