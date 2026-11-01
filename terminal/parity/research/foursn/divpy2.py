import sys,itertools
src=open('divpy.py').read().split('res=[]')[0]
exec(src)
out=[]
for L,Lj,Rj,pick,minG,src_,z in itertools.product([1,2,3,5],[1,2,3,5],[3,4,5],['nearest','any'],[3,4,5,6],['low','close','rsi'],[30,35,40,45,100]):
  st=[0,0,0,0,0,0]
  for r in F:
    f=r['f'].get(TF)
    if not f: continue
    isU=lab(r,BOT,STRAT,'up'); isD=lab(r,BOT,STRAT,'down')
    u,d=test(r,L,Lj,Rj,pick,minG,60,src_,1,L>0)
    ri=f['rsiTail'][-2]
    u=u and ri<=z; d=d and ri>=100-z
    if isU: st[1]+=1; st[0]+=u
    elif u: st[2]+=1
    if isD: st[4]+=1; st[3]+=d
    elif d: st[5]+=1
  tp=st[0]+st[3]; fp=st[2]+st[5]; fn=st[1]+st[4]-tp
  out.append((2*tp/max(1,2*tp+fp+fn),(L,Lj,Rj,pick,minG,src_,z),st))
out.sort(key=lambda x:-x[0])
import os
for x in [y for y in out if os.environ.get("FILT","") in str(y[1])][:20]: print('%.3f'%x[0],x[1],'up %d/%d fp %d | dn %d/%d fp %d'%tuple(x[2]))
