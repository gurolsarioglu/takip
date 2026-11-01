'use strict';
// M1-A / M1 Premium coverage test: for every futures symbol and every 1m bar in the reference window,
// compare the bar's open->extreme excursion with whether Visivero emitted a message in that bar.
// Usage: node m1check.cjs [--bot m1] [--hours 6]
const fs = require('node:fs');
const path = require('node:path');
const { parse } = require('./lib/ref.cjs');
const { klinesRange, exchangeInfo, ROOT } = require('./lib/net.cjs');

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const BOT = arg('bot', 'm1');
const HOURS = Number(arg('hours', 6));

(async () => {
  const refs = fs.readFileSync(path.join(ROOT, 'ref', BOT + '.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => parse(JSON.parse(l)));
  const tmax = Math.floor(Math.max(...refs.map(r => r.t)) / 60e3) * 60e3 - 60e3; // last fully covered minute
  const tmin = Math.max(Math.ceil(Math.min(...refs.map(r => r.t)) / 60e3) * 60e3 + 60e3, tmax - HOURS * 3600e3);
  const inWin = refs.filter(r => r.t >= tmin && r.t < tmax + 60e3);
  const bySymMin = new Map();
  for (const r of inWin) { const k = r.symbol + '|' + Math.floor(r.t / 60e3) * 60e3; const a = bySymMin.get(k) || []; a.push(r); bySymMin.set(k, a); }
  const info = await exchangeInfo();
  const universe = info.symbols.filter(s => s.contractType === 'PERPETUAL' && s.status === 'TRADING' && ['USDT', 'USDC'].includes(s.quoteAsset)).map(s => s.symbol);
  const refSyms = new Set(inWin.map(r => r.symbol));
  const res = { bot: BOT, window: [new Date(tmin).toISOString(), new Date(tmax).toISOString()], messages: inWin.length, universe: universe.length, refSymbols: refSyms.size, refSymbolsNotInUniverse: [...refSyms].filter(s => !universe.includes(s)) };
  // API keeps only the latest 100 messages per symbol per bot: a symbol's history is complete only after its oldest retained message.
  const symStart = new Map();
  { const g = new Map(); for (const r of refs) { const a = g.get(r.symbol) || []; a.push(r.t); g.set(r.symbol, a); }
    for (const [s, a] of g) if (a.length >= 100) symStart.set(s, Math.ceil(Math.min(...a) / 60e3) * 60e3 + 60e3); }
  const bars = [];
  let n = 0;
  for (const sym of universe) {
    let ks; try { ks = await klinesRange(sym, '1m', tmin, tmax + 59999); } catch (e) { continue; }
    const st = symStart.get(sym) || tmin;
    for (const k of ks) {
      if (k.openTime < st) continue;
      const up = (k.high / k.open - 1) * 100, dn = (k.low / k.open - 1) * 100;
      const msgs = bySymMin.get(sym + '|' + k.openTime) || [];
      bars.push({ sym, t: k.openTime, up: +up.toFixed(3), dn: +dn.toFixed(3), qv: Math.round(k.quoteVolume), nUp: msgs.filter(m => m.direction === 'up').length, nDn: msgs.filter(m => m.direction === 'down').length, maxB: msgs.length ? Math.max(...msgs.map(m => Math.abs(m.boostPct))) : null });
    }
    if (++n % 50 === 0) console.log('symbols', n, '/', universe.length);
  }
  // Threshold scan: for each threshold, recall (bars over thr that got a msg) and precision proxy (msg bars over thr)
  const thr = [0.8, 0.9, 0.95, 1.0, 1.05, 1.1, 1.2, 1.5, 2];
  res.scan = thr.map(T => {
    const overUp = bars.filter(b => b.up >= T), overDn = bars.filter(b => -b.dn >= T);
    return { T, upBars: overUp.length, upWithMsg: overUp.filter(b => b.nUp).length, dnBars: overDn.length, dnWithMsg: overDn.filter(b => b.nDn).length };
  });
  const msgBars = bars.filter(b => b.nUp || b.nDn);
  res.msgBars = msgBars.length;
  res.msgBarsBelow1 = msgBars.filter(b => (b.nUp && b.up < 1) || (b.nDn && -b.dn < 1)).length;
  res.minBoostSeen = Math.min(...inWin.map(r => Math.abs(r.boostPct)).filter(Number.isFinite));
  res.msgsPerBar = msgBars.reduce((s, b) => s + b.nUp + b.nDn, 0) / Math.max(1, msgBars.length);
  // Missed big moves: show examples and their quote volume to see if a liquidity filter exists
  const missed = bars.filter(b => (b.up >= 1.2 && !b.nUp) || (-b.dn >= 1.2 && !b.nDn)).sort((a, b) => b.qv - a.qv);
  res.missedExamples = missed.slice(0, 40);
  res.missedCount = missed.length;
  const hit = bars.filter(b => (b.up >= 1.2 && b.nUp) || (-b.dn >= 1.2 && b.nDn));
  const qs = a => { const s = a.map(b => b.qv).sort((x, y) => x - y); return s.length ? { p10: s[Math.floor(s.length * .1)], p50: s[Math.floor(s.length * .5)], p90: s[Math.floor(s.length * .9)] } : null; };
  res.qvHit = qs(hit); res.qvMissed = qs(missed);
  const missedSyms = {}; for (const b of missed) missedSyms[b.sym] = (missedSyms[b.sym] || 0) + 1;
  res.missedBySymbol = Object.entries(missedSyms).sort((a, b) => b[1] - a[1]).slice(0, 40);
  fs.mkdirSync(path.join(ROOT, 'analysis'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'analysis', BOT + '-coverage.json'), JSON.stringify(res, null, 1));
  fs.writeFileSync(path.join(ROOT, 'analysis', BOT + '-bars.json'), JSON.stringify(bars));
  console.log(JSON.stringify({ ...res, missedExamples: res.missedExamples.slice(0, 10), missedBySymbol: res.missedBySymbol.slice(0, 15) }, null, 1));
})();
