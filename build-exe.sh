#!/usr/bin/env bash
# One-command Windows exe build for Courtyard 1944.  Usage: bash build-exe.sh [outdir]
# Bundles src/ -> app/game.js, wraps app/ in Electron, builds a portable x64 exe, smoke-tests it, copies it to outdir.
# Needs: node/npm, src/pack/*.png (texture pack). First run downloads Electron tooling (~2 min); later runs reuse .exe-build/.
set -euo pipefail
cd "$(dirname "$0")"
OUT="${1:-outputs}"   # default: outputs/ in this folder
LOG=.exe-build/build.log
mkdir -p .exe-build "$OUT"
fail() { echo "BUILD FAILED: $1"; [ -f "$LOG" ] && tail -20 "$LOG"; exit 1; }

[ -d src/pack ] || fail "src/pack missing - unzip courtyard-pack-textures.zip into src/"
[ -d node_modules/esbuild ] || npm install --no-audit --no-fund >"$LOG" 2>&1 || fail "npm install"

echo "[1/4] bundling game"
npx esbuild src/game.js --bundle --minify --loader:.png=dataurl --loader:.mp3=dataurl --loader:.wav=dataurl --outfile=app/game.js --log-level=warning || fail "esbuild"

echo "[2/4] staging electron shell"
rm -rf .exe-build/app/dist
mkdir -p .exe-build/app
cp app/index.html app/main.js app/game.js .exe-build/app/
cat > .exe-build/app/package.json <<'EOF'
{
  "name": "courtyard-1944", "productName": "Courtyard 1944", "version": "0.1.0", "main": "main.js",
  "description": "Courtyard 1944", "author": "", "license": "UNLICENSED",
  "build": {
    "appId": "com.courtyard1944.game", "productName": "Courtyard 1944", "files": ["**/*", "!dist/**"],
    "win": { "target": [{ "target": "portable", "arch": ["x64"] }], "signAndEditExecutable": false, "sign": null },
    "portable": { "artifactName": "Courtyard1944.exe" }
  },
  "devDependencies": { "electron": "^33.0.0", "electron-builder": "^25.0.0" }
}
EOF
cd .exe-build/app
[ -d node_modules/electron-builder ] || npm install --no-audit --no-fund >"../build.log" 2>&1 || { cd ../..; fail "electron install"; }

echo "[3/4] building exe (about 2 min)"
npx electron-builder --win portable --x64 --publish never >"../build.log" 2>&1 || { cd ../..; fail "electron-builder"; }
[ -f dist/Courtyard1944.exe ] || { cd ../..; fail "exe not produced"; }

echo "[4/4] smoke test"
if command -v xvfb-run >/dev/null; then
  COURTYARD_SMOKE=1 timeout 100 xvfb-run -a ./node_modules/electron/dist/electron --no-sandbox . >../smoke.log 2>&1 || true
  grep -q '^SMOKE' ../smoke.log && grep '^SMOKE' ../smoke.log || { cd ../..; LOG=.exe-build/smoke.log; fail "smoke test did not report"; }
else echo "xvfb not available, smoke test skipped"; fi
cd ../..
cp .exe-build/app/dist/Courtyard1944.exe "$OUT/Courtyard1944.exe"
echo "DONE: $OUT/Courtyard1944.exe ($(du -h "$OUT/Courtyard1944.exe" | cut -f1))"
