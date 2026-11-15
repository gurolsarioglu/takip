'use strict';
// Terminal deneme sunucusu — Binance'e ve veritabanına DOKUNMADAN terminal sayfasını açmak için. Sahte fetch (rastgele yürüyüşle mum/OI/ticker),
// bellek içi izleme tablosu, sahte sinyaller. web/terminal.cjs'nin gerçek kuyruk/önbellek kodu çalışır (aralıklar, ağırlık başlığı dahil).
// Çalıştır: node db/terminal-deneme.cjs  → http://127.0.0.1:3299/terminal.html   (yalnız 127.0.0.1)
// Sınır denemesi: /deneme/429?sn=10 ya da /deneme/418?sn=20 → bir sonraki sahte Binance isteği o yanıtı döner. DENEME_DB=yok → veritabanı yokmuş gibi.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const terminal = require('../web/terminal.cjs');

const PORT = 3299, HOST = '127.0.0.1', PUB = path.join(__dirname, '..', 'web', 'public'), BOOT = Date.now();
const VERSION = (() => { try { return fs.readFileSync(path.join(__dirname, '..', 'VERSION'), 'utf8').trim(); } catch { return '?'; } })();
const log = (...a) => console.log(new Date().toISOString(), ...a);
const H = 3600e3, D = 24 * H;

// ---------- Sahte piyasa ----------
// [başlangıç fiyatı, kaç gün önce listelendi, saatlik oynaklık]
const SYMS = { BTCUSDT: [95000, 2400, 0.006], ETHUSDT: [3500, 2400, 0.008], SOLUSDT: [150, 1500, 0.011], BNBUSDT: [620, 2000, 0.007], XRPUSDT: [0.62, 2000, 0.01],
  DOGEUSDT: [0.16, 1800, 0.012], ADAUSDT: [0.45, 2000, 0.01], LINKUSDT: [14.2, 1900, 0.011], AVAXUSDT: [28, 1400, 0.012], SUIUSDT: [3.1, 700, 0.015],
  '1000PEPEUSDT': [0.0112, 900, 0.018], AKEUSDT: [0.001234, 300, 0.02], TINYUSDT: [0.00001234, 500, 0.02], NEWUSDT: [2.5, 10, 0.025], ARBUSDT: [0.55, 900, 0.013],
  OPUSDT: [1.4, 1000, 0.013], APTUSDT: [6.2, 1000, 0.013], WIFUSDT: [1.9, 600, 0.02], TIAUSDT: [4.8, 700, 0.016], INJUSDT: [17, 1000, 0.014] };
