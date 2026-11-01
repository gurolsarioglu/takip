'use strict';
// Trader Club Buy/Sell = Range Filter? Fit period/multiplier on BREVUSDT 1m labels (UTC).
const I = require('../../lib/ind.cjs');
const { klinesAt } = require('../../lib/net.cjs');
const LABELS = [['16:50', 'S'], ['17:06', 'B'], ['17:39', 'S'], ['17:52', 'B'], ['17:56', 'S'], ['18:05', 'B'], ['18:15', 'S']];
const FROM = Date.parse('2026-10-27T16:45:00Z'), TO = Date.parse('2026-10-27T18:25:00Z');
function rangeFilter(src, per, mult) {
  const d = src.map((v, i) => (i ? Math.abs(v - src[i - 1]) : 0));
  const avrng = I.ema(d, per), smrng = I.ema(avrng, per * 2 - 1).map(v => v * mult);
  const filt = new Array(src.length).fill(NaN);
  for (let i = 0; i < src.length; i++) {
    const p = i ? filt[i - 1] : src[i], r = smrng[i], x = src[i];
    if (!Number.isFinite(r)) { filt[i] = x; continue; }
    filt[i] = x > p ? (x - r < p ? p : x - r) : (x + r > p ? p : x + r);
  }
  // signals with state (CondIni)
  let up = 0, dn = 0, cond = 0; const sig = new Array(src.length).fill(null);
  for (let i = 1; i < src.length; i++) {
    up = filt[i] > filt[i - 1] ? up + 1 : filt[i] < filt[i - 1] ? 0 : up;
    dn = filt[i] < filt[i - 1] ? dn + 1 : filt[i] > filt[i - 1] ? 0 : dn;
    const L = (src[i] > filt[i] && src[i] > src[i - 1] && up > 0) || (src[i] > filt[i] && src[i] < src[i - 1] && up > 0);
    const S = (src[i] < filt[i] && src[i] < src[i - 1] && dn > 0) || (src[i] < filt[i] && src[i] > src[i - 1] && dn > 0);
    const prev = cond; cond = L ? 1 : S ? -1 : cond;
    if (L && prev === -1) sig[i] = 'B'; if (S && prev === 1) sig[i] = 'S';
  }
  return { filt, sig };
}
(async () => {
  const bars = (await klinesAt('BREVUSDT', '1m', TO + 60e3, 1500)).filter(b => b.openTime <= TO);
  const want = LABELS.map(([hm, s]) => [Date.parse('2026-10-27T' + hm + ':00Z'), s]);
  const srcs = { close: bars.map(b => b.close), hl2: bars.map(b => (b.high + b.low) / 2), ohlc4: bars.map(b => (b.open + b.high + b.low + b.close) / 4), hlc3: bars.map(b => (b.high + b.low + b.close) / 3) };
  const res = [];
  for (const [sn, src] of Object.entries(srcs)) for (let per = 3; per <= 120; per++) for (const mult of [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6]) {
    const { filt, sig } = rangeFilter(src, per, mult);
    const flips = []; for (let i = 0; i < bars.length; i++) if (sig[i] && bars[i].openTime >= FROM) flips.push([bars[i].openTime, sig[i], filt[i]]);
    let hit = 0; for (const [t, s] of want) if (flips.some(([ft, fs]) => fs === s && Math.abs(ft - t) <= 60e3)) hit++;
    res.push({ k: `${sn} per${per} m${mult}`, hit, extra: flips.length - hit, flips });
  }
  res.sort((a, b) => (b.hit * 2 - b.extra) - (a.hit * 2 - a.extra));
  for (const r of res.slice(0, 12)) console.log(r.hit + '/7 extra', r.extra, r.k, '|', r.flips.map(([t, s, f]) => new Date(t).toISOString().slice(11, 16) + s + '(' + f.toFixed(5) + ')').join(' '));
})();
