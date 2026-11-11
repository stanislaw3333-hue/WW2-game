# Mapping a uniform texture onto the enemy soldier

How the soldier's uniform sheet is wrapped onto the baked model. Use this when adding a new sheet
that is laid out the same way (torso front, torso back, sleeves/grey panel, belt band).

## What draws what

- **Visible soldier** = the baked Panzergrenadier models `PG_MODEL` (carry pose) and `PGA_MODEL` (aim pose)
  in `src/models/*.json`, drawn by `addBaked()` in `src/render/baked.js` with `bodyMats`
  (`uniform`, `helmet`, `leather`) in `src/enemies/soldiers.js`.
- **Procedural soldier** (`SB`, `SH`, `SHM`, `SC` in `src/soldierGeo.js`) = hit boxes only.
  `soldiers.js` sets their material to `HIT_MAT` (invisible). Editing their UVs changes nothing on screen.
- Each baked model has three meshes (checked in the browser, see step 2):

  | mesh | size | texture | role |
  |---|---|---|---|
  | 0 | 3210 verts, y 1.07-1.22 | 32x32 | leather/webbing (not the uniform) |
  | 1 | 23091 verts, y 1.53-1.80 | 256x256 `helmetBlack` | helmet and head |
  | 2 | 54714 verts, y 0-1.76 | 1024x1024 `soldierSheet` (tint 0.9, 0.98, 0.9) | whole uniform body |

  Mesh 2 is the only `uniform` mesh. Its UVs come from Blender (0..1 over the whole file), so
  they must be remapped to the sheet.

## Steps

1. **Find the visible meshes.** In the browser test build (`?test`), with an enemy in `window.__g.enemies`:
   ```js
   e.carryBody.map((m, i) => [i, m.geometry.attributes.position.count, m.material.uniforms.map.value.image.width])
   ```
   The `uniform` mesh is the one whose texture is the sheet. Check its `uTint` against `materials.js`.
2. **Get the body's height bands.** Bin vertex Y (0.05 m steps) and record max |X| and front/back counts.
   On the current model: the belt is near y 1.0; the torso runs about y 0.92-1.52; the arm tops reach
   about 1.45-1.5; the legs sit below about 0.9. The tunic front is +Z.
3. **Pick sheet regions.** The sheet is 1024 px square, origin top-left. Three.js flips V, so
   `v_uv = 1 - row / 1024`. On the current sheet:
   - Tunic front (buttons, pockets, collar tabs): x 0-593, rows 0-737. Torso V runs from the hem
     (row 737) to the collar (row 0).
   - Grey panel (belted, plain): x 594-1014, rows 310-760. Its dark belt band sits at rows 440-500.
   - Camo and brown strips (not used): x 460-1020, rows 0-330. Bleeds into the shoulder rows if the
     shoulder mapping is too tall.
   - Front belt band: rows about 470-530.
4. **Write the remap** in `bakedUniformUV()` (`src/enemies/soldiers.js`). Order matters:
   1. Shoulders (`y > 1.3` and `|x| > 0.2`): tunic x mapping, V stretched over rows 0-270 (the pads).
   2. Torso (`0.92 < y < 1.52`, `|x| < 0.27`):
      - front (z > 0): tunic, `u = 0.29 + (x / 0.25) * 0.29`, `v = 0.28 + 0.72 * (y - 0.92) / 0.6`.
      - back (z <= 0): grey panel, `u = 0.785 + 0.205 * (x / 0.25)`, row `691 - 737 * v`, clamped 310-760.
   3. Everything else (arms, legs): grey panel wrapped around the limb,
      `u = 0.58 + 0.41 * angle`, `v = 0.26 + 0.31 * y / 1.76`.
   It runs once at load on the shared geometry (`bakedGeo` caches it).
5. **Check it in-game.** Build (`npm run build`), serve (`npm run serve`), open `?test`. Call
   `start()`, set `enemies[i].range = 0`, `shootT = 1e9`, `alert = false` so they stop shooting,
   then place the player 1.2 m in front of the soldier (`yaw = Math.PI` looks at the soldier's front)
   and screenshot. Take a screenshot before driving the test hook so the frame loop runs.
6. **Run** `npm test` (0 errors; 7 known warnings).

## Pitfalls

- Editing `SB.*` (procedural) geometry UVs has no visible effect; only the baked model matters.
- Remap the shared geometry once. Do not remap per enemy (vertices would be remapped repeatedly).
- Loft UVs (procedural) run u around the body with u 0.5 = front (+Z), v 0 = hem to 1 = collar.
  Baked UVs are not like this; work from positions, not from UVs.
- A "transparent" look is often a texture problem, not alpha. The helmet used to be a noisy crop
  of the sheet; it is now a plain gunmetal texture (`steelTex()` in `src/packtex.js`), which solved it.
  The transparent `SM.shade` head shell is added to the procedural face group, which is not hidden,
  so it is still drawn over the head.
