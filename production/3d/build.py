import bpy, os, math, glob, addon_utils
bpy.ops.wm.read_factory_settings(use_empty=True)
addon_utils.enable('bl_ext.user_default.mpfb',default_set=True)
from bl_ext.user_default.mpfb.services.humanservice import HumanService
D='/root/.config/blender/5.3/extensions/.user/user_default/mpfb/data'
macro={"gender":1.0,"age":0.40,"muscle":0.62,"weight":0.5,"height":0.5,"proportions":0.7,"cupsize":0.5,"firmness":0.5,"race":{"asian":0.1,"caucasian":0.15,"african":0.75}}
bm=HumanService.create_human(macro_detail_dict=macro)
HumanService.add_builtin_rig(bm,'default')
one=lambda p: glob.glob(os.path.join(D,p))[0]
for p,t in [('eyes/high-poly/*.mhclo','Eyes'),('teeth/teeth_base/*.mhclo','Teeth'),('tongue/tongue01/*.mhclo','Tongue'),('eyebrows/eyebrow001/*.mhclo','Eyebrows'),('eyelashes/eyelashes02/*.mhclo','Eyelashes'),('hair/short04/*.mhclo','Hair'),('clothes/male_casualsuit06/*.mhclo','Clothes')]:
    HumanService.add_mhclo_asset(one(p),bm,asset_type=t)
HumanService.set_character_skin(one('skins/young_african_male/*.mhmat'),bm,skin_type='ENHANCED_SSS')
for o in bpy.data.objects:
    if o.type=='MESH':
        for m in o.modifiers:
            if m.type=='SUBSURF': m.levels=1; m.render_levels=1
        bpy.context.view_layer.objects.active=o
        for p in o.data.polygons: p.use_smooth=True
if not any(m.type=='SUBSURF' for m in bm.modifiers):
    s=bm.modifiers.new('sub','SUBSURF'); s.levels=1; s.render_levels=1
sc=bpy.context.scene
# world: bright blue seen by camera, soft neutral light for everything else
w=bpy.data.worlds.new('w'); sc.world=w; w.use_nodes=True; nt=w.node_tree; nt.nodes.clear()
out=nt.nodes.new('ShaderNodeOutputWorld'); mix=nt.nodes.new('ShaderNodeMixShader'); lp=nt.nodes.new('ShaderNodeLightPath')
b1=nt.nodes.new('ShaderNodeBackground'); b1.inputs[0].default_value=(0.75,0.85,1,1); b1.inputs[1].default_value=0.35
b2=nt.nodes.new('ShaderNodeBackground'); b2.inputs[1].default_value=1.0
tc=nt.nodes.new('ShaderNodeTexCoord'); gr=nt.nodes.new('ShaderNodeTexGradient'); gr.gradient_type='SPHERICAL'
mp=nt.nodes.new('ShaderNodeMapping'); mp.inputs['Location'].default_value=(0.5,0.5,0.45); mp.inputs['Scale'].default_value=(1.0,1.0,0.75)
cr=nt.nodes.new('ShaderNodeValToRGB'); cr.color_ramp.elements[0].color=(0.02,0.16,0.42,1); cr.color_ramp.elements[1].color=(0.10,0.50,0.95,1)
nt.links.new(tc.outputs['Window'],mp.inputs['Vector']); nt.links.new(mp.outputs[0],gr.inputs[0]); nt.links.new(gr.outputs['Fac'],cr.inputs[0]); nt.links.new(cr.outputs[0],b2.inputs[0])
nt.links.new(lp.outputs['Is Camera Ray'],mix.inputs[0]); nt.links.new(b1.outputs[0],mix.inputs[1]); nt.links.new(b2.outputs[0],mix.inputs[2]); nt.links.new(mix.outputs[0],out.inputs[0])
def light(name,loc,energy,size,color=(1,1,1)):
    d=bpy.data.lights.new(name,'AREA'); d.energy=energy; d.size=size; d.color=color
    o=bpy.data.objects.new(name,d); sc.collection.objects.link(o); o.location=loc
    c=o.constraints.new('TRACK_TO'); c.target=bpy.data.objects['Human.rig']; c.subtarget='head'; c.track_axis='TRACK_NEGATIVE_Z'; c.up_axis='UP_Y'
light('key',(1.3,-2.2,2.3),260,1.5,(1,0.96,0.9)); light('fill',(-1.8,-1.6,1.5),90,2.5,(0.85,0.92,1)); light('rim',(-0.8,1.8,2.4),300,1.0,(0.8,0.9,1))
cam=bpy.data.objects.new('cam',bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera=cam
sc.render.engine='CYCLES'; sc.cycles.device='CPU'; sc.cycles.use_denoising=True; sc.view_settings.view_transform='Standard'
bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath('human2.blend'))
print('SAVED')
