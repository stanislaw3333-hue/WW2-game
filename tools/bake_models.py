import bpy, sys, json, base64, math
from array import array
from mathutils import Matrix, Vector

# Bakes one .blend into a JSON of base64 Float32 arrays that the game imports directly.
# Output space matches three.js: muzzle along -Z, +Y up, origin at the receiver (guns)
# or at the bottom centre (vehicles and soldiers). Units are metres.
# Soldiers ("pg") can also be posed: both hands go to the carried-rifle grips used by poseEnemy.
argv = sys.argv[sys.argv.index("--") + 1:]
out_path, cfg_name = argv[0], argv[1]
CFG = {
    "k98": dict(length=1.23, rot=90, muzzle=1, origin_x=-0.337,
                drop=["7.92x57", "79257", "79257 5rnd clip empty", "bolt", "idk for bolt"],
                mats={"1wo": "wood", "kar98 marking": "wood"},
                # the model's own five-round stripper clip, baked as separate meshes (steel strip, brass rounds) at its seated position so the reload can slide it
                part_mats={"79257 5rnd clip|1b": "clip", "79257 5rnd clip|blt": "clipbrass"}),
    # parts: objects split out into their own mesh key so the game can move them (the MP40 bolt slides on its own)
    # only the outside side piece of bolt detail #0 moves (found by its island bounds); the slide, its knob and everything else on the gun stay fixed
    "mp40": dict(length=0.80, rot=-90, muzzle=-1, origin_x=0.137,
                 drop=["Cube.002", "Cube.004"], mats={}, parts={},
                 moving_boxes={"bolt detail #0": [((-0.26, -0.47, 0.43), (-0.05, -0.1565, 0.64))]}),
    # vehicles: bottom-centre origin, length along X (tools/bake_vehicle.py turns and decimates the source first)
    # both trucks are scaled uniformly (length sets the size, proportions unchanged)
    "polish": dict(length=5.3, rot=None, muzzle=None, origin_x=None, drop=["Cube"], mats={"truckbake": "truck"}),
    "canopy": dict(length=5.6, rot=None, muzzle=None, origin_x=None, drop=[],
                   mats={"Metal_painted": "paint", "van_paint_2": "paint", "paint2": "paint", "armytruck": "paint",
                         "canvas": "canvas", "canvaslowres": "canvas",
                         "tyre texture bake": "tire", "lorrywheel": "tire", "lorrywheel_dusty": "tire",
                         "wood": "wood", "woodbed": "wood", "planks": "wood", "ASH": "wood",
                         "Glass": "glass", "dirty_glass": "glass", "dirty windshield": "glass",
                         "headlight glass": "glass", "mirror": "glass"}),
    # Junkers Ju87: length along X (the fuselage, 11 m); bake_plane.py turns the nose onto X first. Its materials
    # all bake to the default key ("metal") and the game colours them dark itself.
    "ju87": dict(length=11.0, rot=None, muzzle=None, origin_x=None, drop=[], mats={}),
    # Junkers Ju52 (junkers-ju-52.zip, glTF): real length 18.9 m, along X, nose +X. Same single "metal" key as the Ju87 so it takes the same dark colour.
    "ju52": dict(length=18.9, rot=None, muzzle=None, origin_x=None, drop=[], mats={}),
    "pz1": dict(length=5.4, rot=None, muzzle=None, origin_x=None, drop=[],
                mats={"gray": "armor", "black": "tire"}),
    "pg": dict(height=1.8, rot=None, muzzle=None, origin_x=None, drop=[], pose="carry",
               mats={"Material.003": "uniform", "helmetm42_low": "helmet", "scrimwire_low": "helmet",
                     "scrimleaves_low": "helmet", "ammopouchesgerman_low": "leather"}),
    "pga": dict(height=1.8, rot=None, muzzle=None, origin_x=None, drop=[], pose="aim",
                mats={"Material.003": "uniform", "helmetm42_low": "helmet", "scrimwire_low": "helmet",
                      "scrimleaves_low": "helmet", "ammopouchesgerman_low": "leather"}),
    # German soldier FBX (Mixamo-style rig, no "mixamorig:" prefix). The wrapper script names the material
    # slots "uniform" (Soldier_1) and "helmet" (Helmet) before this runs. Its UVs index german_soldier_tex.
    # gun="k98" / "mp40": both hands go to the same grip points on that gun as the player's hands (GRIPS below), so the
    # enemy holds each gun the way the player does. gs / gsa = carried / shouldered Kar98; gs_mp40 / gsa_mp40 the same with the MP40.
    "gs": dict(height=1.8, rot=None, muzzle=None, origin_x=None, drop=[], pose="carry", prefix="", chain=3, gun="k98",
               mats={"uniform": "uniform", "helmet": "helmet"}),
    # aim: trigger elbow drops low and back, support elbow low and out (the reference shouldering pose)
    "gsa": dict(height=1.8, rot=None, muzzle=None, origin_x=None, drop=[], pose="aim", prefix="", chain=3, gun="k98",
                pole_r=(-0.45, 0.85, -0.3), pole_l=(0.5, 0.85, 0.1),
                mats={"uniform": "uniform", "helmet": "helmet"}),
    "gs_mp40": dict(height=1.8, rot=None, muzzle=None, origin_x=None, drop=[], pose="carry", prefix="", chain=3, gun="mp40",
                    mats={"uniform": "uniform", "helmet": "helmet"}),
    "gsa_mp40": dict(height=1.8, rot=None, muzzle=None, origin_x=None, drop=[], pose="aim", prefix="", chain=3, gun="mp40",
                     pole_r=(-0.45, 0.85, -0.3), pole_l=(0.5, 0.85, 0.1),
                     mats={"uniform": "uniform", "helmet": "helmet"}),
    # Stielhandgranate throw, three poses (hands as [right, left] targets in game body space, three.js axes, metres): the grenade
    # held at the chest, the arm cocked back over the shoulder, and the arm swung forward at release. The free hand balances.
    "ng_hold": dict(height=1.8, rot=None, muzzle=None, origin_x=None, drop=[], pose="free", prefix="", chain=3,
                    hands=[(-0.20, 1.18, 0.30), (0.26, 0.92, 0.08)], pole_r=(-0.55, 1.0, 0.0), pole_l=(0.6, 1.0, -0.2),
                    mats={"uniform": "uniform", "helmet": "helmet"}),
    "ng_wind": dict(height=1.8, rot=None, muzzle=None, origin_x=None, drop=[], pose="free", prefix="", chain=3,
                    hands=[(-0.28, 1.78, -0.26), (0.30, 1.30, 0.36)], pole_r=(-0.7, 1.55, -0.35), pole_l=(0.6, 1.1, 0.1),
                    mats={"uniform": "uniform", "helmet": "helmet"}),
    "ng_throw": dict(height=1.8, rot=None, muzzle=None, origin_x=None, drop=[], pose="free", prefix="", chain=3,
                     hands=[(-0.18, 1.52, 0.57), (0.26, 0.95, 0.05)], pole_r=(-0.5, 1.25, 0.2), pole_l=(0.6, 1.0, -0.1),
                     mats={"uniform": "uniform", "helmet": "helmet"}),
}[cfg_name]
BONE = CFG.get("prefix", "mixamorig:")

