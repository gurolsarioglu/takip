'use strict';
const I = require('../../lib/ind.cjs');
function rangeFilter(src, per, mult, noEq = false) {
  const d = src.map((v, i) => (i ? Math.abs(v - src[i - 1]) : 0));
  const avrng = I.ema(d, per), smrng = I.ema(avrng, per * 2 - 1).map(v => v * mult);
  const filt = new Array(src.length).fill(NaN);
  for (let i = 0; i < src.length; i++) {
    const p = i ? filt[i - 1] : src[i], r = smrng[i], x = src[i];
    if (!Number.isFinite(r)) { filt[i] = x; continue; }
    filt[i] = x > p ? (x - r < p ? p : x - r) : (x + r > p ? p : x + r);
  }
  // signals with state (CondIni)
  let up = 0, dn = 0, cond = 0; const sig = new Array(src.length).fill(null);
  for (let i = 1; i < src.length; i++) {
    up = filt[i] > filt[i - 1] ? up + 1 : filt[i] < filt[i - 1] ? 0 : up;
    dn = filt[i] < filt[i - 1] ? dn + 1 : filt[i] > filt[i - 1] ? 0 : dn;
    const L = noEq ? (src[i] > filt[i] && up > 0) : (src[i] > filt[i] && src[i] > src[i - 1] && up > 0) || (src[i] > filt[i] && src[i] < src[i - 1] && up > 0);
    const S = noEq ? (src[i] < filt[i] && dn > 0) : (src[i] < filt[i] && src[i] < src[i - 1] && dn > 0) || (src[i] < filt[i] && src[i] > src[i - 1] && dn > 0);
    const prev = cond; cond = L ? 1 : S ? -1 : cond;
    if (L && prev === -1) sig[i] = 'B'; if (S && prev === 1) sig[i] = 'S';
  }
  return { filt, sig };
}
module.exports = { rangeFilter };
