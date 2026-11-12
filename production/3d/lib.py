import bpy, math, os
from mathutils import Vector, Euler, Quaternion
def load():
    bpy.ops.wm.open_mainfile(filepath=os.path.join(os.path.dirname(os.path.abspath(__file__)),'human2.blend'))
    return bpy.context.scene, bpy.data.objects['Human.rig'], bpy.data.objects['cam']
def aim(cam, loc, target, lens=50):
    cam.location=Vector(loc); d=Vector(target)-Vector(loc); cam.rotation_euler=d.to_track_quat('-Z','Y').to_euler(); cam.data.lens=lens
def rot(rig, bone, x=0,y=0,z=0):
    pb=rig.pose.bones[bone]; pb.rotation_mode='XYZ'; pb.rotation_euler=(math.radians(x),math.radians(y),math.radians(z)); return pb
def render(sc, path, w=360, h=640, samples=8):
    sc.render.resolution_x=w; sc.render.resolution_y=h; sc.cycles.samples=samples; sc.render.filepath=os.path.abspath(path)
    bpy.ops.render.render(write_still=True)
