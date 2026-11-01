'use strict';
// Trader Club "Mild Buy/Sell" (X marks): which rule hits exactly the observed X's? BREVUSDT 1m, UTC.
const I = require('../../lib/ind.cjs');
const RF = require('./rflib.cjs');
const { klinesAt } = require('../../lib/net.cjs');
const LAB = JSON.parse(process.argv[2] || '[["16:49","B"],["17:39","S"],["17:43","S"]]');
const W0 = Date.parse('2026-10-28T' + (process.argv[3] || '16:30') + ':00Z'), W1 = Date.parse('2026-10-28T' + (process.argv[4] || '17:47') + ':00Z');
const want = LAB.map(([hm, s]) => [Date.parse('2026-10-28T' + hm + ':00Z'), s]);
(async () => {
  const a = await klinesAt('BREVUSDT', '1m', W1 + 60e3, 1000);
  const bars = a.filter(b => b.openTime <= W1);
  const C = bars.map(b => b.close), hlc3 = bars.map(b => (b.high + b.low + b.close) / 3);
  const res = [];
  const score = (k, ev) => { // ev: array of [i, 'B'|'S']
    const fl = ev.filter(([i]) => bars[i].openTime >= W0).map(([i, s]) => [bars[i].openTime, s]);
    let hit = 0, exact = 0; for (const [t, s] of want) { if (fl.some(([ft, fs]) => fs === s && Math.abs(ft - t) <= 60e3)) hit++; if (fl.some(([ft, fs]) => fs === s && ft === t)) exact++; }
    res.push({ k, hit, exact, extra: fl.length - hit, fl });
  };
  const cross = (x, lvl, i) => (x[i - 1] <= lvl && x[i] > lvl) ? 1 : (x[i - 1] >= lvl && x[i] < lvl) ? -1 : 0;
  for (const src of ['close', 'hlc3']) for (let len = 5; len <= 21; len++) {
    const r = I.rsi(src === 'close' ? C : hlc3, len);
    for (let ob = 55; ob <= 85; ob += 5) {
      const os = 100 - ob; const e1 = [], e2 = [];
      for (let i = 1; i < bars.length; i++) {
        if (cross(r, os, i) === 1) e1.push([i, 'B']); if (cross(r, ob, i) === -1) e1.push([i, 'S']); // exit zone
        if (cross(r, os, i) === -1) e2.push([i, 'B']); if (cross(r, ob, i) === 1) e2.push([i, 'S']); // enter zone
      }
      score(`rsi(${src},${len}) exit ${ob}/${os}`, e1); score(`rsi(${src},${len}) enter ${ob}/${os}`, e2);
    }
  }
  for (const [l1, l2] of [[14, 14], [7, 14], [14, 7], [9, 9], [21, 14]]) for (const sm of [3, 5]) {
    const s = I.stochRsi(C, l1, l2, sm, sm);
    for (const ob of [70, 75, 80, 85, 90]) { const e = []; for (let i = 1; i < bars.length; i++) { const c = I.crossAt(s.k, s.d, i); if (c === 1 && s.k[i - 1] < 100 - ob) e.push([i, 'B']); if (c === -1 && s.k[i - 1] > ob) e.push([i, 'S']); } score(`srsi(${l1},${l2},${sm}) ${ob}`, e); }
  }
  for (let n1 = 4; n1 <= 16; n1++) for (let n2 = 6; n2 <= 24; n2++) for (const ns of [2, 3, 4, 5]) {
    const wt = I.waveTrend(bars, n1, n2, ns, 'first');
    for (const L of [0, 20, 30, 40, 47, 53, 60, 70]) { const e = []; for (let i = 1; i < bars.length; i++) { const c = I.crossAt(wt.wt1, wt.wt2, i); if (c === 1 && wt.wt2[i] < -L) e.push([i, 'B']); if (c === -1 && wt.wt2[i] > L) e.push([i, 'S']); } score(`wt(${n1},${n2},${ns}) ±${L}`, e); }
  }
  for (const [sn, s] of [['hlc3', hlc3], ['close', C]]) for (let per = 3; per <= 60; per++) for (let m = 0.3; m <= 4.01; m += 0.1) {
    const { sig } = RF.rangeFilter(s, per, m); const e = []; sig.forEach((v, i) => v && e.push([i, v])); score(`rf(${sn},${per},${m.toFixed(1)})`, e);
  }
  for (const f of [3, 5, 7, 9]) for (const sl of [8, 13, 21, 34]) if (f < sl) for (const [mn, fn] of [['ema', I.ema], ['sma', I.sma]]) {
    const a1 = fn(C, f), a2 = fn(C, sl), e = []; for (let i = 1; i < bars.length; i++) { const c = I.crossAt(a1, a2, i); if (c) e.push([i, c > 0 ? 'B' : 'S']); } score(`${mn}${f}x${sl}`, e);
  }
  res.sort((x, y) => (y.hit * 3 + y.exact - y.extra * 2) - (x.hit * 3 + x.exact - x.extra * 2));
  for (const r of res.slice(0, 25)) console.log(`${r.hit}/${want.length} exact ${r.exact} extra ${r.extra}`, r.k, '|', r.fl.map(([t, s]) => new Date(t).toISOString().slice(11, 16) + s).join(' '));
})();
