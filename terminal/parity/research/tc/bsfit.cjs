'use strict';
// Fit Trader Club BUY-SELL Buy/Sell labels (Sensitivity 3) with SuperTrend-family flips.
// Labels read from TradingView (local UTC+3 -> UTC here).
const I = require('../../lib/ind.cjs');
const { klinesAt } = require('../../lib/net.cjs');
const CASES = [
  { sym: 'BREVUSDT', tf: '1m', from: '2026-10-27T16:45:00Z', to: '2026-10-27T18:20:00Z',
    labels: [['16:50', 'S'], ['17:06', 'B'], ['17:39', 'S'], ['17:52', 'B'], ['17:56', 'S'], ['18:05', 'B'], ['18:15', 'S']] }
];
const atr = (bars, n, kind) => { const tr = bars.map((b, i) => i ? Math.max(b.high - b.low, Math.abs(b.high - bars[i - 1].close), Math.abs(b.low - bars[i - 1].close)) : b.high - b.low); return kind === 'sma' ? I.sma(tr, n) : I.rma(tr, n); };
function supertrend(bars, src, len, f, kind) {
  const a = atr(bars, len, kind), n = bars.length, dir = new Array(n).fill(0);
  let up = NaN, dn = NaN, d = 1;
  for (let i = 0; i < n; i++) {
    if (!Number.isFinite(a[i])) continue;
    const s = src[i], u = s - f * a[i], l = s + f * a[i];
    const pc = bars[i - 1] ? bars[i - 1].close : bars[i].close;
    up = Number.isFinite(up) && pc > up ? Math.max(u, up) : u;
    dn = Number.isFinite(dn) && pc < dn ? Math.min(l, dn) : l;
    if (d === -1 && bars[i].close > dn) d = 1; else if (d === 1 && bars[i].close < up) d = -1;
    // recompute bands for the new direction (standard ST behaviour already handled by trailing)
    dir[i] = d;
  }
  return dir;
}
(async () => {
  const res = [];
  for (const c of CASES) {
    const bars = (await klinesAt(c.sym, c.tf, Date.parse(c.to) + 60e3, 600)).filter(b => b.openTime <= Date.parse(c.to));
    const want = new Map(c.labels.map(([hm, s]) => [Date.parse(c.from.slice(0, 11) + hm + ':00Z'), s]));
    const srcs = { close: bars.map(b => b.close), hl2: bars.map(b => (b.high + b.low) / 2), ohlc4: bars.map(b => (b.open + b.high + b.low + b.close) / 4), ema5: I.ema(bars.map(b => b.close), 5), ema8: I.ema(bars.map(b => b.close), 8) };
    for (const [sn, src] of Object.entries(srcs)) for (const len of [5, 7, 10, 11, 14, 20]) for (const f of [1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6]) for (const kind of ['rma', 'sma']) {
      const dir = supertrend(bars, src, len, f, kind);
      const flips = [];
      for (let i = 1; i < bars.length; i++) if (dir[i] !== dir[i - 1] && dir[i - 1] !== 0 && bars[i].openTime >= Date.parse(c.from)) flips.push([bars[i].openTime, dir[i] === 1 ? 'B' : 'S']);
      let hit = 0; for (const [t, s] of want) if (flips.some(([ft, fs]) => fs === s && Math.abs(ft - t) <= 60e3)) hit++;
      const extra = flips.length - hit;
      res.push({ k: `${sn} len${len} f${f} ${kind}`, hit, extra, n: want.size, flips: flips.map(([t, s]) => new Date(t).toISOString().slice(11, 16) + s).join(' ') });
    }
  }
  res.sort((a, b) => (b.hit - b.extra) - (a.hit - a.extra));
  for (const r of res.slice(0, 12)) console.log(r.hit + '/' + r.n, 'extra', r.extra, r.k, '|', r.flips);
})();
