'use strict';
// Visivero "Pivot: %x" line (measured 26.10: hammer-pro 29/30, div 43/43; negatives 150/150, 135/135):
// nearest Fibonacci pivot level (P, R1–R3, S1–S3) from the PREVIOUS Binance weekly bar; distance = |price−L|/price·100;
// the line is printed when the distance is < 1 %.
const isNum = Number.isFinite;
function fibPivots(prev) { const { high: H, low: L, close: C } = prev; const P = (H + L + C) / 3, r = H - L; return { P, R1: P + .382 * r, S1: P - .382 * r, R2: P + .618 * r, S2: P - .618 * r, R3: P + r, S3: P - r }; }
function weeklyFibPivotDistPct(weekBars, price) {
  if (!Array.isArray(weekBars) || weekBars.length < 2 || !isNum(price)) return NaN;
  const prev = weekBars[weekBars.length - 2]; // last element is the live week
  return Math.min(...Object.values(fibPivots(prev)).map(v => Math.abs(price - v) / price * 100));
}
module.exports = { fibPivots, weeklyFibPivotDistPct };
