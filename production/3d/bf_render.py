import sys, json, os, time
from bf_scene import *
from bpy_extras.object_utils import world_to_camera_view as w2c
T=json.load(open('bf_time.json')); s=[a for a,b in T['sent']]; e=[b for a,b in T['sent']]; DUR=T['dur']
FPS=15; NF=int(DUR*FPS)
CUTS=[0.0,s[1]-0.1,s[2]-0.1,s[4]-0.1,s[6]-0.1,s[7]-0.1,s[8]-0.1,DUR]
S=Scene(); sc,rig,cam=S.sc,S.rig,S.cam
sc.render.use_persistent_data=True
W,Hh,SPP=(int(os.environ.get('RW',720)),int(os.environ.get('RH',1280)),int(os.environ.get('SPP',20)))
cl=lambda x:max(0.0,min(1.0,x))
pr=lambda t,a,d: cl((t-a)/d) if d>0 else float(t>=a)
def eio(x): x=cl(x); return 4*x**3 if x<.5 else 1-(-2*x+2)**3/2
lp=lambda a,b,x: a+(b-a)*x
vl=lambda a,b,x: tuple(lp(p,q,x) for p,q in zip(a,b))
REST_R=(-0.26,-0.08,0.88); REST_L=(0.26,-0.08,0.88)
def internals(on,what=()):
    for o in S.internals: S.show(o,False)
    for o in what: S.show(o,on)
def ice(v):
    S.show(S.ice,v)
    for c in S.ice.children: S.show(c,v)
