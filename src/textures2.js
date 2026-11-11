// Higher-detail textures layered over the originals (same names where they replace one).
import { tex, blotch, rng } from './textures.js';

export function upgradeTextures(T) {
  // ---- big weathered bricks (walls)
  T.stone = tex(128, 128, P => {
    const rr = rng(102), b1 = blotch(rng(103), 5), b2 = blotch(rng(104), 13);
    const shade = []; for (let i = 0; i < 32; i++) shade.push([rr(), rr()]);
    P.fill((x, y) => {
      const row = y >> 4, off = (row & 1) * 16, xx = (x + off) & 127, col = xx >> 5, fx = xx & 31, fy = y & 15;
      const s = shade[row * 4 + col], grime = 0.7 + 0.55 * b1(x, y, 128, 128);
      if (fx < 2 || fy < 2) { const v = (46 + rr() * 16) * grime; return [v, v * 0.97, v * 0.93]; }
      let v = 108 + (s[0] - 0.5) * 50 + (rr() - 0.5) * 22 + (b2(x, y, 128, 128) - 0.5) * 34;
      if (fx === 2 || fy === 2) v += 14;
      if (fx === 31 || fy === 15) v -= 22;
      if (rr() < 0.012) v -= 30;
      v *= grime;
      return [v * (0.98 + s[1] * 0.1), v * 0.92, v * (0.94 + (1 - s[1]) * 0.1)];
    });
  });

  // ---- stained plaster with cracks and a few exposed-brick patches
  T.plaster = tex(128, 128, P => {
    const rr = rng(110), b1 = blotch(rng(111), 4), b2 = blotch(rng(112), 9), b3 = blotch(rng(113), 21);
    P.fill((x, y) => {
      const v = 152 + (b1(x, y, 128, 128) - 0.5) * 54 + (b2(x, y, 128, 128) - 0.5) * 30 + (b3(x, y, 128, 128) - 0.5) * 16 + (rr() - 0.5) * 9;
      return [v, v * 0.95, v * 0.83];
    });
    for (let k = 0; k < 8; k++) {
      let x = (rr() * 128) | 0, y = (rr() * 128) | 0;
      const n = 22 + rr() * 34;
      for (let i = 0; i < n; i++) { P.mul(x & 127, y & 127, 0.58); P.mul((x + 1) & 127, y & 127, 0.86); y++; if (rr() < 0.4) x += rr() < 0.5 ? -1 : 1; }
    }
  });

  // ---- irregular cobblestones
  T.cobble = tex(128, 128, P => {
    const rr = rng(120), N = 10, cs = 12.8, pts = [];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) pts.push([(i + 0.2 + rr() * 0.6) * cs, (j + 0.2 + rr() * 0.6) * cs, rr()]);
    const b1 = blotch(rng(121), 5);
    P.fill((x, y) => {
      let d1 = 1e9, d2 = 1e9, s = 0;
      const ci = Math.floor(x / cs), cj = Math.floor(y / cs);
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const p = pts[((cj + dj + N) % N) * N + ((ci + di + N) % N)];
        let dx = p[0] - x, dy = p[1] - y; dx -= Math.round(dx / 128) * 128; dy -= Math.round(dy / 128) * 128;
        const d = Math.hypot(dx, dy);
        if (d < d1) { d2 = d1; d1 = d; s = p[2]; } else if (d < d2) d2 = d;
      }
      const edge = d2 - d1, g = 0.78 + 0.4 * b1(x, y, 128, 128);
      if (edge < 1.5) return [30 * g, 29 * g, 28 * g];
      const v = (98 + (s - 0.5) * 60 + (rr() - 0.5) * 16 + Math.min(edge, 5) * 3.2 - d1 * 1.3) * g;
      return [v, v * 0.97, v * 0.91];
    });
  });

  // ---- weapons
  T.gunmetal = tex(32, 32, P => {
    const rr = rng(130), b = blotch(rng(131), 7);
    P.fill((x, y) => { const v = 0.62 + b(x, y, 32, 32) * 0.7 + (rr() < 0.1 ? 0.3 : 0) + (rr() - 0.5) * 0.16; return [52 * v, 56 * v, 68 * v]; });
  });
  T.gunwood = tex(32, 32, P => {
    const rr = rng(132), b = blotch(rng(133), 5);
    P.fill((x, y) => { const v = 0.74 + Math.sin(y * 1.9 + b(x, y, 32, 32) * 7) * 0.1 + b(x, y, 32, 32) * 0.3 + (rr() - 0.5) * 0.1; return [128 * v, 76 * v, 40 * v]; });
  });
  T.skin = tex(16, 16, P => {
    const rr = rng(134), b = blotch(rng(135), 4);
    P.fill((x, y) => { const v = 0.9 + b(x, y, 16, 16) * 0.14 + (rr() - 0.5) * 0.05; return [222 * v, 164 * v, 132 * v]; });
  });

  // ---- soldiers: charcoal uniform, wrap-around textures (u = 0.5 is the front)
  const cloth = (rr, b, x, y, w, h) => (0.8 + rr() * 0.14 + (b(x, y, w, h) - 0.5) * 0.24);
  T.cloth = tex(16, 16, P => { const rr = rng(140), b = blotch(rng(141), 4); P.fill((x, y) => { const v = cloth(rr, b, x, y, 16, 16); return [62 * v, 64 * v, 72 * v]; }); });
  T.trouser = tex(16, 16, P => { const rr = rng(142), b = blotch(rng(143), 4); P.fill((x, y) => { const v = cloth(rr, b, x, y, 16, 16) * (x === 8 ? 0.8 : 1); return [54 * v, 56 * v, 64 * v]; }); });
  T.boot = tex(16, 16, P => { const rr = rng(144); P.fill((x, y) => { const v = 0.8 + rr() * 0.25 + (x > 6 && x < 9 ? 1.4 : 0) + (y > 13 ? 0.4 : 0); return [24 * v, 23 * v, 24 * v]; }); });
  T.tunic = tex(64, 64, P => {
    const rr = rng(145), b = blotch(rng(146), 6);
    P.fill((x, y) => { const side = Math.abs(Math.cos((x / 64 - 0.5) * 2 * Math.PI)); const v = cloth(rr, b, x, y, 64, 64) * (0.8 + side * 0.24); return [62 * v, 64 * v, 72 * v]; });
    const line = (x0, y0, x1, y1, f) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let i = 0; i <= n; i++) P.mul(Math.round(x0 + (x1 - x0) * i / n) & 63, Math.round(y0 + (y1 - y0) * i / n), f); };
    for (let x = 20; x <= 44; x++) for (let y = 0; y < 5; y++) P.set(x, y, 30, 34, 36);                 // collar
    for (const x0 of [25, 36]) for (let x = x0; x < x0 + 3; x++) for (let y = 1; y < 4; y++) P.set(x, y, 168, 168, 160); // collar tabs
    line(32, 5, 32, 63, 0.55);                                                                           // front opening
    for (const y of [9, 19, 29, 39, 49]) { P.set(33, y, 176, 174, 160); P.set(34, y, 120, 118, 110); }  // buttons
    for (const x0 of [19, 37]) {                                                                         // pockets
      line(x0, 17, x0 + 8, 17, 0.55); line(x0, 18, x0 + 8, 18, 1.25); line(x0, 17, x0, 29, 0.7); line(x0 + 8, 17, x0 + 8, 29, 0.7); line(x0, 29, x0 + 8, 29, 0.6);
      P.set(x0 + 4, 20, 170, 168, 156);
      line(x0 - 1, 44, x0 + 9, 44, 0.55); line(x0 - 1, 45, x0 + 9, 45, 1.2); line(x0 - 1, 44, x0 - 1, 60, 0.7); line(x0 + 9, 44, x0 + 9, 60, 0.7);
    }
    for (const [x0, x1] of [[23, 28], [41, 36]]) for (const d of [0, 1]) {                               // leather Y-straps
      const n = 58; for (let i = 0; i <= n; i++) P.set(Math.round(x0 + (x1 - x0) * i / n) + d, 5 + i, 22, 19, 17);
    }
    for (const x0 of [12, 48]) for (let x = x0; x < x0 + 5; x++) for (let y = 0; y < 3; y++) P.set(x, y, 150, 150, 144); // shoulder boards
  }, { clamp: true });
  T.belt = tex(64, 8, P => {
    const rr = rng(147);
    P.fill((x, y) => { const v = 0.8 + rr() * 0.3 + (y === 1 ? 0.7 : 0); return [26 * v, 22 * v, 20 * v]; });
    for (let x = 30; x < 35; x++) for (let y = 1; y < 7; y++) P.set(x, y, 178, 176, 162);
    for (let x = 31; x < 34; x++) for (let y = 2; y < 6; y++) P.set(x, y, 120, 120, 112);
    for (const x0 of [22, 40]) for (let x = x0; x < x0 + 4; x++) for (let y = 0; y < 8; y++) P.set(x, y, 34, 28, 22); // ammo pouches
  });
  // head: u = 0.25 is the face (sphere mapping), rows run crown -> chin
  T.head = tex(64, 32, P => {
    const rr = rng(150);
    P.fill((x, y) => {
      const front = Math.cos((x / 64 - 0.25) * 2 * Math.PI);
      const hair = y < 7 || (front < -0.1 && y < 20) || (front < 0.3 && y < 12);
      if (hair) { const h = 0.8 + rr() * 0.35; return [56 * h, 42 * h, 32 * h]; }
      const v = 0.86 + rr() * 0.06 + front * 0.12 - (y > 23 ? (y - 23) * 0.035 : 0);
      return [214 * v, 160 * v, 128 * v];
    });
    for (const x of [11, 12, 13, 19, 20, 21]) { P.set(x, 13, 74, 52, 40); P.mul(x, 14, 0.82); }          // brows + sockets
    P.set(12, 15, 236, 232, 222); P.set(13, 15, 44, 34, 30); P.set(19, 15, 44, 34, 30); P.set(20, 15, 236, 232, 222);
    P.mul(11, 15, 0.8); P.mul(21, 15, 0.8); P.mul(12, 16, 0.88); P.mul(13, 16, 0.88); P.mul(19, 16, 0.88); P.mul(20, 16, 0.88);
    for (let y = 15; y < 19; y++) { P.mul(17, y, 0.84); P.mul(16, y, 1.06); }                             // nose
    P.mul(15, 19, 0.74); P.mul(16, 19, 0.86); P.mul(17, 19, 0.74);
    for (let x = 14; x <= 18; x++) P.set(x, 22, 142, 84, 74);                                             // mouth
    P.mul(15, 23, 0.9); P.mul(16, 23, 0.86); P.mul(17, 23, 0.9);
    for (let x = 11; x <= 21; x++) for (let y = 24; y < 27; y++) P.mul(x, y, 0.93);                       // jaw shadow
    for (const x of [0, 1, 31, 32]) for (let y = 14; y < 19; y++) P.set(x, y, 190, 128, 104);            // ears
  });
  T.helmet = tex(32, 16, P => {
    const rr = rng(151), b = blotch(rng(152), 5);
    P.fill((x, y) => { const v = 0.74 + b(x, y, 32, 16) * 0.36 + (rr() - 0.5) * 0.1 + (y > 9 && y < 12 ? 0.22 : 0) - (y < 2 ? 0.2 : 0); return [92 * v, 98 * v, 102 * v]; });
  });
  // peaked cap: lathe mapping, u = 0 is the front, canvas top = lower band
  T.cap = tex(32, 16, P => {
    const rr = rng(153);
    P.fill((x, y) => { const v = 0.8 + rr() * 0.3; return y < 5 ? [22 * v, 24 * v, 26 * v] : [50 * v, 52 * v, 60 * v]; });
    for (let x = 0; x < 32; x++) { P.set(x, 5, 150, 150, 142); P.set(x, 0, 120, 120, 112); }
    for (const x of [31, 0, 1]) { P.set(x, 2, 180, 178, 164); P.set(x, 3, 180, 178, 164); P.set(x, 8, 170, 168, 156); }
    P.set(30, 8, 170, 168, 156); P.set(2, 8, 170, 168, 156);
  });
  return T;
}