def evaluated_meshes():
    dg = bpy.context.evaluated_depsgraph_get()
    out = []
    for o in bpy.data.objects:
        if o.type == 'MESH' and o.name not in CFG["drop"]:
            eo = o.evaluated_get(dg)
            out.append((o, eo, eo.to_mesh()))
    return out

def points(meshes):
    pts = []
    for _, eo, me in meshes:
        for v in me.vertices:
            pts.append(eo.matrix_world @ v.co)
    return pts

# ---- rest bounds: fix the scale and origin from the rest pose so posing does not move the model
rest = points(evaluated_meshes())
minx, maxx = min(p.x for p in rest), max(p.x for p in rest)
miny, maxy = min(p.y for p in rest), max(p.y for p in rest)
minz, maxz = min(p.z for p in rest), max(p.z for p in rest)
if "height" in CFG:
    S = CFG["height"] / (maxz - minz)
    FRAME = (S, (minx + maxx) / 2, (miny + maxy) / 2, minz)  # scale, centre x, centre y, feet z

# ---- pose: IK both hands onto the rifle grips, pole targets keep the elbows out and down
if CFG.get("pose"):
    S, cx, cy, fz = FRAME
    def to_blender(t):   # game body space (three.js axes) -> blender world
        return Vector((t[0] / S + cx, -t[2] / S + cy, t[1] / S + fz))
    # rifle grips from src/game.js poseEnemy, in the rifle's own frame: right hand on the rifle origin,
    # left hand 0.2 m along the rifle's +z. Carried: rifle (0, 1.07, 0.2), Euler(0.45, 0.65, 0).
    # Shouldered: rifle (-0.085, 1.5, 0.25), Euler(0, 0.05, 0). Euler order is YXZ, as in three.js.
    # Kept in step with poseEnemy in src/enemies/soldiers.js.
    if CFG["pose"] == "aim":
        RIGHT = Vector((-0.085, 1.5, 0.25))
        rot = Matrix.Rotation(0.05, 3, 'Y')
    else:
        RIGHT = Vector((0.0, 1.07, 0.2))
        rot = Matrix.Rotation(0.65, 3, 'Y') @ Matrix.Rotation(0.45, 3, 'X')
    LEFT = RIGHT + rot @ Vector((0.0, 0.0, 0.2))
    if CFG.get("hands"):                       # explicit hand targets in body space (the grenade poses)
        RIGHT, LEFT = Vector(CFG["hands"][0]), Vector(CFG["hands"][1])
    elif CFG.get("gun"):
        # the player's grip points on the gun (gun space, muzzle along -Z): the enemy gun is the same model turned half a circle
        # about Y and moved 0.08 m (rifleM in addEnemy), then placed in the body by the pose's rifle position and rotation
        GRIPS = {"k98": dict(R=(0.086, -0.053, 0.185), L=(-0.034, -0.057, -0.22)),     # HAND_OFFSETS p + d for each hand
                 "mp40": dict(R=(0.099, -0.089, 0.271), L=(-0.052, -0.133, -0.071))}
        def grip_to_body(g):
            return RIGHT_ORIGIN + rot @ Vector((-g[0], g[1], -g[2] + 0.08))
        RIGHT_ORIGIN = RIGHT
        RIGHT, LEFT = grip_to_body(GRIPS[CFG["gun"]]["R"]), grip_to_body(GRIPS[CFG["gun"]]["L"])
    arm = bpy.data.objects["Armature"]
    scn = bpy.context.scene
    for side, tgt, pole, bone in [("R", RIGHT, CFG.get("pole_r", (-0.55, 1.2, 0.0)), BONE + "RightHand"),
                                  ("L", LEFT, CFG.get("pole_l", (0.55, 1.2, 0.0)), BONE + "LeftHand")]:
        t = bpy.data.objects.new("tgt" + side, None); scn.collection.objects.link(t)
        t.location = to_blender(tgt); t.empty_display_size = 0.05
        p = bpy.data.objects.new("pole" + side, None); scn.collection.objects.link(p)
        p.location = to_blender(pole); p.empty_display_size = 0.05
        c = arm.pose.bones[bone].constraints.new('IK')
        c.target = t; c.chain_count = CFG.get("chain", 2); c.pole_target = p; c.pole_angle = 0.0   # chain counts the hand bone itself
        c.use_tail = True
    bpy.context.view_layer.update()
    print("POSED", "R", tuple(round(x, 3) for x in to_blender(RIGHT)), "L", tuple(round(x, 3) for x in to_blender(LEFT)))

