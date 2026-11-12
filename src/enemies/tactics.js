// How an alerted soldier fights (they fight to the death; there is no search or retreat). Each one is in one of:
//   move   - running to a chosen cover point (enemies/cover.js)
//   cover  - at it: ducks (kneels behind low cover) for hideT, then pops up or leans out (high cover) and shoots for exposeT
//   open   - no cover near: strafes and shoots; a rifleman kneels at range; walks toward the player when he cannot see him
//   chase  - the player is in another nav zone and out of sight: follows the level's nav links (enemies/nav.js)
//   evade  - runs from a grenade that landed near him
// Squad rules: while one soldier within leapfrogRadius runs to new cover, the others wait their turn and pop up to give
// covering fire. Every so often one soldier is sent to flank (cover toward a bearing flankAngle round the player).
// Suppression (e.supp, from player rounds passing close) keeps him down in cover and spoils his aim (enemies/combat.js).
// Tunables: ENEMY_TACTICS, ENEMY_SUPPRESS, ENEMY_EVADE in core/config.js.
import { player, enemies } from '../core/state.js';
import { ENEMY, ENEMY_TACTICS as T, ENEMY_SUPPRESS as SUP, ENEMY_EVADE as EV } from '../core/config.js';
import { liveGrenades } from '../effects/grenade.js';
import { chooseCover, coverHolds, angDiff } from './cover.js';
import { zoneOf, navTarget } from './nav.js';
import { alertEnemy } from './combat.js';

const rnd = ([a, b]) => a + Math.random() * (b - a);
const out = { mvx: 0, mvz: 0, speed: 0, face: 0, aim: 0 };
const allyMoving = e => enemies.some(o => o !== e && o.alive && o.alert && o.tac === 'move' && Math.hypot(o.x - e.x, o.z - e.z) < T.leapfrogRadius);
const bearing = e => Math.atan2(e.x - player.x, e.z - player.z);

// ---- grenades: checked a few times a second for every living soldier
export function checkGrenades(e) {
  if (e.tac === 'evade') return;
  for (const g of liveGrenades) {
    if (g.p.y > 1 || g.fuse < 0.3 || Math.hypot(g.p.x - e.x, g.p.z - e.z) > EV.radius) continue;
    alertEnemy(e);
    e.tac = 'evade'; e.evadeG = g; e.evadeT = rnd(EV.react); e.cover = null;
    return;
  }
}
function evade(e, dt) {
  const g = e.evadeG;
  if (!g || !liveGrenades.includes(g)) { e.tac = 'none'; e.evadeG = null; e.thinkT = 0; return false; }
  const ax = e.x - g.p.x, az = e.z - g.p.z, d = Math.hypot(ax, az) || 0.01;
  e.evadeT -= dt;
  if (e.evadeT > 0) { out.face = Math.atan2(-ax, -az); out.aim = 0.3; return true; }   // sees it, about to run
  if (d < EV.safe) { out.mvx = ax / d; out.mvz = az / d; out.speed = EV.speed; out.face = Math.atan2(ax, az); out.aim = 0.1; }
  return true;
}

// ---- flanking: once per frame
let flankT = rnd(T.flankEvery);
export function updateSquad(dt) {
  for (const e of enemies) if (e.role === 'flank') {
    e.roleT += dt;
    if (!e.alive || !e.alert || e.roleT > T.flankMaxT || Math.abs(angDiff(bearing(e), e.flankBearing)) < 0.3) e.role = null;
  }
  if ((flankT -= dt) > 0) return;
  flankT = rnd(T.flankEvery);
  const fighting = enemies.filter(e => e.alive && e.alert && (e.tac === 'cover' || e.tac === 'open'));
  if (fighting.length < 2 || enemies.some(e => e.role === 'flank')) return;
  let sx = 0, sz = 0; for (const e of fighting) { sx += e.x - player.x; sz += e.z - player.z; }
  const base = Math.atan2(sx, sz);
  const smg = fighting.filter(e => e.weapon === 'mp40'), pool = smg.length ? smg : fighting;
  const f = pool[(Math.random() * pool.length) | 0];
  const side = angDiff(bearing(f), base) >= 0 ? 1 : -1;   // swing out further on the side he is already on
  f.role = 'flank'; f.roleT = 0; f.flankBearing = base + side * T.flankAngle; f.thinkT = 0;
}

