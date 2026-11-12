// Summarise the change tracker for /changes: prints only open items and their threads, so the raw JSON never has to be read.
// Usage: node tools/tracker.mjs <out_dir>   (out_dir = where ArtifactData list saved items/ and comments/)
// Open = not hidden, and either not both ticks set or the thread's latest message is by "you".
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
if (!dir) { console.error('usage: node tools/tracker.mjs <out_dir>'); process.exit(1); }
const load = sub => {
  const p = join(dir, sub);
  if (!existsSync(p)) return [];
  return readdirSync(p).filter(f => f.endsWith('.json')).map(f => ({ id: f.slice(0, -5), ...JSON.parse(readFileSync(join(p, f), 'utf8')) }));
};
const items = load('items').sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9));
const threads = {};
for (const c of load('comments').sort((a, b) => String(a.at).localeCompare(String(b.at)))) (threads[c.item] ||= []).push(c);

let hidden = 0, waiting = 0, done = 0;
const open = [];
for (const it of items) {
  if (it.hidden === true) { hidden++; continue; }
  const th = threads[it.id] || [];
  const last = th[th.length - 1];
  const unanswered = last && last.by === 'you';
  if (it.claude === true && it.you === true && !unanswered) { done++; continue; }
  if (it.claude === true && !unanswered) { waiting++; continue; }
  open.push({ it, th, unanswered });
}
for (const { it, th, unanswered } of open) {
  console.log(`\n## [${it.order}] ${it.id}  group=${it.group || '-'}${it.group_by === 'claude' ? ' (claude)' : ''}  claude=${!!it.claude} you=${!!it.you}${unanswered ? '  UNANSWERED' : ''}`);
  console.log(`text: ${it.text}`);
  if (it.file) console.log(`file: ${it.file}`);
  if (it.note) console.log(`note: ${it.note}`);
  if (it.shots && it.shots.length) console.log(`shots: ${it.shots.length} (${it.shots.join(', ')})`);
  for (const m of th) console.log(`  ${m.at} ${m.by}: ${m.text}`);
}
console.log(`\n${open.length} open, ${waiting} waiting for the user, ${done} done, ${hidden} hidden`);
