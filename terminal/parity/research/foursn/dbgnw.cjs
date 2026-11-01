'use strict';
const fs = require('node:fs'); const path = require('node:path');
const I = require('../../lib/ind.cjs'); const { klinesAt, ROOT } = require('../../lib/net.cjs');
const want = JSON.parse(process.argv[2]); const TF = process.argv[3] || '1d';
(async () => {
  const rows = fs.readFileSync(path.join(ROOT, 'foursn', process.argv[4] || 'features-12h-0-2-12.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
  for (const [sym, C] of want) {
    const r = rows.find(x => x.sym === sym && x.C === Date.parse(C)); if (!r) { console.log('nf', sym, C); continue; }
    const raw = await klinesAt(sym, TF, r.t, 1000); const closed = raw.filter(b => b.closeTime < r.t);
    const src = [...closed.map(b => b.close), r.price];
    const o = { sym, C, price: r.price, n: src.length, rsi: +I.rsi(src).at(-1).toFixed(2), labels: r.labels.map(l => l.strategy + ' ' + l.dir + ' ' + l.price) };
    for (const w of [150, 180, 199, 200, 201, 220, 250]) for (const h of [8]) { const b = I.nwRepaint(src, h, 3, w); o[`w${w}`] = +((r.price - b.lower) / (b.upper - b.lower)).toFixed(3); }
    console.log(JSON.stringify(o));
  }
})();
