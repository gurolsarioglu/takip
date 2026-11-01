'use strict';
// NW envelope variant search on feature rows. node research/foursn/nwvar.cjs --mode 12h --tf 1d
const fs = require('node:fs');
const path = require('node:path');
const { klinesAt, ROOT } = require('../../lib/net.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const MODE = arg('mode', '12h'), TF = arg('tf', '1d'), STRAT_UP = 'NW UP', STRAT_DN = 'NW DOWN';
const BOT = MODE === '4h' ? '4sniper' : '1dws';

function bandsRepaint(src, h, mult) { // full repaint series over window
  const n = src.length, c = new Array(n);
  let sae = 0;
  for (let i = 0; i < n; i++) { let s = 0, d = 0; for (let j = 0; j < n; j++) { const w = Math.exp(-((i - j) ** 2) / (2 * h * h)); s += src[j] * w; d += w; } c[i] = s / d; sae += Math.abs(src[i] - c[i]); }
  const mae = sae / n * mult; return { c, mae };
}
function bandsEndpoint(src, h, mult, win = 500) { // non-repaint LuxAlgo: center_t = sum_{i<win} w(i) src[t-i] / sum w ; mae = sma(|src-center|, 499)*mult
  const n = src.length, c = new Array(n).fill(NaN);
  for (let t = 0; t < n; t++) { let s = 0, d = 0; for (let i = 0; i < Math.min(win, t + 1); i++) { const w = Math.exp(-(i * i) / (2 * h * h)); s += src[t - i] * w; d += w; } c[t] = s / d; }
  const e = src.map((v, i) => Math.abs(v - c[i]));
  const mae = e.map((_, i) => { const a = e.slice(Math.max(0, i - 498), i + 1); return a.reduce((x, y) => x + y, 0) / a.length * mult; });
  return { c, mae };
}

(async () => {
  const dir = path.join(ROOT, 'foursn');
  const rows = [];
  const seen = new Set();
  for (const f of fs.readdirSync(dir).filter(f => f.startsWith(`features-${MODE}-`))) for (const l of fs.readFileSync(path.join(dir, f), 'utf8').split('\n')) { if (!l) continue; try { const r = JSON.parse(l); const k = r.sym + r.C; if (!seen.has(k)) { seen.add(k); rows.push(r); } } catch {} }
  const cyc = {}; for (const r of rows) { cyc[r.C] = cyc[r.C] || [0, 0]; cyc[r.C][0]++; if (r.labels.length) cyc[r.C][1]++; }
  const isFull = r => cyc[r.C][0] > cyc[r.C][1] + 20;
  const full = arg('all', '0') === '1' ? rows.filter(r => isFull(r) || r.labels.some(l => l.bot === BOT)) : rows.filter(isFull);
  const variants = [];
  for (const kind of (arg('kinds','rep').split(','))) for (const h of arg('h','8').split(',').map(Number)) for (const mult of arg('m','3').split(',').map(Number)) for (const win of arg('w','150,199,200,201,250,300,400,499,500').split(',').map(Number)) variants.push({ kind, h, mult, win });
  const S = {};
  let k = 0;
  for (const r of full) {
    const raw = await klinesAt(r.sym, TF, r.t, 1000);
    const closed = raw.filter(b => b.closeTime < r.t), live = raw.find(b => b.openTime <= r.t && b.closeTime >= r.t);
    if (!live || closed.length < 50) continue;
    const src = [...closed.map(b => b.close), r.price];
    const lows = [...closed.map(b => b.low), Math.min(live.open, r.price)], highs = [...closed.map(b => b.high), Math.max(live.open, r.price)];
    const isUp = r.labels.some(l => l.bot === BOT && l.strategy === STRAT_UP), isDn = r.labels.some(l => l.bot === BOT && l.strategy === STRAT_DN);
    for (const v of variants) {
      const s = src.slice(-v.win), n = s.length;
      const b = v.kind === 'rep' ? bandsRepaint(s, v.h, v.mult) : bandsEndpoint(src, v.h, v.mult, v.win);
      const off = v.kind === 'rep' ? 0 : src.length - n; // endpoint arrays are full length
      const C = i => b.c[i + off], M = i => Array.isArray(b.mae) ? b.mae[i + off] : b.mae;
      const L = i => C(i) - M(i), U = i => C(i) + M(i);
      const last = n - 1;
      const conds = {
        px: [s[last] < L(last), s[last] > U(last)],
        prevClose: [s[last - 1] < L(last - 1), s[last - 1] > U(last - 1)],
        crossPrev: [s[last - 2] >= L(last - 2) && s[last - 1] < L(last - 1), s[last - 2] <= U(last - 2) && s[last - 1] > U(last - 1)],
        crossBackPrev: [s[last - 2] < L(last - 2) && s[last - 1] >= L(last - 1), s[last - 2] > U(last - 2) && s[last - 1] <= U(last - 1)],
        anyLast3: [[1, 2, 3].some(j => s[last - j] < L(last - j)), [1, 2, 3].some(j => s[last - j] > U(last - j))],
        liveLowHigh: [lows.at(-1) < L(last), highs.at(-1) > U(last)],
      };
      for (const [cn, [up, dn]] of Object.entries(conds)) {
        const key = `${v.kind} h${v.h} m${v.mult} w${v.win} ${cn}`;
        const st = S[key] = S[key] || { tpU: 0, pU: 0, fpU: 0, tpD: 0, pD: 0, fpD: 0, n: 0 };
        st.n++;
        if (isUp) { st.pU++; if (up) st.tpU++; } else if (up && isFull(r)) st.fpU++;
        if (isDn) { st.pD++; if (dn) st.tpD++; } else if (dn && isFull(r)) st.fpD++;
      }
    }
    if (++k % 50 === 0) console.error('rows', k);
  }
  const res = Object.entries(S).map(([k, s]) => ({ k, ...s, score: (s.tpU + s.tpD) - (s.fpU + s.fpD) })).sort((a, b) => b.score - a.score);
  fs.writeFileSync(path.join(dir, `nwvar-${MODE}-${TF}.json`), JSON.stringify(res, null, 1));
  for (const r of res.slice(0, 25)) console.log(r.k, `up ${r.tpU}/${r.pU} fp ${r.fpU} | dn ${r.tpD}/${r.pD} fp ${r.fpD} | n ${r.n}`);
})();
