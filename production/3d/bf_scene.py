from lib import *
import bpy, math
from mathutils import Vector

ZCUT=0.86
P=Vector((0.0,-0.105,1.495))          # roof of mouth
F=Vector((0.03,-0.128,1.612))         # forehead
V1=[(0.012,-0.105,1.497),(0.02,-0.088,1.522),(0.04,-0.066,1.548),(0.058,-0.062,1.578),(0.06,-0.05,1.615),(0.06,-0.005,1.634),(0.06,0.04,1.62)]
V2=[(0.012,-0.100,1.497),(0.025,-0.07,1.525),(0.045,-0.03,1.548),(0.06,0.0,1.572),(0.06,0.045,1.59)]
N1=[(0.0,-0.100,1.499),(0.02,-0.075,1.52),(0.034,-0.05,1.538),(0.04,-0.01,1.548),(0.04,0.02,1.56)]
N2=[(0.034,-0.05,1.538),(0.045,-0.09,1.565),(0.04,-0.118,1.59),(0.03,-0.128,1.612)]

def emis(name,color,strength=3.0,alpha=1.0):
    m=bpy.data.materials.new(name); m.use_nodes=True; nt=m.node_tree; nt.nodes.clear()
    o=nt.nodes.new('ShaderNodeOutputMaterial'); e=nt.nodes.new('ShaderNodeEmission'); e.name='E'
    e.inputs[0].default_value=(*color,1); e.inputs[1].default_value=strength
    if alpha<1:
        mx=nt.nodes.new('ShaderNodeMixShader'); tr=nt.nodes.new('ShaderNodeBsdfTransparent'); mx.inputs[0].default_value=alpha; mx.name='MX'
        nt.links.new(tr.outputs[0],mx.inputs[1]); nt.links.new(e.outputs[0],mx.inputs[2]); nt.links.new(mx.outputs[0],o.inputs[0])
    else: nt.links.new(e.outputs[0],o.inputs[0])
    return m
def ghost():
    m=bpy.data.materials.new('ghost'); m.use_nodes=True; nt=m.node_tree; nt.nodes.clear()
    o=nt.nodes.new('ShaderNodeOutputMaterial'); mx=nt.nodes.new('ShaderNodeMixShader'); tr=nt.nodes.new('ShaderNodeBsdfTransparent')
    e=nt.nodes.new('ShaderNodeEmission'); e.inputs[0].default_value=(0.55,0.85,1,1); e.inputs[1].default_value=1.3
    lw=nt.nodes.new('ShaderNodeLayerWeight'); lw.inputs[0].default_value=0.55
    pw=nt.nodes.new('ShaderNodeMath'); pw.operation='POWER'; pw.inputs[1].default_value=1.6
    ml=nt.nodes.new('ShaderNodeMath'); ml.operation='MULTIPLY'; ml.inputs[1].default_value=0.75
    nt.links.new(lw.outputs['Facing'],pw.inputs[0]); nt.links.new(pw.outputs[0],ml.inputs[0]); nt.links.new(ml.outputs[0],mx.inputs[0])
    nt.links.new(tr.outputs[0],mx.inputs[1]); nt.links.new(e.outputs[0],mx.inputs[2]); nt.links.new(mx.outputs[0],o.inputs[0]); return m
def tint(mat,color):
    try:
        nt=mat.node_tree; bs=[n for n in nt.nodes if n.type=='BSDF_PRINCIPLED'][0]; inp=bs.inputs['Base Color']
        mx=nt.nodes.new('ShaderNodeMix'); mx.data_type='RGBA'; mx.blend_type='MULTIPLY'; mx.inputs[0].default_value=1.0
        if inp.links: nt.links.new(inp.links[0].from_socket,mx.inputs[6])
        else: mx.inputs[6].default_value=inp.default_value
        mx.inputs[7].default_value=(*color,1); nt.links.new(mx.outputs[2],inp)
    except Exception as ex: print('TINT FAIL',mat.name,ex)
def shirt(mat,color,zcut):
    nt=mat.node_tree; bs=[n for n in nt.nodes if n.type=='BSDF_PRINCIPLED'][0]; inp=bs.inputs['Base Color']
    mx=nt.nodes.new('ShaderNodeMix'); mx.data_type='RGBA'
    tc=nt.nodes.new('ShaderNodeTexCoord'); sx=nt.nodes.new('ShaderNodeSeparateXYZ'); gt=nt.nodes.new('ShaderNodeMath'); gt.operation='GREATER_THAN'; gt.inputs[1].default_value=zcut
    nt.links.new(tc.outputs['Object'],sx.inputs[0]); nt.links.new(sx.outputs['Z'],gt.inputs[0]); nt.links.new(gt.outputs[0],mx.inputs[0])
    if inp.links: nt.links.new(inp.links[0].from_socket,mx.inputs[6])
    mx.inputs[7].default_value=(*color,1); nt.links.new(mx.outputs[2],inp)
    for n in ['Normal']:
        pass