function prng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const WALK = new Map(); // sembol → { t0, h: [saatlik log fiyat] }
function walk(sym) {
  let w = WALK.get(sym); const endH = Math.floor(Date.now() / H) + 3;
  if (!w) { const [p0, days] = SYMS[sym]; const t0 = Math.floor((BOOT - days * D) / H) * H; w = { t0, h: [Math.log(p0)], r: prng(hash(sym)) }; WALK.set(sym, w); }
  const vol = SYMS[sym][2]; while (w.t0 / H + w.h.length < endH) { const g = (w.r() + w.r() + w.r() - 1.5) * 2; w.h.push(w.h[w.h.length - 1] + g * vol); }
  return w;
}
// Fiyat: saatlik yürüyüşün ara değeri × gün içi dalgalanma. Saatlik yürüyüş, BOOT anındaki fiyat başlangıç fiyatına eşit olacak şekilde kaydırılır.
function price(sym, t) {
  const w = walk(sym), k = Math.max(0, (t - w.t0) / H), i = Math.max(0, Math.min(w.h.length - 2, Math.floor(k))), f = k - i;
  const kb = Math.min(w.h.length - 1, Math.floor((BOOT - w.t0) / H)), shift = Math.log(SYMS[sym][0]) - w.h[kb];
  const s = hash(sym) % 1000, n = 0.0016 * Math.sin(t / 420e3 + s) + 0.0022 * Math.sin(t / 1380e3 + s * 2) + 0.003 * Math.sin(t / 3660e3 + s * 3) + 0.0008 * Math.sin(t / 61e3 + s);
  return Math.exp(w.h[i] * (1 - f) + w.h[i + 1] * f + shift + n);
}
const listedAt = sym => walk(sym).t0;
const IV = { '1m': 60e3, '3m': 180e3, '5m': 300e3, '15m': 900e3, '30m': 1800e3, '1h': H, '2h': 2 * H, '4h': 4 * H, '6h': 6 * H, '8h': 8 * H, '12h': 12 * H, '1d': D, '3d': 3 * D, '1w': 7 * D, '1M': 0 };
function openOf(t, iv) {
  if (iv === '1M') { const d = new Date(t); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1); }
  if (iv === '1w') { const mon0 = Date.UTC(1970, 0, 5); return mon0 + Math.floor((t - mon0) / (7 * D)) * 7 * D; }
  return Math.floor(t / IV[iv]) * IV[iv];
}
const nextOpen = (o, iv) => { if (iv === '1M') { const d = new Date(o); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1); } return o + (iv === '1w' ? 7 * D : IV[iv]); };
const prevOpen = (o, iv) => { if (iv === '1M') { const d = new Date(o); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1); } return o - (iv === '1w' ? 7 * D : IV[iv]); };
const str = (v, p) => { const d = Math.max(0, Math.min(12, 5 - Math.floor(Math.log10(p)))); return v.toFixed(d); };
function bar(sym, o, iv) {
  const now = Date.now(), e = Math.min(nextOpen(o, iv), now), s0 = Math.max(o, listedAt(sym)), p0 = price(sym, s0), pc = price(sym, e);
  let hi = Math.max(p0, pc), lo = Math.min(p0, pc); const N = 24;
  for (let k = 1; k < N; k++) { const p = price(sym, s0 + (e - s0) * k / N); if (p > hi) hi = p; if (p < lo) lo = p; }
  const r = prng(hash(sym + iv + o)), dur = Math.max(60e3, e - o) / H, base = SYMS[sym][0] > 1000 ? 4e8 : SYMS[sym][0] > 100 ? 8e7 : 6e6;
  const qv = base * dur * (0.4 + r() * 1.2) * (1 + 3 * Math.abs(pc / p0 - 1) * 50), vol = qv / ((p0 + pc) / 2);
  const ref = SYMS[sym][0];
  return [o, str(p0, ref), str(hi, ref), str(lo, ref), str(pc, ref), vol.toFixed(3), nextOpen(o, iv) - 1, qv.toFixed(4), Math.round(qv / 3000), (vol * 0.5).toFixed(3), (qv * 0.5).toFixed(4), '0'];
}
const lsVal = (sym, t, k) => { const s = hash(sym) % 1000 + k * 77; return 55 + 9 * Math.sin(t / (2.7 * D) + s) + 4 * Math.sin(t / (9 * H) + s * 2); };
const frVal = (sym, t) => { const s = hash(sym) % 1000; return 0.0001 + 0.0003 * Math.sin(t / (3 * D) + s) - (sym === 'AKEUSDT' ? 0.003 : 0); };
const oiAdet = (sym, t) => { const s = hash(sym) % 1000, base = 4e8 / SYMS[sym][0]; return base * (1 + 0.18 * Math.sin(t / (3.3 * D) + s) + 0.06 * Math.sin(t / (7 * H) + s) + 0.02 * Math.sin(t / (37 * 60e3) + s)); };

