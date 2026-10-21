const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./test-module-loader.cjs');
const botData = require('../services/bot-data.service');
const quantIndicators = require('../services/quant-indicators.service');
const strategyRules = require('../bots/strategy-rules');

test('detectPivotDivergence identifies VisiVero 60-bar 2-neighbor Regular RSI Divergence on live/prev candle', () => {
  // Construct 60 candles where bar 40 is a deep RSI & price trough (price=100, RSI=22),
  // and bar 59 (now) makes a lower price low (price=98) but a higher RSI (RSI=28 <= 40)
  const candlesBull = Array.from({ length: 60 }, (_, i) => {
    if (i === 40) return { open: 102, high: 103, low: 100, close: 100.5, volume: 100 };
    if (i === 59) return { open: 99, high: 99.5, low: 98, close: 98.5, volume: 100 };
    return { open: 105, high: 106, low: 104, close: 105, volume: 100 };
  });
  const rsiSeriesBull = Array.from({ length: 60 }, (_, i) => {
    if (i === 40) return 22;
    if (i === 39 || i === 41) return 29;
    if (i === 38 || i === 42) return 33;
    if (i === 59) return 27;
    return 45;
  });

  const divBull = quantIndicators.detectPivotDivergence(candlesBull, rsiSeriesBull);
  assert.equal(divBull.hasBullDiv, true);
  assert.equal(divBull.hasBearDiv, false);

  // Construct 60 candles where bar 35 is a high RSI & price peak (price=200, RSI=76),
  // and bar 59 (now) makes a higher price high (price=205) but a lower RSI (RSI=64 >= 57)
  const candlesBear = Array.from({ length: 60 }, (_, i) => {
    if (i === 35) return { open: 198, high: 200, low: 197, close: 199.5, volume: 100 };
    if (i === 59) return { open: 202, high: 205, low: 201, close: 204, volume: 100 };
    return { open: 190, high: 192, low: 189, close: 191, volume: 100 };
  });
  const rsiSeriesBear = Array.from({ length: 60 }, (_, i) => {
    if (i === 35) return 76;
    if (i === 34 || i === 36) return 68;
    if (i === 33 || i === 37) return 62;
    if (i === 59) return 64;
    return 52;
  });

  const divBear = quantIndicators.detectPivotDivergence(candlesBear, rsiSeriesBear);
  assert.equal(divBear.hasBearDiv, true);
  assert.equal(divBear.hasBullDiv, false);
});

