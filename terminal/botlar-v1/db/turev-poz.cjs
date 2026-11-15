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
  // Ek indirme (11.11.2026): büyük hesapların POZİSYON oranı (topLongShortPositionRatio) → lsp_15m. ls_15m'deki top_long HESAP oranıdır.
  await pool.query('CREATE TABLE IF NOT EXISTS lsp_15m (symbol text NOT NULL, t timestamptz NOT NULL, top_pos_long double precision, PRIMARY KEY (symbol, t))');
  const syms = (await pool.query(`SELECT DISTINCT symbol FROM klines_5m WHERE t > now() - interval '2 hours' ORDER BY 1`)).rows.map(r => r.symbol);
  const start = Date.now() - 29.7 * DAY, lastP = Object.fromEntries((await pool.query('SELECT symbol, extract(epoch FROM max(t))*1000 AS t FROM lsp_15m GROUP BY 1')).rows.map(r => [r.symbol, Number(r.t)]));
  log('coin:', syms.length); let n = 0, i = 0, bad = 0;
  for (const s of syms) {
    i++;
    try {
      const f15 = Math.ceil(Math.max(start, (lastP[s] || 0) + 900e3) / 900e3) * 900e3;
      n += await series(s, 'topLongShortPositionRatio', '15m', 900e3, f15, async rows => {
        const vals = [], ph = rows.map((x, k) => { vals.push(s, new Date(x.timestamp).toISOString(), +x.longAccount); const b = k * 3; return `($${b + 1},$${b + 2},$${b + 3})`; });
        await pool.query(`INSERT INTO lsp_15m VALUES ${ph.join(',')} ON CONFLICT DO NOTHING`, vals); });
    } catch (e) { bad++; if (bad <= 10) log('hata', s, e.message); }
    if (i % 50 === 0) log(`${i}/${syms.length} coin | satır: ${n} | istek: ${calls}`);
  }
  log('bitti:', syms.length, 'coin | satır', n, '| hatalı coin', bad); await pool.end();
})().catch(e => { console.error('HATA', e.stack); process.exit(1); });
