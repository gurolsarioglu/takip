'use strict';
// Reproduce the indicator values printed in Visivero messages from Binance candles.
// Tells us: which candle (closed vs live), which price, RSI/SRSI implementation, Previous Price & Boost rules.
// Usage: node fingerprint.cjs [--bots hammer-pro-plus,4s] [--max 150]
const fs = require('node:fs');
const path = require('node:path');
const I = require('./lib/ind.cjs');
const { parse } = require('./lib/ref.cjs');
const { klinesAt, priceAt, ROOT, IMS } = require('./lib/net.cjs');

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const BOT_TF = {
  'm1': ['1m'], 'm1-premium': ['1m', '5m', '1h'], 'hammer': ['1m', '5m', '1h'], 'hammer-pro': ['1m', '5m', '1h'], 'hammer-pro-plus': ['1m', '5m', '1h'],
  '1d-hammer-pro': ['1h', '4h', '1d'], '4s': ['1h', '4h', '1d'], '4sniper': ['1h', '4h', '1d'], 'div': ['1h', '4h', '1d']
};
const bots = arg('bots', Object.keys(BOT_TF).join(',')).split(',');
const MAX = Number(arg('max', 150));
const out = path.join(ROOT, 'fingerprint'); fs.mkdirSync(out, { recursive: true });

function loadRef(bot) {
  const f = path.join(ROOT, 'ref', bot + '.jsonl');
  if (!fs.existsSync(f)) return [];
  return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
}

function variants(bars, t, price, tradePrice) {
  const ms = bars.length > 1 ? bars[1].openTime - bars[0].openTime : 60e3;
  const closed = bars.filter(b => b.closeTime < t);
  const live = bars.find(b => b.openTime <= t && b.closeTime >= t);
  const v = { closed: closed.map(b => b.close) };
  if (live && Number.isFinite(price)) v.livePx = [...v.closed, price];
  if (live && Number.isFinite(tradePrice)) v.liveTrade = [...v.closed, tradePrice];
  if (live) v.liveFinal = [...v.closed, live.close]; // leaks future: diagnostic only
  return { v, closed, live, ms };
}

const statsAdd = (S, key, ok) => { S[key] = S[key] || { n: 0, ok: 0 }; S[key].n++; if (ok) S[key].ok++; };

