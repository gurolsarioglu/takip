# Grid search of divergence definitions vs Visivero div 1H messages.
# python3 div_search.py [neg_samples]
import sys, random, json, collections, itertools
import numpy as np
from div_lib import *

TFMS = {'1h': H, '4h': 4 * H}

def pivots(arr, P, kind):
    """indices k (closed data) that are pivot low/high with P left/right; ties allowed like 5in1 (== min of window)."""
    N = len(arr); out = np.zeros(N, bool)
    if N < 2 * P + 1: return out
    from numpy.lib.stride_tricks import sliding_window_view as sw
    w = sw(arr, 2 * P + 1)
    m = w.min(1) if kind == 'low' else w.max(1)
    out[P:N - P] = arr[P:N - P] == m
    return out

_piv = {}
def piv(sym, tf, P, src, kind):
    k = (sym, tf, P, src, kind)
    if k not in _piv:
        s = series(sym, tf)
        a = (s.l if kind == 'low' else s.h) if src == 'HL' else (s.c if src == 'C' else s.rsi)
        a = np.where(np.isfinite(a), a, np.inf if kind == 'low' else -np.inf)
        _piv[k] = np.nonzero(pivots(a, P, kind))[0]
    return _piv[k]

def ctx_arrays(s, L, price):
    """closed arrays up to L-1 + live L with price."""
    rsiL = live_rsi(s.up[L - 1], s.dn[L - 1], price - s.c[L - 1])
    return rsiL

def ltb(s, sym, tf, L, price, P, src, confirm, maxbars, line, hidden=False):
    """LonesomeTheBlue divergence (5in1). returns (bull, bear) lengths>0 if found."""
    rsiL = ctx_arrays(s, L, price)
    R = s.rsi; C = s.c
    o = s.o[L]
    res = []
    for bull in (True, False):
        kind = 'low' if bull else 'high'
        pv = piv(sym, tf, P, src, kind)
        pv = pv[pv + P <= L - 1][::-1][:20]   # confirmed on closed bars, newest first
        cur = L
        if confirm == 'nc':
            idx = L - 1; rnow = R[idx]; cnow = C[idx]
            pnow = (s.l[idx] if bull else s.h[idx]) if src == 'HL' else C[idx]
        elif confirm:
            idx = L - 1
            if bull and not (rsiL > R[L - 1] or price > C[L - 1]): res.append(0); continue
            if not bull and not (rsiL < R[L - 1] or price < C[L - 1]): res.append(0); continue
            rnow = R[idx]; cnow = C[idx]
            pnow = (s.l[idx] if bull else s.h[idx]) if src == 'HL' else C[idx]
        else:
            idx = L; rnow = rsiL; cnow = price
            pnow = (min(o, price) if bull else max(o, price)) if src == 'HL' else price
        found = 0
        for k in pv:
            length = cur - k
            if length > maxbars: break
            if length <= 5: continue
            pval = (s.l[k] if bull else s.h[k]) if src == 'HL' else C[k]
            rk = R[k]
            if not np.isfinite(rk): continue
            if not hidden:
                ok = (rnow > rk and pnow < pval) if bull else (rnow < rk and pnow > pval)
            else:
                ok = (rnow < rk and pnow > pval) if bull else (rnow > rk and pnow < pval)
            if not ok: continue
            if line:
                sp = 1 if confirm else 0  # 'nc' is truthy -> 1
                den = length - sp
                s1 = (rnow - rk) / den; s2 = (cnow - C[k]) / den
                v1 = rnow - s1; v2 = cnow - s2; good = True
                for y in range(1 + sp, length):
                    j = cur - y
                    rj = R[j]; cj = C[j]
                    if bull and (rj < v1 or cj < v2): good = False; break
                    if not bull and (rj > v1 or cj > v2): good = False; break
                    v1 -= s1; v2 -= s2
                if not good: continue
            found = length; break
        res.append(found)
    return tuple(res)

