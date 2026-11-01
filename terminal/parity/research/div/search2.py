# Flexible "oversold-anchor" divergence search.  python3 search2.py <tf> <npos> <nneg>
import sys, random, collections
import numpy as np
from div_lib import *

TF = sys.argv[1] if len(sys.argv) > 1 else '1h'
MS = H if TF == '1h' else 4 * H
STRATS = ('1H RSI DIVERGENCE',) if TF == '1h' else ('4H RSI DIVERGENCE',)

def localext(a, j, P, low):
    if P == 0: return True
    w = a[j - P:j + P + 1]
    return (a[j] == w.min()) if low else (a[j] == w.max())

def detect(s, L, price, cfg):
    """cfg: (N, md, anchorRSI, pivR, pivP, src, choose, curmode)"""
    N, md, arsi, pivR, pivP, src, choose, curm = cfg
    R = s.rsi
    rl = live_rsi(s.up[L - 1], s.dn[L - 1], price - s.c[L - 1])
    i = L - 1
    out = []
    for bull in (True, False):
        A = (s.l if bull else s.h) if src == 'HL' else s.c
        if curm == 'closed': pn = A[i]; rn = R[i]
        else:  # live
            pn = (min(s.o[L], price) if bull else max(s.o[L], price)) if src == 'HL' else price; rn = rl; i = L
        hit = False
        js = range(i - md, i - N - 1, -1)
        best = None
        for j in js:
            rj = R[j]
            if bull and rj > arsi: continue
            if (not bull) and rj < 100 - arsi: continue
            if j + max(pivR, pivP) > i - 1 + (1 if curm == 'live' else 0): continue
            if pivR and not localext(R, j, pivR, bull): continue
            if pivP and not localext(A, j, pivP, bull): continue
            if choose == 'recent':
                best = j; break
            if choose == 'any':
                if (bull and pn < A[j] and rn > rj) or ((not bull) and pn > A[j] and rn < rj): hit = True; break
            if choose == 'extreme':
                if best is None or (bull and A[j] < A[best]) or ((not bull) and A[j] > A[best]): best = j
        if choose in ('recent', 'extreme') and best is not None:
            j = best; rj = R[j]
            hit = (bull and pn < A[j] and rn > rj) or ((not bull) and pn > A[j] and rn < rj)
        out.append(hit)
        i = L - 1
    return out

def configs():
    cs = []
    for N in (30, 50, 80):
        for md in (2, 3):
            for arsi in (30,):
                for pivR in (0, 1, 2):
                    for pivP in (0, 1, 2):
                        for src in ('HL', 'C'):
                            for choose in ('recent', 'any', 'extreme'):
                                cs.append((N, md, arsi, pivR, pivP, src, choose, 'closed'))
    return cs

if __name__ == '__main__':
    npos = int(sys.argv[2]) if len(sys.argv) > 2 else 800; nneg = int(sys.argv[3]) if len(sys.argv) > 3 else 4000
    random.seed(21)
    refs = load_refs(); cs = configs()
    P = [r for r in refs if r['st'] in STRATS]; random.shuffle(P); P = P[:npos]
    hitu = collections.Counter(); hitd = collections.Counter(); nu = nd = 0
    for r in P:
        s = series(r['sym'], TF)
        if s is None: continue
        L = s.live_index(r['t'], MS)
        if L is None or L < 210: continue
        if r['dir'] == 'up': nu += 1
        else: nd += 1
        for c in cs:
            b = detect(s, L, r['price'], c)
            if r['dir'] == 'up' and b[0]: hitu[c] += 1
            if r['dir'] == 'down' and b[1]: hitd[c] += 1
    msgset = set((r['sym'], r['t'] // MS) for r in refs)
    syms = sorted(set(r['sym'] for r in refs)); rank = {s: i for i, s in enumerate(syms)}
    t0 = min(r['t'] for r in refs) // MS + 2; t1 = max(r['t'] for r in refs) // MS - 1
    fu = collections.Counter(); fd = collections.Counter(); nn = 0; tries = 0
    while nn < nneg and tries < nneg * 4:
        tries += 1
        sym = random.choice(syms); h = random.randint(t0, t1)
        if (sym, h) in msgset: continue
        t = h * MS + int(60_000 + 12 * 60_000 * rank[sym] / len(syms))
        p = price_proxy(sym, t); s = series(sym, TF)
        if p is None or s is None: continue
        L = s.live_index(t, MS)
        if L is None or L < 210 or not np.isfinite(s.up[L - 1]): continue
        nn += 1
        for c in cs:
            b = detect(s, L, p, c)
            if b[0]: fu[c] += 1
            if b[1]: fd[c] += 1
    tot = sum(1 for r in refs if r['st'] in STRATS)
    nsym = len(syms); hours = (t1 - t0)
    nup = sum(1 for r in refs if r['st'] in STRATS and r['dir'] == 'up'); ndn = tot - nup
    bu, bd = nup / (nsym * hours), ndn / (nsym * hours)
    rows = []
    for c in cs:
        ru, rd = hitu[c] / max(nu, 1), hitd[c] / max(nd, 1); f1, f2 = fu[c] / max(nn, 1), fd[c] / max(nn, 1)
        pu_ = ru * bu / max(ru * bu + f1, 1e-12); pd_ = rd * bd / max(rd * bd + f2, 1e-12)
        rows.append((ru, rd, f1, f2, pu_, pd_, c))
    rows.sort(key=lambda r: -(r[0] * r[4] + r[1] * r[5]))
    print('pos', nu, nd, 'neg', nn, 'base', round(bu, 4), round(bd, 4))
    for r in rows[:30]: print('rec %.3f %.3f fpr %.4f %.4f prec %.2f %.2f' % r[:6], r[6])
