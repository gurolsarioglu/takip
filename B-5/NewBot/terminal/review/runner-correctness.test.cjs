const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./test-module-loader.cjs');
const data = require('../services/bot-data.service');
const candles = Array.from({ length: 100 }, (_, i) => ({ openTime: i * 60000,
  closeTime: (i + 1) * 60000 - 1, close: i === 99 ? 97 : 100, volume: 100 }));
function helper(sentiment, output, overrides = {}) {
  return { botData: data, strategyRules: require('../bots/strategy-rules'), isSignalAccepted: data.isSignalAccepted, getWatchlist: async () => [{ symbol: 'AUDITUSDT' }],
    getKlines: async () => candles, getSentiment: async () => sentiment,
    postSignal: async s => { output.push(s); return { status: 200, data: { accepted: true } }; },
    logger: { header() {}, info() {}, scan() {}, signal() {}, warn() {} },
    formatCryptoPrice: String, computePrevPrice: String,
    quantIndicators: { calculateAllMetrics: () => ({ rsi: 30, srsiK: 10 }) }, ...overrides };
}
function runner(name, h) {
  return load(`bots/runners/${name}.runner.js`, { './runner-helper': h }, '\nmodule.exports = { scan };');
}
test('Sniper rejects actual low, missing and invalid whale data', async () => {
  for (const sentiment of [null, { topAccount: { longPct: 20 } }, { topAccount: { longPct: 'NaN' } }]) {
    const output = [];
    await runner('four-s-sniper', helper(sentiment, output)).scan();
    assert.equal(output.length, 0);
  }
});
test('Sniper does not manufacture HTF/boost/previous price and reads global exposure', async () => {
  const output = [];
  await runner('four-s-sniper', helper({ topAccount: { longPct: 60 }, globalExposure: { longPct: 40 } }, output)).scan();
  assert.equal(output.length, 1);
  const s = output[0];
  assert.equal(s.marketExposure, '40.00%');
  assert.equal(s.prevPrice, '100');
  assert.equal(s.boostValue, null);
  assert.equal(s.measuredChangePct, -3);
  assert.equal(s.rsi.h4, '—');
});
test('funding tracks all symbols before selecting most negative and retains zero baseline', async () => {
  let step = 0;
  const output = [];
  const h = helper(null, output, {
    getWatchlist: async () => step === 0 ? [
      ...Array.from({ length: 15 }, (_, i) => ({ symbol: `OTHER${i}USDT`, fr: -0.001 })),
      { symbol: 'AUDITUSDT', fr: 0 }
    ] : [{ symbol: 'AUDITUSDT', fr: -0.0002, nextFundingTime: Date.now() + 600000 }]
  });
  const r = runner('funding-rate', h);
  await r.scan();
  step = 1;
  await r.scan();
  const s = output.find(s => s.symbol === 'AUDITUSDT');
  assert.equal(s.previousFunding, '0.0000%');
  assert.equal(s.difference, '-0.0200%');
  assert.notEqual(s.timeRemaining, '04:00:00');
});
test('failed delivery does not consume a funding cooldown', async () => {
  let attempts = 0;
  const h = helper(null, [], {
    getWatchlist: async () => [{ symbol: 'AUDITUSDT', fr: -0.0002 }],
    postSignal: async () => { attempts++; return { status: 0 }; }
  });
  const r = runner('funding-rate', h);
  await r.scan();
  await r.scan();
  assert.equal(attempts, 2);
});
test('malformed and unacknowledged HTTP 200 responses do not consume cooldown', async () => {
  for (const reply of [{ status: 200, raw: 'invalid' }, { status: 200, data: {} },
    { status: 200, data: { success: true, accepted: false } }]) {
    let attempts = 0;
    const h = helper(null, [], { getWatchlist: async () => [{ symbol: 'AUDITUSDT', fr: -0.0002 }],
      postSignal: async () => { attempts++; return reply; } });
    const r = runner('funding-rate', h);
    await r.scan(); await r.scan();
    assert.equal(attempts, 2);
  }
});
test('standalone bots do not require an unrelated timeframe to be available', async () => {
  for (const id of ['hammer-pro','hammer-pro-plus','divergence']) {
    const output = [];
    const h = helper(null, output, {
      getKlines: async (_, interval) => interval === (id === 'divergence' ? '5m' : '1h') ? [] : candles,
      quantIndicators: { calculateAllMetrics: () => ({ rsi:30, srsiK:10, wtOversold:true,
        pivots:{ pivotDistancePct:.1 }, divergence:{hasBullDiv:true,hasBearDiv:false} }) }
    });
    await runner(id,h).scan();
    assert.equal(output.length,1,id);
  }
});
