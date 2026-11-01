'use strict';
// Divergence ▲▼ as Cipher-B style fractal divergence (5-bar fractal on an oscillator, compare with previous fractal). BREVUSDT 1m, UTC.
const I = require('../../lib/ind.cjs');
const { klinesAt } = require('../../lib/net.cjs');
const WIN = [
  { d: '2026-10-28', w0: '05:05', w1: '06:55', lab: [['05:37', 'B'], ['05:48', 'B']] },
  { d: '2026-10-28', w0: '12:46', w1: '18:12', lab: [['13:24', 'B'], ['13:46', 'B'], ['14:39', 'S'], ['14:55', 'S'], ['17:59', 'S']] },
  { d: '2026-10-27', w0: '16:44', w1: '18:32', lab: [['16:47', 'S'], ['18:25', 'B']] },
];
const P = (d, hm) => Date.parse(`${d}T${hm}:00Z`);
(async () => {
  const data = [];
  for (const w of WIN) { const b = (await klinesAt('BREVUSDT', '1m', P(w.d, w.w1) + 60e3, 1000)).filter(x => x.openTime <= P(w.d, w.w1)); data.push({ w, b }); }
  const oscs = [];
  for (const [n1, n2, ns] of [[9, 12, 3], [10, 21, 4], [11, 15, 3], [9, 14, 3], [12, 15, 3], [9, 13, 3], [10, 12, 3], [10, 14, 3], [8, 12, 3], [9, 12, 4]]) for (const which of ['wt1', 'wt2']) oscs.push([`${which}(${n1},${n2},${ns})`, b => I.waveTrend(b, n1, n2, ns)[which]]);
  for (const len of []) oscs.push([`rsi${len}`, b => I.rsi(b.map(x => x.close), len)]);
  //oscs.push(['srsiK', b => I.stochRsi(b.map(x => x.close)).k]);
  const res = [];
  for (const [on, fosc] of oscs) {
    const cache = data.map(({ b }) => fosc(b));
    for (const half of [2, 3]) for (const lt of [0, 15, 20, 30, 40, 45, 53, 60]) for (const lb of [20, 30, 40, 45, 53, 60, 65]) for (const at of [0, 1, 2, 3, 4, 5]) for (const pc of ['hl']) for (const prevMode of ['lastLim']) {
      let hit = 0, exact = 0, extra = 0, tot = 0; const fls = [];
      data.forEach(({ w, b }, wi) => {
        const o = cache[wi], H = pc === 'hl' ? b.map(x => x.high) : b.map(x => x.close), L = pc === 'hl' ? b.map(x => x.low) : b.map(x => x.close);
        const fl = []; let pT = null, pB = null;
        for (let j = 2 * half; j < b.length; j++) {
          const c = j - half; let top = true, bot = true;
          for (let k = c - half; k <= c + half; k++) { if (k === c) continue; if (!(o[k] < o[c])) top = false; if (!(o[k] > o[c])) bot = false; }
          if (!Number.isFinite(o[c])) continue;
          const okT = o[c] >= lt, okB = o[c] <= -lb;
          const bi = Math.min(b.length - 1, c + at);
          if (top && (prevMode === 'last' || okT)) { if (okT && pT && H[c] > pT.p && o[c] < pT.o && b[bi].openTime >= P(w.d, w.w0)) fl.push([b[bi].openTime, 'S']); pT = { p: H[c], o: o[c] }; }
          if (bot && (prevMode === 'last' || okB)) { if (okB && pB && L[c] < pB.p && o[c] > pB.o && b[bi].openTime >= P(w.d, w.w0)) fl.push([b[bi].openTime, 'B']); pB = { p: L[c], o: o[c] }; }
        }
        let h = 0; for (const [hm, s] of w.lab) { const t = P(w.d, hm); tot++; if (fl.some(([ft, fs]) => fs === s && Math.abs(ft - t) <= 60e3)) h++; if (fl.some(([ft, fs]) => fs === s && ft === t)) exact++; }
        hit += h; extra += fl.length - h; fls.push(fl.map(([t, s]) => new Date(t).toISOString().slice(11, 16) + s).join(' '));
      });
      res.push({ k: `${on} half${half} top${lt} bot-${lb} at+${at} ${pc} ${prevMode}`, hit, exact, extra, tot, fls });
    }
  }
  res.sort((x, y) => (y.hit * 3 + y.exact - y.extra * 2) - (x.hit * 3 + x.exact - x.extra * 2));
  for (const r of res.slice(0, 30)) console.log(`${r.hit}/${r.tot} exact ${r.exact} extra ${r.extra}`, r.k, '|', r.fls.join(' || '));
})();
