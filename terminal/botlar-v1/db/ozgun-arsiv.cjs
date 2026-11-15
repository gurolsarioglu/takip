'use strict';
// Araştırma: Binance açık arşivinden (data.binance.vision) 12 aylık 5 dk mum geçmişi + bu geçmişte aday olay dökümü.
// Veritabanına DOKUNMAZ. API anahtarı yok; arşiv sunucusu Binance API hız sınırına tabi değil.
//   node db/ozgun-arsiv.cjs indir [a|b]   → data\arastirma\k5\<COIN>.bin  (Float32: o,h,l,c,qv,tbq × N; sabit zaman ızgarası)
//   node db/ozgun-arsiv.cjs olay    → data\arastirma\arsiv-olay-*.jsonl
// Silinmiş (delist) coinler de dahildir: liste arşivin kendi dizininden okunur (hayatta kalma yanlılığı olmasın).
const fs = require('node:fs'), path = require('node:path'), zlib = require('node:zlib');
// Veri kümeleri: a = son 12 ay (arşiv) · b = önceki 12 ay (arşiv; kural dondurulduktan sonra örneklem dışı sınama) · c = 01.10–12.11.2026 (kendi veritabanımızdan; taze sınama)
const SETS = { a: ['2025-11-01', '2026-11-01', 'k5'], b: ['2024-11-01', '2025-11-01', 'k5b'], c: ['2026-10-01', '2026-11-12', 'k5c'] };
const SET = SETS[process.argv[3]] ? process.argv[3] : 'a';
const M5 = 300e3, H = 3600e3, T_START = Date.parse(SETS[SET][0] + 'T00:00:00Z'), T_END = Date.parse(SETS[SET][1] + 'T00:00:00Z'), N = (T_END - T_START) / M5, NF = 6;
const DIR = path.join(__dirname, '..', 'data', 'arastirma'), K5 = path.join(DIR, SETS[SET][2]); fs.mkdirSync(K5, { recursive: true });
const MONTHS = []; for (let d = new Date(T_START); d.getTime() < T_END; d.setUTCMonth(d.getUTCMonth() + 1)) MONTHS.push(d.toISOString().slice(0, 7));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
function unzip1(buf) {
  let e = buf.length - 22; while (e >= 0 && buf.readUInt32LE(e) !== 0x06054b50) e--; if (e < 0) throw new Error('zip sonu yok');
  const cd = buf.readUInt32LE(e + 16); if (buf.readUInt32LE(cd) !== 0x02014b50) throw new Error('zip dizini yok');
  const method = buf.readUInt16LE(cd + 10), csize = buf.readUInt32LE(cd + 20), lho = buf.readUInt32LE(cd + 42);
  const n = buf.readUInt16LE(lho + 26), m = buf.readUInt16LE(lho + 28), data = buf.subarray(lho + 30 + n + m, lho + 30 + n + m + csize);
  return method === 0 ? data : zlib.inflateRawSync(data);
}
async function get(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url); if (r.status === 404) return null; if (r.ok) return Buffer.from(await r.arrayBuffer()); if (r.status === 429 || r.status === 418) await new Promise(s => setTimeout(s, 30000)); }
    catch (e) { /* yeniden dene */ }
    await new Promise(s => setTimeout(s, 1500 * (i + 1)));
  }
  throw new Error('indirilemedi ' + url);
}
async function symbols() {
  const out = []; let marker = '';
  for (;;) {
    const b = await get('https://s3-ap-northeast-1.amazonaws.com/data.binance.vision?delimiter=/&prefix=data/futures/um/monthly/klines/' + (marker ? '&marker=' + encodeURIComponent(marker) : ''));
    const x = b.toString('utf8'), ps = [...x.matchAll(/<Prefix>data\/futures\/um\/monthly\/klines\/([^<\/]+)\/<\/Prefix>/g)].map(m => m[1]);
    out.push(...ps); const nm = x.match(/<NextMarker>([^<]+)<\/NextMarker>/);
    if (!/<IsTruncated>true<\/IsTruncated>/.test(x) || !nm) break; marker = nm[1].replace(/&amp;/g, '&');
  }
  return [...new Set(out)].filter(s => /^[A-Z0-9]+USDT$/.test(s)).sort();
}
async function indir() {
  const syms = await symbols(); log('arşivdeki USDT coin sayısı', syms.length, '| aylar', MONTHS[0], '→', MONTHS[MONTHS.length - 1]);
  fs.writeFileSync(path.join(K5, '_liste.json'), JSON.stringify(syms));
  let done = 0, files = 0, bos = 0; const q = syms.slice();
  async function worker() {
    for (let sym; (sym = q.shift());) {
      const f = path.join(K5, sym + '.bin');
      if (!fs.existsSync(f) && !fs.existsSync(f + '.yok')) {
        const A = new Float32Array(N * NF).fill(NaN); let rows = 0;
        for (const mo of MONTHS) {
          const b = await get(`https://data.binance.vision/data/futures/um/monthly/klines/${sym}/5m/${sym}-5m-${mo}.zip`); if (!b) continue; files++;
          const txt = unzip1(b).toString('latin1'); let p = 0;
          while (p < txt.length) {
            let e = txt.indexOf('\n', p); if (e < 0) e = txt.length; const c = txt.slice(p, e).split(','); p = e + 1;
            let t = Number(c[0]); if (!(t > 0)) continue; if (t > 1e14) t = Math.floor(t / 1000);
            const i = (t - T_START) / M5; if (!Number.isInteger(i) || i < 0 || i >= N) continue;
            A[i * NF] = +c[1]; A[i * NF + 1] = +c[2]; A[i * NF + 2] = +c[3]; A[i * NF + 3] = +c[4]; A[i * NF + 4] = +c[7]; A[i * NF + 5] = +c[10]; rows++;
          }
        }
        if (rows >= 2000) { fs.writeFileSync(f + '.tmp', Buffer.from(A.buffer)); fs.renameSync(f + '.tmp', f); } else { fs.writeFileSync(f + '.yok', String(rows)); bos++; }
      }
      if (++done % 25 === 0) log(done, '/', syms.length, 'coin | indirilen dosya', files, '| verisi olmayan', bos);
    }
  }
  await Promise.all([1, 2, 3, 4, 5].map(worker));
  log('indirme bitti: coin', done, 'dosya', files, 'verisi olmayan', bos);
}
async function dbden() {            // c kümesi: klines_5m tablosundan (salt okunur). Not: tabloda alıcı hacmi yok → tbq boş kalır.
  const { Pool } = require('pg'); const pool = new Pool({ ...JSON.parse(fs.readFileSync(path.join(__dirname, 'baglanti.json'), 'utf8')), max: 2 });
  const syms = (await pool.query(`SELECT DISTINCT symbol FROM klines_5m WHERE t >= $1`, [new Date(T_START)])).rows.map(r => r.symbol); let done = 0;
  for (const sym of syms) {
    const A = new Float32Array(N * NF).fill(NaN); let rows = 0;
    for (const k of (await pool.query(`SELECT extract(epoch FROM t)*1000 AS t, o, h, l, c, qv FROM klines_5m WHERE symbol=$1 AND t >= $2 AND t < $3`, [sym, new Date(T_START), new Date(T_END)])).rows) {
      const i = (Number(k.t) - T_START) / M5; if (!Number.isInteger(i) || i < 0 || i >= N) continue;
      A[i * NF] = k.o; A[i * NF + 1] = k.h; A[i * NF + 2] = k.l; A[i * NF + 3] = k.c; A[i * NF + 4] = k.qv; rows++;
    }
    if (rows >= 600) fs.writeFileSync(path.join(K5, sym + '.bin'), Buffer.from(A.buffer));
    if (++done % 200 === 0) log(done, '/', syms.length);
  }
  await pool.end(); log('veritabanından yazıldı:', done, 'coin');
}
module.exports = { T_START, T_END, N, NF, M5, H, K5, DIR, log, SET };
if (require.main === module) {
  const mode = process.argv[2];
  (mode === 'indir' ? indir() : mode === 'dbden' ? dbden() : require('./ozgun-arsiv-olay.cjs').olay()).catch(e => { console.error('HATA', e.stack); process.exit(1); });
}
