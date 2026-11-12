// Cover for soldiers. Cover points are made once from the level's collision blocks and pillars (a ring of points just
// outside each one), so any solid prop is cover with no level data. Whether a point is cover is decided against where
// the player is right now, with line-of-sight rays:
//   low cover  - his eye is hidden kneeling (ENEMY_TACTICS.hideH) but clear standing (standH): kneel to hide, stand to shoot
//   high cover - hidden even standing; he steps `peek` m sideways and leans out to shoot (lean = +1 his left, -1 his right)
//   blind      - hidden but he cannot shoot from it (used only when nothing else is near)
import { boxes, circles, player, enemies } from '../core/state.js';
import { ENEMY_TACTICS as T } from '../core/config.js';
import { camera } from '../render/renderer.js';
import { clearLine, seesPlayerFrom, walkable, segHitsBox, segHitsCircle } from './sight.js';
import { zoneOf } from './nav.js';

const BODY_R = 0.36;   // soldier collision radius (player/collide.js)
let POINTS = null, builtFor = -1;
const free = (x, z) => !boxes.some(b => x > b.x0 - BODY_R && x < b.x1 + BODY_R && z > b.z0 - BODY_R && z < b.z1 + BODY_R)
  && !circles.some(c => Math.hypot(x - c.cx, z - c.cz) < c.r + BODY_R);

function build() {
  const raw = [], o = T.offset;
  let src = null;   // the obstacle the points being made belong to
  const line = (x0, z0, x1, z1) => { const n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / T.spacing)); for (let i = 0; i <= n; i++) raw.push([x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n, src]); };
  for (const b of boxes) {
    if (Math.max(b.x1 - b.x0, b.z1 - b.z0) < T.minSize) continue;
    src = { box: b };
    const x0 = b.x0 - o, x1 = b.x1 + o, z0 = b.z0 - o, z1 = b.z1 + o;
    line(x0, z0, x1, z0); line(x1, z0, x1, z1); line(x1, z1, x0, z1); line(x0, z1, x0, z0);
  }
  for (const c of circles) {
    if (c.r * 2 < T.minSize) continue;
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; raw.push([c.cx + Math.sin(a) * (c.r + o), c.cz + Math.cos(a) * (c.r + o), { circle: c }]); }
  }
  const seen = new Set(); POINTS = [];
  for (const [x, z, s] of raw) {
    const key = Math.round(x / 0.4) + ',' + Math.round(z / 0.4);
    if (seen.has(key) || !free(x, z)) continue;
    seen.add(key); POINTS.push({ x, z, zone: zoneOf(x, z), ...s });
  }
  builtFor = boxes.length;
}
export function coverPoints() { if (!POINTS || builtFor !== boxes.length) build(); return POINTS; }

// is the point taken by another soldier (his chosen cover, or he stands on it)?
const claimed = (c, e) => enemies.some(o => o !== e && o.alive && ((o.cover && Math.hypot(o.cover.x - c.x, o.cover.z - c.z) < 1.2) || Math.hypot(o.x - c.x, o.z - c.z) < 0.9));
export const angDiff = (a, b) => { let d = (a - b) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return d; };

// what kind of cover point c is against the player right now, or null if it is no cover
function evaluate(c) {
  const ey = camera.position;
  if (clearLine(c.x, T.hideH, c.z, ey.x, ey.y, ey.z)) return null;
  if (seesPlayerFrom(c.x, c.z, T.standH)) return { x: c.x, z: c.z, low: true, px: c.x, pz: c.z, lean: 0 };
  // high cover: step out to one side (his left = (fz, -fx) when facing f) and lean round it
  const fx = player.x - c.x, fz = player.z - c.z, fl = Math.hypot(fx, fz) || 1, lx = fz / fl, lz = -fx / fl;
  const first = Math.random() < 0.5 ? 1 : -1;
  for (const s of [first, -first]) {
    const px = c.x + lx * s * T.peek, pz = c.z + lz * s * T.peek;
    if (free(px, pz) && walkable(c.x, c.z, px, pz, 0.25) && seesPlayerFrom(px, pz, T.standH)) return { x: c.x, z: c.z, low: false, px, pz, lean: s };
  }
  return { x: c.x, z: c.z, low: false, px: c.x, pz: c.z, lean: 0, blind: true };
}
// does soldier e's chosen cover still hide him from the player?
export function coverHolds(e) {
  const c = e.cover; if (!c) return false;
  if (Math.hypot(c.x - player.x, c.z - player.z) < T.minPlayerDist * 0.8) return false;
  const ey = camera.position;
  return !clearLine(c.x, c.low ? T.hideH : T.standH, c.z, ey.x, ey.y, ey.z);   // high cover: he hides standing
}

// picks cover for soldier e. mode: 'any' (best nearby), 'advance' (closer to the player than he is now, or a new spot),
// 'flank' (toward e.flankBearing, the bearing from the player he is swinging round to). Returns a cover object or null.
export function chooseCover(e, mode) {
  const pts = coverPoints(), ze = zoneOf(e.x, e.z), dEP = Math.hypot(e.x - player.x, e.z - player.z);
  const cands = [];
  for (const c of pts) {
    if (c.zone !== ze) continue;
    const dE = Math.hypot(c.x - e.x, c.z - e.z); if (dE > T.searchRadius) continue;
    const dP = Math.hypot(c.x - player.x, c.z - player.z); if (dP < T.minPlayerDist) continue;
    // cheap first test: its own obstacle (or one at its corner, grown a little) must lie between it and the player
    if (c.box ? !segHitsBox(c.x, c.z, player.x, player.z, c.box, 0.1) : !segHitsCircle(c.x, c.z, player.x, player.z, c.circle, 0.05)) continue;
    let s = -Math.abs(dP - e.range) * 0.6 - dE * 0.25;
    if (mode === 'advance') {
      if (dE < 1.5) continue;
      if (dEP > e.range) { if (dP > dEP - 2) continue; s += (dEP - dP) * 0.3; }
    } else if (mode === 'flank') {
      if (dE < 1.5) continue;
      s -= Math.abs(angDiff(Math.atan2(c.x - player.x, c.z - player.z), e.flankBearing)) * 8;
    }
    cands.push([s, c]);
  }
  cands.sort((a, b) => b[0] - a[0]);
  let blind = null, tried = 0;
  for (const [, c] of cands) {
    if (tried >= 10) break;
    if (claimed(c, e) || !walkable(e.x, e.z, c.x, c.z)) continue;
    tried++;
    const ev = evaluate(c);
    if (!ev) continue;
    if (!ev.blind) return ev;
    blind ||= ev;
  }
  return mode === 'any' ? blind : null;
}
