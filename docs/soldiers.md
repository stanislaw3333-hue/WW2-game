# Enemy soldiers: poses and animations

The soldier is ONE rigged model (`src/models/soldier_rig.json`, 49 bones, baked once by `tools/bake_rig.py`). Every stance is
data in `src/enemies/poses.js`, posed at runtime by `src/enemies/rig.js`. **No Blender bake is needed for a new pose.**

## How a frame is posed (`poseEnemy` in `enemies/soldiers.js`)
1. Pick the stance: `carry` and `aim` blended by `e.aim`, or the reload animation while `e.reloading`, or the grenade throw while `e.throwPose` (`currentStance`).
2. `applyStance` (rig.js): reset bones, apply the stance's `bones` turns plus the walk cycle and flinch, place the gun, solve both arms onto their hand targets with two-bone IK (elbows toward `poles`), set wrists and finger curl.
3. Hit boxes are children of the bones (`HITBOXES` in soldiers.js), so they follow any pose.

## Adding or changing a pose
- **Tune by eye:** open `?test`, start, press `N` (pose editor, `src/debug/posetune.js`). `,`/`.` pick the stance, `Tab` the part (gun, hands, elbows, bones), arrows/PgUp/PgDn move, I/K J/L U/O turn, `Space` plays the set's animation, `V`/`B` views, `P` prints the stance block. Paste the block into `STANCES` in `poses.js`.
- **From the JS tool:** `__g.pose(i, set, name, view)` shows soldier `i` frozen in `STANCES[set][name]` (views 0 front, 1 right, 2 left, 3 back, 4 hands close, 5 high, 6 low, 7 face); `__g.pose()` releases. Edits to `STANCES` objects in the page show at once.
- **Line-up for reference pictures:** `__g.lineup([{ i, label, uni }], set, name)` stands the listed soldiers side by side in the enemy yard, labelled, under the work light. For close, full-body pictures show one soldier at a time with the browser view set square (900 x 900): the game crops views taller than wide. `set` 'ref' + 'tpose' = T-pose; `set` 'gun' + 'carry' = each in his own gun's stance; `uni` (0 dark, 1 field-grey) shows him in another uniform for the picture. `__g.lineup()` ends it and puts everyone back.
- **New stance:** add a key to `STANCES.k98` / `.mp40` / `.nade` (only list what differs from the defaults).
- **New animation:** add `{ keys: [[seconds, stanceName], ...] }` to `ANIMS.<set>`, then play it from code with `sampleAnim(ANIMS.<set>.<name>, t, get)` in `currentStance` (see the reload and throw cases).
- **Hands follow moving gun parts:** a hand target `{ bolt: [x, y, z] }` or `{ mag: [...] }` moves with the bolt / magazine that `enemies/weaponAnim.js` animates (`e.boltBack`, `e.magY`).
- **Grip points** are `ENEMY_GRIPS` in `core/config.js` (the player's grip points on each gun).

## Axes and conventions
- Body space: x = the soldier's left, y = up, z = forward, origin between the feet. Gun space: the enemy gun points +z.
- Every bone's rest frame is the body axes, so a turn `[x, y, z]` (radians, Euler YXZ) means the same on every bone: +x leans the spine/head forward, swings a leg back.
- Arm, ForeArm and Hand bones are set by the IK; put turns on them through `wrist` / `twist`, not `bones`.

## Soldier types and uniforms
- Types live in `SOLDIER_TYPES` in `src/enemies/uniforms.js` (data only): Infantry (field-grey; Kar98 or MP40), Panzergrenadier, SS Officer, Luftwaffe Officer, Engineer, Colonel (no weapons assigned yet). A level spawn picks one with `type: 'infantry'` (levels/<id>/data.js); unknown types fall back to Infantry.
- Each type names its sheet (`src/pack/soldier_<type>.png`, loaded in packtex.js), a tint and a layout. `LAYOUTS` (same file) says where each body part is on that sheet, in sheet pixels (x from the left, y from the top): tunic front (by his right/left side, face edges, collar/belt/hem rows), tunic back (top > hem = drawn upside down), and strips for sleeves, hands, thighs and shins (`dir` 'h' or 'v', `along` start -> end, `around`). Swap a strip's start and end to turn it round.
- `uniformUV` in enemies/rig.js does the mapping (body measurements in `BODY` there); each layout's body geometry is built once and shared.
- Head and neck are a separate mesh that always uses the Infantry sheet's shadowy mapping; the helmet is `SM.stahl` for every type.
- **Add a uniform:** copy the sheet into `src/pack/`, import it in packtex.js, add a `LAYOUTS` entry and a `SOLDIER_TYPES` entry, then check it with `__g.lineup([{ i: 0, type: '<key>' }], 'ref', 'tpose')` (square 900 x 900 view).

## Re-baking the rig (new body mesh only)
`blender -b -P tools/bake_rig.py -- src/models/soldier_rig.json <GermanWW2Soldier.fbx>` (FBX from `courtyard-assets/models/Enemy/german-ww2-soldier.zip` > source/GermanSoldier.rar; extract with WinRAR's UnRAR into a scratch folder).

## Not done yet
- Death is still the whole body tipping over (`e.body.rotation.x` in enemies/ai.js); a death animation would be an `ANIMS` entry.
- Feet don't plant: the walk cycle is a simple hip/knee swing (`WALK` in poses.js).
- The old per-stance models (`gs*.json`, `gsa*.json`, `ng_*.json`, `pg*.json`) are no longer imported.
