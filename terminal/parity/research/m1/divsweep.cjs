'use strict';
// Parameter sweep of the anchor-divergence detector against M1 Premium "Divergence: <tf>✅" labels
// (label = divergence OPPOSITE to the signal direction). node research/m1/divsweep.cjs --max 300
const fs = require('node:fs');
const path = require('node:path');
const I = require('../../lib/ind.cjs');
const { parse } = require('../../lib/ref.cjs');
const { klinesAt, ROOT } = require('../../lib/net.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const MAX = Number(arg('max', 300));
const fin = Number.isFinite;

// generic anchor divergence at index i (bull: price lower low vs anchor, RSI higher low)
function anchorDiv(bars, rsi, i, bull, o) {
  const a = i - o.N, b = i - o.minDist;
  if (a < o.pivR || !fin(rsi[i])) return false;
  let j = -1;
  for (let k = a; k <= b; k++) { if (!fin(rsi[k])) continue; if (j < 0 || (bull ? rsi[k] < rsi[j] : rsi[k] > rsi[j])) j = k; }
  if (j < 0) return false;
  const rj = rsi[j];
  if (bull ? rj > o.anchorRsi : rj < 100 - o.anchorRsi) return false;
  for (let k = j - o.pivR; k <= j + o.pivR; k++) if (k !== j && fin(rsi[k]) && (bull ? rsi[k] < rj : rsi[k] > rj)) return false;
  const pi = bull ? (o.src === 'close' ? bars[i].close : bars[i].low) : (o.src === 'close' ? bars[i].close : bars[i].high);
  const pj = bull ? (o.src === 'close' ? bars[j].close : bars[j].low) : (o.src === 'close' ? bars[j].close : bars[j].high);
  if (bull ? !(pi < pj && rsi[i] > rj) : !(pi > pj && rsi[i] < rj)) return false;
  if (o.clean) for (let k = j + 1; k < i; k++) if (bull ? bars[k].low < pi : bars[k].high > pi) return false;
  return true;
}

(async () => {
  const rows = fs.readFileSync(path.join(ROOT, 'ref', 'm1-premium.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => parse(JSON.parse(l))).filter(r => fin(r.price)).sort((a, b) => b.t - a.t);
  const pos = rows.filter(r => /Divergence:/.test(r.raw)).slice(0, MAX), neg = rows.filter(r => !/Divergence:/.test(r.raw)).slice(0, MAX);
  const cases = [];
  for (const r of [...pos, ...neg]) {
    const line = (r.raw.match(/Divergence:([^\n]*)/) || [])[1] || '';
    for (const tf of ['1m', '5m', '1h']) {
      try {
        const ks = await klinesAt(r.symbol, tf, r.t, 500);
        const closed = ks.filter(b => b.closeTime < r.t), live = ks.find(b => b.openTime <= r.t && b.closeTime >= r.t);
        if (!live || closed.length < 150) continue;
        const lb = { ...live, close: r.price, high: Math.max(live.high, r.price), low: Math.min(live.low, r.price) };
        const all = [...closed, lb];
        cases.push({ tf, label: line.includes(tf + '✅'), bull: r.direction === 'down', bars: all, rsi: I.rsi(all.map(b => b.close)) });
      } catch (e) { }
    }
  }
  console.log('cases', cases.length);
  const grid = [];
  for (const at of ['live', 'closed', 'either'])
    for (const N of [30, 50, 80, 120])
      for (const anchorRsi of [30, 35, 40, 50, 100])
        for (const pivR of [0, 2, 5])
          for (const src of ['hl', 'close'])
            for (const clean of [true, false])
              grid.push({ at, N, minDist: 2, anchorRsi, pivR, src, clean });
  const res = {};
  for (const tf of ['1m', '5m', '1h']) {
    const C = cases.filter(c => c.tf === tf);
    const out = [];
    for (const o of grid) {
      let tp = 0, fp = 0, fn = 0;
      for (const c of C) {
        const n = c.bars.length - 1;
        const hit = o.at === 'live' ? anchorDiv(c.bars, c.rsi, n, c.bull, o) : o.at === 'closed' ? anchorDiv(c.bars, c.rsi, n - 1, c.bull, o) : (anchorDiv(c.bars, c.rsi, n, c.bull, o) || anchorDiv(c.bars, c.rsi, n - 1, c.bull, o));
        if (c.label && hit) tp++; else if (c.label) fn++; else if (hit) fp++;
      }
      const rec = tp / Math.max(1, tp + fn), prec = tp / Math.max(1, tp + fp);
      out.push({ ...o, tp, fp, fn, rec: +rec.toFixed(3), prec: +prec.toFixed(3), f1: +(2 * rec * prec / Math.max(1e-9, rec + prec)).toFixed(3) });
    }
    out.sort((a, b) => b.f1 - a.f1);
    res[tf] = out.slice(0, 8);
    console.log(tf, 'labels+', C.filter(c => c.label).length, 'of', C.length);
    for (const x of out.slice(0, 6)) console.log(JSON.stringify(x));
  }
  fs.writeFileSync(path.join(ROOT, 'analysis', 'divsweep.json'), JSON.stringify(res, null, 1));
})();
