'use strict';
const fs = require('node:fs'); const path = require('node:path');
const { getJson, ROOT } = require('../../lib/net.cjs');
const rows = fs.readFileSync(path.join(ROOT, 'ref', 'fr.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse).filter(r => r.message.includes('SE</b>'));
const F = 'https://fapi.binance.com/futures/data/';
(async () => {
  const out = [];
  for (const r of rows) {
    const t = Date.parse(r.createdAt);
    const o = { symbol: r.symbol, t: r.createdAt, val: parseFloat(r.message.split('\n')[1]) };
    try { o.oi = (await getJson(`${F}openInterestHist?symbol=${r.symbol}&period=5m&endTime=${t}&limit=500`)).map(x => [x.timestamp, +x.sumOpenInterest, +x.sumOpenInterestValue, +x.CMCCirculatingSupply]); } catch (e) { o.oiErr = e.message; }
    try { o.k = (await getJson(`https://fapi.binance.com/fapi/v1/klines?symbol=${r.symbol}&interval=5m&endTime=${t}&limit=600`)).map(k => [k[0], +k[1], +k[2], +k[3], +k[4], +k[5], +k[7]]); } catch (e) {}
    try { o.spot = (await getJson(`https://api.binance.com/api/v3/klines?symbol=${r.symbol}&interval=5m&endTime=${t}&limit=600`)).map(k => [k[0], +k[4], +k[5], +k[7]]); } catch (e) { o.spotErr = e.message.slice(0, 60); }
    out.push(o); console.log(r.symbol);
  }
  fs.writeFileSync(path.join(ROOT, 'flow', 'seprobe2.json'), JSON.stringify(out));
})();
