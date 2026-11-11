// Detailed textures for the German soldiers: uniforms (field-grey + dark), faces, helmet, cap, leather, kit.
import { tex, blotch, rng } from './textures.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const col = (c, v) => [c[0] * v, c[1] * v, c[2] * v];

// woven cloth value: fine twill + blotchy wear + per-pixel noise
function cloth(rr, b, x, y, w, h, twill = 0.06) { return 0.86 + rr() * 0.1 + (b(x, y, w, h) - 0.5) * 0.22 + (((x + y) & 3) === 0 ? twill : 0); }

function makeUniform(base, collar, seed) {
  const U = {};
  // ---- tunic 128x128: front opening at x = 64, collar at the top (y 0), hem at the bottom
  U.tunic = tex(128, 128, P => {
    const rr = rng(seed), b = blotch(rng(seed + 1), 6), b2 = blotch(rng(seed + 2), 14);
    P.fill((x, y) => { const v = cloth(rr, b, x, y, 128, 128) + (b2(x, y, 128, 128) - 0.5) * 0.1; return col(base, v); });
    const px = (x, y, c) => P.setc(x, y, c[0], c[1], c[2]);
    const mulr = (x0, y0, x1, y1, f) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) P.mul(x, y, f); };
    const hline = (x0, x1, y, f) => { for (let x = x0; x <= x1; x++) P.mul(x, y, f); };
    const vline = (x, y0, y1, f) => { for (let y = y0; y <= y1; y++) P.mul(x, y, f); };
    // body shading: darker towards the sides and the back so the form reads even in flat light
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) { const side = Math.abs(Math.cos((x / 128 - 0.5) * 2 * Math.PI)); P.mul(x, y, 0.8 + side * 0.22); }
    // soft vertical folds and horizontal belt wrinkles
    for (let k = 0; k < 9; k++) { const x = (rr() * 128) | 0, y0 = (rr() * 70 + 20) | 0, y1 = Math.min(127, y0 + 14 + ((rr() * 26) | 0)); vline(x, y0, y1, 0.9); vline(x + 1, y0, y1, 1.06); }
    for (let k = 0; k < 10; k++) { const x0 = (rr() * 108) | 0, y = 70 + ((rr() * 12) | 0); hline(x0, x0 + 8 + ((rr() * 14) | 0), y, 0.88); hline(x0, x0 + 8, y + 1, 1.05); }
    // collar (stand-up, darker) with plain collar patches
    for (let y = 0; y < 9; y++) for (let x = 0; x < 128; x++) { const v = 0.8 + rr() * 0.2 + (y === 8 ? -0.25 : 0); px(x, y, col(collar, v)); }
    for (let x = 0; x < 128; x++) { P.mul(x, 9, 0.7); P.mul(x, 10, 0.85); }
    for (const x0 of [50, 72]) for (let y = 1; y < 8; y++) for (let x = x0; x < x0 + 6; x++) px(x, y, [(y === 1 || y === 7) ? 150 : 118, (y === 1 || y === 7) ? 150 : 118, (y === 1 || y === 7) ? 144 : 112]);
    // front opening, buttons
    vline(64, 10, 127, 0.5); vline(63, 10, 127, 0.8); vline(65, 10, 127, 1.12);
    for (const y of [16, 40, 64, 112]) { px(66, y, [186, 184, 168]); px(67, y, [186, 184, 168]); px(66, y + 1, [112, 110, 98]); px(67, y + 1, [112, 110, 98]); }
    // pleated chest pockets with flaps, lower hip pockets
    const pocket = (x0, y0, w, h, flap, pleat) => {
      for (let x = x0; x <= x0 + w; x++) { P.mul(x, y0 + flap, 0.62); P.mul(x, y0 + flap + 1, 1.12); P.mul(x, y0 + h, 0.62); }
      vline(x0, y0, y0 + h, 0.72); vline(x0 + w, y0, y0 + h, 0.72); hline(x0, x0 + w, y0, 0.78);
      mulr(x0 + 1, y0 + 1, x0 + w - 1, y0 + flap - 1, 1.04);
      if (pleat) { const cx = x0 + (w >> 1); vline(cx, y0 + flap + 2, y0 + h - 1, 0.74); vline(cx + 1, y0 + flap + 2, y0 + h - 1, 1.1); }
      const bx = x0 + (w >> 1); px(bx, y0 + flap - 1, [186, 184, 168]); px(bx + 1, y0 + flap - 1, [186, 184, 168]); px(bx, y0 + flap, [96, 94, 84]);
    };
    pocket(44, 34, 16, 24, 8, true); pocket(69, 34, 16, 24, 8, true);
    pocket(36, 99, 20, 24, 7, false); pocket(73, 99, 20, 24, 7, false);
    // shoulder boards
    for (const x0 of [30, 91]) { for (let y = 14; y < 31; y++) for (let x = x0; x < x0 + 7; x++) px(x, y, col(base, 0.62 + rr() * 0.08)); vline(x0, 14, 30, 1.5); vline(x0 + 6, 14, 30, 1.5); hline(x0, x0 + 6, 14, 1.4); px(x0 + 3, 16, [182, 180, 164]); }
    // back: centre seam and yoke seam
    vline(0, 10, 127, 0.7); vline(127, 10, 127, 0.7); vline(1, 10, 127, 1.08); hline(88, 127, 40, 0.76); hline(0, 40, 40, 0.76); hline(88, 127, 41, 1.08); hline(0, 40, 41, 1.08);
  }, { clamp: true });
  // ---- trousers 32x32 (v = 0 at the knee, 1 at the hip)
  U.trouser = tex(32, 32, P => {
    const rr = rng(seed + 10), b = blotch(rng(seed + 11), 4);
    P.fill((x, y) => col(base, cloth(rr, b, x, y, 32, 32) * 0.92));
    for (let y = 0; y < 32; y++) { P.mul(16, y, 0.78); P.mul(17, y, 1.1); P.mul(0, y, 0.8); P.mul(31, y, 0.8); }
    for (let k = 0; k < 5; k++) { const y = 20 + ((rr() * 10) | 0), x0 = (rr() * 20) | 0; for (let x = x0; x < x0 + 9; x++) { P.mul(x, y, 0.85); P.mul(x, y + 1, 1.06); } }
  });
  // ---- sleeves 32x32 (elbow creases at both ends, since upper arm and forearm share it)
  U.sleeve = tex(32, 32, P => {
    const rr = rng(seed + 20), b = blotch(rng(seed + 21), 4);
    P.fill((x, y) => col(base, cloth(rr, b, x, y, 32, 32)));
    for (const y0 of [1, 27]) for (let k = 0; k < 4; k++) { const y = y0 + k, x0 = (rr() * 14) | 0; for (let x = x0; x < x0 + 14 + ((rr() * 6) | 0); x++) P.mul(x, y, k & 1 ? 1.07 : 0.82); }
    for (let y = 0; y < 32; y++) { P.mul(0, y, 0.78); P.mul(1, y, 1.06); }
  });
  return U;
}

