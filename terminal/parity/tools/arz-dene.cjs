'use strict';
// /api/t/arz'ı tetikler, eşleme bitene kadar bekler; eşleşme oranı ve örnek coinler (anahtar okunmaz/yazılmaz)
const fs = require('node:fs'), path = require('node:path');
const get = s => fetch('http://127.0.0.1:3200/api/t/arz?symbol=' + s).then(r => r.json());
(async () => {
  let r = await get('BTCUSDT'); const t0 = Date.now();
  while (r.none === 'bekle' && Date.now() - t0 < 150e3) { await new Promise(x => setTimeout(x, 5000)); r = await get('BTCUSDT'); }
  console.log('BTC', JSON.stringify(r).slice(0, 400));
  const c = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', '..', 'botlar-v1', 'data', 'cache', 'coingecko.json'), 'utf8'));
  const tk = await fetch('http://127.0.0.1:3200/api/t/tickers').then(r => r.json()), all = Object.keys(tk.rows);
  const miss = all.filter(s => !c.map[s]);
  console.log('eşlenen', Object.keys(c.map).length, '/', all.length, '| istek (30 g)', c.calls.length);
  console.log('eşlenmeyen örnek', miss.slice(0, 60).join(' '));
  for (const s of ['ETHUSDT', 'SOLUSDT', '1000PEPEUSDT', 'DOGEUSDT', 'WIFUSDT', 'ARCUSDT', 'AKEUSDT', '1000BONKUSDT', 'TRUMPUSDT', 'AIUSDT']) {
    const d = c.data[s], m = c.map[s]; console.log(s.padEnd(14), m ? `${m.id} ×${m.mult} | PD ${(d.mcap / 1e9).toFixed(3)}B #${d.rank} | dolaşım ${d.circ} maks ${d.max} | cg px ${d.px} · binance ${tk.rows[s] && tk.rows[s][0]}` : 'YOK');
  }
})().catch(e => console.log('HATA', e.message));