def pine_rsi(s, sym, tf, L, price, lbL, lbR, curLive, rlo=5, rhi=60):
    """TradingView RSI divergence: pivots on RSI. returns (bull, bear)."""
    rsiL = ctx_arrays(s, L, price)
    R = s.rsi.copy()
    cur = L if curLive else L - 1
    Rv = R[:cur + 1].copy()
    if curLive: Rv[L] = rsiL
    lo = s.l[:cur + 1].copy(); hi = s.h[:cur + 1].copy()
    if curLive: lo[L] = min(s.o[L], price); hi[L] = max(s.o[L], price)
    out = []
    for bull in (True, False):
        k = cur - lbR
        if k - lbL < 0: out.append(False); continue
        win = Rv[k - lbL:k + lbR + 1]
        if not np.all(np.isfinite(win)): out.append(False); continue
        isp = (Rv[k] == win.min() and (win == Rv[k]).sum() == 1) if bull else (Rv[k] == win.max() and (win == Rv[k]).sum() == 1)
        if not isp: out.append(False); continue
        # previous pivot (confirmed before), search back
        prev = None
        for j in range(k - 1, max(lbL, k - rhi - 1), -1):
            w2 = Rv[j - lbL:j + lbR + 1]
            if len(w2) < lbL + lbR + 1 or not np.all(np.isfinite(w2)): continue
            if (bull and Rv[j] == w2.min() and (w2 == Rv[j]).sum() == 1) or (not bull and Rv[j] == w2.max() and (w2 == Rv[j]).sum() == 1):
                prev = j; break
        if prev is None or not (rlo <= k - prev <= rhi): out.append(False); continue
        if bull: out.append(Rv[k] > Rv[prev] and lo[k] < lo[prev])
        else: out.append(Rv[k] < Rv[prev] and hi[k] > hi[prev])
    return tuple(out)


def ext(s, L, price, N, cur, src, gap=1):
    """'new extreme' divergence: current point makes new N-bar extreme vs bars before it; RSI at that previous extreme is weaker."""
    R = s.rsi
    rsiL = live_rsi(s.up[L - 1], s.dn[L - 1], price - s.c[L - 1])
    if cur == 'closed':
        i = L - 1; rn = R[i]; lo = s.l[i] if src == 'HL' else s.c[i]; hi = s.h[i] if src == 'HL' else s.c[i]
    else:
        i = L; rn = rsiL; lo = min(s.o[L], price) if src == 'HL' else price; hi = max(s.o[L], price) if src == 'HL' else price
    a = i - N; b = i - gap + 1
    if a < 20: return (False, False)
    wl = (s.l if src == 'HL' else s.c)[a:b]; wh = (s.h if src == 'HL' else s.c)[a:b]
    jl = a + int(np.argmin(wl)); jh = a + int(np.argmax(wh))
    bull = lo < wl.min() and rn > R[jl]
    bear = hi > wh.max() and rn < R[jh]
    return (bull, bear)

def are(s, L, price, k, src, strict, recent, maxgap=1000, cur_live=True):
    """scipy.signal.argrelextrema(mode='clip') pivots on series incl. live bar; compare last two pivots."""
    R = s.rsi[:L + 1].copy(); R[L] = live_rsi(s.up[L - 1], s.dn[L - 1], price - s.c[L - 1])
    n = L + 1 if cur_live else L
    a0 = max(0, n - 300)
    out = []
    for bull in (True, False):
        if src == 'C':
            x = s.c[a0:n].copy()
            if cur_live: x[-1] = price
        else:
            x = (s.l if bull else s.h)[a0:n].copy()
            if cur_live: x[-1] = min(s.o[L], price) if bull else max(s.o[L], price)
        N = len(x); r = R[a0:n]
        idx = np.arange(N)
        ok = np.ones(N, bool)
        for sh in range(1, k + 1):
            pl = x[np.clip(idx + sh, 0, N - 1)]; mi = x[np.clip(idx - sh, 0, N - 1)]
            if bull:
                ok &= (x < pl) & (x < mi) if strict else (x <= pl) & (x <= mi)
            else:
                ok &= (x > pl) & (x > mi) if strict else (x >= pl) & (x >= mi)
        p = np.nonzero(ok)[0]
        if len(p) < 2: out.append(False); continue
        p1, p2 = p[-2], p[-1]
        if p2 < N - 1 - recent or p2 - p1 > maxgap: out.append(False); continue
        if bull: out.append(bool(x[p2] < x[p1] and r[p2] > r[p1]))
        else: out.append(bool(x[p2] > x[p1] and r[p2] < r[p1]))
    return tuple(out)

