# Baking models in Blender

Blender 5.2 is under Program Files. Never read or edit the output JSON in `src/models/`. Unzip source assets into a scratch folder, never into the repo.

## Player hands (arm or finger shape only)
Add a `poseL`/`poseR` dict to that weapon's `CFG` entry in `tools/bake_hands.py` (`bend` = elbow degrees, `curl` / `thumb` = 0 open .. 1 the pack's closed grip, `roll` = forearm roll degrees; `poleL`/`poleR` give the forearm direction).

    blender -b -P tools/bake_hands.py -- OUT.json k98|mp40|nade BoltActionRifle.fbx

The FBX is inside `../courtyard-assets/models/Player/fps-animations-sniper-rifle.zip`. Copy OUT.json to `src/models/`.
The Kar98 left arm is baked this way (bend 30, curl 0.25, thumb 0.4, roll 180). After a re-bake, reset that hand's `r` in `HAND_OFFSETS` to `[0, 1, 0, 0]` and re-tune `d` (see docs/handtune.md).

## Enemy soldier
The enemy is one rigged model posed at runtime: see `docs/soldiers.md`. Stances need no bake.
Re-bake only for a new body mesh: `blender -b -P tools/bake_rig.py -- src/models/soldier_rig.json <GermanWW2Soldier.fbx>`.
(`tools/bake_soldier.py` and the soldier entries in `tools/bake_models.py` made the old one-model-per-stance bodies; no longer used.)

## Other models
`tools/bake_models.py` (weapons, soldiers, Panzer), `tools/bake_vehicle.py` (trucks). Regenerate with the script.
