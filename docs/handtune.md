# Hand placement and hand tuning

## Tuning mode (`?test` only, `src/debug/handtune.js`)
Press `H` in the game. `Tab` switches left/right arm; arrows move the arm (left/right, forward/back as the player sees it), PgUp/PgDn up/down; `I`/`K` pitch, `J`/`L` yaw, `U`/`O` roll the whole arm about the grip point; Shift = fine steps; `V`/`B` next/previous camera view (first person, right, left, back, below, above); `P` prints the `HAND_OFFSETS` block to the panel and console (`P` again hides it).

Edits live only in the page: the user presses `P` and pastes the block, which then goes into `HAND_OFFSETS` in `core/config.js`. Switch weapons with 1/2/3 or `__g.weapon(i)`. The mode keeps the game off the pause screen.

To inspect hands yourself: `__g.start(); __g.weapon(1)` in the browser JS tool, then press `h` and `v` with the computer key action, screenshotting after each press.

## HAND_OFFSETS
Hands are baked per weapon (`tools/bake_hands.py`, `src/models/*_hands.json`); never re-bake just to move a hand. `HAND_OFFSETS` in `core/config.js` is per weapon index (0 Kar98, 1 MP40, 2 grenade), per hand `L`/`R`:
- `p` = grip point the hand was baked on (do not change)
- `d` = offset in gun space (metres; -x = player left, +z = back, +y = up)
- `r` = turn about `p` as [axis x, y, z, angle radians]
- `s` = optional uniform scale about `p` (default 1)

Only hands move; weapon models and `WEAPON_DEFS` stay untouched. In the user's words "left/right/back" mean the player's first-person view: left = -x, right = +x, back = +z.
