import bpy, sys, json, base64, os, re, shutil, tempfile, math
from array import array
from mathutils import Matrix, Vector

# Bakes the first-person hands from the FPS sniper pack (run with
#   blender -b -P tools/bake_hands.py -- <out.json> <k98|mp40|nade> <BoltActionRifle.fbx>).
# The pack's arm and hand mesh is skinned to a rig. Each weapon gets its own bake: the pack's idle pose is moved so
# each hand sits on that weapon's grip (the points the procedural arm() hands used in src/weapons/guns.js), with the
# forearm pointing at the elbow point. The mesh is decimated to DECIMATE of its triangles to match the game's
# low-poly look, then split into a "right" and a "left" key so the game can move each hand on its own.
# Optional per-arm pose keys in CFG (side R or L), so each weapon can have its own arm and hand pose without hand-editing this file:
#   poseL / poseR = dict(bend=deg, curl=0..1, thumb=0..1, roll=deg)
#     bend  elbow bend in degrees (0 = straight arm); the forearm and hand turn as one block about the elbow. Omit to keep the pack's bend.
#     curl  how much of the pack's finger curl is kept: 0 = flat open fingers, 1 = the pack's grip (default 1), above 1 = a tighter clench
#     thumb the same for the thumb (default 1)
#     wrist='straight' turns the hand about the wrist until it lies along the forearm
#     curl_like=(target, ref) bends the finger starting at bone number target like the finger starting at ref (4 = the pack's trigger finger, 8 = middle finger)
#     close 0..1 brings the four fingers together sideways (0 = the pack's spread, 1 = all pointing the same way)
#     roll  turn of the forearm about its own axis in degrees (180 = palm up when the pack's pose is palm down)
#   poleX is only a direction (grip point to elbow) for the forearm; its length does not matter.
# Output space: three.js axes, metres, origin at the barrel axis (y = 0), muzzle along -Z, same as the guns.
argv = sys.argv[sys.argv.index("--") + 1:]
out_path, cfg_name, fbx_path = argv[0], argv[1], argv[2]
DECIMATE = 0.2
HAND_SCALE = 0.88   # hands and forearms shrunk about the palm, so they sit a little smaller against the guns

# grip points in three.js gun space (the hand centres used by guns.js arm()); poles are the elbow positions
CFG = {
    "k98":  dict(R=(0.006, -0.058, 0.15),  L=(-0.004, -0.052, -0.29), poleR=(0.14, -0.28, 0.52),  poleL=(-0.124, -0.302, 0.67),
                 # left arm held out under the forestock like the reference photo: forearm nearly straight with the upper arm, palm up, fingers slightly curled
                 poseL=dict(bend=-30, curl=0.45, thumb=0.9, close=0.7, roll=180)),
    "mp40": dict(R=(0.004, -0.074, 0.066), L=(-0.002, -0.128, -0.156), poleR=(0.15, -0.28, 0.45), poleL=(-0.25, -0.35, 0.12)),
    # nade: the grip is nudged up and to the right so the fingers close round the handle (tuned in game)
    "nade": dict(R=(0.02, -0.07, -0.1),    L=None, poleR=(0.16, -0.22, 0.86), poleL=None, shiftR=(0.04, 0.05, 0),
                 # the pack's right hand has its index finger out on the trigger; curl it into a fist like the other fingers so the hand grips the grenade
                 poseR=dict(bend=0, wrist='straight', curl_like=(4, 8), curl=1.3, thumb=1.3)),
}[cfg_name]

bpy.ops.wm.read_factory_settings(use_empty=True)

# Blender 5.2's FBX importer fails on the pack's sun light (it sets cycles.cast_shadow, which no longer exists).
# Load a private copy of the importer with that one line skipped; the installed Blender is not changed.
def load_fbx(path):
    lib = os.path.join(bpy.utils.resource_path('LOCAL'), 'scripts', 'addons_core', 'io_scene_fbx')
    tmp = tempfile.mkdtemp(prefix='fbxfix_')
    pkg = os.path.join(tmp, 'io_scene_fbx_fixed')
    shutil.copytree(lib, pkg)
    src_path = os.path.join(pkg, 'import_fbx.py')
    src = open(src_path, encoding='utf-8').read()
    line = 'lamp.cycles.cast_shadow = lamp.use_shadow'
    assert line in src, 'importer changed: fix needs updating'
    open(src_path, 'w', encoding='utf-8').write(src.replace(line, 'pass'))
    sys.path.insert(0, tmp)
    import io_scene_fbx_fixed.import_fbx as imp
    class Op:
        def report(self, kind, msg): print('FBX', kind, msg)
    assert imp.load(Op(), bpy.context, filepath=path) == {'FINISHED'}
