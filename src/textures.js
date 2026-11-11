import * as THREE from 'three';

export function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- 3x5 pixel font ----
export const FONT = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
  E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
  I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
  Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111',
  0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
  4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010',
  8: '111101111101111', 9: '111101111001110',
  '.': '000000000000010', ':': '000010000010000', '-': '000000111000000', '/': '001001010100100',
  '!': '010010010000010', "'": '010010000000000', ',': '000000000010100', '+': '000010111010000',
};
export function drawText(plot, str, x, y, s = 1) {
  str = String(str).toUpperCase();
  let cx = x;
  for (const ch of str) {
    const g = FONT[ch];
    if (g) for (let i = 0; i < 15; i++) if (g[i] === '1') plot(cx + (i % 3) * s, y + ((i / 3) | 0) * s, s);
    cx += 4 * s;
  }
  return cx;
}
export const textW = (str, s = 1) => String(str).length * 4 * s - s;


// ---- 5x7 pixel font (HUD) ----
const F5 = {
  A: '01110 10001 10001 11111 10001 10001 10001', B: '11110 10001 10001 11110 10001 10001 11110',
  C: '01110 10001 10000 10000 10000 10001 01110', D: '11110 10001 10001 10001 10001 10001 11110',
  E: '11111 10000 10000 11110 10000 10000 11111', F: '11111 10000 10000 11110 10000 10000 10000',
  G: '01110 10001 10000 10111 10001 10001 01111', H: '10001 10001 10001 11111 10001 10001 10001',
  I: '01110 00100 00100 00100 00100 00100 01110', J: '00111 00010 00010 00010 00010 10010 01100',
  K: '10001 10010 10100 11000 10100 10010 10001', L: '10000 10000 10000 10000 10000 10000 11111',
  M: '10001 11011 10101 10101 10001 10001 10001', N: '10001 11001 10101 10011 10001 10001 10001',
  O: '01110 10001 10001 10001 10001 10001 01110', P: '11110 10001 10001 11110 10000 10000 10000',
  Q: '01110 10001 10001 10001 10101 10010 01101', R: '11110 10001 10001 11110 10100 10010 10001',
  S: '01111 10000 10000 01110 00001 00001 11110', T: '11111 00100 00100 00100 00100 00100 00100',
  U: '10001 10001 10001 10001 10001 10001 01110', V: '10001 10001 10001 10001 10001 01010 00100',
  W: '10001 10001 10001 10101 10101 11011 10001', X: '10001 10001 01010 00100 01010 10001 10001',
  Y: '10001 10001 01010 00100 00100 00100 00100', Z: '11111 00001 00010 00100 01000 10000 11111',
  0: '01110 10001 10011 10101 11001 10001 01110', 1: '00100 01100 00100 00100 00100 00100 01110',
  2: '01110 10001 00001 00010 00100 01000 11111', 3: '11110 00001 00001 01110 00001 00001 11110',
  4: '00010 00110 01010 10010 11111 00010 00010', 5: '11111 10000 11110 00001 00001 10001 01110',
  6: '00110 01000 10000 11110 10001 10001 01110', 7: '11111 00001 00010 00100 01000 01000 01000',
  8: '01110 10001 10001 01110 10001 10001 01110', 9: '01110 10001 10001 01111 00001 00010 01100',
  '.': '00000 00000 00000 00000 00000 01100 01100', ':': '00000 01100 01100 00000 01100 01100 00000',
  '-': '00000 00000 00000 11111 00000 00000 00000', '/': '00001 00001 00010 00100 01000 10000 10000',
  '!': '00100 00100 00100 00100 00100 00000 00100', "'": '00100 00100 00000 00000 00000 00000 00000',
  ',': '00000 00000 00000 00000 01100 00100 01000', '+': '00000 00100 00100 11111 00100 00100 00000',
};
for (const k in F5) F5[k] = F5[k].replace(/ /g, '');
export function drawText5(plot, str, x, y, s = 1) {
  str = String(str).toUpperCase();
  let cx = x;
  for (const ch of str) {
    const g = F5[ch];
    if (g) for (let i = 0; i < 35; i++) if (g[i] === '1') plot(cx + (i % 5) * s, y + ((i / 5) | 0) * s, s);
    cx += 6 * s;
  }
  return cx;
}
export const textW5 = (str, s = 1) => String(str).length * 6 * s - s;

