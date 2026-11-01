# Builds lib/hammer-seed.json: last #W1/#S1 direction per symbol from the Visivero archive since its last restart flood.
import json,collections,sys
from datetime import datetime
ts=lambda s: datetime.fromisoformat(s.replace('Z','+00:00')).timestamp()
rows=[json.loads(l) for l in open('data/ref/hammer-pro.jsonl')]
def strat(r):
  for l in r['message'].split('\n'):
    if l.startswith('Strategy:'): return l.split(':')[1].strip()
R=sorted([(r['symbol'],strat(r),1 if r['message'].startswith('🟢') else -1,ts(r['createdAt'])) for r in rows],key=lambda x:x[3])
c=collections.Counter(int(x[3]//600) for x in R)
flood=max(k for k,v in c.items() if v>=25)*600
state={}
for s,st,d,t in R:
  if t>=flood and st in ('#W1','#S1'): state.setdefault(s,{})[st]=d
json.dump({'flood':datetime.utcfromtimestamp(flood).isoformat()+'Z','built':datetime.utcnow().isoformat()+'Z','state':state},open('lib/hammer-seed.json','w'))
print('flood',datetime.utcfromtimestamp(flood),'symbols',len(state))
