# Levels

One folder per level. The systems (AI, audio, player, world update) never name a place: they read the current level's data through `LEVEL` from `levels/index.js`.

## Add a level
1. Copy `courtyard/data.js` to `<id>/data.js`. Change `id`, `name`, and every field (keep all keys; use `null` for `RADIO` / `searchlights` to turn them off, `[]` for `indoors`).
2. Write `<id>/build.js` exporting `build()`. Split big maps into area files (like `courtyard/yard1.js`) and call them from `build()`. Use the helpers in `world/geo.js` (`addBox`, `addCyl`, `wallQuad`, `win`, `addArch`, `addLantern`, …), `world/props.js` (`crate`), `world/vehicles.js` (`placeTruck`). Anything solid must push to `boxes` / `circles`, anything bullets hit to `shootables`, point lights to `lightDefs` (the helpers do this for you).
3. Register it in `levels/index.js` `LEVELS` (two lines: import data and build, add the entry).
4. Open `http://localhost:8080/index.html?test&level=<id>` and run `await __g.smoke()`.

## Data fields (see courtyard/data.js for comments)
| Field | Used by |
|---|---|
| `spawn {x, z, yaw}` | `world/level.js`, `session.js` (respawn) |
| `titleCam` | `game.js` title screen orbit |
| `light` | `world/level.js` fixed lighting |
| `searchlights` / `RADIO` | `effects/searchlight.js` / `audio/audio.js` and the level's own build |
| `indoors` | `world/update.js` (siren fades indoors) |
| `nav {zones, links}` | `enemies/ai.js` (route between zones; one zone = soldiers go straight for the player). Soldiers only take cover inside their own zone. |
| `enemies` | `enemies/soldiers.js` spawns (`type`: a SOLDIER_TYPES key in enemies/uniforms.js) |

## Notes
- Cover needs no data: `enemies/cover.js` makes cover points round every collision block and pillar (`boxes` / `circles`), so solid props are cover automatically. Hearing distances are shared tunables (`HEARING` in `core/config.js`).
- Areas (`indoors`, `nav.zones`) are `{x0, x1, z0, z1}` with missing sides open (`inArea` in `core/util.js`).
- Place props by hand at fixed positions (`crate(x, y, z, size, rotY)`, `placeTruck(...)`, `addBaked(...)`); don't use the random `R` from `world/props.js` in new levels. The courtyard still uses `R` for a few props, so its call order (yard1 → yard2 → detail) must stay fixed.
- Models (`src/models/*.json`: weapons, soldiers, vehicles, Panzer) are shared by every level: import the same JSON again; esbuild bundles each file once.
- Switching level reloads the page (`loadLevel(id)` in `levels/index.js`, `__g.loadLevel` in `?test`).
- Shared tunables (weapons, enemy stats, fire, reload) stay in `core/config.js`.
