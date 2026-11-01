# Does the divergence condition hold at SMA-cross messages vs SMA-cross FPs?
import sys, collections, random
import numpy as np
from div_lib import *
TF = sys.argv[1] if len(sys.argv) > 1 else '1h'; MS = H if TF == '1h' else 4 * H
def divc(s, i, bull, N=80, po=30, pivR=2, btw=True):
    R = s.rsi; A = s.l if bull else s.h
    a, b = i - N, i - 1
    w = R[a:b]; j = a + int(np.argmin(w) if bull else np.argmax(w))
    if bull: ok = A[i] < A[j] and R[i] > R[j] and R[j] <= po
    else: ok = A[i] > A[j] and R[i] < R[j] and R[j] >= 100 - po
    if ok and pivR:
        wr = R[j - pivR:j + pivR + 1]; ok = (R[j] == wr.min()) if bull else (R[j] == wr.max())
    if ok and btw and j + 1 < i:
        seg = A[j + 1:i]; ok = (seg.min() >= A[i]) if bull else (seg.max() <= A[i])
    return ok, j
refs = load_refs(); STRAT = TF.upper() + ' RSI SMA CROSSED'
allsyms = sorted(set(r['sym'] for r in refs)); frac = {s: i / len(allsyms) for i, s in enumerate(allsyms)}
msgset = {(r['sym'], r['t'] // MS): r for r in refs}
pos = collections.Counter(); neg = collections.Counter()
feats = collections.defaultdict(list)
for r in refs:
    if r['st'] != STRAT: continue
    s = series(r['sym'], TF)
    if s is None: continue
    L = s.live_index(r['t'], MS)
    if L is None or L < 210: continue
    bull = r['dir'] == 'up'
    for back in range(0, 6):
        ok, j = divc(s, L - 1 - back, bull)
        if ok: pos['div@-%d' % (back + 1)] += 1
    pos['n'] += 1
    rl = live_rsi(s.up[L - 1], s.dn[L - 1], r['price'] - s.c[L - 1])
    feats['rl'].append(rl); feats['rc1'].append(s.rsi[L - 1]); feats['minR10'].append(np.min(s.rsi[L - 10:L]) if bull else np.max(s.rsi[L - 10:L]))
print(dict(pos))
for k, v in feats.items(): v = np.sort(v); print(k, [round(float(v[int(len(v) * f)]), 1) for f in (0.02, .1, .25, .5, .75, .9, .98)])