load_fbx(fbx_path)

# barrel axis from the rifle: the muzzle end of the barrel sets the x and z of the gun origin
rifle = bpy.data.objects['Rifle']
rw = [rifle.matrix_world @ v.co for v in rifle.data.vertices]
barrel = [p for p in rw if p.y < -0.5]
ox = sum(p.x for p in barrel) / len(barrel)
oz = sum(p.z for p in barrel) / len(barrel)
print('ORIGIN', round(ox, 4), round(oz, 4), 'muzzle y', round(min(p.y for p in rw), 4))

# blender (rifle along y, muzzle at -y, z up) -> three.js (muzzle along -z, y up). Proper rotation, so winding holds.
def to_three(p):
    return Vector((-(p.x - ox), p.z - oz, p.y))
def dir_three(n):
    return Vector((-n.x, n.z, n.y))
def to_blender(t):
    return Vector((ox - t[0], oz + t[1], t[2]))

arms = bpy.data.objects['arms']
rig = bpy.data.objects['Rig']
scn = bpy.context.scene

# decimate on the rest pose (the armature stays in place; vertex groups carry through)
bpy.context.view_layer.objects.active = arms
dec = arms.modifiers.new('decimate', 'DECIMATE'); dec.ratio = DECIMATE
bpy.ops.object.modifier_move_to_index(modifier=dec.name, index=0)
bpy.ops.object.modifier_apply(modifier=dec.name)

# pose: the pack's own idle clip, where both hands already hold the rifle (its arm poses are keyed, not constrained).
# Each arm is then moved as one rigid piece: rotated about its hand so the forearm points at the elbow target, and
# moved so the hand sits on its grip. Arm lengths are kept, so nothing stretches.
rig.animation_data.action = bpy.data.actions['Rig|Rig|SRifle_Idle']
scn.frame_set(1)
bpy.context.view_layer.update()
rig.animation_data.action = None   # the evaluated idle pose stays on the pose bones; clearing the action lets the pose edits below stick
# ---- optional pose changes (see the header): elbow bend and finger curl, applied to the pack's idle pose
def world_head(name):
    return rig.pose.bones[name].head.copy()
def turn_blocks(top_bones, pivot, axis, angle):
    # turn whole bone subtrees rigidly about pivot (armature space); only the top bone of each subtree is set, its children follow
    M = Matrix.Translation(pivot) @ Matrix.Rotation(angle, 4, axis.normalized()) @ Matrix.Translation(-pivot)
    old = [(rig.pose.bones[n], rig.pose.bones[n].matrix.copy()) for n in top_bones]
    for pb, m in old:
        pb.matrix = M @ m
    bpy.context.view_layer.update()
def bend_elbow(side, deg):
    up_head = world_head('UpArm_' + side); el = world_head('Forearm_' + side); wr = world_head('Hand_' + side)
    d_up = (el - up_head).normalized(); d_fore = (wr - el).normalized()
    cur = d_up.angle(d_fore)
    print('ELBOW', side, 'bend', round(math.degrees(cur), 1), '->', deg)
    axis = d_fore.cross(d_up)
    if axis.length < 0.05:   # arm folded flat (the pack's right arm): pick a hinge axis across the arm
        axis = d_fore.cross(Vector((0, 0, 1)))
    if axis.length > 1e-6:
        turn_blocks(['Forearm_' + side, 'IK_Hand_Cntrl_' + side], el, axis, cur - math.radians(deg))
FINGERS = [[4, 5, 6, 7], [8, 9, 10, 11], [12, 13, 14, 15], [16, 17, 18, 19]]
THUMB = [[20, 21, 22]]
def straighten(side, chains, keep):
    # each joint is opened by (1 - keep) of its bend, working outward from the knuckle so the later bones follow
    for chain in chains:
        names = ['Bone_%s.%03d' % (side, n) for n in chain] + ['Bone_%s.%03d_end' % (side, chain[-1])]
        for i in range(1, len(names) - 1):
            h = world_head(names[i])
            d = (world_head(names[i + 1]) - h).normalized(); dp = (h - world_head(names[i - 1])).normalized()
            ang = d.angle(dp); axis = d.cross(dp)
            if axis.length > 1e-6 and ang > 1e-4:
                turn_blocks([names[i]], h, axis, ang * (1 - keep))
