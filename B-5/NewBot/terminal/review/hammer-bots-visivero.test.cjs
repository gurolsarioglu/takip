const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./test-module-loader.cjs');
const botData = require('../services/bot-data.service');
const strategyRules = require('../bots/strategy-rules');
const quantIndicators = require('../services/quant-indicators.service');

test('VisiVero 5-bar 1m impulse Boost Value matches exact historical signals (0.00% error)', () => {
  // Real historical 21:25 1m impulse bars from VisiVero evidence
  const mvllBars = [
    { open: 25.28, high: 25.31, low: 25.13, close: 25.13 },
    { open: 25.13, high: 25.16, low: 24.55, close: 24.62 }, // (25.13 - 24.55)/24.55 = 2.3625% -> 2.36%
    { open: 24.62, high: 24.72, low: 24.21, close: 24.51 },
    { open: 24.52, high: 24.59, low: 24.14, close: 24.14 },
    { open: 24.14, high: 24.43, low: 24.12, close: 24.33 }
  ];
  assert.equal(botData.impulseBoost(mvllBars, 'up', 5), 2.36);

  const skddBars = [
    { open: 12.441, high: 12.669, low: 12.441, close: 12.653 },
    { open: 12.649, high: 12.915, low: 12.641, close: 12.915 }, // (12.915 - 12.649)/12.649 = 2.1029% -> 2.10%
    { open: 12.915, high: 12.945, low: 12.899, close: 12.945 },
    { open: 12.945, high: 13.000, low: 12.944, close: 12.973 },
    { open: 12.976, high: 13.003, low: 12.976, close: 13.004 }
  ];
  assert.equal(botData.impulseBoost(skddBars, 'down', 5), 2.10);

  const mBars = [
    { open: 0.7582, high: 0.7582, low: 0.7531, close: 0.7531 },
    { open: 0.7530, high: 0.7537, low: 0.7332, close: 0.7496 }, // (0.7530 - 0.7332)/0.7332 = 2.7005% -> 2.70%
    { open: 0.7490, high: 0.7508, low: 0.7460, close: 0.7504 },
    { open: 0.7504, high: 0.7510, low: 0.7497, close: 0.7509 },
    { open: 0.7508, high: 0.7583, low: 0.7506, close: 0.7518 }
  ];
  assert.equal(botData.impulseBoost(mBars, 'up', 5), 2.70);
});

test('VisiVero Hammer stars, RSI/SRSI exclamation marks, and optional alerts match exact thresholds', () => {
  assert.equal(botData.hammerStars(1.99), '');
  assert.equal(botData.hammerStars(2.00), '⭐️');
  assert.equal(botData.hammerStars(2.99), '⭐️');
  assert.equal(botData.hammerStars(3.00), '⭐️⭐️');
  assert.equal(botData.hammerStars(4.99), '⭐️⭐️');
  assert.equal(botData.hammerStars(5.00), '⭐️⭐️⭐️');

  assert.equal(botData.rsiTextWithAlert(30), '30❗️');
  assert.equal(botData.rsiTextWithAlert(31), '31');
  assert.equal(botData.rsiTextWithAlert(69), '69');
  assert.equal(botData.rsiTextWithAlert(70), '70❗️');

  assert.equal(botData.srsiTextWithAlert(10), '10❗️');
  assert.equal(botData.srsiTextWithAlert(11), '11');
  assert.equal(botData.srsiTextWithAlert(89), '89');
  assert.equal(botData.srsiTextWithAlert(90), '90❗️');

  assert.equal(botData.formatHammerDistanceAlert(0.24), '%0.24 ⚠️');
  assert.equal(botData.formatHammerDistanceAlert(1.00), null);
  assert.equal(botData.formatHammerFundingAlert(-0.0023), '-0.23 ⚠️');
  assert.equal(botData.formatHammerFundingAlert(-0.0015), null);
});

