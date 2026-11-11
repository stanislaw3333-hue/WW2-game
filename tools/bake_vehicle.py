import bpy, sys, math, bmesh
from mathutils import Euler

# Wrapper for baking the vehicle models (run with blender -b -P tools/bake_vehicle.py -- <out.json> <cfg>).
# It prepares each source for tools/bake_models.py, which then does the actual export. Both vehicles end up with
# length along Blender X and the same export as the tanks and guns.
#   canopy: a Blender scene, length along Y: turned onto X, then welded and decimated for size.
#   polish: a 600k-vertex glTF. Collapsing it directly smears its picture (decimation ignores UVs), so instead:
#           a low-poly copy gets fresh UVs (smart project) and its colour is baked from the full model.
PACK_TEX = r"I:\Documents\AI\Repo\courtyard-game\src\pack\truck_polish.png"
SCRATCH = r"C:\Users\Stani\AppData\Local\Temp\claude\5bdd196cfab03309\b1f9e716-d637-49d2-b0fe-625fdfed1d22\scratchpad"

argv = sys.argv[sys.argv.index("--") + 1:]
out_path, cfg_name = argv[0], argv[1]


def weld_and_decimate(obj, ratio):
    # the glTF mesh has a separate vertex for every corner: weld the coincident ones first, or the collapse tears the shape
    bm = bmesh.new(); bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0005)
    bm.to_mesh(obj.data); bm.free()
    m = obj.modifiers.new("decimate", 'DECIMATE'); m.ratio = ratio
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=m.name)


if cfg_name == "polish":
    bpy.ops.import_scene.gltf(filepath=SCRATCH + r"\veh_polish\source\model.glb")
    hi = bpy.data.objects["mesh_0"]

    # low-poly copy with its own UVs
    low = hi.copy(); low.data = hi.data.copy(); low.name = "low"
    bpy.context.collection.objects.link(low)
    # the source is thousands of loose pieces: voxel remesh merges them into one closed shell, then it is reduced
    bpy.ops.object.select_all(action='DESELECT')
    low.select_set(True); bpy.context.view_layer.objects.active = low
    # clean first: drop degenerate faces and welded duplicates, which OpenVDB's mesh-to-volume step can choke on
    bm = bmesh.new(); bm.from_mesh(low.data)
    bmesh.ops.dissolve_degenerate(bm, dist=0.0001, edges=bm.edges)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0005)
    bm.to_mesh(low.data); bm.free()
    # voxel remesh is skipped: Blender 5.2 crashes inside OpenVDB meshToVolume on this mesh at every voxel size tried.
    # the plain weld + decimate keeps the shape; the colour still comes from the full model by the bake below
    weld_and_decimate(low, 0.2)
    weld_and_decimate(low, 0.15)   # second pass: the first leaves ~200k triangles, too big for the game bundle (26 MB JSON)
    print("LOWTRIS", len(low.data.polygons), "LOWVERTS", len(low.data.vertices))
    bpy.ops.object.select_all(action='DESELECT')
    low.select_set(True); bpy.context.view_layer.objects.active = low
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(80), island_margin=0.01)   # wide angle: fewer, larger islands
    bpy.ops.object.mode_set(mode='OBJECT')

    # the baked picture and the material the bake writes into
    img = bpy.data.images.new("truck_bake", 4096, 4096)   # four times the texels of the first bake: less pixelated
    mat = bpy.data.materials.new("truckbake"); mat.use_nodes = True   # unique name: bake_models.py maps it to the 'truck' key
    tree = mat.node_tree
    tex = tree.nodes.new('ShaderNodeTexImage'); tex.image = img
    bsdf = tree.nodes.get("Principled BSDF")
    if bsdf:
        tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    tree.nodes.active = tex
    low.data.materials.clear(); low.data.materials.append(mat)

    # bake the colour of the full model onto the low one
    scn = bpy.context.scene
    scn.render.engine = 'CYCLES'
    scn.cycles.device = 'CPU'
    scn.cycles.samples = 4
    bpy.ops.object.select_all(action='DESELECT')
    hi.select_set(True); low.select_set(True); bpy.context.view_layer.objects.active = low
    bpy.ops.object.bake(type='DIFFUSE', pass_filter={'COLOR'}, use_selected_to_active=True,
                        cage_extrusion=0.02, max_ray_distance=0.2, margin=6, target='IMAGE_TEXTURES')
    img.filepath_raw = PACK_TEX
    img.file_format = 'PNG'
    img.save()
    print("BAKED", PACK_TEX)

    # the full model is no longer needed; only the low one is exported
    bpy.data.objects.remove(hi, do_unlink=True)

else:  # canopy
    bpy.ops.wm.open_mainfile(filepath=SCRATCH + r"\veh_canopy\source\canopytruck.blend")
    for o in bpy.data.objects:
        if o.type == 'MESH' and o.parent is None:
            r = math.radians(90)
            o.location.rotate(Euler((0, 0, r)))   # turn the whole vehicle about the world origin
            o.rotation_euler.z += r
    for o in bpy.data.objects:
        if o.type == 'MESH' and len(o.data.vertices) > 2000:
            weld_and_decimate(o, 0.4)

# hand over to the normal bake, which reads the same argv
exec(compile(open(r"I:\Documents\AI\Repo\courtyard-game\tools\bake_models.py", encoding="utf-8").read(), "bake_models.py", "exec"))
