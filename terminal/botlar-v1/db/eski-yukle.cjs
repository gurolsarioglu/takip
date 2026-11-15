'use strict';
// Eski parity laboratuvarı verisini veritabanına yükler (dosyalara dokunmaz):
//   parity/data/ref/<bot>.jsonl      → vv_messages   (Visivero orijinal mesajları; anahtar: Visivero mesaj id)
//   parity/data/live/signals-*.jsonl → parity_signals (eski motorun sinyalleri, Hammer dahil; anahtar: dosya + satır no)
// Tekrar çalıştırmak güvenli: var olan kayıtlar atlanır. Sonunda dosya ↔ tablo sayımı yapılır.
const fs = require('node:fs'), path = require('node:path'), { Pool } = require('pg');
const PDATA = path.resolve(__dirname, '..', '..', 'parity', 'data');
const pool = new Pool({ ...JSON.parse(fs.readFileSync(path.join(__dirname, 'baglanti.json'), 'utf8')), max: 2 });
const log = (...a) => console.log(new Date().toLocaleTimeString('tr-TR', { timeZone: 'Europe/Istanbul' }), ...a);
const ts = v => (v == null ? null : new Date(typeof v === 'number' ? v : Date.parse(v)).toISOString());
const numOr = v => (Number.isFinite(v) ? v : null);
const SQL = `
CREATE TABLE IF NOT EXISTS vv_messages (
  id text PRIMARY KEY, bot text NOT NULL, symbol text, created_at timestamptz NOT NULL, message text,
  exchange text, market_type text, src_file text NOT NULL);
CREATE INDEX IF NOT EXISTS vv_bot_t ON vv_messages (bot, created_at);
CREATE INDEX IF NOT EXISTS vv_symbol_t ON vv_messages (symbol, created_at);
CREATE TABLE (LIKE signals INCLUDING DEFAULTS);`.replace('CREATE TABLE (LIKE', 'CREATE TABLE IF NOT EXISTS parity_signals (LIKE') + `
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='parity_signals_pkey') THEN ALTER TABLE parity_signals ADD PRIMARY KEY (src_file, src_line); END IF; END $$;
CREATE INDEX IF NOT EXISTS ps_bot_t ON parity_signals (bot, t);
CREATE INDEX IF NOT EXISTS ps_symbol_t ON parity_signals (symbol, t);`;
async function bulk(c, table, cols, rows, conflict) {
  if (!rows.length) return 0;
  const vals = [], ph = rows.map((r, i) => '(' + r.map((v, j) => { vals.push(v); return '$' + (i * cols.length + j + 1); }).join(',') + ')');
  return (await c.query(`INSERT INTO ${table} (${cols.join(',')}) VALUES ${ph.join(',')} ON CONFLICT ${conflict} DO NOTHING`, vals)).rowCount;
}
async function eachLine(file, fn) {
  const fd = fs.openSync(file, 'r'), size = fs.fstatSync(fd).size; let pos = 0, rest = Buffer.alloc(0), ln = 0;
  try {
    while (pos < size) {
      const len = Math.min(16 << 20, size - pos), buf = Buffer.alloc(len); fs.readSync(fd, buf, 0, len, pos); pos += len;
      const all = rest.length ? Buffer.concat([rest, buf]) : buf, cut = pos >= size ? all.length : all.lastIndexOf(0x0a);
      if (cut < 0) { rest = all; continue; }
      const lines = all.subarray(0, cut).toString('utf8').split('\n'); rest = Buffer.from(all.subarray(Math.min(all.length, cut + 1)));
      for (const l of lines) { ln++; await fn(l, ln); }
    }
  } finally { fs.closeSync(fd); }
}
(async () => {
  await pool.query(SQL); log('tablolar hazır');
  const c = await pool.connect(); const report = [];
  try {
    // 1) Visivero mesajları
    const VC = ['id', 'bot', 'symbol', 'created_at', 'message', 'exchange', 'market_type', 'src_file'];
    for (const f of fs.readdirSync(path.join(PDATA, 'ref')).filter(f => f.endsWith('.jsonl')).sort()) {
      let rows = [], add = 0, valid = 0, bad = 0; const ids = new Set();
      await eachLine(path.join(PDATA, 'ref', f), async l => {
        if (!l.trim()) return; let m; try { m = JSON.parse(l); } catch { bad++; return; }
        if (!m.id || !m.createdAt) { bad++; return; } valid++; ids.add(m.id);
        rows.push([m.id, m.botId || f.replace('.jsonl', ''), m.symbol || null, ts(m.createdAt), m.message || null, m.exchange || null, m.marketType || null, f]);
        if (rows.length >= 1000) { add += await bulk(c, 'vv_messages', VC, rows, '(id)'); rows = []; }
      });
      add += await bulk(c, 'vv_messages', VC, rows, '(id)');
      const n = (await c.query('SELECT count(*)::int n FROM vv_messages WHERE src_file=$1', [f])).rows[0].n;
      report.push({ tablo: 'vv_messages', dosya: f, satir: valid, tekil_id: ids.size, tabloda: n, bozuk: bad, durum: n >= ids.size ? '✓' : '✗' }); log('ref', f, '+', add);
    }
    // 2) Eski motor sinyalleri
    const SC = ['src_file', 'src_line', 't', 'bot', 'symbol', 'dir', 'strategy', 'price', 'prev_price', 'boost_pct', 'module', 'rsi', 'srsi', 'fields', 'text', 'event_time', 'seen_at'];
    for (const f of fs.readdirSync(path.join(PDATA, 'live')).filter(f => /^signals-.*\.jsonl$/.test(f)).sort()) {
      let rows = [], add = 0, valid = 0, bad = 0;
      await c.query('BEGIN');
      await eachLine(path.join(PDATA, 'live', f), async (l, ln) => {
        if (!l.trim()) return; let s; try { s = JSON.parse(l); } catch { bad++; return; }
        if (!s.botId || !s.symbol || s.t == null) { bad++; return; } valid++;
        rows.push([f, ln, ts(s.t), s.botId, s.symbol, s.direction || null, s.strategy || null, numOr(s.price), numOr(s.prevPrice), numOr(s.boostPct), s.module || null,
          s.rsi ? JSON.stringify(s.rsi) : null, s.srsi ? JSON.stringify(s.srsi) : null, s.fields ? JSON.stringify(s.fields) : null, s.text || null, ts(s.eventTime), ts(s.seenAt)]);
        if (rows.length >= 1000) { add += await bulk(c, 'parity_signals', SC, rows, '(src_file, src_line)'); rows = []; }
      });
      add += await bulk(c, 'parity_signals', SC, rows, '(src_file, src_line)'); await c.query('COMMIT');
      const n = (await c.query('SELECT count(*)::int n FROM parity_signals WHERE src_file=$1', [f])).rows[0].n;
      report.push({ tablo: 'parity_signals', dosya: f, satir: valid, tekil_id: valid, tabloda: n, bozuk: bad, durum: n === valid ? '✓' : '✗' }); log('live', f, '+', add);
    }
  } finally { c.release(); }
  console.table(report);
  const sz = (await pool.query("SELECT pg_size_pretty(pg_total_relation_size('vv_messages')) vv, pg_size_pretty(pg_total_relation_size('parity_signals')) ps, pg_size_pretty(pg_database_size(current_database())) db")).rows[0];
  console.log('boyut — vv_messages:', sz.vv, ' parity_signals:', sz.ps, ' veritabanı toplam:', sz.db);
  console.log(report.every(r => r.durum === '✓') ? 'SONUÇ: HEPSİ EŞİT ✓' : 'SONUÇ: FARK VAR ✗');
  await pool.end();
})().catch(e => { console.error('HATA', e.message); process.exit(1); });