test('evaluateDivergence reproduces VisiVero AUSDT (🟢 1H RSI DIVERGENCE), 1H RSI SMA CROSSED and 4H RSI DIVERGENCE', () => {
  // 1. AUSDT: 🟢 1H RSI DIVERGENCE | Boost: +2.69% | Cur: 0.08522 | Prev: 0.08517 | RSI: 1h.27❗️ | 4h.34 | 1d.41 | SRSI: 1❗️|9❗️|32 | Pivot: %0.77 ⚠️
  const klines1hAusdt = [
    { open: 0.08600, high: 0.08620, low: 0.08500, close: 0.08550 },
    { open: 0.08550, high: 0.08580, low: 0.08480, close: 0.08520 },
    { open: 0.08520, high: 0.08560, low: 0.08300, close: 0.08510 }, // (0.08520 - 0.08300)/0.08300 = 2.65%
    { open: 0.08510, high: 0.08540, low: 0.08287, close: 0.08517 }, // (0.08510 - 0.08287)/0.08287 = +2.69%
    { open: 0.08517, high: 0.08550, low: 0.08490, close: 0.08522 }
  ];

  const evalAusdt = strategyRules.evaluateDivergence({
    m1h: {
      rsi: 27.2,
      srsiK: 1.1,
      divergence: { hasBullDiv: true, hasBearDiv: false },
      pivots: { pivotDistancePct: 1.45 }
    },
    m4h: { rsi: 34.0, srsiK: 9.2 },
    m1d: { rsi: 41.3, srsiK: 32.0, pivots: { pivotDistancePct: 0.77 } },
    klines1h: klines1hAusdt
  });

  assert.ok(evalAusdt);
  assert.equal(evalAusdt.strategyVersion, strategyRules.DIV_VERSION);
  assert.equal(evalAusdt.timeframe, '1h');
  assert.equal(evalAusdt.dot, '🟢');
  assert.equal(evalAusdt.direction, 'up');
  assert.equal(evalAusdt.strategy, '1H RSI DIVERGENCE');
  assert.equal(evalAusdt.boostValue, '+2.69%');
  assert.deepEqual(evalAusdt.rsi, { h1: '27❗️', h4: '34', d1: '41' });
  assert.deepEqual(evalAusdt.srsi, { h1: '1❗️', h4: '9❗️', d1: '32' });
  assert.equal(evalAusdt.pivot, '%0.77 ⚠️');

  // 2. 1H RSI SMA CROSSED (🟢 when 1h RSI <= 37, 🔴 when 1h RSI >= 70)
  const evalSmaUp = strategyRules.evaluateDivergence({
    m1h: {
      rsi: 35.4,
      srsiK: 8.0,
      rsiSmaCrossUp: true,
      divergence: { hasBullDiv: false, hasBearDiv: false },
      pivots: { pivotDistancePct: 2.10 }
    },
    m4h: { rsi: 42.0, srsiK: 18.0 },
    m1d: { rsi: 48.0, srsiK: 40.0, pivots: { pivotDistancePct: 1.85 } },
    boostPct: 1.94
  });
  assert.ok(evalSmaUp);
  assert.equal(evalSmaUp.dot, '🟢');
  assert.equal(evalSmaUp.strategy, '1H RSI SMA CROSSED');
  assert.equal(evalSmaUp.boostValue, '+1.94%');
  assert.equal(evalSmaUp.pivot, null); // >= 1.00% must not render Pivot alert

  // 3. 4H RSI DIVERGENCE (when 1h has no trigger and 4h has extreme Regular RSI divergence)
  const eval4hBear = strategyRules.evaluateDivergence({
    m1h: { rsi: 68.0, srsiK: 85.0, divergence: { hasBullDiv: false, hasBearDiv: false } },
    m4h: { rsi: 74.2, srsiK: 95.0, divergence: { hasBullDiv: false, hasBearDiv: true } },
    m1d: { rsi: 62.0, srsiK: 80.0, pivots: { pivotDistancePct: 0.42 } },
    boostPct: 4.12
  });
  assert.ok(eval4hBear);
  assert.equal(eval4hBear.timeframe, '4h');
  assert.equal(eval4hBear.dot, '🔴');
  assert.equal(eval4hBear.strategy, '4H RSI DIVERGENCE');
  assert.equal(eval4hBear.boostValue, '+4.12%');
  assert.equal(eval4hBear.pivot, '%0.42 ⚠️');
});

test('Divergence runner emits 1H RSI DIVERGENCE with 1h close[1] Previous Price and 1h|4h|1d RSI/SRSI', async () => {
  const bars1h = Array.from({ length: 60 }, (_, i) => ({
    openTime: (i + 1) * 3600000,
    closeTime: (i + 2) * 3600000 - 1,
    open: i === 58 ? 0.08510 : 0.08517,
    high: 0.08550,
    low: i === 58 ? 0.08287 : 0.08490,
    close: i === 59 ? 0.08522 : (i === 58 ? 0.08517 : 0.08600),
    volume: 1000
  }));
  const bars4h = Array.from({ length: 50 }, (_, i) => ({
    openTime: (i + 1) * 14400000,
    closeTime: (i + 2) * 14400000 - 1,
    open: 0.085,
    high: 0.087,
    low: 0.083,
    close: 0.08522,
    volume: 4000
  }));
  const bars1d = Array.from({ length: 30 }, (_, i) => ({
    openTime: (i + 1) * 86400000,
    closeTime: (i + 2) * 86400000 - 1,
    open: 0.085,
    high: 0.086,
    low: 0.084,
    close: 0.08522,
    volume: 20000
  }));

  const out = [];
  const helper = {
    botData,
    strategyRules,
    isSignalAccepted: botData.isSignalAccepted,
    getWatchlist: async () => [{ symbol: 'AUSDT' }],
    getKlines: async (_, interval) => (interval === '1h' ? bars1h : (interval === '4h' ? bars4h : bars1d)),
    postSignal: async s => {
      out.push(s);
      return { status: 200, data: { accepted: true } };
    },
    logger: { header() {}, info() {}, scan() {}, signal() {}, warn() {} },
    formatCryptoPrice: String,
    computePrevPrice: String,
    quantIndicators: {
      calculateAllMetrics: klines => {
        if (klines === bars1h) {
          return {
            rsi: 27,
            srsiK: 1,
            divergence: { hasBullDiv: true, hasBearDiv: false },
            pivots: { pivotDistancePct: 1.50 }
          };
        }
        if (klines === bars4h) {
          return { rsi: 34, srsiK: 9, divergence: { hasBullDiv: false, hasBearDiv: false } };
        }
        return { rsi: 41, srsiK: 32, pivots: { pivotDistancePct: 0.77 } };
      }
    }
  };

  const runner = load('bots/runners/divergence.runner.js', { './runner-helper': helper }, '\nmodule.exports = { scan };');
  await runner.scan();

  assert.equal(out.length, 1);
  const sig = out[0];
  assert.equal(sig.symbol, 'AUSDT');
  assert.equal(sig.timeframe, '1h');
  assert.equal(sig.dot, '🟢');
  assert.equal(sig.strategy, '1H RSI DIVERGENCE');
  assert.equal(sig.currentPrice, '0.08522');
  assert.equal(sig.prevPrice, '0.08517');
  assert.equal(sig.boostValue, '+2.69%');
  assert.deepEqual(sig.rsi, { h1: '27❗️', h4: '34', d1: '41' });
  assert.deepEqual(sig.srsi, { h1: '1❗️', h4: '9❗️', d1: '32' });
  assert.equal(sig.pivot, '%0.77 ⚠️');
});

