'use strict';
// Trader Club "Ribbon" (smoothing 5/8): which MAs reproduce the two blue legend values across samples? (BREVUSDT 1m, UTC)
const I = require('../../lib/ind.cjs');
const { klinesAt } = require('../../lib/net.cjs');
const S = [['2026-10-28T17:20:00Z', 0.08262, 0.08260], ['2026-10-28T16:45:00Z', 0.08271, 0.08277], ...JSON.parse(process.argv[2] || '[]')];
const wma = (a, n) => a.map((_, i) => { if (i < n - 1) return NaN; let s = 0, w = 0; for (let k = 0; k < n; k++) { s += a[i - k] * (n - k); w += n - k; } return s / w; });
const hma = (a, n) => { const w2 = wma(a, Math.floor(n / 2)), wn = wma(a, n); return wma(w2.map((v, i) => 2 * v - wn[i]), Math.round(Math.sqrt(n))); };
const dema = (a, n) => { const e = I.ema(a, n), ee = I.ema(e, n); return e.map((v, i) => 2 * v - ee[i]); };
const F = { sma: I.sma, ema: I.ema, rma: I.rma, wma, hma, dema, ema2: (a, n) => I.ema(I.ema(a, n), n), sma2: (a, n) => I.sma(I.sma(a, n), n) };
(async () => {
  const all = await klinesAt('BREVUSDT', '1m', Date.parse('2026-10-28T17:45:00Z'), 900);
  const err = new Map();
  for (const [ts, a, b] of S) {
    const t = Date.parse(ts), bars = all.filter(x => x.openTime <= t), n = bars.length - 1;
    console.log(ts, 'bar', new Date(bars[n].openTime).toISOString().slice(11, 16), 'O', bars[n].open, 'H', bars[n].high, 'L', bars[n].low, 'C', bars[n].close);
    const src = { close: bars.map(x => x.close), open: bars.map(x => x.open), hl2: bars.map(x => (x.high + x.low) / 2), hlc3: bars.map(x => (x.high + x.low + x.close) / 3), ohlc4: bars.map(x => (x.open + x.high + x.low + x.close) / 4) };
    for (const [sn, x] of Object.entries(src)) for (const [fn, f] of Object.entries(F)) for (let len = 2; len <= 30; len++) for (const off of [0, 1]) {
      const v = f(x, len)[n - off];
      for (const [li, tg] of [['A', a], ['B', b]]) { const k = `${li} ${fn}(${sn},${len})[${off}]`; err.set(k, Math.max(err.get(k) || 0, Math.abs(v - tg))); }
    }
  }
  for (const li of ['A', 'B']) { console.log('== line', li); for (const [k, e] of [...err].filter(([k]) => k.startsWith(li)).sort((x, y) => x[1] - y[1]).slice(0, 15)) console.log(e.toFixed(6), k); }
})();
