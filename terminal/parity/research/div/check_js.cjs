'use strict';
// Offline check of rules/div.cjs on reference messages (positive replay, fresh state) — runs without network.
const fs = require('node:fs'); const path = require('node:path');
const rule = require('../../rules/div.cjs');
const { parse } = require('../../lib/ref.cjs');
const D = path.join(__dirname, '..', '..', 'data');
const load = (s, tf) => { const f = path.join(D, 'div', 'k', `${s}_${tf}.json`); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f)) : null; };
const MS = { '1h': 3600e3, '4h': 14400e3 };
function ctxAt(sym, t, price) {
  const bars = {};
  for (const tf of ['1h', '4h']) {
    const a = load(sym, tf); if (!a) return null;
    const ks = a.filter(k => k[0] <= t).slice(-400).map(k => ({ openTime: k[0], open: k[1], high: k[2], low: k[3], close: k[4], volume: k[5], closeTime: k[0] + MS[tf] - 1 }));
    const live = ks.at(-1); if (!live || t >= live.closeTime) return null;
    Object.assign(live, { isLive: true, close: price, high: Math.max(live.open, price), low: Math.min(live.open, price) });
    bars[tf] = ks;
  }
  return { symbol: sym, t, price, bars, state: {} };
}
const refs = fs.readFileSync(path.join(D, 'ref', 'div.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => parse(JSON.parse(l)));
const n = {}, hit = {}, txt = [];
for (const r of refs.filter((_, k) => k % 3 === 0)) {
  const c = ctxAt(r.symbol, r.t, r.price); if (!c) continue;
  const key = r.strategy + ' ' + r.direction; n[key] = (n[key] || 0) + 1;
  const sigs = rule.evaluate(c);
  const s = sigs.find(x => x.strategy === r.strategy && x.direction === r.direction);
  if (s) { hit[key] = (hit[key] || 0) + 1; if (txt.length < 2) txt.push([r.raw, s.text]); }
}
for (const k of Object.keys(n).sort()) console.log(k, `${hit[k] || 0}/${n[k]}`);
for (const [a, b] of txt) console.log('--- ref\n' + a + '\n--- ours\n' + b);
