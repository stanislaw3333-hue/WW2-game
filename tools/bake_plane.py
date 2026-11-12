import bpy, sys, math, os
from mathutils import Euler

# Wrapper for the Junkers flyovers (run with blender -b -P tools/bake_plane.py -- <out.json> <cfg> <source>).
# Ju87 (cfg "ju87"): imports the FBX, turns the nose from Blender +Y onto +X (length along X, as the vehicles), decimates
# it (it is seen only from far above, so detail is wasted), then hands over to tools/bake_models.py with that config.
# Ju52 (cfg "ju52"): imports the glTF as it is. Its nose already points along +X and its tail fin (the top of the model)
# is at -X, so it needs no turn; at 9k triangles it is not decimated. Then the same hand-over.
argv = sys.argv[sys.argv.index("--") + 1:]
out_path, cfg_name, src_path = argv[0], argv[1], argv[2]

bpy.ops.wm.read_factory_settings(use_empty=True)
is_gltf = src_path.lower().endswith((".glb", ".gltf"))
if is_gltf:
    bpy.ops.import_scene.gltf(filepath=src_path)
else:
    bpy.ops.import_scene.fbx(filepath=src_path)

if not is_gltf:
    # turn the whole aircraft about the world origin: top-level objects only, the children follow their parents
    r = math.radians(90)
    for o in list(bpy.data.objects):
        if o.parent is None:
            o.location.rotate(Euler((0, 0, r)))
            o.rotation_euler.z += r
    bpy.context.view_layer.update()

    # the mesh is 84k triangles: 15% is plenty at this range and keeps the baked JSON small
    for o in bpy.data.objects:
        if o.type == 'MESH' and len(o.data.polygons) > 200:
            m = o.modifiers.new("decimate", 'DECIMATE'); m.ratio = 0.15
            bpy.context.view_layer.objects.active = o
            bpy.ops.object.modifier_apply(modifier=m.name)

# hand over to the normal bake, which reads the same argv
exec(compile(open(r"I:\Documents\AI\Repo\courtyard-game\tools\bake_models.py", encoding="utf-8").read(), "bake_models.py", "exec"))
