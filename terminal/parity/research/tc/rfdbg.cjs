'use strict';
// Debug Range Filter internals on the last bars (ohlc4, 50, 2.2).
const I = require('../../lib/ind.cjs');
const { klinesAt } = require('../../lib/net.cjs');
const [SYM, TF, TO, N] = [process.argv[2] || 'BULLAUSDT', process.argv[3] || '5m', process.argv[4], Number(process.argv[5] || 15)];
(async () => {
  const T = TO ? Date.parse(TO + ':00Z') : Date.now();
  const raw = await (require('../../lib/net.cjs').getJson)(`https://fapi.binance.com/fapi/v1/klines?symbol=${SYM}&interval=${TF}&endTime=${T}&limit=1500`);
  const b = raw.map(k => ({ t: k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4] }));
  const src = b.map(x => (x.o + x.h + x.l + x.c) / 4), per = 50, m = 2.2;
  const d = src.map((v, i) => i ? Math.abs(v - src[i - 1]) : 0);
  for (const seed of ['first', 'sma']) {
    const r = I.ema(I.ema(d, per, seed), per * 2 - 1, seed).map(v => v * m);
    const f = []; let up = 0, dn = 0, cond = 0; const rows = [];
    for (let i = 0; i < src.length; i++) {
      const p = i ? f[i - 1] : src[i], x = src[i], rr = r[i];
      f[i] = !Number.isFinite(rr) ? x : x > p ? (x - rr < p ? p : x - rr) : (x + rr > p ? p : x + rr);
      if (i) { up = f[i] > f[i - 1] ? up + 1 : f[i] < f[i - 1] ? 0 : up; dn = f[i] < f[i - 1] ? dn + 1 : f[i] > f[i - 1] ? 0 : dn; }
      const L = x > f[i] && x !== src[i - 1] && up > 0, S = x < f[i] && x !== src[i - 1] && dn > 0;
      const prev = cond; cond = L ? 1 : S ? -1 : cond;
      rows.push(`${new Date(x && b[i].t + 3 * 3600e3).toISOString().slice(5, 16)} o${b[i].o} h${b[i].h} l${b[i].l} c${b[i].c} src ${x.toFixed(6)} filt ${f[i].toFixed(6)} rng ${rr.toFixed(6)} up${up} dn${dn} cond${cond}${L && prev === -1 ? ' BUY' : ''}${S && prev === 1 ? ' SELL' : ''}`);
    }
    console.log('== seed', seed); console.log(rows.slice(-N).join('\n'));
  }
})();
