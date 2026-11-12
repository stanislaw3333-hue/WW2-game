---
description: Read the change tracker and implement every change that is not yet done (Claude tick not set, or still needs work)
allowed-tools: ArtifactData, Artifact, Read, Edit, Write, Grep, Glob, Bash
---

Implement the open changes from the Courtyard 1944 change tracker.

The tracker is the artifact at `https://claude.ai/artifact/5ZPw4c2kb3Fv95ZKfHKiwB`. It has two artifact database collections:
- `items`: one document per change, with `text`, `file`, `note`, `group`, `order`, `claude` (my tick), `you` (the user's tick), `shots` (pasted screenshot ids) and the old `comment` / `comment_archive` fields (history only, from before threads).
- `comments`: **the user's comments live here, not on the items.** One document per message in a thread, with `item` (the item id), `by` (`"you"` or `"claude"`), `text` and `at` (ISO time). A thread is all messages with the same `item`, oldest first.

1. Read BOTH collections with ArtifactData (action `list`, url above, `query.limit` 1000, the same `out_dir` in the scratchpad for both; first delete any old copy of that folder so stale files don't linger). Read `comments` every run, fresh. Then run `node tools/tracker.mjs <out_dir>`: it prints only the open items (rules in steps 1b and 2) sorted by `order`, each with its whole thread, plus counts of waiting / done / hidden items. Work from that output; do not Read the JSON files one by one. Take each item's `version` (for `if_version`) from the list result. Do not decide from version numbers or from the `claude` tick alone.
1b. **Ignore every item whose `hidden` field is true.** The user ticked Hide to park it: do not implement it, do not categorise it, do not reply in its thread and do not mention it in the report (at most one line: "N hidden items ignored").
2. An item is **open** when it is not done (`claude` and `you` not both true) or when its thread's latest message is by `"you"` (an unanswered comment, even if both ticks are set). Work on every open item:
   - `claude` not true: implement it. Read its whole thread first.
   - Thread's latest message is by `"you"`: that comment is the new brief, even if `claude` is already true. A comment means the user has seen the previous attempt and wants a change.
   - `claude` true, `you` not set, and no unanswered comment: skip it, it is waiting for the user.
   - A comment saying the item cannot be checked yet (waiting on another item) is not new work: leave it, and say what it waits on.
2b. Categorise each item yourself while you analyse it. The `group` the user picked is only a suggestion: choose the group that fits the change best, even when one is already set.
   - Skip an item only if its `group_by` field is `"claude"`. That means I categorised it before. All other items get re-categorised, including those the user grouped.
   - Groups are the `GROUPS` list in the tracker page. Pick an existing one when it fits.
   - If no existing group fits, create one: add it to `GROUPS` in the tracker page (keep its order) and republish the tracker to the same URL, so the add form and the sections show it. Then use it.
   - When you set a group, write `group` and `group_by: "claude"` together in the same ArtifactData update, and list the item and its old and new group in the reply.
3. For each item, in order, make one change at a time, following `CLAUDE.md`:
   - Tunable numbers go in `src/core/config.js`. Look up the file by the `file` field or the task-to-files table in `CLAUDE.md`. Don't read `app/game.js`, `src/models/*.json` or `src/pack/`.
   - Run `npm run check` after each edit. Run `npm test` before you call an item finished.
   - If the item is visual (level, models, textures, lighting, HUD, weapons, effects), run the browser smoke test from `CLAUDE.md`, take a screenshot, and show it in your reply.
4. When an item is implemented and checks pass, set its `claude` tick with ArtifactData (action `update`, collection `items`, doc_id = the item id, data `{ "claude": true }`), and reply in its thread: add a document to `comments` with doc_id like `m<timestamp>`, data `{ "item": <item id>, "by": "claude", "text": <what changed and what to check>, "at": <the real current UTC time> }`. Get the time from `date -u +%Y-%m-%dT%H:%M:%S.000Z` in Bash right before writing: never invent or round a timestamp, because the tracker orders every message in a thread by `at`, so a made-up time puts Claude's reply in the wrong place among the user's comments. Batch the writes when there are several.
5. If an item is unclear, blocked, or would need a design choice the user has not made, leave its `claude` tick unset, record why in the reply, and move on to the next item. Do not guess on balance or art direction.
6. Do not commit. Leave the changes in the working tree for the user to test.

Do the re-categorisation silently: do not list it in the report.

Also reply in the thread (by `"claude"`) when you leave an item unfinished, with the reason, so the user sees it in the tracker.

Report at the end: which items you finished (with their `claude` ticks set), which you skipped and why, the `npm test` result, and any screenshots taken. Keep it short.
