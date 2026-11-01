'use strict';
// Shared anchor-divergence detector vs 4sniper "4H RSI DIVERGENCE" and 1dws "1D RSI DIVERGENCE".
// node research/m1/divhtf.cjs --bot 4sniper --days 30
const fs = require('node:fs');
const path = require('node:path');
const I = require('../../lib/ind.cjs');
const { klinesRange, exchangeInfo, ROOT } = require('../../lib/net.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const BOT = arg('bot', '4sniper'), DAYS = Number(arg('days', 30));
const fin = Number.isFinite, H = 3600e3;
const CFG = { '4sniper': { tf: '4h', ms: 4 * H, cycle: 4 * H, re: '4H RSI DIVERGENCE' }, '1dws': { tf: '1d', ms: 24 * H, cycle: 12 * H, re: '1D RSI DIVERGENCE' } }[BOT];

function anchorDiv(bars, rsi, i, bull, o) {
  const a = i - o.N, b = i - o.minDist;
  if (a < o.pivR || !fin(rsi[i])) return null;
  let j = -1;
  for (let k = a; k <= b; k++) { if (!fin(rsi[k])) continue; if (j < 0 || (bull ? rsi[k] < rsi[j] : rsi[k] > rsi[j])) j = k; }
  if (j < 0) return null;
  const rj = rsi[j];
  if (bull ? rj > o.anchorRsi : rj < 100 - o.anchorRsi) return null;
  for (let k = j - o.pivR; k <= j + o.pivR; k++) if (k !== j && fin(rsi[k]) && (bull ? rsi[k] < rj : rsi[k] > rj)) return null;
  const pi = bull ? bars[i].low : bars[i].high, pj = bull ? bars[j].low : bars[j].high;
  if (bull ? !(pi < pj && rsi[i] > rj) : !(pi > pj && rsi[i] < rj)) return null;
  for (let k = j + 1; k < i; k++) if (bull ? bars[k].low < pi : bars[k].high > pi) return null;
  return j;
}
const V = {};
const DUMP = arg('dump', '');
if (DUMP) { const [N, pivR, a] = DUMP.split(',').map(Number); V.dump = { at: 'closed', N, pivR, anchorRsi: a, minDist: 2, gate: '40/57', dedupe: true }; }
else for (const at of ['closed', 'live', 'either']) for (const N of [30, 50, 80]) for (const pivR of [2, 5]) for (const anchorRsi of [30, 35, 40]) for (const gate of ['40/57', '50/50', 'none']) for (const dedupe of [true, false])
  V[`${at}_N${N}_p${pivR}_a${anchorRsi}_g${gate}_${dedupe ? 'dd' : 'nd'}`] = { at, N, pivR, anchorRsi, minDist: 2, gate, dedupe };

(async () => {
  const end = Math.floor(Date.now() / CFG.cycle) * CFG.cycle - CFG.cycle, start = end - DAYS * 24 * H;
  const ref = fs.readFileSync(path.join(ROOT, 'ref', BOT + '.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l))
    .filter(r => r.message.includes(CFG.re)).map(r => ({ sym: r.symbol, dir: r.message.startsWith('🟢') ? 'up' : 'down', c: Math.floor(Date.parse(r.createdAt) / CFG.cycle) * CFG.cycle }))
    .filter(r => r.c >= start && r.c <= end);
  const refSet = new Set(ref.map(r => `${r.sym}|${r.dir}|${r.c}`));
  const info = await exchangeInfo();
  const syms = info.symbols.filter(s => s.status === 'TRADING' && ['USDT', 'USDC'].includes(s.quoteAsset) && /PERPETUAL/.test(s.contractType)).map(s => s.symbol);
  const rows = [];
  const anySig = new Set(fs.readFileSync(path.join(ROOT, 'ref', BOT + '.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)).map(r => `${r.symbol}|${Math.floor(Date.parse(r.createdAt) / CFG.cycle) * CFG.cycle}`));
  const res = Object.fromEntries(Object.keys(V).map(k => [k, { tp: 0, fp: 0, f: new Set() }]));
  let n = 0;
  for (const sym of syms) {
    let big, h1;
    try {
      big = await klinesRange(sym, CFG.tf, start - 300 * CFG.ms, end + CFG.cycle);
      h1 = await klinesRange(sym, '1h', start - CFG.ms, end + CFG.cycle);
    } catch (e) { continue; }
    if (big.length < 60) continue;
    const st = Object.fromEntries(Object.keys(V).map(k => [k, {}]));
    for (let c = start; c <= end; c += CFG.cycle) {
      const bo = Math.floor(c / CFG.ms) * CFG.ms;
      const li = big.findIndex(b => b.openTime === bo); if (li < 40) continue;
      // live bar at scan (~15 min after cycle start): closed 1h bars of this bar + open of current hour
      const hs = h1.filter(b => b.openTime >= bo && b.openTime < c);
      const cur = h1.find(b => b.openTime === c); if (!cur) continue;
      const p = cur.open;
      const lb = { openTime: bo, open: big[li].open, high: Math.max(p, ...hs.map(b => b.high)), low: Math.min(p, ...hs.map(b => b.low)), close: p };
      const bars = [...big.slice(0, li), lb];
      const rsi = I.rsi(bars.map(b => b.close));
      const L = bars.length - 1, rl = rsi[L];
      for (const [name, o] of Object.entries(V)) {
        for (const dir of ['up', 'down']) {
          const bull = dir === 'up';
          if (o.gate !== 'none') { const [u, d] = o.gate.split('/').map(Number); if (bull ? rl > u : rl < d) continue; }
          let j = null;
          if (o.at !== 'live') j = anchorDiv(bars, rsi, L - 1, bull, o);
          if (j === null && o.at !== 'closed') j = anchorDiv(bars, rsi, L, bull, o);
          if (j === null) continue;
          const s = st[name];
          if (o.dedupe) { const at = bars[j].openTime; if (s[dir] === at) continue; s[dir] = at; }
          const key = `${sym}|${dir}|${c}`;
          if (DUMP) { const ii = rsi[L - 1] !== undefined ? L - 1 : L; const b5 = bars.slice(-5); const imp = Math.max(...b5.map(b => bull ? (b.open - b.low) / b.low * 100 : (b.high - b.open) / b.open * 100)); rows.push({ sym, dir, c, label: refSet.has(key), other: anySig.has(`${sym}|${c}`), rl, rc: rsi[L - 1], rj: rsi[j], dist: L - 1 - j, imp, pdiff: (bars[L - 1][bull ? 'low' : 'high'] / bars[j][bull ? 'low' : 'high'] - 1) * 100, rdiff: rsi[L - 1] - rsi[j], age: bars.length }); }
          if (refSet.has(key)) { res[name].tp++; res[name].f.add(key); } else res[name].fp++;
        }
      }
    }
    if (++n % 100 === 0) console.log('symbols', n);
  }
  console.log(BOT, 'reference', ref.length, new Date(start).toISOString(), '->', new Date(end).toISOString());
  const out = Object.entries(res).map(([k, v]) => { const r = v.f.size / Math.max(1, ref.length), p = v.tp / Math.max(1, v.tp + v.fp); return { k, tp: v.tp, fp: v.fp, rec: +r.toFixed(3), prec: +p.toFixed(3), f1: +(2 * r * p / Math.max(1e-9, r + p)).toFixed(3) }; }).sort((a, b) => b.f1 - a.f1);
  if (DUMP) fs.writeFileSync(path.join(ROOT, 'analysis', `divhtf-dump-${BOT}.json`), JSON.stringify(rows));
  for (const x of out.slice(0, 15)) console.log(JSON.stringify(x));
  fs.writeFileSync(path.join(ROOT, 'analysis', `divhtf-${BOT}.json`), JSON.stringify(out, null, 1));
})();