// ---- face + matching plain skin. x = 32 / 128 is the middle of the face, rows run crown -> chin
function makeFace(seed, tone, hair, eye, o = {}) {
  const T = {};
  T.skin = tex(16, 16, P => { const rr = rng(seed + 50), b = blotch(rng(seed + 51), 4); P.fill((x, y) => col(tone, 0.92 + (b(x, y, 16, 16) - 0.5) * 0.14 + rr() * 0.05)); });
  T.head = tex(128, 64, P => {
    const rr = rng(seed), b = blotch(rng(seed + 1), 8), b2 = blotch(rng(seed + 2), 20);
    const hairAt = (x, y) => {
      const dx = Math.abs(((x + 64) % 128) - 64 - 32 + 32 - 32);                        // distance from the face centre (x = 32), wrapped
      const dd = Math.min(Math.abs(x - 32), 128 - Math.abs(x - 32));
      const hl = dd < 15 ? 17 + dd * 0.13 : dd < 23 ? 19 + (dd - 15) * 1.4 : 30;       // hairline: forehead, temples, then above the ears
      if (y < hl) return 1;
      if (dd > 40 && y < 47) return 1;                                                 // back of the head
      if (dd > 23 && y < 41) return 0.45;                                              // clipped sides
      if (dd > 40 && y < 53) return 0.4;                                               // nape
      return 0;
    };
    P.fill((x, y) => {
      const dd = Math.min(Math.abs(x - 32), 128 - Math.abs(x - 32));
      let v = 0.94 + (b(x, y, 128, 64) - 0.5) * 0.12 + (b2(x, y, 128, 64) - 0.5) * 0.06 + rr() * 0.04;
      v -= y > 54 ? (y - 54) * 0.03 : 0; v -= dd > 20 ? (dd - 20) * 0.004 : 0;
      let c = col(tone, v);
      const h = hairAt(x, y);
      if (h) { const hv = 0.78 + rr() * 0.4 + (b(x, y, 128, 64) - 0.5) * 0.3; const hc = col(hair, hv); c = [lerp(c[0], hc[0], h), lerp(c[1], hc[1], h), lerp(c[2], hc[2], h)]; }
      return c;
    });
    const px = (x, y, c) => P.setc(x, y, c[0], c[1], c[2]);
    const mulr = (x0, y0, x1, y1, f) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) P.mul(x, y, f); };
    // cheeks flush, temples, under-eye
    for (const cx of [24, 40]) for (let y = 34; y < 46; y++) for (let x = cx - 5; x < cx + 6; x++) { const d = Math.hypot(x - cx, (y - 40) * 1.2); if (d < 5) { const i = (y * 128 + x) * 4; px(x, y, [tone[0] * (1.02 + 0.06 * (1 - d / 5)), tone[1] * (0.93 - 0.05 * (1 - d / 5)), tone[2] * (0.92 - 0.05 * (1 - d / 5))]); } }
    // forehead lines
    for (const y of [21, 23]) for (let x = 24; x <= 40; x++) if (rr() < 0.8) P.mul(x, y, 0.93);
    // eyes (viewer-left eye = x 21..28, other = x 36..43): lid, white, iris, pupil, lower lid shadow
    for (const ex of [21, 36]) {
      mulr(ex - 1, 29, ex + 8, 29, 0.8);
      for (let x = ex; x < ex + 8; x++) px(x, 30, [52, 38, 34]);
      for (let x = ex + 1; x < ex + 7; x++) px(x, 31, [226, 222, 214]);
      px(ex, 31, [150, 100, 90]); px(ex + 7, 31, [186, 128, 112]);
      const ix = ex + 3; px(ix, 31, eye); px(ix + 1, 31, eye); px(ix, 30, [44, 32, 28]); px(ix + 1, 30, [44, 32, 28]);
      px(ix, 31, [eye[0] * 0.9, eye[1] * 0.9, eye[2] * 0.9]); P.setc(ix + 1, 31, eye[0], eye[1], eye[2]);
      px(ix + 1, 31, [20, 18, 18]);                                                                        // pupil
      for (let x = ex + 1; x < ex + 7; x++) P.mul(x, 32, 0.84);
      for (let x = ex; x < ex + 8; x++) P.mul(x, 33, 0.93);
    }
    // brows, slanting down towards the nose
    const bc = col(hair, 0.62);
    for (let x = 19; x <= 29; x++) { const y = x < 25 ? 27 : 28; px(x, y, bc); px(x, y - 1, [bc[0] * 1.2, bc[1] * 1.2, bc[2] * 1.2]); if (x > 21 && x < 28) px(x, y + 1, bc); }
    for (let x = 35; x <= 45; x++) { const y = x > 39 ? 27 : 28; px(x, y, bc); px(x, y - 1, [bc[0] * 1.2, bc[1] * 1.2, bc[2] * 1.2]); if (x > 36 && x < 43) px(x, y + 1, bc); }
    mulr(20, 30, 29, 30, 0.85);
    // nose: bridge, side planes, nostrils, shadow below
    for (let y = 30; y < 40; y++) { P.mul(30, y, 0.86); P.mul(34, y, 1.07); P.mul(31, y, 0.96); P.mul(33, y, 1.04); }
    mulr(29, 38, 35, 40, 0.92); mulr(30, 40, 34, 41, 1.06);
    px(29, 42, [86, 54, 46]); px(35, 42, [86, 54, 46]); px(30, 42, [110, 70, 60]); px(34, 42, [110, 70, 60]);
    mulr(28, 43, 36, 43, 0.74); mulr(31, 44, 33, 45, 0.9);
    // nasolabial folds, mouth, chin
    for (const x of [27, 37]) for (let y = 42; y < 48; y++) P.mul(x + (x < 32 ? -(y - 42) * 0.2 : (y - 42) * 0.2) | 0, y, 0.88);
    for (let x = 26; x <= 38; x++) px(x, 46, [156, 92, 82]);
    for (let x = 27; x <= 37; x++) px(x, 47, [88, 52, 48]);
    for (let x = 28; x <= 36; x++) { px(x, 48, [196, 120, 106]); if (x > 28 && x < 36) px(x, 49, [182, 108, 96]); }
    for (let x = 27; x <= 37; x++) P.mul(x, 50, 0.82);
    mulr(29, 53, 35, 56, 1.06); mulr(22, 56, 42, 58, 0.9); mulr(20, 59, 44, 63, 0.76);
    px(26, 47, [74, 44, 40]); px(38, 47, [74, 44, 40]);
    // stubble
    if (o.stubble) for (let y = 40; y < 62; y++) for (let x = 16; x < 49; x++) { if (y > 44 && y < 52 && x > 26 && x < 38) continue; if (rr() < o.stubble) P.mul(x, y, 0.8); }
    if (o.scar) for (let k = 0; k < 11; k++) { P.setc(41 + (k >> 2), 36 + k, tone[0] * 0.78 + 30, tone[1] * 0.6 + 14, tone[2] * 0.58 + 12); P.mul(42 + (k >> 2), 36 + k, 1.1); }
  }, { clamp: false });
  return T;
}
const lerp = (a, b, t) => a + (b - a) * t;

