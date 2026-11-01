'use strict';
// Simulate the DIV bot (1H RSI DIVERGENCE) hourly over the last D days for all symbols, with the current rule vs the
// shared-detector variants found on M1 Premium labels. node research/m1/divbot.cjs --days 7
const fs = require('node:fs');
const path = require('node:path');
const I = require('../../lib/ind.cjs');
const { klinesRange, exchangeInfo, ROOT } = require('../../lib/net.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const DAYS = Number(arg('days', 7));
const fin = Number.isFinite;
const H = 3600e3;

function anchorDiv(bars, rsi, i, bull, o) {
  const a = i - o.N, b = i - o.minDist;
  if (a < o.pivR || !fin(rsi[i])) return null;
  let j = -1;
  for (let k = a; k <= b; k++) { if (!fin(rsi[k])) continue; if (j < 0 || (bull ? rsi[k] < rsi[j] : rsi[k] > rsi[j])) j = k; }
  if (j < 0) return null;
  const rj = rsi[j];
  if (bull ? rj > o.anchorRsi : rj < 100 - o.anchorRsi) return null;
  for (let k = j - o.pivR; k <= j + o.pivR; k++) if (k !== j && fin(rsi[k]) && (bull ? rsi[k] < rj : rsi[k] > rj)) return null;
  const P = (x, lowSide) => (o.src === 'close' ? x.close : lowSide ? x.low : x.high);
  const pi = P(bars[i], bull), pj = P(bars[j], bull);
  if (bull ? !(pi < pj && rsi[i] > rj) : !(pi > pj && rsi[i] < rj)) return null;
  for (let k = j + 1; k < i; k++) if (bull ? bars[k].low < pi : bars[k].high > pi) return null;
  return j;
}
const VARIANTS = {};
for (const up of [30, 33, 35, 37, 40]) for (const dn of [57, 60, 63, 65])
  VARIANTS[`up${up}_dn${dn}`] = { N: 80, minDist: 2, anchorRsi: 30, pivR: 5, src: 'hl', at: 'closed', liveUp: up, liveDown: dn };

(async () => {
  const end = Math.floor(Date.now() / H) * H - H, start = end - DAYS * 24 * H;
  const ref = fs.readFileSync(path.join(ROOT, 'ref', 'div.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l))
    .filter(r => /1H RSI DIVERGENCE/.test(r.message)).map(r => ({ sym: r.symbol, dir: r.message.startsWith('🟢') ? 'up' : 'down', hour: Math.floor(Date.parse(r.createdAt) / H) * H }))
    .filter(r => r.hour >= start && r.hour <= end);
  const refSet = new Set(ref.map(r => `${r.sym}|${r.dir}|${r.hour}`));
  const info = await exchangeInfo();
  const syms = info.symbols.filter(s => s.status === 'TRADING' && ['USDT', 'USDC'].includes(s.quoteAsset) && /PERPETUAL/.test(s.contractType)).map(s => s.symbol);
  const res = Object.fromEntries(Object.keys(VARIANTS).map(k => [k, { tp: 0, fp: 0 }]));
  const found = Object.fromEntries(Object.keys(VARIANTS).map(k => [k, new Set()]));
  let n = 0;
  for (const sym of syms) {
    let bars;
    try { bars = await klinesRange(sym, '1h', start - 400 * H, end + H - 1); } catch (e) { continue; }
    if (bars.length < 200) continue;
    const closes = bars.map(b => b.close);
    for (const [name, o] of Object.entries(VARIANTS)) {
      const st = { lastDiv: {}, anchor: {} };
      for (let li = 150; li < bars.length; li++) {
        const hour = bars[li].openTime; if (hour < start || hour > end) continue;
        // live bar at scan time approximated by its open (DIV scans in the first minutes of the hour)
        const liveC = bars[li].open;
        const sub = bars.slice(0, li + 1).map((b, k) => (k === li ? { ...b, close: liveC, high: liveC, low: liveC } : b));
        const rsi = I.rsi([...closes.slice(0, li), liveC]);
        const rl = rsi[li];
        for (const dir of ['up', 'down']) {
          const bull = dir === 'up';
          if (bull ? rl > o.liveUp : rl < o.liveDown) continue;
          let j = null;
          if (o.at === 'closed' || o.at === 'either') j = anchorDiv(sub, rsi, li - 1, bull, o);
          if (j === null && (o.at === 'live' || o.at === 'either')) j = anchorDiv(sub, rsi, li, bull, o);
          if (j === null) continue;
          const at = bars[j].openTime;
          if (st.anchor[dir] === at) continue;
          if (hour - (st.lastDiv[dir] ?? -1e15) < 3 * H) continue;
          st.anchor[dir] = at; st.lastDiv[dir] = hour;
          const key = `${sym}|${dir}|${hour}`;
          if (refSet.has(key)) { res[name].tp++; found[name].add(key); } else res[name].fp++;
        }
      }
    }
    if (++n % 100 === 0) console.log('symbols', n);
  }
  console.log('reference 1H DIV signals in window:', ref.length, 'window', new Date(start).toISOString(), '->', new Date(end).toISOString());
  for (const [k, v] of Object.entries(res)) console.log(k.padEnd(16), 'TP', v.tp, 'FP', v.fp, 'recall', (found[k].size / ref.length).toFixed(3), 'precision', (v.tp / Math.max(1, v.tp + v.fp)).toFixed(3));
})();
