'use strict';
// Mild X = WaveTrend cross in zone? Grid over several observed windows (BREVUSDT 1m, UTC).
const I = require('../../lib/ind.cjs');
const { klinesAt } = require('../../lib/net.cjs');
const WIN = [
  { d: '2026-10-28', w0: '12:46', w1: '18:12', lab: [['13:02', 'S'], ['13:22', 'B'], ['13:55', 'S'], ['14:09', 'S'], ['14:19', 'S'], ['14:37', 'S'], ['14:53', 'S'], ['14:57', 'S'], ['15:38', 'B'], ['15:51', 'B'], ['16:27', 'B'], ['16:49', 'B'], ['17:39', 'S'], ['17:43', 'S'], ['18:06', 'S']] },
  { d: '2026-10-27', w0: '16:51', w1: '18:32', lab: [['17:22', 'S'], ['17:49', 'B'], ['18:24', 'B']] },
];
const P = (d, hm) => Date.parse(`${d}T${hm}:00Z`);
(async () => {
  const data = [];
  for (const w of WIN) { const b = (await klinesAt('BREVUSDT', '1m', P(w.d, w.w1) + 60e3, 1000)).filter(x => x.openTime <= P(w.d, w.w1)); data.push({ w, b }); }
  const res = [];
  for (let n1 = 3; n1 <= 21; n1++) for (let n2 = 5; n2 <= 30; n2++) for (const ns of [2, 3, 4, 5, 6]) for (const L of [0, 10, 20, 30, 40, 47, 53, 60, 70, 80]) for (const zm of ['wt2', 'wt1', 'prev']) {
    let hit = 0, exact = 0, extra = 0, tot = 0; const fls = [];
    for (const { w, b } of data) {
      const wt = I.waveTrend(b, n1, n2, ns, 'first'); const fl = [];
      for (let i = 1; i < b.length; i++) {
        if (b[i].openTime < P(w.d, w.w0)) continue;
        const c = I.crossAt(wt.wt1, wt.wt2, i); if (!c) continue;
        const z = zm === 'wt2' ? wt.wt2[i] : zm === 'wt1' ? wt.wt1[i] : wt.wt1[i - 1];
        if (c === 1 && z < -L) fl.push([b[i].openTime, 'B']); if (c === -1 && z > L) fl.push([b[i].openTime, 'S']);
      }
      let h = 0; for (const [hm, s] of w.lab) { const t = P(w.d, hm); tot++; if (fl.some(([ft, fs]) => fs === s && Math.abs(ft - t) <= 60e3)) h++; if (fl.some(([ft, fs]) => fs === s && ft === t)) exact++; }
      hit += h; extra += fl.length - h; fls.push(fl.map(([t, s]) => new Date(t).toISOString().slice(11, 16) + s).join(' '));
    }
    res.push({ k: `wt(${n1},${n2},${ns}) ±${L} ${zm}`, hit, exact, extra, tot, fls });
  }
  res.sort((x, y) => (y.hit * 3 + y.exact - y.extra * 2) - (x.hit * 3 + x.exact - x.extra * 2));
  for (const r of res.slice(0, 30)) console.log(`${r.hit}/${r.tot} exact ${r.exact} extra ${r.extra}`, r.k, '|', r.fls.join(' || '));
  for (const k of ['wt(10,21,4) ±53 wt2', 'wt(9,12,3) ±53 wt2', 'wt(10,11,4) ±53 wt2', 'wt(4,14,5) ±30 wt2']) { const r = res.find(x => x.k === k); console.log('REF', `${r.hit}/${r.tot} exact ${r.exact} extra ${r.extra}`, k, '|', r.fls.join(' || ')); }
})();
