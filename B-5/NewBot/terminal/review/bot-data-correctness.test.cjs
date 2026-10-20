const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { load } = require('./test-module-loader.cjs');
const quant = require('../services/quant-indicators.service');

test('EMA/pivot retain micro-price precision', () => {
  const price = 0.0000185;
  assert.ok(Math.abs(quant.calculateEMA(Array(250).fill(price), 200) - price) < 1e-15);
  const p = quant.calculatePivots({ high: 0.000019, low: 0.000018, close: price }, price);
  assert.ok(Math.abs(p.p - price) < 1e-15);
});
test('unknown symbol formatting does not guess a price scale or drop micro digits', () => {
  const { formatCryptoPrice, computePrevPrice } = require('../services/price-formatter');
  assert.equal(formatCryptoPrice(.00001856789, 'AUDITUSDT'), '0.00001856789');
  assert.equal(formatCryptoPrice(1.23456789e-12, 'AUDITUSDT'), '0.00000000000123456789');
  assert.equal(computePrevPrice(100, 0, 'BTCUSDT'), formatCryptoPrice(100, 'BTCUSDT'));
  assert.equal(computePrevPrice(100, -100, 'BTCUSDT'), null);
});
test('history and quant use the same EMA recurrence', () => {
  const history = load('services/history.service.js', {
    fs: {}, path, https: {}, './quant-indicators.service': quant
  }, 'module.exports = { calculateEMA };');
  const input = Array.from({ length: 200 }, (_, i) => i + 1);
  assert.equal(history.calculateEMA(input, 200), quant.calculateEMA(input, 200));
});
test('missing/invalid sentiment remains unknown and cannot become a whale confirmation', () => {
  const data = require('../services/bot-data.service');
  assert.equal(data.sentimentMetrics(null).whaleLong, null);
  assert.equal(data.sentimentMetrics({ topAccount: { longPct: 'bad' } }).whaleLong, null);
  const s = data.sentimentMetrics({ topAccount: { longPct: 20 }, topPosition: { longPct: 80 }, globalExposure: { longPct: 40 } });
  assert.equal(s.whaleLong, 20);
  assert.equal(s.globalLong, 40);
});
test('API sentiment payload has null data on upstream failure, not example percentages', () => {
  const { sentimentPayload } = require('../services/bot-data.service');
  const missing = sentimentPayload('AUDITUSDT', {});
  assert.equal(missing.topAccount, null);
  assert.equal(missing.topPosition, null);
  assert.equal(missing.globalExposure, null);
  assert.equal(missing.orderBook, null);
  const present = sentimentPayload('AUDITUSDT', {
    accRatio: { status: 'fulfilled', value: [{ longAccount: '0.2', shortAccount: '0.8' }] }
  });
  assert.equal(present.topAccount.longPct, 20);
});

