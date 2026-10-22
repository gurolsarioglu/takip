const assert = require('assert');
const IndicatorService = require('../services/indicator.service');

function runTests() {
  console.log('[Test] Running IndicatorService tests...');

  // Test 1: Wilder RSI calculation
  const closes = [
    44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.10, 45.42,
    45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28, 46.00,
    46.03, 46.41, 46.22, 45.64, 46.21, 46.25, 45.71, 46.45
  ];
  const rsiValues = IndicatorService.calcRSI(closes, 14);
  assert(Array.isArray(rsiValues), 'RSI should return an array');
  assert(rsiValues.length > 0, 'RSI should produce values');
  const lastRSI = rsiValues[rsiValues.length - 1];
  assert(lastRSI >= 0 && lastRSI <= 100, `RSI must be between 0 and 100, got ${lastRSI}`);
  // Wilder RSI on this known sequence is ~65-70
  assert(lastRSI > 50 && lastRSI < 80, `Expected RSI between 50 and 80, got ${lastRSI}`);

  // Test 2: Classic Pivot calculation (Floor Pivot)
  // P = (H + L + C) / 3
  // S1 = 2*P - H
  // R1 = 2*P - L
  // S2 = P - (H - L)
  // R2 = P + (H - L)
  const pivot = IndicatorService.calcClassicPivot(100, 90, 95);
  assert.strictEqual(pivot.p, 95, 'Pivot P should be (100+90+95)/3 = 95');
  assert.strictEqual(pivot.s1, 90, 'Pivot S1 should be 2*95 - 100 = 90');
  assert.strictEqual(pivot.r1, 100, 'Pivot R1 should be 2*95 - 90 = 100');
  assert.strictEqual(pivot.s2, 85, 'Pivot S2 should be 95 - (100 - 90) = 85');
  assert.strictEqual(pivot.r2, 105, 'Pivot R2 should be 95 + (100 - 90) = 105');

  // Test 3: WaveTrend calculation
  const highs = closes.map(c => c + 0.5);
  const lows = closes.map(c => c - 0.5);
  const wt = IndicatorService.calcWaveTrend(highs, lows, closes, 10, 11, 21);
  assert(wt && typeof wt.wt1 === 'number', 'WaveTrend should return wt1 number');
  assert(typeof wt.wt2 === 'number', 'WaveTrend should return wt2 number');
  assert(typeof wt.crossUp === 'boolean', 'WaveTrend should return crossUp boolean');
  assert(typeof wt.crossDown === 'boolean', 'WaveTrend should return crossDown boolean');

  // Test 4: Stoch RSI calculation
  const stochRsi = IndicatorService.calcStochRSI(closes, 14, 14, 3, 3);
  assert(stochRsi && typeof stochRsi.k === 'number', 'StochRSI should return k number');
  assert(typeof stochRsi.d === 'number', 'StochRSI should return d number');
  assert(stochRsi.k >= 0 && stochRsi.k <= 100, `StochRSI K must be 0-100, got ${stochRsi.k}`);
  assert(stochRsi.d >= 0 && stochRsi.d <= 100, `StochRSI D must be 0-100, got ${stochRsi.d}`);

  // Test 5: EMA calculation
  const emaValues = IndicatorService.calcEMA([10, 11, 12, 13, 14, 15, 16], 5);
  assert(Array.isArray(emaValues), 'EMA should return array');
  assert(emaValues.length > 0, 'EMA should have values');
  const lastEMA = emaValues[emaValues.length - 1];
  assert(lastEMA > 13 && lastEMA < 16, `Last EMA should be around 14.5, got ${lastEMA}`);

  // Test 6: Volume Delta calculation
  const vols = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 20];
  const vDelta = IndicatorService.calcVolumeDelta(vols, 20);
  assert.strictEqual(Math.round(vDelta), 100, 'Volume delta should be +100%');

  console.log('✅ IndicatorService tests passed successfully!');
}

runTests();
