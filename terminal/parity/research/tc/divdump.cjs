'use strict';
const I = require('../../lib/ind.cjs');
const { klinesAt } = require('../../lib/net.cjs');
const SPOTS = [['2026-10-28T13:24', 'B'], ['2026-10-28T13:47', 'B'], ['2026-10-28T17:59', 'S'], ['2026-10-27T16:47', 'S'], ['2026-10-27T18:25', 'B']];
(async () => {
  for (const [s, d] of SPOTS) {
    const t = Date.parse(s + ':00Z'); const b = (await klinesAt('BREVUSDT', '1m', t + 3 * 60e3, 400)).filter(x => x.openTime <= t + 2 * 60e3);
    const C = b.map(x => x.close), r = I.rsi(C, 14), st = I.stochRsi(C), wt = I.waveTrend(b, 10, 21, 4);
    console.log('==', s, d);
    for (let i = b.length - 30; i < b.length; i++) console.log(new Date(b[i].openTime).toISOString().slice(11, 16), b[i].open, b[i].high, b[i].low, b[i].close, 'rsi', r[i].toFixed(1), 'k', st.k[i].toFixed(0), 'd', st.d[i].toFixed(0), 'wt', wt.wt1[i].toFixed(0), wt.wt2[i].toFixed(0), b[i].openTime === t ? '<<<' : '');
  }
})();