// ---- decisions, every ENEMY_TACTICS.thinkT seconds
function pickCover(e, mode) {
  let c = chooseCover(e, mode);
  if (!c && mode === 'flank') c = chooseCover(e, 'advance');
  if (c) { e.cover = c; e.tac = 'move'; e.moveT = 0; return true; }
  return false;
}
function settle(e) {
  e.tac = 'cover'; e.coverT = 0; e.stayT = rnd(T.stayT) * (e.role === 'flank' ? 0.3 : 1);
  e.phase = allyMoving(e) || Math.random() < 0.4 ? 'expose' : 'hide';
  e.phaseT = e.phase === 'hide' ? rnd(T.hideT) * 0.6 : rnd(T.exposeT);
}
function think(e, dist) {
  const ze = zoneOf(e.x, e.z), zp = zoneOf(player.x, player.z);
  // the player is in another zone and out of sight: follow the nav links to him
  if (ze !== zp && ze >= 0 && zp >= 0 && !e.los) {
    if (e.tac !== 'chase' && e.noLosT > 0.6) { e.tac = 'chase'; e.cover = null; }
    return;
  }
  if (e.tac === 'chase') e.tac = 'none';
  if (dist < T.closeBreak) { e.tac = 'open'; e.cover = null; return; }
  if (e.tac === 'move') return;
  if (e.tac === 'cover') {
    if (!coverHolds(e)) { if (!pickCover(e, 'any')) { e.tac = 'open'; e.cover = null; } return; }   // outflanked: move now
    const wantMove = e.coverT > e.stayT || e.noLosT > T.noLosAdvanceT || (e.role === 'flank' && e.coverT > 1.5);
    if (wantMove && !allyMoving(e) && !pickCover(e, e.role === 'flank' ? 'flank' : 'advance')) {
      if (e.noLosT > T.noLosAdvanceT * 2) { e.tac = 'open'; e.cover = null; }   // nowhere closer to hide: go at him
      else e.coverT = e.stayT * 0.5;
    }
    return;
  }
  // none / open: get into cover when there is some (in turn with the others, unless he has nothing yet)
  if (e.tac === 'none' || !allyMoving(e)) pickCover(e, e.role === 'flank' ? 'flank' : 'any');
  if (e.tac === 'none') e.tac = 'open';
}

// ---- per-frame movement for each state; all set `out` and return it
function toward(tx, tz, speed) { const l = Math.hypot(tx, tz) || 1; out.mvx = tx / l; out.mvz = tz / l; out.speed = speed; }
function chase(e) {
  const t = navTarget(e);
  toward(t.x - e.x, t.z - e.z, ENEMY.chaseSpeed);
  out.aim = e.los ? 0.85 : 0.35;
  if (!e.los) out.face = Math.atan2(out.mvx, out.mvz);
}
function open(e, dt, dist, dx, dz) {
  if (!(e.los && dist < e.range)) { chase(e); return; }
  out.aim = 1;
  e.strafeT -= dt;
  if (e.strafeT <= 0) { e.strafeDir = e.strafeDir ? 0 : (Math.random() < 0.5 ? -1 : 1); e.strafeT = e.strafeDir ? 0.6 + Math.random() * 0.6 : 1.5 + Math.random() * 2.5; }
  if (dist < 3.5) toward(-dx, -dz, ENEMY.retreatSpeed);
  else if (e.strafeDir) toward(dz * e.strafeDir, -dx * e.strafeDir, ENEMY.strafeSpeed);
  else if (e.weapon === 'k98' && dist > T.kneelDist) e.kneel = 1;   // standing still at range: a rifleman kneels to shoot
}
function move(e, dt, dist, dx, dz) {
  const c = e.cover, tx = c.x - e.x, tz = c.z - e.z, tl = Math.hypot(tx, tz);
  e.moveT += dt;
  if (tl < 0.3) { settle(e); inCover(e, 0); return; }
  if (e.moveT > T.moveGiveUpT) { e.tac = 'open'; e.cover = null; open(e, dt, dist, dx, dz); return; }
  toward(tx, tz, ENEMY.chaseSpeed * (tl < 1 ? 0.6 : 1));
  out.aim = e.los ? 0.85 : 0.35;
  if (!e.los) out.face = Math.atan2(tx, tz);
}
function inCover(e, dt) {
  const c = e.cover;
  e.coverT += dt; e.phaseT -= dt;
  if (e.phase === 'hide' && allyMoving(e) && e.supp < SUP.hideAt) e.phaseT = Math.min(e.phaseT, 0.25);   // covering fire
  if (e.phase === 'expose' && (e.reloading || e.supp > SUP.hideAt + 0.2)) e.phaseT = 0;                   // duck to reload, or when rounds come too close
  if (e.phaseT <= 0) {
    if (e.phase === 'hide') {
      if (e.supp < SUP.hideAt && !e.reloading && !c.blind) { e.phase = 'expose'; e.phaseT = rnd(T.exposeT); } else e.phaseT = 0.4;
    } else { e.phase = 'hide'; e.phaseT = rnd(T.hideT) * (1 + e.supp); }
  }
  const up = e.phase === 'expose', peek = up && !c.low;
  const tx = (peek ? c.px : c.x) - e.x, tz = (peek ? c.pz : c.z) - e.z, tl = Math.hypot(tx, tz);
  if (tl > 0.08) toward(tx, tz, Math.min(ENEMY.strafeSpeed, tl * 6));
  out.aim = up ? 1 : 0.3;
  e.kneel = c.low && !up ? 1 : 0;
  e.lean = peek ? c.lean : 0;
}

// alerted soldier e: returns { mvx, mvz, speed, face, aim } for this frame (dx, dz, dist: to the player)
export function tactics(e, dt, dist, dx, dz) {
  out.mvx = out.mvz = out.speed = 0; out.face = Math.atan2(dx, dz); out.aim = e.los ? 1 : 0.5;
  e.kneel = 0; e.lean = 0;
  e.supp = Math.max(0, e.supp - SUP.decay * dt);
  e.noLosT = e.los ? 0 : e.noLosT + dt;
  if (e.tac === 'evade' && evade(e, dt)) return out;
  if ((e.thinkT -= dt) <= 0) { e.thinkT = T.thinkT * (0.75 + Math.random() * 0.5); think(e, dist); }
  if (e.tac === 'move') move(e, dt, dist, dx, dz);
  else if (e.tac === 'cover') inCover(e, dt);
  else if (e.tac === 'chase') chase(e);
  else open(e, dt, dist, dx, dz);
  return out;
}
