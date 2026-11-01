'use strict';
const urls = ['wss://fstream.binance.com/market/stream', 'wss://fstream.binance.com/public/stream', 'wss://fstream.binance.com/stream', 'wss://fstream.binance.com/market/ws/!ticker@arr', 'wss://fstream.binance.com/ws/!ticker@arr', 'wss://fstream.binance.com/market/stream?streams=!ticker@arr', 'wss://fstream.binance.com/market/stream?streams=!miniTicker@arr', 'wss://fstream.binance.com/market/stream?streams=!markPrice@arr'];
for (const u of urls) {
  const ws = new WebSocket(u); let n = 0;
  ws.onopen = () => { if (!u.includes('?') && !u.includes('/ws/')) ws.send(JSON.stringify({ method: 'SUBSCRIBE', params: ['!ticker@arr', 'btcusdt@ticker'], id: 1 })); };
  ws.onmessage = ev => { if (n++ < 2) console.log(u, String(ev.data).slice(0, 160)); };
  ws.onerror = e => console.log(u, 'ERR', e.message);
  ws.onclose = e => console.log(u, 'CLOSE', e.code);
}
setTimeout(() => process.exit(0), 15000);
