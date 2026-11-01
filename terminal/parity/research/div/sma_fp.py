import sys, collections, random
import numpy as np
from div_lib import *
TF='1h'; MS=H
refs=load_refs(); STRAT='1H RSI SMA CROSSED'
msgs={(r['sym'],r['t']//MS):r for r in refs if r['st']==STRAT}
anyref={(r['sym'],r['t']//MS):r for r in refs}
allsyms=sorted(set(r['sym'] for r in refs)); frac={s:i/len(allsyms) for i,s in enumerate(allsyms)}
random.seed(5); sub=random.sample(allsyms,250)
t0=min(r['t'] for r in refs)//MS+2; t1=max(r['t'] for r in refs)//MS
TP=[];FP=[]
for sym in sub:
  s=series(sym,TF)
  if s is None: continue
  for h in range(t0,t1):
    t=h*MS+int(60000+12*60000*frac[sym]); L=s.live_index(t,MS)
    if L is None or L<210 or not np.isfinite(s.up[L-1]): continue
    m=msgs.get((sym,h)); price=m['price'] if m else (price_proxy(sym,t) or s.o[L])
    rl=live_rsi(s.up[L-1],s.dn[L-1],price-s.c[L-1]); R=np.append(s.rsi[L-40:L],rl); S=np.convolve(R,np.ones(14)/14,'valid')
    if not (R[-2]<=S[-2] and R[-1]>S[-1] and R[-2]<=30): continue
    f=dict(ri=R[-2],rl=rl,sma=S[-1],smaprev=S[-2],minR14=R[-15:-1].min(),cnt30=int((R[-15:-1]<=30).sum()),slope=S[-1]-S[-5], other=(anyref.get((sym,h)) or {}).get('st'))
    (TP if m and m['dir']=='up' else FP).append(f)
def q(a): a=np.sort(np.array(a)); return [round(float(a[int(len(a)*f)]),1) for f in (0.02,.1,.25,.5,.75,.9,.98)]
print(len(TP),len(FP))
for k in ('ri','rl','sma','minR14','cnt30','slope'):
  print(k,'TP',q([x[k] for x in TP]),'FP',q([x[k] for x in FP]))
print('FP other strategy same hour',collections.Counter(x['other'] for x in FP))
