'use strict';
// Do Hammer-family messages compute RSI/SRSI on Heikin Ashi candles? Compare printed values with normal vs HA candles.
// node research/m1/ha.cjs --bots hammer-pro,hammer --max 120
const fs = require('node:fs');
const path = require('node:path');
const I = require('../../lib/ind.cjs');
const { parse } = require('../../lib/ref.cjs');
const { klinesAt, ROOT } = require('../../lib/net.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const bots = arg('bots', 'hammer-pro,hammer,m1-premium').split(',');
const MAX = Number(arg('max', 120));
const TF = { 'hammer-pro': ['1m', '5m', '1h'], 'hammer': ['1m', '5m', '1h'], 'hammer-pro-plus': ['1m', '5m', '1h'], 'm1-premium': ['1m', '5m', '1h'], '1d-hammer-pro': ['1h', '4h', '1d'], 'div': ['1h', '4h', '1d'], '4s': ['1h', '4h', '1d'] };

function heikin(bars) {
  const out = []; let po = NaN, pc = NaN;
  for (const b of bars) {
    const c = (b.open + b.high + b.low + b.close) / 4;
    const o = Number.isFinite(po) ? (po + pc) / 2 : (b.open + b.close) / 2;
    out.push({ ...b, open: o, close: c, high: Math.max(b.high, o, c), low: Math.min(b.low, o, c) });
    po = o; pc = c;
  }
  return out;
}
const S = {}; const add = (k, ok) => { S[k] = S[k] || [0, 0]; S[k][0]++; if (ok) S[k][1]++; };
(async () => {
  for (const bot of bots) {
    const f = path.join(ROOT, 'ref', bot + '.jsonl'); if (!fs.existsSync(f)) continue;
    const rows = fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => parse(JSON.parse(l))).filter(r => Number.isFinite(r.price) && Object.keys(r.rsi).length).sort((a, b) => b.t - a.t).slice(0, MAX);
    for (const r of rows) {
      for (const tf of TF[bot] || []) {
        try {
          const ks = await klinesAt(r.symbol, tf, r.t, 500);
          const closed = ks.filter(b => b.closeTime < r.t), live = ks.find(b => b.openTime <= r.t && b.closeTime >= r.t);
          if (!live) continue;
          const lb = { ...live, close: r.price, high: Math.max(live.high, r.price), low: Math.min(live.low, r.price) };
          const lbOpenOnly = { ...live, close: r.price, high: Math.max(live.open, r.price), low: Math.min(live.open, r.price) };
          const variants = {
            normal: [...closed, lb].map(b => b.close),
            ha: heikin([...closed, lb]).map(b => b.close),
            haOpenHL: heikin([...closed, lbOpenOnly]).map(b => b.close),
            haClosed: heikin(closed).map(b => b.close)
          };
          for (const [name, closes] of Object.entries(variants)) {
            const sr = I.stochRsi(closes);
            const want = r.rsi[tf], wantK = r.srsi[tf];
            if (Number.isFinite(want)) { add(`${bot}|${tf}|rsi|${name}|round`, Math.round(sr.rsi.at(-1)) === want); add(`${bot}|${tf}|rsi|${name}|±1`, Math.abs(sr.rsi.at(-1) - want) <= 1); }
            if (Number.isFinite(wantK)) add(`${bot}|${tf}|srsi|${name}|round`, Math.round(sr.k.at(-1)) === wantK);
          }
        } catch (e) { }
      }
    }
  }
  const out = Object.entries(S).sort().map(([k, v]) => `${k}  ${v[1]}/${v[0]} (${(100 * v[1] / v[0]).toFixed(0)}%)`);
  fs.mkdirSync(path.join(ROOT, 'analysis'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'analysis', 'ha-test.txt'), out.join('\n'));
  console.log(out.join('\n'));
})();
