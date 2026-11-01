# SMA cross armed by a prior DIV message (reference) on same symbol/direction.
import sys, collections, random
import numpy as np
from div_lib import *
TF = '1h'; MS = H
refs = load_refs()
div = collections.defaultdict(list)
for r in refs:
    if r['st'] == '1H RSI DIVERGENCE': div[(r['sym'], r['dir'])].append(r['t'] // MS)
sma = {(r['sym'], r['t'] // MS, r['dir']): r for r in refs if r['st'] == '1H RSI SMA CROSSED'}
allsyms = sorted(set(r['sym'] for r in refs)); frac = {s: i / len(allsyms) for i, s in enumerate(allsyms)}
t0 = min(r['t'] for r in refs) // MS + 2; t1 = max(r['t'] for r in refs) // MS
res = []
for W in (6, 12, 24, 48, 96):
  for U in (35, 40, 45, 100):
    for mode in ('live', 'closed'):
      for same in (True, False):
        tp = fp = fn = 0
        for sym in allsyms:
            s = series(sym, TF)
            if s is None: continue
            for d in ('up', 'down'):
                arms = sorted(div.get((sym, d), []))
                if not arms and not any(k[0] == sym and k[2] == d for k in sma): continue
                armed = None
                ai = 0
                for h in range(t0, t1):
                    while ai < len(arms) and arms[ai] <= h:
                        armed = arms[ai]; ai += 1
                    ref = (sym, h, d) in sma
                    ok = False
                    if armed is not None and (h > armed or (same and h == armed)) and h - armed <= W:
                        t = h * MS + int(60_000 + 12 * 60_000 * frac[sym]); L = s.live_index(t, MS)
                        if L is not None and L > 60 and np.isfinite(s.up[L - 1]):
                            p = sma[(sym, h, d)]['price'] if ref else (price_proxy(sym, t) or s.o[L])
                            rl = live_rsi(s.up[L - 1], s.dn[L - 1], p - s.c[L - 1])
                            R = np.append(s.rsi[L - 30:L], rl); S = np.convolve(R, np.ones(14) / 14, 'valid')
                            a0, a1, b0, b1 = (R[-2], R[-1], S[-2], S[-1]) if mode == 'live' else (R[-3], R[-2], S[-3], S[-2])
                            ok = (a0 <= b0 and a1 > b1 and rl <= U) if d == 'up' else (a0 >= b0 and a1 < b1 and rl >= 100 - U)
                            if ok: armed = None
                    if ok and ref: tp += 1
                    elif ok: fp += 1
                    elif ref: fn += 1
        rec = tp / max(tp + fn, 1); prec = tp / max(tp + fp, 1)
        res.append((2 * rec * prec / max(rec + prec, 1e-9), rec, prec, tp, fp, fn, (W, U, mode, same)))
res.sort(key=lambda x: -x[0])
for r in res[:12]: print('F1 %.3f rec %.3f prec %.3f tp %d fp %d fn %d' % r[:6], r[6])
