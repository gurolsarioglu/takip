'use strict';
// Botlar V1 canlı motoru: rules/*.cjs modüllerini Binance canlı verisinde çalıştırır, sinyalleri
// data/live/signals-<tarih>.jsonl dosyasına yazar. Emir yok; Telegram V1.1'de.
// node engine/live.cjs [--only m1,hammer] [--symbols BTCUSDT,ETHUSDT]
const fs = require('node:fs');
const path = require('node:path');
const { Market, barOpen } = require('./market.cjs');
const { getJson, ROOT, sleep } = require('../lib/net.cjs');

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ONLY = arg('only', '') ? arg('only').split(',') : null;
const LIVE = path.join(ROOT, 'live'); fs.mkdirSync(LIVE, { recursive: true });
const log = (...a) => { const s = new Date().toISOString() + ' ' + a.join(' '); console.log(s); };

const RULES = path.join(__dirname, '..', 'rules');
const mtimes = new Map();
function loadOne(f) {
  const p = path.join(RULES, f);
  try {
    delete require.cache[require.resolve(p)];
    for (const k of Object.keys(require.cache)) if (k.includes(path.sep + 'lib' + path.sep) && !k.endsWith('net.cjs')) delete require.cache[k]; // pick up shared helper changes
    const m = require(p);
    if (typeof m.evaluate !== 'function' || !Array.isArray(m.bots)) { log('skip module (interface)', f); return null; }
    if (ONLY && !ONLY.includes(m.family) && !m.bots.some(b => ONLY.includes(b))) return null;
    m._file = f; log('module', f, m.family, m.bots.join(','), JSON.stringify(m.needs));
    return m;
  } catch (e) { log('module load error', f, e.message); return null; }
}
function loadModules() {
  const mods = [];
  for (const f of fs.readdirSync(RULES).filter(f => f.endsWith('.cjs'))) { mtimes.set(f, fs.statSync(path.join(RULES, f)).mtimeMs); const m = loadOne(f); if (m) mods.push(m); }
  return mods;
}
// hot reload: changed or new rule files are re-required every 15 s (state of that module is reset)
function watchModules(mods, onReload) {
  setInterval(() => {
    for (const f of fs.readdirSync(RULES).filter(f => f.endsWith('.cjs'))) {
      const mt = fs.statSync(path.join(RULES, f)).mtimeMs;
      if (mtimes.get(f) === mt) continue;
      mtimes.set(f, mt);
      const m = loadOne(f); if (!m) continue;
      const i = mods.findIndex(x => x._file === f);
      if (i >= 0) mods[i] = m; else mods.push(m);
      onReload(m);
    }
  }, 15000);
}

