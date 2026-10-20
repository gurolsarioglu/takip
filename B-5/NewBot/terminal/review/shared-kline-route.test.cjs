const { test } = require('node:test');
const assert = require('node:assert/strict');
test('bot kline API shares the engine while preserving raw Binance array shape', async () => {
  const { createKlineHandler } = require('../services/bot-market-route.service');
  const raw = [1,'10','11','9','10.5','100',2,'1050',5,'50','525','0'];
  let calls = 0, output;
  const handler = createKlineHandler({ getKlines: async (symbol, interval, limit) => {
    calls++; assert.equal(symbol,'BTCUSDT'); assert.equal(interval,'1m'); assert.equal(limit,250);
    return [{ raw }];
  } });
  await handler({ query:{ symbol:'btcusdt', interval:'1m', limit:'250' } },
    { json: value => { output=value; } }, () => assert.fail('Unexpected proxy fallback'));
  assert.equal(calls,1);
  assert.deepEqual(output,[raw]);
});
test('larger chart histories retain the existing proxy and failed bot snapshots return 502', async () => {
  const { createKlineHandler } = require('../services/bot-market-route.service');
  const handler = createKlineHandler({ getKlines: async () => [] });
  let fallback=0, status;
  await handler({query:{symbol:'BTCUSDT',interval:'1m',limit:'1000'}}, {}, () => { fallback++; });
  assert.equal(fallback,1);
  const res = { status: code => { status=code; return res; }, json() {} };
  await handler({query:{symbol:'BTCUSDT',interval:'1m',limit:'250'}},res,()=>{});
  assert.equal(status,502);
});
