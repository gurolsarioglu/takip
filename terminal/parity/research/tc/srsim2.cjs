'use strict';
// S/R rule variants vs observed Trader Club levels (dotted line = pivot level, zone = level ± cw).
const { getJson } = require('../../lib/net.cjs');
const SYM = process.argv[2] || 'BULLAUSDT', TF = process.argv[3] || '5m', TO = process.argv[4] || '2026-10-28T18:51:00Z';
const OBS = JSON.parse(process.argv[5] || '[0.079,0.07302,0.0689,0.0636,0.05921,0.05583]');
(async () => {
  const raw = await getJson(`https://fapi.binance.com/fapi/v1/klines?symbol=${SYM}&interval=${TF}&endTime=${Date.parse(TO)}&limit=1500`);
  const b = raw.map(k => ({ t: k[0], h: +k[2], l: +k[3], c: +k[4] })); const n = b.length - 1;
  const res = [];
  for (const PRD of [5, 8, 10, 12, 15]) for (const LB of [200, 300, 500]) for (const W of [1, 1.5, 2, 2.5, 3]) for (const sel of ['strength', 'touch', 'recent', 'pcount']) for (const sep of [1, 2]) for (const skipIn of [false, true]) for (const minP of [1, 2]) {
    const piv = [];
    for (let i = PRD; i <= n - PRD; i++) { if (n - i > LB) continue; let H = true, L = true; for (let k = i - PRD; k <= i + PRD; k++) { if (k === i) continue; if (b[k].h > b[i].h || (k > i && b[k].h === b[i].h)) H = false; if (b[k].l < b[i].l || (k > i && b[k].l === b[i].l)) L = false; } if (H) piv.push({ v: b[i].h, i }); if (L) piv.push({ v: b[i].l, i }); }
    let hh = -Infinity, ll = Infinity; for (let i = n - 299; i <= n; i++) { hh = Math.max(hh, b[i].h); ll = Math.min(ll, b[i].l); }
    const cw = (hh - ll) * W / 100;
    const sc = piv.map(p => { const pc = piv.filter(q => Math.abs(q.v - p.v) <= cw).length; let t = 0; for (let y = 0; y < Math.min(LB, n); y++) { const x = b[n - y]; if (x.h >= p.v - cw && x.l <= p.v + cw) t++; } return { ...p, pc, t, s: pc * 20 + t }; }).filter(p => p.pc >= minP && !(skipIn && b[n].c >= p.v - cw && b[n].c <= p.v + cw));
    const key = { strength: p => p.s, touch: p => p.t, recent: p => p.i, pcount: p => p.pc * 1e6 + p.i }[sel];
    sc.sort((a, c) => key(c) - key(a));
    const ch = []; for (const p of sc) { if (ch.length >= 6) break; if (ch.some(c => Math.abs(c - p.v) < sep * cw)) continue; ch.push(p.v); }
    const hit = OBS.filter(o => ch.some(c => Math.abs(c / o - 1) < 0.004)).length, extra = ch.length - hit;
    res.push({ k: `prd${PRD} lb${LB} W${W} ${sel} sep${sep} skipIn${skipIn} minP${minP}`, hit, extra, ch: ch.sort((a, c) => c - a).join(' ') });
  }
  res.sort((a, c) => (c.hit * 2 - c.extra) - (a.hit * 2 - a.extra));
  for (const r of res.slice(0, 20)) console.log(`${r.hit}/${OBS.length} extra ${r.extra}`, r.k, '|', r.ch);
})();
