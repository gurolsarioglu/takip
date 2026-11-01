import sys
import numpy as np
from div_lib import *
D = np.load(os.path.join(ROOT, 'div', sys.argv[1] if len(sys.argv) > 1 else 'feat_1h.npz'))
X = D['X']; n = list(D['names']); c = {k: X[:, i] for i, k in enumerate(n)}
y = D['y']; st = D['st']; dr = D['dir']
STRAT = sys.argv[2] if len(sys.argv) > 2 else '1H RSI DIVERGENCE'
hours = 23 * 24 if STRAT.startswith('1H') else 23 * 6
pu = (y == 1) & (st == STRAT) & (dr == 'up'); pd = (y == 1) & (st == STRAT) & (dr == 'down'); ng = y == 0
nsym = len(set(D['sym'][y == 1])); bu_ = pu.sum() / (nsym * hours); bd_ = pd.sum() / (nsym * hours)
rows = []
for cur in ('closed', 'live'):
  for src in ('HL', 'C', 'OR'):
    for N in (20, 30, 40, 50, 60, 80, 100, 150):
      for gap in (1, 2):
        for po in (25, 28, 30, 32, 35):
          for md in (1, 2, 3):
            def one(s):
                p = f'{cur}_{s}_{N}_{gap}'
                u = (c[p + '_newlo'] > 0) & (c[p + '_drl'] > 0) & (c['rsi_c1' if cur == 'closed' else 'rsi_live'] - c[p + '_drl'] <= po) & (c[p + '_dl'] >= md)
                d = (c[p + '_newhi'] > 0) & (c[p + '_drh'] < 0) & (c['rsi_c1' if cur == 'closed' else 'rsi_live'] - c[p + '_drh'] >= 100 - po) & (c[p + '_dh'] >= md)
                return u, d
            if src == 'OR':
                a, b = one('HL'); e, f = one('C'); u, d = a | e, b | f
            else: u, d = one(src)
            ru, rd, fu, fd = u[pu].mean(), d[pd].mean(), u[ng].mean(), d[ng].mean()
            pru = ru * bu_ / max(ru * bu_ + fu, 1e-12); prd = rd * bd_ / max(rd * bd_ + fd, 1e-12)
            rows.append((ru, rd, fu, fd, pru, prd, (cur, src, N, gap, po, md)))
rows.sort(key=lambda r: -(r[0] * r[4] + r[1] * r[5]))
print('pos', pu.sum(), pd.sum(), 'neg', ng.sum())
for r in rows[:25]: print('rec %.3f %.3f fpr %.4f %.4f prec %.2f %.2f' % r[:6], r[6])
