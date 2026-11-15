'use strict';
// Sinyal karnesi: Botlar V1 sinyallerini tekrarsız sinyallere (epizot) ayırır ve her biri için fiyatın 15 dk / 1 sa / 4 sa sonra
// SİNYAL YÖNÜNDE yüzde kaç gittiğini, ilk 1 saatteki en iyi (MFE) ve en kötü (MAE) noktasını hesaplar → karne_signals.
// fr'nin yönsüz özet mesajları sayılmaz. MFE/MAE: sinyalden sonraki ilk tam mumdan itibaren 1 saat.
// Fiyat: sinyal anındaki fiyat (giriş) ve 5 dk'lık Binance mumu (çıkış). V3 yönsüz → long kabul edilir.
// Tekrar sayılmaz: aynı bot+coin+yön+strateji, aşağıdaki aralıktan kısa sürede tekrar ederse ilk mesaj sayılır.
const fs = require('node:fs'), path = require('node:path'), { Pool } = require('pg');
const pool = new Pool({ ...JSON.parse(fs.readFileSync(path.join(__dirname, 'baglanti.json'), 'utf8')), max: 2 });
const log = (...a) => console.log(new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }), ...a);
const SCHEMA = `
CREATE TABLE IF NOT EXISTS karne_signals (
  bot text NOT NULL, symbol text NOT NULL, dir text, strategy text, t timestamptz NOT NULL, price double precision,
  star boolean, div1 boolean, div5 boolean, div1h boolean, wt boolean, reps integer,
  r15 double precision, r60 double precision, r240 double precision, mfe60 double precision, mae60 double precision,
  PRIMARY KEY (bot, symbol, t));
CREATE INDEX IF NOT EXISTS karne_bot_t ON karne_signals (bot, t);
CREATE TABLE IF NOT EXISTS karne_state (k text PRIMARY KEY, v timestamptz);`;
const GAP = `CASE s.bot WHEN 'fr' THEN interval '1 hour' WHEN 'div' THEN interval '4 hours' WHEN '4s' THEN interval '4 hours'
  WHEN '4sniper' THEN interval '4 hours' WHEN '1dws' THEN interval '24 hours' WHEN 'hammer' THEN interval '1 hour' ELSE interval '15 minutes' END`;
function sql(from, to) {
  return `
WITH s AS (
  SELECT bot, symbol, dir, strategy, t, price, text,
         lag(t) OVER (PARTITION BY bot, symbol, coalesce(dir,'-'), coalesce(strategy,'-') ORDER BY t) AS pt,
         count(*) OVER (PARTITION BY bot, symbol, coalesce(dir,'-'), coalesce(strategy,'-'), date_trunc('hour', t)) AS reps
  FROM signals WHERE t >= $1::timestamptz - interval '24 hours' AND t < $2::timestamptz),
e AS (SELECT DISTINCT ON (bot, symbol, t) * FROM s WHERE (pt IS NULL OR t - pt > ${GAP}) AND t >= $1::timestamptz AND price > 0 AND (dir IS NOT NULL OR bot = 'v3') ORDER BY bot, symbol, t, strategy),
x AS (
  SELECT e.*, CASE WHEN e.dir = 'down' THEN -1 ELSE 1 END AS sg, date_bin('5 minutes', e.t, timestamptz '2000-01-01') AS b0 FROM e)
INSERT INTO karne_signals (bot, symbol, dir, strategy, t, price, star, div1, div5, div1h, wt, reps, r15, r60, r240, mfe60, mae60)
SELECT x.bot, x.symbol, x.dir, x.strategy, x.t, x.price,
  split_part(x.text, E'\\n', 1) LIKE '%⭐%', x.text ~ 'Divergence:[^\\n]*1m✅', x.text ~ 'Divergence:[^\\n]*5m✅', x.text ~ 'Divergence:[^\\n]*1h✅', x.text LIKE '%WT Cross:%', x.reps,
  100 * x.sg * ((SELECT c FROM klines_5m k WHERE k.symbol = x.symbol AND k.t = x.b0 + interval '15 minutes') / x.price - 1),
  100 * x.sg * ((SELECT c FROM klines_5m k WHERE k.symbol = x.symbol AND k.t = x.b0 + interval '60 minutes') / x.price - 1),
  100 * x.sg * ((SELECT c FROM klines_5m k WHERE k.symbol = x.symbol AND k.t = x.b0 + interval '240 minutes') / x.price - 1),
  w.mfe, w.mae
FROM x LEFT JOIN LATERAL (
  SELECT CASE WHEN x.sg > 0 THEN 100 * (max(h) / x.price - 1) ELSE 100 * (1 - min(l) / x.price) END AS mfe,
         CASE WHEN x.sg > 0 THEN 100 * (min(l) / x.price - 1) ELSE 100 * (1 - max(h) / x.price) END AS mae
  FROM klines_5m k WHERE k.symbol = x.symbol AND k.t > x.b0 AND k.t <= x.b0 + interval '55 minutes') w ON true
ON CONFLICT (bot, symbol, t) DO UPDATE SET r15 = EXCLUDED.r15, r60 = EXCLUDED.r60, r240 = EXCLUDED.r240, mfe60 = EXCLUDED.mfe60, mae60 = EXCLUDED.mae60, reps = EXCLUDED.reps`;
}
async function run() {
  const st = (await pool.query("SELECT v FROM karne_state WHERE k='done_until'")).rows[0];
  // 4 saatlik sonuç için mum gerekir → son 4 sa 10 dk henüz hesaplanmaz
  const to = new Date(Date.now() - (4 * 60 + 10) * 60e3);
  let from = st ? new Date(st.v.getTime() - 6 * 3600e3) : new Date('2026-10-30T00:00:00Z');
  let total = 0;
  while (from < to) {
    const end = new Date(Math.min(to.getTime(), from.getTime() + 24 * 3600e3));
    const r = await pool.query(sql(from, end), [from.toISOString(), end.toISOString()]);
    total += r.rowCount; log('karne', from.toISOString().slice(0, 16), '→', end.toISOString().slice(0, 16), '+', r.rowCount);
    await pool.query("INSERT INTO karne_state VALUES ('done_until',$1) ON CONFLICT (k) DO UPDATE SET v=EXCLUDED.v", [end.toISOString()]);
    from = end;
  }
  return total;
}
(async () => {
  await pool.query(SCHEMA);
  const n = await run(); log('karne güncel, işlenen:', n);
  if (process.argv.includes('--bir-kez')) { await pool.end(); return; }
  for (;;) { await new Promise(r => setTimeout(r, 15 * 60e3)); try { await run(); } catch (e) { log('hata:', e.message); } }
})().catch(e => { console.error('HATA', e.message); process.exit(1); });