def straight_wrist(side):
    # turn the hand (and fingers) about the wrist until it lies along the forearm: wrist in line with the forearm
    el = world_head('Forearm_' + side); wr = world_head('Hand_' + side); kn = world_head('Bone_%s.009' % side)
    fd = (wr - el).normalized(); hd = (kn - wr).normalized()
    ang = hd.angle(fd); axis = hd.cross(fd)
    print('WRIST', side, 'bent', round(math.degrees(ang), 1), '-> 0')
    if axis.length > 1e-6:
        turn_blocks(['IK_Hand_Cntrl_' + side], wr, axis, ang)
def close_fingers(side, frac):
    # bring the four fingers together: each finger turns at its knuckle, in the palm plane, toward the average finger direction
    wrist = world_head('Hand_' + side)
    dirs = [(world_head('Bone_%s.%03d' % (side, c[1])) - wrist).normalized() for c in FINGERS]
    mean = sum(dirs, Vector((0, 0, 0))).normalized()
    n = dirs[0].cross(dirs[-1]).normalized()   # palm normal (its sign does not matter: angles are signed about it)
    for c, d in zip(FINGERS, dirs):
        proj = d - n * d.dot(n); mp = mean - n * mean.dot(n)
        ang = proj.angle(mp)
        if proj.cross(mp).dot(n) < 0:
            ang = -ang
        name = 'Bone_%s.%03d' % (side, c[1])
        turn_blocks([name], world_head(name), n, ang * frac)
def curl_like(side, target, ref):
    # make the finger whose chain starts at bone number 'target' bend at each joint as much as the finger starting at 'ref' (e.g. close the
    # pack's extended trigger finger, chain 4, into a fist like the middle finger, chain 8)
    tn = ['Bone_%s.%03d' % (side, n) for n in range(target, target + 4)] + ['Bone_%s.%03d_end' % (side, target + 3)]
    rn = ['Bone_%s.%03d' % (side, n) for n in range(ref, ref + 4)] + ['Bone_%s.%03d_end' % (side, ref + 3)]
    for i in range(1, 4):
        rh = world_head(rn[i]); rd = (world_head(rn[i + 1]) - rh).normalized(); rp = (rh - world_head(rn[i - 1])).normalized()
        want = rd.angle(rp); hinge = rd.cross(rp).normalized()   # turning about hinge straightens, about -hinge curls
        th = world_head(tn[i]); td = (world_head(tn[i + 1]) - th).normalized(); tp = (th - world_head(tn[i - 1])).normalized()
        delta = want - td.angle(tp)
        if abs(delta) > 1e-4:
            turn_blocks([tn[i]], th, -hinge, delta)
POSE = {}
for side in ('R', 'L'):
    pose = CFG.get('pose' + side) or {}
    POSE[side] = pose
    if CFG[side] is None:
        continue
    if 'bend' in pose:
        bend_elbow(side, pose['bend'])
    if pose.get('wrist') == 'straight':
        straight_wrist(side)
    if pose.get('curl_like'):
        curl_like(side, *pose['curl_like'])
    if pose.get('close'):
        close_fingers(side, pose['close'])
    if pose.get('curl', 1) != 1:   # above 1 curls the fingers tighter than the pack's grip
        straighten(side, FINGERS, pose['curl'])
    if pose.get('thumb', 1) != 1:
        straighten(side, THUMB, pose['thumb'])

def rig_point(bone, head=True):
    pb = rig.pose.bones[bone]
    return to_three(rig.matrix_world @ (pb.head if head else pb.tail))
# which side each bone belongs to, from its name (Hand_R, UpArm_L, Bone_R.017, BoneTwist_03.L ...)
def side_of(name):
    if re.search(r'(^|[_.])R(?=$|[_.\d])', name): return 'R'
    if re.search(r'(^|[_.])L(?=$|[_.\d])', name): return 'L'
    return None
group_side = {g.index: side_of(g.name) for g in arms.vertex_groups}