def state(t):
    k=max(i for i in range(7) if t>=CUTS[i]); u=pr(t,CUTS[k],CUTS[k+1]-CUTS[k]); S.reset()
    if k==0:
        a=eio(pr(u,0.05,0.4)); bite=eio(pr(u,0.5,0.12)); low=eio(pr(u,0.68,0.25))
        S.tg['R'].location=vl(vl((-0.12,-0.3,1.16),(-0.065,-0.275,1.335),a),(-0.09,-0.3,1.24),low)
        chew=3*math.sin((u-0.62)*40) if u>0.62 else 0
        S.face(jaw=lp(lp(2,19,eio(pr(u,0.22,0.22))),6,bite)+chew, head=5*a-3*low, blink=1 if 0.12<u<0.17 else 0)
        S.curl('R',35); S.hold(); aim(cam,vl((0.34,-1.75,1.42),(0.26,-1.35,1.43),eio(u)),(0,-0.05,1.36),50)
    elif k==1:
        S.face(jaw=lp(17,23,eio(u))); S.tg['R'].location=(-0.09,-0.3,1.2); S.curl('R',35); S.hold()
        S.ml.data.energy=0.18*eio(pr(u,0.15,0.4))*(0.8+0.2*math.sin(t*9))
        aim(cam,vl((0.15,-0.62,1.475),(0.11,-0.46,1.47),eio(u)),(0.0,-0.13,1.478),75)
    elif k in (2,3,5):
        S.xray(True); ice(False); S.face(jaw=8 if k!=5 else 6)
        calm=0.0032
        if k==2:
            internals(True,[S.brain,S.stem,*S.ves,*S.nerve,S.cold])
            tight=eio(pr(t,s[2]+0.9,0.9)); wide=eio(pr(t,s[2]+2.0,0.7))
            d=lp(lp(calm,0.0014,tight),0.0052,wide)
            for v in S.ves: v.data.bevel_depth=d
            S.mats['ves'].node_tree.nodes['E'].inputs[1].default_value=2.0+wide*(2.5+1.5*math.sin(t*10))
            S.mats['nerve'].node_tree.nodes['E'].inputs[1].default_value=0.25
            if t>s[3]:
                for i,o in enumerate(S.bloods):
                    S.show(o,True); ph=((t-s[3])*0.55+i/6)%1.0; o.location=along(V1 if i%2 else V2,ph); o.scale=(1.6,1.6,1.6)
            aim(cam,vl((0.86,-0.22,1.57),(0.74,-0.2,1.575),eio(u)),(0,-0.035,1.566),62)
        elif k==3:
            internals(True,[S.brain,S.stem,*S.ves,*S.nerve,S.cold])
            for v in S.ves: v.data.bevel_depth=0.0045
            S.mats['ves'].node_tree.nodes['E'].inputs[1].default_value=1.6
            fl=0.5+0.5*math.sin(t*14)
            S.mats['nerve'].node_tree.nodes['E'].inputs[1].default_value=2.5+4*fl*pr(t,s[4]+0.4,0.4)
            for i,o in enumerate(S.sparks):
                if t<s[5]:
                    ph=((t-s[4]-0.5)*0.9+i/3)%1.0
                    if t>s[4]+0.5: S.show(o,True); o.location=along(N1,ph)
                else:
                    ph=((t-s[5]-0.3)*0.8+i/3)%1.0
                    if t>s[5]+0.3: S.show(o,True); o.location=along(N2,ph)
            if t>s[5]+1.2: S.show(S.pain,True); S.pain.scale=[0.45+0.25*fl]*3
            aim(cam,vl((0.72,-0.5,1.6),(0.62,-0.46,1.6),eio(u)),(0,-0.045,1.572),62)
        else:
            internals(True,[S.brain,S.stem,*S.ves,*S.nerve])
            for v in S.ves: v.data.bevel_depth=calm
            S.mats['ves'].node_tree.nodes['E'].inputs[1].default_value=2.0
            S.mats['nerve'].node_tree.nodes['E'].inputs[1].default_value=0.6
            up=eio(pr(t,s[7]+0.9,0.9)); S.tongue(28*up)
            if up>0.85: S.show(S.warm,True); S.warm.scale=[x*(0.8+0.5*pr(t,s[7]+1.8,0.6)) for x in (1.2,1.4,0.5)]
            else: S.show(S.cold,True)
            aim(cam,vl((0.66,-0.26,1.52),(0.56,-0.24,1.515),eio(u)),(0,-0.075,1.515),70)
    elif k==4:
        w=eio(pr(u,0.0,0.25))
        S.face(jaw=5,blink=1,head=12*w+1.5*math.sin(t*7),neck=6*w); S.tg['L'].location=vl((0.2,-0.25,1.2),(0.10,-0.2,1.50),w); S.curl('L',8); rot(rig,'wrist.L',x=-55*w)
        S.tg['R'].location=(-0.2,-0.3,1.12); S.curl('R',35); S.hold(); S.pl.data.energy=w*(4+2.5*math.sin(t*11))
        aim(cam,vl((0.24,-1.2,1.5),(0.18,-0.98,1.5),eio(u)),(0,-0.06,1.47),55)
    else:
        r=eio(pr(u,0.1,0.45))
        S.face(jaw=5-3*r,blink=1-eio(pr(u,0.25,0.15)),head=12*(1-r),neck=6*(1-r)); S.tg['L'].location=vl((0.10,-0.2,1.50),REST_L,r); S.curl('L',8); rot(rig,'wrist.L',x=-55*(1-r))
        S.tg['R'].location=vl((-0.2,-0.3,1.12),(-0.1,-0.28,1.3),r); S.curl('R',35); S.hold(); S.pl.data.energy=5*(1-eio(pr(u,0.0,0.3)))
        aim(cam,vl((0.18,-0.98,1.5),(0.22,-1.15,1.48),eio(u)),(0,-0.06,1.45),55)
    return k
def proj():
    bpy.context.view_layer.update(); out={}
    hb=rig.pose.bones['head']; rest=rig.data.bones['head'].matrix_local.inverted()
    for n,p in (('P',P),('F',Vector((0,-0.14,1.61))),('B',Vector((0.06,-0.012,1.60))),('V',Vector(V1[2])),('N',Vector(N1[3])),('T',Vector((0,0,1.70)))):
        wp=rig.matrix_world@(hb.matrix@(rest@p)); c=w2c(sc,cam,wp); out[n]=(c.x,1-c.y)
    return out
if __name__=='__main__':
    frames=[int(x) for x in sys.argv[1].split(',')] if len(sys.argv)>1 and sys.argv[1]!='all' else range(NF)
    os.makedirs('fr',exist_ok=True); meta={}
    if os.path.exists('bf_meta.json'): meta=json.load(open('bf_meta.json'))
    for i in frames:
        fp='fr/%04d.png'%i
        if os.path.exists(fp) and str(i) in meta: continue
        t0=time.time(); k=state(i/FPS); meta[str(i)]={'k':k,**proj()}
        render(sc,fp,W,Hh,SPP); json.dump(meta,open('bf_meta.json','w'))
        print('FRAME',i,k,round(time.time()-t0,1),flush=True)
    print('NF',NF)