# ---- gather world-space triangles with material key, normal and uv (posed, evaluated)
meshes = evaluated_meshes()
tris = []
for o, eo, me in meshes:
    me.calc_loop_triangles()
    W = eo.matrix_world
    W3 = W.to_3x3()
    uvl = me.uv_layers.active.data if me.uv_layers.active else None
    cn = me.corner_normals if hasattr(me, "corner_normals") else None
    for tri in me.loop_triangles:
        slot = o.material_slots[tri.material_index] if tri.material_index < len(o.material_slots) else None
        mname = slot.material.name if slot and slot.material else "none"
        key = CFG.get("part_mats", {}).get(o.name + "|" + mname) or CFG.get("parts", {}).get(o.name) or CFG["mats"].get(mname, "metal")
        # an object can move in part only: triangles centred inside a "moving" box go to the moving key, the rest of it stays fixed
        if o.name in CFG.get("moving_boxes", {}):
            c = sum((W @ me.vertices[me.loops[li].vertex_index].co for li in tri.loops), Vector((0, 0, 0))) / 3
            inside = any(all(lo[i] <= c[i] <= hi[i] for i in range(3)) for lo, hi in CFG["moving_boxes"][o.name])
            key = "bolt" if inside else "metal"
        vs = []
        for li in tri.loops:
            p = W @ me.vertices[me.loops[li].vertex_index].co
            n = (W3 @ (cn[li].vector if cn is not None else tri.normal)).normalized()
            uv = uvl[li].uv if uvl else (0.0, 0.0)
            vs.append((p, n, uv))
        tris.append((key, vs))

