const { test } = require('node:test');
const assert = require('node:assert/strict');
test('local hypothesis rules reject missing/NaN data and preserve threshold boundaries', () => {
  const { shouldEmit, isSniperSetup } = require('../bots/strategy-rules');
  assert.equal(shouldEmit('m1a', { changePct: -0.95 }), true);
  assert.equal(shouldEmit('m1a', { changePct: 0.949 }), false);
  assert.equal(shouldEmit('m1premium', { changePct: .7, volumeRatio: 1.05, rsi: 55, stochK: 50 }), true);
  assert.equal(shouldEmit('m1premium', { changePct: .7, volumeRatio: 1.04, rsi: 90, stochK: 90 }), false);
  assert.equal(shouldEmit('hammerpro', { m5: { rsi: 42 } }), true);
  assert.equal(shouldEmit('hammerproplus', { m5: { rsi: 38, wtOversold: true, pivots: { pivotDistancePct: 1.2 } }, m1h: { rsi: 50 } }), true);
  assert.equal(shouldEmit('4s', { m1h: { rsi: 58, srsiK: 50 } }), true);
  assert.equal(isSniperSetup({ rsi: 40, srsiK: 50 }), true);
  assert.equal(shouldEmit('4ssniper', { m1h: { rsi: 30, srsiK: 10 }, whaleLong: NaN }), false);
  assert.equal(shouldEmit('4ssniper', { m1h: { rsi: 30, srsiK: 10 }, whaleLong: 55 }), true);
  assert.equal(shouldEmit('v3', { volUsd: 5000000, deltaVolPct: 15 }), true);
  assert.equal(shouldEmit('fr', { rate: 0 }), false);
  assert.equal(shouldEmit('div', { m1h: { divergence: { hasBearDiv: true } } }), true);
  for (const id of ['m1a','m1premium','hammerpro','hammerproplus','4s','4ssniper','v3','fr','div']) {
    assert.equal(shouldEmit(id, {}), false, id);
  }
});
