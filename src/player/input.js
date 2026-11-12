// Keyboard and mouse: pause/menu keys, weapon switching, fire and aim buttons, and pointer lock.
import { TEST } from '../core/util.js';
import { S, keys } from '../core/state.js';
import { PLAYER } from '../core/config.js';
import { gun, WEAPONS } from '../weapons/guns.js';
import { tryReload } from './shooting.js';
import { start, restartLevel } from '../session.js';
import { resetButtonAt, godButtonAt } from '../ui/hud.js';

addEventListener('keydown', e => {
  if (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
  if (e.repeat) return;
  keys[e.code] = true;
  if ((S.state === 'title' || S.state === 'dead') && (e.code === 'Enter' || e.code === 'Space')) start();
  else if (S.state === 'pause' && e.code === 'KeyQ') window.close();
  else if (S.state === 'pause' && e.code === 'Enter') start();
  else if (S.state === 'pause' && e.code === 'KeyR') restartLevel();
  else if (S.state === 'pause' && e.code === 'KeyG') S.god = !S.god;
  else if (S.state === 'play' && e.code === 'KeyR') tryReload();
  else if (S.state === 'play' && e.code === 'Digit1') S.wantW = 0;
  else if (S.state === 'play' && e.code === 'Digit2') S.wantW = 1;
  else if (S.state === 'play' && e.code === 'Digit3') S.wantW = 2;
  else if (S.state === 'play' && e.code === 'KeyQ') S.wantW = (gun.w + 1) % WEAPONS.length;
  else if (S.state === 'play' && (e.code === 'KeyP' || e.code === 'Escape')) { S.state = 'pause'; document.exitPointerLock && document.exitPointerLock(); }
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; S.fireHeld = S.adsHeld = false; });
let lastMv = 0;
addEventListener('mousemove', e => {
  if (!(document.pointerLockElement || S.noLock) || S.state !== 'play') return;
  const m = Math.max(Math.abs(e.movementX), Math.abs(e.movementY));
  if (m > PLAYER.mouseSpike && m > lastMv * PLAYER.spikeMult) { lastMv = m; return; }   // a lone bogus jump: drop it (a sustained fast flick passes from the next event)
  lastMv = m; S.mdx += e.movementX; S.mdy += e.movementY;
});
addEventListener('mousedown', e => {
  if (S.state === 'pause' && resetButtonAt(e.clientX, e.clientY)) { restartLevel(); return; }
  if (S.state === 'pause' && godButtonAt(e.clientX, e.clientY)) { S.god = !S.god; return; }
  if (S.state !== 'play') { start(); return; }
  if (!document.pointerLockElement && !S.noLock && !TEST) { start(); return; }
  if (e.button === 0) { S.fireHeld = true; S.firePressed = true; }
  if (e.button === 2) S.adsHeld = true;
});
addEventListener('mouseup', e => { if (e.button === 0) S.fireHeld = false; if (e.button === 2) S.adsHeld = false; });
addEventListener('contextmenu', e => e.preventDefault());
addEventListener('wheel', () => { if (S.state === 'play') S.wantW = (gun.w + 1) % WEAPONS.length; }, { passive: true });
document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && S.state === 'play') S.state = 'pause'; });
