# Rule mining for hammer family on hammer-feat-<name>.jsonl  (python3, run on device)
import json, re, sys, collections, bisect
from datetime import datetime
FEAT = sys.argv[1] if len(sys.argv) > 1 else 'data/analysis/hammer-feat-1m-day.jsonl'
def ts(s): return int(datetime.fromisoformat(s.replace('Z', '+00:00')).timestamp() * 1000)
def parse(m):
    t = re.sub('<[^>]*>', '', m); d = {}
    for lab in ['RSI', 'SRSI']:
        x = re.search(r'^' + lab + r':(.*)$', t, re.M)
        if x:
            for tf, v in re.findall(r'(\d+[mhd])\.(\d+)', x.group(1)): d[lab + tf] = int(v)
    s = re.search(r'Strategy: (\S+)', t); d['st'] = s.group(1) if s else None
    d['dir'] = 1 if t.startswith('🟢') else -1
    b = re.search(r'Boost Value: \+?(-?[\d.]+)', t); d['boost'] = float(b.group(1)) if b else None
    return d
rows = [json.loads(l) for l in open(FEAT)]
syms = set(r['s'] for r in rows); tmin = min(r['t'] for r in rows); tmax = max(r['t'] for r in rows)
F = {(r['s'], r['t']): r for r in rows}
refs = {}
for b in ['hammer', 'hammer-pro', 'hammer-pro-plus']:
    L = []
    for l in open('data/ref/%s.jsonl' % b):
        m = json.loads(l)
        if m['symbol'] not in syms: continue
        t = ts(m['createdAt'])
        if not (tmin - 60000 <= t <= tmax + 60000): continue
        d = parse(m['message']); d['t'] = t; d['s'] = m['symbol']; d['bot'] = b
        if b == 'hammer': d['st'] = 'H'
        L.append(d)
    refs[b] = L
print('feature rows', len(rows), 'symbols', len(syms), {b: len(v) for b, v in refs.items()})
OUT = {}
# ---- W1: bar-close events
pro = refs['hammer-pro']
w1 = [d for d in pro if d['st'] == '#W1']
lab = {}
miss = 0
for d in w1:
    rt = (d['t'] // 60000) * 60000
    r = F.get((d['s'], rt))
    if r is None: miss += 1; continue
    lab[(d['s'], rt)] = d
print('W1 msgs', len(w1), 'with feature row', len(lab), 'no row', miss)
sec = collections.Counter((d['t'] % 60000) // 1000 for d in w1); print('W1 second-in-minute', sorted(sec.items())[:10])
pos = [(F[k], v) for k, v in lab.items()]
print('W1 wtX at row vs dir', collections.Counter((r['wtX'], d['dir']) for r, d in pos))
cand = [r for r in rows if r['wtX'] != 0]
print('rows with closed-1m WT cross', len(cand), 'labeled', sum(1 for r in cand if (r['s'], r['t']) in lab))
def show(name, P, N, f):
    pv = sorted(f(x) for x in P); nv = sorted(f(x) for x in N)
    q = lambda a, p: a[int(p * (len(a) - 1))] if a else None
    print('%-28s pos n=%d [%s %s %s %s %s]  neg n=%d [%s %s %s]' % (name, len(pv), q(pv, 0), q(pv, .05), q(pv, .5), q(pv, .95), q(pv, 1), len(nv), q(nv, .05), q(nv, .5), q(nv, .95)))
for D in (1, -1):
    P = [r for r in cand if r['wtX'] == D and (r['s'], r['t']) in lab and lab[(r['s'], r['t'])]['dir'] == D]
    N = [r for r in cand if r['wtX'] == D and (r['s'], r['t']) not in lab]
    print('--- W1 dir', D, 'pos', len(P), 'neg', len(N))
    for name, f in [('wt1', lambda r: r['P']['wt1']), ('wt2', lambda r: r['P']['wt2']), ('wt1p', lambda r: r['P']['wt1p']), ('wt2p', lambda r: r['P']['wt2p']),
                    ('rsi1m', lambda r: r['P']['rsiC']), ('k1m', lambda r: r['P']['kC']), ('rsi5m', lambda r: r['S2']['rsi']), ('k5m', lambda r: r['S2']['k']),
                    ('rsi1h', lambda r: r['S3']['rsi']), ('k1h', lambda r: r['S3']['k']), ('bUp', lambda r: r['bUp']), ('bDn', lambda r: r['bDn'])]:
        show(name, P, N, f)

# ---- candidate W1 rule evaluation
def evalrule(name, f):
    tp = fp = fn = 0; fps = []
    for r in cand:
        k = (r['s'], r['t']); D = r['wtX']; ok = f(r, D)
        isp = k in lab and lab[k]['dir'] == D
        if ok and isp: tp += 1
        elif ok: fp += 1; fps.append(r)
        elif isp: fn += 1
    print('%-60s tp %d fp %d fn %d  prec %.2f rec %.2f' % (name, tp, fp, fn, tp / max(1, tp + fp), tp / max(1, tp + fn)))
    return fps
B = lambda r, D: r['bUp'] if D == 1 else r['bDn']
evalrule('wt1 beyond 53', lambda r, D: D * r['P']['wt1'] <= -53 if D == 1 else r['P']['wt1'] >= 53)
evalrule('wt1/wt2 beyond 53', lambda r, D: (r['P']['wt1'] <= -53 and r['P']['wt2'] <= -53) if D == 1 else (r['P']['wt1'] >= 53 and r['P']['wt2'] >= 53))
for lv in (53, 60):
  for bmin in (0, 0.3, 0.5, 1.0):
    for rs in (None, 45):
      def f(r, D, lv=lv, bmin=bmin, rs=rs):
        w = r['P']['wt2']
        if D == 1:
            ok = w <= -lv and (rs is None or (r['P']['rsiC'] <= rs and r['S2']['rsi'] <= rs))
        else:
            ok = w >= lv and (rs is None or (r['P']['rsiC'] >= 100 - rs and r['S2']['rsi'] >= 100 - rs))
        return ok and B(r, D) >= bmin
      evalrule('wt2 lvl %d boost>=%.1f rsi %s' % (lv, bmin, rs), f)
