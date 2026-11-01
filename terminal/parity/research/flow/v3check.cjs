'use strict';
// V3: reproduce "Hacim: +X%" and "24s Hacim" from 1m klines. node v3check.cjs [max]
const fs = require('node:fs'); const path = require('node:path');
const { getJson, cached, ROOT, toBar } = require('../../lib/net.cjs');
const MAX = Number(process.argv[2] || 250); const OFF = Number(process.argv[3] || 0); const OUT = process.argv[4] || 'v3check.json';
const rows = fs.readFileSync(path.join(ROOT, 'ref', 'v3.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse)
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(OFF, OFF + MAX);
const trNum = s => Number(String(s).replace(/\./g, '').replace(',', '.'));
(async () => {
  const out = [];
  for (const r of rows) {
    const t = Date.parse(r.createdAt); const m = r.message;
    const pct = Number((m.match(/Hacim: \+?(-?[\d.]+)%/) || [])[1]);
    const v24 = trNum((m.match(/24s Hacim: ([\d.,]+)/) || [])[1]);
    const minute = Math.floor(t / 60000) * 60000;
    try {
      const raw = await cached(`v3k_${r.symbol}_${minute}`, () => getJson(`https://fapi.binance.com/fapi/v1/klines?symbol=${r.symbol}&interval=1m&endTime=${minute + 59999}&limit=1500`));
      const ks = raw.map(toBar);
      const closed = ks.filter(k => k.closeTime < t);
      const L = closed.length;
      const last = closed[L - 1];
      const sum = (a, b) => closed.slice(Math.max(0, a), b).reduce((s, k) => s + k.volume, 0);
      const s24incl = sum(L - 1440, L), s24excl = sum(L - 1441, L - 1), s24prevWin = sum(L - 1441, L - 1);
      const qsum = closed.slice(L - 1440).reduce((s, k) => s + k.quoteVolume, 0);
      const live = ks.find(k => k.openTime <= t && k.closeTime >= t);
      out.push({ id: r.id, sym: r.symbol, t: r.createdAt, pct, v24, n: L, lastVol: last.volume, lastOpen: last.openTime,
        cA: last.volume / s24excl * 100, cB: last.volume / s24incl * 100, cC: (s24incl / s24prevWin - 1) * 100,
        s24incl, s24excl, qsum, lastQ: last.quoteVolume, liveVol: live ? live.volume : null,
        prev2: closed.slice(-6).map(k => k.volume) });
    } catch (e) { out.push({ id: r.id, sym: r.symbol, err: e.message }); }
  }
  fs.mkdirSync(path.join(ROOT, 'flow'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'flow', OUT), JSON.stringify(out));
  console.log('done', out.length);
})();
