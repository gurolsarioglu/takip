'use strict';
// Türev verisi — SÜREKLİ güncelleme (11.11.2026, GOREV-FR-OI.md Parça 4). Binance bu geçmişi yalnız SON 30 GÜN verdiği için
// düzenli çekilmezse ileride ölçüm tekrarlanamaz. 6 saatte bir tam tur; her coinde kaldığı yerden devam eder.
//   oi_5m  : açık pozisyon (5 dk)              ← openInterestHist
//   ls_15m : büyük hesap / tüm hesaplar long oranı, alıcı/satıcı hacmi (15 dk) ← topLongShortAccountRatio, globalLongShortAccountRatio, takerlongshortRatio
//   lsp_15m: büyük hesapların POZİSYON long oranı (15 dk) ← topLongShortPositionRatio
// /futures/data uçlarının IP sınırı (1.000 istek / 5 dk) canlı motorla ortak → istekler arası 1.500 ms (bir tur ~100 dk).
// node db/turev.cjs [--bir-kez]
const fs = require('node:fs'), path = require('node:path'), { Pool } = require('pg');
const pool = new Pool({ ...JSON.parse(fs.readFileSync(path.join(__dirname, 'baglanti.json'), 'utf8')), max: 2 });
const GAP_MS = 1500, DAY = 864e5, log = (...a) => console.log(new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }), ...a);
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
async function pass() {
  const syms = (await pool.query(`SELECT DISTINCT symbol FROM klines_5m WHERE t > now() - interval '2 hours' ORDER BY 1`)).rows.map(r => r.symbol);
  const start = Date.now() - 29.7 * DAY, lastOi = Object.fromEntries((await pool.query('SELECT symbol, extract(epoch FROM max(t))*1000 AS t FROM oi_5m GROUP BY 1')).rows.map(r => [r.symbol, Number(r.t)])),
    lastP = Object.fromEntries((await pool.query('SELECT symbol, extract(epoch FROM max(t))*1000 AS t FROM lsp_15m GROUP BY 1')).rows.map(r => [r.symbol, Number(r.t)])),
    lastLs = Object.fromEntries((await pool.query('SELECT symbol, extract(epoch FROM max(t))*1000 AS t FROM ls_15m GROUP BY 1')).rows.map(r => [r.symbol, Number(r.t)]));
  log('coin:', syms.length); let nOi = 0, nLs = 0, nP = 0, i = 0, bad = 0;
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
      const fp = Math.ceil(Math.max(start, (lastP[s] || 0) + 900e3) / 900e3) * 900e3;
      nP += await series(s, 'topLongShortPositionRatio', '15m', 900e3, fp, async rows => {
        const vals = [], ph = rows.map((x, k) => { vals.push(s, new Date(x.timestamp).toISOString(), +x.longAccount); const b = k * 3; return `($${b + 1},$${b + 2},$${b + 3})`; });
        await pool.query(`INSERT INTO lsp_15m VALUES ${ph.join(',')} ON CONFLICT DO NOTHING`, vals); });
    } catch (e) { bad++; if (bad <= 15) log('hata', s, e.message); }
    if (i % 100 === 0) log(`${i}/${syms.length} coin | OI +${nOi} | oran +${nLs} | pozisyon +${nP} | istek ${calls}`);
  }
  log('tur bitti:', syms.length, 'coin | OI +' + nOi, '| oran +' + nLs, '| pozisyon +' + nP, '| hatalı coin', bad);
}
(async () => {
  for (const q of SCHEMA.split(';').map(s => s.trim()).filter(Boolean)) await pool.query(q);
  await pool.query('CREATE TABLE IF NOT EXISTS lsp_15m (symbol text NOT NULL, t timestamptz NOT NULL, top_pos_long double precision, PRIMARY KEY (symbol, t))');
  log('türev toplayıcı başladı');
  for (;;) {
    const t0 = Date.now();
    try { await pass(); } catch (e) { log('hata (tekrar denenecek):', e.message); }
    if (process.argv.includes('--bir-kez')) break;
    await sleep(Math.max(60e3, 6 * 3600e3 - (Date.now() - t0)));
  }
  await pool.end();
})().catch(e => { console.error('HATA', e.stack); process.exit(1); });
