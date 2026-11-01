'use strict';
// Trader Club BUY-SELL "Reversal Bands" (Length 30): find centre/width formula.
// Screen (EVAAUSDT 5m, live bar 18:40 UTC, price 0.8085): U1..U4 0.8335 0.8569 0.8803 0.9036, L1..L4 0.6932 0.6698 0.6464 0.6230
// ribbon? 0.8036 0.7960. node research/tc/bands.cjs
const I = require('../../lib/ind.cjs');
const { klinesAt } = require('../../lib/net.cjs');
const SYM = 'EVAAUSDT', T = Date.parse('2026-10-27T18:40:42Z'), PRICE = 0.8085;
const U = [0.8335, 0.8569, 0.8803, 0.9036], L = [0.6932, 0.6698, 0.6464, 0.6230], RIB = [0.8036, 0.7960];
const wma = (a, n) => a.map((_, i) => { if (i < n - 1) return NaN; let s = 0, w = 0; for (let k = 0; k < n; k++) { s += a[i - k] * (n - k); w += n - k; } return s / w; });
const stdev = (a, n) => a.map((_, i) => { if (i < n - 1) return NaN; const x = a.slice(i - n + 1, i + 1), m = x.reduce((s, v) => s + v, 0) / n; return Math.sqrt(x.reduce((s, v) => s + (v - m) ** 2, 0) / n); });
(async () => {
  const k = await klinesAt(SYM, '5m', T, 600);
  const closed = k.filter(b => b.closeTime < T), live = k.find(b => b.openTime <= T && b.closeTime >= T);
  for (const variant of ['live', 'closed']) {
    const bars = variant === 'live' ? [...closed, { ...live, close: PRICE, high: Math.max(live.high, PRICE), low: Math.min(live.low, PRICE) }] : closed;
    const n = bars.length - 1;
    const src = { close: bars.map(b => b.close), hl2: bars.map(b => (b.high + b.low) / 2), hlc3: bars.map(b => (b.high + b.low + b.close) / 3), ohlc4: bars.map(b => (b.open + b.high + b.low + b.close) / 4) };
    const tr = bars.map((b, i) => i ? Math.max(b.high - b.low, Math.abs(b.high - bars[i - 1].close), Math.abs(b.low - bars[i - 1].close)) : b.high - b.low);
    const centre = (U[0] + L[0]) / 2, step = (U[1] - U[0] + L[0] - L[1]) / 2;
    console.log(variant, 'target centre', centre.toFixed(5), 'step', step.toFixed(5), 'U1-c / step', ((U[0] - centre) / step).toFixed(3));
    const out = [];
    for (const [sn, s] of Object.entries(src)) for (const len of [10, 14, 20, 21, 30, 50]) {
      const ma = { sma: I.sma(s, len), ema: I.ema(s, len), rma: I.rma(s, len), wma: wma(s, len) };
      for (const [mn, m] of Object.entries(ma)) { const v = m[n]; out.push({ e: Math.abs(v / centre - 1), what: `centre ${mn}(${sn},${len})=${v.toFixed(5)}` }); for (const r of RIB) out.push({ e: Math.abs(v / r - 1), what: `ribbon ${r} ~ ${mn}(${sn},${len})=${v.toFixed(5)}` }); }
    }
    for (const len of [10, 14, 20, 30, 50]) {
      for (const [an, a] of Object.entries({ atrRma: I.rma(tr, len), atrSma: I.sma(tr, len), atrEma: I.ema(tr, len), stdC: stdev(src.close, len), rangeSma: I.sma(bars.map(b => b.high - b.low), len) }))
        if (variant === 'live') console.log('   width', an, len, a[n].toFixed(5), 'U1-c/w', ((U[0] - centre) / a[n]).toFixed(3), 'step/w', (step / a[n]).toFixed(3));
    }
    if (variant === 'live') {
      const ser = { tr, hl: bars.map(b => b.high - b.low), co: bars.map(b => Math.abs(b.close - b.open)), dev4: src.ohlc4.map((v, i) => Math.abs(v - (I.sma(src.ohlc4, 30)[i]))) };
      const res = [];
      for (const [sn, x] of Object.entries(ser)) for (let len = 5; len <= 120; len++) for (const [mn, f] of Object.entries({ sma: I.sma, ema: I.ema, rma: I.rma, wma }))
        { const v = f(x, len)[n]; for (const m of [0.5, 1, 1.5, 2, 2.5, 3, 4, 6]) res.push({ e: Math.abs(v * m / (U[0] - centre) - 1), w: `${mn}(${sn},${len})=${v.toFixed(5)} *${m} = U1-c` }); }
      for (const [sn, x] of Object.entries({ close: src.close, ohlc4: src.ohlc4, hlc3: src.hlc3 })) for (let len = 5; len <= 120; len++) { const v = stdev(x, len)[n]; for (const m of [0.5, 1, 1.5, 2, 2.5, 3, 4]) res.push({ e: Math.abs(v * m / (U[0] - centre) - 1), w: `stdev(${sn},${len})=${v.toFixed(5)} *${m} = U1-c` }); }
      res.sort((a, b) => a.e - b.e); for (const r of res.slice(0, 15)) console.log('   W', r.e.toFixed(4), r.w);
    }
    out.sort((x, y) => x.e - y.e);
    for (const o of out.slice(0, 14)) console.log(' ', o.e.toFixed(4), o.what);
  }
})();
