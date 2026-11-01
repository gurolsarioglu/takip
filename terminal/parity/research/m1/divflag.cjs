'use strict';
// Use M1 Premium "Divergence: 1m✅ 5m✅ 1h✅" lines as thousands of labels to identify Visivero's shared divergence detector.
// node research/m1/divflag.cjs --max 250
const fs = require('node:fs');
const path = require('node:path');
const I = require('../../lib/ind.cjs');
const DIV = require('../../rules/div.cjs');
const { parse } = require('../../lib/ref.cjs');
const { klinesAt, ROOT } = require('../../lib/net.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const MAX = Number(arg('max', 250));
const BOT = arg('bot', 'm1-premium');

function wtTC(bars) {
  const ap = bars.map(b => (b.high + b.low + b.close) / 3);
  const esa = I.ema(ap, 9, 'sma'), d = I.ema(ap.map((v, i) => Math.abs(v - esa[i])), 9, 'sma');
  const ci = ap.map((v, i) => { const x = (v - esa[i]) / (0.015 * d[i]); return Number.isFinite(x) ? x : 0; });
  const wt1 = I.ema(ci, 12, 'sma');
  const wt2 = wt1.map((_, i) => { const a = wt1.slice(Math.max(0, i - 2), i + 1).filter(Number.isFinite); return a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN; });
  return wt2;
}
function tcWtDivs(bars, src, top, bot) { // Trader Club _find_wt_divs: returns arrays bull/bear flagged at idx (pivot center idx-2)
  const n = bars.length, bull = new Array(n).fill(false), bear = new Array(n).fill(false);
  let lt = NaN, ltp = NaN, lb = NaN, lbp = NaN;
  for (let idx = 4; idx < n; idx++) {
    const c = idx - 2, w = src.slice(idx - 4, idx + 1); if (!w.every(Number.isFinite)) continue;
    const v = src[c];
    if (w[0] < v && w[1] < v && v > w[3] && v > w[4] && v >= top) { const p = bars[c].high; if (Number.isFinite(lt) && p > ltp && v < lt) bear[idx] = true; lt = v; ltp = p; }
    if (w[0] > v && w[1] > v && v < w[3] && v < w[4] && v <= bot) { const p = bars[c].low; if (Number.isFinite(lb) && p < lbp && v > lb) bull[idx] = true; lb = v; lbp = p; }
  }
  return { bull, bear };
}
function pineRsiDiv(bars, rsi, L = 5, R = 5, lo = 5, hi = 60) { // TradingView RSI divergence (regular), flag at confirmation bar
  const n = bars.length, bull = new Array(n).fill(false), bear = new Array(n).fill(false);
  let lastPL = null, lastPH = null;
  for (let i = L + R; i < n; i++) {
    const c = i - R, v = rsi[c]; if (!Number.isFinite(v)) continue;
    let isL = true, isH = true;
    for (let k = c - L; k <= c + R; k++) { if (k === c) continue; if (!(rsi[k] > v)) isL = false; if (!(rsi[k] < v)) isH = false; }
    if (isL) { if (lastPL && c - lastPL.c >= lo && c - lastPL.c <= hi && v > lastPL.v && bars[c].low < lastPL.p) bull[i] = true; lastPL = { c, v, p: bars[c].low }; }
    if (isH) { if (lastPH && c - lastPH.c >= lo && c - lastPH.c <= hi && v < lastPH.v && bars[c].high > lastPH.p) bear[i] = true; lastPH = { c, v, p: bars[c].high }; }
  }
  return { bull, bear };
}
const S = {}; const add = (k, label, pred) => { S[k] = S[k] || { tp: 0, fp: 0, fn: 0, tn: 0 }; S[k][label ? (pred ? 'tp' : 'fn') : (pred ? 'fp' : 'tn')]++; };
const anyLast = (arr, k) => arr.slice(-k).some(Boolean);

(async () => {
  const rows = fs.readFileSync(path.join(ROOT, 'ref', BOT + '.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => parse(JSON.parse(l))).filter(r => Number.isFinite(r.price)).sort((a, b) => b.t - a.t);
  const pos = rows.filter(r => /Divergence:/.test(r.raw)).slice(0, MAX), neg = rows.filter(r => !/Divergence:/.test(r.raw)).slice(0, MAX);
  for (const r of [...pos, ...neg]) {
    const line = (r.raw.match(/Divergence:([^\n]*)/) || [])[1] || '';
    for (const tf of ['1m', '5m', '1h']) {
      const label = line.includes(tf + '✅');
      try {
        const ks = await klinesAt(r.symbol, tf, r.t, 500);
        const closed = ks.filter(b => b.closeTime < r.t), live = ks.find(b => b.openTime <= r.t && b.closeTime >= r.t);
        if (!live || closed.length < 120) continue;
        const lb = { ...live, close: r.price, high: Math.max(live.high, r.price), low: Math.min(live.low, r.price), isLive: true };
        const all = [...closed, lb];
        const rsiAll = I.rsi(all.map(b => b.close)), rsiC = I.rsi(closed.map(b => b.close));
        const want = r.direction === 'up' ? 'up' : 'down';
        // A: DIV anchor rule, last closed bar, with and without RSI thresholds
        const a1 = DIV.anchorDivergence(all, rsiAll);
        add(`${tf}|A anchor(closed i) same-dir`, label, !!a1[want]);
        add(`${tf}|A anchor(closed i) any-dir`, label, !!(a1.up || a1.down));
        const a2 = DIV.anchorDivergence(all.map((b, k) => (k === all.length - 1 ? { ...b, isLive: false } : b)), rsiAll);
        add(`${tf}|A anchor(live i) same-dir`, label, !!a2[want]);
        const a3 = DIV.anchorDivergence(all.map((b, k) => (k === all.length - 1 ? { ...b, isLive: false } : b)), rsiAll, { anchorRsi: 40 });
        add(`${tf}|A anchor(live i, rsi40) same-dir`, label, !!a3[want]);
        // B: Trader Club WT divergence (two zone sets), recent within last k bars
        const w2 = wtTC(all);
        const d1 = tcWtDivs(all, w2, 15, -40), d2 = tcWtDivs(all, w2, 45, -65);
        for (const k of [1, 3, 5]) {
          const bull = d1.bull.map((v, i) => v || d2.bull[i]), bear = d1.bear.map((v, i) => v || d2.bear[i]);
          add(`${tf}|B tcWT last${k} same-dir`, label, want === 'up' ? anyLast(bull, k) : anyLast(bear, k));
          add(`${tf}|B tcWT last${k} any-dir`, label, anyLast(bull, k) || anyLast(bear, k));
        }
        // C: Pine RSI divergence 5/5 (range 5–60), recent
        const p = pineRsiDiv(all, rsiAll);
        for (const k of [1, 3, 6]) add(`${tf}|C pineRSI last${k} same-dir`, label, want === 'up' ? anyLast(p.bull, k) : anyLast(p.bear, k));
        const p2 = pineRsiDiv(all, rsiAll, 2, 2, 2, 60);
        for (const k of [1, 3]) add(`${tf}|C pineRSI2/2 last${k} same-dir`, label, want === 'up' ? anyLast(p2.bull, k) : anyLast(p2.bear, k));
      } catch (e) { }
    }
  }
  const out = Object.entries(S).map(([k, v]) => {
    const rec = v.tp / Math.max(1, v.tp + v.fn), prec = v.tp / Math.max(1, v.tp + v.fp), acc = (v.tp + v.tn) / (v.tp + v.tn + v.fp + v.fn);
    return { k, ...v, recall: +rec.toFixed(2), precision: +prec.toFixed(2), acc: +acc.toFixed(3) };
  }).sort((a, b) => (b.recall * b.precision) - (a.recall * a.precision));
  fs.mkdirSync(path.join(ROOT, 'analysis'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'analysis', `divflag-${BOT}.json`), JSON.stringify(out, null, 1));
  for (const o of out.slice(0, 30)) console.log(JSON.stringify(o));
})();
