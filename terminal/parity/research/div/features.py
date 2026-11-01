# Build feature table for positives (div messages) and negatives (random symbol-hours without div message).
# python3 features.py <tf 1h|4h> <nneg> <out>
import sys, random, json
import numpy as np
from div_lib import *

TF = sys.argv[1] if len(sys.argv) > 1 else '1h'
NNEG = int(sys.argv[2]) if len(sys.argv) > 2 else 20000
OUT = sys.argv[3] if len(sys.argv) > 3 else os.path.join(ROOT, 'div', f'feat_{TF}.npz')
MS = H if TF == '1h' else 4 * H
NS = (5, 10, 15, 20, 30, 40, 50, 60, 80, 100, 150)

def feats(sym, t, price):
    s = series(sym, TF)
    if s is None: return None
    L = s.live_index(t, MS)
    if L is None or L < 210 or not np.isfinite(s.up[L - 1]): return None
    R = s.rsi
    rl = live_rsi(s.up[L - 1], s.dn[L - 1], price - s.c[L - 1])
    f = [rl, R[L - 1], R[L - 2], s.c[L - 1], price, s.o[L]]
    # RSI SMA14 cross (live): sma of RSI incl live
    rr = np.append(R[L - 30:L], rl)
    sm = np.convolve(rr, np.ones(14) / 14, 'valid')  # last element = sma incl live
    f += [sm[-1], sm[-2], rr[-2]]
    for cur in ('closed', 'live'):
        if cur == 'closed':
            i = L - 1; rn = R[i]; lo = {'HL': s.l[i], 'C': s.c[i]}; hi = {'HL': s.h[i], 'C': s.c[i]}
        else:
            i = L; rn = rl; lo = {'HL': min(s.o[L], price), 'C': price}; hi = {'HL': max(s.o[L], price), 'C': price}
        for src in ('HL', 'C'):
            A_l = s.l if src == 'HL' else s.c; A_h = s.h if src == 'HL' else s.c
            for N in NS:
                for gap in (1, 2):
                    a, b = i - N, i - gap + 1
                    wl = A_l[a:b]; wh = A_h[a:b]
                    jl = a + int(np.argmin(wl)); jh = a + int(np.argmax(wh))
                    f += [lo[src] < wl.min(), rn - R[jl], hi[src] > wh.max(), rn - R[jh], i - jl, i - jh]
    return f

def names():
    n = ['rsi_live', 'rsi_c1', 'rsi_c2', 'c1', 'price', 'olive', 'sma_live', 'sma_c1', 'rsi_c1b']
    for cur in ('closed', 'live'):
        for src in ('HL', 'C'):
            for N in NS:
                for gap in (1, 2):
                    p = f'{cur}_{src}_{N}_{gap}'
                    n += [p + '_newlo', p + '_drl', p + '_newhi', p + '_drh', p + '_dl', p + '_dh']
    return n

if __name__ == '__main__':
    random.seed(11)
    refs = load_refs()
    X = []; meta = []
    for r in refs:
        if not r['st'] or not r['st'].startswith(TF.upper()): continue
        f = feats(r['sym'], r['t'], r['price'])
        if f is None: continue
        X.append(f); meta.append((1, r['dir'], r['st'], r['sym'], r['t'], r['rsi'].get(TF) or -1))
    msgset = set((r['sym'], r['t'] // MS) for r in refs)
    syms = sorted(set(r['sym'] for r in refs))
    rank = {s: i for i, s in enumerate(syms)}
    t0 = min(r['t'] for r in refs) // MS + 2; t1 = max(r['t'] for r in refs) // MS - 1
    got = 0; tries = 0
    while got < NNEG and tries < NNEG * 4:
        tries += 1
        sym = random.choice(syms); h = random.randint(t0, t1)
        if (sym, h) in msgset: continue
        t = h * MS + int(60_000 + 12 * 60_000 * rank[sym] / len(syms))
        p = price_proxy(sym, t)
        if p is None: continue
        f = feats(sym, t, p)
        if f is None: continue
        X.append(f); meta.append((0, '', '', sym, t, -1)); got += 1
    X = np.array(X, dtype='float64')
    np.savez_compressed(OUT, X=X, names=np.array(names()), y=np.array([m[0] for m in meta]), dir=np.array([m[1] for m in meta]),
                        st=np.array([m[2] for m in meta]), sym=np.array([m[3] for m in meta]), t=np.array([m[4] for m in meta]), rsimsg=np.array([m[5] for m in meta]))
    print('saved', X.shape, OUT)