(async () => {
  const mods = loadModules();
  // bootstrap every timeframe once so modules can be hot-reloaded without a restart
  const needs = { '1m': 400, '5m': 400, '15m': 300, '1h': 495, '4h': 650, '1d': 495, '1w': 200 };
  for (const m of mods) for (const [tf, n] of Object.entries(m.needs || {})) needs[tf] = Math.max(needs[tf] || 0, Math.min(1000, n + 5));
  const ordered = Object.fromEntries(Object.entries(needs).sort((a, b) => (a[0] === '1m' ? -1 : b[0] === '1m' ? 1 : 0)));
  const market = new Market({ needs: ordered, log });
  let symbols = await market.loadUniverse();
  if (arg('symbols')) symbols = arg('symbols').split(',');
  if (!symbols.includes('BTCUSDT')) symbols.unshift('BTCUSDT');
  log('universe', symbols.length, 'needs', JSON.stringify(ordered));
  const startedAt = Date.now();
  await market.bootstrap(symbols);
  market.connect();
  await market.gapfill();
  const readyAt = Date.now();
  log('ready; bootstrap took', ((readyAt - startedAt) / 1000).toFixed(0), 's');

  // ratios (Trader Positioning / Market Exposure) refreshed in background if any module needs them
  const ratios = new Map();
  const needRatios = mods.filter(m => (m.extras || []).includes('ratios'));
  if (needRatios.length) (async () => {
    const period = needRatios[0].ratiosPeriod || '5m';
    for (;;) {
      for (const s of symbols) {
        try {
          const [top] = (await getJson(`https://fapi.binance.com/futures/data/topLongShortAccountRatio?symbol=${s}&period=${period}&limit=1`)) || [];
          const [glob] = (await getJson(`https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${s}&period=${period}&limit=1`)) || [];
          ratios.set(s, { topLongAccount: top ? +top.longAccount : NaN, globalLongAccount: glob ? +glob.longAccount : NaN, t: Date.now() });
        } catch (e) { }
        await sleep(600);   // /futures/data uçlarının ayrı IP sınırı var (1.000 istek / 5 dk; OI geri doldurma ve db/turev.cjs ile ortak) → ~120 istek/dk, tam tur ~13 dk
      }
      await sleep(1000);
    }
  })();

  // Açık pozisyon (OI), 11.11.2026 — her zaman toplanır (ucuz). Kurala ctx.oi = { oi, t, chg1h, chg4h, chg24h } (yüzde), ctx.oiSeries = [{t, oi}].
  //  • canlı: /fapi/v1/openInterest (ağırlık 1), bütün evren 5 dakikada bir tam tur
  //  • açılışta geri doldurma: /futures/data/openInterestHist 5m × 300 (≈25 sa). Bu uçların ayrı IP sınırı var (1.000 istek / 5 dk,
  //    oran döngüsüyle ortak) → istekler arası 700 ms; tampon dolana kadar chg alanları null.
  const OI5 = 300e3, oiBuf = new Map(), oiStat = { symbols: 0, lastCycleMs: null, cycles: 0, errors: 0, backfilled: 0 };
  const oiPut = (s, t, v) => { if (!(v > 0)) return; let m = oiBuf.get(s); if (!m) { m = new Map(); oiBuf.set(s, m); } m.set(Math.floor(t / OI5) * OI5, v); };
  const oiAt = (m, k) => m.get(k) ?? m.get(k - OI5) ?? m.get(k + OI5) ?? null;
  function oiCtx(s) {
    const m = oiBuf.get(s); if (!m || !m.size) return null;
    let k = -Infinity; for (const x of m.keys()) if (x > k) k = x;
    const v = m.get(k), chg = h => { const p = oiAt(m, k - h * 3600e3); return p ? +((v / p - 1) * 100).toFixed(2) : null; };
    return { oi: v, t: k, chg1h: chg(1), chg4h: chg(4), chg24h: chg(24) };
  }
  const oiSeries = s => { const m = oiBuf.get(s); return m ? [...m.entries()].sort((a, b) => a[0] - b[0]).map(([t, oi]) => ({ t, oi })) : []; };
  (async () => {
    for (const s of symbols) {
      try { for (const r of (await getJson(`https://fapi.binance.com/futures/data/openInterestHist?symbol=${s}&period=5m&limit=300`)) || []) oiPut(s, r.timestamp, +r.sumOpenInterest); oiStat.backfilled++; }
      catch (e) { oiStat.errors++; }
      await sleep(700);
    }
    log('oi backfill done', oiStat.backfilled, '/', symbols.length);
  })();
  (async () => {
    for (;;) {
      const t0 = Date.now(); let n = 0;
      for (const s of symbols) {
        try { const r = await getJson(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${s}`); if (r) { oiPut(s, r.time || Date.now(), +r.openInterest); n++; } } catch (e) { oiStat.errors++; }
        await sleep(150);
      }
      const lim = Date.now() - 26 * 3600e3; for (const m of oiBuf.values()) for (const k of m.keys()) if (k < lim) m.delete(k);
      oiStat.symbols = n; oiStat.lastCycleMs = Date.now() - t0; oiStat.cycles++;
      const w = 300e3 - (Date.now() - t0); if (w > 0) await sleep(w);
    }
  })();

  const day = () => new Date().toISOString().slice(0, 10);
  const out = { day: null, fd: null };
  function write(sig) {
    if (out.day !== day()) { if (out.fd) fs.closeSync(out.fd); out.day = day(); out.fd = fs.openSync(path.join(LIVE, `signals-${out.day}.jsonl`), 'a'); }
    fs.writeSync(out.fd, JSON.stringify(sig) + '\n');
  }
  const stats = { ticks: 0, evals: 0, errors: 0, signals: {} };
  const lastEval = new Map(); // module|symbol -> t
  const states = new Map();   // module|symbol -> state
  const btc = market.sym.get('BTCUSDT');
  // Warm-up: replay past scan moments (module.warmup = {stepMs, steps, offsetMs}) with signals discarded, so cooldown /
  // "one signal per anchor" state matches a bot that has been running for a while (avoids a burst after restart).
  const { IMS } = require('../lib/net.cjs');
  function histBars(st, tf, T) {
    const ser = st.series[tf]; if (!ser) return [];
    const closed = ser.closed.filter(b => b.closeTime < T);
    const ms = IMS[tf], open = barOpen(tf, T);
    const src = ser.closed.find(b => b.openTime === open) || ser.view(st.minuteLive, st.price).at(-1);
    // price at T: close of the 1m bar ending just before T when available, else the bar open
    const m1 = st.series['1m']?.closed.find(b => b.closeTime < T && b.closeTime >= T - 60e3);
    const px = m1 ? m1.close : src ? src.open : NaN;
    if (!src) return closed;
    const lo = Math.min(src.open, px), hi = Math.max(src.open, px);
    return [...closed, { openTime: open, open: src.open, high: hi, low: lo, close: px, volume: 0, quoteVolume: 0, closeTime: open + ms - 1, isLive: true }];
  }
  function warm(m) {
    const w = m.warmup; if (!w) return;
    const t0 = Date.now(); let n = 0;
    for (const st of market.sym.values()) {
      const key = m.family + '|' + st.symbol;
      const state = {}; states.set(key, state);
      const base = Math.floor(Date.now() / w.stepMs) * w.stepMs;
      for (let k = w.steps; k >= 1; k--) {
        const T = base - k * w.stepMs + (w.offsetMs || 60e3);
        const cache = {};
        const bars = new Proxy({}, { get: (_, tf) => (typeof tf === 'string' ? (cache[tf] = cache[tf] || histBars(st, tf, T)) : undefined) });
        const px = (bars['1m'].length ? bars['1m'] : bars['1h']).at(-1)?.close;
        if (!Number.isFinite(px)) continue;
        try { m.evaluate({ symbol: st.symbol, t: T, eventTime: T, event: 'warmup', warmup: true, price: px, bars, funding: null, ticker24h: null, ratios: null, info: market.info[st.symbol], btc: { bars: {} }, state }); n++; } catch (e) { }
      }
    }
    log('warmup', m.family, n, 'evals in', Date.now() - t0, 'ms');
  }
  for (const m of mods) warm(m);
  // restore persisted per-symbol state (modules without warm-up) so restarts don't re-arm everything
  const STATE_FILE = path.join(LIVE, 'state.json');
  try {
    const saved = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    if (Date.now() - saved.at < 12 * 3600e3) {
      let n = 0;
      for (const [k, v] of Object.entries(saved.states || {})) { const fam = k.split('|')[0]; const m = mods.find(x => x.family === fam); if (m && !m.warmup) { states.set(k, v); n++; } }
      log('restored state for', n, 'module|symbol keys');
    }
  } catch (e) { }
  setInterval(() => { try { fs.writeFileSync(STATE_FILE, JSON.stringify({ at: Date.now(), states: Object.fromEntries(states) })); } catch (e) { } }, 300e3);
  watchModules(mods, m => { for (const k of [...states.keys()]) if (k.startsWith(m.family + '|')) { states.delete(k); lastEval.delete(k); } warm(m); });

  // Minute sweep: modules with minuteSweep:true (FR scan, V3) must be evaluated for EVERY symbol each minute, even
  // illiquid ones that get no kline update in that minute (otherwise FR scan rows go missing → split episodes).
  const sweepMods = () => mods.filter(m => m.minuteSweep);
  const scheduleSweep = () => setTimeout(() => {
    try { const sm = sweepMods(); if (sm.length) for (const st of market.sym.values()) if (st.ready) evalSym(st, { closed: false, t: Date.now(), sweep: true }, sm); } catch (e) { log('sweep error', e.message); }
    scheduleSweep();
  }, 60000 - (Date.now() % 60000) + 1500);
  scheduleSweep();

  market.onTick((st, ev) => evalSym(st, ev, mods));
  function evalSym(st, ev, list) {
    if (!st.ready) return;
    stats.ticks++;
    const now = Date.now();
    let cache = null;
    const barsProxy = new Proxy({}, { get: (_, tf) => { cache = cache || {}; if (typeof tf !== 'string') return undefined; if (!(tf in cache)) cache[tf] = market.bars(st, tf); return cache[tf]; } });
    for (const m of list) {
      const key = m.family + '|' + st.symbol;
      if (!ev.closed && !ev.sweep && now - (lastEval.get(key) || 0) < (m.cadenceMs || 1000)) continue;
      lastEval.set(key, now);
      let state = states.get(key); if (!state) { state = {}; states.set(key, state); }
      const ctx = {
        symbol: st.symbol, t: now, eventTime: ev.t, event: ev.closed ? 'close' : 'tick', price: st.price, priceStr: st.priceStr,
        bars: barsProxy, funding: st.funding ? { ...st.funding, intervalHours: market.fundingInfo?.[st.symbol]?.fundingIntervalHours || 8 } : null,
        ticker24h: st.ticker, ratios: ratios.get(st.symbol) || null, info: market.info[st.symbol],
        oi: (m.extras || []).includes('oi') ? oiCtx(st.symbol) : null, get oiSeries() { return oiSeries(st.symbol); },
        btc: { price: btc?.price, bars: new Proxy({}, { get: (_, tf) => (typeof tf === 'string' && btc ? market.bars(btc, tf) : undefined) }) },
        state
      };
      try {
        stats.evals++;
        const sigs = m.evaluate(ctx) || [];
        for (const s of sigs) {
          const rec = { seenAt: new Date(now).toISOString(), t: now, eventTime: ev.t, module: m.family, ...s };
          write(rec);
          stats.signals[s.botId] = (stats.signals[s.botId] || 0) + 1;
        }
      } catch (e) { stats.errors++; if (stats.errors < 20) log('eval error', m.family, st.symbol, e.stack.split('\n').slice(0, 2).join(' ')); }
    }
  }

  setInterval(() => {
    fs.writeFileSync(path.join(LIVE, 'status.json'), JSON.stringify({ at: new Date().toISOString(), startedAt: new Date(startedAt).toISOString(), readyAt: new Date(readyAt).toISOString(), symbols: symbols.length, modules: mods.map(m => m._file), ...stats, oi: oiStat, mem: Math.round(process.memoryUsage().rss / 1e6) + 'MB' }, null, 1));
  }, 10000);
})().catch(e => { console.error(e); process.exit(1); });
