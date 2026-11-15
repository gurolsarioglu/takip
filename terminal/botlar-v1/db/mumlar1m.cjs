'use strict';
// 1 dakikalık Binance vadeli mumları → klines_1m. Sadece M1/M1 Premium sinyali görülen coinler, 30.10.2026 19:00'dan bugüne.
// Kısa (scalp) işlem testleri için: hedef/stop hangisine önce değdi sorusu 5 dk'lık mumla belirsiz kalıyordu.
const fs = require('node:fs'), path = require('node:path'), { Pool } = require('pg');
const pool = new Pool({ ...JSON.parse(fs.readFileSync(path.join(__dirname, 'baglanti.json'), 'utf8')), max: 3 });
const START = Date.parse('2026-10-30T19:00:00Z'), STEP = 60e3, GAP_MS = 650;
const log = (...a) => console.log(new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }), ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let last = 0;
async function get(url) {
  for (let a = 0; a < 5; a++) {
    const w = last + GAP_MS - Date.now(); if (w > 0) await sleep(w); last = Date.now();
    try {
      const r = await fetch(url);
      if (r.status === 429 || r.status === 418) { const ra = Number(r.headers.get('retry-after') || 30); log('Binance sınırı, bekleniyor', ra, 'sn'); await sleep(ra * 1000); continue; }
      const j = await r.json(); if (!r.ok) { const e = new Error(j.msg || 'HTTP ' + r.status); e.code = j.code; throw e; } return j;
    } catch (e) { if (e.code === -1121) throw e; if (a === 4) throw e; await sleep(2000 * (a + 1)); }
  }
}
async function symbols() {
  const r = await pool.query(`SELECT DISTINCT symbol FROM karne_signals WHERE bot IN ('m1','m1-premium') ORDER BY 1`);
  return r.rows.map(x => x.symbol);
}
async function fill(sym, lastT) {
  let from = Math.max(START, lastT ? lastT + STEP : START), added = 0;
  const closedUntil = Math.floor(Date.now() / STEP) * STEP - STEP;   // son kapanmış mumun açılışı
  while (from <= closedUntil) {
    let k; try { k = await get(`https://fapi.binance.com/fapi/v1/klines?symbol=${sym}&interval=1m&startTime=${from}&limit=1500`); }
    catch (e) { if (e.code === -1121) return -1; throw e; }                 // geçersiz/delist sembol
    k = k.filter(x => x[0] <= closedUntil); if (!k.length) break;
    const vals = [], ph = k.map((x, i) => { vals.push(sym, new Date(x[0]).toISOString(), +x[1], +x[2], +x[3], +x[4], +x[7]); const b = i * 7; return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7})`; });
    added += (await pool.query(`INSERT INTO klines_1m (symbol,t,o,h,l,c,qv) VALUES ${ph.join(',')} ON CONFLICT DO NOTHING`, vals)).rowCount;
    from = k[k.length - 1][0] + STEP; if (k.length < 1500) break;
  }
  return added;
}
async function cycle(first) {
  const syms = await symbols();
  const lastMap = Object.fromEntries((await pool.query('SELECT symbol, extract(epoch from max(t))*1000 AS t FROM klines_1m GROUP BY 1')).rows.map(r => [r.symbol, Number(r.t)]));
  let tot = 0, bad = 0, i = 0;
  for (const s of syms) {
    i++;
    try { const a = await fill(s, lastMap[s]); if (a < 0) bad++; else tot += a; } catch (e) { log('hata', s, e.message); }
    if (first && i % 100 === 0) log(`${i}/${syms.length} coin, eklenen mum: ${tot}`);
  }
  return { syms: syms.length, tot, bad };
}
(async () => {
  await pool.query(`CREATE TABLE IF NOT EXISTS klines_1m (symbol text NOT NULL, t timestamptz NOT NULL, o double precision, h double precision, l double precision, c double precision, qv double precision, PRIMARY KEY (symbol, t))`);
  log('1 dk mum toplayıcı başladı');
  const r = await cycle(true); log('ilk doldurma bitti:', r.syms, 'coin,', r.tot, 'mum eklendi,', r.bad, 'geçersiz sembol');
  if (process.argv.includes('--bir-kez')) { await pool.end(); return; }
  for (;;) {
    const wait = STEP - (Date.now() % STEP) + 20e3; await sleep(wait);               // her dakika, mum kapandıktan 20 sn sonra
    try { const c = await cycle(false); if (c.tot) log('güncellendi: +', c.tot, 'mum'); } catch (e) { log('döngü hatası:', e.message); }
  }
})().catch(e => { console.error('HATA', e.message); process.exit(1); });
