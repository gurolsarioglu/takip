const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { load } = require('./test-module-loader.cjs');
const botData = require('../services/bot-data.service');
const strategyRules = require('../bots/strategy-rules');

test('VisiVero V3-A 24h Base Asset Volume formatter matches exact Turkish thousand-separator format', () => {
  assert.equal(botData.formatBaseVolume24h(40814, 'TSMUSDT'), '40.814 TSM');
  assert.equal(botData.formatBaseVolume24h(1261919761, 'DOODUSDT'), '1.261.919.761 DOOD');
  assert.equal(botData.formatBaseVolume24h(509336169, '1000CATUSDT'), '509.336.169 1000CAT');
  assert.equal(botData.formatBaseVolume24h('40.814 TSM', 'TSMUSDT'), '40.814 TSM');
  assert.equal(botData.formatBaseVolume24h(null, 'TSMUSDT'), null);
  assert.equal(botData.formatBaseVolume24h(0, 'TSMUSDT'), null);
});

test('VisiVero V3-A 1m-over-24h base volume surge formula and >= +8.00% threshold match historical signals', () => {
  // 1. TSMUSDT: 24h base volume = 40,814 TSM, closed 1m volume = 7,395.5 TSM -> prior 24h = 33,418.5 -> +22.13%
  const tsmKlines = [
    { openTime: 60000, closeTime: 119999, open: 10, high: 11, low: 9.9, close: 10.5, volume: 7395.5, isClosed: true },
    { openTime: 120000, closeTime: 179999, open: 10.5, high: 10.6, low: 10.4, close: 10.55, volume: 120, isClosed: false }
  ];
  const tsmEval = strategyRules.evaluateV3({
    symbol: 'TSMUSDT',
    klines1m: tsmKlines,
    volBase24h: 40814
  });
  assert.ok(tsmEval);
  assert.equal(tsmEval.strategyVersion, strategyRules.V3_VERSION);
  assert.equal(tsmEval.dot, '');
  assert.equal(tsmEval.hacimChange, '+22.13%');
  assert.equal(tsmEval.hacim24s, '40.814 TSM');
  assert.equal(tsmEval.candleOpenTime, 60000);

  // 2. DOODUSDT: 24h base volume jumped from 1,126,311,818 to 1,261,919,761 -> +12.04%
  const doodEval = strategyRules.evaluateV3({
    symbol: 'DOODUSDT',
    volBase24h: 1261919761,
    prevVolBase24h: 1126311818
  });
  assert.ok(doodEval);
  assert.equal(doodEval.hacimChange, '+12.04%');
  assert.equal(doodEval.hacim24s, '1.261.919.761 DOOD');

  // 3. 1000CATUSDT: +11.85% surge with 509,336,169 1000CAT
  const catEval = strategyRules.evaluateV3({
    symbol: '1000CATUSDT',
    volBase24h: 509336169,
    volumeSurgePct: 11.85
  });
  assert.ok(catEval);
  assert.equal(catEval.hacimChange, '+11.85%');
  assert.equal(catEval.hacim24s, '509.336.169 1000CAT');

  // 4. Below 8.00% threshold is rejected
  assert.equal(strategyRules.evaluateV3({
    symbol: 'TSMUSDT',
    volBase24h: 40814,
    vol1m: 2500 // ~6.52% < 8.00%
  }), null);

  // 5. Illiquid token (< 500 base volume) is rejected
  assert.equal(strategyRules.evaluateV3({
    symbol: 'ILLIQUSDT',
    volBase24h: 300,
    volumeSurgePct: 25.0
  }), null);
});