test('DivergenceBot.ingest and BotRenderer do not fabricate Pivot or HTF metrics and render exact VisiVero DIV card', () => {
  class MockBaseBot {
    constructor(opts) { Object.assign(this, opts); }
    addSignal(card) { return card; }
  }
  const divBot = load('bots/strategies/divergence.bot.js', {
    '../base/base-bot': MockBaseBot,
    '../../services/bot-data.service': botData,
    '../../services/price-formatter': { formatCryptoPrice: String, computePrevPrice: String }
  });

  // 1. Ingest AUSDT with Pivot < 1.00%
  const cardWithPivot = divBot.ingest({
    symbol: 'AUSDT',
    dot: '🟢',
    strategy: '1H RSI DIVERGENCE',
    boostValue: '+2.69%',
    currentPrice: '0.08522',
    prevPrice: '0.08517',
    rsi1h: 27,
    rsi4h: 34,
    rsi1d: 41,
    srsi1h: 1,
    srsi4h: 9,
    srsi1d: 32,
    pivot: 0.77
  });
  assert.ok(cardWithPivot);
  assert.equal(cardWithPivot.pivot, '%0.77 ⚠️');
  assert.deepEqual({ ...cardWithPivot.rsi }, { h1: '27❗️', h4: '34', d1: '41' });
  assert.deepEqual({ ...cardWithPivot.srsi }, { h1: '1❗️', h4: '9❗️', d1: '32' });

  // 2. Ingest Bearish DIV without Pivot or 4h/1d RSI -> must NOT fabricate %0.32 ⚠️ or fake 35/45 RSI
  const cardNoPivot = divBot.ingest({
    symbol: 'SOLUSDT',
    dot: '🔴',
    strategy: '1H RSI SMA CROSSED',
    boostValue: '+1.85%',
    currentPrice: '185.40',
    prevPrice: '186.10',
    rsi1h: 72,
    srsi1h: 94
  });
  assert.ok(cardNoPivot);
  assert.equal(cardNoPivot.pivot, null);
  assert.deepEqual({ ...cardNoPivot.rsi }, { h1: '72❗️', h4: '—', d1: '—' });
  assert.deepEqual({ ...cardNoPivot.srsi }, { h1: '94❗️', h4: '—', d1: '—' });

  const renderer = load('public/plugins/bot-hub/bot-renderer.js');
  const htmlAusdt = renderer.generateSignalsHtml('div', [cardWithPivot]);
  assert.ok(htmlAusdt.includes('#AUSDT'));
  assert.ok(htmlAusdt.includes('1H RSI DIVERGENCE'));
  assert.ok(htmlAusdt.includes('+2.69%'));
  assert.ok(htmlAusdt.includes('Pivot: %0.77 ⚠️'));

  const htmlSol = renderer.generateSignalsHtml('div', [cardNoPivot]);
  assert.ok(htmlSol.includes('#f87171'));
  assert.ok(htmlSol.includes('1H RSI SMA CROSSED'));
  assert.ok(!htmlSol.includes('Pivot:'));
});
