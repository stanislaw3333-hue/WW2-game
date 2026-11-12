// Level registry. Each level is a folder with data.js (data only) and build.js (export build(): adds the geometry).
// The level is chosen once per page load: ?level=<id> in the URL, else the first entry. Switching levels reloads the page
// (see loadLevel), which keeps every system free of teardown code.
import * as courtyard from './courtyard/data.js';
import { build as buildCourtyard } from './courtyard/build.js';

export const LEVELS = [
  { data: courtyard, build: buildCourtyard },
];

const want = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('level') : null;
const entry = LEVELS.find(l => l.data.id === want) || LEVELS[0];

export const LEVEL = entry.data;
export const buildLevel = entry.build;

// go to another level by id: reloads the page with ?level=<id>, keeping the other URL flags (e.g. ?test)
export function loadLevel(id) {
  const q = new URLSearchParams(location.search); q.set('level', id);
  location.search = q.toString();
}
