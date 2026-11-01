# S1 (intrabar) analysis: label bars containing an S1 message; compare extreme-price features.
import json, re, sys, collections
from datetime import datetime
FEAT = sys.argv[1]; BOT = sys.argv[2]; RULE = sys.argv[3] if len(sys.argv) > 3 else None
def ts(s): return int(datetime.fromisoformat(s.replace('Z', '+00:00')).timestamp() * 1000)
rows = [json.loads(l) for l in open(FEAT)]
syms = set(r['s'] for r in rows); tmin = min(r['t'] for r in rows); tmax = max(r['t'] for r in rows)
lab = {}
for l in open('data/ref/%s.jsonl' % BOT):
    m = json.loads(l)
    if m['symbol'] not in syms: continue
    t = ts(m['createdAt'])
    if not (tmin <= t + 60000 <= tmax): continue
    st = re.search(r'Strategy: (\S+)', m['message'])
    s = st.group(1) if st else '#S1'
    if s != '#S1': continue
    D = 1 if m['message'].startswith('🟢') else -1
    k = (m['symbol'], (t // 60000) * 60000 + 60000)
    lab.setdefault(k, set()).add(D)
print('S1 labels', len(lab))
def F(r, D):
    x = r['lo'] if D == 1 else r['hi']; s2 = r['S2lo'] if D == 1 else r['S2hi']; s3 = r['S3lo'] if D == 1 else r['S3hi']
    e = lambda v: v if D == 1 else 100 - v
    return {'rsi1m': e(x['rsi']), 'k1m': e(x['k']), 'smaGap': D * (x['sma'] - x['rsi']), 'rsiPrevC': e(r['P']['rsiP']) if r['P'].get('rsiP') is not None else 99,
            'rsi5m': e(s2['rsi']), 'k5m': e(s2['k']), 'rsi1h': e(s3['rsi']), 'k1h': e(s3['k']), 'nboost': -(r['bUp'] if D == 1 else r['bDn'])}
P = []; N = []
for r in rows:
    for D in (1, -1):
        f = F(r, D)
        if any(v != v for v in f.values()): continue
        if f['rsi1m'] > 35: continue
        (P if D in lab.get((r['s'], r['t']), ()) else N).append((f, r, D))
print('pos', len(P), 'neg (rsi1m extreme<=35)', len(N), 'labels found', sum(1 for k in lab if any(r['s']==k[0] and r['t']==k[1] for r in rows[:0])))
for n in P[0][0].keys():
    pv = sorted(f[n] for f, _, _ in P); nv = sorted(f[n] for f, _, _ in N); q = lambda a, p: round(a[int(p * (len(a) - 1))], 2) if a else None
    print('%-9s pos [%s %s %s %s %s]  neg [%s %s %s]' % (n, q(pv, 0), q(pv, .05), q(pv, .5), q(pv, .95), q(pv, 1), q(nv, .05), q(nv, .5), q(nv, .95)))
if RULE:
    rule = eval(RULE); tp = sum(1 for f, _, _ in P if rule(f)); fp = [(r['s'], datetime.utcfromtimestamp(r['t'] / 1000).strftime('%m-%d %H:%M'), D, {k: round(v, 1) for k, v in f.items()}) for f, r, D in N if rule(f)]
    print('rule tp', tp, '/', len(P), 'fp', len(fp)); [print(x) for x in fp[:20]]
