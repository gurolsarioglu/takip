'use strict';
// LonesomeTheBlue "Divergence for many indicators" (as in Visivero Trader Club 5in1), RSI only.
// bars: array of {high,low,close}; ind: indicator array aligned; returns {posReg, negReg, posHid, negHid} lengths (0 = none) at index cur.
function lbDivergence(bars, ind, cur, { prd = 5, source = 'HIGH/LOW', maxpp = 20, maxbars = 200, dontconfirm = false } = {}) {
  const close = bars.map(b => b.close);
  const phSrc = source === 'CLOSE' ? close : bars.map(b => b.high);
  const plSrc = source === 'CLOSE' ? close : bars.map(b => b.low);
  // pivot pools: pivots confirmed at index <= cur (center + prd <= cur), newest first
  const lowPool = [], highPool = [];
  for (let c = Math.max(prd, cur - maxbars - prd); c + prd <= cur; c++) {
    let isH = true, isL = true;
    for (let j = c - prd; j <= c + prd; j++) { if (phSrc[j] > phSrc[c]) isH = false; if (plSrc[j] < plSrc[c]) isL = false; }
    if (isH) highPool.unshift([c + prd, phSrc[c]]);
    if (isL) lowPool.unshift([c + prd, plSrc[c]]);
  }
  const sp = dontconfirm ? 0 : 1;
  const prsL = source === 'CLOSE' ? close : bars.map(b => b.low), prsH = source === 'CLOSE' ? close : bars.map(b => b.high);
  function pos(cond) {
    if (!(dontconfirm || ind[cur] > ind[cur - 1] || close[cur] > close[cur - 1])) return 0;
    const now = cur - sp;
    for (const [ci, pv] of lowPool.slice(0, maxpp)) {
      const len = cur - ci + prd; if (len > maxbars) break;
      const pi = cur - len; if (pi < 0 || len <= 5) continue;
      const ok = (cond === 1 && ind[now] > ind[pi] && prsL[now] < pv) || (cond === 2 && ind[now] < ind[pi] && prsL[now] > pv);
      if (!ok) continue;
      const den = len - sp; if (den <= 0) continue;
      const s1 = (ind[now] - ind[pi]) / den, s2 = (close[now] - close[pi]) / den;
      let v1 = ind[now] - s1, v2 = close[now] - s2, arrived = true;
      for (let y = 1 + sp; y < len; y++) { const k = cur - y; if (ind[k] < v1 || close[k] < v2) { arrived = false; break; } v1 -= s1; v2 -= s2; }
      if (arrived) return len;
    }
    return 0;
  }
  function neg(cond) {
    if (!(dontconfirm || ind[cur] < ind[cur - 1] || close[cur] < close[cur - 1])) return 0;
    const now = cur - sp;
    for (const [ci, pv] of highPool.slice(0, maxpp)) {
      const len = cur - ci + prd; if (len > maxbars) break;
      const pi = cur - len; if (pi < 0 || len <= 5) continue;
      const ok = (cond === 1 && ind[now] < ind[pi] && prsH[now] > pv) || (cond === 2 && ind[now] > ind[pi] && prsH[now] < pv);
      if (!ok) continue;
      const den = len - sp; if (den <= 0) continue;
      const s1 = (ind[now] - ind[pi]) / den, s2 = (close[now] - close[pi]) / den;
      let v1 = ind[now] - s1, v2 = close[now] - s2, arrived = true;
      for (let y = 1 + sp; y < len; y++) { const k = cur - y; if (ind[k] > v1 || close[k] > v2) { arrived = false; break; } v1 -= s1; v2 -= s2; }
      if (arrived) return len;
    }
    return 0;
  }
  return { posReg: pos(1), negReg: neg(1), posHid: pos(2), negHid: neg(2) };
}
module.exports = { lbDivergence };
