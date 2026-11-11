---
description: Package Courtyard 1944 into a Windows test exe (bundle, package, copy to outputs)
allowed-tools: Bash("C:/Program Files/Git/bin/bash.exe":*)
---

Build the test exe by running the project script in this repo. Do not run esbuild or electron-builder by hand.

!`"/c/Program Files/Git/bin/bash.exe" build-exe.sh "/i/Documents/AI/Claude repo/outputs" 2>&1 | tail -30`

Report only the result: that the exe was built, its path in the outputs folder, and the size. If the build failed, show the last lines of the output and say which step failed.
