import json, re, sys, collections
from datetime import datetime
exec(open('research/hammer/greedy.py').read().split("names = list")[0].replace("FEAT = sys.argv[1]; BOT = sys.argv[2] if len(sys.argv) > 2 else 'hammer-pro'", "FEAT=sys.argv[1]; BOT='hammer-pro'"))
rule = eval(sys.argv[2])
F = {(r['s'], r['t']): r for r in rows}
def shape(r, D):
    o, h, l, c = r['o'], r['h'], r['l'], r['c']; rng = h - l or 1e-12
    lw = (min(o, c) - l) / rng; uw = (h - max(o, c)) / rng; body = abs(c - o) / rng
    if D == -1: lw, uw = uw, lw
    green = (c > o) if D == 1 else (c < o)
    return dict(lw=lw, uw=uw, body=body, green=green, rngpct=rng / l * 100)
G = {'tp': [], 'fp': []}
for r in rows:
    if r['wtX'] == 0: continue
    D = r['wtX']; f = feats(r, D)
    if any(v != v for v in f.values()) or not rule(f): continue
    y = lab.get((r['s'], r['t'])) == D
    sh = shape(r, D)
    # previous bars shapes
    prev = [F.get((r['s'], r['t'] - 60000 * k)) for k in (1, 2)]
    sh['prevlw'] = max([shape(p, D)['lw'] for p in prev if p] or [-1])
    G['tp' if y else 'fp'].append(sh)
for k, L in G.items():
    print(k, len(L))
    for n in ['lw', 'uw', 'body', 'rngpct', 'prevlw']:
        v = sorted(x[n] for x in L); q = lambda p: round(v[int(p * (len(v) - 1))], 3) if v else None
        print('   ', n, q(0), q(.1), q(.5), q(.9), q(1))
    print('    green', sum(x['green'] for x in L))
