'use strict';
// 5 dakikalık Binance vadeli mumlarını (sinyal görülen bütün coinler) klines_5m tablosuna toplar ve güncel tutar.
// İlk çalışmada 24.10.2026'dan bugüne doldurur; sonra her 5 dakikada eksik mumları ekler. Karne hesabı bu tabloyu kullanır.
// V1.16.0: qb = piyasa ALIŞ tutarı (USDT, Binance 11. alan takerBuyQuoteVolume) → satış = qv − qb, CVD. Eski satırların qb'si db/mumlar-qb.cjs ile doldurulur.
const fs = require('node:fs'), path = require('node:path'), { Pool } = require('pg');
const pool = new Pool({ ...JSON.parse(fs.readFileSync(path.join(__dirname, 'baglanti.json'), 'utf8')), max: 3 });
const START = Date.parse('2026-10-24T00:00:00Z'), STEP = 300e3, GAP_MS = 80;
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
  const r = await pool.query(`SELECT DISTINCT symbol FROM (
      SELECT symbol FROM signals UNION SELECT symbol FROM parity_signals UNION SELECT symbol FROM vv_messages WHERE symbol IS NOT NULL) x ORDER BY 1`);
  return r.rows.map(x => x.symbol);
}
async function fill(sym, lastT) {
  let from = Math.max(START, lastT ? lastT + STEP : START), added = 0, last = lastT || 0;
  const closedUntil = Math.floor(Date.now() / STEP) * STEP - STEP;   // son kapanmış mumun açılışı
  while (from <= closedUntil) {
    // limit istek ağırlığını belirler (≤99 → 1, 1500 → 10). Eskiden her 5 dk'da 815 coin × limit 1500 = ~8.000 ağırlık isteniyordu
    // (Binance sınırı 2.400/dk) → "Binance sınırı" beklemeleri ve IP engeli riski. Artık yalnızca gereken kadar mum istenir.
    const need = Math.floor((closedUntil - from) / STEP) + 1, lim = Math.min(1500, Math.max(3, need + 1));
    let k; try { k = await get(`https://fapi.binance.com/fapi/v1/klines?symbol=${sym}&interval=5m&startTime=${from}&limit=${lim}`); }
    catch (e) { if (e.code === -1121) return { added: -1, last }; throw e; }                 // geçersiz/delist sembol
    k = k.filter(x => x[0] <= closedUntil); if (!k.length) break;
    const vals = [], ph = k.map((x, i) => { vals.push(sym, new Date(x[0]).toISOString(), +x[1], +x[2], +x[3], +x[4], +x[7], +x[10]); const b = i * 8; return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8})`; });
    added += (await pool.query(`INSERT INTO klines_5m (symbol,t,o,h,l,c,qv,qb) VALUES ${ph.join(',')} ON CONFLICT (symbol,t) DO UPDATE SET qb = EXCLUDED.qb WHERE klines_5m.qb IS NULL`, vals)).rowCount;
    last = k[k.length - 1][0]; from = last + STEP; if (k.length < lim) break;
  }
  return { added, last };
}
let SYMS = null, symsAt = 0; const LAST = new Map();
async function cycle(first) {
  // sembol listesi saatte bir, son mum zamanları yalnız ilk turda veritabanından okunur (eskiden her 5 dk'da 2,8 milyon + 12 milyon satır taranıyordu)
  if (!SYMS || Date.now() - symsAt > 3600e3) { SYMS = await symbols(); symsAt = Date.now(); }
  if (first) for (const r of (await pool.query('SELECT symbol, extract(epoch from max(t))*1000 AS t FROM klines_5m GROUP BY 1')).rows) LAST.set(r.symbol, Number(r.t));
  let tot = 0, bad = 0, i = 0;
  for (const s of SYMS) {
    i++;
    if (BAD.has(s)) { bad++; continue; }
    try { const a = await fill(s, LAST.get(s)); if (a.added < 0) { bad++; BAD.add(s); } else { tot += a.added; if (a.last) LAST.set(s, a.last); } } catch (e) { log('hata', s, e.message); }
    if (first && i % 100 === 0) log(`${i}/${SYMS.length} coin, eklenen mum: ${tot}`);
  }
  return { syms: SYMS.length, tot, bad };
}
const BAD = new Set();   // geçersiz/delist semboller: tekrar tekrar sorulmaz (süreç yeniden başlayınca sıfırlanır)
(async () => {
  await pool.query(`CREATE TABLE IF NOT EXISTS klines_5m (symbol text NOT NULL, t timestamptz NOT NULL, o double precision, h double precision, l double precision, c double precision, qv double precision, PRIMARY KEY (symbol, t))`);
  await pool.query('ALTER TABLE klines_5m ADD COLUMN IF NOT EXISTS qb double precision');
  log('mum toplayıcı başladı');
  const r = await cycle(true); log('ilk doldurma bitti:', r.syms, 'coin,', r.tot, 'mum eklendi,', r.bad, 'geçersiz sembol');
  if (process.argv.includes('--bir-kez')) { await pool.end(); return; }
  for (;;) {
    const wait = STEP - (Date.now() % STEP) + 20e3; await sleep(wait);               // her 5 dk, mum kapandıktan 20 sn sonra
    try { const c = await cycle(false); if (c.tot) log('güncellendi: +', c.tot, 'mum'); } catch (e) { log('döngü hatası:', e.message); }
  }
})().catch(e => { console.error('HATA', e.message); process.exit(1); });
