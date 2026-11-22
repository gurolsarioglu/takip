'use strict';
// CoinGecko'dan coin arzı ve değer bilgisi (V1.21.0): piyasa özetindeki "Arz ve değer" bölümü için. web/terminal.cjs kullanır: GET /api/t/arz?symbol.
// Anahtar db/coingecko.json {"key": "CG-…"} (Demo planı; git'e girmez, içeriği loga yazılmaz). Anahtar yoksa hiç istek atılmaz.
// Bütçe (Demo: 10.000 istek/ay): eşleme günde bir (/coins/list + aday coinler için /coins/markets), veri 30 dk'da bir yalnız eşleşen coinler
// (~800 coin → 4 istek) → ayda ~6–7 bin. İstekler sırayla, en az 2,5 sn arayla; 429 → 90 sn bekleme. Sonuç data/cache/coingecko.json'a yazılır.
// Eşleme: Binance sembolü (1000PEPEUSDT → PEPE ×1000) CoinGecko'da aynı kısaltmalı adaylar arasından FİYATI ±%12 tutan, en büyük piyasa değerli coin.
// Tutan aday yoksa coin eşlenmez ("—" gösterilir; yanlış coinin arzını göstermektense boş).
const fs = require('node:fs'), path = require('node:path');
const BASE = 'https://api.coingecko.com/api/v3', GAP = 2500, MAP_TTL = 24 * 3600e3, DATA_TTL = 30 * 60e3, CHUNK = 200, TOL = 0.12;
// Binance adı CoinGecko kısaltmasından farklı olanlar (fiyat denetimi yine yapılır)
const ALIAS = { luna2: 'luna', beamx: 'beam', raysol: 'ray', bnx: 'bnx', 'broccoli714': 'broccoli' };
const MULT = [['1000000', 1e6], ['1M', 1e6], ['100000', 1e5], ['10000', 1e4], ['1000', 1e3], ['100', 1e2]];
// Binance sembolü → [kısaltma, çarpan]. 1000PEPE → ['pepe', 1000]; çarpansız → [ad, 1]
function baseOf(sym) {
  const b = String(sym).replace(/(USDT|USDC)$/, '');
  const al = x => ALIAS[x] || x;
  for (const [p, m] of MULT) if (b.length > p.length + 1 && b.startsWith(p) && /^[A-Z]/.test(b.slice(p.length))) return [al(b.slice(p.length).toLowerCase()), m];
  return [al(b.toLowerCase()), 1];
}
const num = v => { const n = Number(v); return v != null && Number.isFinite(n) ? n : null; };
function pick(x) {
  return { id: x.id, name: x.name, rank: num(x.market_cap_rank), mcap: num(x.market_cap), fdv: num(x.fully_diluted_valuation), vol: num(x.total_volume), px: num(x.current_price),
    circ: num(x.circulating_supply), total: num(x.total_supply), max: num(x.max_supply), ath: num(x.ath), athChg: num(x.ath_change_percentage), athDate: x.ath_date || null,
    ch7: num(x.price_change_percentage_7d_in_currency), ch30: num(x.price_change_percentage_30d_in_currency) };
}

