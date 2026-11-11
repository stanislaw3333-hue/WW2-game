// HUD: drawn each frame into a small canvas (low-res, nearest-neighbour scaled up). Pixel font from textures.js.
import { clamp, LOW_H } from '../core/util.js';
import { S, player } from '../core/state.js';
import { hud } from '../render/renderer.js';
import { drawText5 as drawText, textW5 as textW } from '../textures.js';
import { gun, curW } from '../weapons/guns.js';

export function txt(str, x, y, s = 1, col = '#e8e0c0', shadow = '#000') {
  if (shadow) { hud.fillStyle = shadow; drawText((px, py, sz) => hud.fillRect(px + s, py + s, sz, sz), str, x, y, s); }
  hud.fillStyle = col; drawText((px, py, sz) => hud.fillRect(px, py, sz, sz), str, x, y, s);
}
const ctxt = (str, y, s, col, sh) => txt(str, Math.round((S.lowW - textW(str, s)) / 2), y, s, col, sh);
export function drawHUD() {
  hud.clearRect(0, 0, S.lowW, LOW_H);
  const W = S.lowW, H = LOW_H;
  if (S.state === 'title') {
    hud.fillStyle = 'rgba(0,0,0,0.5)'; hud.fillRect(0, 0, W, 30); hud.fillRect(0, H - 78, W, 78);
    ctxt('COURTYARD 1944', 44, 3, '#d8c890', '#201808');
    ctxt('MISSION ONE - THE TWO COURTYARDS', 72, 1, '#b0a888');
    if (Math.floor(S.time * 2) % 2 === 0) ctxt('CLICK OR PRESS ENTER', 118, 2, '#f0e8d0');
    const lines = ['WASD MOVE - MOUSE LOOK - SHIFT RUN', 'C CROUCH - SPACE JUMP - R RELOAD', 'LEFT CLICK FIRE - RIGHT CLICK AIM', '1 / 2 / 3 / Q / WHEEL - SWITCH WEAPON', 'F11 FULLSCREEN - ESC PAUSE'];
    lines.forEach((l, i) => ctxt(l, H - 70 + i * 12, 1, '#c8c0a0'));
    ctxt('ARMED WITH: 98K, MP 40 AND GRENADES', 10, 1, '#908868');
    return;
  }
  // crosshair
  const cw = curW(), dead = S.state === 'dead';
  if (player.hurt > 0 && !dead) { hud.fillStyle = 'rgba(170,10,0,' + (player.hurt * 0.4).toFixed(3) + ')'; hud.fillRect(0, 0, W, H); }
  if (gun.ads < 0.5 && gun.state !== 'reload' && gun.state !== 'switch' && !dead) {
    const cx = W >> 1, cy = H >> 1, g = 3 + Math.round(player.move * 2 + gun.kick * 4);
    hud.fillStyle = '#e8e0c0';
    hud.fillRect(cx - g - 3, cy, 3, 1); hud.fillRect(cx + g + 1, cy, 3, 1); hud.fillRect(cx, cy - g - 3, 1, 3); hud.fillRect(cx, cy + g + 1, 1, 3);
  }
  // compass
  const ox = 24, oy = H - 24;
  hud.fillStyle = 'rgba(0,0,0,0.45)'; hud.beginPath(); hud.arc(ox + 0.5, oy + 0.5, 16, 0, 6.3); hud.fill();
  hud.fillStyle = '#a89868';
  for (let i = 0; i < 48; i++) { const a = i / 48 * 6.283; hud.fillRect(Math.round(ox + Math.cos(a) * 16), Math.round(oy + Math.sin(a) * 16), 1, 1); }
  const nx = Math.sin(player.yaw), ny = -Math.cos(player.yaw);
  hud.fillStyle = '#d04030'; for (let i = 0; i <= 11; i++) hud.fillRect(Math.round(ox + nx * i), Math.round(oy + ny * i), 1, 1);
  hud.fillStyle = '#c8c0a0'; for (let i = 1; i <= 9; i++) hud.fillRect(Math.round(ox - nx * i), Math.round(oy - ny * i), 1, 1);

  // health
  txt('HEALTH', 48, H - 32, 1, '#a89868');
  hud.fillStyle = '#000'; hud.fillRect(48, H - 21, 54, 8);
  hud.fillStyle = '#403828'; hud.fillRect(49, H - 20, 52, 6);
  hud.fillStyle = player.hp > 50 ? '#7a9a48' : player.hp > 25 ? '#c8a048' : '#d04030'; hud.fillRect(49, H - 20, Math.round(52 * player.hp / 100), 6);
  // ammo, as on the reference HUD: rounds in the magazine, a single cartridge, then rounds in reserve
  {
    const rs = String(cw.reserve), rx = W - 8 - textW(rs, 2), by = H - 22;
    txt(rs, rx, H - 15, 2, cw.reserve ? '#e8e0c0' : '#d04030');
    const bx = rx - 9;
    hud.fillStyle = '#000'; hud.fillRect(bx - 1, by - 1, 6, 12);
    hud.fillStyle = '#c8a048'; hud.fillRect(bx, by + 2, 4, 8);
    hud.fillStyle = '#b06830'; hud.fillRect(bx + 1, by, 2, 2);
    const ms = String(cw.ammo), mx = bx - 6 - textW(ms, 3);
    txt(ms, mx, by - 3, 3, cw.ammo ? '#e8e0c0' : '#d04030');
  }
  if (gun.state === 'reload' && !dead) ctxt('RELOADING', H / 2 + 24, 1, '#c8c0a0');
  if (S.messageT > 0 && !dead) ctxt(S.message, 36, textW(S.message, 2) < W - 24 ? 2 : 1, '#f0e8d0');
  if (dead) {
    hud.fillStyle = 'rgba(90,0,0,' + clamp(S.deadT * 0.5, 0, 0.55).toFixed(3) + ')'; hud.fillRect(0, 0, W, H);
    ctxt('YOU WERE KILLED', 84, 3, '#e8d8b0', '#200808');
    if (S.deadT > 1.2 && Math.floor(S.time * 2) % 2 === 0) ctxt('CLICK TO TRY AGAIN', 128, 2, '#f0e8d0');
  }
  if (S.state === 'pause') {
    hud.fillStyle = 'rgba(0,0,10,0.6)'; hud.fillRect(0, 0, W, H);
    ctxt('PAUSED', 80, 3, '#d8c890', '#201808');
    ctxt('CLICK TO RESUME', 116, 2, '#f0e8d0');
    const b = resetButton();
    hud.fillStyle = '#3a2a10'; hud.fillRect(b.x, b.y, b.w, b.h);
    hud.fillStyle = '#d8c890'; hud.fillRect(b.x, b.y, b.w, 1); hud.fillRect(b.x, b.y + b.h - 1, b.w, 1);
    hud.fillRect(b.x, b.y, 1, b.h); hud.fillRect(b.x + b.w - 1, b.y, 1, b.h);
    ctxt('RESET LEVEL', b.y + 5, 2, '#f0e8d0');
    ctxt('Q - QUIT TO DESKTOP', 178, 1, '#c8c0a0');
  }
}
// the pause screen's RESET LEVEL button, in low-res HUD pixels
function resetButton() {
  const w = textW('RESET LEVEL', 2) + 16;
  return { x: Math.round((S.lowW - w) / 2), y: 146, w, h: 18 };
}
// true when a click at page position (cx, cy) lands on the RESET LEVEL button
export function resetButtonAt(cx, cy) {
  const b = resetButton(), x = cx / innerWidth * S.lowW, y = cy / innerHeight * LOW_H;
  return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
}
