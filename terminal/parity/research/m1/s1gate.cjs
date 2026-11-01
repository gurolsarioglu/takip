'use strict';
// Hammer Pro #S1: test W1-style gates (direction toggle, 24h range <= 23 %, weekly pivot dist <= 9 %) on our logged
// exp-hammer-s1 candidates vs Visivero hammer-pro #S1 messages.
const fs = require('node:fs');
const path = require('node:path');
const { klinesAt, ROOT } = require('../../lib/net.cjs');
const L = d => fs.readFileSync(d, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
const live = path.join(ROOT, 'live');
const exp = fs.readdirSync(live).filter(f => f.startsWith('signals-')).flatMap(f => L(path.join(live, f))).filter(x => x.botId === 'exp-hammer-s1');
const ref = L(path.join(ROOT, 'ref', 'hammer-pro.jsonl')).map(r => ({ sym: r.symbol, t: Date.parse(r.createdAt), dir: r.message.startsWith('🟢') ? 'up' : 'down', s: (r.message.match(/#(W1|S1|R1)/) || [])[1] }));
const t0 = Math.min(...exp.map(x => x.t));
const bySym = {}; for (const r of ref) (bySym[r.sym] = bySym[r.sym] || []).push(r);
for (const v of Object.values(bySym)) v.sort((a, b) => a.t - b.t);
(async () => {
  // episodes: first candidate per symbol/dir per 10 min
  const last = {}, eps = [];
  for (const x of exp.sort((a, b) => a.t - b.t)) { const k = x.symbol + x.direction; if (last[k] && x.t - last[k] < 600e3) continue; last[k] = x.t; eps.push(x); }
  const refS1 = ref.filter(r => r.s === 'S1' && r.t >= t0);
  let n = 0;
  for (const e of eps) {
    const R = bySym[e.symbol] || [];
    e.label = R.some(r => r.s === 'S1' && r.dir === e.direction && Math.abs(r.t - e.t) < 600e3);
    const prev = R.filter(r => r.t < e.t - 60e3).at(-1);
    e.toggleOk = !prev || prev.dir !== e.direction;
    try { const h = (await klinesAt(e.symbol, '1h', e.t, 30)).filter(b => b.openTime <= e.t).slice(-25); e.range24 = (Math.max(...h.map(b => b.high)) / Math.min(...h.map(b => b.low)) - 1) * 100; } catch (er) { e.range24 = NaN; }
    if (++n % 200 === 0) console.log('eps', n, '/', eps.length);
  }
  const caught = new Set();
  const ev = (name, f) => {
    const S = eps.filter(f); const tp = S.filter(e => e.label).length;
    const rc = refS1.filter(r => S.some(e => e.symbol === r.sym && e.direction === r.dir && Math.abs(r.t - e.t) < 600e3)).length;
    console.log(name.padEnd(40), 'n', S.length, 'tp', tp, 'prec', (tp / Math.max(1, S.length)).toFixed(3), 'recall', (rc / Math.max(1, refS1.length)).toFixed(3));
  };
  console.log('episodes', eps.length, 'ref S1 since', new Date(t0).toISOString(), refS1.length);
  const piv = e => !Number.isFinite(e.fields.pivot) || e.fields.pivot <= 9;
  const vol = e => !Number.isFinite(e.range24) || e.range24 <= 23;
  ev('all', () => true);
  ev('toggle', e => e.toggleOk);
  ev('toggle+vol', e => e.toggleOk && vol(e));
  ev('toggle+vol+piv', e => e.toggleOk && vol(e) && piv(e));
  ev('toggle+vol+piv+oldS1', e => e.toggleOk && vol(e) && piv(e) && e.fields.oldS1);
  ev('toggle+vol+piv+dia', e => e.toggleOk && vol(e) && piv(e) && e.fields.diaLive);
  ev('toggle+vol+piv+oldS1+dia', e => e.toggleOk && vol(e) && piv(e) && e.fields.oldS1 && e.fields.diaLive);
  fs.writeFileSync(path.join(ROOT, 'analysis', 's1gate.json'), JSON.stringify(eps.map(e => ({ s: e.symbol, d: e.direction, t: e.t, label: e.label, tog: e.toggleOk, r24: e.range24, rsi: e.rsi, srsi: e.srsi, f: e.fields, boost: e.boostPct }))));
})();
