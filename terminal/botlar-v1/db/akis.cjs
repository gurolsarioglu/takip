'use strict';
// Akış toplayıcı (V1.16.0) — SÜREKLİ çalışır (denetçi parçası "akis"). Binance'in sonradan VERMEDİĞİ akışları veritabanına yazar:
//   tasfiye     : bütün coinlerin tasfiyeleri (!forceOrder@arr). Binance coin başına saniyede en fazla 1 tasfiye bildirir → toplamlar ALT SINIRDIR.
//   buyuk_islem : bütün coinlerde tek seferde ≥ max(25.000 $, 24s hacmin %0,005'i) piyasa işlemleri (<sym>@aggTrade; m=true → agresif taraf SATICI).
//   akis_kapsam : her dakika kaç soketin bağlı olduğu ve kaç kayıt geldiği (ölçümde eksik dakikaları ayırmak için).
// Binance'e ~5 WebSocket (200 akış/soket; motorla aynı yol /market/stream). REST yalnız saatte bir: exchangeInfo (ağırlık 1) + ticker/24hr (40).
// 5 dk alış/satış (CVD) burada değil: klines_5m.qb (db/mumlar.cjs). Durum: data/live/akis.json. Çalıştırma: node db/akis.cjs
const fs = require('node:fs'), path = require('node:path'), { Pool } = require('pg');
const pool = new Pool({ ...JSON.parse(fs.readFileSync(path.join(__dirname, 'baglanti.json'), 'utf8')), max: 2 });
const STATUS = path.join(__dirname, '..', 'data', 'live', 'akis.json');
const WSURL = 'wss://fstream.binance.com/market/stream', FAPI = 'https://fapi.binance.com', MIN_USD = 25000, PAY = 5e-5, PER_SOCK = 200, BUF_MAX = 200000;
const log = (...a) => console.log(new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }), ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const SCHEMA = `
CREATE TABLE IF NOT EXISTS tasfiye (symbol text NOT NULL, t timestamptz NOT NULL, yon char(1) NOT NULL, fiyat double precision, adet double precision NOT NULL, usd double precision,
  PRIMARY KEY (symbol, t, yon, adet));
CREATE INDEX IF NOT EXISTS tasfiye_t ON tasfiye (t);
CREATE TABLE IF NOT EXISTS buyuk_islem (symbol text NOT NULL, id bigint NOT NULL, t timestamptz NOT NULL, yon char(1) NOT NULL, fiyat double precision, usd double precision,
  PRIMARY KEY (symbol, id));
CREATE INDEX IF NOT EXISTS buyuk_islem_t ON buyuk_islem (t);
CREATE INDEX IF NOT EXISTS buyuk_islem_st ON buyuk_islem (symbol, t);
CREATE TABLE IF NOT EXISTS akis_kapsam (t timestamptz PRIMARY KEY, bagli int, toplam int, tasfiye int, buyuk int, mesaj int);`;

const S = { syms: [], thr: new Map(), socks: [], liq: [], big: [], msgs: 0, minMsgs: 0, minLiq: 0, minBig: 0, totLiq: 0, totBig: 0, since: Date.now(), lastErr: '', refreshedAt: 0, dropped: 0 };

