'use strict';
// Hammer guide says alarms only for coins "with the volume and volatility we want". Test 24h quote volume / volatility
// as a universe gate on our labelled live #W1 signals (analysis/w1feat-hammer-pro.json).
const fs = require('node:fs');
const path = require('node:path');
const { klinesAt, ROOT } = require('../../lib/net.cjs');
const rows = JSON.parse(fs.readFileSync(path.join(ROOT, 'analysis', 'w1feat-hammer-pro.json'), 'utf8')).filter(r => !r.err);
(async () => {
  for (const r of rows) {
    const t = Date.parse(r.t);
    try {
      const h = (await klinesAt(r.sym, '1h', t, 30)).filter(b => b.closeTime < t).slice(-24);
      const m = (await klinesAt(r.sym, '1m', t, 120)).filter(b => b.closeTime < t).slice(-60);
      r.qv24 = h.reduce((s, b) => s + b.quoteVolume, 0);
      r.range24 = (Math.max(...h.map(b => b.high)) / Math.min(...h.map(b => b.low)) - 1) * 100;
      r.chg24 = Math.abs(h.at(-1).close / h[0].open - 1) * 100;
      r.atr1h = h.slice(-14).reduce((s, b) => s + (b.high - b.low) / b.close * 100, 0) / 14;
      r.atr1m = m.reduce((s, b) => s + (b.high - b.low) / b.close * 100, 0) / m.length;
      r.qv1h = h.at(-1).quoteVolume;
      r.qv60m = m.reduce((s, b) => s + b.quoteVolume, 0);
    } catch (e) { r.err2 = e.message; }
  }
  const ok = rows.filter(r => !r.err2);
  const T = ok.filter(r => r.ok), F = ok.filter(r => !r.ok);
  const q = v => { v = v.filter(Number.isFinite).sort((a, b) => a - b); return [0, .1, .25, .5, .75, .9, 1].map(p => +v[Math.floor(p * (v.length - 1))].toPrecision(3)); };
  console.log('true', T.length, 'false', F.length);
  for (const k of ['qv24', 'range24', 'chg24', 'atr1h', 'atr1m', 'qv1h', 'qv60m']) {
    console.log(k.padEnd(8), 'T', JSON.stringify(q(T.map(r => r[k]))), '\n         F', JSON.stringify(q(F.map(r => r[k]))));
    // threshold keeping all / 95% trues (>=)
    const tv = T.map(r => r[k]).sort((a, b) => a - b);
    for (const keep of [1, 0.95]) {
      const thr = tv[Math.floor((1 - keep) * (tv.length - 1))];
      const kf = F.filter(r => r[k] >= thr).length, kt = T.filter(r => r[k] >= thr).length;
      console.log(`         >= ${thr.toPrecision(3)} keeps T ${kt}/${T.length}, F ${kf}/${F.length} -> precision ${(kt / (kt + kf)).toFixed(2)}`);
    }
  }
  fs.writeFileSync(path.join(ROOT, 'analysis', 'w1vol.json'), JSON.stringify(ok));
})();
