'use strict';
// Feature extraction for 4s / 4sniper (4h scans) and 1dws (12h scans).
// For each scan cycle and every universe symbol, estimate the symbol's scan time (alphabetical interpolation
// from reference message times in that cycle), take the price at that time, and compute indicator features.
// Output: data/foursn/features-<mode>.jsonl  (one row per symbol x cycle, with labels from reference messages)
// Usage: node research/foursn/features.cjs --mode 4h --cycles 6 [--skip 0] [--pos 300]
const fs = require('node:fs');
const path = require('node:path');
const I = require('../../lib/ind.cjs');
const { parse } = require('../../lib/ref.cjs');
const { klinesAt, exchangeInfo, ROOT } = require('../../lib/net.cjs');

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const MODE = arg('mode', '4h');               // '4h' (4s+4sniper) | '12h' (1dws)
const NCYC = Number(arg('cycles', 6));
const SKIP = Number(arg('skip', 0));
const POSEXTRA = Number(arg('pos', 0));        // extra positive-only cycles (older) for fitting
const OUT = path.join(ROOT, 'foursn'); fs.mkdirSync(OUT, { recursive: true });
const PERIOD = MODE === '4h' ? 4 * 3600e3 : 12 * 3600e3;
const BOTS = MODE === '4h' ? ['4s', '4sniper'] : ['1dws'];

