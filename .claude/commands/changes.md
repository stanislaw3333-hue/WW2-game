---
description: Read the change tracker and implement every change that is not yet done (Claude tick not set, or still needs work)
allowed-tools: ArtifactData, Artifact, Read, Edit, Write, Grep, Glob, Bash
---

Implement the open changes from the Courtyard 1944 change tracker.

The tracker is the artifact at `https://claude.ai/artifact/5ZPw4c2kb3Fv95ZKfHKiwB`. Its items live in the artifact database, collection `items`. Each item has `text`, `file`, `note`, `group`, `order`, `claude` (my tick), `you` (the user's tick) and `comment` (what the user saw in game).

1. Read the collection `items` with ArtifactData (action `list`, url above). Sort by `order`.
2. Work on every item that is not done, meaning `claude` is not true. Read the item's `comment` too: a comment means the user has seen the previous attempt and wants a change, so treat it as the new brief. Skip items whose `claude` tick is set but whose `you` tick is not set, unless their comment asks for more work.
3. For each item, in order, make one change at a time, following `CLAUDE.md`:
   - Tunable numbers go in `src/core/config.js`. Look up the file by the `file` field or the task-to-files table in `CLAUDE.md`. Don't read `app/game.js`, `src/models/*.json` or `src/pack/`.
   - Run `npm run check` after each edit. Run `npm test` before you call an item finished.
   - If the item is visual (level, models, textures, lighting, HUD, weapons, effects), run the browser smoke test from `CLAUDE.md`, take a screenshot, and show it in your reply.
4. When an item is implemented and checks pass, set its `claude` tick with ArtifactData (action `update`, collection `items`, doc_id = the item id, data `{ "claude": true }`). Batch the writes when there are several.
5. If an item is unclear, blocked, or would need a design choice the user has not made, leave its `claude` tick unset, record why in the reply, and move on to the next item. Do not guess on balance or art direction.
6. Do not commit. Leave the changes in the working tree for the user to test.

Report at the end: which items you finished (with their `claude` ticks set), which you skipped and why, the `npm test` result, and any screenshots taken. Keep it short.