pts = [v[0] for _, vs in tris for v in vs]
minx, maxx = min(p.x for p in pts), max(p.x for p in pts)
miny, maxy = min(p.y for p in pts), max(p.y for p in pts)
minz = min(p.z for p in pts)
length = maxx - minx

# ---- transform: scale to metres, then place the origin, then orient
if "height" in CFG:
    S, cx, cy, fz = FRAME
    G = Matrix.Scale(S, 4) @ Matrix.Translation(-Vector((cx, cy, fz)))
elif CFG["rot"] is None:
    o_pt = Vector(((minx + maxx) / 2, (miny + maxy) / 2, minz))   # bottom centre
    G = Matrix.Scale(CFG["length"] / length, 4) @ Matrix.Translation(-o_pt)
else:
    sign = CFG["muzzle"]
    muzzle_x = maxx if sign > 0 else minx
    band = [p for p in pts if abs(p.x - muzzle_x) < 0.6]
    oz = sum(p.z for p in band) / len(band)                       # barrel axis height
    o_pt = Vector((CFG["origin_x"], 0.0, oz))
    R = Matrix.Rotation(math.radians(CFG["rot"]), 4, 'Z')
    G = Matrix.Scale(CFG["length"] / length, 4) @ R @ Matrix.Translation(-o_pt)
G3 = G.to_3x3()

# ---- bucket by material; blender (x, y, z) -> three (x, z, -y)
groups = {}
def conv(v):
    return (v.x, v.z, -v.y)
for key, vs in tris:
    P, N, U = groups.setdefault(key, (array('f'), array('f'), array('f')))
    for p, n, uv in vs:
        q = conv(G @ p); m = conv((G3 @ n).normalized())
        P.extend(q); N.extend(m); U.extend((uv[0], uv[1]))

def b64(a):
    return base64.b64encode(a.tobytes()).decode("ascii")

data = {"meshes": [{"mat": k, "count": len(P) // 3, "pos": b64(P), "nrm": b64(N), "uv": b64(U)}
                   for k, (P, N, U) in groups.items()]}
with open(out_path, "w") as f:
    json.dump(data, f)

allq = [conv(G @ p) for _, vs in tris for p, _, _ in vs]
for i, ax in enumerate("xyz"):
    print("BBOX3", ax, round(min(q[i] for q in allq), 4), round(max(q[i] for q in allq), 4))
print("MESHES", {k: len(v[0]) // 3 for k, v in groups.items()})
print("DONE", out_path)
