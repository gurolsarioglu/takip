const assert = require('assert');
const BinanceDataService = require('../services/binance-data.service');

async function runTests() {
  console.log('[Test] Running BinanceDataService tests...');

  // Test 1: Service initialization and top symbols
  const service = new BinanceDataService();
  await service.init();

  const topSymbols = service.getTopSymbols(10);
  assert(Array.isArray(topSymbols), 'getTopSymbols should return an array');
  assert(topSymbols.length > 0, 'Top symbols should not be empty');
  assert(topSymbols.includes('BTCUSDT'), 'Top symbols must include BTCUSDT');

  // Test 2: Fetching klines for BTCUSDT (1h interval)
  const klines = await service.getKlines('BTCUSDT', '1h', 25);
  assert(Array.isArray(klines), 'Klines should be an array');
  assert.strictEqual(klines.length, 25, 'Should return exactly 25 klines');

  const firstKline = klines[0];
  assert(typeof firstKline.time === 'number', 'Kline must have timestamp');
  assert(typeof firstKline.open === 'number', 'Kline must have open price');
  assert(typeof firstKline.high === 'number', 'Kline must have high price');
  assert(typeof firstKline.low === 'number', 'Kline must have low price');
  assert(typeof firstKline.close === 'number', 'Kline must have close price');
  assert(typeof firstKline.volume === 'number', 'Kline must have volume');

  // Test 3: Latest price
  const price = service.getLatestPrice('BTCUSDT');
  assert(typeof price === 'number' && price > 0, `Latest price should be a positive number, got ${price}`);

  // Test 4: In-memory cache hit
  const startTs = Date.now();
  const cachedKlines = await service.getKlines('BTCUSDT', '1h', 25);
  const duration = Date.now() - startTs;
  assert.strictEqual(cachedKlines.length, 25, 'Cached klines should return 25 items');
  assert(duration < 50, `Cached call should take < 50ms, took ${duration}ms`);

  // Test 5: Watchlist generation
  const watchlist = await service.getWatchlist();
  assert(Array.isArray(watchlist), 'Watchlist should be an array');
  assert(watchlist.length > 50, `Watchlist should have > 50 symbols, got ${watchlist.length}`);
  const btcItem = watchlist.find(item => item.symbol === 'BTCUSDT');
  assert(btcItem, 'BTCUSDT must be in watchlist');
  assert(typeof btcItem.price === 'number', 'BTCUSDT must have price');
  assert(typeof btcItem.fr === 'number', 'BTCUSDT must have funding rate');
  assert(typeof btcItem.volUsd === 'number', 'BTCUSDT must have volUsd');

  // Test 6: Sentiment generation
  const sentiment = await service.getSentiment('BTCUSDT');
  assert(sentiment && typeof sentiment === 'object', 'Sentiment must be an object');
  assert(sentiment.orderBook && typeof sentiment.orderBook.bidPct === 'number', 'Sentiment must have orderBook with bidPct');
  assert(sentiment.topPosition && typeof sentiment.topPosition.longPct === 'number', 'Sentiment must have topPosition');
  assert(sentiment.topAccount && typeof sentiment.topAccount.longPct === 'number', 'Sentiment must have topAccount');
  assert(sentiment.globalExposure && typeof sentiment.globalExposure.longPct === 'number', 'Sentiment must have globalExposure');

  console.log('✅ BinanceDataService tests passed successfully!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
