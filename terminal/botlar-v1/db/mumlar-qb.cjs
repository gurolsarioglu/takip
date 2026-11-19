'use strict';
// klines_5m.qb geriye doldurma (V1.16.0, bir kez çalışır). qb = piyasa ALIŞ tutarı (USDT, Binance 11. alan takerBuyQuoteVolume).
// qb'si boş mumları Binance'ten (limit 1000 → ağırlık 5) alıp YALNIZ qb'yi yazar; başka sütuna dokunmaz.
// İstekler arası 650 ms (AGENTS §2.6; motor aynı IP'de), 429/418'de retry-after kadar bekler. Kaldığı yerden devam eder (qb IS NULL olanlar).
// node db/mumlar-qb.cjs
const fs = require('node:fs'), path = require('node:path'), { Pool } = require('pg');
const pool = new Pool({ ...JSON.parse(fs.readFileSync(path.join(__dirname, 'baglanti.json'), 'utf8')), max: 2 });
const GAP_MS = 650, STEP = 300e3, LIM = 1000;
const log = (...a) => console.log(new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }), ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let last = 0, calls = 0;
async function get(url) {
  for (let a = 0; a < 5; a++) {
    const w = last + GAP_MS - Date.now(); if (w > 0) await sleep(w); last = Date.now(); calls++;
    try {
      const r = await fetch(url);
      if (r.status === 429 || r.status === 418) { const ra = Number(r.headers.get('retry-after') || 60); log('Binance sınırı, bekleniyor', ra, 'sn'); await sleep(ra * 1000 + 5000); continue; }
      const j = await r.json(); if (!r.ok) { const e = new Error(j.msg || 'HTTP ' + r.status); e.code = j.code; throw e; } return j;
    } catch (e) { if (e.code === -1121) throw e; if (a === 4) throw e; await sleep(3000 * (a + 1)); }
  }
}
(async () => {
  await pool.query('ALTER TABLE klines_5m ADD COLUMN IF NOT EXISTS qb double precision');
  const rows = (await pool.query(`SELECT symbol, (extract(epoch FROM min(t)) * 1000)::float8 AS a, (extract(epoch FROM max(t)) * 1000)::float8 AS b, count(*)::int AS n
    FROM klines_5m WHERE qb IS NULL GROUP BY 1 ORDER BY 1`)).rows;
  log('başladı:', rows.length, 'coin,', rows.reduce((x, r) => x + r.n, 0), 'mumda qb boş');
  let i = 0, upd = 0, bad = 0; const t0 = Date.now();
  for (const r of rows) {
    i++; let from = r.a;
    while (from <= r.b) {
      let k;
      try { k = await get(`https://fapi.binance.com/fapi/v1/klines?symbol=${r.symbol}&interval=5m&startTime=${from}&limit=${LIM}`); }
      catch (e) { if (e.code === -1121) bad++; else log('atlandı', r.symbol, e.message); break; }
      if (!Array.isArray(k) || !k.length) break;
      const vals = [r.symbol], ph = k.map((x, j) => { vals.push(new Date(x[0]).toISOString(), Number(x[10])); return `($${2 * j + 2}::timestamptz,$${2 * j + 3}::float8)`; });
      upd += (await pool.query(`UPDATE klines_5m k SET qb = v.qb FROM (VALUES ${ph.join(',')}) AS v(t, qb) WHERE k.symbol = $1 AND k.t = v.t AND k.qb IS NULL`, vals)).rowCount;
      from = k[k.length - 1][0] + STEP; if (k.length < LIM) break;
    }
    if (i % 25 === 0) log(`${i}/${rows.length} coin, güncellenen mum ${upd}, istek ${calls}, ${((Date.now() - t0) / 60e3).toFixed(1)} dk`);
  }
  log('bitti:', upd, 'mum güncellendi,', bad, 'geçersiz sembol,', calls, 'istek');
  await pool.end();
})().catch(e => { console.error('HATA', e.message); process.exit(1); });
