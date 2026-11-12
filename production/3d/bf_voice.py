import sys, json; sys.path.insert(0,'/home/user/YouTube-/production')
from zo import *
LINES=[(x,x,g) for x,g in [
 ("Eat ice cream too fast, and this happens.",0.25),
 ("The cold hits the roof of your mouth.",0.25),
 ("Blood vessels there tighten, then suddenly widen,",0.12),
 ("sending a rush of warm blood toward your brain.",0.28),
 ("A nearby nerve feels that sudden change, and fires off a pain signal.",0.25),
 ("But that same nerve also covers your forehead.",0.25),
 ("So your brain gets confused, and the pain shows up there instead.",0.35),
 ("To stop it, press your tongue against the roof of your mouth.",0.25),
 ("The warmth calms the nerve, and the pain fades.",0.0)]]
v,sr,sent,caps=synth_voice(LINES,'../tts')
dur=sent[-1][1]+1.5
v=np.concatenate([v,np.zeros(max(0,int(dur*sr)-len(v)),np.float32)])[:int(dur*sr)]
write_wav('bf_voice.wav',v,sr)
json.dump({'dur':dur,'sent':sent,'caps':caps,'lines':[l[0] for l in LINES]},open('bf_time.json','w'))
for (a,b),l in zip(sent,LINES): print(f'{a:6.2f}-{b:6.2f} {l[0]}')
print('DUR',dur)
