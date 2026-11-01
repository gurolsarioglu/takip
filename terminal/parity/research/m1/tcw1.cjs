'use strict';
// Is Hammer #W1 = Trader Club BUY-SELL "Mild Buy/Sell" (WT(9,12,SMA3) on hlc3, TA-Lib EMA, cross with wt2 <= -53 / >= 53)?
// Part A: Visivero W1 messages -> does a TC mild cross exist on the last closed 1m bar (vs WT(10,21,4))?
// Part B: our live W1 signals labelled true/false -> does the TC cross separate them?
const fs = require('node:fs');
const path = require('node:path');
const I = require('../../lib/ind.cjs');
const { parse } = require('../../lib/ref.cjs');
const { klinesAt, ROOT } = require('../../lib/net.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const MAX = Number(arg('max', 150));

function wtTC(bars) { // TC: ema seeded by SMA (TA-Lib), ci NaN -> 0, wt2 = SMA3 (min_periods=1)
  const ap = bars.map(b => (b.high + b.low + b.close) / 3);
  const esa = I.ema(ap, 9, 'sma');
  const d = I.ema(ap.map((v, i) => Math.abs(v - esa[i])), 9, 'sma');
  const ci = ap.map((v, i) => { const x = (v - esa[i]) / (0.015 * d[i]); return Number.isFinite(x) ? x : 0; });
  const wt1 = I.ema(ci, 12, 'sma');
  const wt2 = wt1.map((_, i) => { const a = wt1.slice(Math.max(0, i - 2), i + 1).filter(Number.isFinite); return a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN; });
  return { wt1, wt2 };
}
function mild(w, i) { const x = I.crossAt(w.wt1, w.wt2, i); if (x === 1 && w.wt2[i] <= -53) return 1; if (x === -1 && w.wt2[i] >= 53) return -1; return 0; }
const S = {}; const add = (k, ok) => { S[k] = S[k] || [0, 0]; S[k][0]++; if (ok) S[k][1]++; };

(async () => {
  // Part A
  const rows = fs.readFileSync(path.join(ROOT, 'ref', 'hammer-pro.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => parse(JSON.parse(l))).filter(r => r.strategy === '#W1').sort((a, b) => b.t - a.t).slice(0, MAX);
  for (const r of rows) {
    try {
      const ks = await klinesAt(r.symbol, '1m', r.t, 500);
      const closed = ks.filter(b => b.closeTime < r.t);
      const D = r.direction === 'up' ? 1 : -1, n = closed.length - 1;
      const tc = wtTC(closed), lb = I.waveTrend(closed, 10, 21, 4, 'first');
      add('A tc(9,12,3) mild on last closed', mild(tc, n) === D);
      add('A tc mild within last 2 closed', mild(tc, n) === D || mild(tc, n - 1) === D);
      add('A lb(10,21,4) cross&|wt2|>=53 last closed', I.crossAt(lb.wt1, lb.wt2, n) === D && D * lb.wt2[n] <= -53);
    } catch (e) { }
  }
  // Part B
  const from = Date.parse(arg('from', '2026-10-26T06:40:00Z')), to = Date.parse(arg('to', '2026-10-26T18:30:00Z'));
  const feat = JSON.parse(fs.readFileSync(path.join(ROOT, 'analysis', 'w1feat-hammer-pro.json'), 'utf8'));
  for (const f of feat) {
    const t = Date.parse(f.t);
    if (t < from || t > to) continue;
    try {
      const ks = await klinesAt(f.sym, '1m', t, 500);
      const closed = ks.filter(b => b.closeTime < t);
      const D = f.dir === 'up' ? 1 : -1, n = closed.length - 1;
      const tc = wtTC(closed);
      add(`B ${f.ok ? 'TRUE ' : 'FALSE'} has tc mild`, mild(tc, n) === D);
    } catch (e) { }
  }
  // Part C: #S1 messages vs TC reversal diamonds (RSI21 < 30 & RSI21 < EMA10(RSI21)) on the live 1m bar and last closed bars
  const s1 = fs.readFileSync(path.join(ROOT, 'ref', 'hammer-pro.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => parse(JSON.parse(l))).filter(r => r.strategy === '#S1').sort((a, b) => b.t - a.t).slice(0, MAX);
  for (const r of s1) {
    try {
      const ks = await klinesAt(r.symbol, '1m', r.t, 500);
      const closed = ks.filter(b => b.closeTime < r.t), live = ks.find(b => b.openTime <= r.t && b.closeTime >= r.t);
      const closes = [...closed.map(b => b.close), r.price];
      const D = r.direction === 'up' ? 1 : -1;
      const rsi21 = I.rsi(closes, 21), avg = I.ema(rsi21.map(v => Number.isFinite(v) ? v : 0), 10, 'sma');
      const dia = i => D === 1 ? (rsi21[i] < 30 && rsi21[i] < avg[i]) : (rsi21[i] > 70 && rsi21[i] > avg[i]);
      const n = closes.length - 1;
      add('C S1: diamond on live bar', dia(n));
      add('C S1: diamond on live or last 3 closed', dia(n) || dia(n - 1) || dia(n - 2) || dia(n - 3));
      const r14 = I.rsi(closes, 14), sma = I.sma(r14, 14);
      add('C S1: RSI14 crosses SMA14 live', D * I.crossAt(r14, sma, n) === 1);
    } catch (e) { }
  }
  console.log(Object.entries(S).map(([k, v]) => `${k}: ${v[1]}/${v[0]}`).join('\n'));
})();
