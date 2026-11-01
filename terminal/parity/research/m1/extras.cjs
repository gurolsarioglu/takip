'use strict';
// M1-A / M1 Premium printed extras: Volume %, stars, WT Cross, Coin Status, BTC Status.
// node research/m1/extras.cjs --max 150
const fs = require('node:fs');
const path = require('node:path');
const I = require('../../lib/ind.cjs');
const { parse } = require('../../lib/ref.cjs');
const { klinesAt, klinesRange, exchangeInfo, ROOT } = require('../../lib/net.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const MAX = Number(arg('max', 150));
const load = b => fs.readFileSync(path.join(ROOT, 'ref', b + '.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
const S = {}; const add = (k, ok) => { S[k] = S[k] || [0, 0]; S[k][0]++; if (ok) S[k][1]++; };

function liveSeries(bars, t, price) {
  const closed = bars.filter(b => b.closeTime < t);
  const live = bars.find(b => b.openTime <= t && b.closeTime >= t);
  if (!live) return { closed, live: null, all: closed };
  const lb = { ...live, close: price, high: Math.max(live.open, price), low: Math.min(live.open, price), isLive: true };
  return { closed, live, lb, all: [...closed, lb] };
}

(async () => {
  const info = await exchangeInfo();
  const onboard = Object.fromEntries(info.symbols.map(s => [s.symbol, s.onboardDate]));
  const out = { volume: [], premium: [] };
  // ---- M1-A Volume % : messages at second :00 belong to the just-closed bar (final volume known)
  const m1 = load('m1').map(parse).filter(r => new Date(r.t).getUTCSeconds() === 0 && Number.isFinite(r.volumePct)).slice(-MAX);
  for (const r of m1) {
    try {
      const t = r.t - 1000; // evaluate inside the closing bar
      const ks = await klinesRange(r.symbol, '1m', Math.floor(t / 60e3) * 60e3 - 1441 * 60e3, Math.floor(t / 60e3) * 60e3);
      const bar = ks.at(-1), prev = ks.at(-2);
      const h24 = ks.slice(-1441, -1), h24i = ks.slice(-1440);
      const sum = (a, f) => a.reduce((s, b) => s + b[f], 0);
      const cand = {
        q_over_24h: bar.quoteVolume / sum(h24, 'quoteVolume') * 100,
        q_over_24hIncl: bar.quoteVolume / sum(h24i, 'quoteVolume') * 100,
        v_over_prev_minus1: (bar.volume / prev.volume - 1) * 100,
        takerDelta: (2 * bar.takerBuyBase - bar.volume) / bar.volume * 100,
        v24change: (sum(h24i, 'volume') / sum(ks.slice(-1442, -2), 'volume') - 1) * 100
      };
      const want = r.volumePct;
      const row = { sym: r.symbol, t: r.createdAt, dir: r.direction, want, barDir: bar.close >= bar.open ? 'up' : 'down' };
      for (const [k, v] of Object.entries(cand)) { row[k] = +v.toFixed(3); add('vol.' + k + '.abs±0.01', Math.abs(Math.abs(v) - Math.abs(want)) <= 0.011); add('vol.' + k + '.signed±0.01', Math.abs(v - want) <= 0.011); }
      add('vol.signMatchesDirection', Math.sign(want) === (r.direction === 'up' ? 1 : -1));
      add('vol.signMatchesBar', Math.sign(want) === (row.barDir === 'up' ? 1 : -1));
      out.volume.push(row);
    } catch (e) { }
  }
  // ---- M1 Premium extras on live-polled rows
  const mp = load('m1-premium').filter(r => r.seenAt).map(parse).slice(-MAX);
  const btcCache = {};
  const history = new Map();
  for (const r of mp) {
    try {
      const row = { sym: r.symbol, t: r.createdAt, dir: r.direction, boost: r.boostPct, stars: r.stars, wtWant: (r.raw.match(/WT Cross:([^\n<]*)/) || [])[1] || null, coinNew: /Coin Status: New/.test(r.raw), btcVol: /Volatilite/.test(r.raw), div: r.divergence };
      // stars hypotheses
      const key = r.symbol + r.direction; const prevT = history.get(key) || []; row.prevSameDir5m = prevT.filter(x => r.t - x < 300e3).length; prevT.push(r.t); history.set(key, prevT);
      // WT on each tf
      row.wt = {};
      for (const tf of ['1m', '5m', '1h']) {
        const ks = await klinesAt(r.symbol, tf, r.t, 500);
        const s = liveSeries(ks, r.t, r.price);
        const wc = I.waveTrend(s.closed, 10, 21, 4, 'first'); const wl = I.waveTrend(s.all, 10, 21, 4, 'first');
        row.wt[tf] = { closed: I.crossAt(wc.wt1, wc.wt2, s.closed.length - 1), live: I.crossAt(wl.wt1, wl.wt2, s.all.length - 1), wt1: +wl.wt1.at(-1)?.toFixed(1), n: ks.length };
      }
      row.ageDays = (r.t - onboard[r.symbol]) / 86400e3;
      // BTC 1m change at that moment
      const bk = await klinesAt('BTCUSDT', '1m', r.t, 30);
      const bs = liveSeries(bk, r.t, bk.find(b => b.openTime <= r.t && b.closeTime >= r.t)?.close);
      const b1 = bs.lb ? (bs.lb.close / bs.lb.open - 1) * 100 : null;
      const bHiLo = bs.lb ? (Math.max(...bk.slice(-5).map(b => b.high)) / Math.min(...bk.slice(-5).map(b => b.low)) - 1) * 100 : null;
      row.btc1m = b1 && +b1.toFixed(3); row.btcRange5 = bHiLo && +bHiLo.toFixed(3);
      out.premium.push(row);
    } catch (e) { }
  }
  fs.mkdirSync(path.join(ROOT, 'analysis'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'analysis', 'm1-extras.json'), JSON.stringify({ stats: S, ...out }, null, 1));
  console.log(JSON.stringify(Object.fromEntries(Object.entries(S).map(([k, v]) => [k, `${v[1]}/${v[0]}`])), null, 1));
})();
