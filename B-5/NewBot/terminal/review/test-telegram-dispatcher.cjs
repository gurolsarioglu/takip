const assert = require('assert');
const signalBus = require('../services/signal-bus.service');
const telegramDispatcher = require('../services/telegram-dispatcher.service');
const BaseBot = require('../bots/base/base-bot');

console.log('Testing TelegramDispatcher and SignalBus integration...');

let receivedEvent = null;
signalBus.on('signal', (event) => {
  receivedEvent = event;
});

const testBot = new BaseBot({ id: 'test_m1a', name: 'M1-A Drop Test' });
const mockSignal = {
  symbol: 'BTCUSDT',
  dropValue: '-1.45%',
  currentPrice: '67450.50',
  prevPrice: '68442.92',
  volume: '+45.20%',
  rsi: '22 ⚠️',
  stochastic: '12/18',
  dot: '🔴'
};

const emitted = testBot.addSignal(mockSignal);
assert(emitted !== null, 'Signal should be emitted');
assert(receivedEvent !== null, 'SignalBus should receive signal');
assert.strictEqual(receivedEvent.botId, 'test_m1a');
assert.strictEqual(receivedEvent.signal.symbol, 'BTCUSDT');

const html = telegramDispatcher.formatSignalHtml(receivedEvent.botId, receivedEvent.botName, receivedEvent.signal);
console.log('\n--- FORMATTED TELEGRAM HTML MESSAGE ---');
console.log(html);
console.log('--------------------------------------\n');

assert(html.includes('#BTCUSDT'), 'HTML should contain #BTCUSDT hashtag');
assert(html.includes('67450.50'), 'HTML should contain current price');
assert(html.includes('M1-A Drop Test'), 'HTML should contain bot name');

console.log('✅ [PASS] TelegramDispatcher & SignalBus integration verified 100%!');