async function get(url) {
  for (let a = 0; a < 4; a++) {
    try {
      const r = await fetch(url);
      if (r.status === 429 || r.status === 418) { const ra = Number(r.headers.get('retry-after') || 60); log('Binance sınırı, bekleniyor', ra, 'sn'); await sleep(ra * 1000 + 5000); continue; }
      const j = await r.json(); if (!r.ok) throw new Error(j.msg || 'HTTP ' + r.status); return j;
    } catch (e) { if (a === 3) throw e; await sleep(5000 * (a + 1)); }
  }
}
// sembol listesi ve büyük işlem eşikleri (saatte bir)
async function refresh() {
  const info = await get(FAPI + '/fapi/v1/exchangeInfo'), tick = await get(FAPI + '/fapi/v1/ticker/24hr');
  const syms = info.symbols.filter(s => s.status === 'TRADING' && ['USDT', 'USDC'].includes(s.quoteAsset) && /PERPETUAL/.test(s.contractType)).map(s => s.symbol).sort();
  const vol = new Map(tick.map(t => [t.symbol, Number(t.quoteVolume) || 0]));
  for (const s of syms) S.thr.set(s, Math.max(MIN_USD, (vol.get(s) || 0) * PAY));
  S.refreshedAt = Date.now();
  if (syms.join() !== S.syms.join()) { const add = syms.filter(s => !S.syms.includes(s)).length, rem = S.syms.filter(s => !syms.includes(s)).length; S.syms = syms; log('sembol listesi:', syms.length, `(+${add} / −${rem})`); rebuild(); }
}
function sock(streams) {
  const so = { streams, ws: null, last: 0, dead: false };
  const open = () => {
    if (so.dead) return; let ws; try { ws = new WebSocket(WSURL + '?streams=' + streams.join('/')); } catch (e) { S.lastErr = String(e.message || e); setTimeout(open, 5000); return; }
    so.ws = ws; so.last = Date.now();
    ws.onmessage = e => {
      so.last = Date.now(); S.msgs++; S.minMsgs++;
      let m; try { m = JSON.parse(typeof e.data === 'string' ? e.data : String(e.data)); } catch { return; }
      const d = m && m.data; if (!d) return;
      if (d.e === 'aggTrade') {
        const p = Number(d.p), v = p * Number(d.q), th = S.thr.get(d.s); if (!(th && v >= th)) return;
        S.big.push([d.s, d.a, d.T, d.m ? 'S' : 'A', p, Math.round(v * 100) / 100]); S.minBig++; S.totBig++; return;
      }
      if (d.e === 'forceOrder' && d.o) {
        const o = d.o, px = Number(o.ap) || Number(o.p), q = Number(o.z) || Number(o.q); if (!(px > 0 && q > 0)) return;
        S.liq.push([o.s, Number(o.T) || Date.now(), o.S === 'SELL' ? 'L' : 'S', px, q, Math.round(px * q * 100) / 100]); S.minLiq++; S.totLiq++;
      }
    };
    ws.onerror = e => { S.lastErr = String((e && e.message) || 'WebSocket hatası'); };
    ws.onclose = () => { if (so.ws === ws) so.ws = null; if (!so.dead) setTimeout(open, 3000); };
  };
  open(); return so;
}
function rebuild() {
  for (const so of S.socks) { so.dead = true; try { so.ws && so.ws.close(); } catch { } }
  const st = S.syms.map(s => s.toLowerCase() + '@aggTrade'), groups = [['!forceOrder@arr']];
  for (let i = 0; i < st.length; i += PER_SOCK) groups.push(st.slice(i, i + PER_SOCK));
  S.socks = groups.map(sock); log('soketler kuruldu:', S.socks.length, 'soket,', S.syms.length, 'coin');
}
async function insert(sql, cols, rows) {
  for (let i = 0; i < rows.length; i += 1000) {
    const part = rows.slice(i, i + 1000), vals = [], ph = part.map((r, j) => { vals.push(...r); const b = j * cols; return '(' + Array.from({ length: cols }, (_, k) => '$' + (b + k + 1)).join(',') + ')'; });
    await pool.query(sql.replace('$VALUES', ph.join(',')), vals);
  }
}
let flushing = false;
async function flush() {
  if (flushing) return; flushing = true;
  const liq = S.liq.splice(0), big = S.big.splice(0);
  try {
    if (liq.length) await insert('INSERT INTO tasfiye (symbol,t,yon,fiyat,adet,usd) VALUES $VALUES ON CONFLICT DO NOTHING', 6, liq.map(r => [r[0], new Date(r[1]), r[2], r[3], r[4], r[5]]));
    if (big.length) await insert('INSERT INTO buyuk_islem (symbol,id,t,yon,fiyat,usd) VALUES $VALUES ON CONFLICT DO NOTHING', 6, big.map(r => [r[0], r[1], new Date(r[2]), r[3], r[4], r[5]]));
  } catch (e) {
    S.lastErr = 'veritabanı: ' + e.message; log('yazılamadı, tekrar denenecek:', e.message);
    S.liq.unshift(...liq); S.big.unshift(...big);   // veritabanı dönünce yazılır; bellek sınırı aşılırsa en eskiler atılır
    if (S.liq.length + S.big.length > BUF_MAX) { const n = S.liq.length + S.big.length - BUF_MAX; S.dropped += n; S.big.splice(0, Math.min(n, S.big.length)); }
  } finally { flushing = false; }
}
let lastMin = Math.floor(Date.now() / 60e3) * 60e3;
async function minute() {
  const m = Math.floor(Date.now() / 60e3) * 60e3; if (m === lastMin) return;
  const t = lastMin; lastMin = m;
  const bagli = S.socks.filter(so => so.ws && so.ws.readyState === 1 && Date.now() - so.last < 60e3).length, row = [new Date(t), bagli, S.socks.length, S.minLiq, S.minBig, S.minMsgs];
  S.minLiq = S.minBig = S.minMsgs = 0;
  try { await pool.query('INSERT INTO akis_kapsam (t,bagli,toplam,tasfiye,buyuk,mesaj) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (t) DO NOTHING', row); } catch (e) { S.lastErr = 'kapsam: ' + e.message; }
  S.lastMinute = { t: new Date(t).toISOString(), bagli, toplam: S.socks.length, tasfiye: row[3], buyuk: row[4], mesaj: row[5] };
}
function status() {
  const o = { at: new Date().toISOString(), since: new Date(S.since).toISOString(), coin: S.syms.length, soket: S.socks.length, bagli: S.socks.filter(so => so.ws && so.ws.readyState === 1).length,
    sonDakika: S.lastMinute || null, toplamTasfiye: S.totLiq, toplamBuyuk: S.totBig, bekleyen: S.liq.length + S.big.length, atilan: S.dropped, sonHata: S.lastErr || null, listeYenilendi: new Date(S.refreshedAt).toISOString() };
  try { fs.writeFileSync(STATUS + '.tmp', JSON.stringify(o, null, 1)); fs.renameSync(STATUS + '.tmp', STATUS); } catch { }
}
(async () => {
  await pool.query(SCHEMA);
  log('akış toplayıcı başladı');
  for (;;) { try { await refresh(); break; } catch (e) { log('ilk liste alınamadı:', e.message); await sleep(30e3); } }
  setInterval(() => { refresh().catch(e => { S.lastErr = 'liste: ' + e.message; log('liste yenilenemedi:', e.message); }); }, 3600e3);
  setInterval(() => { flush(); }, 5000);
  setInterval(() => { minute(); }, 2000);
  setInterval(() => { for (const so of S.socks) if (so.ws && Date.now() - so.last > 45e3) { log('sessiz soket yenileniyor'); try { so.ws.close(); } catch { } } }, 15e3);
  setInterval(status, 30e3); status();
  setInterval(() => log(`başlangıçtan beri: tasfiye ${S.totLiq}, büyük işlem ${S.totBig} · bağlı ${S.socks.filter(so => so.ws && so.ws.readyState === 1).length}/${S.socks.length}`), 600e3);
  const bye = async () => { try { await flush(); await pool.end(); } catch { } process.exit(0); };
  process.on('SIGTERM', bye); process.on('SIGINT', bye);
})().catch(e => { console.error('HATA', e.message); process.exit(1); });
