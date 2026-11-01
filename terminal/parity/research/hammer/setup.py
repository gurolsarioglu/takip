import json, re, sys, collections
from datetime import datetime
exec(open('research/hammer/greedy.py').read().split("names = list")[0].replace("FEAT = sys.argv[1]; BOT = sys.argv[2] if len(sys.argv) > 2 else 'hammer-pro'", "FEAT=sys.argv[1]; BOT='hammer-pro'"))
rule = eval(sys.argv[2])
Fd = {(r['s'], r['t']): r for r in rows}
def ext(r, D, key='rsi'):
    x = r['lo'] if D == 1 else r['hi']; v = x[key]; return v if D == 1 else 100 - v
G = {'tp': [], 'fp': [], 'fn': []}
for r in rows:
    if r['wtX'] == 0: continue
    D = r['wtX']; f = feats(r, D)
    if any(v != v for v in f.values()): continue
    y = lab.get((r['s'], r['t'])) == D; ok = rule(f)
    k = 'tp' if ok and y else 'fp' if ok else 'fn' if y else None
    if not k: continue
    prof = []
    for K in range(0, 16):
        p = Fd.get((r['s'], r['t'] - 60000 * K)); prof.append(round(ext(p, D)) if p else 99)
    G[k].append((r['s'], datetime.utcfromtimestamp(r['t'] / 1000).strftime('%m-%d %H:%M'), D, prof, round(f['wt2'], 1), round(f['nboost'], 2)))
for k, L in G.items():
    print('==', k, len(L))
    for x in L[:30]: print(x)
