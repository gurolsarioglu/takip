'use strict';
// M1 Premium: what happens after signals with "Divergence: 1m✅ 5m✅" vs. without? (Botlar V1 signals)
// Return measured in the SIGNAL direction (up: price rise = +; down: price fall = +).
const fs = require('node:fs'); const path = require('node:path');
const { klinesAt } = require('../../lib/net.cjs');
const LIVE = path.resolve(__dirname, '..', '..', '..', 'botlar-v1', 'data', 'live');
const days = process.argv.slice(2).length ? process.argv.slice(2) : ['2026-10-31', '2026-11-01'];
const sigs = [];
for (const d of days) { const f = path.join(LIVE, `signals-${d}.jsonl`); if (!fs.existsSync(f)) continue;
  for (const l of fs.readFileSync(f, 'utf8').split('\n')) { if (!l.includes('"m1-premium"')) continue; try { sigs.push(JSON.parse(l)); } catch { } } }
sigs.sort((a, b) => a.t - b.t);
const last = {}; const ep = [];
for (const s of sigs) { const k = s.symbol + s.direction; if (last[k] && s.t - last[k] < 15 * 60e3) { last[k] = s.t; continue; } last[k] = s.t;
  const dl = (s.text.match(/Divergence:([^\n]*)/) || [])[1] || '';
  ep.push({ s, d1: dl.includes('1m✅'), d5: dl.includes('5m✅'), d1h: dl.includes('1h✅') }); }
const now = Date.now();
const usable = ep.filter(e => now - e.s.t > 65 * 60e3);
const groups = { 'both 1m+5m ✅': e => e.d1 && e.d5, 'only one ✅': e => (e.d1 || e.d5) && !(e.d1 && e.d5), 'no ✅': e => !e.d1 && !e.d5 && !e.d1h };
const MAX = Number(process.env.MAXN || 300);
(async () => {
  const res = {};
  for (const [g, f] of Object.entries(groups)) {
    const list = usable.filter(f); const pick = list.length > MAX ? list.filter((_, i) => i % Math.ceil(list.length / MAX) === 0) : list;
    const rows = [];
    for (const e of pick) {
      try {
        const bars = (await klinesAt(e.s.symbol, '1m', e.s.t + 61 * 60e3, 80)).filter(b => b.openTime >= Math.floor(e.s.t / 60e3) * 60e3);
        if (bars.length < 61) continue;
        const p0 = e.s.price, sg = e.s.direction === 'up' ? 1 : -1, r = p => sg * (p / p0 - 1) * 100;
        const w = bars.slice(0, 61);
        rows.push({ dir: e.s.direction, r15: r(w[15].close), r60: r(w[60].close), mfe: Math.max(...w.map(b => r(sg > 0 ? b.high : b.low))), mae: Math.min(...w.map(b => r(sg > 0 ? b.low : b.high))) });
      } catch (err) { }
    }
    const avg = (a, k) => a.length ? a.reduce((s, x) => s + x[k], 0) / a.length : NaN, med = (a, k) => { const v = a.map(x => x[k]).sort((x, y) => x - y); return v.length ? v[Math.floor(v.length / 2)] : NaN; };
    for (const dir of ['up', 'down']) { const a = rows.filter(x => x.dir === dir); res[`${g} | ${dir}`] = { n: a.length, ort15: avg(a, 'r15').toFixed(2), ort60: avg(a, 'r60').toFixed(2), med60: med(a, 'r60').toFixed(2), devam60: (100 * a.filter(x => x.r60 > 0).length / Math.max(1, a.length)).toFixed(0) + '%', mfe: avg(a, 'mfe').toFixed(2), mae: avg(a, 'mae').toFixed(2) }; }
  }
  console.log('episodes', ep.length, 'usable', usable.length);
  console.table(res);
})();
