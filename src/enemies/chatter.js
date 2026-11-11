// German soldier conversations: two soldiers standing close together who have not spotted the player keep
// talking, one line at a time, for as long as they stay idle. Lines come a few seconds apart. Any soldier
// alerted to combat (or killed) cuts the conversation off.
import { S, player, enemies } from '../core/state.js';
import { playConvoLine, stopNodes } from '../audio/audio.js';

const PROX = 13;              // metres: soldiers this close count as a group
const BREAK = 26;             // metres: a pair this far apart stops talking
const CHECK_EVERY = 2;        // seconds between looks for a new group
const GAP_MIN = 3.5, GAP_MAX = 6.5;   // seconds of silence between lines
let nextCheck = 6, nextLine = 0, pair = null, turn = 0, live = [];

const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

// called from combat as soon as any soldier is alerted
export function stopConversation() {
  stopNodes(live);
  live = [];
  pair = null;
}

export function updateChatter() {
  if (S.state !== 'play') { stopConversation(); return; }
  const idle = enemies.filter(e => e.alive && !e.alert);
  if (pair && !(pair.every(e => idle.includes(e)) && dist(pair[0], pair[1]) < BREAK)) stopConversation();
  if (!pair) {
    if (S.time < nextCheck) return;
    nextCheck = S.time + CHECK_EVERY;
    for (const a of idle) {
      const b = idle.find(o => o !== a && dist(o, a) < PROX);
      if (b) { pair = [a, b]; turn = 0; nextLine = S.time + 0.5; break; }
    }
    if (!pair) return;
  }
  if (S.time < nextLine) return;
  const speaker = pair[turn % 2];
  turn++;
  const line = playConvoLine(Math.hypot(speaker.x - player.x, speaker.z - player.z));
  nextLine = S.time + (line ? line.length : 0) + GAP_MIN + Math.random() * (GAP_MAX - GAP_MIN);
  if (line) { live.push(line.node); if (live.length > 6) live.shift(); }
}
