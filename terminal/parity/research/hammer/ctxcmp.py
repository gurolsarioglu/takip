import json, re, sys, collections
from datetime import datetime
exec(open('research/hammer/greedy.py').read().split("names = list")[0].replace("FEAT = sys.argv[1]; BOT = sys.argv[2] if len(sys.argv) > 2 else 'hammer-pro'", "FEAT=sys.argv[1]; BOT='hammer-pro'"))
CTX = json.load(open(sys.argv[3]))
rule = eval(sys.argv[2])
G = {'tp': [], 'fp': [], 'fn': []}
for r in rows:
    if r['wtX'] == 0: continue
    D = r['wtX']; f = feats(r, D)
    if any(v != v for v in f.values()): continue
    y = lab.get((r['s'], r['t'])) == D; ok = rule(f)
    c = CTX.get(r['s'] + '|' + str(r['t']))
    if not c: continue
    c = dict(c); c['dchg'] = D * c['chg24']; c['s'] = r['s']
    if ok and y: G['tp'].append(c)
    elif ok: G['fp'].append(c)
    elif y: G['fn'].append(c)
for k, L in G.items():
    print(k, len(L))
    for n in ['chg24', 'dchg', 'qv24', 'rng24', 'vr', 'qv1', 'listedH']:
        v = sorted(x[n] for x in L if x[n] is not None); q = lambda p: v[int(p * (len(v) - 1))] if v else None
        print('   %-7s' % n, q(0), q(.1), q(.25), q(.5), q(.75), q(.9), q(1))
