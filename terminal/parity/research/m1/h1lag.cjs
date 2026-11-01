'use strict';
// Why does M1 Premium's 1h RSI/SRSI often differ from ours? Test hypotheses: (a) live price at signal, (b) closed bars only,
// (c) stale live 1h bar (close = 1m close k minutes ago, k = 1..60), (d) fewer history bars.
const fs = require('node:fs');
const path = require('node:path');
const I = require('../../lib/ind.cjs');
const { klinesAt, ROOT } = require('../../lib/net.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const MAX = Number(arg('max', 250)), TF = arg('tf', '1h');
const rows = fs.readFileSync(path.join(ROOT, 'ref', 'm1-premium.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l))
  .filter(r => r.createdAt >= '2026-10-26').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
const re = new RegExp(`RSI: <b>1m\\.(\\d+)\\D+5m\\.(\\d+)\\D+1h\\.(\\d+)`), rk = /SRSI: <b>1m\.(\d+)\D+5m\.(\d+)\D+1h\.(\d+)/;
(async () => {
  const S = {}; const add = (k, ok) => { S[k] = S[k] || [0, 0]; S[k][0]++; if (ok) S[k][1]++; };
  const seen = new Set(); let n = 0;
  for (const r of rows) {
    if (n >= MAX) break;
    const key = r.symbol + r.createdAt.slice(0, 15); if (seen.has(key)) continue; seen.add(key);
    const m = r.message.match(re), s = r.message.match(rk); if (!m || !s) continue;
    const vr = +m[3], vk = +s[3], price = +(r.message.match(/Current Price: ([\d.]+)/) || [])[1];
    const t = Date.parse(r.createdAt);
    try {
      const h = await klinesAt(r.symbol, TF, t, 500), m1 = await klinesAt(r.symbol, '1m', t, 120);
      const closed = h.filter(b => b.closeTime < t);
      const mc = m1.filter(b => b.closeTime < t);
      const test = (name, closes) => { const sr = I.stochRsi(closes); const i = closes.length - 1; add(name + ' rsi', Math.round(sr.rsi[i]) === vr); add(name + ' srsi', Math.round(sr.k[i]) === vk); add(name + ' both', Math.round(sr.rsi[i]) === vr && Math.round(sr.k[i]) === vk); };
      const cc = closed.map(b => b.close);
      test('live@price', [...cc, price]);
      test('closedOnly', cc);
      for (const k of [1, 2, 3, 5, 10, 15, 20, 30, 45, 60]) { const b = mc[mc.length - k]; if (b) test(`stale${k}m`, [...cc, b.close]); }
      for (const lim of [100, 150, 200, 300]) test(`lim${lim}`, [...cc.slice(-(lim - 1)), price]);
      // live 1h bar open (cycle start)
      const lb = h.find(b => b.openTime <= t && b.closeTime >= t); if (lb) test('liveOpen', [...cc, lb.open]);
      { const x = (await klinesAt(r.symbol, '5m', t, 1500)).filter(b => b.closeTime < t); const x2 = (await klinesAt(r.symbol, '5m', x[0].openTime - 1, 1500)).filter(b => b.closeTime < x[0].openTime); const all = [...x2, ...x];
        for (let X = 0; X < 60; X += 5) { const cl = all.filter(b => new Date(b.closeTime + 1).getUTCMinutes() === X).map(b => b.close); test('samp' + String(X).padStart(2, '0'), [...cl, price]); } }
      n++;
    } catch (e) { }
  }
  console.log('samples', n);
  for (const [k, v] of Object.entries(S).sort((a, b) => b[1][1] / b[1][0] - a[1][1] / a[1][0])) console.log(k.padEnd(20), (v[1] / v[0]).toFixed(3));
})();