# palm centre: the mean of the posed vertices near the wrist on this side. The grip target is the palm, not the
# wrist, so the fingers wrap the grip instead of hanging below it.
dg0 = bpy.context.evaluated_depsgraph_get()
eo0 = arms.evaluated_get(dg0)
pm = eo0.to_mesh()
def palm_centre(side):
    wrist = rig_point('Hand_' + side)
    pts = []
    for vi, v in enumerate(arms.data.vertices):
        # this side's vertices (more weight on this side's bones than the other side's) within 12 cm of the wrist: the hand and fist
        s = sum(g.weight * (1 if group_side.get(g.group) == side else -1 if group_side.get(g.group) else 0) for g in v.groups)
        if s <= 0:
            continue
        p = to_three(eo0.matrix_world @ pm.vertices[vi].co)
        if (p - wrist).length < 0.12:
            pts.append(p)
    print('PALMN', side, len(pts))
    return sum(pts, Vector((0, 0, 0))) / len(pts)
XFORM = {}   # side -> (palm point before, rotation, hand target)
for side, hand, fore in (('R', 'Hand_R', 'Forearm_R'), ('L', 'Hand_L', 'Forearm_L')):
    if CFG[side] is None:
        continue
    a = palm_centre(side); e = rig_point(fore)
    print('PALM', side, tuple(round(x, 3) for x in a), 'wrist', tuple(round(x, 3) for x in rig_point(hand)))
    th = Vector(CFG[side]) + Vector(CFG.get('shift' + side, (0, 0, 0)))   # optional per-weapon nudge of the grip
    te = Vector(CFG['pole' + side])
    rot = (e - a).normalized().rotation_difference((te - th).normalized()).to_matrix()
    if POSE[side].get('roll'):
        rot = Matrix.Rotation(math.radians(POSE[side]['roll']), 3, (te - th).normalized()) @ rot   # roll about the forearm
    XFORM[side] = (a, rot, th)
    print('XFORM', side, 'hand', tuple(round(x, 3) for x in a), 'elbow', tuple(round(x, 3) for x in e), '->', CFG[side])

eo0.to_mesh_clear()

def place(side, p):
    a, rot, th = XFORM[side]
    return rot @ (p - a) * HAND_SCALE + th


dg = bpy.context.evaluated_depsgraph_get()
eo = arms.evaluated_get(dg)
me = eo.to_mesh()
me.calc_loop_triangles()
W = eo.matrix_world
W3 = W.to_3x3()
uvl = me.uv_layers.active.data if me.uv_layers.active else None
cn = me.corner_normals if hasattr(me, 'corner_normals') else None

def vert_side(vi):
    r = l = 0.0
    for g in arms.data.vertices[vi].groups:
        s = group_side.get(g.group)
        if s == 'R': r += g.weight
        elif s == 'L': l += g.weight
    return r - l

groups = {}
for tri in me.loop_triangles:
    vis = [me.loops[li].vertex_index for li in tri.loops]
    score = sum(vert_side(vi) for vi in vis)
    side = 'R' if score > 0 else 'L'
    if CFG['R' if side == 'R' else 'L'] is None:
        continue                      # nade: no left hand, so the left arm is dropped
    key = 'right' if side == 'R' else 'left'
    P, N, U = groups.setdefault(key, (array('f'), array('f'), array('f')))
    rot = XFORM[side][1]
    for li in tri.loops:
        p = place(side, to_three(W @ me.vertices[me.loops[li].vertex_index].co))
        n = (rot @ dir_three((W3 @ (cn[li].vector if cn is not None else tri.normal)).normalized())).normalized()
        uv = uvl[li].uv if uvl else (0.0, 0.0)
        P.extend((p.x, p.y, p.z)); N.extend((n.x, n.y, n.z)); U.extend((uv[0], uv[1]))
eo.to_mesh_clear()

def b64(a):
    return base64.b64encode(a.tobytes()).decode('ascii')
data = {'meshes': [{'mat': k, 'count': len(P) // 3, 'pos': b64(P), 'nrm': b64(N), 'uv': b64(U)}
                   for k, (P, N, U) in groups.items()]}
with open(out_path, 'w') as f:
    json.dump(data, f)
print('MESHES', {k: len(v[0]) // 3 for k, v in groups.items()}, 'tris', {k: len(v[0]) // 9 for k, v in groups.items()})
print('DONE', out_path)
