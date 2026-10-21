const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./test-module-loader.cjs');
const botData = require('../services/bot-data.service');
const quantIndicators = require('../services/quant-indicators.service');
const strategyRules = require('../bots/strategy-rules');

test('Nadaraya-Watson Envelope (h=8, mult=3, repaint=true) detects lower and upper band breakouts', () => {
  // Construct 120 bars around 100, then drop sharply on the last bar below lower envelope
  const closesDown = Array.from({ length: 120 }, (_, i) => (i === 119 ? 88 : 100 + Math.sin(i * 0.2) * 1.5));
  const nwDown = quantIndicators.calculateNadarayaWatson(closesDown, 8, 3, true);
  assert.ok(nwDown);
  assert.equal(nwDown.isBelowLower, true);
  assert.equal(nwDown.isAboveUpper, false);
  assert.equal(nwDown.crossDownLower, true);

  // Construct 120 bars around 100, then spike sharply on the last bar above upper envelope
  const closesUp = Array.from({ length: 120 }, (_, i) => (i === 119 ? 112 : 100 + Math.sin(i * 0.2) * 1.5));
  const nwUp = quantIndicators.calculateNadarayaWatson(closesUp, { h: 8, mult: 3, repaint: true });
  assert.ok(nwUp);
  assert.equal(nwUp.isAboveUpper, true);
  assert.equal(nwUp.isBelowLower, false);
  assert.equal(nwUp.crossUpUpper, true);
});

test('dominantPositioning always formats the dominant side (>= 50.00%) with 🟢 for Long and 🔴 for Short', () => {
  // TSLAUSDT: topAccount long 62.58% -> 62.58% 🟢; globalExposure long 56.29% -> 56.29% 🟢
  const tslaTp = botData.dominantPositioning(62.58);
  assert.deepEqual(tslaTp, { pct: 62.58, text: '62.58%', dot: '🟢', side: 'long' });

  // BERAUSDT: topAccount long 42.78% (short 57.22%) -> 57.22% 🔴
  const beraTp = botData.dominantPositioning(42.78);
  assert.deepEqual(beraTp, { pct: 57.22, text: '57.22%', dot: '🔴', side: 'short' });

  // BRUSDT: globalExposure long 36.64% (short 63.36%) -> 63.36% 🔴
  const brMe = botData.dominantPositioning(36.64);
  assert.deepEqual(brMe, { pct: 63.36, text: '63.36%', dot: '🔴', side: 'short' });

  // Boundary 50.00% -> 50.00% 🟢
  assert.deepEqual(botData.dominantPositioning(50), { pct: 50, text: '50.00%', dot: '🟢', side: 'long' });
  assert.equal(botData.dominantPositioning(null), null);
  assert.equal(botData.dominantPositioning(NaN), null);
});

