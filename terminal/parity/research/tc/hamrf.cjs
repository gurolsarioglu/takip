'use strict';
// Trader Club 1m Buy/Sell (Range Filter hlc3/50, mult 0.7+0.5*S) as a gate for Hammer Pro.
// A) our live #W1 signals (TP/FP vs Visivero)   B) our logged #S1 candidates (exp-hammer-s1) vs Visivero #S1
// C) Visivero S1/W1/R1 recall: share having the gate true.
const fs = require('node:fs');
const path = require('node:path');
const { klinesAt, ROOT } = require('../../lib/net.cjs');
const RF = require('./rflib.cjs');
const MULT = 0.7 + 0.5 * Number(process.argv[2] || 3), PER = 50;
const L = f => { try { return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean); } catch { return []; } };
const live = [];
for (const f of fs.readdirSync(path.join(ROOT, 'live')).filter(f => f.startsWith('signals-'))) for (const l of fs.readFileSync(path.join(ROOT, 'live', f), 'utf8').split('\n')) if (l.includes('"botId":"hammer-pro"') || l.includes('exp-hammer-s1')) { try { live.push(JSON.parse(l)); } catch { } }
const ref = L(path.join(ROOT, 'ref', 'hammer-pro.jsonl')).map(r => ({ s: r.symbol, t: Date.parse(r.createdAt), d: r.message.startsWith('🟢') ? 1 : -1, st: (r.message.match(/#(W1|S1|R1)/) || [])[1] }));
const T0 = live.reduce((m, x) => Math.min(m, x.t), Infinity);
const ded = (arr, key, gap) => { const last = {}; return arr.sort((a, b) => a.t - b.t).filter(x => { const k = key(x); if (last[k] && x.t - last[k] < gap) return false; last[k] = x.t; return true; }); };
const W = ded(live.filter(x => x.botId === 'hammer-pro' && x.strategy === '#W1'), x => x.symbol + x.direction, 900e3);
const S = ded(live.filter(x => x.botId === 'exp-hammer-s1'), x => x.symbol + x.direction, 600e3);
const V = ref.filter(r => r.t >= T0 && r.st);
async function feat(sym, t, dir) {
  const bars = (await klinesAt(sym, '1m', t, 400)).filter(b => b.openTime <= t);
  if (bars.length < 200) return null;
  const closedN = bars.at(-1).closeTime >= t ? bars.length - 1 : bars.length; // index of first non-closed
  const src = bars.map(b => (b.high + b.low + b.close) / 3);
  const { sig } = RF.rangeFilter(src.slice(0, closedN), PER, MULT);
  let age = 99, st = 0;
  for (let j = closedN - 1; j >= 0; j--) if (sig[j]) { if (age === 99) { age = closedN - 1 - j; st = sig[j] === 'B' ? 1 : -1; } break; }
  // live-bar flip (uses the whole live minute = slight look-ahead)
  const sigL = RF.rangeFilter(src, PER, MULT).sig;
  const liveFlip = sigL[bars.length - 1] ? (sigL[bars.length - 1] === 'B' ? 1 : -1) : 0;
  return { age, st, sameState: st === dir, freshSame: st === dir && age <= 2, liveSame: liveFlip === dir };
}
(async () => {
  const out = {};
  const run = async (name, items, lab) => {
    const rows = [];
    for (const x of items) { const dir = x.direction === 'up' || x.d === 1 ? 1 : -1; const f = await feat(x.symbol || x.s, x.t, dir).catch(() => null); if (f) rows.push({ ...f, label: lab(x, dir) }); }
    const T = rows.filter(r => r.label), F = rows.filter(r => !r.label);
    const g = (n, p) => { const kt = T.filter(p).length, kf = F.filter(p).length; console.log(`${name.padEnd(10)} ${n.padEnd(34)} keepTP ${kt}/${T.length}  keepFP ${kf}/${F.length}  prec ${(kt / Math.max(1, kt + kf)).toFixed(3)}`); };
    console.log(`${name}: n=${rows.length} TP=${T.length} FP=${F.length} base prec ${(T.length / Math.max(1, rows.length)).toFixed(3)}`);
    g('state = signal dir', r => r.sameState);
    g('state = dir & flip ≤2 bars ago', r => r.freshSame);
    g('state = dir & flip ≤5 bars ago', r => r.sameState && r.age <= 5);
    g('flip on live bar (same dir)', r => r.liveSame);
    g('live flip or flip ≤1 ago', r => r.liveSame || (r.sameState && r.age <= 1));
    g('state OPPOSITE', r => r.st === -( r.sameState ? r.st : -r.st) && !r.sameState);
  };
  const vvMatch = st => (x, dir) => ref.some(r => r.s === (x.symbol) && r.st === st && r.d === dir && Math.abs(r.t - x.t) < 120e3);
  await run('W1 ours', W, vvMatch('W1'));
  await run('S1 cand', S.slice(-1500), vvMatch('S1'));
  // C: Visivero recall
  for (const st of ['W1', 'S1']) {
    const items = V.filter(r => r.st === st).slice(-250); let a = 0, b = 0, c = 0, n = 0;
    for (const r of items) { const f = await feat(r.s, r.t, r.d).catch(() => null); if (!f) continue; n++; if (f.sameState) a++; if (f.freshSame) b++; if (f.liveSame || (f.sameState && f.age <= 1)) c++; }
    console.log(`VV ${st}: n=${n} state=dir ${a} (${(100 * a / n).toFixed(0)}%), fresh≤2 ${b} (${(100 * b / n).toFixed(0)}%), live|≤1 ${c} (${(100 * c / n).toFixed(0)}%)`);
  }
})();
