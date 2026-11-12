// Navigation between the level's zones (LEVEL.nav, levels/<id>/data.js): a soldier outside the player's zone
// walks the links of the shortest zone path, heading for via[0] until within 1.2 m of it, then via[1].
import { inArea } from '../core/util.js';
import { player } from '../core/state.js';
import { LEVEL } from '../levels/index.js';

const NAV = LEVEL.nav || { zones: [], links: [] };
export const zoneOf = (x, z) => NAV.zones.findIndex(zn => inArea(zn, x, z));
// next link on the shortest path from zone a to zone b (breadth-first over the links), or null
function nextLink(a, b) {
  const prev = new Map([[a, null]]), q = [a];
  while (q.length) {
    const z = q.shift();
    if (z === b) break;
    for (const l of NAV.links) if (l.from === z && !prev.has(l.to)) { prev.set(l.to, l); q.push(l.to); }
  }
  if (!prev.has(b) || a === b) return null;
  let l = prev.get(b);
  while (l.from !== a) l = prev.get(l.from);
  return l;
}
// where soldier e should walk to get to the player: the player, or the next link point toward the player's zone
export function navTarget(e) {
  const ze = zoneOf(e.x, e.z), zp = zoneOf(player.x, player.z);
  if (ze === zp || ze < 0 || zp < 0) return player;
  const l = nextLink(ze, zp);
  if (!l) return player;
  const [p0, p1 = p0] = l.via;
  return Math.hypot(e.x - p0.x, e.z - p0.z) > 1.2 ? p0 : p1;
}