export function tex(w, h, paint, o = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  const img = g.createImageData(w, h); const d = img.data;
  const P = {
    w, h,
    set(x, y, r, gg, b, a = 255) {
      x = ((x % w) + w) % w; y = ((y % h) + h) % h;
      const i = (y * w + x) * 4; d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = a;
    },
    setc(x, y, r, gg, b, a = 255) { if (x >= 0 && y >= 0 && x < w && y < h) P.set(x, y, r, gg, b, a); },
    mul(x, y, f) {
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      const i = (y * w + x) * 4; d[i] *= f; d[i + 1] *= f; d[i + 2] *= f;
    },
    fill(fn) { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = fn(x, y); P.set(x, y, c[0], c[1], c[2], c[3] === undefined ? 255 : c[3]); } },
    text(str, x, y, s, r, gg, b) { drawText((px, py, sz) => { for (let j = 0; j < sz; j++) for (let i = 0; i < sz; i++) P.setc(px + i, py + j, r, gg, b); }, str, x, y, s); },
  };
  paint(P);
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.wrapS = t.wrapT = o.clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  return t;
}

// blocky value-noise helper
export function blotch(r, n) {
  const g = []; for (let i = 0; i < n * n; i++) g.push(r());
  return (x, y, w, h) => {
    const fx = (x / w) * n, fy = (y / h) * n;
    const x0 = Math.floor(fx) % n, y0 = Math.floor(fy) % n, x1 = (x0 + 1) % n, y1 = (y0 + 1) % n;
    const tx = fx - Math.floor(fx), ty = fy - Math.floor(fy);
    const a = g[y0 * n + x0] * (1 - tx) + g[y0 * n + x1] * tx;
    const b = g[y1 * n + x0] * (1 - tx) + g[y1 * n + x1] * tx;
    return a * (1 - ty) + b * ty;
  };
}

function blocks(P, r, bw, bh, base, tint, mortar, vary = 34) {
  const cols = P.w / bw, rows = P.h / bh;
  const shade = []; for (let i = 0; i < cols * rows; i++) shade.push(r());
  P.fill((x, y) => {
    const row = Math.floor(y / bh), off = (row % 2) * (bw / 2);
    const xx = (x + off) % P.w, cx = Math.floor(xx / bw), fx = xx % bw, fy = y % bh;
    if (fx === 0 || fy === 0) return mortar;
    let v = base + (shade[row * cols + cx] - 0.5) * vary + (r() - 0.5) * 18;
    if (fx === 1 || fy === 1) v += 12;
    if (fx === bw - 1 || fy === bh - 1) v -= 16;
    return [v * tint[0], v * tint[1], v * tint[2]];
  });
}

function planks(P, r, pw, base, vertical = true, gap = 0.45) {
  const n = (vertical ? P.w : P.h) / pw;
  const shade = []; for (let i = 0; i < n; i++) shade.push(r());
  P.fill((x, y) => {
    const a = vertical ? x : y, b = vertical ? y : x;
    const k = Math.floor(a / pw), f = a % pw;
    let v = 1 + (shade[k] - 0.5) * 0.3 + (r() - 0.5) * 0.12 + Math.sin(b * 0.9 + k * 5 + f * 1.7) * 0.06;
    if (f === 0) v *= gap;
    if (f === pw - 1) v *= 0.85;
    return [base[0] * v, base[1] * v, base[2] * v];
  });
}

