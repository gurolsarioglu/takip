'use strict';
// Replay rules/four-s.cjs on feature rows (same t/price as features) and score vs reference labels.
// node research/foursn/validate.cjs --mode 4h [--split <ms>]  (rows with C >= split = holdout)
const fs = require('node:fs');
const path = require('node:path');
const rules = require('../../rules/four-s.cjs');
const { klinesAt, ROOT } = require('../../lib/net.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const MODE = arg('mode', '4h');
const SPLIT = Number(arg('split', 0));
const BOTS = MODE === '4h' ? ['4s', '4sniper'] : ['1dws'];

function withLive(raw, t, price, m1) {
  const closed = raw.filter(b => b.closeTime < t);
  const live = raw.find(b => b.openTime <= t && b.closeTime >= t);
  if (!live) return null;
  let hi = Math.max(live.open, price), lo = Math.min(live.open, price);
  const inside = m1.filter(b => b.openTime >= live.openTime && b.closeTime < t);
  if (inside.length && inside[0].openTime === live.openTime) for (const b of inside) { hi = Math.max(hi, b.high); lo = Math.min(lo, b.low); }
  return [...closed, { ...live, close: price, high: hi, low: lo, isLive: true }];
}
const norm = s => String(s || '').replace(/\n(Trader Positioning|Market Exposure):.*$/gm, '').replace(/\s+$/gm, '').trim();

(async () => {
  const dir = path.join(ROOT, 'foursn');
  const rows = []; const seen = new Set();
  for (const f of fs.readdirSync(dir).filter(f => f.startsWith(`features-${MODE}-`))) for (const l of fs.readFileSync(path.join(dir, f), 'utf8').split('\n')) { if (!l) continue; try { const r = JSON.parse(l); const k = r.sym + r.C; if (!seen.has(k)) { seen.add(k); rows.push(r); } } catch {} }
  const cyc = {}; for (const r of rows) { cyc[r.C] = cyc[r.C] || [0, 0]; cyc[r.C][0]++; if (r.labels.length) cyc[r.C][1]++; }
  const isFull = r => cyc[r.C][0] > cyc[r.C][1] + 20;
  // raw reference messages for text comparison
  const refTxt = new Map();
  for (const b of BOTS) for (const l of fs.readFileSync(path.join(ROOT, 'ref', b + '.jsonl'), 'utf8').split('\n')) { if (!l) continue; const m = JSON.parse(l); refTxt.set(`${b}|${m.symbol}|${Date.parse(m.createdAt)}`, m.message); }
  const S = {}; const add = (k, f) => { S[k] = S[k] || { tp: 0, fn: 0, fp: 0, txtOk: 0, txtN: 0 }; f(S[k]); };
  const fpEx = [], fnEx = [], txtEx = [];
  let n = 0;
  for (const r of rows) {
    if (!isFull(r) && !r.labels.some(l => BOTS.includes(l.bot))) continue;
    const set = SPLIT && r.C >= SPLIT ? 'hold' : 'fit';
    const C = r.C;
    const mins = Math.min(240, Math.ceil((r.t - C) / 60e3) + 2);
    const m1 = await klinesAt(r.sym, '1m', r.t, Math.max(3, mins));
    const bars = {};
    for (const tf of ['1h', '4h', '1d']) { const raw = await klinesAt(r.sym, tf, r.t, 1000); bars[tf] = withLive(raw, r.t, r.price, m1); }
    if (!bars['1h'] || !bars['4h'] || !bars['1d']) continue;
    const sig = rules.evaluate({ symbol: r.sym, t: r.t, price: r.price, bars, ratios: {}, state: {} }).filter(s => BOTS.includes(s.botId));
    const labs = r.labels.filter(l => BOTS.includes(l.bot));
    const key = s => `${s.botId}|${s.strategy || '-'}|${s.direction}`;
    const lk = l => `${l.bot}|${l.strategy || '-'}|${l.dir}`;
    for (const l of labs) {
      const hit = sig.find(s => key(s) === lk(l));
      add(set + ' ' + lk(l), s => { if (hit) s.tp++; else s.fn++; });
      if (!hit && fnEx.length < 60) fnEx.push({ sym: r.sym, C: new Date(C).toISOString(), lab: lk(l), got: sig.map(key) });
      if (hit) {
        const want = refTxt.get(`${l.bot}|${r.sym}|${l.t}`);
        add(set + ' ' + lk(l), s => { s.txtN++; if (norm(want) === norm(hit.text)) s.txtOk++; });
        if (want && norm(want) !== norm(hit.text) && txtEx.length < 25) txtEx.push({ want: norm(want), got: norm(hit.text) });
      }
    }
    if (isFull(r)) for (const s of sig) if (!labs.some(l => lk(l) === key(s))) { add(set + ' ' + key(s), x => x.fp++); if (fpEx.length < 60) fpEx.push({ sym: r.sym, C: new Date(C).toISOString(), sig: key(s), labs: labs.map(lk) }); }
    if (++n % 200 === 0) console.error('rows', n);
  }
  const fullRows = rows.filter(isFull).length;
  const out = { mode: MODE, rows: n, fullRows, fullCycles: Object.keys(cyc).filter(c => cyc[c][0] > cyc[c][1] + 20).map(c => new Date(+c).toISOString()), stats: S, fnEx, fpEx, txtEx };
  fs.writeFileSync(path.join(dir, `validate-${MODE}.json`), JSON.stringify(out, null, 1));
  console.log(JSON.stringify({ rows: n, fullRows, fullCycles: out.fullCycles, stats: S }, null, 1));
})();
