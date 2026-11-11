// Push-out collision for the player and soldiers against level blocks, pillars, other soldiers and the player.
import { clamp } from '../core/util.js';
import { player, enemies, boxes, circles } from '../core/state.js';

// p: {x, z} body to move. self: the soldier being resolved (skips itself; also pushes away from the player)
export function resolve(p, self) {
  const Rr = self ? 0.36 : 0.42;
  for (let it = 0; it < 3; it++) {
    for (const c of boxes) {
      const nx = clamp(p.x, c.x0, c.x1), nz = clamp(p.z, c.z0, c.z1);
      const dx = p.x - nx, dz = p.z - nz, d2 = dx * dx + dz * dz;
      if (d2 >= Rr * Rr) continue;
      if (d2 > 1e-8) { const d = Math.sqrt(d2); p.x = nx + dx / d * Rr; p.z = nz + dz / d * Rr; }
      else {
        const l = p.x - c.x0, r = c.x1 - p.x, t = p.z - c.z0, b = c.z1 - p.z, m = Math.min(l, r, t, b);
        if (m === l) p.x = c.x0 - Rr; else if (m === r) p.x = c.x1 + Rr; else if (m === t) p.z = c.z0 - Rr; else p.z = c.z1 + Rr;
      }
    }
    for (const c of circles) {
      const dx = p.x - c.cx, dz = p.z - c.cz, d = Math.hypot(dx, dz), rr = c.r + Rr;
      if (d < rr) { if (d < 1e-5) { p.x += rr; } else { p.x = c.cx + dx / d * rr; p.z = c.cz + dz / d * rr; } }
    }
    // other bodies: living soldiers, and the player when resolving a soldier
    for (const e of enemies) if (e.alive && e !== self) {
      const dx = p.x - e.x, dz = p.z - e.z, d = Math.hypot(dx, dz), rr = Rr + 0.3;
      if (d < rr && d > 1e-5) { p.x = e.x + dx / d * rr; p.z = e.z + dz / d * rr; }
    }
    if (self) {
      const dx = p.x - player.x, dz = p.z - player.z, d = Math.hypot(dx, dz), rr = Rr + 0.4;
      if (d < rr && d > 1e-5) { p.x = player.x + dx / d * rr; p.z = player.z + dz / d * rr; }
    }
  }
  p.x = clamp(p.x, -61.5, 19.5); p.z = clamp(p.z, -19.5, 19.6);
}
