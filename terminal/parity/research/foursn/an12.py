import json,glob,sys,collections
rows=[]
for f in glob.glob('/sessions/rcw-017b6eud2yvvbvixprm5wqp7/mnt/terminal/parity/data/foursn/features-12h-*.jsonl'):
  for l in open(f):
    try: rows.append(json.loads(l))
    except: pass
seen=set();R=[]
for r in rows:
  k=(r['sym'],r['C'])
  if k in seen: continue
  seen.add(k);R.append(r)
full=[r for r in R if r['f'].get('1d') and r['f'].get('1h') and r['f'].get('1d')]
def lab(r,bot,strat=None,dir=None):
  return any(L['bot']==bot and (strat is None or L['strategy']==strat) and (dir is None or L['dir']==dir) for L in r['labels'])
print('rows',len(full))
cyc=collections.Counter(r['C'] for r in full); cl=collections.Counter(r['C'] for r in full if r['labels'])
fullC={c for c in cyc if cyc[c]>cl[c]+20}
F=[r for r in full if r['C'] in fullC]
print('full cycles',len(fullC),'rows',len(F),'labeled',sum(1 for r in F if r['labels']))
def show(name,cond,bot,strat=None,dir=None,rows=F):
  P=[r for r in rows if lab(r,bot,strat,dir)]; N=[r for r in rows if not lab(r,bot,strat,dir)]
  tp=sum(1 for r in P if cond(r)); fp=sum(1 for r in N if cond(r))
  print(f'{name:40s} pos {tp}/{len(P)}  fp {fp}/{len(N)}')
g=lambda r,tf,k: (r['f'][tf] or {}).get(k)
if 'x' in sys.argv:
  show('4s up wtX4 live up',lambda r:g(r,'1d','wtX')==1,'4s',None,'up')
  show('4s dn wtX4 live dn',lambda r:g(r,'1d','wtX')==-1,'4s',None,'down')
  show('4s up wtX4 & rsi4<=45',lambda r:g(r,'1d','wtX')==1 and g(r,'1d','rsi')<=45,'4s',None,'up')
  show('4s up wtX4&rsi4<=45&k1d<=37',lambda r:g(r,'1d','wtX')==1 and g(r,'1d','rsi')<=45 and g(r,'1d','k')<=37,'4s',None,'up')
  show('4s dn wtX4&rsi4>=60&k1d>=84',lambda r:g(r,'1d','wtX')==-1 and g(r,'1d','rsi')>=60 and g(r,'1d','k')>=84,'4s',None,'down')
  show('NW UP nwPos<0',lambda r:g(r,'1d','nwPos')<0,'4sniper','NW UP')
  show('NW DN nwPos>1',lambda r:g(r,'1d','nwPos')>1,'4sniper','NW DOWN')
  show('NW UP nwPos<0 & rsi4<=50',lambda r:g(r,'1d','nwPos')<0 and g(r,'1d','rsi')<=50,'4sniper','NW UP')
  show('NW DN nwPos>1 & rsi4>=58',lambda r:g(r,'1d','nwPos')>1 and g(r,'1d','rsi')>=58,'4sniper','NW DOWN')
  # list 4s positive features
  for r in F:
    if lab(r,'4s'):
      L=[l for l in r['labels'] if l['bot']=='4s'][0]
      print(' 4s',L['dir'],r['sym'],'wtX',g(r,'1d','wtX'),g(r,'1d','wtXClosed'),'wt %.1f/%.1f'%(g(r,'1d','wt1'),g(r,'1d','wt2')),'rsi',round(g(r,'1h','rsi')),round(g(r,'1d','rsi')),round(g(r,'1d','rsi')),'k',round(g(r,'1h','k')),round(g(r,'1d','k')),round(g(r,'1d','k')))
if 'fp4s' in sys.argv:
  for r in F:
    if g(r,'1d','wtX')==1 and not lab(r,'4s'):
      print(' FP',r['sym'],r['t'],'wt %.1f/%.1f'%(g(r,'1d','wt1'),g(r,'1d','wt2')),'rsi',round(g(r,'1h','rsi')),round(g(r,'1d','rsi')),round(g(r,'1d','rsi')),'k',round(g(r,'1h','k')),round(g(r,'1d','k')),round(g(r,'1d','k')),'n4',g(r,'1d','n'),'labels',[(l['bot'],l['strategy']) for l in r['labels']])
