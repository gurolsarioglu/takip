'use strict';
// Re-fit Trader Club Buy/Sell (Range Filter family) on BREV 1m + BULLA 5m labels read from original-only screens (TR times -> UTC).
const RF = require('./rflib.cjs');
const I = require('../../lib/ind.cjs');
const { klinesAt } = require('../../lib/net.cjs');
const tr = (d, hm) => Date.parse(`${d}T${hm}:00+03:00`);
const SETS = [
  { sym: 'BREVUSDT', tf: '1m', w0: tr('2026-10-28', '15:47'), w1: tr('2026-10-28', '21:14'), tol: 60e3,
    lab: [['15:55', 'B'], ['16:05', 'S'], ['16:51', 'B'], ['17:46', 'S'], ['17:48', 'B'], ['17:59', 'S'], ['19:01', 'B'], ['19:04', 'S'], ['19:54', 'B'], ['20:22', 'S'], ['20:34', 'B'], ['21:13', 'S']].map(([h, s]) => [tr('2026-10-28', h), s]) },
  { sym: 'BULLAUSDT', tf: '5m', w0: tr('2026-10-27', '14:05'), w1: tr('2026-10-28', '19:10'), tol: 300e3,
    lab: [['27', '14:20', 'B'], ['27', '14:40', 'S'], ['27', '16:05', 'B'], ['27', '19:05', 'B'], ['27', '19:55', 'S'], ['27', '21:40', 'B'], ['28', '05:35', 'S'], ['28', '06:15', 'B'], ['28', '06:55', 'S'], ['28', '07:45', 'B'], ['28', '08:15', 'S'], ['28', '10:55', 'B'], ['28', '13:15', 'S'], ['28', '17:35', 'B'], ['28', '18:10', 'S']].map(([d, h, s]) => [tr('2026-10-' + d, h), s]) },
];
(async () => {
  for (const S of SETS) { const ms = S.tf === '1m' ? 60e3 : 300e3; let a = await klinesAt(S.sym, S.tf, S.w1, 1500); const b = await klinesAt(S.sym, S.tf, a[0].openTime - 1, 1500); S.bars = [...b.filter(x => x.openTime < a[0].openTime), ...a].filter(x => x.openTime <= S.w1); }
  const res = [];
  const srcs = { hlc3: b => (b.high + b.low + b.close) / 3, close: b => b.close, ohlc4: b => (b.open + b.high + b.low + b.close) / 4, hl2: b => (b.high + b.low) / 2 };
  for (const [sn, f] of Object.entries(srcs)) for (let per = 20; per <= 120; per += (per < 60 ? 1 : 5)) for (let m = 1.5; m <= 3.01; m += 0.05) {
    let hit = 0, extra = 0, tot = 0; const out = [];
    for (const S of SETS) {
      const src = S.bars.map(f); const { sig } = RF.rangeFilter(src, per, m);
      const fl = []; sig.forEach((s, i) => { if (s && S.bars[i].openTime >= S.w0) fl.push([S.bars[i].openTime, s]); });
      let h = 0; for (const [t, s] of S.lab) { tot++; if (fl.some(([ft, fs]) => fs === s && Math.abs(ft - t) <= S.tol)) h++; }
      hit += h; extra += fl.length - h; out.push(fl.length);
    }
    res.push({ k: `${sn} per${per} m${m.toFixed(2)}`, hit, tot, extra });
  }
  res.sort((a, b) => (b.hit * 2 - b.extra) - (a.hit * 2 - a.extra));
  for (const r of res.slice(0, 25)) console.log(`${r.hit}/${r.tot} extra ${r.extra}`, r.k);
  for (const k of ['hlc3 per50 m2.20']) { const r = res.find(x => x.k === k); console.log('REF', `${r.hit}/${r.tot} extra ${r.extra}`, k); }
})();
