const assert = require('assert');
const ScannerService = require('../services/scanner.service');
const BinanceDataService = require('../services/binance-data.service');
const botManager = require('../bots/index');

async function runTests() {
  console.log('[Test] Running ScannerService tests...');

  const binanceData = new BinanceDataService();
  await binanceData.init();

  const scanner = new ScannerService({
    binanceData,
    botManager,
    maxSymbols: 5, // test with top 5 symbols
    debounceMs: 1000
  });

  assert(typeof scanner.scanCycle === 'function', 'ScannerService must have scanCycle function');
  assert(typeof scanner.start === 'function', 'ScannerService must have start function');
  assert(typeof scanner.stop === 'function', 'ScannerService must have stop function');

  // Run one single scan cycle
  console.log('[Test] Executing single scanCycle()...');
  const results = await scanner.scanCycle();
  assert(Array.isArray(results), 'scanCycle must return an array of processed symbol reports');
  assert(results.length > 0, 'scanCycle must process at least one symbol');

  // Verify debounce logic with isolated test symbol
  const isDebouncedFirst = scanner.isDebounced('hammerproplus', 'TESTCOINUSDT');
  scanner.recordEmission('hammerproplus', 'TESTCOINUSDT');
  const isDebouncedSecond = scanner.isDebounced('hammerproplus', 'TESTCOINUSDT');
  assert.strictEqual(isDebouncedFirst, false, 'First emission must not be debounced');
  assert.strictEqual(isDebouncedSecond, true, 'Immediate subsequent emission must be debounced');

  console.log('✅ ScannerService tests passed successfully!');
}

runTests().catch(err => {
  console.error('❌ Scanner test failed:', err);
  process.exit(1);
});