test('evaluateHammer distinguishes Hammer Pro (#W1/#S1) vs Hammer Pro Plus (#W1/#S1/#R1) for UP and DOWN', () => {
  // 1. Low-boost #W1 UP (1.15% boost, 1m RSI 35, 5m RSI 35, 5m SRSI 4): accepted by Hammer Pro, rejected by Hammer Pro Plus
  const qntxCtx = {
    boostPct: 1.15,
    m1: { rsi: 35, srsiK: 39, wtCrossUpClosed: true },
    m5: { rsi: 35, srsiK: 4 },
    m1h: { rsi: 44, srsiK: 6 },
    m1d: { pivots: { pivotDistancePct: 0.62 } }
  };
  const hpQntx = strategyRules.evaluateHammer('hammerpro', qntxCtx);
  const hppQntx = strategyRules.evaluateHammer('hammerproplus', qntxCtx);
  assert.ok(hpQntx);
  assert.equal(hpQntx.dot, '🟢');
  assert.equal(hpQntx.strategy, '#W1');
  assert.equal(hpQntx.stars, '');
  assert.equal(hpQntx.boostValue, '+1.15%');
  assert.equal(hpQntx.wt, '1m🟢');
  assert.equal(hpQntx.pivot, '%0.62 ⚠️');
  assert.equal(hppQntx, null);

  // 2. High-boost #W1 UP (MVLLUSDT: +2.36%, 1m.19❗️ | 5m.5❗️ | 1h.22❗️): accepted by both Hammer Pro and Hammer Pro Plus
  const mvllCtx = {
    boostPct: 2.36,
    m1: { rsi: 19, srsiK: 39, wtCrossUpClosed: true, divergence: { hasBullDiv: true } },
    m5: { rsi: 5, srsiK: 0 },
    m1h: { rsi: 22, srsiK: 55 },
    m4h: { ema200DistPct: 0.29 },
    m1d: { pivots: { pivotDistancePct: 0.24 } },
    fundingRate: -0.0023,
    btcChangePct: -0.65
  };
  const hppMvll = strategyRules.evaluateHammer('hammerproplus', mvllCtx);
  assert.ok(hppMvll);
  assert.equal(hppMvll.dot, '🟢');
  assert.equal(hppMvll.strategy, '#W1');
  assert.equal(hppMvll.stars, '⭐️');
  assert.equal(hppMvll.boostValue, '+2.36%');
  assert.deepEqual(hppMvll.rsi, { m1: '19❗️', m5: '5❗️', h1: '22❗️' });
  assert.deepEqual(hppMvll.srsi, { m1: '39', m5: '0❗️', h1: '55' });
  assert.equal(hppMvll.wt, '1m🟢');
  assert.equal(hppMvll.divergence, '1m✅');
  assert.equal(hppMvll.pivot, '%0.24 ⚠️');
  assert.equal(hppMvll.ema200, '%0.29 ⚠️');
  assert.equal(hppMvll.fr, '-0.23 ⚠️');
  assert.equal(hppMvll.btcStatus, 'Volatilite ⚡️');

  // 3. #W1 DOWN (BATUSDT: 🔴 #BATUSDT ⭐️, Strategy: #W1, Boost: +2.52%, WT: 1m🔴)
  const batCtx = {
    boostPct: 2.52,
    m1: { rsi: 67, srsiK: 44, wtCrossDownClosed: true },
    m5: { rsi: 70, srsiK: 92 },
    m1h: { rsi: 43, srsiK: 60 }
  };
  const hppBat = strategyRules.evaluateHammer('hammerproplus', batCtx);
  assert.ok(hppBat);
  assert.equal(hppBat.dot, '🔴');
  assert.equal(hppBat.strategy, '#W1');
  assert.equal(hppBat.stars, '⭐️');
  assert.equal(hppBat.wt, '1m🔴');
  assert.deepEqual(hppBat.rsi, { m1: '67', m5: '70❗️', h1: '43' });
  assert.deepEqual(hppBat.srsi, { m1: '44', m5: '92❗️', h1: '60' });

  // 4. #S1 DOWN (BRUSDT: 🔴 #BRUSDT ⭐️⭐️, Strategy: #S1, Boost: +4.42%, 1m RSI 72❗️ + RSI/SMA cross down)
  const brCtx = {
    boostPct: 4.42,
    m1: { rsi: 72, srsiK: 53, rsiSmaCrossDown: true },
    m5: { rsi: 75, srsiK: 87 },
    m1h: { rsi: 65, srsiK: 95 }
  };
  const hpBr = strategyRules.evaluateHammer('hammerpro', brCtx);
  const hppBr = strategyRules.evaluateHammer('hammerproplus', brCtx);
  assert.ok(hpBr && hppBr);
  assert.equal(hppBr.dot, '🔴');
  assert.equal(hppBr.strategy, '#S1');
  assert.equal(hppBr.stars, '⭐️⭐️');
  assert.equal(hppBr.wt, null);

  // 5. #R1 DOWN (CTUSDT: 🔴 #CTUSDT ⭐️⭐️⭐️, Strategy: #R1, Boost: +43.80%, 1m RSI 74, 5m RSI 82)
  const ctCtx = {
    boostPct: 43.80,
    m1: { rsi: 74, srsiK: 55, rsiSmaCrossDown: false },
    m5: { rsi: 82, srsiK: 50 },
    m1h: { rsi: 60, srsiK: 50 }
  };
  const hppCt = strategyRules.evaluateHammer('hammerproplus', ctCtx);
  assert.ok(hppCt);
  assert.equal(hppCt.dot, '🔴');
  assert.equal(hppCt.strategy, '#R1');
  assert.equal(hppCt.stars, '⭐️⭐️⭐️');
});

