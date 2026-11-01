'use strict';
// Check Range Filter (hlc3) flips on other charts vs screenshot labels / entries.
const I = require('../../lib/ind.cjs');
const { klinesAt } = require('../../lib/net.cjs');
const RF = require('./rflib.cjs');
const CASES = [
  { sym: 'EVAAUSDT', tf: '5m', from: '2026-10-27T05:00:00Z', to: '2026-10-27T18:40:00Z', note: 'screenshot (local-3h): S~09:10 B~10:20 S~14:00 B~14:15 S~15:10 B~16:00 entry 0.6998' },
  { sym: 'BREVUSDT', tf: '5m', from: '2026-10-27T12:30:00Z', to: '2026-10-27T18:55:00Z', note: 'screenshot: last Sell ~17:40Z entry 0.09425; several B/S between 13:00-17:00' },
  { sym: 'BREVUSDT', tf: '1m', from: '2026-10-27T16:45:00Z', to: '2026-10-27T19:05:00Z', note: '7 labels + later Sell entry 0.08793' }
];
(async () => {
  for (const c of CASES) {
    const ms = c.tf === '1m' ? 60e3 : 300e3;
    const bars = (await klinesAt(c.sym, c.tf, Date.parse(c.to) + ms, 1500)).filter(b => b.openTime <= Date.parse(c.to));
    console.log('==', c.sym, c.tf, c.note);
    for (const [per, m] of [[50, 2], [50, 3], [100, 3], [50, 1.5]]) {
      const src = bars.map(b => (b.high + b.low + b.close) / 3);
      const { sig } = RF.rangeFilter(src, per, m);
      const out = []; for (let i = 0; i < bars.length; i++) if (sig[i] && bars[i].openTime >= Date.parse(c.from)) out.push(new Date(bars[i].openTime).toISOString().slice(11, 16) + sig[i] + '@' + bars[i].close);
      console.log(`  per${per} m${m}:`, out.join(' '));
    }
  }
})();
