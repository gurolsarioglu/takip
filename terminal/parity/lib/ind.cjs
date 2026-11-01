'use strict';
// Pure indicator library for the parity lab. All series functions return arrays aligned with input
// (NaN where not yet defined). Formulas follow TradingView/Pine semantics unless noted.

const isNum = Number.isFinite;

function sma(src, n) {
  const out = new Array(src.length).fill(NaN);
  let sum = 0, cnt = 0;
  const q = [];
  for (let i = 0; i < src.length; i++) {
    const v = src[i];
    q.push(v);
    if (isNum(v)) { sum += v; cnt++; }
    if (q.length > n) { const o = q.shift(); if (isNum(o)) { sum -= o; cnt--; } }
    if (q.length === n && cnt === n) out[i] = sum / n;
  }
  return out;
}

// Pine ta.ema: seeded with first valid value? No: Pine ema starts with SMA? Pine's ta.ema uses
// alpha recursion seeded by the first source value (na-skipping). TA-Lib seeds with SMA.
function ema(src, n, seed = 'sma') {
  const out = new Array(src.length).fill(NaN);
  const a = 2 / (n + 1);
  let prev = NaN, buf = [];
  for (let i = 0; i < src.length; i++) {
    const v = src[i];
    if (!isNum(v)) { if (isNum(prev)) out[i] = prev; continue; }
    if (!isNum(prev)) {
      if (seed === 'first') { prev = v; out[i] = prev; continue; }
      buf.push(v);
      if (buf.length === n) { prev = buf.reduce((s, x) => s + x, 0) / n; out[i] = prev; }
      continue;
    }
    prev = a * v + (1 - a) * prev;
    out[i] = prev;
  }
  return out;
}

// Wilder RMA, seeded with SMA of first n values (Pine ta.rma behaviour).
function rma(src, n) {
  const out = new Array(src.length).fill(NaN);
  let prev = NaN, buf = [];
  for (let i = 0; i < src.length; i++) {
    const v = src[i];
    if (!isNum(v)) continue;
    if (!isNum(prev)) {
      buf.push(v);
      if (buf.length === n) { prev = buf.reduce((s, x) => s + x, 0) / n; out[i] = prev; }
      continue;
    }
    prev = (prev * (n - 1) + v) / n;
    out[i] = prev;
  }
  return out;
}

function rsi(closes, n = 14) {
  const up = [NaN], dn = [NaN];
  for (let i = 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    up.push(Math.max(d, 0)); dn.push(Math.max(-d, 0));
  }
  const ru = rma(up, n), rd = rma(dn, n);
  return closes.map((_, i) => {
    if (!isNum(ru[i]) || !isNum(rd[i])) return NaN;
    if (rd[i] === 0) return ru[i] === 0 ? 50 : 100;
    if (ru[i] === 0) return 0;
    return 100 - 100 / (1 + ru[i] / rd[i]);
  });
}

function rollMin(src, n) { return src.map((_, i) => { if (i < n - 1) return NaN; let m = Infinity; for (let j = i - n + 1; j <= i; j++) { if (!isNum(src[j])) return NaN; m = Math.min(m, src[j]); } return m; }); }
function rollMax(src, n) { return src.map((_, i) => { if (i < n - 1) return NaN; let m = -Infinity; for (let j = i - n + 1; j <= i; j++) { if (!isNum(src[j])) return NaN; m = Math.max(m, src[j]); } return m; }); }

// Pine: k = sma(stoch(rsi, rsi, rsi, lenStoch), smoothK); d = sma(k, smoothD)
function stochRsi(closes, lenRsi = 14, lenStoch = 14, smoothK = 3, smoothD = 3) {
  const r = rsi(closes, lenRsi);
  const lo = rollMin(r, lenStoch), hi = rollMax(r, lenStoch);
  const st = r.map((v, i) => (isNum(lo[i]) && isNum(hi[i])) ? (hi[i] - lo[i] === 0 ? 0 : 100 * (v - lo[i]) / (hi[i] - lo[i])) : NaN);
  const k = sma(st, smoothK), d = sma(k, smoothD);
  return { rsi: r, k, d, raw: st };
}

// Classic stochastic(14,3,3) on price (for M1-A "Stochastic (K/D)")
function stoch(high, low, close, len = 14, smoothK = 3, smoothD = 3) {
  const lo = rollMin(low, len), hi = rollMax(high, len);
  const st = close.map((c, i) => (isNum(lo[i]) && isNum(hi[i])) ? (hi[i] - lo[i] === 0 ? 0 : 100 * (c - lo[i]) / (hi[i] - lo[i])) : NaN);
  const k = sma(st, smoothK), d = sma(k, smoothD);
  return { k, d, raw: st };
}

