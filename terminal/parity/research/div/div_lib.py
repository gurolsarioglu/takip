# DIV research library (runs in the device VM, offline, reads parity/data/div/k/*.json)
import json, os, math, re, collections
import numpy as np

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'data')
K = os.path.join(ROOT, 'div', 'k')
H = 3600_000

_cache = {}
def bars(sym, tf):
    key = (sym, tf)
    if key in _cache: return _cache[key]
    f = os.path.join(K, f'{sym}_{tf}.json')
    if not os.path.exists(f): _cache[key] = None; return None
    a = np.array(json.load(open(f)), dtype='float64')
    if a.size == 0: a = None
    _cache[key] = a
    return a

def rma_states(x, n=14):
    """Wilder RSI states on closes x. returns (rsi, up, dn) arrays; up/dn are RMA values at each index."""
    N = len(x); up = np.full(N, np.nan); dn = np.full(N, np.nan); rsi = np.full(N, np.nan)
    if N <= n: return rsi, up, dn
    d = np.diff(x); g = np.maximum(d, 0); l = np.maximum(-d, 0)
    u = g[:n].mean(); w = l[:n].mean(); up[n] = u; dn[n] = w
    for i in range(n + 1, N):
        u = (u * (n - 1) + g[i - 1]) / n; w = (w * (n - 1) + l[i - 1]) / n
        up[i] = u; dn[i] = w
    with np.errstate(divide='ignore', invalid='ignore'):
        rsi = np.where(dn == 0, np.where(up == 0, 50.0, 100.0), np.where(up == 0, 0.0, 100 - 100 / (1 + up / dn)))
    rsi[:n] = np.nan
    return rsi, up, dn

def live_rsi(up_prev, dn_prev, delta, n=14):
    u = (up_prev * (n - 1) + max(delta, 0)) / n; w = (dn_prev * (n - 1) + max(-delta, 0)) / n
    if w == 0: return 50.0 if u == 0 else 100.0
    if u == 0: return 0.0
    return 100 - 100 / (1 + u / w)

def sma(x, n):
    out = np.full(len(x), np.nan)
    if len(x) >= n:
        c = np.convolve(x, np.ones(n) / n, 'valid'); out[n - 1:] = c
    return out

def parse(row):
    m = row['message']
    st = re.search(r'Strategy: (.*)', m); st = st.group(1).strip() if st else None
    num = lambda lab: (lambda mm: float(mm.group(1)) if mm else None)(re.search(lab + r':\s*%?([+-]?[\d.]+)', m))
    tfv = lambda lab: {a.lower(): float(b) for a, b in re.findall(r'(\d+[mhdw])\.([\d.]+)', (re.search('^' + lab + r':(.*)$', m, re.M) or [None, ''])[1])}
    return dict(id=row['id'], sym=row['symbol'], t=_ms(row['createdAt']), iso=row['createdAt'], st=st,
                dir='up' if m.startswith('🟢') else 'down', price=num('Current Price'), prev=num('Previous Price'),
                boost=num('Boost Value'), pivot=num('Pivot'), rsi=tfv('RSI'), srsi=tfv('SRSI'), msg=m)

def _ms(iso):
    import datetime
    return int(datetime.datetime.fromisoformat(iso.replace('Z', '+00:00')).timestamp() * 1000)

def load_refs(bot='div'):
    return [parse(json.loads(l)) for l in open(os.path.join(ROOT, 'ref', bot + '.jsonl')) if l.strip()]

class Series:
    """Closed-bar arrays for one symbol/tf plus RSI states."""
    def __init__(self, a):
        self.t = a[:, 0].astype('int64'); self.o = a[:, 1]; self.h = a[:, 2]; self.l = a[:, 3]; self.c = a[:, 4]
        self.rsi, self.up, self.dn = rma_states(self.c)
    def live_index(self, t, ms):
        i = np.searchsorted(self.t, t, side='right') - 1  # bar with openTime <= t
        if i < 0 or t >= self.t[i] + ms: return None
        return int(i)

_series = {}
def series(sym, tf):
    k = (sym, tf)
    if k not in _series:
        a = bars(sym, tf); _series[k] = Series(a) if a is not None and len(a) > 60 else None
    return _series[k]

def price_proxy(sym, t):
    """price at eval time t ~ close of the 15m bar containing t (leaks <15 min)."""
    s = series(sym, '15m')
    if s is None: return None
    i = s.live_index(t, 900_000)
    return None if i is None else float(s.c[i])
