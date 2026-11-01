import json, re, sys, collections
from datetime import datetime
exec(open('research/hammer/greedy.py').read().split("names = list")[0].replace("FEAT = sys.argv[1]; BOT = sys.argv[2] if len(sys.argv) > 2 else 'hammer-pro'", "FEAT=sys.argv[1]; BOT='hammer-pro'"))
allmsg = collections.defaultdict(list); everSyms = set()
for l in open('data/ref/hammer-pro.jsonl'):
    m = json.loads(l); everSyms.add(m['symbol']); allmsg[m['symbol']].append(ts(m['createdAt']))
rule = eval(sys.argv[2])  # lambda f: ...
tp = fp = 0; fpinfo = collections.Counter(); fpl = []
idx = {}
for r in rows:
    if r['wtX'] == 0: continue
    D = r['wtX']; f = feats(r, D)
    if any(v != v for v in f.values()): continue
    ok = rule(f)
    y = lab.get((r['s'], r['t'])) == D
    if ok and y: tp += 1
    if ok and not y:
        fp += 1
        prev = [t for t in allmsg[r['s']] if t < r['t']]
        gap = (r['t'] - max(prev)) / 60000 if prev else None
        b = 'none' if gap is None else '<15' if gap < 15 else '<60' if gap < 60 else '<180' if gap < 180 else '<720' if gap < 720 else '>=720'
        fpinfo[('ever' if r['s'] in everSyms else 'never', b)] += 1
        fpl.append((r['s'], datetime.utcfromtimestamp(r['t'] / 1000).strftime('%m-%d %H:%M'), D, {k: round(v, 1) for k, v in f.items()}, gap))
print('tp', tp, 'fp', fp, 'P', P, fpinfo)
for x in fpl[:25]: print(x)