test('evaluateFourSSniper reproduces VisiVero TSLAUSDT (🔴 NW DOWN), BRUSDT (🔴 NW DOWN) and BERAUSDT (🟢 4H RSI DIVERGENCE)', () => {
  // 1. TSLAUSDT: 🔴 NW DOWN | Boost: +4.56% | Cur: 407.29 | Prev: 391.28 | RSI: 1h.73❗️ | 4h.69 | 1d.59 | SRSI: 100❗️|100❗️|100❗️
  const klines4hTsla = [
    { open: 385.00, high: 390.00, low: 384.00, close: 388.00 },
    { open: 388.00, high: 391.00, low: 387.00, close: 389.50 },
    { open: 389.50, high: 392.00, low: 388.50, close: 390.00 },
    { open: 390.00, high: 393.00, low: 389.00, close: 391.28 },
    { open: 391.28, high: 409.1224, low: 391.00, close: 407.29 } // (409.1224 - 391.28) / 391.28 = +4.56%
  ];
  const evalTsla = strategyRules.evaluateFourSSniper({
    m1h: { rsi: 73.1, srsiK: 99.9 },
    m4h: { rsi: 68.7, srsiK: 100.0, nw: { isAboveUpper: true, isBelowLower: false } },
    m1d: { rsi: 59.3, srsiK: 100.0 },
    klines4h: klines4hTsla,
    whaleLong: 62.58,
    globalLong: 56.29
  });
  assert.ok(evalTsla);
  assert.equal(evalTsla.strategyVersion, strategyRules.SNIPER_VERSION);
  assert.equal(evalTsla.dot, '🔴');
  assert.equal(evalTsla.direction, 'down');
  assert.equal(evalTsla.strategy, 'NW DOWN');
  assert.equal(evalTsla.boostValue, '+4.56%');
  assert.deepEqual(evalTsla.rsi, { h1: '73❗️', h4: '69', d1: '59' });
  assert.deepEqual(evalTsla.srsi, { h1: '100❗️', h4: '100❗️', d1: '100❗️' });
  assert.equal(evalTsla.traderPositioning, '62.58%');
  assert.equal(evalTsla.traderDot, '🟢');
  assert.equal(evalTsla.marketExposure, '56.29%');
  assert.equal(evalTsla.exposureDot, '🟢');

  // 2. BERAUSDT: 🟢 4H RSI DIVERGENCE | Boost: +8.86% | RSI: 1h.28❗️ | 4h.25❗️ | 1d.31 | SRSI: 2❗️|2❗️|2❗️ | TP: 57.22% 🔴 | ME: 53.70% 🟢
  const evalBera = strategyRules.evaluateFourSSniper({
    m1h: { rsi: 28.1, srsiK: 1.9 },
    m4h: {
      rsi: 25.0,
      srsiK: 2.1,
      nw: { isAboveUpper: false, isBelowLower: false },
      divergence: { hasBullDiv: true, hasBearDiv: false }
    },
    m1d: { rsi: 31.2, srsiK: 2.0 },
    boostPct: 8.86,
    whaleLong: 42.78, // 57.22% Short -> 57.22% 🔴
    globalLong: 53.70 // 53.70% Long -> 53.70% 🟢
  });
  assert.ok(evalBera);
  assert.equal(evalBera.dot, '🟢');
  assert.equal(evalBera.direction, 'up');
  assert.equal(evalBera.strategy, '4H RSI DIVERGENCE');
  assert.equal(evalBera.boostValue, '+8.86%');
  assert.deepEqual(evalBera.rsi, { h1: '28❗️', h4: '25❗️', d1: '31' });
  assert.deepEqual(evalBera.srsi, { h1: '2❗️', h4: '2❗️', d1: '2❗️' });
  assert.equal(evalBera.traderPositioning, '57.22%');
  assert.equal(evalBera.traderDot, '🔴');
  assert.equal(evalBera.marketExposure, '53.70%');
  assert.equal(evalBera.exposureDot, '🟢');

  // 3. 4H RSI SMA CROSSED (both 🟢 and 🔴)
  const evalSmaUp = strategyRules.evaluateFourSSniper({
    m1h: { rsi: 34, srsiK: 15 },
    m4h: { rsi: 31, srsiK: 9, rsiSmaCrossUp: true, nw: { isBelowLower: false, isAboveUpper: false } },
    m1d: { rsi: 42, srsiK: 25 },
    boostPct: 3.45,
    whaleLong: 64.10,
    globalLong: 58.20
  });
  assert.ok(evalSmaUp);
  assert.equal(evalSmaUp.dot, '🟢');
  assert.equal(evalSmaUp.strategy, '4H RSI SMA CROSSED');
  assert.equal(evalSmaUp.boostValue, '+3.45%');

  const evalSmaDown = strategyRules.evaluateFourSSniper({
    m1h: { rsi: 72, srsiK: 88 },
    m4h: { rsi: 68, srsiK: 92, rsiSmaCrossDown: true, nw: { isBelowLower: false, isAboveUpper: false } },
    m1d: { rsi: 61, srsiK: 75 },
    boostPct: 4.10,
    whaleLong: 55.00,
    globalLong: 41.00
  });
  assert.ok(evalSmaDown);
  assert.equal(evalSmaDown.dot, '🔴');
  assert.equal(evalSmaDown.strategy, '4H RSI SMA CROSSED');
  assert.equal(evalSmaDown.marketExposure, '59.00%');
  assert.equal(evalSmaDown.exposureDot, '🔴');
});

