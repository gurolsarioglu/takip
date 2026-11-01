import json,sys,itertools
exec(open(sys.argv[1]).read().split("if 'x' in sys.argv")[0])
TF=sys.argv[2]; BOT=sys.argv[3]; STRAT=sys.argv[4]
def piv_low(a,i,L,R):
  if i-L<0 or i+R>=len(a): return False
  return all(a[j]>a[i] for j in range(i-L,i)) and all(a[j]>=a[i] for j in range(i+1,i+R+1))
def piv_high(a,i,L,R):
  if i-L<0 or i+R>=len(a): return False
  return all(a[j]<a[i] for j in range(i-L,i)) and all(a[j]<=a[i] for j in range(i+1,i+R+1))
def test(r,L,Lj,Rj,pick,minG,maxG,src,iOff,needPivI):
  f=r['f'].get(TF)
  if not f: return (False,False)
  rs,lo,hi,cl=f['rsiTail'],f['lowTail'],f['highTail'],f['closeTail']
  n=len(rs); i=n-1-iOff
  PL = rs if src=='rsi' else (cl if src=='close' else lo)
  PH = rs if src=='rsi' else (cl if src=='close' else hi)
  pl = cl if src=='close' else lo; ph = cl if src=='close' else hi
  up=dn=False
  if (not needPivI) or piv_low(PL,i,L,iOff):
    for j in range(i-minG,max(0,i-maxG)-1,-1):
      if piv_low(PL,j,Lj,Rj):
        if pl[i]<pl[j] and rs[i]>rs[j]: up=True; break
        if pick=='nearest': break
  if (not needPivI) or piv_high(PH,i,L,iOff):
    for j in range(i-minG,max(0,i-maxG)-1,-1):
      if piv_high(PH,j,Lj,Rj):
        if ph[i]>ph[j] and rs[i]<rs[j]: dn=True; break
        if pick=='nearest': break
  return up,dn
res=[]
P=[r for r in F]
for L,Lj,Rj,pick,minG,maxG,src,iOff,needPivI in itertools.product([1,2,3,5],[1,2,3,5],[1,2,3,5],['nearest','any'],[2,4],[30,60],['low','rsi','close'],[1,0],[True,False]):
  if needPivI==False and L!=1: continue
  st=dict(tpU=0,pU=0,fpU=0,tpD=0,pD=0,fpD=0)
  for r in P:
    isU=lab(r,BOT,STRAT,'up'); isD=lab(r,BOT,STRAT,'down')
    u,d=test(r,L,Lj,Rj,pick,minG,maxG,src,iOff,needPivI)
    f=r['f'].get(TF) or {}
    rnow=f.get('rsiTail',[50])[-1-iOff]
    for z in [40]:
      pass
    if isU: st['pU']+=1; st['tpU']+=u
    elif u: st['fpU']+=1
    if isD: st['pD']+=1; st['tpD']+=d
    elif d: st['fpD']+=1
  tp=st['tpU']+st['tpD']; fp=st['fpU']+st['fpD']; fn=st['pU']+st['pD']-tp
  res.append((2*tp/max(1,2*tp+fp+fn),(L,Lj,Rj,pick,minG,maxG,src,iOff,needPivI),st))
res.sort(key=lambda x:-x[0])
for x in res[:15]: print('%.3f'%x[0],x[1],x[2])
