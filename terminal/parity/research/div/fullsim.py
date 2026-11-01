# Full simulation of DIV 1H/4H divergence over all symbols & hours with dedupe state, vs reference messages.
# python3 fullsim.py <tf> <cfgname...>
import sys, collections, json, itertools
import numpy as np
from div_lib import *

TF = sys.argv[1] if len(sys.argv) > 1 else '1h'
MS = H if TF == '1h' else 4 * H
STRAT = '1H RSI DIVERGENCE' if TF == '1h' else '4H RSI DIVERGENCE'

DUMP = None
def run_symbol(sym, s, hours, rank_frac, cfg, msgs):
    N, md, po, anchor, src, dedupe, cool, curthr = cfg[:8]
    btw = cfg[8] if len(cfg) > 8 else False
    pivR = cfg[9] if len(cfg) > 9 else 0
    rsiK = cfg[10] if len(cfg) > 10 else 0
    st = {'up': None, 'down': None}; lastfire = {'up': -999, 'down': -999}
    res = []
    R = s.rsi
    for h in hours:
        t = h * MS + int(60_000 + 12 * 60_000 * rank_frac)
        L = s.live_index(t, MS)
        if L is None or L < 210 or not np.isfinite(s.up[L - 1]): continue
        m = msgs.get(h)
        if m is not None: price = m['price']
        else:
            price = price_proxy(sym, t) if TF == '1h' else None
            if price is None: price = s.o[L]
        i = L - 1
        if rsiK:
            seg = np.append(s.c[L - rsiK:L], price)
            rr, uu, dd = rma_states(seg)
            R = np.full(L + 1, np.nan); R[L - rsiK:L + 1] = rr
            rl = rr[-1]
        else:
            R = s.rsi
            rl = live_rsi(s.up[L - 1], s.dn[L - 1], price - s.c[L - 1])
        for d in ('up', 'down'):
            bull = d == 'up'
            A = (s.l if bull else s.h) if src in ('HL', 'HLlive', 'HLand') else s.c
            a, b = i - N, i - md + 1
            if a < 20: continue
            w = R[a:b]
            if anchor == 'anypiv':
                j = None
                for jj in range(b - 1, a - 1, -1):
                    rj = R[jj]
                    if (bull and rj > po) or ((not bull) and rj < 100 - po): continue
                    wr = R[jj - pivR:jj + pivR + 1]
                    if (bull and rj != wr.min()) or ((not bull) and rj != wr.max()): continue
                    if not ((bull and A[i] < A[jj] and R[i] > rj) or ((not bull) and A[i] > A[jj] and R[i] < rj)): continue
                    seg = A[jj + 1:i]
                    if btw and len(seg) and ((bull and seg.min() < A[i]) or ((not bull) and seg.max() > A[i])): continue
                    j = jj; break
                if j is None: res.append((h, d, False, m is not None and m['dir'] == d)); continue
            elif anchor == 'rsi': j = a + int(np.argmin(w) if bull else np.argmax(w))
            else: j = a + int(np.argmin(A[a:b]) if bull else np.argmax(A[a:b]))
            if bull: ok = A[i] < A[j] and R[i] > R[j] and R[j] <= po and rl <= (curthr[0] if isinstance(curthr, list) else curthr)
            else: ok = A[i] > A[j] and R[i] < R[j] and R[j] >= 100 - po and rl >= (curthr[1] if isinstance(curthr, list) else 100 - curthr)
            if ok and src == 'HLlive':
                if (bull and price >= A[j]) or ((not bull) and price <= A[j]): ok = False
            if ok and src == 'HLand':
                if (bull and s.c[i] >= s.c[j]) or ((not bull) and s.c[i] <= s.c[j]): ok = False
            if ok and btw and j + 1 < i:
                seg = A[j + 1:i]
                if (bull and seg.min() < A[i]) or ((not bull) and seg.max() > A[i]): ok = False
            if ok and pivR:
                wr = R[j - pivR:j + pivR + 1]
                if (bull and R[j] != wr.min()) or ((not bull) and R[j] != wr.max()): ok = False
            if ok and dedupe and st[d] == s.t[j]: ok = False
            if ok and h - lastfire[d] < cool: ok = False
            if ok:
                st[d] = s.t[j]; lastfire[d] = h
            res.append((h, d, ok, m is not None and m['dir'] == d))
            if DUMP is not None and (ok or (m is not None and m['dir'] == d)):
                DUMP.append(dict(sym=sym, h=h, d=d, fire=bool(ok), ref=bool(m is not None and m['dir'] == d), dist=int(i - j), rj=float(R[j]), ri=float(R[i]), rl=float(rl),
                    pdiff=float((A[i] / A[j] - 1) * 100), qv=float(s.c[i] * 0), hh=int(h % 24), dvol=0, olive=float(s.o[L]), price=float(price),
                    rsimin=float(np.min(R[i - N:i])) if bull else float(np.max(R[i - N:i])), prevfire=int(h - lastfire[d]) if not ok else -1))
    return res

def evaluate(cfg, refs, syms=None):
    msgs_by = collections.defaultdict(dict)
    for r in refs:
        if r['st'] == STRAT: msgs_by[r['sym']][r['t'] // MS] = r
    allsyms = sorted(set(r['sym'] for r in load_refs())); rank = {s: i / len(allsyms) for i, s in enumerate(allsyms)}
    t0 = min(r['t'] for r in refs) // MS + 2; t1 = max(r['t'] for r in refs) // MS
    hours = range(t0, t1)
    tp = fp = fn = 0; per = collections.Counter()
    for sym in (syms or allsyms):
        s = series(sym, TF)
        if s is None: continue
        for h, d, fire, ref in run_symbol(sym, s, hours, rank[sym], cfg, msgs_by.get(sym, {})):
            if fire and ref: tp += 1; per[(d, 'tp')] += 1
            elif fire: fp += 1; per[(d, 'fp')] += 1
            elif ref: fn += 1; per[(d, 'fn')] += 1
    return tp, fp, fn, per

if __name__ == '__main__':
    refs = load_refs()
    import random
    random.seed(3)
    allsyms = sorted(set(r['sym'] for r in refs))
    sub = random.sample(allsyms, int(sys.argv[2]) if len(sys.argv) > 2 else 120)
    grid = []
    for src in ('HL', 'C', 'HLlive', 'HLand'):
        for N in (80, 100):
            for pivR in (1, 2, 3):
                grid.append((N, 2, 30, 'rsi', src, True, 3, [40, 57], True, pivR, 0))
    if len(sys.argv) > 3: grid = [tuple(json.loads(sys.argv[3]))]
    if len(sys.argv) > 4: DUMP = []
    out = []
    for cfg in grid:
        tp, fp, fn, per = evaluate(cfg, refs, sub)
        rec = tp / max(tp + fn, 1); prec = tp / max(tp + fp, 1)
        out.append((2 * rec * prec / max(rec + prec, 1e-9), rec, prec, tp, fp, fn, cfg))
    out.sort(key=lambda x: -x[0])
    for o in out[:25]: print('F1 %.3f rec %.3f prec %.3f tp %d fp %d fn %d' % o[:6], o[6])
    if DUMP is not None: json.dump(DUMP, open(sys.argv[4], 'w'))
