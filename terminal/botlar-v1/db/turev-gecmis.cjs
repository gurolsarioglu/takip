'use strict';
// Türev verisi geçmişi (Binance yalnızca SON 30 GÜNÜ veriyor — bu yüzden bekletmeden indirilir):
//   oi_5m  : açık pozisyon (open interest), 5 dk          → /futures/data/openInterestHist
//   ls_15m : long/short oranları ve alıcı/satıcı hacmi, 15 dk → topLongShortAccountRatio, globalLongShortAccountRatio, takerlongshortRatio
// "Pompa" botu araştırması için. Yavaş (650 ms aralık), kaldığı yerden devam eder. Başka bir indirme işi sürüyorsa bekler.
// node db/turev-gecmis.cjs [--bekle <jobs klasöründeki .done dosyası>]
const fs = require('node:fs'), path = require('node:path'), { Pool } = require('pg');
const pool = new Pool({ ...JSON.parse(fs.readFileSync(path.join(__dirname, 'baglanti.json'), 'utf8')), max: 2 });
const GAP_MS = 650, DAY = 864e5, log = (...a) => console.log(new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }), ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms)); let last = 0, calls = 0;
async function get(url) {
  for (let a = 0; a < 6; a++) {
    const w = last + GAP_MS - Date.now(); if (w > 0) await sleep(w); last = Date.now(); calls++;
    try {
      const r = await fetch(url);
      if (r.status === 429 || r.status === 418) { const ra = Number(r.headers.get('retry-after') || 30); log('Binance sınırı, bekleniyor', ra, 'sn'); await sleep(ra * 1000 + 5000); continue; }
      const j = await r.json(); if (!r.ok) { const e = new Error(j.msg || 'HTTP ' + r.status); e.code = j.code; e.status = r.status; throw e; } return j;
    } catch (e) { if (e.status === 400) throw e; if (a === 5) throw e; await sleep(3000 * (a + 1)); }
  }
}
const SCHEMA = `
CREATE TABLE IF NOT EXISTS oi_5m (symbol text NOT NULL, t timestamptz NOT NULL, oi double precision, oi_usd double precision, PRIMARY KEY (symbol, t));
CREATE TABLE IF NOT EXISTS ls_15m (symbol text NOT NULL, t timestamptz NOT NULL, top_long double precision, global_long double precision, taker_buy double precision, taker_sell double precision, PRIMARY KEY (symbol, t));`;
async function series(sym, ep, period, stepMs, from, onRows) {
  const end = Math.floor(Date.now() / stepMs) * stepMs; let n = 0;
  for (let a = from; a < end; a += 500 * stepMs) {
    const rows = await get(`https://fapi.binance.com/futures/data/${ep}?symbol=${encodeURIComponent(sym)}&period=${period}&limit=500&startTime=${a}&endTime=${Math.min(end, a + 500 * stepMs) - 1}`);
    if (Array.isArray(rows) && rows.length) { await onRows(rows); n += rows.length; }
  }
  return n;
}
(async () => {
  const wi = process.argv.indexOf('--bekle');
  if (wi > 0) { const f = path.resolve(__dirname, '..', '..', 'parity', 'jobs', process.argv[wi + 1]); log('bekleniyor:', f); while (!fs.existsSync(f)) await sleep(30e3); }
  for (const q of SCHEMA.split(';').map(s => s.trim()).filter(Boolean)) await pool.query(q);
  const syms = (await pool.query(`SELECT DISTINCT symbol FROM klines_5m WHERE t > now() - interval '2 hours' ORDER BY 1`)).rows.map(r => r.symbol);
  const start = Date.now() - 29.7 * DAY, lastOi = Object.fromEntries((await pool.query('SELECT symbol, extract(epoch FROM max(t))*1000 AS t FROM oi_5m GROUP BY 1')).rows.map(r => [r.symbol, Number(r.t)])),
    lastLs = Object.fromEntries((await pool.query('SELECT symbol, extract(epoch FROM max(t))*1000 AS t FROM ls_15m GROUP BY 1')).rows.map(r => [r.symbol, Number(r.t)]));
  log('coin:', syms.length); let nOi = 0, nLs = 0, i = 0, bad = 0;
  for (const s of syms) {
    i++;
    try {
      const f5 = Math.ceil(Math.max(start, (lastOi[s] || 0) + 300e3) / 300e3) * 300e3;
      nOi += await series(s, 'openInterestHist', '5m', 300e3, f5, async rows => {
        const vals = [], ph = rows.map((x, n) => { vals.push(s, new Date(x.timestamp).toISOString(), +x.sumOpenInterest, +x.sumOpenInterestValue); const b = n * 4; return `($${b + 1},$${b + 2},$${b + 3},$${b + 4})`; });
        await pool.query(`INSERT INTO oi_5m VALUES ${ph.join(',')} ON CONFLICT DO NOTHING`, vals); });
      const f15 = Math.ceil(Math.max(start, (lastLs[s] || 0) + 900e3) / 900e3) * 900e3, M = new Map(), put = (t, k, v) => { let o = M.get(t); if (!o) M.set(t, o = {}); o[k] = v; };
      await series(s, 'topLongShortAccountRatio', '15m', 900e3, f15, async rows => { for (const x of rows) put(x.timestamp, 'top', +x.longAccount); });
      await series(s, 'globalLongShortAccountRatio', '15m', 900e3, f15, async rows => { for (const x of rows) put(x.timestamp, 'glob', +x.longAccount); });
      await series(s, 'takerlongshortRatio', '15m', 900e3, f15, async rows => { for (const x of rows) { put(x.timestamp, 'buy', +x.buyVol); put(x.timestamp, 'sell', +x.sellVol); } });
      const ent = [...M.entries()];
      for (let a = 0; a < ent.length; a += 1000) { const part = ent.slice(a, a + 1000), vals = [], ph = part.map(([t, o], n) => { vals.push(s, new Date(t).toISOString(), o.top ?? null, o.glob ?? null, o.buy ?? null, o.sell ?? null); const b = n * 6; return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6})`; });
        await pool.query(`INSERT INTO ls_15m VALUES ${ph.join(',')} ON CONFLICT DO NOTHING`, vals); }
      nLs += ent.length;
    } catch (e) { bad++; if (bad <= 15) log('hata', s, e.message); }
    if (i % 25 === 0) log(`${i}/${syms.length} coin | OI satır: ${nOi} | oran satır: ${nLs} | istek: ${calls}`);
  }
  log('bitti:', syms.length, 'coin | OI', nOi, '| oran', nLs, '| hatalı coin', bad); await pool.end();
})().catch(e => { console.error('HATA', e.stack); process.exit(1); });
