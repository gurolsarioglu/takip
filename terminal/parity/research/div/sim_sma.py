# RSI/SMA14 cross simulation.  python3 sim_sma.py <tf> <nsym>
import sys, collections, random
import numpy as np
from div_lib import *
TF = sys.argv[1] if len(sys.argv) > 1 else '1h'
MS = H if TF == '1h' else 4 * H
STRAT = TF.upper() + ' RSI SMA CROSSED'

def run(sym, s, hours, frac, cfg, msgs):
    mode, U, Dn, cool, smaLen = cfg
    last = {'up': -999, 'down': -999}; out = []
    for h in hours:
        t = h * MS + int(60_000 + 12 * 60_000 * frac)
        L = s.live_index(t, MS)
        if L is None or L < 210 or not np.isfinite(s.up[L - 1]): continue
        m = msgs.get(h)
        price = m['price'] if m else (price_proxy(sym, t) if TF == '1h' else s.o[L])
        if price is None: price = s.o[L]
        rl = live_rsi(s.up[L - 1], s.dn[L - 1], price - s.c[L - 1])
        R = np.append(s.rsi[L - 40:L], rl)
        S = np.convolve(R, np.ones(smaLen) / smaLen, 'valid')
        if mode == 'live':   # cross between closed bar L-1 and live bar L
            a0, a1, b0, b1 = R[-2], R[-1], S[-2], S[-1]
        else:                # cross between closed bars L-2 and L-1
            a0, a1, b0, b1 = R[-3], R[-2], S[-3], S[-2]
        ri = R[-2]
        if U < 0:  # threshold on closed RSI and SMA
            up = a0 <= b0 and a1 > b1 and ri <= -U
            dn = a0 >= b0 and a1 < b1 and ri >= Dn
        else:
            up = a0 <= b0 and a1 > b1 and rl <= U
            dn = a0 >= b0 and a1 < b1 and rl >= Dn
        for d, ok in (('up', up), ('down', dn)):
            if ok and h - last[d] < cool: ok = False
            if ok: last[d] = h
            out.append((ok, m is not None and m['dir'] == d))
    return out

if __name__ == '__main__':
    refs = load_refs()
    msgs_by = collections.defaultdict(dict)
    for r in refs:
        if r['st'] == STRAT: msgs_by[r['sym']][r['t'] // MS] = r
    allsyms = sorted(set(r['sym'] for r in refs)); frac = {s: i / len(allsyms) for i, s in enumerate(allsyms)}
    random.seed(5); sub = random.sample(allsyms, int(sys.argv[2]) if len(sys.argv) > 2 else 200)
    t0 = min(r['t'] for r in refs) // MS + 2; t1 = max(r['t'] for r in refs) // MS
    res = []
    for mode in ('live',):
        for U in (-25, -28, -30, -32):
            for Dn in (68, 70, 72, 75):
                for cool in (1, 6, 24):
                    cfg = (mode, U, Dn, cool, 14)
                    tp = fp = fn = 0
                    for sym in sub:
                        s = series(sym, TF)
                        if s is None: continue
                        for ok, ref in run(sym, s, range(t0, t1), frac[sym], cfg, msgs_by.get(sym, {})):
                            if ok and ref: tp += 1
                            elif ok: fp += 1
                            elif ref: fn += 1
                    rec = tp / max(tp + fn, 1); prec = tp / max(tp + fp, 1)
                    res.append((2 * rec * prec / max(rec + prec, 1e-9), rec, prec, tp, fp, fn, cfg))
    res.sort(key=lambda x: -x[0])
    for r in res[:15]: print('F1 %.3f rec %.3f prec %.3f tp %d fp %d fn %d' % r[:6], r[6])
