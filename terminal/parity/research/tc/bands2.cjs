'use strict';
// Fit Trader Club Reversal Bands width on several hovered bars: centre = SMA(ohlc4,30); U1 = c + 3w, step = w.
const I = require('../../lib/ind.cjs');
const { klinesAt } = require('../../lib/net.cjs');
const SYM = 'EVAAUSDT';
// bar open time (UTC), live price if the bar was live, U1, L1
const S = [
  { bar: '2026-10-27T18:40:00Z', live: 0.8085, U1: 0.8335, L1: 0.6932 },
  { bar: '2026-10-27T14:00:00Z', live: null, U1: 0.5948, L1: 0.5079 },
  ...JSON.parse(process.argv[2] || '[]')
];
const wma = (a, n) => a.map((_, i) => { if (i < n - 1) return NaN; let s = 0, w = 0; for (let k = 0; k < n; k++) { s += a[i - k] * (n - k); w += n - k; } return s / w; });
const stdev = (a, n) => a.map((_, i) => { if (i < n - 1) return NaN; const x = a.slice(i - n + 1, i + 1), m = x.reduce((s, v) => s + v, 0) / n; return Math.sqrt(x.reduce((s, v) => s + (v - m) ** 2, 0) / n); });
const dev = (a, n) => a.map((_, i) => { if (i < n - 1) return NaN; const x = a.slice(i - n + 1, i + 1), m = x.reduce((s, v) => s + v, 0) / n; return x.reduce((s, v) => s + Math.abs(v - m), 0) / n; });
(async () => {
  const cache = {};
  const score = new Map(), cen = new Map();
  for (const s of S) {
    const t = Date.parse(s.bar); const sym = s.sym || SYM, tf = s.tf || '5m';
    const all = cache[sym + tf] || (cache[sym + tf] = await klinesAt(sym, tf, Date.parse('2026-10-27T19:30:00Z'), 1000));
    let bars = all.filter(b => b.openTime <= t);
    if (s.live) { const l = bars.at(-1); bars = [...bars.slice(0, -1), { ...l, close: s.live }]; }
    const n = bars.length - 1, c = (s.U1 + s.L1) / 2, w = (s.U1 - c) / 3;
    const src = { close: bars.map(b => b.close), hl2: bars.map(b => (b.high + b.low) / 2), hlc3: bars.map(b => (b.high + b.low + b.close) / 3), ohlc4: bars.map(b => (b.open + b.high + b.low + b.close) / 4) };
    for (const [sn, x] of Object.entries(src)) for (const len of [20, 30, 50]) for (const off of [0, 1]) for (const [mn, f] of Object.entries({ sma: I.sma, ema: I.ema, rma: I.rma, wma })) {
      const k = `${mn}(${sn},${len})[${off}]`; const e = Math.abs(f(x, len)[n - off] / c - 1); cen.set(k, (cen.get(k) || 0) + e);
    }
    const tr = bars.map((b, i) => i ? Math.max(b.high - b.low, Math.abs(b.high - bars[i - 1].close), Math.abs(b.low - bars[i - 1].close)) : b.high - b.low);
    const ser = { tr, hl: bars.map(b => b.high - b.low), absd: src.ohlc4.map((v, i) => i ? Math.abs(v - src.ohlc4[i - 1]) : 0), absc: src.close.map((v, i) => i ? Math.abs(v - src.close[i - 1]) : 0), co: bars.map(b => Math.abs(b.close - b.open)) };
    for (const off of [0, 1]) for (let len = 5; len <= 150; len++) { const hh = Math.max(...bars.slice(n - off - len + 1, n - off + 1).map(b => b.high)), ll = Math.min(...bars.slice(n - off - len + 1, n - off + 1).map(b => b.low)); const k = `range(${len})[${off}]`; (score.get(k) || score.set(k, []).get(k)).push(w / (hh - ll)); }
    for (const off of [0, 1]) {
      for (const [sn, x] of Object.entries(ser)) for (let len = 5; len <= 150; len++) for (const [mn, f] of Object.entries({ sma: I.sma, ema: I.ema, rma: I.rma, wma })) {
        const v = f(x, len)[n - off]; const k = `${mn}(${sn},${len})[${off}]`; (score.get(k) || score.set(k, []).get(k)).push(w / v);
      }
      for (const [sn, x] of Object.entries(src)) for (let len = 5; len <= 150; len++) for (const [fn, f] of Object.entries({ stdev, dev })) {
        const v = f(x, len)[n - off]; const k = `${fn}(${sn},${len})[${off}]`; (score.get(k) || score.set(k, []).get(k)).push(w / v);
      }
    }
    console.log(s.bar, 'centre', c.toFixed(5), 'w', w.toFixed(5));
  }
  console.log('centre best:', [...cen].sort((a, b) => a[1] - b[1]).slice(0, 5).map(([k, v]) => `${k} ${(v / S.length).toFixed(4)}`).join(' | '));
  // ratio consistency: w / feature should be constant across samples
  console.log('width best:'); const sp = a => Math.max(...a) / Math.min(...a) - 1; for (const [k, v] of [...score].filter(([, a]) => a.every(Number.isFinite)).sort((a, b) => sp(a[1]) - sp(b[1])).slice(0, 15)) console.log('  ', sp(v).toFixed(4), k, 'ratio', v.map(x => x.toFixed(4)).join(' '));
})();