// ---------- Sahte Binance (fetch) ----------
let weight = { min: 0, w: 0 }, forced = null, nReq = 0;
const W = (p, u) => p === '/fapi/v1/klines' ? (Number(u.searchParams.get('limit')) > 500 ? 5 : Number(u.searchParams.get('limit')) >= 100 ? 2 : 1) : p === '/fapi/v1/ticker/24hr' ? 40 : 1;
function fakeFetch(url, init) {
  return new Promise((ok, no) => {
    const tm = setTimeout(() => { try { ok(answer(url)); } catch (e) { no(e); } }, 15 + Math.random() * 60);
    if (init && init.signal) init.signal.addEventListener('abort', () => { clearTimeout(tm); no(new Error('aborted')); });
  });
}
function answer(url) {
  const u = new URL(url), p = u.pathname, q = k => u.searchParams.get(k), now = Date.now(), m = Math.floor(now / 60e3);
  nReq++;
  if (weight.min !== m) weight = { min: m, w: 0 };
  weight.w += W(p, u);
  const hd = { 'content-type': 'application/json', 'x-mbx-used-weight-1m': String(weight.w) };
  const J = (code, body) => new Response(JSON.stringify(body), { status: code, headers: hd });
  if (forced) { const f = forced; forced = null; log(`deneme: zorlanmış HTTP ${f.code} (retry-after ${f.sn})`); return new Response(JSON.stringify({ code: -1003, msg: 'deneme sınırı' }), { status: f.code, headers: { ...hd, 'retry-after': String(f.sn) } }); }
  const sym = q('symbol');
  if (p === '/fapi/v1/ticker/24hr') {
    const rows = Object.keys(SYMS).map(s => { const last = price(s, now), prev = price(s, now - D); return { symbol: s, priceChange: String(last - prev), priceChangePercent: ((last / prev - 1) * 100).toFixed(3), lastPrice: str(last, SYMS[s][0]), quoteVolume: (bar(s, openOf(now, '1d'), '1d')[7] * 1).toFixed(2), openTime: now - D, closeTime: now }; });
    rows.push({ symbol: 'BTCUSDC', lastPrice: '95000', priceChangePercent: '0', quoteVolume: '1', closeTime: now }, { symbol: 'ESKIUSDT', lastPrice: '1', priceChangePercent: '0', quoteVolume: '1', closeTime: now - 40 * D });
    return J(200, rows);
  }
  if (p === '/fapi/v1/exchangeInfo') return J(200, { symbols: Object.keys(SYMS).map(s => ({ symbol: s, contractType: 'PERPETUAL', quoteAsset: 'USDT', status: 'TRADING', onboardDate: listedAt(s),
    deliveryDate: s === 'TIAUSDT' ? now + 2 * D + 5 * H : s === 'INJUSDT' ? now + 9 * H : 4133404800000 })) });
  if (!sym || !SYMS[sym]) return J(400, { code: -1121, msg: 'Invalid symbol.' });
  if (p === '/fapi/v1/klines') {
    const iv = q('interval'), lim = Math.min(1500, Number(q('limit')) || 500), end = Math.min(now, Number(q('endTime')) || now);
    if (!(iv in IV)) return J(400, { code: -1120, msg: 'Invalid interval.' });
    const out = [], first = listedAt(sym); let o = openOf(end, iv);
    while (out.length < lim && nextOpen(o, iv) > first) { out.push(bar(sym, o, iv)); o = prevOpen(o, iv); }
    return J(200, out.reverse());
  }
  if (p === '/futures/data/openInterestHist') {
    const per = IV[q('period')]; if (!per || per > D) return J(400, { code: -1120, msg: 'Invalid period.' });
    const lim = Math.min(500, Number(q('limit')) || 30), last = Math.floor(now / per) * per, from = Math.max(now - 30 * D, listedAt(sym)), out = [];
    for (let t = last; out.length < lim && t >= from; t -= per) { const a = oiAdet(sym, t); out.push({ symbol: sym, sumOpenInterest: a.toFixed(3), sumOpenInterestValue: (a * price(sym, t)).toFixed(8), timestamp: t }); }
    return J(200, out.reverse());
  }
  if (/^\/futures\/data\/(top|global)LongShort/.test(p)) {
    const per = IV[q('period')] || 900e3, lim = Math.min(500, Number(q('limit')) || 30), last = Math.floor(now / per) * per, k = p.includes('global') ? 1 : p.includes('Position') ? 2 : 3, out = [];
    for (let t = last; out.length < lim; t -= per) out.push({ symbol: sym, longAccount: (lsVal(sym, t, k) / 100).toFixed(4), timestamp: t });
    return J(200, out.reverse());
  }
  if (p === '/fapi/v1/fundingRate') { const out = []; for (let t = Math.floor(now / (8 * H)) * 8 * H; out.length < 300; t -= 8 * H) out.push({ symbol: sym, fundingRate: frVal(sym, t).toFixed(8), fundingTime: t }); return J(200, out.reverse()); }
  if (p === '/fapi/v1/depth') { const mk = price(sym, now), r = prng(hash(sym) + Math.floor(now / 10e3)); return J(200, { bids: [[String(mk * 0.999), String(1e6 / mk * (0.6 + r()))]], asks: [[String(mk * 1.001), String(1e6 / mk * (0.6 + r()))]] }); }
  if (p === '/fapi/v1/openInterest') return J(200, { symbol: sym, openInterest: oiAdet(sym, now).toFixed(3), time: now });
  if (p === '/fapi/v1/premiumIndex') {
    const mk = price(sym, now), s = hash(sym) % 1000, fr = 0.0001 + 0.0004 * Math.sin(now / (5 * H) + s) - (sym === 'AKEUSDT' ? 0.004 : 0);
    return J(200, { symbol: sym, markPrice: str(mk, SYMS[sym][0]), indexPrice: str(mk * 0.9998, SYMS[sym][0]), estimatedSettlePrice: str(mk, SYMS[sym][0]), lastFundingRate: fr.toFixed(8), interestRate: '0.00010000', nextFundingTime: (Math.floor(now / (8 * H)) + 1) * 8 * H, time: now });
  }
  return J(404, { code: -1, msg: 'deneme: bilinmeyen uç ' + p });
}

