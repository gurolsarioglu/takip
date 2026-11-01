'use strict';
// Trader Club S/R ≈ "Support/Resistance channels" algorithm: pivots(prd) clustered within cwidth = (hh300-ll300)*W%,
// strength = 20*pivots + touching bars in lookback; pick strongest non-overlapping maxSR >= minStr*20.
const { getJson } = require('../../lib/net.cjs');
const [SYM, TF, W, MINS, LB, PRD, TO] = [process.argv[2] || 'BULLAUSDT', process.argv[3] || '5m', Number(process.argv[4] || 2), Number(process.argv[5] || 2), Number(process.argv[6] || 290), Number(process.argv[7] || 10), process.argv[8]];
(async () => {
  const T = TO ? Date.parse(TO) : Date.now();
  const raw = await getJson(`https://fapi.binance.com/fapi/v1/klines?symbol=${SYM}&interval=${TF}&endTime=${T}&limit=1500`);
  const b = raw.map(k => ({ t: k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4] }));
  const n = b.length - 1;
  const piv = [];
  for (let i = PRD; i <= n - PRD; i++) {
    if (n - i > LB) continue;
    let isH = true, isL = true;
    for (let k = i - PRD; k <= i + PRD; k++) { if (k === i) continue; if (b[k].h >= b[i].h && (k > i || b[k].h > b[i].h)) isH = false; if (b[k].l <= b[i].l && (k > i || b[k].l < b[i].l)) isL = false; }
    if (isH) piv.push({ v: b[i].h, i, k: 'H' }); if (isL) piv.push({ v: b[i].l, i, k: 'L' });
  }
  let hh = -Infinity, ll = Infinity; for (let i = n - 299; i <= n; i++) { hh = Math.max(hh, b[i].h); ll = Math.min(ll, b[i].l); }
  const cw = (hh - ll) * W / 100;
  const ch = piv.map(p => {
    let lo = p.v, hi = p.v, s = 0;
    for (const q of piv) { const w = q.v <= hi ? hi - q.v : q.v - lo; if (w <= cw) { if (q.v <= hi) lo = Math.min(lo, q.v); else hi = Math.max(hi, q.v); s += 20; } }
    for (let y = 0; y < LB; y++) { const x = b[n - y]; if ((x.h <= hi && x.h >= lo) || (x.l <= hi && x.l >= lo)) s++; }
    return { s, hi, lo };
  });
  const out = [];
  const pool = ch.slice();
  for (let r = 0; r < 6; r++) {
    let best = -1, bs = -1; pool.forEach((c, i) => { if (c && c.s > bs && c.s >= MINS * 20) { bs = c.s; best = i; } });
    if (best < 0) break; const c = pool[best]; out.push(c);
    pool.forEach((d, i) => { if (d && ((d.hi <= c.hi && d.hi >= c.lo) || (d.lo <= c.hi && d.lo >= c.lo))) pool[i] = null; });
  }
  console.log(`${SYM} ${TF} W${W} minS${MINS} lb${LB} prd${PRD} close ${b[n].c} range ${ll}-${hh} cw ${cw.toFixed(6)} pivots ${piv.length}`);
  for (const p of piv) { let t = 0; for (let y = 0; y < LB; y++) { const x = b[n - y]; if (x.h >= p.v - cw && x.l <= p.v + cw) t++; } const np = piv.filter(q => Math.abs(q.v - p.v) <= cw).length; console.log(`   piv ${p.k} ${p.v} ${new Date(p.t = b[p.i].t + 3 * 3600e3).toISOString().slice(5, 16)} near-pivots ${np} touch ${t}`); }
  for (const c of out.sort((a, b) => b.hi - a.hi)) console.log(`  hi ${c.hi} lo ${c.lo} mid ${((c.hi + c.lo) / 2).toFixed(5)} width ${(c.hi - c.lo).toFixed(5)} strength ${c.s}`);
})();