// LazyBear WaveTrend. emaSeed: 'first' mimics Pine ta.ema, 'sma' mimics TA-Lib.
function waveTrend(bars, n1 = 10, n2 = 21, sig = 4, emaSeed = 'first') {
  const ap = bars.map(b => (b.high + b.low + b.close) / 3);
  const esa = ema(ap, n1, emaSeed);
  const d = ema(ap.map((v, i) => Math.abs(v - esa[i])), n1, emaSeed);
  const ci = ap.map((v, i) => (isNum(d[i]) && d[i] !== 0) ? (v - esa[i]) / (0.015 * d[i]) : NaN);
  const wt1 = ema(ci, n2, emaSeed);
  const wt2 = sma(wt1, sig);
  return { wt1, wt2 };
}

function crossAt(a, b, i) {
  if (i < 1 || !isNum(a[i]) || !isNum(b[i]) || !isNum(a[i - 1]) || !isNum(b[i - 1])) return 0;
  if (a[i - 1] <= b[i - 1] && a[i] > b[i]) return 1;
  if (a[i - 1] >= b[i - 1] && a[i] < b[i]) return -1;
  return 0;
}

// Nadaraya-Watson envelope (LuxAlgo, repaint mode) on last `win` values. Returns band at last bar.
function nwRepaint(values, h = 8, mult = 3, win = 500) {
  const w = values.slice(-win);
  const n = w.length;
  const k = new Array(n);
  for (let d = 0; d < n; d++) k[d] = Math.exp(-(d * d) / (2 * h * h));
  const centers = new Array(n);
  let sae = 0;
  for (let i = 0; i < n; i++) {
    let s = 0, den = 0;
    for (let j = 0; j < n; j++) { const ww = k[Math.abs(i - j)]; s += w[j] * ww; den += ww; }
    centers[i] = s / den;
    sae += Math.abs(w[i] - centers[i]);
  }
  const mae = (sae / n) * mult;
  const c = centers[n - 1];
  return { center: c, upper: c + mae, lower: c - mae, mae };
}

// Traditional pivots from previous period bar.
function traditionalPivots(prev) {
  const { high: H, low: L, close: C } = prev;
  const P = (H + L + C) / 3;
  const R1 = 2 * P - L, S1 = 2 * P - H;
  const R2 = P + (H - L), S2 = P - (H - L);
  const R3 = P * 2 + (H - 2 * L), S3 = P * 2 - (2 * H - L);
  const R4 = P * 3 + (H - 3 * L), S4 = P * 3 - (3 * H - L);
  const R5 = P * 4 + (H - 4 * L), S5 = P * 4 - (4 * H - L);
  return { P, R1, R2, R3, R4, R5, S1, S2, S3, S4, S5 };
}
function nearestPivotDistPct(pivots, price) {
  let best = Infinity;
  for (const v of Object.values(pivots)) { if (v > 0) best = Math.min(best, Math.abs(price - v) / v * 100); }
  return best;
}

// Pivot detection helpers (Pine ta.pivotlow/pivothigh semantics: strict on left, non-strict on right? Pine
// uses: value must be strictly lower than all left and <= ... we implement strict both sides by default).
function pivotLows(src, left, right) {
  const out = [];
  for (let i = left; i < src.length - right; i++) {
    const v = src[i]; if (!isNum(v)) continue;
    let ok = true;
    for (let j = i - left; j <= i + right && ok; j++) { if (j !== i && !(src[j] > v)) ok = false; }
    if (ok) out.push(i);
  }
  return out;
}
function pivotHighs(src, left, right) {
  const out = [];
  for (let i = left; i < src.length - right; i++) {
    const v = src[i]; if (!isNum(v)) continue;
    let ok = true;
    for (let j = i - left; j <= i + right && ok; j++) { if (j !== i && !(src[j] < v)) ok = false; }
    if (ok) out.push(i);
  }
  return out;
}

// Visivero "Pivot: %x" line (measured 26.10: hammer-pro 29/30, div 43/43, negatives 150/150 & 135/135):
// nearest Fibonacci pivot level (P, R1–R3, S1–S3) from the PREVIOUS Binance weekly bar, distance = |price−L|/price·100.
function fibPivots(prev) { const { high: H, low: L, close: C } = prev; const P = (H + L + C) / 3, r = H - L; return { P, R1: P + .382 * r, S1: P - .382 * r, R2: P + .618 * r, S2: P - .618 * r, R3: P + r, S3: P - r }; }
function weeklyFibPivotDistPct(weekBars, price) {
  if (!Array.isArray(weekBars) || weekBars.length < 2 || !isNum(price)) return NaN;
  const prev = weekBars[weekBars.length - 2]; // last element is the live week
  return Math.min(...Object.values(fibPivots(prev)).map(v => Math.abs(price - v) / price * 100));
}
const round = (v, d = 0) => isNum(v) ? Math.round(v * 10 ** d) / 10 ** d : NaN;

module.exports = { fibPivots, weeklyFibPivotDistPct, isNum, sma, ema, rma, rsi, stochRsi, stoch, waveTrend, crossAt, nwRepaint, traditionalPivots, nearestPivotDistPct, pivotLows, pivotHighs, rollMin, rollMax, round };
