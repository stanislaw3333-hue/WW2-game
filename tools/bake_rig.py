import bpy, sys, json, base64
from array import array
from mathutils import Vector

# Bakes the German soldier FBX ONCE as a rigged (skinned) model for runtime posing: rest-pose triangles with bone weights,
# plus the skeleton (bone names, parents, rest head positions). Every stance and animation is then made in the game
# (src/enemies/rig.js + src/enemies/poses.js), so poses never need another Blender bake.
#   blender -b -P tools/bake_rig.py -- src/models/soldier_rig.json <GermanWW2Soldier.fbx>
# Output space is the game's: metres, +Y up, the soldier faces +z, origin at the bottom centre, height 1.8 m.
# Bones keep no rest rotation: in the game every bone's rest frame is aligned with the body axes, so a pose rotation
# [x, y, z] means the same thing on every bone (x = pitch forward/back, y = turn, z = roll sideways).
# The body's UVs are replaced in the game (uniformUV in src/enemies/rig.js maps the pack's soldier sheet by position).
argv = sys.argv[sys.argv.index("--") + 1:]
out_path, fbx = argv[0], argv[1]
HEIGHT = 1.8
MAT = {"Soldier_1": "uniform", "Helmet": "helmet"}

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=fbx)
arm = bpy.data.objects["Armature"]
arm.data.pose_position = 'REST'
bpy.context.view_layer.update()
meshes = [o for o in bpy.data.objects if o.type == 'MESH']

# frame: scale and origin from the rest mesh (as tools/bake_models.py does for the posed soldiers)
dg = bpy.context.evaluated_depsgraph_get()
pts = []
for o in meshes:
    eo = o.evaluated_get(dg); me = eo.to_mesh()
    pts += [eo.matrix_world @ v.co for v in me.vertices]
    eo.to_mesh_clear()
minx, maxx = min(p.x for p in pts), max(p.x for p in pts)
miny, maxy = min(p.y for p in pts), max(p.y for p in pts)
minz, maxz = min(p.z for p in pts), max(p.z for p in pts)
S = HEIGHT / (maxz - minz)
C = Vector(((minx + maxx) / 2, (miny + maxy) / 2, minz))
def game(p):   # blender world -> game body space: scale, origin at bottom centre, (x, y, z) -> (x, z, -y)
    q = (p - C) * S
    return (q.x, q.z, -q.y)
def game_n(n):
    return (n.x, n.z, -n.y)

# skeleton, parents before children
order = []
def walk(b):
    order.append(b)
    for c in b.children: walk(c)
for b in arm.data.bones:
    if b.parent is None: walk(b)
index = {b.name: i for i, b in enumerate(order)}
W = arm.matrix_world
skel = [{"name": b.name, "parent": index[b.parent.name] if b.parent else -1, "pos": [round(x, 5) for x in game(W @ b.head_local)]} for b in order]

out = []
for o in meshes:
    me = o.data
    me.calc_loop_triangles()
    Wm = o.matrix_world; W3 = Wm.to_3x3()
    gname = {g.index: g.name for g in o.vertex_groups}
    fallback = o.parent_bone if o.parent_type == 'BONE' and o.parent_bone else "Head"
    uvl = me.uv_layers.active.data if me.uv_layers.active else None
    cn = me.corner_normals if hasattr(me, "corner_normals") else None
    P, N, U, J, Wt = array('f'), array('f'), array('f'), array('f'), array('f')
    for tri in me.loop_triangles:
        for li in tri.loops:
            v = me.vertices[me.loops[li].vertex_index]
            P.extend(game(Wm @ v.co))
            N.extend(game_n((W3 @ (cn[li].vector if cn is not None else tri.normal)).normalized()))
            uv = uvl[li].uv if uvl else (0.0, 0.0)
            U.extend((uv[0], uv[1]))
            ws = sorted(((g.weight, index[gname[g.group]]) for g in v.groups if g.weight > 0 and gname.get(g.group) in index), reverse=True)[:4]
            if not ws: ws = [(1.0, index[fallback])]
            tot = sum(w for w, _ in ws)
            ws = [(w / tot, j) for w, j in ws] + [(0.0, 0)] * (4 - len(ws))
            J.extend(float(j) for _, j in ws); Wt.extend(w for w, _ in ws)
    out.append({"mat": MAT.get(o.name, "uniform"), "count": len(P) // 3,
                "pos": base64.b64encode(P.tobytes()).decode(), "nrm": base64.b64encode(N.tobytes()).decode(),
                "uv": base64.b64encode(U.tobytes()).decode(), "skin": base64.b64encode(J.tobytes()).decode(),
                "wt": base64.b64encode(Wt.tobytes()).decode()})
    print("MESH", o.name, len(P) // 9, "tris")

with open(out_path, "w") as f:
    json.dump({"bones": skel, "meshes": out}, f)
print("DONE", out_path, len(skel), "bones")
