import sys, collections
import numpy as np
from div_lib import *
TF = sys.argv[1] if len(sys.argv) > 1 else '1h'; MS = H if TF == '1h' else 4 * H
STRAT = TF.upper() + ' RSI SMA CROSSED'
refs = load_refs(); c = collections.Counter(); rows = []
for r in refs:
    if r['st'] != STRAT: continue
    s = series(r['sym'], TF)
    if s is None: continue
    L = s.live_index(r['t'], MS)
    if L is None or L < 210: continue
    bull = r['dir'] == 'up'; i = L - 1; R = s.rsi; A = s.l if bull else s.h
    rl = live_rsi(s.up[L - 1], s.dn[L - 1], r['price'] - s.c[L - 1])
    RR = np.append(R[L - 30:L], rl); S = np.convolve(RR, np.ones(14) / 14, 'valid')
    crossLive = (RR[-2] <= S[-2] and RR[-1] > S[-1]) if bull else (RR[-2] >= S[-2] and RR[-1] < S[-1])
    crossClosed = (RR[-3] <= S[-3] and RR[-2] > S[-2]) if bull else (RR[-3] >= S[-3] and RR[-2] < S[-2])
    a = i - 80; w = R[a:i - 1]; j = a + int(np.argmin(w) if bull else np.argmax(w))
    newext = (A[i] < A[j:i].min()) if bull else (A[i] > A[j:i].max())
    rows.append(dict(dir=r['dir'], crossLive=crossLive, crossClosed=crossClosed, rl=round(rl, 1), ri=round(R[i], 1), rj=round(R[j], 1), dist=i - j, newext=bool(newext),
                     minR5=round(float(R[i - 5:i + 1].min() if bull else R[i - 5:i + 1].max()), 1), sma=round(float(S[-1]), 1)))
for k in ('crossLive', 'crossClosed', 'newext'):
    print(k, collections.Counter((x['dir'], x[k]) for x in rows))
for x in rows[:25]: print(x)
