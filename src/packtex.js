// Textures taken from the user's own copy of the Frontline HD texture pack (personal use only).
import * as THREE from 'three';
import stone from './pack/stone.png';
import stoneDark from './pack/stoneDark.png';
import plaster from './pack/plaster.png';
import cobble from './pack/cobble.png';
import roof from './pack/roof.png';
import planks from './pack/planks.png';
import crate from './pack/crate.png';
import dirt from './pack/dirt.png';
import door from './pack/door.png';
import flag from './pack/flag.png';
import crateEagle from './pack/crateEagle.png';
import poster from './pack/poster.png';
import gunwood from './pack/gunwood.png';
import gunmetal from './pack/gunmetal.png';
import eagle from './pack/eagle.png';
import atlasGrey from './pack/atlasGrey.png';
import atlasSepia from './pack/atlasSepia.png';
import face768 from './pack/face768.png';
import face758 from './pack/face758.png';

const FILES = { stone, stoneDark, plaster, cobble, roof, planks, crate, dirt, door, flag, crateEagle, poster, gunwood, gunmetal, atlasGrey, atlasSepia, face768, face758 };
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

// breast eagle on the field-grey / dark tunics (right breast, above the pocket)
export function stampEagle(T) {
  const img = new Image();
  img.onload = () => {
    for (const u of T.sUniforms) {
      const c = u.tunic.image;
      c.getContext('2d').drawImage(img, 66, 22);
      u.tunic.needsUpdate = true;
    }
  };
  img.src = eagle;
  return T;
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
