'use strict';
// Hypothesis test: 5m/1h indicators are computed from resampled 1m history of limited length N.
const fs = require('node:fs'), path = require('node:path');
const I = require('../../lib/ind.cjs'); const { parse } = require('../../lib/ref.cjs'); const { klinesAt, ROOT } = require('../../lib/net.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const BOT = arg('bot', 'hammer-pro-plus'), MAX = +arg('max', 100);
function resample(bars, ms) { const out = []; for (const b of bars) { const o = Math.floor(b.openTime / ms) * ms; const l = out.at(-1); if (l && l.openTime === o) { l.high = Math.max(l.high, b.high); l.low = Math.min(l.low, b.low); l.close = b.close; } else out.push({ openTime: o, open: b.open, high: b.high, low: b.low, close: b.close }); } return out; }
const S = {}; const add = (k, ok) => { S[k] = S[k] || [0, 0]; S[k][0]++; if (ok) S[k][1]++; };
(async () => {
  const rows = fs.readFileSync(path.join(ROOT, 'ref', BOT + '.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => parse(JSON.parse(l))).sort((a, b) => b.t - a.t).slice(0, MAX);
  for (const r of rows) {
    try {
      const m1 = await klinesAt(r.symbol, '1m', r.t, 1500);
      const closed = m1.filter(b => b.closeTime < r.t);
      for (const price of ['msg', 'lastClose']) {
        const p = price === 'msg' ? r.price : closed.at(-1).close;
        for (const live of [true, false]) {
          const seq = live ? [...closed, { openTime: Math.floor(r.t / 60e3) * 60e3, open: closed.at(-1).close, high: p, low: p, close: p }] : closed;
          for (const N of [200, 500, 1000, 1440, 1500]) {
            const s = seq.slice(-N);
            for (const [tf, ms] of [['1m', 60e3], ['5m', 300e3], ['1h', 3600e3]]) {
              const want = r.rsi[tf]; if (!Number.isFinite(want)) continue;
              const bars = tf === '1m' ? s : resample(s, ms);
              const v = I.rsi(bars.map(b => b.close)).at(-1);
              add(`${r.strategy}|${tf}|${price}|live=${live}|N=${N}`, Math.round(v) === want);
            }
          }
        }
      }
    } catch (e) { }
  }
  const lines = Object.entries(S).sort().map(([k, [n, ok]]) => `${k}\t${ok}/${n}\t${(100 * ok / n).toFixed(1)}%`);
  console.log(lines.join('\n'));
})();
