'use strict';
// Probe Binance futures/data endpoints around SE events to identify the metric (value 25..35%).
const fs = require('node:fs'); const path = require('node:path');
const { getJson, ROOT } = require('../../lib/net.cjs');
const rows = fs.readFileSync(path.join(ROOT, 'ref', 'fr.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse).filter(r => r.message.includes('SE</b>'));
const F = 'https://fapi.binance.com/futures/data/';
(async () => {
  const out = [];
  for (const r of rows) {
    const t = Date.parse(r.createdAt); const val = r.message.split('\n')[1];
    const o = { symbol: r.symbol, t: r.createdAt, val };
    for (const ep of ['openInterestHist', 'globalLongShortAccountRatio', 'topLongShortAccountRatio', 'topLongShortPositionRatio', 'takerlongshortRatio', 'basis']) {
      for (const period of ['5m', '15m', '1h']) {
        try {
          const q = ep === 'basis' ? `pair=${r.symbol}&contractType=PERPETUAL` : `symbol=${r.symbol}`;
          const j = await getJson(`${F}${ep}?${q}&period=${period}&startTime=${t - 3 * 3600e3}&endTime=${t + 600e3}&limit=60`);
          o[ep + '_' + period] = j.slice(-8);
        } catch (e) { o[ep + '_' + period] = 'ERR ' + e.message.slice(0, 80); }
      }
    }
    try { o.k5 = (await getJson(`https://fapi.binance.com/fapi/v1/klines?symbol=${r.symbol}&interval=5m&endTime=${t}&limit=300`)).map(k => [k[0], +k[4], +k[5], +k[7]]); } catch (e) {}
    out.push(o); console.log(r.symbol, r.createdAt, val);
  }
  fs.mkdirSync(path.join(ROOT, 'flow'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'flow', 'seprobe.json'), JSON.stringify(out));
})();
