# Courtyard 1944: change tracker

Two ticks per item:
- **Claude** is ticked when the change is made and checked on my side.
- **You** is ticked when you have confirmed it in game. Once both are ticked, move the item to **Done** below.

Items with a plain "Verify" note are in the code but not yet checked by eye in game.

## Not done

### Level and world
- [x] Claude  [ ] You: Start position behind the Polish truck, facing west into the courtyard (`src/core/config.js`, `PLAYER.spawn`). Verify
- [x] Claude  [ ] You: Polish truck moved against the stable's west wall (`src/world/yard1.js`). Verify
- [x] Claude  [ ] You: Yard 2 barracks door matches the manor door, with lintel (`src/world/yard2.js`). Verify
- [x] Claude  [ ] You: Fountain water darker and finer, planar UVs so the texture lines up (`src/textures.js`, `src/render/materials.js`, `src/world/yard1.js`). Verify
- [x] Claude  [ ] You: Canopy truck bigger: now 7.0 m (scale 1.25 on the 5.6 m bake, `src/world/vehicles.js`). Verify
- [ ] Claude  [ ] You: Polish truck bigger (5.3 m, uniform) and less pixelated. The bake crashes Blender, so the model is still the old one
- [x] Claude  [ ] You: Polish truck less pixelated: its picture is smoothed with a linear filter (`src/render/materials.js`), and re-baked at 4096 px (`tools/bake_vehicle.py`). Only a little sharper: the game's low-res render buffer is the main limit. Verify

### Searchlights
- [x] Claude  [ ] You: Beam radius halved, less bright (`src/effects/searchlight.js`). Verify
- [x] Claude  [ ] You: Beams half as long and half as wide: aim point halfway to the base, radius halved (`src/effects/searchlight.js`). Verify
- [x] Claude  [ ] You: Beams sweep twice as fast, and the aim centre is raised so the beam tips stay in the sky (drop halved) (`src/effects/searchlight.js`). Verify

### Weapons and viewmodels
- [x] Claude  [ ] You: Kar98 right hand moves onto the bolt knob and rides back with the bolt (`src/player/update.js`). Verify
- [x] Claude  [ ] You: MP40 moving part is the slide (bolt), not the cocking handle; slides 0.08 m per shot (`tools/bake_models.py`, `src/weapons/guns.js`, `src/player/update.js`). Verify
- [x] Claude  [ ] You: Stielhandgranate raised in hand (`src/weapons/guns.js`). Verify
- [x] Claude  [ ] You: Grenade blast plays the explosion from `courtyard-assets/models/Effects`: 55 frames rendered from `Trial+explosion.blend` and its VDB sequence (`src/pack/explosion_sheet.png`, `src/effects/grenade.js`). Verify

### HUD
- [x] Claude  [ ] You: "RELOADING" text removed (`src/ui/hud.js`). Verify

### Enemies and AI
- [x] Claude  [ ] You: Patrols walk slower, 0.7 m/s (`src/core/config.js`, `ENEMY.patrolSpeed`). Verify
- [x] Claude  [ ] You: Patrol routes cross, so the soldiers no longer walk in parallel (`src/core/config.js`, `ENEMY_SPAWNS`). Verify
- [x] Claude  [ ] You: Passage stealth rule removed: soldiers are alerted only by line of sight (`src/enemies/ai.js`). Verify

### Build and checks
- [x] Claude  [ ] You: `npm test` passes: 0 errors, the 7 known warnings
- [x] Claude  [ ] You: Exe rebuilt with the latest spawn (`outputs/Courtyard1944.exe`, 90 MB)
- [ ] Claude  [ ] You: Browser check of the bolt, Kar98 hand, grenade and patrol changes in game

## Done

Items move here once both ticks are ticked.

### Level and world
_(none yet)_

### Searchlights
_(none yet)_

### Weapons and viewmodels
_(none yet)_

### HUD
_(none yet)_

### Enemies and AI
_(none yet)_

### Build and checks
_(none yet)_