// ---------- Bellek içi veritabanı (yalnız izleme tablosu) ----------
const DB = { exists: false, rows: [], seq: 0 };
async function q(sql, args) {
  if (process.env.DENEME_DB === 'yok') throw new Error('deneme: veritabanı kapalı (DENEME_DB=yok)');
  if (sql.startsWith('SELECT to_regclass')) return [{ r: DB.exists ? 'izleme' : null }];
  if (sql.startsWith('CREATE TABLE IF NOT EXISTS izleme')) { DB.exists = true; return []; }
  if (sql.startsWith('INSERT INTO izleme')) { if (!DB.rows.some(r => r.symbol === args[0])) DB.rows.push({ symbol: args[0], sira: ++DB.seq }); return []; }
  if (sql.startsWith('SELECT symbol FROM izleme')) return DB.rows.map(r => ({ symbol: r.symbol }));
  if (sql === 'DELETE FROM izleme WHERE symbol = $1') { DB.rows = DB.rows.filter(r => r.symbol !== args[0]); return []; }
  // alt panel tabloları: son 6 saat "veritabanında yok" (gerçekteki gibi Binance'ten tamamlanır)
  if (/FROM ls_15m|FROM oi_5m/.test(sql)) {
    const sym = args[0], from = +args[1], step = Number(String(args[2]).split(' ')[0]) * 1000, end = Date.now() - 6 * H, out = [], ls = sql.includes('ls_15m'), base = ls ? 900e3 : 300e3;
    if (!SYMS[sym]) return [];
    for (let b = Math.floor(Math.max(from, Date.now() - 34 * D) / step) * step; b < end; b += step) { const t = Math.min(b + step - base, Math.floor(end / base) * base); if (t < from) continue; out.push(ls ? { t, a: lsVal(sym, t, 3) / 100, g: lsVal(sym, t, 1) / 100, p: lsVal(sym, t, 2) / 100 } : { t, v: oiAdet(sym, t) * price(sym, t) }); }
    return out;
  }
  throw new Error('deneme: bilinmeyen SQL ' + sql);
}

