# Full-hour simulation for chosen symbols: print rule fires vs reference messages.
import sys, collections
import numpy as np
from div_lib import *

def rule(s, L, price, N=50, po=30, md=2, src='HL'):
    R = s.rsi; i = L - 1
    rl = live_rsi(s.up[L - 1], s.dn[L - 1], price - s.c[L - 1])
    res = {}
    A_l = s.l if src == 'HL' else s.c; A_h = s.h if src == 'HL' else s.c
    a, b = i - N, i
    jl = a + int(np.argmin(A_l[a:b])); jh = a + int(np.argmax(A_h[a:b]))
    up = A_l[i] < A_l[jl] and R[i] > R[jl] and R[jl] <= po and i - jl >= md
    dn = A_h[i] > A_h[jh] and R[i] < R[jh] and R[jh] >= 100 - po and i - jh >= md
    return up, dn, jl, jh, rl

if __name__ == '__main__':
    refs = [r for r in load_refs() if r['st'] == '1H RSI DIVERGENCE']
    cnt = collections.Counter(r['sym'] for r in refs)
    syms = [s for s, _ in cnt.most_common(40)][int(sys.argv[1]) if len(sys.argv) > 1 else 0:][:6]
    t0 = min(r['t'] for r in refs) // H + 2; t1 = max(r['t'] for r in refs) // H
    allsyms = sorted(set(r['sym'] for r in load_refs())); rank = {s: i for i, s in enumerate(allsyms)}
    for sym in syms:
        s = series(sym, '1h')
        if s is None: continue
        msgs = {r['t'] // H: r for r in refs if r['sym'] == sym}
        line = []
        for h in range(t0, t1):
            t = h * H + int(60_000 + 12 * 60_000 * rank[sym] / len(allsyms))
            p = price_proxy(sym, t)
            if p is None: continue
            L = s.live_index(t, H)
            if L is None or L < 210: continue
            u, d, jl, jh, rl = rule(s, L, p)
            m = msgs.get(h)
            tag = ''
            if u or d or m:
                tag = f"{'U' if u else ''}{'D' if d else ''}/{('M' + m['dir'][0]) if m else '-'} a={(L-1-jl) if u else (L-1-jh) if d else ''} rl={rl:.0f}"
                line.append(f'{(h - t0)}:{tag}')
        print(sym, ' '.join(line))