const load = b => fs.readFileSync(path.join(ROOT, 'ref', b + '.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => parse(JSON.parse(l)));

function tfFeatures(bars, price, tf) {
  // bars: closed bars + live bar (last) with close = price
  const closes = bars.map(b => b.close);
  const sr = I.stochRsi(closes);
  const n = closes.length - 1;
  const rsi = sr.rsi, rsiSma = I.sma(rsi, 14);
  const wt = I.waveTrend(bars, 10, 21, 4, 'first');
  const wtS = I.waveTrend(bars, 10, 21, 4, 'sma');
  const f = {
    n: bars.length,
    rsi: +rsi[n].toFixed(3), rsiPrev: +rsi[n - 1].toFixed(3), rsiSma: +rsiSma[n].toFixed(3), rsiSmaPrev: +rsiSma[n - 1].toFixed(3),
    rsiSmaX: I.crossAt(rsi, rsiSma, n), rsiSmaXClosed: I.crossAt(rsi, rsiSma, n - 1),
    k: +sr.k[n].toFixed(3), d: +sr.d[n].toFixed(3), kPrev: +sr.k[n - 1].toFixed(3), dPrev: +sr.d[n - 1].toFixed(3), kdX: I.crossAt(sr.k, sr.d, n),
    wt1: +wt.wt1[n].toFixed(3), wt2: +wt.wt2[n].toFixed(3), wtX: I.crossAt(wt.wt1, wt.wt2, n), wtXClosed: I.crossAt(wt.wt1, wt.wt2, n - 1),
    wtXs: I.crossAt(wtS.wt1, wtS.wt2, n),
  };
  if (tf === '4h' || tf === '1d') {
    const nw = I.nwRepaint(closes, 8, 3, 500);
    f.nwC = nw.center; f.nwU = nw.upper; f.nwL = nw.lower;
    f.nwPos = (price - nw.lower) / (nw.upper - nw.lower); // <0 below lower, >1 above upper
    // closed-only band (no live)
    const nwc = I.nwRepaint(closes.slice(0, -1), 8, 3, 500);
    f.nwPosClosed = (bars[n - 1].close - nwc.lower) / (nwc.upper - nwc.lower);
    const e200 = I.ema(closes, 200, 'sma');
    f.ema200 = e200[n];
    // impulse boost over last 5 bars
    const last5 = bars.slice(-5);
    f.boostUp = Math.max(...last5.map(b => (b.open - b.low) / b.low * 100));
    f.boostDn = Math.max(...last5.map(b => (b.high - b.open) / b.open * 100));
    // RSI pivots for divergence research: last 80 rsi values + lows/highs
    f.rsiTail = rsi.slice(-80).map(v => +v.toFixed(2));
    f.lowTail = bars.slice(-80).map(b => b.low);
    f.highTail = bars.slice(-80).map(b => b.high);
    f.closeTail = bars.slice(-80).map(b => b.close);
  }
  return f;
}

function withLive(raw, t, price, m1) {
  const closed = raw.filter(b => b.closeTime < t);
  const live = raw.find(b => b.openTime <= t && b.closeTime >= t);
  if (!live) return null;
  // live bar truncated at t: high/low from 1m bars inside [live.openTime, t] (fully closed minutes) + open + price
  let hi = Math.max(live.open, price), lo = Math.min(live.open, price);
  const inside = m1.filter(b => b.openTime >= live.openTime && b.closeTime < t);
  const covered = inside.length && inside[0].openTime === live.openTime;
  if (covered) for (const b of inside) { hi = Math.max(hi, b.high); lo = Math.min(lo, b.low); }
  else { // fall back: closed sub-bars unknown -> use closed 4h/1h bars of this period if available is not possible; keep approx
  }
  return [...closed, { ...live, close: price, high: hi, low: lo, isLive: true, hlExact: !!covered }];
}

(async () => {
  const refs = BOTS.flatMap(load);
  const info = await exchangeInfo();
  const universe = info.symbols.filter(s => s.contractType === 'PERPETUAL' && ['USDT', 'USDC'].includes(s.quoteAsset) && s.status === 'TRADING').map(s => ({ sym: s.symbol, onboard: s.onboardDate }));
  const cycStart = r => Math.floor(r.t / PERIOD) * PERIOD;
  const cycles = [...new Set(refs.map(cycStart))].sort((a, b) => b - a);
  const negCycles = cycles.slice(SKIP, SKIP + NCYC);
  const posCycles = cycles.slice(SKIP + NCYC, SKIP + NCYC + POSEXTRA);
  const outF = path.join(OUT, `features-${MODE}-${SKIP}-${NCYC}-${POSEXTRA}.jsonl`);
  fs.writeFileSync(outF, '');
  let rows = 0;
  for (const C of [...negCycles, ...posCycles]) {
    const full = negCycles.includes(C);
    const cr = refs.filter(r => cycStart(r) === C);
    const known = [...new Map(cr.map(r => [r.symbol, r.t])).entries()].sort((a, b) => a[0] < b[0] ? -1 : 1);
    if (known.length < 2) continue;
    const estT = sym => {
      let lo = null, hi = null;
      for (const [s, t] of known) { if (s <= sym) lo = [s, t]; else { hi = [s, t]; break; } }
      if (lo && lo[0] === sym) return lo[1];
      if (!lo) return hi[1] - 1000; if (!hi) return lo[1] + 1000;
      return Math.round((lo[1] + hi[1]) / 2);
    };
    const syms = full ? universe.filter(u => !u.onboard || u.onboard < C).map(u => u.sym) : [...new Set(cr.map(r => r.symbol))];
    for (const sym of syms) {
      const msgs = cr.filter(r => r.symbol === sym);
      const t = msgs.length ? Math.min(...msgs.map(m => m.t)) : estT(sym);
      try {
        const mins = Math.min(240, Math.ceil((t - C) / 60e3) + 2);
        const m1 = await klinesAt(sym, '1m', t, Math.max(3, mins));
        const liveM = m1.find(b => b.openTime <= t && b.closeTime >= t);
        if (!liveM) continue;
        const pxMkt = liveM.open;
        const price = msgs.length && Number.isFinite(msgs[0].price) ? msgs[0].price : pxMkt;
        const row = { sym, C, t, price, pxMkt, labels: msgs.map(m => ({ bot: m.botId, dir: m.direction, strategy: m.strategy, boost: m.boostPct, prev: m.prevPrice, rsi: m.rsi, srsi: m.srsi, rsiList: m.rsiList, srsiList: m.srsiList, tp: m.tp, me: m.me, t: m.t })), f: {} };
        const tfs = MODE === '4h' ? ['1h', '4h', '1d'] : ['1h', '1d', '1w'];
        for (const tf of tfs) {
          const raw = await klinesAt(sym, tf, t, tf === '1w' ? 300 : 1000);
          const bars = withLive(raw, t, price, m1);
          if (!bars || bars.length < 40) { row.f[tf] = null; continue; }
          row.f[tf] = tfFeatures(bars, price, tf);
          if (tf === '1h') row.prev1h = bars[bars.length - 2].close;
        }
        fs.appendFileSync(outF, JSON.stringify(row) + '\n'); rows++;
      } catch (e) { console.error(sym, new Date(t).toISOString(), e.message); }
    }
    console.log('cycle', new Date(C).toISOString(), full ? 'full' : 'pos', 'rows so far', rows);
  }
  console.log('done', outF, rows);
})();
