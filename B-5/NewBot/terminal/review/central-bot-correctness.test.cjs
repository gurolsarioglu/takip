const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./test-module-loader.cjs');
const botData = require('../services/bot-data.service');
function manager(options = {}) {
  const output = [];
  const deps = {};
  for (const name of ['hammer-pro-plus','hammer-pro','four-s-sniper','four-s','v3-volume','divergence','funding-rate','m1a-drop','m1-premium']) {
    deps[`./strategies/${name}.bot`] = { canEmitSignal: () => true, addSignal: s => { output.push({ bot:name, ...s }); return s; } };
  }
  const bars = Array.from({ length: 250 }, (_, i) => ({ openTime: i * 60000, closeTime: (i + 1) * 60000 - 1,
    close: i === 249 ? 95 : 100, high: 101, low: 94, volume: 100 }));
  Object.assign(deps, {
    '../services/price-formatter': { formatCryptoPrice: String, computePrevPrice: String },
    '../services/market-data-engine.service': { getAllTickers: () => [{ symbol:'AUDITUSDT', volUsd: 6000000 }],
      getKlines: async (_, interval) => interval === options.missingFrame ? [] : bars },
    '../services/quant-indicators.service': { calculateAllMetrics: () => ({ rsi:30, srsiK:15, wtOversold:true,
      pivots:{ pivotDistancePct:.1 }, divergence:{ hasBullDiv:false, hasBearDiv:false } }) },
    '../services/derivatives-enricher.service': { enrich: async () => ({ topTraderLongRatio:60, topTraderAccountLongRatio:60, globalLongRatio:40 }) },
    '../services/symbol-registry.service': {},
    '../services/bot-data.service': botData,
    '../services/scan-loop.service': require('../services/scan-loop.service'),
    './strategy-rules': require('../bots/strategy-rules')
  });
  return { instance: load('bots/index.js', deps), output };
}
test('central structural output uses observed prices and unknown HTF/boost values', async () => {
  const { instance, output } = manager();
  await instance._scanStructuralSetups();
  assert.ok(output.length >= 2);
  for (const s of output) {
    assert.equal(s.boostValue, null);
    assert.equal(s.prevPrice, '100');
    assert.equal(s.measuredChangePct, -5);
    if (s.rsi.h4 !== undefined) assert.equal(s.rsi.h4, '—');
    if (s.rsi.m1 !== undefined) assert.equal(s.rsi.m1, '—');
  }
});
test('one missing timeframe cannot disable bots using another timeframe', async () => {
  const { instance, output } = manager({ missingFrame:'1h' });
  await instance._scanStructuralSetups();
  assert.ok(output.some(s => s.bot === 'hammer-pro'));
  assert.ok(!output.some(s => s.bot === 'four-s-sniper'));
});
test('central bot selection does not emit another strategy as a side effect', async () => {
  const { instance, output } = manager();
  await instance._scanStructuralSetups(new Set(['hammerpro']));
  assert.equal(output.length,1);
  assert.equal(output[0].bot,'hammer-pro');
});
test('central funding uses actual next funding time and correctly scaled difference', async () => {
  const { instance, output } = manager();
  await instance._handleRadarAlert({ type:'fr',symbol:'AUDITUSDT', fundingRate:-.0002, prevFundingRate:.0001,
    nextFundingTime: Date.now() + 600000 });
  assert.equal(output[0].difference, '-0.0300%');
  assert.notEqual(output[0].timeRemaining, '04:00:00');
});