test('Central engine and standalone runners emit full VisiVero 1m/5m/1h Hammer Pro & Hammer Pro+ signals when OHLC candles are present', async () => {
  const klines1m = Array.from({ length: 100 }, (_, i) => ({
    openTime: i * 60000,
    closeTime: (i + 1) * 60000 - 1,
    open: i === 96 ? 25.13 : 24.40,
    high: 25.16,
    low: i === 96 ? 24.55 : 24.12, // 2.36% impulse on bar 96
    close: i === 99 ? 24.33 : 24.40, // prevPrice = 24.40, curPrice = 24.33
    volume: 100
  }));

  const metricByTf = {
    100: { rsi: 19, srsiK: 39, wtCrossUpClosed: true, divergence: { hasBullDiv: true, hasBearDiv: false }, pivots: { pivotDistancePct: 0.24 } },
    50: { rsi: 5, srsiK: 0, wtCrossUpClosed: false, divergence: { hasBullDiv: false, hasBearDiv: false }, pivots: { pivotDistancePct: 0.24 } },
    60: { rsi: 22, srsiK: 55, wtCrossUpClosed: false, divergence: { hasBullDiv: false, hasBearDiv: false }, pivots: { pivotDistancePct: 0.24 } },
    70: { rsi: 45, srsiK: 50, ema200DistPct: 0.29, divergence: { hasBullDiv: false, hasBearDiv: false }, pivots: { pivotDistancePct: 0.24 } }
  };

  const getKlinesMock = async (_, interval) => {
    if (interval === '1m') return klines1m;
    const len = interval === '5m' ? 50 : interval === '1h' ? 60 : interval === '4h' ? 70 : 10;
    return Array.from({ length: len }, (_, i) => ({
      openTime: i * 300000,
      closeTime: (i + 1) * 300000 - 1,
      open: 24.40,
      high: 24.45,
      low: 24.30,
      close: 24.33,
      volume: 100
    }));
  };

  const quantMock = {
    calculateAllMetrics: bars => metricByTf[bars.length] || metricByTf[50],
    calculatePivots: () => ({ pivotDistancePct: 0.24 })
  };

  // Test standalone runners (hammer-pro and hammer-pro-plus)
  for (const runnerName of ['hammer-pro', 'hammer-pro-plus']) {
    const out = [];
    const h = {
      botData,
      strategyRules,
      isSignalAccepted: botData.isSignalAccepted,
      getWatchlist: async () => [{ symbol: 'MVLLUSDT', fr: -0.0023 }],
      getKlines: getKlinesMock,
      postSignal: async s => { out.push(s); return { status: 200, data: { accepted: true } }; },
      logger: { header() {}, info() {}, scan() {}, signal() {}, warn() {} },
      formatCryptoPrice: String,
      computePrevPrice: String,
      quantIndicators: quantMock
    };
    const r = load(`bots/runners/${runnerName}.runner.js`, { './runner-helper': h }, '\nmodule.exports = { scan };');
    await r.scan();
    assert.equal(out.length, 1, runnerName);
    const sig = out[0];
    assert.equal(sig.timeframe, '1m');
    assert.equal(sig.dot, '🟢');
    assert.equal(sig.strategy, '#W1');
    assert.equal(sig.stars, '⭐️');
    assert.equal(sig.boostValue, '+2.36%');
    assert.equal(sig.currentPrice, '24.33');
    assert.equal(sig.prevPrice, '24.4');
    assert.deepEqual(sig.rsi, { m1: '19❗️', m5: '5❗️', h1: '22❗️' });
    assert.deepEqual(sig.srsi, { m1: '39', m5: '0❗️', h1: '55' });
    assert.equal(sig.wt, '1m🟢');
    assert.equal(sig.divergence, '1m✅');
    assert.equal(sig.pivot, '%0.24 ⚠️');
    assert.equal(sig.ema200, '%0.29 ⚠️');
    assert.equal(sig.fr, '-0.23 ⚠️');
  }
});

