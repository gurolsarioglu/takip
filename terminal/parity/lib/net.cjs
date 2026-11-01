'use strict';
// Network layer: Binance USDⓈ-M futures + Visivero public bot-messages API, with disk cache and pacing.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', 'data');
const CACHE = path.join(ROOT, 'cache');
fs.mkdirSync(CACHE, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));
let lastCall = 0;
let minGapMs = Number(process.env.PARITY_GAP_MS || 60);
let usedWeight = 0;

async function getJson(url, { retries = 4, timeout = 20000 } = {}) {
  for (let a = 0; ; a++) {
    const wait = lastCall + minGapMs - Date.now();
    if (wait > 0) await sleep(wait);
    lastCall = Date.now();
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(timeout), headers: { 'accept': 'application/json' } });
      const w = res.headers.get('x-mbx-used-weight-1m'); if (w) usedWeight = Number(w);
      if (usedWeight > 1800) await sleep(20000);
      if (res.status === 429 || res.status === 418) { const ra = Number(res.headers.get('retry-after') || 30); await sleep(ra * 1000); continue; }
      if (!res.ok) { const body = (await res.text()).slice(0, 200); const e = new Error(`HTTP ${res.status} ${url} ${body}`); e.status = res.status; throw e; }
      return await res.json();
    } catch (e) {
      if (e.status && e.status < 500) throw e;
      if (a >= retries) throw e;
      await sleep(1000 * (a + 1));
    }
  }
}

function cached(key, fn) {
  const f = path.join(CACHE, key.replace(/[^A-Za-z0-9._-]/g, '_') + '.json');
  if (fs.existsSync(f)) { try { return Promise.resolve(JSON.parse(fs.readFileSync(f, 'utf8'))); } catch {} }
  return fn().then(v => { fs.writeFileSync(f, JSON.stringify(v)); return v; });
}

const FAPI = 'https://fapi.binance.com';
const IMS = { '1m': 60e3, '3m': 180e3, '5m': 300e3, '15m': 900e3, '30m': 1800e3, '1h': 3600e3, '2h': 7200e3, '4h': 14400e3, '1d': 86400e3, '1w': 604800e3 };

const toBar = k => ({ openTime: k[0], open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5], closeTime: k[6], quoteVolume: +k[7], trades: k[8], takerBuyBase: +k[9] });

// Klines whose openTime <= endTime (includes the bar that contains endTime, i.e. the live bar at that moment).
// Cache key uses the open time of the live bar, so all events inside the same bar share the request.
async function klinesAt(symbol, interval, t, limit = 1000) {
  const ms = IMS[interval];
  const liveOpen = Math.floor(t / ms) * ms;
  const key = `k_${symbol}_${interval}_${liveOpen}_${limit}`;
  const raw = await cached(key, () => getJson(`${FAPI}/fapi/v1/klines?symbol=${symbol}&interval=${interval}&endTime=${liveOpen + ms - 1}&limit=${limit}`));
  return raw.map(toBar);
}
async function klinesRange(symbol, interval, startTime, endTime) {
  const out = [];
  let s = startTime;
  while (s <= endTime) {
    const key = `kr_${symbol}_${interval}_${s}_${endTime}`;
    const raw = await cached(key, () => getJson(`${FAPI}/fapi/v1/klines?symbol=${symbol}&interval=${interval}&startTime=${s}&endTime=${endTime}&limit=1500`));
    if (!raw.length) break;
    out.push(...raw.map(toBar));
    s = raw[raw.length - 1][0] + IMS[interval];
    if (raw.length < 1500) break;
  }
  return out;
}
// Last trade at or before t (searches back up to `maxBackMs`).
async function priceAt(symbol, t, maxBackMs = 60000) {
  for (const back of [2000, 15000, maxBackMs]) {
    const key = `at_${symbol}_${t}_${back}`;
    const trades = await cached(key, () => getJson(`${FAPI}/fapi/v1/aggTrades?symbol=${symbol}&startTime=${t - back}&endTime=${t}&limit=1000`));
    const last = trades.filter(x => x.T <= t).at(-1);
    if (last) return { price: +last.p, time: last.T };
  }
  return null;
}
async function exchangeInfo() { return cached('exchangeInfo_' + new Date().toISOString().slice(0, 10), () => getJson(`${FAPI}/fapi/v1/exchangeInfo`)); }
async function fundingHistory(symbol, startTime, endTime) { return getJson(`${FAPI}/fapi/v1/fundingRate?symbol=${symbol}&startTime=${startTime}&endTime=${endTime}&limit=1000`); }

// Visivero public read-only API
const VIS = 'https://terminal.visivero.com/api/bot-messages';
async function botMessages(botId, { before, limit = 100, symbol, message, quote } = {}) {
  const p = new URLSearchParams({ bot_id: botId, limit: String(limit), exchange: 'binance', market_type: 'FUTURES' });
  if (before) p.set('before', before);
  if (symbol) p.set('symbol', symbol);
  if (message) p.set('message', message);
  if (quote) p.set('quote', quote);
  return getJson(`${VIS}?${p}`);
}

module.exports = { getJson, cached, klinesAt, klinesRange, priceAt, exchangeInfo, fundingHistory, botMessages, IMS, ROOT, sleep, toBar };
