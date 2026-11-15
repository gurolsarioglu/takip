'use strict';
// Dosya ↔ veritabanı karşılaştırması: her dosyanın geçerli satır sayısı = tablodaki kayıt sayısı mı?
const fs = require('node:fs'), path = require('node:path'), { Pool } = require('pg');
const ROOT = path.join(__dirname, '..'), LIVE = path.join(ROOT, 'data', 'live');
const pool = new Pool(JSON.parse(fs.readFileSync(path.join(__dirname, 'baglanti.json'), 'utf8')));
(async () => {
  const db = Object.fromEntries((await pool.query('SELECT src_file, count(*)::int n, max(src_line) ml FROM signals GROUP BY 1')).rows.map(r => [r.src_file, r]));
  const st = Object.fromEntries((await pool.query('SELECT src_file, byte_pos, line_no FROM ingest_state')).rows.map(r => [r.src_file, r]));
  let okAll = true;
  for (const f of fs.readdirSync(LIVE).filter(f => /^signals-.*\.jsonl$/.test(f)).sort()) {
    const s = st[f]; const buf = fs.readFileSync(path.join(LIVE, f)); const upto = s ? Number(s.byte_pos) : 0;
    let valid = 0; for (const l of buf.subarray(0, upto).toString('utf8').split('\n')) { if (!l.trim()) continue; try { const x = JSON.parse(l); if (x.botId && x.symbol && x.t != null) valid++; } catch { } }
    const n = db[f] ? db[f].n : 0, ok = n === valid; if (!ok) okAll = false;
    console.log(f.padEnd(26), 'dosya(okunan kısım):', String(valid).padStart(7), ' veritabanı:', String(n).padStart(7), ok ? '✓' : '✗ FARK', ' bekleyen bayt:', buf.length - upto);
  }
  const r = (await pool.query("SELECT bot, count(*)::int n, min(t) ilk, max(t) son FROM signals GROUP BY bot ORDER BY n DESC")).rows;
  console.table(r.map(x => ({ bot: x.bot, kayit: x.n, ilk: x.ilk.toISOString().slice(0, 16), son: x.son.toISOString().slice(0, 16) })));
  const sz = (await pool.query("SELECT pg_size_pretty(pg_database_size(current_database())) db, pg_size_pretty(pg_total_relation_size('signals')) tablo")).rows[0];
  console.log('veritabanı boyutu:', sz.db, ' signals tablosu (indeksler dahil):', sz.tablo);
  console.log(okAll ? 'SONUÇ: BÜTÜN DOSYALAR EŞİT ✓' : 'SONUÇ: FARK VAR ✗');
  await pool.end();
})().catch(e => { console.error('HATA', e.message); process.exit(1); });