function create(opt = {}) {
  const now = opt.now || Date.now, sleep = opt.sleep || (ms => new Promise(r => setTimeout(r, ms))), log = opt.log || console.log;
  const keyFile = opt.keyFile || path.join(__dirname, '..', 'db', 'coingecko.json'), cacheFile = opt.cacheFile || path.join(__dirname, '..', 'data', 'cache', 'coingecko.json');
  const S = { map: {}, mapAt: 0, data: {}, dataAt: 0, calls: [], err: '', busy: false, lastCall: -1e15, blockUntil: 0, loaded: false };
  const key = () => { try { const k = JSON.parse(fs.readFileSync(keyFile, 'utf8').replace(/^﻿/, '')).key; return typeof k === 'string' && k.length > 8 ? k : null; } catch (e) { return null; } };
  function load() {
    if (S.loaded) return; S.loaded = true;
    try { const c = JSON.parse(fs.readFileSync(cacheFile, 'utf8')); Object.assign(S, { map: c.map || {}, mapAt: c.mapAt || 0, data: c.data || {}, dataAt: c.dataAt || 0, calls: (c.calls || []).filter(t => now() - t < 31 * 864e5) }); } catch (e) { }
  }
  function save() { try { fs.mkdirSync(path.dirname(cacheFile), { recursive: true }); fs.writeFileSync(cacheFile + '.tmp', JSON.stringify({ map: S.map, mapAt: S.mapAt, data: S.data, dataAt: S.dataAt, calls: S.calls })); fs.renameSync(cacheFile + '.tmp', cacheFile); } catch (e) { log('coingecko: önbellek yazılamadı', e.message); } }
  async function call(f, p) {
    const k = key(); if (!k) throw new Error('CoinGecko anahtarı yok (db/coingecko.json)');
    if (now() < S.blockUntil) throw new Error('CoinGecko sınırı: bekleniyor');
    const w = S.lastCall + GAP - now(); if (w > 0) await sleep(w);
    S.lastCall = now(); S.calls.push(S.lastCall);
    const ac = new AbortController(), tm = setTimeout(() => ac.abort(), 20e3);
    let r; try { r = await f(BASE + p, { signal: ac.signal, headers: { accept: 'application/json', 'x-cg-demo-api-key': k } }); } finally { clearTimeout(tm); }
    if (r.status === 429) { S.blockUntil = now() + 90e3; throw new Error('CoinGecko 429 (sınır)'); }
    if (!r.ok) throw new Error('CoinGecko HTTP ' + r.status);
    return r.json();
  }
  const markets = (f, ids) => call(f, `/coins/markets?vs_currency=usd&ids=${ids.map(encodeURIComponent).join(',')}&per_page=250&page=1&sparkline=false&price_change_percentage=7d,30d`);
  // günde bir: Binance sembollerini CoinGecko coinleriyle eşle (prices: {SYM: son fiyat})
  async function remap(f, prices) {
    const list = await call(f, '/coins/list'); if (!Array.isArray(list)) throw new Error('CoinGecko liste yanıtı beklenen biçimde değil');
    const bySym = new Map(); for (const x of list) { if (!x || !x.id || !x.symbol) continue; const s = String(x.symbol).toLowerCase(); if (!bySym.has(s)) bySym.set(s, []); bySym.get(s).push(x.id); }
    const want = new Map(), ids = new Set();   // SYM → [kısaltma, çarpan, adaylar]
    for (const sym of Object.keys(prices)) { const [b, m] = baseOf(sym), c = bySym.get(b); if (c && c.length && c.length <= 120) { want.set(sym, [b, m, c]); for (const id of c) ids.add(id); } }
    const info = new Map(), all = [...ids];
    for (let i = 0; i < all.length; i += CHUNK) for (const x of await markets(f, all.slice(i, i + CHUNK))) if (x && x.id) info.set(x.id, x);
    const map = {}, data = {};
    for (const [sym, [, m, c]] of want) {
      const bp = prices[sym]; if (!(bp > 0)) continue;
      let best = null;
      for (const id of c) { const x = info.get(id); if (!x || !(x.current_price > 0)) continue; const r = x.current_price * m / bp; if (Math.abs(r - 1) > TOL) continue; if (!best || (x.market_cap || 0) > (best.market_cap || 0)) best = x; }
      if (best) { map[sym] = { id: best.id, mult: m }; data[sym] = pick(best); }
    }
    S.map = map; S.mapAt = now(); S.data = data; S.dataAt = now();
    log(`coingecko: eşleme ${Object.keys(map).length}/${Object.keys(prices).length} sembol, ${all.length} aday, ${Math.ceil(all.length / CHUNK) + 1} istek`);
  }
  async function refresh(f) {
    const syms = Object.keys(S.map), byId = new Map(); for (const s of syms) { const id = S.map[s].id; if (!byId.has(id)) byId.set(id, []); byId.get(id).push(s); }
    const ids = [...byId.keys()], data = {};
    for (let i = 0; i < ids.length; i += CHUNK) for (const x of await markets(f, ids.slice(i, i + CHUNK))) if (x && byId.has(x.id)) for (const s of byId.get(x.id)) data[s] = pick(x);
    S.data = data; S.dataAt = now();
  }
  // istek gelince arka planda tazele (bekletmez); prices() Binance son fiyatlarını verir
  function tick(f, prices) {
    load();
    if (S.busy || !key() || now() < S.blockUntil) return;
    const needMap = now() - S.mapAt > MAP_TTL, needData = now() - S.dataAt > DATA_TTL; if (!needMap && !needData) return;
    S.busy = true;
    (async () => { try { if (needMap) await remap(f, await prices()); else await refresh(f); S.err = ''; save(); } catch (e) { S.err = e.message || String(e); log('coingecko:', S.err); } finally { S.busy = false; } })();
  }
  function get(sym, f, prices) {
    tick(f, prices);
    const k = !!key(), d = S.data[sym], m = S.map[sym], month = S.calls.filter(t => now() - t < 30 * 864e5).length;
    const meta = { at: S.dataAt || null, mapAt: S.mapAt || null, calls30d: month, busy: S.busy, err: S.err || null };
    if (!k) return Object.assign({ none: 'anahtar', msg: 'CoinGecko anahtarı yok' }, meta);
    if (d && m) return Object.assign({ ok: true, mult: m.mult }, d, meta);
    if (!S.mapAt) return Object.assign({ none: 'bekle', msg: 'CoinGecko eşlemesi yapılıyor…' }, meta);
    return Object.assign({ none: 'eslesmedi', msg: 'CoinGecko\'da güvenilir eşleşme yok' }, meta);
  }
  return { get, S, baseOf, _remap: remap, _refresh: refresh };
}
module.exports = { create, baseOf };
