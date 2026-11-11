---
description: Start the game for testing: build, serve, open the change tracker and the game in the browser
allowed-tools: Bash, Artifact, mcp__Claude_Browser__preview_start, mcp__ccd_view__show_pane
---

Set up a development session for Courtyard 1944 so the user can test and develop.

1. Open the change tracker artifact with the Artifact tool (`action: "open"`, url `https://claude.ai/artifact/5ZPw4c2kb3Fv95ZKfHKiwB`) so the user can see the list of changes.
2. Run `npm run build` in this folder to bundle the game to `app/game.js`. If it fails, show the last lines of the output and stop.
3. Start the static server with `npm run serve` in the background (run_in_background). It serves `app/` on http://localhost:8080 and must keep running. If port 8080 is already in use, the server is already running; continue.
4. Open `http://localhost:8080/index.html?test` in the built-in browser with `preview_start` (url).
5. Show the browser pane beside the conversation with `mcp__ccd_view__show_pane` (pane `preview`) so the game is visible under the change tracker, and show the artifact pane (pane `artifact`).

Only open the windows. Do not take screenshots, run the smoke test, drive the game or check the console. Report only: the build result, that the server is running on http://localhost:8080, and that the change tracker and the game are open. Do not make code changes in this command.