(async () => {
  const summary = {};
  for (const bot of bots) {
    const tfs = BOT_TF[bot]; if (!tfs) continue;
    const rows = loadRef(bot).map(parse).filter(r => r.symbol && Number.isFinite(r.t)).sort((a, b) => b.t - a.t).slice(0, MAX);
    const S = {}; const details = [];
    for (const r of rows) {
      const d = { id: r.id, symbol: r.symbol, t: r.createdAt, dir: r.direction, strategy: r.strategy, price: r.price, prev: r.prevPrice, boost: r.boostPct, tf: {} };
      try {
        const trade = await priceAt(r.symbol, r.t).catch(() => null);
        d.tradePrice = trade?.price; d.tradeAge = trade ? r.t - trade.time : null;
        statsAdd(S, 'price==lastTrade', trade && Math.abs(trade.price - r.price) / r.price < 1e-9);
        for (const tf of tfs) {
          const bars = await klinesAt(r.symbol, tf, r.t, 1000);
          const { v, closed, live } = variants(bars, r.t, r.price, trade?.price);
          const want = bot === 'm1' ? r.rsiSingle : r.rsi[tf];
          const wantS = bot === 'm1' ? r.stochKD?.k : r.srsi[tf];
          const e = { wantRsi: want, wantSrsi: wantS, got: {} };
          if (v.livePx) for (const N of [50, 100, 150, 200, 300, 500]) v['livePx_' + N] = v.livePx.slice(-N);
          for (const [name, closes] of Object.entries(v)) {
            const sr = I.stochRsi(closes);
            const rv = sr.rsi.at(-1), kv = sr.k.at(-1);
            e.got[name] = { rsi: +rv.toFixed(2), k: +kv.toFixed(2) };
            if (Number.isFinite(want)) { statsAdd(S, `${tf}.rsi.${name}.round`, Math.round(rv) === want); statsAdd(S, `${tf}.rsi.${name}.trunc`, Math.trunc(rv) === want); statsAdd(S, `${tf}.rsi.${name}.±1`, Math.abs(rv - want) <= 1); }
            if (Number.isFinite(wantS) && bot !== 'm1') {
              statsAdd(S, `${tf}.srsi.${name}.round`, Math.round(kv) === wantS); statsAdd(S, `${tf}.srsi.${name}.trunc`, Math.trunc(kv) === wantS); statsAdd(S, `${tf}.srsi.${name}.±2`, Math.abs(kv - wantS) <= 2);
              statsAdd(S, `${tf}.srsi.${name}.raw.round`, Math.round(sr.raw.at(-1)) === wantS);
              statsAdd(S, `${tf}.srsi.${name}.D.round`, Math.round(sr.d.at(-1)) === wantS);
              e.got[name].raw = +sr.raw.at(-1).toFixed(2); e.got[name].d = +sr.d.at(-1).toFixed(2);
            }
            if (bot === 'm1' && r.stochKD && tf === '1m') {
              const hs = [...closed.map(b => b.high)], ls = [...closed.map(b => b.low)], cs = [...closed.map(b => b.close)];
              if (name !== 'closed' && live) { hs.push(Math.max(live.open, closes.at(-1))); ls.push(Math.min(live.open, closes.at(-1))); cs.push(closes.at(-1)); }
              const st = I.stoch(hs, ls, cs);
              statsAdd(S, `1m.stoch.${name}.round`, Math.round(st.k.at(-1)) === r.stochKD.k && Math.round(st.d.at(-1)) === r.stochKD.d);
            }
          }
          // Previous Price = close of last closed bar on this tf?
          if (Number.isFinite(r.prevPrice) && closed.length) statsAdd(S, `${tf}.prev==lastClosedClose`, Math.abs(closed.at(-1).close - r.prevPrice) <= 1e-12 * Math.max(1, r.prevPrice) || closed.at(-1).close === r.prevPrice);
          if (Number.isFinite(r.prevPrice) && live) statsAdd(S, `${tf}.prev==liveOpen`, live.open === r.prevPrice);
          // Boost candidates on this tf
          if (Number.isFinite(r.boostPct)) {
            const last5 = [...closed.slice(-4), ...(live ? [{ ...live, close: r.price, high: Math.max(live.high, r.price), low: Math.min(live.low, r.price) }] : [])];
            const up = Math.max(...last5.map(b => (b.open - b.low) / b.low * 100));
            const dn = Math.max(...last5.map(b => (b.high - b.open) / b.open * 100));
            const cand = r.direction === 'up' ? up : dn;
            statsAdd(S, `${tf}.boost.impulse5.±0.01`, Math.abs(cand - Math.abs(r.boostPct)) <= 0.011);
            if (closed.length) statsAdd(S, `${tf}.boost.px/prevClose`, Math.abs((r.price / closed.at(-1).close - 1) * 100 - r.boostPct) <= 0.011);
            if (live) statsAdd(S, `${tf}.boost.px/liveOpen`, Math.abs((r.price / live.open - 1) * 100 - r.boostPct) <= 0.011);
            e.boostImpulse5 = +cand.toFixed(2);
          }
          // WaveTrend cross on closed bars (hammer W1) and live
          if (['1m'].includes(tf) || bot === '4s') {
            for (const seed of ['first', 'sma']) {
              const cb = closed.map(b => ({ high: b.high, low: b.low, close: b.close }));
              const wt = I.waveTrend(cb, 10, 21, 4, seed);
              const c = I.crossAt(wt.wt1, wt.wt2, cb.length - 1);
              e['wtClosed_' + seed] = c;
              if (live) { const lb = [...cb, { high: Math.max(live.open, r.price, live.open), low: Math.min(live.open, r.price), close: r.price }]; const wl = I.waveTrend(lb, 10, 21, 4, seed); e['wtLive_' + seed] = I.crossAt(wl.wt1, wl.wt2, lb.length - 1); }
            }
          }
          d.tf[tf] = e;
        }
      } catch (err) { d.error = err.message; }
      details.push(d);
      if (details.length % 25 === 0) console.log(bot, details.length, '/', rows.length);
    }
    const pct = Object.fromEntries(Object.entries(S).sort().map(([k, s]) => [k, `${s.ok}/${s.n} (${(100 * s.ok / s.n).toFixed(1)}%)`]));
    summary[bot] = pct;
    fs.writeFileSync(path.join(out, bot + '.json'), JSON.stringify({ summary: pct, details }, null, 1));
    console.log(bot, JSON.stringify(pct, null, 1));
  }
  fs.writeFileSync(path.join(out, '_summary.json'), JSON.stringify(summary, null, 1));
})();
