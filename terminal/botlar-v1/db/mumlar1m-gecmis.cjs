'use strict';
// Geçmişe doğru 1 dk mum doldurma (bir kez): Hammer ailesinin Visivero arşivindeki coinleri için klines_1m'i
// 20.10.2026'ya kadar geriye uzatır. Amaç: kendi Hammer #W1 kuralımızı arşivdeki orijinal #W1'lerle sınamak (db/hammer-w1.cjs).
// Yavaş çalışır (650 ms aralık) — canlı motorla aynı IP, Binance sınırını zorlamaz. Yarıda kesilirse kaldığı yerden devam eder.
const fs = require('node:fs'), path = require('node:path'), { Pool } = require('pg');
const pool = new Pool({ ...JSON.parse(fs.readFileSync(path.join(__dirname, 'baglanti.json'), 'utf8')), max: 2 });
const FROM = Date.parse(process.argv[2] || '2026-10-20T00:00:00Z'), STEP = 60e3, TO = Date.parse('2026-10-30T19:00:00Z'), GAP_MS = 650;
const log = (...a) => console.log(new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }), ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms)); let last = 0;
async function get(url) {
  for (let a = 0; a < 6; a++) {
    const w = last + GAP_MS - Date.now(); if (w > 0) await sleep(w); last = Date.now();
    try {
      const r = await fetch(url);
      if (r.status === 429 || r.status === 418) { const ra = Number(r.headers.get('retry-after') || 30); log('Binance sınırı, bekleniyor', ra, 'sn'); await sleep(ra * 1000 + 5000); continue; }
      const j = await r.json(); if (!r.ok) { const e = new Error(j.msg || 'HTTP ' + r.status); e.code = j.code; throw e; } return j;
    } catch (e) { if (e.code === -1121) throw e; if (a === 5) throw e; await sleep(3000 * (a + 1)); }
  }
}
(async () => {
  const syms = (await pool.query(`SELECT v.symbol, extract(epoch FROM min(k.t))*1000 AS first FROM (SELECT DISTINCT symbol FROM vv_messages WHERE bot LIKE '%hammer%' AND created_at >= to_timestamp($1/1000.0) AND symbol IS NOT NULL) v LEFT JOIN klines_1m k ON k.symbol = v.symbol GROUP BY 1 ORDER BY 1`, [FROM])).rows;
  log('coin:', syms.length); let tot = 0, bad = 0, i = 0;
  for (const s of syms) {
    i++; let until = s.first ? Math.min(Number(s.first), TO) - STEP : TO - STEP;   // geriye doğru: en eski mumdan öncesi
    try {
      while (until >= FROM) {
        const from2 = Math.max(FROM, until - 1499 * STEP);
        const kk = await get(`https://fapi.binance.com/fapi/v1/klines?symbol=${encodeURIComponent(s.symbol)}&interval=1m&startTime=${from2}&endTime=${until + STEP - 1}&limit=1500`);
        if (!kk.length) break;
        const vals = [], ph = kk.map((x, n) => { vals.push(s.symbol, new Date(x[0]).toISOString(), +x[1], +x[2], +x[3], +x[4], +x[7]); const b = n * 7; return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7})`; });
        tot += (await pool.query(`INSERT INTO klines_1m (symbol,t,o,h,l,c,qv) VALUES ${ph.join(',')} ON CONFLICT DO NOTHING`, vals)).rowCount;
        if (from2 === FROM) break; until = from2 - STEP;
      }
    } catch (e) { if (e.code === -1121) bad++; else log('hata', s.symbol, e.message); }
    if (i % 50 === 0) log(`${i}/${syms.length} coin, eklenen mum: ${tot}`);
  }
  log('bitti:', syms.length, 'coin,', tot, 'mum eklendi,', bad, 'geçersiz sembol'); await pool.end();
})().catch(e => { console.error('HATA', e.message); process.exit(1); });
