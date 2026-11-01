'use strict';
// Test: is the printed "Pivot: %x.xx" the distance to the nearest Traditional pivot level (TradingView Pivot Points
// Standard, anchor Auto => 1D for <=15m charts, 1W for 1h)? node research/m1/pivot.cjs --bots hammer-pro,div --max 150
const fs = require('node:fs');
const path = require('node:path');
const I = require('../../lib/ind.cjs');
const { parse } = require('../../lib/ref.cjs');
const { klinesAt, ROOT } = require('../../lib/net.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const bots = arg('bots', 'hammer-pro,hammer-pro-plus,div').split(',');
const MAX = Number(arg('max', 150));

const LEVELS = {
  traditional: (H, L, C) => { const P = (H + L + C) / 3; return { P, R1: 2 * P - L, S1: 2 * P - H, R2: P + (H - L), S2: P - (H - L), R3: H + 2 * (P - L), S3: L - 2 * (H - P), R4: H + 3 * (P - L), S4: L - 3 * (H - P), R5: H + 4 * (P - L), S5: L - 4 * (H - P) }; },
  classic: (H, L, C) => { const P = (H + L + C) / 3, r = H - L; return { P, R1: 2 * P - L, S1: 2 * P - H, R2: P + r, S2: P - r, R3: P + 2 * r, S3: P - 2 * r, R4: P + 3 * r, S4: P - 3 * r }; },
  fibonacci: (H, L, C) => { const P = (H + L + C) / 3, r = H - L; return { P, R1: P + .382 * r, S1: P - .382 * r, R2: P + .618 * r, S2: P - .618 * r, R3: P + r, S3: P - r }; },
  camarilla: (H, L, C) => { const r = H - L; return { P: (H + L + C) / 3, R1: C + r * 1.1 / 12, S1: C - r * 1.1 / 12, R2: C + r * 1.1 / 6, S2: C - r * 1.1 / 6, R3: C + r * 1.1 / 4, S3: C - r * 1.1 / 4, R4: C + r * 1.1 / 2, S4: C - r * 1.1 / 2 }; }
};
function prevPeriodBar(bars, t) { const closed = bars.filter(b => b.closeTime < t); return closed.at(-1); }
const S = {}; const add = (k, ok) => { S[k] = S[k] || [0, 0]; S[k][0]++; if (ok) S[k][1]++; };

(async () => {
  const details = [];
  for (const bot of bots) {
    const f = path.join(ROOT, 'ref', bot + '.jsonl'); if (!fs.existsSync(f)) continue;
    const rows = fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => parse(JSON.parse(l))).filter(r => Number.isFinite(r.price)).sort((a, b) => b.t - a.t);
    const withP = rows.filter(r => Number.isFinite(r.pivotPct)).slice(0, MAX), without = rows.filter(r => !/Pivot:/.test(r.raw)).slice(0, Math.round(MAX / 2));
    for (const r of [...withP, ...without]) {
      try {
        const d1 = await klinesAt(r.symbol, '1d', r.t, 10), w1 = await klinesAt(r.symbol, '1w', r.t, 5);
        const res = {};
        for (const [pname, src] of [['1D', d1], ['1W', w1]]) {
          const pb = prevPeriodBar(src, r.t); if (!pb) continue;
          for (const [lname, fn] of Object.entries(LEVELS)) {
            const lv = fn(pb.high, pb.low, pb.close);
            for (const [dname, dist] of [['/price', v => Math.abs(r.price - v) / r.price * 100], ['/level', v => Math.abs(r.price - v) / v * 100]]) {
              const m = Math.min(...Object.values(lv).filter(Number.isFinite).map(dist));
              const key = `${bot}|${pname}|${lname}|${dname}`;
              if (Number.isFinite(r.pivotPct)) add(key + '|has', Math.abs(m - r.pivotPct) <= 0.011);
              else add(key + '|none(>=1)', m >= 1.0);
              res[`${pname}.${lname}${dname}`] = +m.toFixed(3);
            }
          }
        }
        details.push({ bot, sym: r.symbol, t: r.createdAt, want: r.pivotPct, res });
      } catch (e) { }
    }
  }
  fs.mkdirSync(path.join(ROOT, 'analysis'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'analysis', 'pivot-test.json'), JSON.stringify({ S, details }, null, 1));
  const best = Object.entries(S).map(([k, v]) => [k, v[1] / v[0], `${v[1]}/${v[0]}`]).sort((a, b) => b[1] - a[1]);
  for (const [k, , s] of best.slice(0, 40)) console.log(k, s);
})();
