// Enemy deaths: a fall picked at random (ENEMY_DEATH weights) - backwards, forwards, to one side, or down onto the knees
// and then forward. The body group tips over about the fall's pivot (DEATH in enemies/poses.js) while the limp pose is
// laid over his stance (soldiers.js deathStance).
import { V3, sstep, lerp } from '../core/util.js';
import { ENEMY_DEATH as ED } from '../core/config.js';
import { SFX } from '../audio/audio.js';
import { DEATH } from './poses.js';
import { poseEnemy } from './soldiers.js';

const HALF_PI = Math.PI / 2;
function pick() {
  const w = ED.weights; let r = Math.random() * Object.values(w).reduce((a, b) => a + b, 0);
  for (const k in w) { r -= w[k]; if (r <= 0) return k; }
  return 'back';
}
export function startDeath(e) {
  e.death = pick(); e.deathSide = Math.random() < 0.5 ? -1 : 1;
  e.fall = 0; e.fallV = e.death === 'knees' ? 0 : 1.5; e.dieT = 0; e.kneelD = 0; e.thud = false;
  e.kneelV = Math.min(e.kneelV, 0.5); e.lean = e.leanV = 0; e.turnV = 0;
}
const P = new V3(), Q = new V3();
// called every frame for a dead soldier (dist: to the player, for the thud's level)
export function tickDeath(e, dt, dist) {
  const D = DEATH[e.death], knees = e.death === 'knees';
  e.dieT += dt;
  e.kneelD = knees ? sstep(0, ED.kneelT, e.dieT) : 0;
  const settling = e.fall < HALF_PI || e.kneelD < 1;
  if (e.fall < HALF_PI && (!knees || e.dieT >= ED.kneelT)) {
    e.fallV += ED.gravity * dt; e.fall = Math.min(HALF_PI, e.fall + e.fallV * dt);
    if (e.fall >= HALF_PI && !e.thud) { e.thud = true; SFX.thud(dist); }
  }
  // tip the body group over about the pivot: position = pivot - R * pivot, plus the fall's lift so the lying body rests on the floor
  const b = e.body;
  b.rotation.set(D.axis[0] * e.fall, 0, D.axis[1] * e.deathSide * e.fall);
  P.set(...D.pivot); Q.copy(P).applyEuler(b.rotation);
  const lift = Array.isArray(D.lift) ? D.lift[e.deathSide > 0 ? 1 : 0] : D.lift;
  b.position.set(P.x - Q.x, P.y - Q.y + Math.sin(e.fall) * lift, P.z - Q.z);
  if (!settling) return;
  e.aim = lerp(e.aim, 0, 1 - Math.exp(-dt * 6)); e.mv = lerp(e.mv, knees ? 0 : 0.3, 1 - Math.exp(-dt * 6));
  e.flinch = Math.max(0, e.flinch - dt * 4); e.kneelV = lerp(e.kneelV, 0, 1 - Math.exp(-dt * 8));
  poseEnemy(e);
}
