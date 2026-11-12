// ?test only: the whole browser smoke test as one call, so a check costs one tool call and a short JSON result.
// Usage (browser JS tool, after a screenshot so requestAnimationFrame runs): `await __g.smoke()`
// Returns { ok, checks: {name: [pass, detail]} }. Leaves the game in the 'dead' state; reload the page to play.
const w8 = ms => new Promise(r => setTimeout(r, ms));

export async function smoke(g) {
  const checks = {}, ok = (name, pass, detail) => { checks[name] = [!!pass, detail]; };
  ok('level', g.level && g.enemies.length === g.level.enemies.length, `${g.level.id}, ${g.enemies.length} soldiers`);
  g.start(); g.weapon(1); await w8(700);
  // fire the MP40, then reload
  const mp = g.WEAPONS[1], a0 = mp.ammo;
  g.hold(true); await w8(800); g.hold(false);
  ok('fire', mp.ammo < a0, `${a0} -> ${mp.ammo}`);
  g.reload(); await w8(2800);
  ok('reload', mp.ammo === mp.mag, `${mp.ammo}/${mp.mag}`);
  // kill the first soldier: stand 8 m east of him and aim straight at him (held still, or he would duck into cover)
  const e = g.enemies[0];
  e.frozen = true;
  for (let i = 0; i < 3 && e.alive; i++) {
    Object.assign(g.player, { x: e.x + 8, z: e.z, pitch: -0.02 });
    g.player.yaw = Math.atan2(-(e.x - g.player.x), -(e.z - g.player.z));
    g.hold(true); await w8(900); g.hold(false); await w8(200);
    if (mp.ammo < 5) { g.reload(); await w8(2500); }
  }
  e.frozen = false;
  ok('kill', !e.alive && g.kills >= 1, `alive ${e.alive}, kills ${g.kills}`);
  // navigation: with the player in the spawn zone, an alerted soldier should close in (through the level's links)
  const s = g.enemies.find(o => o.alive && o.alert);
  if (s) {
    Object.assign(g.player, { x: g.level.spawn.x, z: g.level.spawn.z });
    const d = () => Math.hypot(s.x - g.player.x, s.z - g.player.z), d0 = d();
    await w8(3500);   // he first notices the player is gone (a second or so) before he follows
    ok('nav', d() < d0 - 2, `${d0.toFixed(1)} m -> ${d().toFixed(1)} m`);
  }
  g.hurt(500); await w8(200);
  ok('death', g.state === 'dead', g.state);
  return { ok: Object.values(checks).every(c => c[0]), checks };
}
