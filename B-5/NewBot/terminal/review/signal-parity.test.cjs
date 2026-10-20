const { test } = require('node:test');
const assert = require('node:assert/strict');
const event = (id, time, patch = {}) => ({ id, bot: 'm1a', symbol: 'BTCUSDT', direction: 'down',
  exchange: 'binance', market: 'FUTURES', eventTime: time, ...patch });
test('comparison is one-to-one and separates missing, extra and direction mismatches', () => {
  const { compareSignals } = require('./signal-parity.cjs');
  const result = compareSignals([event('r1', 10000), event('r2', 10000)],
    [event('l1', 10010), event('l2', 10000, { direction: 'up' })], { toleranceMs: 100 });
  assert.equal(result.matches.length, 1);
  assert.equal(result.missing.length, 1);
  assert.equal(result.extra.length, 1);
});
test('unknown event times are unscorable, never substituted with observation time', () => {
  const { compareSignals } = require('./signal-parity.cjs');
  const result = compareSignals([event('r1', null, { observedAt: 10000 })], [event('l1', 10000)]);
  assert.equal(result.matches.length, 0);
  assert.equal(result.unscorableReference.length, 1);
  assert.equal(result.recall, null);
});
test('minute-level time produces a delay interval rather than false millisecond precision', () => {
  const { compareSignals } = require('./signal-parity.cjs');
  const result = compareSignals([event('r1', 60000, { timeResolutionMs: 60000 })], [event('l1', 80000)], { toleranceMs: 0 });
  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0].lagMinMs, -39999);
  assert.equal(result.matches[0].lagMaxMs, 20000);
});
test('comparison cannot match across exchange, market or strategy and honors timing tolerance', () => {
  const { compareSignals } = require('./signal-parity.cjs');
  for (const patch of [{ exchange: 'bybit' }, { market: 'SPOT' }, { strategy: 'different' }, { eventTime: 20000 }]) {
    const result = compareSignals([event('r1', 10000, { strategy: 'NW UP' })],
      [event('l1', 10000, { strategy: 'NW UP', ...patch })], { toleranceMs: 100 });
    assert.equal(result.matches.length, 0);
  }
});
test('UI observation parser preserves raw text and unknown timestamps', () => {
  const { parseObservation } = require('./signal-parity.cjs');
  const e = parseObservation('4ssniper', '🔴 #BRUSDT Strategy: NW DOWNBoost Value: +26.31% Current Price: 0.6936Previous Price: 0.7007111:02', '2026-10-20T10:30:23.194Z');
  assert.equal(e.symbol, 'BRUSDT');
  assert.equal(e.direction, 'down');
  assert.equal(e.strategy, 'NW DOWN');
  assert.equal(e.eventTime, null);
  assert.equal(e.displayedTime, '11:02');
});
test('authenticated API timestamps and USDC symbols are preserved without inference', () => {
  const { parseApiMessage } = require('./signal-parity.cjs');
  const input = { id:'real-id',botId:'4sniper',symbol:'WLFIUSDC',exchange:'binance',marketType:'futures',
    message:'🟢 #WLFIUSDC\nStrategy: NW UP\nBoost Value: +1.27%',createdAt:'2026-10-20T08:14:51.756Z' };
  const e = parseApiMessage(input,'2026-10-20T11:14:00.000Z');
  assert.equal(e.id,'real-id');
  assert.equal(e.symbol,'WLFIUSDC');
  assert.equal(e.bot,'4ssniper');
  assert.equal(e.eventTime,input.createdAt);
  assert.equal(e.timeResolutionMs,1);
});
test('explicit clock correction is applied before measuring delay', () => {
  const { compareSignals } = require('./signal-parity.cjs');
  const reference=[event('r',3000)], local=[event('l',1000)];
  assert.equal(compareSignals(reference,local,{toleranceMs:0}).matches.length,0);
  const aligned=compareSignals(reference,local,{toleranceMs:0,localClockOffsetMs:2000,localClockUncertaintyMs:10});
  assert.equal(aligned.matches.length,1);
  assert.equal(aligned.matches[0].lagMinMs,-10);
  assert.equal(aligned.matches[0].lagMaxMs,10);
});
