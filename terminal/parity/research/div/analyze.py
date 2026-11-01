# Analyse feature table: rule families vs positives/negatives.
import sys, itertools
import numpy as np
from div_lib import *
D = np.load(os.path.join(ROOT, 'div', sys.argv[1] if len(sys.argv) > 1 else 'feat_1h.npz'))
X = D['X']; names = list(D['names']); y = D['y']; dr = D['dir']; st = D['st']
col = {n: X[:, i] for i, n in enumerate(names)}
STRAT = sys.argv[2] if len(sys.argv) > 2 else '1H RSI DIVERGENCE'
pu = (y == 1) & (st == STRAT) & (dr == 'up'); pd = (y == 1) & (st == STRAT) & (dr == 'down'); ng = y == 0
nsym = len(set(D['sym'][y == 1]))
hours = 23 * 24 if STRAT.startswith('1H') else 23 * 6
base_u = pu.sum() / (nsym * hours); base_d = pd.sum() / (nsym * hours)
print('pos up', pu.sum(), 'pos down', pd.sum(), 'neg', ng.sum(), 'base rate up %.4f down %.4f' % (base_u, base_d))
def report(name, bu, bd):
    ru = bu[pu].mean(); rd = bd[pd].mean(); fu = bu[ng].mean(); fd = bd[ng].mean()
    precu = ru * base_u / max(ru * base_u + fu, 1e-12); precd = rd * base_d / max(rd * base_d + fd, 1e-12)
    return (ru, rd, fu, fd, precu, precd, name)
rows = []
for cur in ('closed', 'live'):
    for src in ('HL', 'C', 'OR'):
        for N in (5, 10, 15, 20, 30, 40, 50, 60, 80, 100, 150):
            for gap in (1, 2):
                for thr in ((100, 0), (45, 55), (42, 58), (40, 60)):
                    def g(s, k): return col[f'{cur}_{s}_{N}_{gap}_{k}']
                    if src == 'OR':
                        bu = ((g('HL', 'newlo') > 0) & (g('HL', 'drl') > 0)) | ((g('C', 'newlo') > 0) & (g('C', 'drl') > 0))
                        bd = ((g('HL', 'newhi') > 0) & (g('HL', 'drh') < 0)) | ((g('C', 'newhi') > 0) & (g('C', 'drh') < 0))
                    else:
                        bu = (g(src, 'newlo') > 0) & (g(src, 'drl') > 0); bd = (g(src, 'newhi') > 0) & (g(src, 'drh') < 0)
                    bu = bu & (col['rsi_live'] <= thr[0]); bd = bd & (col['rsi_live'] >= thr[1])
                    rows.append(report((cur, src, N, gap, thr), bu, bd))
rows.sort(key=lambda r: -(r[0] + r[1] - 20 * (r[2] + r[3])))
for r in rows[:30]: print('rec up %.3f dn %.3f | fpr up %.4f dn %.4f | prec up %.2f dn %.2f' % r[:6], r[6])