def configs():
    cs = []
    for P in ():
        for src in ('HL', 'C'):
            for confirm in (True, False, 'nc'):
                for line in (True, False):
                    for mb in (60, 200):
                        cs.append(('ltb', P, src, confirm, line, mb))
    for lbL in ():
        for lbR in (1, 2, 3, 5):
            for cl in (True, False):
                cs.append(('pine', lbL, lbR, cl))
    for k in (2, 3, 4, 5, 7, 10):
        for src in ('C', 'HL'):
            for strict in (False,):
                for recent in (0, 1, 2):
                    for live in (True, False):
                        cs.append(('are', k, src, strict, recent, live))
    for N in (40, 60):
        for cur in ('closed',):
            for src in ('HL', 'C', 'OR'):
                for gap in (1, 2):
                    cs.append(('ext', N, cur, src, gap))
    return cs

def evaluate(sym, tf, t, price, cs):
    s = series(sym, tf)
    if s is None: return None
    L = s.live_index(t, TFMS[tf])
    if L is None or L < 100 or not np.isfinite(s.up[L - 1]): return None
    out = {}
    for c in cs:
        if c[0] == 'ltb': b = ltb(s, sym, tf, L, price, c[1], c[2], c[3], c[5], c[4])
        elif c[0] == 'are': b = are(s, L, price, c[1], c[2], c[3], c[4], cur_live=c[5])
        elif c[0] == 'ext':
            if c[3] == 'OR':
                b1 = ext(s, L, price, c[1], c[2], 'HL', c[4]); b2 = ext(s, L, price, c[1], c[2], 'C', c[4]); b = (b1[0] or b2[0], b1[1] or b2[1])
            else: b = ext(s, L, price, c[1], c[2], c[3], c[4])
        else: b = pine_rsi(s, sym, tf, L, price, c[1], c[2], c[3])
        out[c] = (bool(b[0]), bool(b[1]))
    rl = live_rsi(s.up[L - 1], s.dn[L - 1], price - s.c[L - 1])
    return out, rl

if __name__ == '__main__':
    nneg = int(sys.argv[1]) if len(sys.argv) > 1 else 3000
    npos = int(sys.argv[2]) if len(sys.argv) > 2 else 1500
    random.seed(1)
    refs = [r for r in load_refs() if r['st'] == '1H RSI DIVERGENCE']
    random.shuffle(refs); refs = refs[:npos]
    cs = configs()
    pos = collections.Counter(); posn = 0; rsis = []
    for r in refs:
        e = evaluate(r['sym'], '1h', r['t'], r['price'], cs)
        if e is None: continue
        posn += 1; ev, rl = e
        rsis.append((r['dir'], round(rl, 2), r['rsi'].get('1h')))
        for c, (bu, be) in ev.items():
            hit = bu if r['dir'] == 'up' else be
            if hit: pos[c] += 1
    # negatives: (symbol, hour) with no div message within +-1h, symbol seen in refs
    allrefs = load_refs()
    msgset = set((r['sym'], r['t'] // H) for r in allrefs)
    syms = sorted(set(r['sym'] for r in allrefs))
    t0 = min(r['t'] for r in allrefs) // H + 2; t1 = max(r['t'] for r in allrefs) // H - 1
    neg = collections.Counter(); negn = 0; tries = 0
    while negn < nneg and tries < nneg * 5:
        tries += 1
        sym = random.choice(syms); h = random.randint(t0, t1)
        if (sym, h) in msgset or (sym, h - 1) in msgset or (sym, h + 1) in msgset: continue
        t = h * H + 5 * 60_000
        p = price_proxy(sym, t)
        if p is None: continue
        e = evaluate(sym, '1h', t, p, cs)
        if e is None: continue
        negn += 1
        for c, (bu, be) in e[0].items():
            if bu: neg[(c, 'up')] += 1
            if be: neg[(c, 'down')] += 1
    rows = []
    nup = sum(1 for r in refs if r['dir'] == 'up')
    for c in cs:
        fp = neg[(c, 'up')] + neg[(c, 'down')]
        rows.append((pos[c] / max(posn, 1), fp / max(negn, 1), c))
    rows.sort(key=lambda x: -(x[0] - 5 * x[1]))
    print('positives', posn, 'negatives', negn)
    for hr, fr, c in rows[:40]: print(f'{hr:.3f} fp/eval {fr:.4f}', c)
    json.dump({'posn': posn, 'negn': negn, 'rows': [(a, b, list(c)) for a, b, c in rows]}, open(os.path.join(ROOT, 'div', 'search1.json'), 'w'))