def curve(name,pts,mat,depth):
    c=bpy.data.curves.new(name,'CURVE'); c.dimensions='3D'; c.bevel_depth=depth; c.bevel_resolution=4; c.resolution_u=16
    s=c.splines.new('NURBS'); s.points.add(len(pts)-1)
    for p,co in zip(s.points,pts): p.co=(*co,1)
    s.use_endpoint_u=True; s.order_u=3
    o=bpy.data.objects.new(name,c); bpy.context.scene.collection.objects.link(o); o.data.materials.append(mat); return o
def sphere(name,r,mat,loc=(0,0,0),scale=(1,1,1)):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r,location=loc,segments=32,ring_count=16); o=bpy.context.object; o.name=name; o.scale=scale
    bpy.ops.object.shade_smooth(); o.data.materials.append(mat); return o
def along(pts,u):
    pts=[Vector(p) for p in pts]; L=[(pts[i+1]-pts[i]).length for i in range(len(pts)-1)]; d=max(0,min(1,u))*sum(L)
    for i,l in enumerate(L):
        if d<=l: return pts[i].lerp(pts[i+1],d/l)
        d-=l
    return pts[-1]

class Scene:
    def __init__(s):
        s.sc,s.rig,s.cam=load(); sc=s.sc
        sc.cycles.transparent_max_bounces=24; sc.cycles.max_bounces=6
        H=lambda n: bpy.data.objects['Human'+n]
        s.body=H(''); s.parts={k:H('.'+k) for k in ['short04','eyebrow001','eyelashes02','high-poly','male_casualsuit06','teeth_base','tongue01']}
        shirt(s.parts['male_casualsuit06'].data.materials[0],(1.0,0.66,0.03),ZCUT); tint(s.parts['short04'].data.materials[0],(0.2,0.18,0.17))
        bpy.data.objects['key'].data.energy=200
        s.ghost=ghost(); s.orig={o.name:[m for m in o.data.materials] for o in [s.body,s.parts['male_casualsuit06'],s.parts['high-poly']]}
        # IK
        s.tg={}
        for side,loc in (('R',(-0.3,-0.1,0.9)),('L',(0.3,-0.1,0.9))):
            e=bpy.data.objects.new('ik'+side,None); sc.collection.objects.link(e); e.location=loc; s.tg[side]=e
            c=s.rig.pose.bones['lowerarm02.'+side].constraints.new('IK'); c.target=e; c.chain_count=4
        # ice cream
        waffle=bpy.data.materials.new('waffle'); waffle.use_nodes=True; waffle.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(0.78,0.5,0.22,1)
        pink=bpy.data.materials.new('pink'); pink.use_nodes=True; b=pink.node_tree.nodes['Principled BSDF']; b.inputs['Base Color'].default_value=(1,0.45,0.6,1); b.inputs['Roughness'].default_value=0.35
        s.ice=bpy.data.objects.new('ice',None); sc.collection.objects.link(s.ice)
        bpy.ops.mesh.primitive_cone_add(vertices=32,radius1=0.004,radius2=0.03,depth=0.12,location=(0,0,0)); c=bpy.context.object; bpy.ops.object.shade_smooth(); c.data.materials.append(waffle); c.parent=s.ice
        sp=sphere('scoop',0.04,pink,(0,0,0.075)); sp.parent=s.ice
        sp2=sphere('scoop2',0.03,pink,(0,0,0.115)); sp2.parent=s.ice
        # internals
        s.mats={'ves':emis('ves',(1,0.08,0.06),2.5),'nerve':emis('nerve',(1,0.85,0.05),1.0),'spark':emis('spark',(1,1,0.6),12),
                'cold':emis('cold',(0.2,0.85,1),6,0.8),'warm':emis('warm',(0.2,1,0.45),6,0.8),'pain':emis('pain',(1,0.1,0.05),8,0.7),'blood':emis('blood',(1,0.5,0.4),10)}
        br=bpy.data.materials.new('brain'); br.use_nodes=True; b=br.node_tree.nodes['Principled BSDF']; b.inputs['Base Color'].default_value=(0.95,0.55,0.6,1); b.inputs['Roughness'].default_value=0.5
        nz=br.node_tree.nodes.new('ShaderNodeTexVoronoi'); nz.inputs['Scale'].default_value=38; bp=br.node_tree.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value=1.0
        br.node_tree.links.new(nz.outputs['Distance'],bp.inputs['Height']); br.node_tree.links.new(bp.outputs[0],b.inputs['Normal'])
        b.inputs['Emission Color'].default_value=(0.95,0.45,0.5,1); b.inputs['Emission Strength'].default_value=0.08
        s.brain=sphere('brain',1.0,br,(0,-0.012,1.592),(0.055,0.082,0.047))
        s.stem=sphere('stem',1.0,br,(0,0.02,1.535),(0.016,0.018,0.03))
        s.ves=[curve('v1',V1,s.mats['ves'],0.0035),curve('v2',V2,s.mats['ves'],0.0035)]
        s.nerve=[curve('n1',N1,s.mats['nerve'],0.0028),curve('n2',N2,s.mats['nerve'],0.0028)]
        s.sparks=[sphere('spark%d'%i,0.005,s.mats['spark']) for i in range(3)]
        s.bloods=[sphere('blood%d'%i,0.004,s.mats['blood']) for i in range(6)]
        s.cold=sphere('cold',0.016,s.mats['cold'],P,(1.2,1.4,0.5)); s.warm=sphere('warm',0.016,s.mats['warm'],P,(1.2,1.4,0.5))
        s.pain=sphere('painglow',0.02,s.mats['pain'],F)
        d=bpy.data.lights.new('mouthlight','POINT'); d.energy=0; d.color=(0.2,0.8,1); d.shadow_soft_size=0.01
        s.ml=bpy.data.objects.new('mouthlight',d); sc.collection.objects.link(s.ml); s.ml.location=(0,-0.125,1.482)
        d=bpy.data.lights.new('painlight','POINT'); d.energy=0; d.color=(1,0.1,0.05); d.shadow_soft_size=0.02
        s.pl=bpy.data.objects.new('painlight',d); sc.collection.objects.link(s.pl); s.pl.location=(0,-0.22,1.63)
        s.internals=[s.brain,s.stem,*s.ves,*s.nerve,*s.sparks,*s.bloods,s.cold,s.warm,s.pain]
        s.reset()
    def show(s,o,v): o.hide_render=not v
    def xray(s,on):
        for o in [s.body,s.parts['male_casualsuit06'],s.parts['high-poly']]:
            for i in range(len(o.data.materials)): o.data.materials[i]=s.ghost if on else s.orig[o.name][i]
        for k in ['short04','eyebrow001','eyelashes02']: s.show(s.parts[k],not on)
        for l in ['key','fill','rim']: bpy.data.objects[l].hide_render=False
    def reset(s):
        for pb in s.rig.pose.bones: pb.rotation_mode='XYZ'; pb.rotation_euler=(0,0,0)
        for o in s.internals: s.show(o,False)
        s.show(s.ice,True)
        for c in s.ice.children: s.show(c,True)
        s.ml.data.energy=0; s.pl.data.energy=0
        s.xray(False); s.tg['R'].location=(-0.26,-0.08,0.88); s.tg['L'].location=(0.26,-0.08,0.88)
        s.ice.rotation_euler=(0,0,0)
    def face(s,jaw=0,blink=0,head=0,neck=0):
        rot(s.rig,'jaw',x=jaw); rot(s.rig,'head',x=head); rot(s.rig,'neck01',x=neck)
        for sd in 'LR': rot(s.rig,'orbicularis03.'+sd,x=-25*blink); rot(s.rig,'orbicularis04.'+sd,x=10*blink)
    def curl(s,side,a):
        for f in range(1,6):
            for j in range(1,4): rot(s.rig,'finger%d-%d.%s'%(f,j,side),x=a if f>1 else a*0.4)
    def tongue(s,a):
        for n in ['tongue01','tongue02','tongue03','tongue04']: rot(s.rig,n,x=a)
    def hold(s):
        """place the ice cream in the right hand (call after pose set)"""
        bpy.context.view_layer.update(); pb=s.rig.pose.bones
        p=(pb['finger3-1.R'].head+pb['wrist.R'].head)/2
        s.ice.location=s.rig.matrix_world@p+Vector((0,-0.03,0.02))
