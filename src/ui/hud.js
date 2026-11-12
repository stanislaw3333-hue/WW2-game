// HUD: drawn each frame into a small canvas (low-res, nearest-neighbour scaled up). All text uses the serif HUD_FONT.
import { clamp, LOW_H } from '../core/util.js';
import { S, player } from '../core/state.js';
import { HUD_FONT, HUD_COL, HUD_RETICLE_ALPHA, HUD_TEXT_SHARP, HUD_DAMAGE_FLASH } from '../core/config.js';
import { hud } from '../render/renderer.js';
import { gun, curW } from '../weapons/guns.js';

// text size in HUD pixels: 1 ~ small caption, 2 ~ prompt, 3 ~ heading (same scale numbers the pixel font used)
const fontPx = s => Math.round(7.6 * s);
function setFont(s) { hud.font = fontPx(s) + 'px ' + HUD_FONT; hud.textBaseline = 'top'; }
const textW = (str, s) => { setFont(s); return hud.measureText(str).width; };
// text is drawn once to a small cached sprite whose edge alpha is nudged toward 0/1 (HUD_TEXT_SHARP), so it stays a little crisper after the nearest-neighbour upscale
const sprites = new Map();
function sprite(str, s, col) {
  const key = s + '|' + col + '|' + str;
  let c = sprites.get(key);
  if (c) return c;
  if (sprites.size > 400) sprites.clear();
  setFont(s);
  const w = Math.ceil(hud.measureText(str).width) + 2, h = Math.ceil(fontPx(s) * 1.4);
  c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.font = hud.font; g.textBaseline = 'top'; g.fillStyle = col; g.fillText(str, 0, 0);
  const im = g.getImageData(0, 0, w, h), d = im.data;
  for (let i = 3; i < d.length; i += 4) d[i] = clamp(((d[i] / 255 - 0.5) * HUD_TEXT_SHARP + 0.5) * 255, 0, 255);
  g.putImageData(im, 0, 0);
  sprites.set(key, c);
  return c;
}
function txt(str, x, y, s = 1, col = HUD_COL.text, shadow = '#000') {
  x = Math.round(x); y = Math.round(y);
  if (shadow) hud.drawImage(sprite(str, s, shadow), x + 1, y + 1);
  hud.drawImage(sprite(str, s, col), x, y);
}
const ctxt = (str, y, s, col, sh) => txt(str, Math.round((S.lowW - textW(str, s)) / 2), y, s, col, sh);

// compass: green ring, dark face, a rose that turns with the player and a fixed red view cone
function drawCompass(ox, oy) {
  const R = 19;
  hud.fillStyle = '#000'; hud.beginPath(); hud.arc(ox, oy, R + 1.5, 0, 6.3); hud.fill();
  hud.fillStyle = '#3c9a3c'; hud.beginPath(); hud.arc(ox, oy, R, 0, 6.3); hud.fill();
  hud.fillStyle = '#1c2418'; hud.beginPath(); hud.arc(ox, oy, R - 3, 0, 6.3); hud.fill();
  const since = S.time - S.dmgT;                                  // red wedge toward the side a hit came from, relative to where the player faces (up = ahead)
  if (since >= 0 && since < HUD_DAMAGE_FLASH) {
    const s = Math.sin(player.yaw), c = Math.cos(player.yaw);
    const a = Math.atan2(c * S.dmgDx - s * S.dmgDz, -s * S.dmgDx - c * S.dmgDz) - 1.5708;   // 0 = up, clockwise
    hud.fillStyle = 'rgba(220,30,20,' + (0.95 * (1 - since / HUD_DAMAGE_FLASH)).toFixed(2) + ')';
    hud.beginPath(); hud.moveTo(ox, oy); hud.arc(ox, oy, R - 3, a - 0.5, a + 0.5); hud.closePath(); hud.fill();
  }
  const nx = Math.sin(player.yaw), ny = -Math.cos(player.yaw);   // direction of north on screen
  const pt = (k, r) => [ox + (k === 0 ? nx : k === 1 ? -ny : k === 2 ? -nx : ny) * r, oy + (k === 0 ? ny : k === 1 ? nx : k === 2 ? -ny : -nx) * r];
  for (let k = 0; k < 4; k++) {                                   // 4-point rose, north tip in white
    const [tx, ty] = pt(k, 13), [ax, ay] = pt((k + 1) % 4, 3), [bx, by] = pt((k + 3) % 4, 3);
    hud.fillStyle = k === 0 ? '#f2eee0' : '#8a9478';
    hud.beginPath(); hud.moveTo(tx, ty); hud.lineTo(ax, ay); hud.lineTo(bx, by); hud.closePath(); hud.fill();
  }
  hud.fillStyle = '#1c2418'; hud.fillRect(Math.round(ox) - 1, Math.round(oy) - 1, 2, 2);
}

