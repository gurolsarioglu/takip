'use strict';
// RSI divergence variant search. node research/foursn/divvar.cjs --mode 4h --tf 4h --strat "4H RSI DIVERGENCE" --bot 4sniper
const fs = require('node:fs');
const path = require('node:path');
const I = require('../../lib/ind.cjs');
const { klinesAt, ROOT } = require('../../lib/net.cjs');
const { lbDivergence } = require('./lbdiv.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const MODE = arg('mode', '4h'), TF = arg('tf', '4h'), STRAT = arg('strat', '4H RSI DIVERGENCE'), BOT = arg('bot', '4sniper');
const LIMIT = Number(arg('limit', 1000));

// Pine-like pivot: value at i strictly lower than left L and lower-or-equal? use Pine: pivotlow requires src[i] < all left and <= ? ; Pine uses strict on both? keep strict-left, non-strict-right variants
function isPivotLow(a, i, L, R, strictRight) { if (i - L < 0 || i + R >= a.length) return false; for (let j = i - L; j < i; j++) if (!(a[j] > a[i])) return false; for (let j = i + 1; j <= i + R; j++) if (strictRight ? !(a[j] > a[i]) : !(a[j] >= a[i])) return false; return true; }
function isPivotHigh(a, i, L, R, strictRight) { if (i - L < 0 || i + R >= a.length) return false; for (let j = i - L; j < i; j++) if (!(a[j] < a[i])) return false; for (let j = i + 1; j <= i + R; j++) if (strictRight ? !(a[j] < a[i]) : !(a[j] <= a[i])) return false; return true; }

function detect(v, bars, rsi, last) {
  // last = index of the evaluation bar (live bar index, or last closed index)
  const lows = bars.map(b => b.low), highs = bars.map(b => b.high), closes = bars.map(b => b.close);
  const out = { up: false, dn: false };
  const srcL = v.src === 'rsi' ? rsi : (v.src === 'close' ? closes : lows);
  const srcH = v.src === 'rsi' ? rsi : (v.src === 'close' ? closes : highs);
  const pL = v.src === 'rsi' ? lows : (v.src === 'close' ? closes : lows), pH = v.src === 'rsi' ? highs : (v.src === 'close' ? closes : highs);
  if (v.mode === 'pivots') {
    // newest pivot must be confirmed exactly at `last` (i.e., pivot index = last - R)
    const i = last - v.R;
    const findPrev = (isPiv, a) => { for (let j = i - v.minGap; j >= Math.max(0, i - v.maxGap); j--) if (isPiv(a, j, v.L, v.R, v.sr)) return j; return -1; };
    if (isPivotLow(srcL, i, v.L, v.R, v.sr)) { const j = findPrev(isPivotLow, srcL); if (j >= 0 && pL[i] < pL[j] && rsi[i] > rsi[j]) out.up = true; }
    if (isPivotHigh(srcH, i, v.L, v.R, v.sr)) { const j = findPrev(isPivotHigh, srcH); if (j >= 0 && pH[i] > pH[j] && rsi[i] < rsi[j]) out.dn = true; }
  } else { // 'current': compare bar `last` with the most recent confirmed pivot
    for (let j = last - v.minGap; j >= Math.max(0, last - v.maxGap); j--) if (isPivotLow(srcL, j, v.L, v.R, v.sr) && j + v.R <= last) { if (pL[last] < pL[j] && rsi[last] > rsi[j]) out.up = true; break; }
    for (let j = last - v.minGap; j >= Math.max(0, last - v.maxGap); j--) if (isPivotHigh(srcH, j, v.L, v.R, v.sr) && j + v.R <= last) { if (pH[last] > pH[j] && rsi[last] < rsi[j]) out.dn = true; break; }
  }
  return out;
}

(async () => {
  const dir = path.join(ROOT, 'foursn');
  const rows = []; const seen = new Set();
  for (const f of fs.readdirSync(dir).filter(f => f.startsWith(`features-${MODE}-`))) for (const l of fs.readFileSync(path.join(dir, f), 'utf8').split('\n')) { if (!l) continue; try { const r = JSON.parse(l); const k = r.sym + r.C; if (!seen.has(k)) { seen.add(k); rows.push(r); } } catch {} }
  const cyc = {}; for (const r of rows) { cyc[r.C] = cyc[r.C] || [0, 0]; cyc[r.C][0]++; if (r.labels.length) cyc[r.C][1]++; }
  const isFull = r => cyc[r.C][0] > cyc[r.C][1] + 20;
  const full = arg('all', '0') === '1' ? rows.filter(r => isFull(r) || r.labels.some(l => l.bot === BOT)) : rows.filter(isFull);
  const vs = [];
  for (const prd of [2, 3, 4, 5]) for (const source of ['HIGH/LOW', 'CLOSE']) for (const evalAt of ['live', 'closed']) for (const dontconfirm of [false, true]) for (const kind of ['reg', 'reghid']) vs.push({ mode: 'lb', prd, source, evalAt, dontconfirm, kind });
  if (arg('simple', '0') === '1') for (const mode of ['pivots', 'current']) for (const src of ['rsi', 'price', 'close']) for (const L of [1, 2, 3, 5]) for (const R of [0, 1, 2, 3, 5]) for (const evalAt of ['live', 'closed']) for (const maxGap of [30, 60]) for (const sr of [true, false]) {
    if (mode === 'pivots' && R === 0) continue;
    vs.push({ mode, src, L, R, evalAt, minGap: mode === 'pivots' ? 2 : 2, maxGap, sr });
  }
  const S = {}; const posInfo = [];
  let k = 0;
  for (const r of full) {
    const raw = await klinesAt(r.sym, TF, r.t, LIMIT);
    const closed = raw.filter(b => b.closeTime < r.t), live = raw.find(b => b.openTime <= r.t && b.closeTime >= r.t);
    if (!live || closed.length < 80) continue;
    const bars = [...closed, { ...live, close: r.price, high: Math.max(live.open, r.price), low: Math.min(live.open, r.price) }];
    const rsi = I.rsi(bars.map(b => b.close));
    const rsiC = I.rsi(closed.map(b => b.close));
    const isUp = r.labels.some(l => l.bot === BOT && l.strategy === STRAT && l.dir === 'up'), isDn = r.labels.some(l => l.bot === BOT && l.strategy === STRAT && l.dir === 'down');
    const rsiNow = rsi.at(-1);
    for (const v of vs) {
      let res;
      if (v.mode === 'lb') {
        const B = v.evalAt === 'live' ? bars : closed, R = v.evalAt === 'live' ? rsi : rsiC;
        const d = lbDivergence(B, R, B.length - 1, { prd: v.prd, source: v.source, dontconfirm: v.dontconfirm });
        res = { up: d.posReg > 0 || (v.kind === 'reghid' && d.posHid > 0), dn: d.negReg > 0 || (v.kind === 'reghid' && d.negHid > 0) };
      } else res = v.evalAt === 'live' ? detect(v, bars, rsi, bars.length - 1) : detect(v, closed, rsiC, closed.length - 1);
      for (const zone of [null, 35, 40, 45]) {
        const up = res.up && (zone === null || rsiNow <= zone), dn = res.dn && (zone === null || rsiNow >= 100 - zone);
        const key = JSON.stringify({ ...v, zone });
        const st = S[key] = S[key] || { tpU: 0, pU: 0, fpU: 0, tpD: 0, pD: 0, fpD: 0 };
        if (isUp) { st.pU++; if (up) st.tpU++; } else if (up && isFull(r)) st.fpU++;
        if (isDn) { st.pD++; if (dn) st.tpD++; } else if (dn && isFull(r)) st.fpD++;
      }
    }
    if (isUp || isDn) posInfo.push({ sym: r.sym, dir: isUp ? 'up' : 'down', rsiNow: +rsiNow.toFixed(1) });
    if (++k % 100 === 0) console.error('rows', k);
  }
  const res = Object.entries(S).map(([k, s]) => ({ k, ...s, f1: (2 * (s.tpU + s.tpD)) / Math.max(1, 2 * (s.tpU + s.tpD) + (s.fpU + s.fpD) + (s.pU - s.tpU + s.pD - s.tpD)) })).sort((a, b) => b.f1 - a.f1);
  fs.writeFileSync(path.join(dir, `divvar-${MODE}-${TF}-${BOT}.json`), JSON.stringify({ res: res.slice(0, 200), posInfo }, null, 1));
  for (const r of res.slice(0, 25)) console.log(r.k, `up ${r.tpU}/${r.pU} fp ${r.fpU} | dn ${r.tpD}/${r.pD} fp ${r.fpD} | f1 ${r.f1.toFixed(3)}`);
  console.log('positives', JSON.stringify(posInfo));
})();