test('VisiVero FR 3-Mode evaluation (Mode A Flip 🟢, Mode B Deep Negative 🔴, Mode C Periodic Scan iconless)', () => {
  const now = 1_000_000;
  const nextTime = now + (6 * 3600 + 38 * 60 + 59) * 1000; // 06:38:59

  // Mode A: Positive/Zero to Negative Flip (🟢 #PAYPUSDT ⚠️ Funding changed from + to -)
  const modeA = strategyRules.evaluateFunding({
    rate: -0.000009, // -0.0009%
    prevRate: 0,     // 0.0000%
    nextFundingTime: nextTime,
    now
  });
  assert.ok(modeA);
  assert.equal(modeA.mode, 'A');
  assert.equal(modeA.dot, '🟢');
  assert.equal(modeA.alertText, 'Funding changed from + to -');
  assert.equal(modeA.fundingRate, '-0.0009%');
  assert.equal(modeA.previousFunding, '0.0000%');
  assert.equal(modeA.difference, '-0.0009%');
  assert.equal(modeA.timeRemaining, '06:38:59');

  // Mode B: Deep negative change (🔴 High Negative Funding Alert)
  const modeB = strategyRules.evaluateFunding({
    rate: -0.0032,
    prevRate: -0.0021,
    nextFundingTime: nextTime,
    now
  });
  assert.ok(modeB);
  assert.equal(modeB.mode, 'B');
  assert.equal(modeB.dot, '🔴');
  assert.equal(modeB.alertText, 'High Negative Funding Alert');
  assert.equal(modeB.fundingRate, '-0.3200%');
  assert.equal(modeB.previousFunding, '-0.2100%');
  assert.equal(modeB.difference, '-0.1100%');

  // Mode C: Periodic deep negative scan (#CTUSDT / #BTWUSDT — iconless, no Previous Funding or Difference)
  const modeC = strategyRules.evaluateFunding({
    rate: -0.002615, // -0.2615%
    prevRate: null,
    nextFundingTime: now + (1 * 3600 + 25 * 60 + 59) * 1000,
    now
  });
  assert.ok(modeC);
  assert.equal(modeC.mode, 'C');
  assert.equal(modeC.dot, '');
  assert.equal(modeC.alertText, null);
  assert.equal(modeC.fundingRate, '-0.2615%');
  assert.equal(modeC.previousFunding, null);
  assert.equal(modeC.difference, null);
  assert.equal(modeC.timeRemaining, '01:25:59');
});

test('Standalone runners and central engine emit exact VisiVero FR and V3-A payloads', async () => {
  // 1. Standalone v3-volume.runner.js
  const v3Out = [];
  const klines1m = [
    { openTime: 100000, closeTime: 159999, open: 1, high: 1.1, low: 0.9, close: 1.05, volume: 7395.5, isClosed: true },
    { openTime: 160000, closeTime: 219999, open: 1.05, high: 1.06, low: 1.04, close: 1.05, volume: 100, isClosed: false }
  ];
  const v3Helper = {
    createScanLoop: require('../services/scan-loop.service').createScanLoop,
    isSignalAccepted: botData.isSignalAccepted,
    strategyRules,
    getWatchlist: async () => [{ symbol: 'TSMUSDT', volBase: 40814, volUsd: 420000 }],
    getKlines: async () => klines1m,
    postSignal: async s => { v3Out.push(s); return { status: 200, data: { accepted: true } }; },
    logger: { header() {}, info() {}, scan() {}, signal() {}, warn() {} },
    quantIndicators: require('../services/quant-indicators.service')
  };
  const v3Runner = load('bots/runners/v3-volume.runner.js', { './runner-helper': v3Helper }, '\nmodule.exports = { scan };');
  await v3Runner.scan();
  assert.equal(v3Out.length, 1);
  assert.equal(v3Out[0].symbol, 'TSMUSDT');
  assert.equal(v3Out[0].dot, '');
  assert.equal(v3Out[0].hacimChange, '+22.13%');
  assert.equal(v3Out[0].hacim24s, '40.814 TSM');
  assert.equal(v3Out[0].timeframe, '1m');
  assert.equal(v3Out[0].candleOpenTime, 100000);

  // 2. Standalone funding-rate.runner.js (Mode C on first scan, Mode A flip on second scan)
  let step = 0;
  const frOut = [];
  const frHelper = {
    createScanLoop: require('../services/scan-loop.service').createScanLoop,
    isSignalAccepted: botData.isSignalAccepted,
    strategyRules,
    botData,
    getWatchlist: async () => step === 0
      ? [{ symbol: 'CTUSDT', fr: -0.002615, nextFundingTime: Date.now() + 5159000 }, { symbol: 'PAYPUSDT', fr: 0.0001 }]
      : [{ symbol: 'PAYPUSDT', fr: -0.000009, nextFundingTime: Date.now() + 23939000 }],
    postSignal: async s => { frOut.push(s); return { status: 200, data: { accepted: true } }; },
    logger: { header() {}, info() {}, scan() {}, signal() {}, warn() {} }
  };
  const frRunner = load('bots/runners/funding-rate.runner.js', { './runner-helper': frHelper }, '\nmodule.exports = { scan };');
  await frRunner.scan();
  step = 1;
  await frRunner.scan();

  const ctSig = frOut.find(s => s.symbol === 'CTUSDT');
  assert.ok(ctSig);
  assert.equal(ctSig.mode, 'C');
  assert.equal(ctSig.dot, '');
  assert.equal(ctSig.alertText, null);
  assert.equal(ctSig.fundingRate, '-0.2615%');
  assert.equal(ctSig.previousFunding, null);
  assert.equal(ctSig.difference, null);

  const paypSig = frOut.find(s => s.symbol === 'PAYPUSDT');
  assert.ok(paypSig);
  assert.equal(paypSig.mode, 'A');
  assert.equal(paypSig.dot, '🟢');
  assert.equal(paypSig.alertText, 'Funding changed from + to -');
  assert.equal(paypSig.fundingRate, '-0.0009%');
  assert.equal(paypSig.previousFunding, '0.0100%');
  assert.equal(paypSig.difference, '-0.0109%');
});

