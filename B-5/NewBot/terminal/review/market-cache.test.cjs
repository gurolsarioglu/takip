const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./test-module-loader.cjs');

test('kline cache shares in-flight requests, refreshes on TTL and honors requested limit', async () => {
  let now = 10000, calls = 0, release;
  const Clock = class extends Date { static now() { return now; } };
  const engine = load('services/market-data-engine.service.js', {
    events: require('node:events'), ws: function () {}, https: {}, './symbol-registry.service': {}
  }, '', { Date: Clock });
  engine.safeFetch = async () => {
    const call = ++calls;
    if (call === 1) await new Promise(resolve => { release = resolve; });
    return Array.from({ length: 250 }, (_, i) => [(i + call) * 60000, '10', '11', '9', String(10 + call), '100', (i + call + 1) * 60000 - 1, '1000']);
  };
  const a = engine.getKlines('AUDITUSDT', '1m', 30);
  const b = engine.getKlines('AUDITUSDT', '1m', 100);
  assert.equal(calls, 1);
  release();
  const [first, second] = await Promise.all([a, b]);
  assert.equal(first.length, 30);
  assert.equal(second.length, 100);
  await engine.getKlines('AUDITUSDT', '1m', 30);
  assert.equal(calls, 1);
  now += 5000;
  const refreshed = await engine.getKlines('AUDITUSDT', '1m', 250);
  assert.equal(calls, 2);
  assert.equal(refreshed.length, 250);
  assert.equal(refreshed.at(-1).close, 12);
});

test('expired cache is not returned as current data after a failed refresh', async () => {
  let now = 10000, calls = 0;
  const engine = load('services/market-data-engine.service.js', {
    events: require('node:events'), ws: function () {}, https: {}, './symbol-registry.service': {}
  }, '', { Date: class extends Date { static now() { return now; } } });
  engine.safeFetch = async () => {
    if (++calls > 1) throw new Error('unavailable');
    return Array.from({ length: 250 }, (_, i) => [i, '1', '1', '1', '1', '1', i + 1, '1']);
  };
  await engine.getKlines('AUDITUSDT', '1m');
  now += 5000;
  assert.equal((await engine.getKlines('AUDITUSDT', '1m')).length, 0);
  await engine.getKlines('AUDITUSDT', '1m');
  assert.equal(calls, 3);
});
test('positive radar moves can independently notify both M1 bots', () => {
  const engine = load('services/market-data-engine.service.js', {
    events:require('node:events'),ws:function(){},https:{},'./symbol-registry.service':{}
  });
  const events=[];
  engine.on('radarAlert', event=>events.push(event.type));
  engine._handleMiniTickers([{s:'AUDITUSDT',c:'100',o:'100',h:'100',l:'100',q:'1000000'}]);
  engine._handleMiniTickers([{s:'AUDITUSDT',c:'101',o:'100',h:'101',l:'100',q:'1000000'}]);
  assert.ok(events.includes('m1a'));
  assert.ok(events.includes('m1premium'));
});
