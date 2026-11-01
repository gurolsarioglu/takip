'use strict';
// List Range Filter flips (hlc3/50, mult 0.7+0.5*S) for BREVUSDT 1m over a UTC range, with different history lengths (warm-up check).
const RF = require('./rflib.cjs');
const { klinesAt } = require('../../lib/net.cjs');
const [from, to, S] = [process.argv[2] || '2026-10-28T12:45', process.argv[3] || '2026-10-28T18:15', Number(process.argv[4] || 3)]; const SYM = process.argv[5] || 'BREVUSDT', TF = process.argv[6] || '1m';
(async () => {
  const T1 = Date.parse(to + ':00Z'), T0 = Date.parse(from + ':00Z');
  let all = await klinesAt(SYM, TF, T1 + 60e3, 1500);
  const more = await klinesAt(SYM, TF, all[0].openTime - 1, 1500); all = [...more.filter(b => b.openTime < all[0].openTime), ...all].filter(b => b.openTime <= T1);
  for (const hist of [300, 600, 1000, 2000, all.length]) {
    const b = all.slice(-hist); const src = b.map(x => process.argv[8] === 'hlc3' ? (x.high + x.low + x.close) / 3 : (x.open + x.high + x.low + x.close) / 4);
    const { sig } = RF.rangeFilter(src, 50, 0.7 + 0.5 * S, process.argv[7] === 'noeq');
    console.log('hist', hist, 'from', new Date(b[0].openTime).toISOString().slice(0, 16), '|', sig.map((s, i) => s && b[i].openTime >= T0 ? new Date(b[i].openTime + 3 * 3600e3).toISOString().slice(11, 16) + s : null).filter(Boolean).join(' '));
  }
})();