// ---------- Sahte sinyaller ----------
const BOTS = [['m1', 'M1'], ['m1-premium', 'M1 Premium'], ['4s', '4S'], ['4sniper', '4S Sniper'], ['1dws', '1DWS'], ['div', 'DIV'], ['fr', 'FR'], ['v3', 'V3'], ['hammer', 'Hammer']];
function sigs(sym) {
  if (!SYMS[sym]) return [];
  const r = prng(hash('sig' + sym + Math.floor(BOOT / H))), out = [], now = Date.now(); let id = 1;
  for (let t = now - 47 * H; t < now; t += (0.3 + r() * 2.5) * H) {
    const b = BOTS[Math.floor(r() * BOTS.length)][0], dir = b === 'v3' || r() < 0.08 ? null : r() < 0.5 ? 'up' : 'down';
    const strat = { '4sniper': r() < 0.5 ? 'NW UP' : '4H RSI DIVERGENCE', div: '1H RSI DIVERGENCE', fr: 'FR deeper', v3: 'V3-A', '1dws': 'NW DOWN' }[b] || null;
    out.push({ bot: b, id: id++, seq: id, t, first: t, n: b.startsWith('m1') ? 1 + Math.floor(r() * 6) : 1, symbol: sym, dir, strategy: strat, text: `deneme sinyali ${b}`, price: price(sym, t) });
  }
  return out.sort((a, b) => b.t - a.t);
}

// ---------- HTTP ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const send = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(obj)); };
const readBody = req => new Promise((ok, no) => { let s = ''; req.on('data', c => { s += c; if (s.length > 1e6) req.destroy(); }); req.on('end', () => { try { ok(JSON.parse(s || '{}')); } catch (e) { no(e); } }); });
const stamp = () => { let m = 0; for (const f of fs.readdirSync(PUB)) { try { m = Math.max(m, fs.statSync(path.join(PUB, f)).mtimeMs); } catch { } } return `${BOOT}-${Math.round(m)}`; };

const server = http.createServer((req, res) => {
  try {
    const u = new URL(req.url, 'http://x');
    if (u.pathname.startsWith('/api/t/') && terminal.handle(req, res, u, { q, send, readBody, log, fetch: fakeFetch })) return;
    if (u.pathname === '/deneme/429' || u.pathname === '/deneme/418') { forced = { code: Number(u.pathname.slice(-3)), sn: Number(u.searchParams.get('sn') || 10) }; return send(res, 200, { tamam: true, sonrakiIstek: forced }); }
    if (u.pathname === '/deneme/durum') return send(res, 200, { sahteBinanceIstegi: nReq, agirlik: weight.w, izleme: DB.rows.map(r => r.symbol) });
    if (u.pathname === '/api/version') return send(res, 200, { version: VERSION + '-deneme', stamp: stamp() });
    if (u.pathname === '/api/status') return send(res, 200, { version: VERSION + '-deneme', engine: { ok: false }, now: Date.now() });
    if (u.pathname === '/api/bots') return send(res, 200, BOTS.map(([id, name]) => ({ id, name, desc: 'deneme', n24: 0, n1: 0, last: null })));
    if (u.pathname === '/api/messages') { const s = (u.searchParams.get('sym') || '').toUpperCase(); const it = s ? sigs(s) : []; return send(res, 200, { maxSeq: it.length, items: it.slice(0, Math.min(500, Number(u.searchParams.get('limit') || 200))) }); }
    if (u.pathname.startsWith('/api/')) return send(res, 503, { error: 'deneme sunucusunda yok' });
    const f = path.join(PUB, u.pathname === '/' ? 'terminal.html' : path.normalize(u.pathname).replace(/^([/\\])+/, ''));
    if (!f.startsWith(PUB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('yok'); }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    fs.createReadStream(f).pipe(res);
  } catch (e) { send(res, 500, { error: e.message }); }
});
server.listen(PORT, HOST, () => log(`Terminal deneme sunucusu → http://${HOST}:${PORT}/terminal.html  (sahte veri; Binance ve veritabanı kullanılmıyor)`));