test('FourSSniper runner and central engine emit 4H NW UP / NW DOWN signals with 4h close[1] Previous Price', async () => {
  // Build 100 full OHLC candles where 4h price spikes above NW upper envelope on the last bar
  const bars4h = Array.from({ length: 100 }, (_, i) => {
    const isLast = i === 99;
    const isPrev = i === 98;
    const close = isLast ? 407.29 : (isPrev ? 391.28 : 350 + (i % 5));
    return {
      openTime: (i + 1) * 14400000,
      closeTime: (i + 2) * 14400000 - 1,
      open: isLast ? 391.28 : close - 1,
      high: isLast ? 409.1224 : close + 1,
      low: isLast ? 391.00 : close - 2,
      close,
      volume: 1000
    };
  });
  const bars1h = Array.from({ length: 100 }, (_, i) => ({
    openTime: (i + 1) * 3600000,
    closeTime: (i + 2) * 3600000 - 1,
    open: 390,
    high: 408,
    low: 389,
    close: 407.29,
    volume: 500
  }));
  const bars1d = Array.from({ length: 50 }, (_, i) => ({
    openTime: (i + 1) * 86400000,
    closeTime: (i + 2) * 86400000 - 1,
    open: 380,
    high: 410,
    low: 375,
    close: 407.29,
    volume: 5000
  }));

  const runnerOut = [];
  const helper = {
    botData,
    strategyRules,
    isSignalAccepted: botData.isSignalAccepted,
    getWatchlist: async () => [{ symbol: 'TSLAUSDT' }],
    getKlines: async (_, interval) => (interval === '4h' ? bars4h : (interval === '1d' ? bars1d : bars1h)),
    getSentiment: async () => ({
      topAccount: { longPct: 62.58 },
      globalExposure: { longPct: 56.29 }
    }),
    postSignal: async s => {
      runnerOut.push(s);
      return { status: 200, data: { accepted: true } };
    },
    logger: { header() {}, info() {}, scan() {}, signal() {}, warn() {} },
    formatCryptoPrice: String,
    computePrevPrice: String,
    quantIndicators
  };

  const runner = load('bots/runners/four-s-sniper.runner.js', { './runner-helper': helper }, '\nmodule.exports = { scan };');
  await runner.scan();
  assert.equal(runnerOut.length, 1);
  const sig = runnerOut[0];
  assert.equal(sig.symbol, 'TSLAUSDT');
  assert.equal(sig.timeframe, '4h');
  assert.equal(sig.dot, '🔴');
  assert.equal(sig.strategy, 'NW DOWN');
  assert.equal(sig.currentPrice, '407.29');
  assert.equal(sig.prevPrice, '391.28');
  assert.equal(sig.boostValue, '+4.56%');
  assert.equal(sig.traderPositioning, '62.58%');
  assert.equal(sig.traderDot, '🟢');
  assert.equal(sig.marketExposure, '56.29%');
  assert.equal(sig.exposureDot, '🟢');
});

test('FourSSniperBot.ingest and BotRenderer support both 🟢 (#38bdf8) and 🔴 (#f87171) 4S Sniper cards', () => {
  class MockBaseBot {
    constructor(opts) { Object.assign(this, opts); }
    addSignal(card) { return card; }
  }
  const fourSSniperBot = load('bots/strategies/four-s-sniper.bot.js', {
    '../base/base-bot': MockBaseBot,
    '../../services/bot-data.service': botData,
    '../../services/price-formatter': { formatCryptoPrice: String, computePrevPrice: String }
  });

  const card = fourSSniperBot.ingest({
    symbol: 'BRUSDT',
    dot: '🔴',
    strategy: 'NW DOWN',
    boostValue: '+26.31%',
    currentPrice: '0.6936',
    prevPrice: '0.7007',
    rsi1h: 95,
    rsi4h: 85,
    rsi1d: 72,
    srsi1h: 100,
    srsi4h: 95,
    srsi1d: 96,
    traderPositioning: 54.02,
    marketExposure: 36.64 // 63.36% Short -> 63.36% 🔴
  });

  assert.ok(card);
  assert.equal(card.dot, '🔴');
  assert.equal(card.direction, 'down');
  assert.equal(card.strategy, 'NW DOWN');
  assert.equal(card.boostValue, '+26.31%');
  assert.equal(card.currentPrice, '0.6936');
  assert.equal(card.prevPrice, '0.7007');
  assert.deepEqual({ ...card.rsi }, { h1: '95❗️', h4: '85❗️', d1: '72❗️' });
  assert.deepEqual({ ...card.srsi }, { h1: '100❗️', h4: '95❗️', d1: '96❗️' });
  assert.equal(card.traderPositioning, '54.02%');
  assert.equal(card.traderDot, '🟢');
  assert.equal(card.marketExposure, '63.36%');
  assert.equal(card.exposureDot, '🔴');

  // Verify BotRenderer HTML output
  const renderer = load('public/plugins/bot-hub/bot-renderer.js');
  const html = renderer.generateSignalsHtml('4ssniper', [card]);
  assert.ok(html.includes('#f87171'), 'Red dot 4S Sniper card should use #f87171 header color');
  assert.ok(html.includes('NW DOWN'));
  assert.ok(html.includes('+26.31%'));
  assert.ok(html.includes('63.36%'));
});