test('SignalStore preserves iconless dot ("") and BotRenderer renders exact VisiVero FR (Mode A & Mode C) and V3-A cards', () => {
  const store = load('services/signal-store.service.js', {
    fs: { existsSync: () => false, mkdirSync() {} },
    path,
    './price-formatter': { formatCryptoPrice: v => v == null ? null : String(v) }
  });

  const savedModeC = store.recordSignal('fr', {
    id: 'fr_ct_1',
    symbol: 'CTUSDT',
    mode: 'C',
    dot: '',
    alertText: null,
    fundingRate: '-0.2615%',
    previousFunding: null,
    difference: null,
    timeRemaining: '01:25:59'
  });
  assert.equal(savedModeC.dot, '');
  assert.equal(savedModeC.mode, 'C');

  const renderer = load('public/plugins/bot-hub/bot-renderer.js');

  // Render FR Mode C (#CTUSDT: no dot, no alert line, no Previous Funding, no Difference)
  const htmlModeC = renderer.generateSignalsHtml('fr', [savedModeC]);
  assert.ok(htmlModeC.includes('#CTUSDT'));
  assert.ok(htmlModeC.includes('-0.2615%'));
  assert.ok(htmlModeC.includes('01:25:59'));
  assert.ok(!htmlModeC.includes('🟢'));
  assert.ok(!htmlModeC.includes('🔴'));
  assert.ok(!htmlModeC.includes('Previous Funding:'));
  assert.ok(!htmlModeC.includes('Difference:'));

  // Render FR Mode A (🟢 #PAYPUSDT: ⚠️ Funding changed from + to -, Previous Funding, Difference)
  const htmlModeA = renderer.generateSignalsHtml('fr', [{
    symbol: 'PAYPUSDT',
    mode: 'A',
    dot: '🟢',
    alertText: 'Funding changed from + to -',
    fundingRate: '-0.0009%',
    previousFunding: '0.0000%',
    difference: '-0.0009%',
    timeRemaining: '06:38:59'
  }]);
  assert.ok(htmlModeA.includes('🟢'));
  assert.ok(htmlModeA.includes('#PAYPUSDT'));
  assert.ok(htmlModeA.includes('⚠️ Funding changed from + to -'));
  assert.ok(htmlModeA.includes('Previous Funding:'));
  assert.ok(htmlModeA.includes('0.0000%'));
  assert.ok(htmlModeA.includes('Difference:'));
  assert.ok(htmlModeA.includes('-0.0009%'));

  // Render V3-A (#DOODUSDT: Hacim: +12.04%, 24s Hacim: 1.261.919.761 DOOD)
  const htmlV3 = renderer.generateSignalsHtml('v3', [{
    symbol: 'DOODUSDT',
    dot: '',
    hacimChange: '+12.04%',
    hacim24s: '1.261.919.761 DOOD'
  }]);
  assert.ok(htmlV3.includes('#DOODUSDT'));
  assert.ok(htmlV3.includes('+12.04%'));
  assert.ok(htmlV3.includes('1.261.919.761 DOOD'));
});
