// Offline audit: VM stubs prevent HTTP, Telegram, production writes and timers.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const quant = require('../services/quant-indicators.service');
const findings = [];
const quiet = { log() {}, warn() {}, error() {}, clear() {} };
function load(file, dependencies, tail = '') {
  const ctx = { module: { exports: {} }, __dirname: path.dirname(path.join(root, file)), console: quiet, Date, Map, Set,
    process: { env: {} }, Buffer, setTimeout() { return {}; }, clearTimeout() {},
    setInterval() { return {}; }, clearInterval() {},
    require(name) {
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      throw new Error(`Unstubbed dependency: ${name}`);
    } };
  let source = fs.readFileSync(path.join(root, file), 'utf8');
  if (file.startsWith('bots/runners/')) source = source.replace(/^start\(\);\s*$/m, '');
  vm.runInNewContext(source + tail, ctx, { filename: file });
  return ctx.module.exports;
}
async function probe(name, fn) {
  const detail = await fn();
  findings.push({ name, reproduced: true, detail });
}
async function runRunner(file, helper) {
  const runner = load(`bots/runners/${file}.runner.js`, { './runner-helper': helper },
    '\nmodule.exports = { scan };');
  await runner.scan();
}
(async () => {
  await probe('4S Sniper API field mismatch bypasses whale filter', async () => {
    const signals = [];
    await runRunner('four-s-sniper', {
      getWatchlist: async () => [{ symbol: 'AUDITUSDT' }],
      getKlines: async () => Array.from({ length: 100 }, (_, i) => ({ openTime: i, close: 10 })),
      getSentiment: async () => ({ topAccount: { longPct: 20 }, topPosition: { longPct: 30 }, globalExposure: { longPct: 40 } }),
      quantIndicators: { calculateAllMetrics: () => ({ rsi: 30, srsiK: 10 }) },
      formatCryptoPrice: String, computePrevPrice: String,
      logger: { header() {}, info() {}, scan() {}, signal() {} },
      postSignal: async s => { signals.push(s); return { status: 200 }; }
    });
    assert.equal(signals.length, 1);
    assert.equal(signals[0].traderPositioning, 'NaN%');
    assert.equal(signals[0].marketExposure, '51%');
    return { actualLongPct: 20, accepted: true, displayed: signals[0].traderPositioning };
  });
  await probe('Central kline cache never refreshes', async () => {
    const engine = load('services/market-data-engine.service.js', {
      events: require('node:events'), ws: function () {}, https: {}, './symbol-registry.service': {}
    });
    let requests = 0;
    engine.safeFetch = async () => {
      requests++;
      return Array.from({ length: 250 }, (_, i) => [i, '10', '11', '9', String(10 + requests), '100', i + 1, '1000']);
    };
    const first = await engine.getKlines('AUDITUSDT', '1m');
    const second = await engine.getKlines('AUDITUSDT', '1m');
    assert.equal(requests, 1);
    assert.equal(first, second);
    return { requestsAfterTwoReads: requests, sameArray: first === second };
  });
  await probe('Funding difference is missing percentage conversion', async () => {
    const signals = [];
    await runRunner('funding-rate', {
      getWatchlist: async () => [{ symbol: 'AUDITUSDT', fr: -0.0002 }],
      logger: { header() {}, info() {}, scan() {}, signal() {} },
      postSignal: async s => { signals.push(s); return { status: 200 }; }
    });
    assert.equal(signals[0].difference, '-0.0003%');
    return { displayed: signals[0].difference, expectedPercentagePointsUsingItsBaseline: '-0.0300', countdown: signals[0].timeRemaining };
  });
  await probe('EMA/pivots lose micro-price precision', async () => {
    const ema = quant.calculateEMA(Array(250).fill(0.0000185), 200);
    const pivot = quant.calculatePivots({ high: 0.000019, low: 0.000018, close: 0.0000185 }, 0.0000185);
    assert.equal(ema, 0);
    assert.equal(pivot.p, 0);
    return { input: 0.0000185, ema, pivot: pivot.p };
  });
  await probe('Hub reports affected bot for a rejected duplicate', async () => {
    const bot = { addSignal: () => null };
    const deps = {};
    for (const name of ['hammer-pro-plus', 'hammer-pro', 'four-s-sniper', 'four-s', 'v3-volume', 'divergence', 'funding-rate', 'm1a-drop', 'm1-premium'])
      deps[`./strategies/${name}.bot`] = bot;
    Object.assign(deps, { '../services/price-formatter': {}, '../services/market-data-engine.service': {},
      '../services/quant-indicators.service': {}, '../services/derivatives-enricher.service': {}, '../services/symbol-registry.service': {} });
    const manager = load('bots/index.js', deps);
    const result = manager.emitSignal({ symbol: 'AUDITUSDT', botId: '4s' });
    assert.equal(result.affectedBots[0], '4s');
    return { addSignalResult: null, reportedBot: result.affectedBots[0] };
  });
  await probe('BaseBot restart loses candle deduplication state', async () => {
    const saved = [{ symbol: 'AUDITUSDT', timeframe: '1h', candleOpenTime: 123, timestamp: Date.now() }];
    const BaseBot = load('bots/base/base-bot.js', {
      '../../services/signal-store.service': { getRecentSignalsByBot: () => saved },
      '../../services/signal-bus.service': {}
    });
    const bot = new BaseBot({ id: 'audit' });
    assert.equal(bot.canEmitSignal('AUDITUSDT', '1h', 123, 600000), true);
    return { restoredSignals: bot.getCount(), duplicateAllowed: true };
  });
  await probe('200-day history EMA200 is actually the 200-day SMA', async () => {
    const history = load('services/history.service.js', { fs: {}, path, https: {} },
      '\nmodule.exports = { calculateEMA };');
    const closes = Array.from({ length: 200 }, (_, i) => i + 1);
    const actual = history.calculateEMA(closes, 200);
    assert.equal(actual, 100.5);
    return { actual, sma: 100.5, quantServiceEmaOnSameInput: quant.calculateEMA(closes, 200) };
  });
  await probe('Signal persistence drops candle/timeframe and strategy metadata', async () => {
    const store = load('services/signal-store.service.js', {
      fs: { existsSync: () => false, mkdirSync() {} }, path,
      './price-formatter': { formatCryptoPrice: String }
    });
    const saved = store.recordSignal('audit', { symbol: 'AUDITUSDT', timeframe: '1h',
      candleOpenTime: 123, divergence: '1m', isFavorite: true, previousFunding: '0.01%' });
    assert.equal(saved.timeframe, undefined);
    assert.equal(saved.candleOpenTime, undefined);
    assert.equal(saved.isFavorite, undefined);
    assert.equal(saved.previousFunding, undefined);
    return { lostFields: ['timeframe', 'candleOpenTime', 'divergence', 'isFavorite', 'previousFunding'] };
  });
  console.log(JSON.stringify({ offline: true, reproduced: findings.length, findings }, null, 2));
})().catch(err => { console.error(err); process.exitCode = 1; });