export function soldierTextures(T) {
  T.sUniforms = [makeUniform([66, 69, 76], [30, 34, 36], 300), makeUniform([86, 94, 86], [58, 66, 60], 340)];     // dark charcoal-black, field-grey
  T.sFaces = [
    makeFace(400, [214, 164, 134], [174, 138, 84], [86, 110, 150], { stubble: 0.0 }),
    makeFace(420, [190, 140, 108], [62, 44, 34], [96, 70, 44], { stubble: 0.22 }),
    makeFace(440, [222, 160, 132], [128, 82, 52], [100, 124, 98], { scar: true }),
    makeFace(460, [204, 152, 120], [34, 28, 26], [78, 100, 128], { stubble: 0.12 }),
  ];
  // black leather (boots, belt, pouches, straps) with scuffs and a sheen
  T.sBoot = tex(32, 32, P => {
    const rr = rng(500), b = blotch(rng(501), 6);
    P.fill((x, y) => { const sheen = Math.max(0, 1 - Math.abs(x - 12) / 5) * 0.55; const v = 0.8 + rr() * 0.22 + (b(x, y, 32, 32) - 0.5) * 0.5 + sheen; return [28 * v, 26 * v, 27 * v]; });
    for (let k = 0; k < 4; k++) { const y = 9 + k * 3; for (let x = 0; x < 32; x++) { P.mul(x, y, 0.7); P.mul(x, y + 1, 1.25); } }
  });
  T.sLeather = tex(32, 32, P => {
    const rr = rng(502), b = blotch(rng(503), 5);
    P.fill((x, y) => { const v = 0.75 + rr() * 0.3 + (b(x, y, 32, 32) - 0.5) * 0.5; return [40 * v, 32 * v, 28 * v]; });
    for (let x = 0; x < 32; x++) { P.mul(x, 3, 1.5); P.mul(x, 28, 1.5); }
  });
  T.sBelt = tex(64, 16, P => {
    const rr = rng(504);
    P.fill((x, y) => { const v = 0.8 + rr() * 0.3 + (y === 2 || y === 13 ? 0.9 : 0); return [30 * v, 26 * v, 24 * v]; });
    for (let x = 0; x < 64; x += 3) { P.set(x, 4, 12, 10, 10); P.set(x, 11, 12, 10, 10); }
  });
  T.sMetal = tex(16, 16, P => P.fill((x, y) => { const e = x < 2 || y < 2 || x > 13 || y > 13; const v = (e ? 1.15 : 0.75) + ((x * 7 + y * 3) % 5) * 0.03; return [158 * v, 156 * v, 146 * v]; }));
  T.sFelt = tex(16, 16, P => { const rr = rng(505), b = blotch(rng(506), 4); P.fill((x, y) => { const v = 0.8 + rr() * 0.25 + (b(x, y, 16, 16) - 0.5) * 0.3; return [88 * v, 92 * v, 80 * v]; }); });
  T.sCanvas = tex(32, 32, P => {
    const rr = rng(507), b = blotch(rng(508), 5);
    P.fill((x, y) => { const v = 0.82 + rr() * 0.16 + (b(x, y, 32, 32) - 0.5) * 0.3 + ((x & 1) ^ (y & 1) ? 0.04 : 0); return [92 * v, 96 * v, 78 * v]; });
    for (let x = 0; x < 32; x++) { P.mul(x, 10, 0.65); P.mul(x, 11, 1.15); }
    for (let y = 10; y < 22; y++) { P.mul(14, y, 0.7); P.mul(15, y, 0.7); }
  });
  // helmet: matt field-grey paint, scuffed. canvas bottom = crown, top = rim
  T.sStahl = tex(64, 32, P => {
    const rr = rng(510), b = blotch(rng(511), 6), b2 = blotch(rng(512), 14);
    P.fill((x, y) => { const v = 0.78 + rr() * 0.16 + (b(x, y, 64, 32) - 0.5) * 0.3 + (b2(x, y, 64, 32) - 0.5) * 0.2; return [84 * v, 90 * v, 88 * v]; });
    for (let k = 0; k < 40; k++) { const x = (rr() * 64) | 0, y = (rr() * 32) | 0; P.set(x, y, 130, 126, 116); }
    for (let x = 0; x < 64; x++) { P.mul(x, 0, 0.55); P.mul(x, 1, 0.8); }
  });
  T.sCap = tex(32, 32, P => {
    const rr = rng(520), b = blotch(rng(521), 5);
    P.fill((x, y) => { const v = 0.84 + rr() * 0.14 + (b(x, y, 32, 32) - 0.5) * 0.24 + (((x + y) & 3) === 0 ? 0.05 : 0); return [60 * v, 64 * v, 70 * v]; });
    for (let x = 0; x < 32; x++) { P.set(x, 31, 190, 190, 180); P.set(x, 30, 120, 120, 112); }
  });
  T.sBand = tex(32, 8, P => { const rr = rng(522); P.fill(() => { const v = 0.8 + rr() * 0.3; return [20 * v, 21 * v, 23 * v]; }); });
  T.sPeak = tex(16, 16, P => P.fill((x, y) => { const v = 0.7 + (x + y > 8 && x + y < 13 ? 1.2 : 0) + ((x * 3 + y) % 4) * 0.03; return [22 * v, 22 * v, 24 * v]; }));
  return T;
}