export function makeTextures() {
  const T = {};
  let r = rng(11);

  T.white = tex(4, 4, P => P.fill(() => [255, 255, 255]));

  T.cobble = tex(64, 64, P => blocks(P, rng(1), 8, 8, 118, [1, 0.97, 0.9], [34, 32, 30], 46));
  T.stone = tex(64, 64, P => blocks(P, rng(2), 16, 8, 128, [1, 0.95, 0.84], [48, 44, 38], 30));
  T.stoneDark = tex(32, 32, P => blocks(P, rng(3), 16, 16, 92, [1, 0.97, 0.9], [36, 34, 30], 20));

  T.plaster = tex(64, 64, P => {
    const rr = rng(4), b = blotch(rr, 6);
    P.fill((x, y) => { const v = 0.8 + b(x, y, 64, 64) * 0.3 + (rr() - 0.5) * 0.07; return [198 * v, 176 * v, 132 * v]; });
    for (let k = 0; k < 5; k++) { // cracks
      let x = (rr() * 64) | 0, y = (rr() * 64) | 0;
      for (let i = 0; i < 14; i++) { P.mul((x + 64) % 64, (y + 64) % 64, 0.68); y++; if (rr() < 0.5) x += rr() < 0.5 ? -1 : 1; }
    }
  });

  T.planks = tex(32, 32, P => planks(P, rng(5), 8, [118, 84, 50]));
  T.crate = tex(32, 32, P => {
    const rr = rng(6);
    planks(P, rr, 8, [128, 96, 56], false);
    for (let i = 0; i < 32; i++) for (let t = 0; t < 3; t++) { // frame + brace
      const c = 150 + (rr() - 0.5) * 20;
      for (const [x, y] of [[i, t], [i, 31 - t], [t, i], [31 - t, i]]) P.set(x, y, c, c * 0.74, c * 0.44);
      if (t < 2 && i > 2 && i < 29) P.set(i, clamp(i + t, 0, 31), c * 0.9, c * 0.66, c * 0.4);
    }
    for (let i = 0; i < 32; i++) { P.mul(i, 3, 0.6); P.mul(3, i, 0.6); }
    for (const [x, y] of [[1, 1], [30, 1], [1, 30], [30, 30]]) P.set(x, y, 40, 36, 30);
  });
  T.ammo = tex(32, 32, P => {
    const rr = rng(7);
    planks(P, rr, 8, [78, 88, 52], false, 0.6);
    for (let i = 0; i < 32; i++) for (const [x, y] of [[i, 0], [i, 31], [0, i], [31, i]]) P.set(x, y, 46, 52, 32);
    P.text('7.92', 9, 8, 1, 222, 214, 170);
    P.text('MM', 12, 16, 1, 222, 214, 170);
    for (let x = 6; x < 26; x++) P.set(x, 24, 222, 214, 170);
  });

  T.roof = tex(32, 32, P => {
    const rr = rng(8);
    P.fill((x, y) => {
      const row = Math.floor(y / 8), fx = (x + (row % 2) * 4) % 8, fy = y % 8;
      let v = 0.75 + fy * 0.05 + (rr() - 0.5) * 0.12;
      if (fx === 0) v *= 0.6;
      if (fy === 0) v *= 0.5;
      return [124 * v, 58 * v, 42 * v];
    });
  });

  const windowTex = lit => tex(32, 48, P => {
    const rr = rng(lit ? 9 : 10);
    P.fill((x, y) => {
      if (x < 2 || x > 29 || y < 2 || y > 45) { const v = 120 + (rr() - 0.5) * 20; return [v, v * 0.95, v * 0.85]; }
      if (x < 4 || x > 27 || y < 4 || y > 43) return [52, 36, 22];
      if (x === 15 || x === 16 || y === 17 || y === 30) return [58, 40, 24];
      if (lit) {
        const curtain = Math.abs(x - 15.5) > 8 - (y - 4) * 0.08;
        const v = 0.82 + (rr() - 0.5) * 0.08 - (y / 48) * 0.15;
        return curtain ? [196 * v, 120 * v, 60 * v] : [255 * v, 216 * v, 128 * v];
      }
      const s = ((x + y) % 23 < 3) ? 26 : 0;
      return [16 + s, 22 + s, 38 + s * 1.2];
    });
  }, { clamp: true });
  T.winLit = windowTex(true);
  T.winDark = windowTex(false);

  T.door = tex(32, 64, P => {
    const rr = rng(12);
    planks(P, rr, 8, [92, 62, 36]);
    for (let x = 0; x < 32; x++) for (const y of [9, 10, 11, 50, 51, 52]) P.set(x, y, 44 + rr() * 8, 44, 48);
    for (let y = 0; y < 64; y++) { P.set(0, y, 40, 28, 16); P.set(31, y, 40, 28, 16); }
    for (let x = 0; x < 32; x++) { P.set(x, 0, 40, 28, 16); }
    for (let y = 30; y < 35; y++) for (let x = 24; x < 27; x++) P.set(x, y, 190, 160, 70);
  }, { clamp: true });

  T.gate = tex(64, 64, P => {
    const rr = rng(13);
    planks(P, rr, 8, [84, 58, 34]);
    for (let x = 0; x < 64; x++) for (const y of [8, 9, 10, 11, 52, 53, 54, 55]) P.set(x, y, 40 + rr() * 8, 40, 46);
    for (let i = 4; i < 28; i++) for (let t = 0; t < 3; t++) { // Z braces
      const y = 12 + Math.floor((i - 4) * 40 / 24) + t;
      P.set(i, y, 62, 42, 24); P.set(63 - i, y, 62, 42, 24);
    }
    for (let y = 0; y < 64; y++) { P.set(31, y, 14, 10, 8); P.set(32, y, 14, 10, 8); }
    for (let x = 4; x < 64; x += 8) for (const y of [9, 54]) P.set(x, y, 110, 110, 116);
  }, { clamp: true });

  T.metal = tex(16, 16, P => { const rr = rng(14); P.fill((x, y) => { const v = 1 + (rr() - 0.5) * 0.2 + (y < 3 ? 0.35 : 0) - (y > 12 ? 0.2 : 0); return [62 * v, 63 * v, 68 * v]; }); });
  T.iron = tex(16, 16, P => { const rr = rng(15); P.fill(() => { const v = 1 + (rr() - 0.5) * 0.3; return [44 * v, 44 * v, 48 * v]; }); });
  T.gunwood = tex(32, 16, P => {
    const rr = rng(16);
    P.fill((x, y) => { const v = 1 + Math.sin(y * 2.1 + Math.sin(x * 0.3) * 2) * 0.12 + (rr() - 0.5) * 0.12 + (y < 3 ? 0.18 : 0); return [128 * v, 74 * v, 36 * v]; });
  });

  T.barrel = tex(32, 32, P => {
    const rr = rng(17);
    planks(P, rr, 4, [112, 78, 44]);
    for (let x = 0; x < 32; x++) for (const y of [4, 5, 6, 25, 26, 27]) { const v = 46 + rr() * 12; P.set(x, y, v, v, v + 6); }
  });
  T.sandbag = tex(32, 16, P => {
    const rr = rng(18);
    P.fill((x, y) => {
      const ex = Math.min(x, 31 - x), ey = Math.min(y, 15 - y);
      let v = 0.72 + Math.min(ex, 5) * 0.035 + Math.min(ey, 4) * 0.05 + (rr() - 0.5) * 0.14;
      if ((ex === 0 && ey < 3) || (ey === 0 && ex < 3)) v *= 0.5;
      if ((x + y) % 3 === 0) v *= 0.93;
      return [156 * v, 140 * v, 100 * v];
    });
  }, { clamp: true });
  T.hay = tex(32, 32, P => {
    const rr = rng(19);
    P.fill((x, y) => { const v = 0.7 + rr() * 0.4 + ((x * 3 + y) % 5 === 0 ? 0.15 : 0); return [176 * v, 146 * v, 62 * v]; });
    for (let x = 0; x < 32; x++) for (const y of [9, 22]) P.set(x, y, 70, 54, 28);
  });
  T.bark = tex(16, 32, P => { const rr = rng(20); P.fill((x, y) => { const v = 0.75 + ((x * 7 + ((y / 5) | 0) * 3) % 4) * 0.1 + (rr() - 0.5) * 0.2; return [74 * v, 56 * v, 40 * v]; }); });
  T.dirt = tex(32, 32, P => { const rr = rng(21); P.fill(() => { const v = 0.8 + rr() * 0.35; return rr() < 0.12 ? [50 * v, 70 * v, 34 * v] : [88 * v, 68 * v, 46 * v]; }); });

  T.foliage = tex(64, 64, P => {
    const rr = rng(22);
    P.fill(() => [0, 0, 0, 0]);
    for (let k = 0; k < 16; k++) { // branches
      let x = 32, y = 63; const a = -Math.PI / 2 + (rr() - 0.5) * 1.9; const len = 22 + rr() * 22;
      for (let i = 0; i < len; i++) { P.setc(Math.round(x), Math.round(y), 52, 40, 30); x += Math.cos(a + Math.sin(i * 0.3) * 0.3); y += Math.sin(a) * 1; }
    }
    for (let k = 0; k < 46; k++) {
      const a = rr() * 6.283, d = Math.sqrt(rr()) * 24, cx = 32 + Math.cos(a) * d, cy = 28 + Math.sin(a) * d * 0.9, rad = 3 + rr() * 5;
      const g = 0.7 + rr() * 0.5;
      for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++)
        if (x * x + y * y <= rad * rad && rr() < 0.72) P.setc(Math.round(cx + x), Math.round(cy + y), 36 * g, (66 + y * 3) * g, 34 * g);
    }
  }, { clamp: true });

  T.poplar = tex(32, 64, P => {
    const rr = rng(23);
    P.fill((x, y) => {
      const w = y > 56 ? 1.5 : 3 + Math.sin(Math.min(1, y / 50) * Math.PI) * 10 + rr() * 2.5;
      return Math.abs(x - 15.5) < w ? [255, 255, 255, 255] : [0, 0, 0, 0];
    });
  }, { clamp: true });

  T.target = tex(32, 32, P => {
    const rr = rng(24);
    P.fill((x, y) => {
      const d = Math.hypot(x - 15.5, y - 15.5);
      if (d > 15.5) return [0, 0, 0, 0];
      const n = 1 - rr() * 0.12;
      if (d < 3) return [200 * n, 40 * n, 30 * n];
      const ring = Math.floor((d - 3) / 3.2) % 2 === 0;
      return ring ? [226 * n, 218 * n, 196 * n] : [30 * n, 30 * n, 34 * n];
    });
  }, { clamp: true });

  T.sky = tex(1024, 512, P => {
    const rr = rng(25), b = blotch(rr, 24);
    P.fill((x, y) => {
      if (y >= 256) return [12, 18, 34];
      const t = y / 256, t2 = t * t;
      let c = [4 + 8 * t2, 6 + 12 * t2, 16 + 18 * t2];
      // distant fires on the horizon
      const g1 = Math.max(0, 1 - Math.abs(x - 280) / 150) * Math.max(0, (y - 196) / 60);
      const g2 = Math.max(0, 1 - Math.abs(x - 610) / 90) * Math.max(0, (y - 212) / 44);
      const g = Math.min(1, g1 + g2 * 0.7); const gq = Math.floor(g * 6) / 6;
      c = [c[0] + 60 * gq, c[1] + 22 * gq, c[2] - 4 * gq];
      // cloud bands
      const cl = b(x, y * 5, 1024, 1024);
      if (cl > 0.62 && y > 60 && y < 236) { const k = 1 + (cl - 0.62) * 2.4; c = [c[0] * k + 5, c[1] * k + 6, c[2] * k + 9]; }
      return c;
    });
    for (let k = 0; k < 900; k++) {
      const x = (rr() * 1024) | 0, y = (rr() * 232) | 0, v = 70 + rr() * rr() * 185;
      P.set(x, y, v, v, Math.min(255, v + 25));
      if (rr() < 0.06) { P.set(x + 1, y, v, v, v); P.set(x, y + 1, v, v, v); P.set(x + 1, y + 1, v, v, v); }
    }
    const mx = 818, my = 176, ry = 13, rx = ry / Math.cos(28 * Math.PI / 180);
    for (let y = -30; y <= 30; y++) for (let x = -36; x <= 36; x++) {
      const d = Math.hypot(x / rx, y / ry);
      if (d <= 1) {
        const crater = Math.hypot((x + 4) / rx - 0.1, (y - 3) / ry) < 0.28 || Math.hypot(x / rx - 0.45, (y + 6) / ry) < 0.2 || Math.hypot(x / rx + 0.5, (y + 5) / ry + 0.1) < 0.16;
        const cr = crater ? 0.8 : 1; P.set(mx + x, my + y, 238 * cr, 236 * cr, 210 * cr);
      } else if (d < 2.1) { const f = Math.floor((2.1 - d) / 1.1 * 4) / 4 * 0.3; const X = mx + x, Y = my + y; P.set(X, Y, 10 + 90 * f, 15 + 96 * f, 30 + 100 * f); }
    }
  });

  T.olive = tex(16, 16, P => { const rr = rng(26); P.fill((x, y) => { const v = 0.85 + rr() * 0.25 - (y > 13 ? 0.2 : 0); return [74 * v, 84 * v, 52 * v]; }); });
  T.tarp = tex(32, 32, P => { const rr = rng(27); P.fill((x) => { const v = 0.8 + Math.sin(x * 0.8) * 0.12 + rr() * 0.12; return [104 * v, 104 * v, 72 * v]; }); });
  T.tire = tex(16, 16, P => { const rr = rng(28); P.fill((x) => { const v = (x % 4 < 2 ? 0.8 : 1.1) + rr() * 0.1; return [30 * v, 30 * v, 32 * v]; }); });
  T.glass = tex(16, 16, P => P.fill((x, y) => ((x + y) % 11 < 2 ? [70, 86, 110] : [22, 30, 46])));
  // darker and finer than before: 64 px, deep blue base with faint ripple streaks
  T.water = tex(64, 64, P => {
    const rr = rng(29);
    P.fill(() => [10, 19, 34]);
    for (let k = 0; k < 90; k++) { const x = (rr() * 64) | 0, y = (rr() * 64) | 0, l = 3 + ((rr() * 8) | 0); for (let i = 0; i < l; i++) P.set(x + i, y, 30, 46, 66); }
  });
  T.skin = tex(8, 8, P => { const rr = rng(30); P.fill((x, y) => { const v = 0.9 + rr() * 0.12 - (y > 5 ? 0.15 : 0); return [206 * v, 152 * v, 116 * v]; }); });
  T.sleeve = tex(16, 16, P => { const rr = rng(31); P.fill((x, y) => { const v = 0.85 + rr() * 0.2 + ((x + y * 2) % 5 === 0 ? -0.1 : 0); return [92 * v, 96 * v, 58 * v]; }); });
  T.brass = tex(4, 4, P => P.fill(() => [214, 170, 70]));

  T.flash = tex(32, 32, P => {
    const rr = rng(32);
    P.fill((x, y) => {
      const dx = x - 15.5, dy = y - 15.5, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      const lim = 5 + 10 * Math.pow(Math.abs(Math.cos(a * 2.5)), 6) + rr() * 2;
      if (d > lim) return [0, 0, 0, 0];
      const t = d / lim;
      return t < 0.35 ? [255, 255, 230, 255] : t < 0.7 ? [255, 220, 110, 255] : [255, 150, 40, 255];
    });
  }, { clamp: true });
  T.glow = tex(32, 32, P => P.fill((x, y) => { const d = Math.hypot(x - 15.5, y - 15.5) / 15.5; const a = Math.max(0, 1 - d); return [255, 255, 255, a * a * 255]; }), { clamp: true });
  T.hole = tex(16, 16, P => {
    const rr = rng(33);
    P.fill((x, y) => { const d = Math.hypot(x - 7.5, y - 7.5) + rr() * 1.6; return d < 2.6 ? [8, 8, 8, 255] : d < 4.6 ? [60, 56, 50, 255] : [0, 0, 0, 0]; });
  }, { clamp: true });
  T.lantern = tex(16, 16, P => P.fill((x, y) => (x === 0 || x === 15 || y === 0 || y === 15 || x === 7 || x === 8) ? [40, 34, 26] : [255, 214 - y * 4, 120 - y * 3]), { clamp: true });
  T.lampOff = tex(8, 8, P => P.fill(() => [150, 140, 100]));

  T.sign = tex(64, 32, P => {
    const rr = rng(34);
    planks(P, rr, 8, [176, 160, 120], false, 0.75);
    for (let i = 0; i < 64; i++) { P.set(i, 0, 30, 24, 18); P.set(i, 31, 30, 24, 18); }
    for (let i = 0; i < 32; i++) { P.set(0, i, 30, 24, 18); P.set(63, i, 30, 24, 18); }
    P.text('HALT!', 7, 6, 3, 150, 24, 20);
    P.text('SPERRGEBIET', 10, 24, 1, 30, 26, 22);
  }, { clamp: true });

  // --- soldiers + MP40
  const feld = (rr, x, y) => { const v = 0.84 + rr() * 0.22 - ((x + y * 3) % 7 === 0 ? 0.08 : 0); return [84 * v, 96 * v, 84 * v]; };
  T.feld = tex(16, 16, P => { const rr = rng(40); P.fill((x, y) => feld(rr, x, y)); });
  T.feldFront = tex(16, 16, P => {
    const rr = rng(41);
    P.fill((x, y) => feld(rr, x, y));
    for (let y = 0; y < 13; y++) P.mul(8, y, 0.62);
    for (const y of [2, 5, 8, 11]) P.set(9, y, 176, 172, 150);
    for (let x = 5; x < 11; x++) P.set(x, 0, 38, 50, 42);
    for (const x0 of [2, 11]) for (let x = x0; x < x0 + 3; x++) { P.mul(x, 3, 0.65); P.mul(x, 6, 0.8); }
    for (let x = 0; x < 16; x++) for (let y = 13; y < 16; y++) P.set(x, y, 30, 26, 22);
    for (let x = 7; x < 9; x++) for (let y = 13; y < 16; y++) P.set(x, y, 170, 168, 150);
  }, { clamp: true });
  T.face = tex(8, 8, P => {
    const rr = rng(42);
    P.fill((x, y) => { const v = 0.9 + rr() * 0.1 - (y < 2 ? 0.3 : 0) - (y > 6 ? 0.12 : 0); return [204 * v, 152 * v, 118 * v]; });
    P.set(2, 3, 30, 24, 22); P.set(5, 3, 30, 24, 22);
    P.set(3, 6, 120, 70, 60); P.set(4, 6, 120, 70, 60);
    P.mul(3, 4, 0.88); P.mul(4, 4, 0.88);
  }, { clamp: true });
  T.helmet = tex(8, 8, P => { const rr = rng(43); P.fill((x, y) => { const v = 0.85 + rr() * 0.2 + (y < 2 ? 0.2 : 0); return [56 * v, 64 * v, 60 * v]; }); });
  T.boot = tex(8, 8, P => { const rr = rng(44); P.fill(() => { const v = 0.8 + rr() * 0.4; return [30 * v, 27 * v, 24 * v]; }); });
  T.bakelite = tex(16, 16, P => { const rr = rng(45); P.fill((x, y) => { const v = 0.85 + rr() * 0.18 - (y % 4 === 0 ? 0.15 : 0); return [78 * v, 46 * v, 32 * v]; }); });

  return T;
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