test('card renderer tolerates unknown metrics and escapes external strategy text', () => {
  const renderer = load('public/plugins/bot-hub/bot-renderer.js');
  const html = renderer.generateSignalsHtml('hammerpro', [{ symbol: 'AUDITUSDT',
    strategy: '<img src=x onerror=alert(1)>', boostValue: null, rsi: null, srsi: null }]);
  assert.ok(!html.includes('<img src=x'));
  assert.ok(html.includes('—'));
  assert.ok(!html.includes('undefined'));
});
test('sentiment modal does not turn missing upstream data into 50/50 readings', async () => {
  const elements=new Map();
  const document={getElementById(id){if(!elements.has(id))elements.set(id,{textContent:'',style:{},classList:{add(){},remove(){}}});return elements.get(id);}};
  const plugin=load('public/plugins/sentiment-modal/sentiment-modal.plugin.js',{},
    'module.exports=TickerSnapshot;', {document,fetch:async()=>({ok:true,json:async()=>({})})});
  plugin.openModal();
  await new Promise(setImmediate);
  assert.ok(!elements.get('modal-val-acc-l').textContent.includes('50'));
  assert.ok(elements.get('modal-val-acc-l').textContent.includes('—'));
});
test('funding differences use percentage points and never invent the previous value', () => {
  const data = require('../services/bot-data.service');
  const f = data.fundingFields(-0.0002, 0.0001, 5_400_000, 0);
  assert.equal(f.difference, '-0.0300%');
  assert.equal(f.timeRemaining, '01:30:00');
  const unknown = data.fundingFields(-0.0002, undefined, null, 0);
  assert.equal(unknown.previousFunding, null);
  assert.equal(unknown.difference, null);
  assert.equal(unknown.timeRemaining, null);
  assert.equal(data.fundingFields(-0.0002, 0, null, 0).difference, '-0.0200%');
});
test('measured price change uses two observed closes and preserves zero change', () => {
  const data = require('../services/bot-data.service');
  assert.equal(data.priceChange([{ close: 100 }, { close: 97 }]).changePct, -3);
  assert.equal(data.priceChange([{ close: 100 }, { close: 100 }]).changePct, 0);
  assert.equal(data.priceChange([{ close: 100 }]), null);
});
test('signal metadata survives persistence without arbitrary input fields', () => {
  const store = load('services/signal-store.service.js', {
    fs: { existsSync: () => false, mkdirSync() {} }, path,
    './price-formatter': { formatCryptoPrice: v => v == null ? null : String(v) }
  });
  const saved = store.recordSignal('audit', { id: 'audit1', symbol: 'AUDITUSDT', timeframe: '1h',
    candleOpenTime: 123, divergence: '1m', isFavorite: true, previousFunding: '0.01%', token: 'must-not-store' });
  assert.equal(saved.timeframe, '1h');
  assert.equal(saved.candleOpenTime, 123);
  assert.equal(saved.isFavorite, true);
  assert.equal(saved.previousFunding, '0.01%');
  assert.equal(saved.token, undefined);
});
test('restored candle cannot emit again after a restart', () => {
  const saved = [{ symbol: 'AUDITUSDT', timeframe: '1h', candleOpenTime: 123, timestamp: Date.now() }];
  const BaseBot = load('bots/base/base-bot.js', {
    '../../services/signal-store.service': { getRecentSignalsByBot: () => saved },
    '../../services/signal-bus.service': {}
  });
  const bot = new BaseBot({ id: 'audit' });
  assert.equal(bot.canEmitSignal('AUDITUSDT', '1h', 123, 600000), false);
});
test('restart deduplication is independent of the 50-card display limit', () => {
  const saved = Array.from({ length: 70 }, (_, i) => ({ symbol: `COIN${i}USDT`,
    timeframe: '1h', candleOpenTime: 123, timestamp: Date.now() }));
  const BaseBot = load('bots/base/base-bot.js', {
    '../../services/signal-store.service': { getRecentSignalsByBot: (_, limit) => saved.slice(0, limit) },
    '../../services/signal-bus.service': {}
  });
  const bot = new BaseBot({ id: 'audit' });
  assert.equal(bot.getCount(), 50);
  assert.equal(bot.canEmitSignal('COIN69USDT', '1h', 123), false);
});

test('Hub reports no affected bot when addSignal rejects a duplicate', () => {
  const deps = {};
  for (const name of ['hammer-pro-plus', 'hammer-pro', 'four-s-sniper', 'four-s', 'v3-volume',
    'divergence', 'funding-rate', 'm1a-drop', 'm1-premium']) deps[`./strategies/${name}.bot`] = { addSignal: () => null };
  for (const name of ['price-formatter', 'market-data-engine.service', 'quant-indicators.service',
    'derivatives-enricher.service', 'symbol-registry.service']) deps[`../services/${name}`] = {};
  const manager = load('bots/index.js', deps);
  assert.equal(manager.emitSignal({ symbol: 'AUDITUSDT', botId: '4s' }).affectedBots.length, 0);
});

test('a persistence duplicate does not reach memory or SignalBus', () => {
  let emitted = 0;
  const BaseBot = load('bots/base/base-bot.js', {
    '../../services/signal-store.service': { getRecentSignalsByBot: () => [], recordSignal: () => null },
    '../../services/signal-bus.service': { emit() { emitted++; } }
  });
  const bot = new BaseBot({ id: 'audit' });
  assert.equal(bot.addSignal({ symbol: 'AUDITUSDT', candleOpenTime: 123, timeframe: '1h' }), null);
  assert.equal(bot.getCount(), 0);
  assert.equal(emitted, 0);
  assert.equal(bot.canEmitSignal('AUDITUSDT', '1h', 123), true);
});
test('a rejected legacy route is not rerouted into another bot', () => {
  const deps = {};
  let fallbackCalls = 0;
  for (const name of ['hammer-pro-plus', 'hammer-pro', 'four-s-sniper', 'four-s', 'v3-volume',
    'divergence', 'funding-rate', 'm1a-drop', 'm1-premium']) deps[`./strategies/${name}.bot`] = {
      ingest: () => { if (name === 'hammer-pro-plus') fallbackCalls++; return null; }
    };
  for (const name of ['price-formatter', 'market-data-engine.service', 'quant-indicators.service',
    'derivatives-enricher.service', 'symbol-registry.service']) deps[`../services/${name}`] = {};
  const manager = load('bots/index.js', deps);
  manager.emitSignal({ symbol: 'AUDITUSDT', timeframe: '4h' });
  assert.equal(fallbackCalls, 0);
});
