# Greedy conjunctive threshold search for W1 (bar-close WT cross) on hammer feature rows.
import json, re, sys, collections
from datetime import datetime
FEAT = sys.argv[1]; BOT = sys.argv[2] if len(sys.argv) > 2 else 'hammer-pro'
def ts(s): return int(datetime.fromisoformat(s.replace('Z', '+00:00')).timestamp() * 1000)
rows = [json.loads(l) for l in open(FEAT)]
Fd = {(r['s'], r['t']): r for r in rows}
def extr(r, D):
    if r is None: return 99
    x = r['lo'] if D == 1 else r['hi']; return x['rsi'] if D == 1 else 100 - x['rsi']
syms = set(r['s'] for r in rows); tmin = min(r['t'] for r in rows); tmax = max(r['t'] for r in rows)
lab = {}
for l in open('data/ref/%s.jsonl' % BOT):
    m = json.loads(l)
    if m['symbol'] not in syms: continue
    t = ts(m['createdAt'])
    if not (tmin <= t <= tmax + 60000): continue
    st = re.search(r'Strategy: (\S+)', m['message'])
    if not st or st.group(1) != '#W1': continue
    lab[(m['symbol'], (t // 60000) * 60000)] = 1 if m['message'].startswith('🟢') else -1
def feats(r, D):
    e = lambda v: v if D == 1 else 100 - v  # extremeness: low is extreme
    return {'wt1': D * r['P']['wt1'], 'wt2': D * r['P']['wt2'], 'rsi1m': e(r['P']['rsiC']), 'k1m': e(r['P']['kC']), 'rsi5m': e(r['S2']['rsi']), 'k5m': e(r['S2']['k']),
            'rsi1h': e(r['S3']['rsi']), 'k1h': e(r['S3']['k']), 'nboost': -(r['bUp'] if D == 1 else r['bDn']), 'ext0': extr(r, D), 'min5': min(extr(Fd.get((r['s'], r['t'] - 60000 * k)), D) for k in range(5)),
            'k1hx': e(r['S3']['k']), 'wtgap': -abs(r['P']['wt1'] - r['P']['wt2'])}
data = []
for r in rows:
    if r['wtX'] == 0: continue
    D = r['wtX']; f = feats(r, D)
    if any(v != v for v in f.values()): continue
    data.append((f, 1 if lab.get((r['s'], r['t'])) == D else 0, D))
P = sum(y for _, y, _ in data); print('rows', len(data), 'pos', P, 'labels total', len(lab))
names = list(data[0][0].keys()); th = {n: 1e9 for n in names}
def score(th):
    tp = fp = 0
    for f, y, _ in data:
        if all(f[n] <= th[n] for n in names):
            if y: tp += 1
            else: fp += 1
    fn = P - tp; return tp, fp, fn, (2 * tp / max(1, 2 * tp + fp + fn))
best = score(th)
for it in range(12):
    improved = False
    for n in names:
        vals = sorted(set(round(f[n], 1) for f, y, _ in data if y))
        cands = vals + [v + 0.5 for v in vals] + [1e9]
        for v in cands:
            t2 = dict(th); t2[n] = v; s = score(t2)
            if s[3] > best[3] + 1e-9: best, th, improved = s, t2, True
    if not improved: break
print('best tp fp fn F1', best)
print({n: v for n, v in th.items() if v < 1e8})
