import sys,json,collections
src=open('divpy.py').read().split('res=[]')[0]
exec(src)
ever=collections.Counter()
for b in ['4sniper','4s','1dws','div']:
  for l in open('/'.join(sys.argv[1:2]) and '%s/../../data/ref/%s.jsonl'%('.',b)):
    ever[(b,json.loads(l)['symbol'])]+=1
fps=[];tps=[]
for r in F:
  u,d=test(r,5,1,1,'nearest',5,60,'low',1,True)
  ri=r['f'][TF]['rsiTail'][-2]
  if u and ri<=35:
    (tps if lab(r,BOT,STRAT,'up') else fps).append(r)
def info(r): return (r['sym'],ever[('4sniper',r['sym'])],ever[('div',r['sym'])],[l['strategy'] for l in r['labels']])
print('TP',[info(r) for r in tps])
print('FP',[info(r) for r in fps])
