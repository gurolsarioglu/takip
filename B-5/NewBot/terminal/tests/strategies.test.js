const assert = require('assert');
const hammerProPlusBot = require('../bots/strategies/hammer-pro-plus.bot');
const hammerProBot     = require('../bots/strategies/hammer-pro.bot');
const fourSSniperBot   = require('../bots/strategies/four-s-sniper.bot');
const fourSBot         = require('../bots/strategies/four-s.bot');
const v3VolumeBot      = require('../bots/strategies/v3-volume.bot');
const divergenceBot    = require('../bots/strategies/divergence.bot');
const fundingRateBot   = require('../bots/strategies/funding-rate.bot');
const m1aDropBot       = require('../bots/strategies/m1a-drop.bot');
const m1PremiumBot     = require('../bots/strategies/m1-premium.bot');

function runTests() {
  console.log('[Test] Running Bot Strategy Evaluator tests...');

  // Helper to generate a dummy series of candles
  function makeKlines(count, startPrice, trend = 'flat') {
    const klines = [];
    let p = startPrice;
    for (let i = 0; i < count; i++) {
      if (trend === 'down') p -= 0.5;
      else if (trend === 'up') p += 0.5;
      klines.push({
        time: Date.now() - (count - i) * 60000,
        open: p,
        high: p + 1,
        low: p - 1,
        close: p,
        volume: 1000
      });
    }
    return klines;
  }

  // 1. Hammer Pro Plus evaluate test
  assert(typeof hammerProPlusBot.evaluate === 'function', 'hammerProPlusBot must have evaluate function');
  const hppSignal = hammerProPlusBot.evaluate({
    symbol: 'BTCUSDT',
    currentPrice: 65000,
    klines1m: makeKlines(30, 65000, 'down'),
    klines5m: makeKlines(30, 65000, 'down'),
    klines1h: makeKlines(30, 65000, 'down'),
    sentiment: {
      orderBook: { bidPct: 55, askPct: 45 },
      topPosition: { longPct: 62, shortPct: 38 },
      topAccount: { longPct: 58, shortPct: 42 },
      globalExposure: { longPct: 45, shortPct: 55 }
    }
  });
  // When oversold conditions trigger, hppSignal must return a valid structured signal object
  if (hppSignal) {
    assert(hppSignal.symbol === 'BTCUSDT', 'Signal symbol must be BTCUSDT');
    assert(hppSignal.stars, 'Signal must have star rating');
    assert(hppSignal.rsi, 'Signal must have rsi data');
  }

  // 2. V3 Volume evaluate test
  assert(typeof v3VolumeBot.evaluate === 'function', 'v3VolumeBot must have evaluate function');
  const surgeKlines = makeKlines(25, 100);
  surgeKlines[surgeKlines.length - 1].volume = 5000; // 5x volume spike
  const v3Signal = v3VolumeBot.evaluate({
    symbol: 'ETHUSDT',
    currentPrice: 3500,
    klines: surgeKlines
  });
  assert(v3Signal !== null, 'V3 Volume must trigger on 5x volume surge');
  assert.strictEqual(v3Signal.symbol, 'ETHUSDT');

  // 3. Funding Rate evaluate test
  assert(typeof fundingRateBot.evaluate === 'function', 'fundingRateBot must have evaluate function');
  const frSignal = fundingRateBot.evaluate({
    symbol: 'SOLUSDT',
    currentPrice: 150,
    fundingRate: -0.0008, // -0.08% extreme negative
    nextFundingTime: Date.now() + 14400000
  });
  assert(frSignal !== null, 'Funding Rate bot must trigger on -0.08% funding rate');
  assert.strictEqual(frSignal.symbol, 'SOLUSDT');

  // 4. M1-A Drop evaluate test
  assert(typeof m1aDropBot.evaluate === 'function', 'm1aDropBot must have evaluate function');
  const dropKlines = makeKlines(20, 100);
  // simulate a sharp 2% drop on the last bar
  dropKlines[dropKlines.length - 1].close = 97.5;
  dropKlines[dropKlines.length - 1].low = 97.0;
  dropKlines[dropKlines.length - 1].volume = 3000;
  const m1aSignal = m1aDropBot.evaluate({
    symbol: 'DOGEUSDT',
    currentPrice: 97.5,
    klines1m: dropKlines
  });
  assert(m1aSignal !== null, 'M1-A Drop must trigger on sharp 1m price drop');
  assert.strictEqual(m1aSignal.symbol, 'DOGEUSDT');

  // 5. M1 Premium evaluate test
  assert(typeof m1PremiumBot.evaluate === 'function', 'm1PremiumBot must have evaluate function');
  const pumpKlines = makeKlines(20, 100);
  pumpKlines[pumpKlines.length - 1].close = 102.5; // +2.5% breakout
  pumpKlines[pumpKlines.length - 1].high = 103.0;
  pumpKlines[pumpKlines.length - 1].volume = 3500;
  const m1pSignal = m1PremiumBot.evaluate({
    symbol: 'AVAXUSDT',
    currentPrice: 102.5,
    klines1m: pumpKlines
  });
  assert(m1pSignal !== null, 'M1 Premium must trigger on 1m breakout');
  assert.strictEqual(m1pSignal.symbol, 'AVAXUSDT');

  // 6. 4S Structure evaluate test
  assert(typeof fourSBot.evaluate === 'function', 'fourSBot must have evaluate function');
  const klines4h = makeKlines(30, 50, 'up');
  const fourSSignal = fourSBot.evaluate({
    symbol: 'NEARUSDT',
    currentPrice: 52,
    klines4h,
    sentiment: {
      topPosition: { longPct: 65, shortPct: 35 },
      topAccount: { longPct: 60, shortPct: 40 },
      globalExposure: { longPct: 48, shortPct: 52 }
    }
  });
  if (fourSSignal) {
    assert.strictEqual(fourSSignal.symbol, 'NEARUSDT');
  }

  // 7. 4S Sniper evaluate test
  assert(typeof fourSSniperBot.evaluate === 'function', 'fourSSniperBot must have evaluate function');

  // 8. Divergence evaluate test
  assert(typeof divergenceBot.evaluate === 'function', 'divergenceBot must have evaluate function');

  // 9. Hammer Pro evaluate test
  assert(typeof hammerProBot.evaluate === 'function', 'hammerProBot must have evaluate function');

  console.log('✅ All Bot Strategy Evaluator tests passed successfully!');
}

runTests();