export function drawHUD() {
  hud.clearRect(0, 0, S.lowW, LOW_H);
  const W = S.lowW, H = LOW_H;
  if (S.state === 'title') {
    hud.fillStyle = 'rgba(0,0,0,0.5)'; hud.fillRect(0, H - 78, W, 78);
    ctxt('COURTYARD 1944', 40, 4, HUD_COL.title, '#201808');
    ctxt('Click or press Enter', 118, 2, HUD_COL.text);
    const lines = ['WASD move - Mouse look - Shift run', 'C crouch - Space jump - R reload', 'Left click fire - Right click aim', '1 / 2 / 3 / Q / Wheel - switch weapon', 'F11 fullscreen - Esc pause'];
    lines.forEach((l, i) => ctxt(l, H - 72 + i * 13, 1.3, HUD_COL.dim));
    return;
  }
  // crosshair: small thin plus with a gap, opens a little when moving or firing
  const cw = curW(), dead = S.state === 'dead';
  if (player.hurt > 0 && !dead) { hud.fillStyle = 'rgba(170,10,0,' + (player.hurt * 0.4).toFixed(3) + ')'; hud.fillRect(0, 0, W, H); }
  if (gun.ads < 0.5 && gun.state !== 'reload' && gun.state !== 'switch' && !dead) {
    const cx = W >> 1, cy = H >> 1, g = 2 + Math.round(player.move * 1.5 + gun.kick * 3);
    const arms = (ox, oy, col) => {
      hud.fillStyle = col;
      hud.fillRect(cx - g - 4 + ox, cy + oy, 4, 1); hud.fillRect(cx + g + 1 + ox, cy + oy, 4, 1);
      hud.fillRect(cx + ox, cy - g - 4 + oy, 1, 4); hud.fillRect(cx + ox, cy + g + 1 + oy, 1, 4);
    };
    arms(1, 1, 'rgba(0,0,0,' + (0.6 * HUD_RETICLE_ALPHA).toFixed(2) + ')'); arms(0, 0, 'rgba(240,240,234,' + HUD_RETICLE_ALPHA + ')');
  }
  drawCompass(28, H - 28);

  // health
  txt('Health', 56, H - 34, 1, HUD_COL.dim);
  hud.fillStyle = '#000'; hud.fillRect(56, H - 21, 54, 8);
  hud.fillStyle = '#403828'; hud.fillRect(57, H - 20, 52, 6);
  hud.fillStyle = player.hp > 50 ? '#7a9a48' : player.hp > 25 ? '#c8a048' : HUD_COL.warn; hud.fillRect(57, H - 20, Math.round(52 * player.hp / 100), 6);
  // ammo: rounds in the magazine, a single cartridge, then rounds in reserve
  {
    const rs = String(cw.reserve), rx = Math.round(W - 10 - textW(rs, 3)), by = H - 30;
    txt(rs, rx, by, 3, cw.reserve ? HUD_COL.text : HUD_COL.warn);
    const bx = rx - 9;
    hud.fillStyle = '#000'; hud.fillRect(bx - 1, by + 2, 5, 17);
    hud.fillStyle = '#c8a048'; hud.fillRect(bx, by + 6, 3, 12);
    hud.fillStyle = '#b06830'; hud.fillRect(bx, by + 3, 3, 3);
    const ms = String(cw.ammo);
    txt(ms, Math.round(bx - 7 - textW(ms, 3)), by, 3, cw.ammo ? HUD_COL.text : HUD_COL.warn);
  }
  if (S.messageT > 0 && !dead) ctxt(S.message, 34, 1.4, HUD_COL.text);
  if (dead) {
    hud.fillStyle = 'rgba(90,0,0,' + clamp(S.deadT * 0.5, 0, 0.55).toFixed(3) + ')'; hud.fillRect(0, 0, W, H);
    ctxt('YOU WERE KILLED', 80, 3.5, HUD_COL.title, '#200808');
    if (S.deadT > 1.2 && Math.floor(S.time * 2) % 2 === 0) ctxt('Click to try again', 128, 2, HUD_COL.text);
  }
  if (S.state === 'pause') {
    hud.fillStyle = 'rgba(0,0,10,0.6)'; hud.fillRect(0, 0, W, H);
    ctxt('PAUSE', 70, 3.5, HUD_COL.title, '#201808');
    ctxt('Click to resume mission', 108, 2, HUD_COL.text);
    const drawBtn = (b, label, on) => {
      hud.fillStyle = on ? '#2a4a1c' : '#3a2a10'; hud.fillRect(b.x, b.y, b.w, b.h);
      hud.fillStyle = HUD_COL.title; hud.fillRect(b.x, b.y, b.w, 1); hud.fillRect(b.x, b.y + b.h - 1, b.w, 1);
      hud.fillRect(b.x, b.y, 1, b.h); hud.fillRect(b.x + b.w - 1, b.y, 1, b.h);
      ctxt(label, b.y + 3, 2, HUD_COL.text);
    };
    drawBtn(resetButton(), 'Reset level', false);
    drawBtn(godButton(), 'Godmode: ' + (S.god ? 'ON' : 'OFF') + ' (G)', S.god);
    ctxt('Q - quit to desktop', 204, 1.3, HUD_COL.dim);
  }
}
// the pause screen's buttons, in low-res HUD pixels
function resetButton() {
  const w = Math.round(textW('Reset level', 2)) + 20;
  return { x: Math.round((S.lowW - w) / 2), y: 146, w, h: 20 };
}
function godButton() {
  const w = Math.round(textW('Godmode: OFF (G)', 2)) + 20;
  return { x: Math.round((S.lowW - w) / 2), y: 172, w, h: 20 };
}
// true when a click at page position (cx, cy) lands on the GODMODE button
export function godButtonAt(cx, cy) {
  const b = godButton(), x = cx / innerWidth * S.lowW, y = cy / innerHeight * LOW_H;
  return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
}
// true when a click at page position (cx, cy) lands on the RESET LEVEL button
export function resetButtonAt(cx, cy) {
  const b = resetButton(), x = cx / innerWidth * S.lowW, y = cy / innerHeight * LOW_H;
  return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
}
