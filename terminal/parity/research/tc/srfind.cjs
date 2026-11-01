'use strict';
// Which price structures equal the Trader Club S/R levels seen on screen? node research/tc/srfind.cjs EVAAUSDT 0.7628 0.5269
const { klinesAt } = require('../../lib/net.cjs');
const [sym, ...lv] = process.argv.slice(2); const levels = lv.map(Number);
const t = Date.now();
(async () => {
  const hits = [];
  const near = (v, what) => { for (const L of levels) if (Math.abs(v / L - 1) < 0.0007) hits.push(`${L} ≈ ${v} : ${what}`); };
  for (const tf of ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '12h', '1d', '3d', '1w']) {
    let b; try { b = await klinesAt(sym, tf, t, 1000); } catch (e) { continue; }
    b = b.filter(x => x.openTime <= t);
    b.forEach((x, i) => { const ago = b.length - 1 - i; for (const k of ['open', 'high', 'low', 'close']) near(x[k], `${tf} ${k} of bar ${ago} ago (${new Date(x.openTime).toISOString().slice(0, 16)})`); });
    // pivots
    for (const [L, R] of [[2, 2], [3, 3], [5, 5], [10, 10], [20, 20]]) {
      for (let i = L; i < b.length - R; i++) {
        const w = b.slice(i - L, i + R + 1);
        if (w.every(x => x.high <= b[i].high)) near(b[i].high, `${tf} pivotHigh(${L},${R}) ${new Date(b[i].openTime).toISOString().slice(0, 16)}`);
        if (w.every(x => x.low >= b[i].low)) near(b[i].low, `${tf} pivotLow(${L},${R}) ${new Date(b[i].openTime).toISOString().slice(0, 16)}`);
      }
    }
  }
  console.log([...new Set(hits)].join('\n') || 'no hits');
})();
