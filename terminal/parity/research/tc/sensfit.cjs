'use strict';
// Fit Range Filter (src, period, mult) per Sensitivity using BREVUSDT 1m labels of 28.10 (UTC) + 27.10 (sens 3).
const { klinesAt } = require('../../lib/net.cjs');
const RF = require('./rflib.cjs');
const D = '2026-10-28T';
const SETS = {
  1: { from: D + '14:52:00Z', to: D + '16:32:00Z', labels: [['14:54', 'B'], ['14:57', 'S'], ['15:03', 'B'], ['15:11', 'S'], ['15:27', 'B'], ['15:30', 'S'], ['15:40', 'B'], ['15:44', 'S'], ['16:01', 'B'], ['16:04', 'S'], ['16:10', 'B'], ['16:14', 'S']] },
  3: { from: D + '14:56:00Z', to: D + '16:32:00Z', labels: [['14:59', 'S'], ['16:01', 'B'], ['16:04', 'S']] },
  6: { from: D + '14:58:00Z', to: D + '16:32:00Z', labels: [['15:32', 'S'], ['16:02', 'B'], ['16:14', 'S']] }
};
const OLD3 = { from: '2026-10-27T16:45:00Z', to: '2026-10-27T18:25:00Z', labels: [['16:50', 'S'], ['17:06', 'B'], ['17:39', 'S'], ['17:52', 'B'], ['17:56', 'S'], ['18:05', 'B'], ['18:15', 'S']], day: '2026-10-27T' };
function score(bars, srcName, per, mult, set, day) {
  const src = bars.map(b => srcName === 'hlc3' ? (b.high + b.low + b.close) / 3 : srcName === 'close' ? b.close : (b.high + b.low) / 2);
  const { sig } = RF.rangeFilter(src, per, mult);
  const from = Date.parse(set.from), to = Date.parse(set.to);
  const flips = []; for (let i = 0; i < bars.length; i++) if (sig[i] && bars[i].openTime >= from && bars[i].openTime <= to) flips.push([bars[i].openTime, sig[i]]);
  let hit = 0; for (const [hm, s] of set.labels) { const t = Date.parse((day || D) + hm + ':00Z'); if (flips.some(([ft, fs]) => fs === s && Math.abs(ft - t) <= 60e3)) hit++; }
  return { hit, n: set.labels.length, extra: flips.length - hit, flips: flips.map(([t, s]) => new Date(t).toISOString().slice(11, 16) + s).join(' ') };
}
(async () => {
  const b28 = (await klinesAt('BREVUSDT', '1m', Date.parse(D + '16:33:00Z'), 1500)).filter(b => b.openTime <= Date.parse(D + '16:32:00Z'));
  const b27 = (await klinesAt('BREVUSDT', '1m', Date.parse('2026-10-27T18:26:00Z'), 1500)).filter(b => b.openTime <= Date.parse('2026-10-27T18:25:00Z'));
  for (const src of ['hlc3']) for (const per of [45, 50, 55, 60]) {
    const best = {};
    for (const s of [1, 3, 6]) {
      let b = null;
      for (let m = 0.5; m <= 8; m += 0.1) { const r = score(b28, src, per, +m.toFixed(1), SETS[s]); const sc = r.hit * 3 - r.extra; if (!b || sc > b.sc) b = { m: +m.toFixed(1), sc, ...r }; }
      const ok = []; for (let m = 0.5; m <= 8; m += 0.05) { const r = score(b28, src, per, +m.toFixed(2), SETS[s]); if (r.hit * 3 - r.extra === b.sc) ok.push(+m.toFixed(2)); }
      b.range = ok.length ? ok[0] + '-' + ok.at(-1) : ''; best[s] = b;
    }
    const o3 = score(b27, src, per, best[3].m, OLD3, OLD3.day);
    console.log(src, 'per', per, Object.entries(best).map(([s, b]) => `s${s}: m${b.range} ${b.hit}/${b.n}+${b.extra} [${b.flips}]`).join(' | '), `| old27 with s3 m: ${o3.hit}/7+${o3.extra}`);
  }
})();
