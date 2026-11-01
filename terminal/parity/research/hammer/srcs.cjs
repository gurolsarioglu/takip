'use strict';
// Hypothesis test: hammer indicators come from a different price source (mark / index / spot / last) or moment.
const fs = require('node:fs'), path = require('node:path');
const I = require('../../lib/ind.cjs'); const { parse } = require('../../lib/ref.cjs'); const { getJson, cached, toBar, ROOT } = require('../../lib/net.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const BOT = arg('bot', 'hammer-pro-plus'), MAX = +arg('max', 60);
const MS = { '1m': 60e3, '5m': 300e3, '1h': 3600e3 };
const S = {}; const add = (k, ok) => { S[k] = S[k] || [0, 0]; S[k][0]++; if (ok) S[k][1]++; };
async function src(kind, sym, tf, t) {
  const live = Math.floor(t / MS[tf]) * MS[tf], end = live + MS[tf] - 1;
  const url = kind === 'mark' ? `https://fapi.binance.com/fapi/v1/markPriceKlines?symbol=${sym}&interval=${tf}&endTime=${end}&limit=1000`
    : kind === 'index' ? `https://fapi.binance.com/fapi/v1/indexPriceKlines?pair=${sym}&interval=${tf}&endTime=${end}&limit=1000`
    : kind === 'spot' ? `https://api.binance.com/api/v3/klines?symbol=${sym}&interval=${tf}&endTime=${end}&limit=1000`
    : `https://fapi.binance.com/fapi/v1/klines?symbol=${sym}&interval=${tf}&endTime=${end}&limit=1000`;
  const raw = await cached(`src_${kind}_${sym}_${tf}_${live}`, () => getJson(url));
  return raw.map(toBar);
}
(async () => {
  const rows = fs.readFileSync(path.join(ROOT, 'ref', BOT + '.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => parse(JSON.parse(l))).sort((a, b) => b.t - a.t).slice(0, MAX);
  for (const r of rows) for (const kind of ['last', 'mark', 'index', 'spot']) for (const tf of ['1m', '5m', '1h']) {
    const want = r.rsi[tf]; if (!Number.isFinite(want)) continue;
    let bars; try { bars = await src(kind, r.symbol, tf, r.t); } catch (e) { add(`${kind}|err`, false); continue; }
    const closed = bars.filter(b => b.closeTime < r.t), live = bars.find(b => b.openTime <= r.t && b.closeTime >= r.t);
    const cl = closed.map(b => b.close);
    const variants = { closed: cl, liveFinal: live ? [...cl, live.close] : null, liveMsg: [...cl, r.price], liveOpen: live ? [...cl, live.open] : null };
    // shifted: evaluation one bar earlier (drop last closed, treat it as live with its close)
    for (const [k, c] of Object.entries(variants)) { if (!c) continue; const v = I.rsi(c).at(-1); add(`${r.strategy}|${tf}|${kind}|${k}`, Math.round(v) === want); add(`ALL|${tf}|${kind}|${k}`, Math.round(v) === want); }
  }
  console.log(Object.entries(S).sort().map(([k, [n, ok]]) => `${k}\t${ok}/${n}\t${(100 * ok / n).toFixed(1)}%`).join('\n'));
})();
