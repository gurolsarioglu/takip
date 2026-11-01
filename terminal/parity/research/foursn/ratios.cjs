'use strict';
// Which Binance long/short ratio endpoint+period matches "Trader Positioning" / "Market Exposure"?
// Usage: node research/foursn/ratios.cjs --bot 4s --n 40
const fs = require('node:fs');
const path = require('node:path');
const { parse } = require('../../lib/ref.cjs');
const { getJson, cached, ROOT } = require('../../lib/net.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const BOT = arg('bot', '4s'), N = Number(arg('n', 40));
const EPS = ['topLongShortAccountRatio', 'topLongShortPositionRatio', 'globalLongShortAccountRatio'];
const PERIODS = ['5m', '15m', '30m', '1h', '4h'];
(async () => {
  const rows = fs.readFileSync(path.join(ROOT, 'ref', BOT + '.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => parse(JSON.parse(l)))
    .filter(r => r.tp && r.me).sort((a, b) => b.t - a.t).slice(0, N);
  const score = {};
  const det = [];
  for (const r of rows) {
    const d = { sym: r.symbol, t: r.createdAt, tp: r.tp, me: r.me, c: {} };
    for (const ep of EPS) for (const p of PERIODS) {
      const ms = { '5m': 3e5, '15m': 9e5, '30m': 18e5, '1h': 36e5, '4h': 144e5 }[p];
      try {
        const data = await cached(`r_${ep}_${r.symbol}_${p}_${Math.floor(r.t / ms)}`, () => getJson(`https://fapi.binance.com/futures/data/${ep}?symbol=${r.symbol}&period=${p}&startTime=${r.t - 6 * ms}&endTime=${r.t + 2 * ms}&limit=30`));
        // candidates: each row's longAccount; take the latest with timestamp <= t and also the one after
        const sorted = data.sort((a, b) => a.timestamp - b.timestamp);
        sorted.forEach((x, i) => {
          const rel = x.timestamp <= r.t ? 'le' + (sorted.filter(y => y.timestamp <= r.t).length - 1 - i) : 'gt' + (i - sorted.filter(y => y.timestamp <= r.t).length);
          const L = Number(x.longAccount ?? x.longPosition) * 100, S = 100 - L;
          const dom = L >= 50 ? { pct: +L.toFixed(2), side: 'long' } : { pct: +S.toFixed(2), side: 'short' };
          for (const [lab, want] of [['tp', r.tp], ['me', r.me]]) {
            const key = `${lab}:${ep}:${p}:${rel}`;
            score[key] = score[key] || [0, 0, 0];
            score[key][0]++;
            if (Math.abs(dom.pct - want.pct) < 0.006) score[key][1]++;
            if (dom.side === want.side) score[key][2]++;
          }
          if (rel === 'le0') d.c[`${ep}:${p}`] = dom;
        });
      } catch (e) { d.err = e.message; }
    }
    det.push(d);
  }
  const best = Object.entries(score).filter(([k, v]) => v[0] >= N / 2).sort((a, b) => b[1][1] - a[1][1]).slice(0, 25);
  fs.mkdirSync(path.join(ROOT, 'foursn'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'foursn', `ratios-${BOT}.json`), JSON.stringify({ best, det }, null, 1));
  console.log(JSON.stringify(best));
  console.log(JSON.stringify(det.slice(0, 4), null, 1));
})();
