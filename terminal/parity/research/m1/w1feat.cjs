'use strict';
// Features for our live #W1 signals (labelled true/false against Visivero) to find what separates them.
// node research/m1/w1feat.cjs --from 2026-10-26T06:40:00Z --to 2026-10-26T18:30:00Z
const fs = require('node:fs');
const path = require('node:path');
const I = require('../../lib/ind.cjs');
const PIV = require('../../lib/pivot.cjs');
const { klinesAt, ROOT } = require('../../lib/net.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const from = Date.parse(arg('from', '2026-10-26T06:40:00Z')), to = Date.parse(arg('to', '2026-10-26T18:30:00Z'));
const BOT = arg('bot', 'hammer-pro'), STRAT = arg('strategy', '#W1');

const ours = [];
for (const f of fs.readdirSync(path.join(ROOT, 'live')).filter(f => f.startsWith('signals-')))
  for (const l of fs.readFileSync(path.join(ROOT, 'live', f), 'utf8').split('\n')) if (l) { try { const s = JSON.parse(l); if (s.botId === BOT && s.strategy === STRAT && s.t >= from && s.t <= to) ours.push(s); } catch { } }
const ref = fs.readFileSync(path.join(ROOT, 'ref', BOT + '.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l))
  .map(r => ({ symbol: r.symbol, dir: r.message.startsWith('🟢') ? 'up' : 'down', strat: (r.message.match(/Strategy: (\S+)/) || [])[1], t: Date.parse(r.createdAt) }))
  .filter(r => r.strat === STRAT && r.t >= from - 600e3 && r.t <= to + 600e3);

function liveSeries(bars, t, price) {
  const closed = bars.filter(b => b.closeTime < t);
  const live = bars.find(b => b.openTime <= t && b.closeTime >= t);
  return { closed, all: live ? [...closed, { ...live, close: price, high: Math.max(live.open, price), low: Math.min(live.open, price) }] : closed };
}
(async () => {
  const rows = [];
  for (const s of ours) {
    const ok = ref.some(r => r.symbol === s.symbol && r.dir === s.direction && Math.abs(r.t - s.t) < 120e3);
    const D = s.direction === 'up' ? 1 : -1;
    const f = { sym: s.symbol, t: new Date(s.t).toISOString(), dir: s.direction, ok, boost: s.boostPct };
    try {
      for (const tf of ['1m', '5m', '15m', '1h', '4h', '1d']) {
        const ks = await klinesAt(s.symbol, tf, s.t, 400);
        const { closed, all } = liveSeries(ks, s.t, s.price);
        const wc = I.waveTrend(closed, 10, 21, 4, 'first'), wl = I.waveTrend(all, 10, 21, 4, 'first');
        const sr = I.stochRsi(all.map(b => b.close));
        f[tf + '.wt1c'] = +(D * wc.wt1.at(-1)).toFixed(1); f[tf + '.wt2c'] = +(D * wc.wt2.at(-1)).toFixed(1);
        f[tf + '.wt1l'] = +(D * wl.wt1.at(-1)).toFixed(1);
        f[tf + '.xc'] = D * I.crossAt(wc.wt1, wc.wt2, closed.length - 1);
        f[tf + '.rsi'] = +(D === 1 ? sr.rsi.at(-1) : 100 - sr.rsi.at(-1)).toFixed(1);
        f[tf + '.k'] = +(D === 1 ? sr.k.at(-1) : 100 - sr.k.at(-1)).toFixed(1);
        f[tf + '.chg5'] = closed.length > 5 ? +(D * (s.price / closed.at(-5).close - 1) * 100).toFixed(2) : null;
        f[tf + '.n'] = ks.length;
        if (tf === '1m') { // how many closed WT crosses in the same direction in the last 30 bars
          let n = 0; for (let i = closed.length - 30; i < closed.length; i++) if (i > 0 && D * I.crossAt(wc.wt1, wc.wt2, i) === 1) n++;
          f['1m.crosses30'] = n;
          f['1m.minWt2_10'] = +Math.min(...wc.wt2.slice(-10).map(v => D * v)).toFixed(1);
          const vol = closed.slice(-1)[0].quoteVolume, avg = closed.slice(-61, -1).reduce((a, b) => a + b.quoteVolume, 0) / 60;
          f['1m.volRatio'] = +(vol / avg).toFixed(2);
        }
        if (tf === '4h' && closed.length >= 200) { const e = I.ema(closed.map(b => b.close), 200).at(-1); f['4h.ema200d'] = +(D * (s.price / e - 1) * 100).toFixed(2); }
      }
      const w = await klinesAt(s.symbol, '1w', s.t, 5);
      f.pivot = +PIV.weeklyFibPivotDistPct(w, s.price).toFixed(2);
      const b = await klinesAt('BTCUSDT', '5m', s.t, 30);
      const bs = liveSeries(b, s.t, b.at(-1).close);
      f.btc5mChg = +((bs.all.at(-1).close / bs.all.at(-4).close - 1) * 100).toFixed(2);
    } catch (e) { f.err = e.message; }
    rows.push(f);
  }
  fs.mkdirSync(path.join(ROOT, 'analysis'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'analysis', `w1feat-${BOT}.json`), JSON.stringify(rows));
  // univariate separation: for each numeric feature, best threshold accuracy keeping all trues
  const T = rows.filter(r => r.ok && !r.err), F = rows.filter(r => !r.ok && !r.err);
  console.log('true', T.length, 'false', F.length);
  const keys = Object.keys(rows[0] || {}).filter(k => typeof rows[0][k] === 'number');
  const res = [];
  for (const k of keys) {
    for (const side of ['<=', '>=']) {
      const tv = T.map(r => r[k]).filter(Number.isFinite); if (tv.length < T.length * 0.9) continue;
      // threshold that keeps >=90% of trues
      tv.sort((a, b) => a - b);
      const thr = side === '<=' ? tv[Math.ceil(tv.length * 0.9) - 1] : tv[Math.floor(tv.length * 0.1)];
      const keepT = T.filter(r => side === '<=' ? r[k] <= thr : r[k] >= thr).length;
      const keepF = F.filter(r => side === '<=' ? r[k] <= thr : r[k] >= thr).length;
      res.push({ k, side, thr, keepT, keepF, removedF: F.length - keepF });
    }
  }
  res.sort((a, b) => b.removedF - a.removedF);
  for (const r of res.slice(0, 25)) console.log(JSON.stringify(r));
})();
