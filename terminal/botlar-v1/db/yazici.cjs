'use strict';
// Botlar V1 veritabanı yazıcısı: data/live/signals-*.jsonl dosyalarını (eskiden yeniye) okuyup PostgreSQL'e aktarır,
// sonra yeni satırları canlı izler. 11.11.2026'dan beri ASIL KAYIT VERİTABANIDIR; dosyalar motorun tamponudur ve tamamı
// aktarıldıktan sonra (data\ayar.json izin veriyorsa) silinir — bkz. temizle(). Kaldığı yeri ingest_state'te tutar,
// aynı satır (dosya + satır no) iki kez girmez → kapanıp açılsa da kayıp/çift olmaz.
// Çalıştır: node db/yazici.cjs   (sadece geçmişi aktarıp çık: node db/yazici.cjs --bir-kez)
const fs = require('node:fs'), path = require('node:path'), { Pool } = require('pg');
const ROOT = path.join(__dirname, '..'), LIVE = path.join(ROOT, 'data', 'live');
const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'baglanti.json'), 'utf8'));
const pool = new Pool({ ...cfg, max: 4 });
const ONCE = process.argv.includes('--bir-kez'), BATCH = 1000;
const log = (...a) => console.log(new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }), ...a);
const COLS = ['src_file', 'src_line', 't', 'bot', 'symbol', 'dir', 'strategy', 'price', 'prev_price', 'boost_pct', 'module', 'rsi', 'srsi', 'fields', 'text', 'event_time', 'seen_at'];
const ts = v => (v == null ? null : new Date(typeof v === 'number' ? v : Date.parse(v)).toISOString());
const numOr = v => (Number.isFinite(v) ? v : null);
function row(file, ln, s) {
  return [file, ln, ts(s.t), s.botId, s.symbol, s.direction || null, s.strategy || null, numOr(s.price), numOr(s.prevPrice), numOr(s.boostPct), s.module || null,
    s.rsi ? JSON.stringify(s.rsi) : null, s.srsi ? JSON.stringify(s.srsi) : null, s.fields ? JSON.stringify(s.fields) : null, s.text || null, ts(s.eventTime), ts(s.seenAt)];
}
async function insert(client, rows) {
  if (!rows.length) return 0;
  const vals = [], ph = rows.map((r, i) => '(' + r.map((v, j) => { vals.push(v); return '$' + (i * COLS.length + j + 1); }).join(',') + ')');
  const q = `INSERT INTO signals (${COLS.join(',')}) VALUES ${ph.join(',')} ON CONFLICT (src_file, src_line) DO NOTHING`;
  return (await client.query(q, vals)).rowCount;
}
let stats = { inserted: 0, skipped: 0, bad: 0 };
async function ingestFile(file) {
  const full = path.join(LIVE, file); let size; try { size = fs.statSync(full).size; } catch { return 0; }
  const c = await pool.connect();
  try {
    const st = (await c.query('SELECT byte_pos, line_no FROM ingest_state WHERE src_file=$1', [file])).rows[0] || { byte_pos: 0, line_no: 0 };
    let pos = Number(st.byte_pos), ln = st.line_no;
    if (size < pos) { log('UYARI dosya küçülmüş, baştan:', file); pos = 0; ln = 0; }
    if (size === pos) return 0;
    const fd = fs.openSync(full, 'r'); let rest = Buffer.alloc(0), added = 0, readPos = pos;
    try {
      while (readPos < size) {
        const len = Math.min(16 << 20, size - readPos), buf = Buffer.alloc(len); fs.readSync(fd, buf, 0, len, readPos); readPos += len;
        const all = rest.length ? Buffer.concat([rest, buf]) : buf, cut = all.lastIndexOf(0x0a);
        if (cut < 0) { rest = all; continue; }
        const lines = all.subarray(0, cut).toString('utf8').split('\n'); rest = Buffer.from(all.subarray(cut + 1));
        let rows = [];
        await c.query('BEGIN');
        for (const l of lines) {
          ln++;
          if (!l.trim()) continue;
          let s; try { s = JSON.parse(l); } catch { stats.bad++; continue; }
          if (!s.botId || !s.symbol || s.t == null) { stats.bad++; continue; }
          rows.push(row(file, ln, s));
          if (rows.length >= BATCH) { added += await insert(c, rows); rows = []; }
        }
        added += await insert(c, rows);
        await c.query(`INSERT INTO ingest_state (src_file, byte_pos, line_no, file_size, updated) VALUES ($1,$2,$3,$4,now())
          ON CONFLICT (src_file) DO UPDATE SET byte_pos=EXCLUDED.byte_pos, line_no=EXCLUDED.line_no, file_size=EXCLUDED.file_size, updated=now()`, [file, readPos - rest.length, ln, size]);
        await c.query('COMMIT');
      }
    } catch (e) { await c.query('ROLLBACK').catch(() => { }); throw e; } finally { fs.closeSync(fd); }
    stats.inserted += added; return added;
  } finally { c.release(); }
}
// TEK KAYIT: kalıcı kayıt veritabanıdır. Motorun yazdığı günlük dosya yalnızca tampon görevindedir; tamamı veritabanına geçmiş ve
// AYAR.jsonlGun günden eski dosyalar silinir. Ayar dosyası (data\ayar.json → {"jsonlGun": 2}) yoksa hiçbir dosya silinmez.
let temizAt = 0;
async function temizle() {
  if (Date.now() - temizAt < 10 * 60e3) return; temizAt = Date.now();
  let keep; try { keep = Number(JSON.parse(fs.readFileSync(path.join(LIVE, '..', 'ayar.json'), 'utf8')).jsonlGun); } catch { return; }
  if (!(keep >= 1)) return;
  const lim = new Date(Date.now() - keep * 864e5).toISOString().slice(0, 10);
  for (const f of fs.readdirSync(LIVE).filter(f => /^signals-\d{4}-\d{2}-\d{2}\.jsonl$/.test(f)).sort()) {
    if (f.slice(8, 18) >= lim) continue;
    const full = path.join(LIVE, f), size = fs.statSync(full).size;
    const st = (await pool.query('SELECT byte_pos, line_no FROM ingest_state WHERE src_file=$1', [f])).rows[0];
    if (!st || Number(st.byte_pos) !== size) { log('silinmedi (tamamı aktarılmamış):', f); continue; }
    const c = (await pool.query('SELECT count(*)::bigint n, max(src_line) mx FROM signals WHERE src_file=$1', [f])).rows[0];
    if (!(Number(c.n) > 0) || Number(c.mx) !== st.line_no) { log('silinmedi (satır sayısı tutmuyor):', f, 'tablo', c.n, 'son satır', c.mx, 'dosya', st.line_no); continue; }
    fs.unlinkSync(full); log('tampon dosya silindi (veritabanında', c.n, 'satır):', f);
  }
}
async function cycle() {
  const files = fs.readdirSync(LIVE).filter(f => /^signals-\d{4}-\d{2}-\d{2}\.jsonl$/.test(f)).sort();
  let n = 0; for (const f of files) { const a = await ingestFile(f); if (a && (ONCE || a > 200)) log(f, '+', a); n += a; } return n;
}
(async () => {
  const c = await pool.connect(); try { await c.query(fs.readFileSync(path.join(__dirname, 'sema.sql'), 'utf8')); } finally { c.release(); }
  log('şema hazır; aktarım başlıyor');
  await cycle();
  const tot = (await pool.query('SELECT count(*)::bigint n FROM signals')).rows[0].n;
  log('geçmiş aktarıldı. eklenen:', stats.inserted, 'bozuk satır:', stats.bad, 'tablodaki toplam:', tot);
  if (ONCE) { await pool.end(); return; }
  log('canlı izleme başladı');
  for (;;) { try { await cycle(); } catch (e) { log('hata (tekrar denenecek):', e.message); await new Promise(r => setTimeout(r, 10000)); } await temizle().catch(e => log('temizlik hatası:', e.message)); await new Promise(r => setTimeout(r, 700)); }
})().catch(e => { console.error('HATA', e.message); process.exit(1); });
