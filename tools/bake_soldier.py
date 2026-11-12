import bpy, sys, os, runpy

# Bakes a posed German soldier (the Mixamo-style FBX from german-ww2-soldier.zip) with tools/bake_models.py. Run with
#   blender -b -P tools/bake_soldier.py -- <out.json> <config> <GermanWW2Soldier.fbx>
# <config> is a soldier key of CFG in bake_models.py (gs, gsa, gs_mp40, ...). The FBX has no materials, so this wrapper
# gives the body slot "uniform" (Soldier_1) and the helmet slot "helmet" (Helmet) before the bake runs; the UVs index german_soldier_tex.
argv = sys.argv[sys.argv.index("--") + 1:]
fbx = argv[2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=fbx)
for obj_name, mat_name in (("Soldier_1", "uniform"), ("Helmet", "helmet")):
    o = bpy.data.objects[obj_name]
    m = bpy.data.materials.new(mat_name)
    o.data.materials.clear(); o.data.materials.append(m)
here = os.path.dirname(os.path.abspath(__file__))
runpy.run_path(os.path.join(here, "bake_models.py"), run_name="__main__")
