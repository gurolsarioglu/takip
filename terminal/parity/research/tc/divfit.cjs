'use strict';
// Trader Club Divergence ▲▼: RSI pivot divergence? Grid over observed windows (BREVUSDT 1m, UTC).
const I = require('../../lib/ind.cjs');
const { klinesAt } = require('../../lib/net.cjs');
const WIN = JSON.parse(process.argv[2] || 'null') || [
  { d: '2026-10-28', w0: '14:56', w1: '18:01', lab: [['17:59', 'S']] },
  { d: '2026-10-27', w0: '16:44', w1: '18:32', lab: [['16:47', 'S'], ['18:25', 'B']] },
];
const P = (d, hm) => Date.parse(`${d}T${hm}:00Z`);
const piv = (x, i, L, R, hi) => { const v = x[i]; if (!Number.isFinite(v)) return false; for (let k = i - L; k <= i + R; k++) { if (k === i) continue; if (!Number.isFinite(x[k])) return false; if (hi ? x[k] >= v : x[k] <= v) return false; } return true; };
(async () => {
  const data = [];
  for (const w of WIN) { const b = (await klinesAt('BREVUSDT', '1m', P(w.d, w.w1) + 60e3, 1000)).filter(x => x.openTime <= P(w.d, w.w1)); data.push({ w, b }); }
  const res = [];
  for (const len of [7, 9, 10, 12, 14, 21]) for (const on of ['rsi', 'price']) for (let L = 1; L <= 10; L++) for (let R = 1; R <= 8; R++) for (const rmax of [30, 60, 100]) for (const at of ['pivot', 'confirm']) for (const pc of ['hl', 'close']) {
    let hit = 0, exact = 0, extra = 0, tot = 0; const fls = [];
    for (const { w, b } of data) {
      const C = b.map(x => x.close), r = I.rsi(C, len), H = pc === 'hl' ? b.map(x => x.high) : C, Lo = pc === 'hl' ? b.map(x => x.low) : C;
      const fl = []; let lastH = -1, lastL = -1;
      for (let j = R; j < b.length; j++) {
        const p = j - R; // pivot candidate confirmed at j
        for (const hi of [true, false]) {
          const isP = on === 'rsi' ? piv(r, p, L, R, hi) : piv(hi ? H : Lo, p, L, R, hi); if (!isP) continue;
          const prev = hi ? lastH : lastL;
          if (prev >= 0 && p - prev >= 2 && p - prev <= rmax) {
            const bear = hi && r[p] < r[prev] && H[p] > H[prev], bull = !hi && r[p] > r[prev] && Lo[p] < Lo[prev];
            const bi = at === 'pivot' ? p : j;
            if ((bear || bull) && b[bi].openTime >= P(w.d, w.w0)) fl.push([b[bi].openTime, bear ? 'S' : 'B']);
          }
          if (hi) lastH = p; else lastL = p;
        }
      }
      let h = 0; for (const [hm, s] of w.lab) { const t = P(w.d, hm); tot++; if (fl.some(([ft, fs]) => fs === s && Math.abs(ft - t) <= 60e3)) h++; if (fl.some(([ft, fs]) => fs === s && ft === t)) exact++; }
      hit += h; extra += fl.length - h; fls.push(fl.map(([t, s]) => new Date(t).toISOString().slice(11, 16) + s).join(' '));
    }
    res.push({ k: `rsi${len} piv-on-${on} L${L} R${R} max${rmax} at-${at} ${pc}`, hit, exact, extra, tot, fls });
  }
  res.sort((x, y) => (y.hit * 3 + y.exact - y.extra * 2) - (x.hit * 3 + x.exact - x.extra * 2));
  for (const r of res.slice(0, 30)) console.log(`${r.hit}/${r.tot} exact ${r.exact} extra ${r.extra}`, r.k, '|', r.fls.join(' || '));
})();