test('BotRenderer renders all VisiVero fields for Hammer Pro and Hammer Pro Plus cards', () => {
  const renderer = load('public/plugins/bot-hub/bot-renderer.js');
  const sampleSignal = {
    symbol: 'BATUSDT',
    dot: '🔴',
    stars: '⭐️',
    strategy: '#W1',
    boostValue: '+2.52%',
    currentPrice: '0.18141',
    prevPrice: '0.18164',
    rsi: { m1: '67', m5: '70❗️', h1: '43' },
    srsi: { m1: '44', m5: '92❗️', h1: '60' },
    wt: '1m🔴',
    divergence: '5m✅',
    pivot: '%0.32 ⚠️',
    ema200: '%0.58 ⚠️',
    fr: '-0.24 ⚠️',
    btcStatus: 'Volatilite ⚡️',
    dateStr: '20.10.2026',
    time: '16:45'
  };

  for (const botId of ['hammerpro', 'hammerproplus']) {
    const html = renderer.generateSignalsHtml(botId, [sampleSignal]);
    assert.ok(html.includes('🔴'), `${botId} dot`);
    assert.ok(html.includes('#BATUSDT'), `${botId} symbol`);
    assert.ok(html.includes('⭐️'), `${botId} stars`);
    assert.ok(html.includes('#W1'), `${botId} strategy`);
    assert.ok(html.includes('+2.52%'), `${botId} boostValue`);
    assert.ok(html.includes('0.18141'), `${botId} currentPrice`);
    assert.ok(html.includes('0.18164'), `${botId} prevPrice`);
    assert.ok(html.includes('1m.67') && html.includes('5m.70❗️') && html.includes('1h.43'), `${botId} RSI`);
    assert.ok(html.includes('1m.44') && html.includes('5m.92❗️') && html.includes('1h.60'), `${botId} SRSI`);
    assert.ok(html.includes('1m🔴'), `${botId} WT`);
    assert.ok(html.includes('5m✅'), `${botId} Divergence`);
    assert.ok(html.includes('%0.32 ⚠️'), `${botId} Pivot`);
    assert.ok(html.includes('%0.58 ⚠️'), `${botId} 4H.E200`);
    assert.ok(html.includes('-0.24 ⚠️'), `${botId} FR`);
    assert.ok(html.includes('Volatilite ⚡️'), `${botId} BTC Status`);
  }
});

test('HammerProBot and HammerProPlusBot ingest() support both 🟢 Long and 🔴 Short VisiVero signals', () => {
  class MockBaseBot {
    constructor(opts) { Object.assign(this, opts); }
    addSignal(card) { return card; }
  }
  const deps = {
    '../base/base-bot': MockBaseBot,
    '../../services/bot-data.service': botData,
    '../../services/price-formatter': { formatCryptoPrice: String, computePrevPrice: String }
  };
  const hpBot = load('bots/strategies/hammer-pro.bot.js', deps);
  const hppBot = load('bots/strategies/hammer-pro-plus.bot.js', deps);

  const shortCard = hpBot.ingest({
    symbol: 'EIGENUSDT',
    dot: '🔴',
    strategy: '#W1',
    boostValue: '+1.15%',
    price: '0.241',
    prevPrice: '0.241',
    rsi1m: 59,
    rsi5m: 64,
    rsi1h: 56,
    srsi1m: 36,
    srsi5m: 84,
    srsi1h: 80,
    wt: '1m🔴',
    ema200: 0.72,
    btcStatus: 'Volatilite ⚡️'
  });
  assert.ok(shortCard);
  assert.equal(shortCard.dot, '🔴');
  assert.equal(shortCard.stars, '');
  assert.equal(shortCard.wt, '1m🔴');
  assert.equal(shortCard.ema200, '%0.72 ⚠️');
  assert.equal(shortCard.btcStatus, 'Volatilite ⚡️');

  const plusCard = hppBot.ingest({
    symbol: 'MVLLUSDT',
    dot: '🟢',
    strategy: '#W1',
    boostValue: '+2.36%',
    price: '24.33',
    prevPrice: '24.4',
    rsi1m: 19,
    rsi5m: 5,
    rsi1h: 22,
    srsi1m: 39,
    srsi5m: 0,
    srsi1h: 55,
    wt: '1m🟢',
    pivot: 0.24,
    fr: -0.0024
  });
  assert.ok(plusCard);
  assert.equal(plusCard.dot, '🟢');
  assert.equal(plusCard.stars, '⭐️');
  assert.equal(plusCard.wt, '1m🟢');
  assert.equal(plusCard.pivot, '%0.24 ⚠️');
  assert.equal(plusCard.fr, '-0.24 ⚠️');
  assert.deepEqual({ ...plusCard.rsi }, { m1: '19❗️', m5: '5❗️', h1: '22❗️' });
  assert.deepEqual({ ...plusCard.srsi }, { m1: '39', m5: '0❗️', h1: '55' });
});

